export class CameraController {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;
    this._initCameras();
    this._initLayers();
    this._initProperties();
  }

  _initCameras() {
    this.gameCamera = this.scene.cameras.add(0, 0, this.scene.scale.width, this.scene.scale.height)
      .setName("gameCamera")
      .setBackgroundColor("#000000");

    this.uiCamera = this.scene.cameras.add(0, 0, this.scene.scale.width, this.scene.scale.height)
      .setName("uiCamera")
      .setBackgroundColor('rgba(0, 0, 0, 0)');

    this.scene.cameras.main.visible = false;
  }

  _initLayers() {
    this.gameLayer = this.scene.add.group().setName("gameLayer");
    this.uiLayer = this.scene.add.group().setName("uiLayer");
  }

  _initProperties() {
    this.defaultZoom = 1;
    this.gameZoom = 1;
    this.currentGameZoom = this.gameZoom;
    this.currentUIZoom = this.defaultZoom;
    this.bopZoom = 0.050;

    this.currentBPM = 100;
    this.beatInterval = 60000 / this.currentBPM;
    this.isBopping = false;
    this.lastBeatTime = 0;
    this.beatCounter = 0;

    this.defaultCameraPos = { x: 0, y: 0 };
    this.targetCameraPos = { ...this.defaultCameraPos };
    this.cameraLerpSpeed = this.config.lerpSpeed || 0.05;

    this.gameCamera.setZoom(this.gameZoom);
    this.uiCamera.setZoom(this.defaultZoom).setScroll(0, 0);
  }

  classifyAllSceneElements() {
    const allGameObjects = this.scene.children.list.filter(
      obj => obj !== this.gameLayer && obj !== this.uiLayer && obj.type
    );

    const uiPatterns = [
      "health", "bar", "rating", "text", "time", 
      "arrow", "score", "ui", "button", "menu", 
      "hud", "icon"
    ];

    const gamePatterns = [
      "character", "stage", "background", "enemy", 
      "player", "world", "platform", "obstacle", "sprite"
    ];

    allGameObjects.forEach(obj => {
      const name = (obj.name || "").toLowerCase();
      const type = (obj.type || "").toLowerCase();
      const constructor = obj.constructor ? obj.constructor.name.toLowerCase() : "";

      if (uiPatterns.some(pattern => 
          name.includes(pattern) || 
          type.includes(pattern) || 
          constructor.includes(pattern)))
      {
        this.addToUILayer(obj);
      }
      else if (gamePatterns.some(pattern => 
          name.includes(pattern) || 
          type.includes(pattern) || 
          constructor.includes(pattern)))
      {
        this.addToGameLayer(obj);
      }
      else {
        if (obj.type === "Image" || obj.type === "Sprite" || obj.type === "Container") {
          if (obj.scrollFactor && obj.scrollFactor.x === 0 && obj.scrollFactor.y === 0) {
            this.addToUILayer(obj);
          } else {
            this.addToGameLayer(obj);
          }
        } else {
          this.addToGameLayer(obj);
        }
      }
    });

    this._setupCameraLayers();

    return {
      totalClassified: allGameObjects.length,
      gameLayerCount: this.gameLayer.getLength(),
      uiLayerCount: this.uiLayer.getLength()
    };
  }

  _setupCameraLayers() {
    if (!this.gameCamera || !this.uiCamera || !this.gameLayer || !this.uiLayer) return;

    this.gameCamera.ignore(this.uiLayer.getChildren());
    this.uiCamera.ignore(this.gameLayer.getChildren());
    this.scene.cameras.main.ignore([...this.gameLayer.getChildren(), ...this.uiLayer.getChildren()]);
  }

  destroy() {
    this.scene?.registry.remove("cameraController");
    
    this.gameLayer?.clear(true, true)?.destroy();
    this.uiLayer?.clear(true, true)?.destroy();
    this.gameCamera?.destroy();
    this.uiCamera?.destroy();

    this.gameLayer = null;
    this.uiLayer = null;
    this.gameCamera = null;
    this.uiCamera = null;
  }

  addToGameLayer(object) {
    if (!object || !this.gameLayer) return;

    this.uiLayer.remove(object);
    this.gameLayer.add(object);

    if (typeof object.setScrollFactor === "function") object.setScrollFactor(1);
    if (typeof object.setVisible === "function") object.setVisible(true);

    this._setupCameraLayers();
  }

  addToUILayer(object) {
    if (!object || !this.uiLayer) return;

    if (object.type === 'Container') {
      object.each(child => {
        if (typeof child.setScrollFactor === 'function') child.setScrollFactor(0);
      });
    }

    if (typeof object.setScrollFactor === 'function') object.setScrollFactor(0);
    
    this.gameLayer.remove(object);
    this.uiLayer.add(object);
    
    if (typeof object.setVisible === 'function') object.setVisible(true);

    this._setupCameraLayers();
  }

  startBoping() {
    this.isBopping = true;
    this.lastBeatTime = 0;
    this.beatCounter = 0;
  }

  stopBoping() {
    this.isBopping = false;
    this.gameCamera?.setZoom(this.defaultZoom);
  }

  stopAll() {
    // Detener cualquier movimiento de cámara actual
    if (this.currentTween) {
        this.currentTween.stop();
        this.currentTween = null;
    }
    
    // Detener el boping si está activo
    this.isBoping = false;
}

  updateBPM(newBPM) {
    this.currentBPM = newBPM;
    this.beatInterval = 60000 / this.currentBPM;
  }

  update(songPosition, time, delta) {
    if (!this.gameCamera || !this.uiCamera) return;

    const elapsedSeconds = delta / 1000;
    const lerpSpeed = this.cameraLerpSpeed * (delta / 16.666);

    if (this.isBopping) {
      this._handleBeatBop(songPosition);
    }

    this._updateZooms(elapsedSeconds);
    this._updateCameraPosition(lerpSpeed);
  }

  _updateZooms(elapsedSeconds) {
    this.gameCamera.zoom = Phaser.Math.Linear(
        this.gameCamera.zoom,
        this.gameZoom,
        elapsedSeconds * 5
    );

    if (this.uiCamera.zoom !== this.defaultZoom) {
        this.uiCamera.zoom = Phaser.Math.Linear(
            this.uiCamera.zoom,
            this.defaultZoom,
            elapsedSeconds * 5
        );
    }
  }

  _handleBeatBop(songPosition) {
    if (songPosition >= this.lastBeatTime + this.beatInterval) {
      this.lastBeatTime += this.beatInterval;
      this.beatCounter++;
      if (this.beatCounter % 4 === 0) this.triggerBop();
    }
  }

  _updateCameraPosition(lerpSpeed) {
    if (this.targetCameraPos) {
      this.gameCamera.scrollX = Phaser.Math.Linear(this.gameCamera.scrollX, this.targetCameraPos.x, lerpSpeed);
      this.gameCamera.scrollY = Phaser.Math.Linear(this.gameCamera.scrollY, this.targetCameraPos.y, lerpSpeed);
    }
  }

  updateCameraPosition(characterData) {
    if (!characterData) {
        this.targetCameraPos = {
            x: this.defaultCameraPos.x - (this.gameCamera.width * 0.5),
            y: this.defaultCameraPos.y - (this.gameCamera.height * 0.5)
        };
        return;
    }

    if (characterData.camera_position) {
        const [camX, camY] = characterData.camera_position;
        this.targetCameraPos = {
            x: camX - (this.gameCamera.width * 0.5),
            y: camY - (this.gameCamera.height * 0.5)
        };
    } else if (characterData.position) {
        // Si no hay camera_position, usar la posición del personaje
        const [posX, posY] = characterData.position;
        this.targetCameraPos = {
            x: posX - (this.gameCamera.width * 0.5),
            y: posY - (this.gameCamera.height * 0.5)
        };
    } else {
        // Si no hay ninguna posición, usar la posición por defecto
        this.targetCameraPos = {
            x: this.defaultCameraPos.x - (this.gameCamera.width * 0.5),
            y: this.defaultCameraPos.y - (this.gameCamera.height * 0.5)
        };
    }
  }

  triggerBop() {
    this.gameCamera?.setZoom(this.gameZoom + this.bopZoom);
    this.uiCamera?.setZoom(this.defaultZoom + this.bopZoom);
  }

  reset() {
    this.stopBoping();
    this.defaultZoom = 1;
    this.gameZoom = 1.5;
    this.bopZoom = 1.1;
    this.lastBeatTime = 0;
    this.beatCounter = 0;
    this.defaultCameraPos = { x: 0, y: 0 };

    this.gameCamera?.setZoom(this.gameZoom);
    this.uiCamera?.setZoom(this.defaultZoom).setScroll(0, 0);
    
    this.gameLayer?.clear(false, false);
    this.uiLayer?.clear(false, false);
    this._setupCameraLayers();
  }

  toggleCameraBounds() {
    if (this.gameCameraBounds) {
      this.gameCameraBounds.destroy();
      this.uiCameraBounds.destroy();
      this.gameCameraBounds = null;
      this.uiCameraBounds = null;
    } else {
      this._createCameraBounds();
    }
  }

  _createCameraBounds() {
    this.gameCameraBounds = this._createBoundsGraphic(0x00ff00, this.gameCamera);
    this.uiCameraBounds = this._createBoundsGraphic(0xff00ff, this.uiCamera);
  }

  _createBoundsGraphic(color, camera) {
    const bounds = this.scene.add.graphics()
      .lineStyle(2, color, 1)
      .strokeRect(camera.x, camera.y, camera.width, camera.height)
      .setScrollFactor(0)
      .setDepth(1000);
    this.addToUILayer(bounds);
    return bounds;
  }

  panToPosition(x, y, duration = 1000) {
    if (this.gameCamera) {
        this.currentTween = this.scene.tweens.add({
            targets: this.gameCamera,
            scrollX: x - this.gameCamera.width / 2,
            scrollY: y - this.gameCamera.height / 2,
            duration: duration,
            ease: 'Power2'
        });
    }
}}