export class CameraController {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = config;
    this._initCameras();
    this._initLayers();
    this._initProperties();
    this._setupCameraLayers();
    this.classifyAllSceneElements();
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

    this.followSinging = false;
    this.forcedTarget = null;
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

    // Limpiar el evento al destruir
    this.scene.notesController?.duetEvent.off('duetStateChanged', this._handleDuetStateChange, this);
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

  update(songPosition, time, delta) {
    if (!this.gameCamera || !this.uiCamera) return;

    const elapsedSeconds = delta / 1000;
    const lerpSpeed = this.cameraLerpSpeed * (delta / 16.666);
    
    this._updateCameraPosition(lerpSpeed);
    if (this.isBopping) {
        this._handleBeatBop(songPosition);
    }
    this._updateZooms(elapsedSeconds);
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

  updateCameraPosition(target) {
    if (!target || !this.gameCamera) return;

    const centerX = this.gameCamera.width/(2 * this.gameCamera.zoom);
    const centerY = this.gameCamera.height/(2 * this.gameCamera.zoom);

    this.targetCameraPos = {
      x: target.x - (centerX / this.gameCamera.zoom),
      y: target.y - (centerY / this.gameCamera.zoom)
    };
  }

  _updateCameraPosition(lerpSpeed) {
    if(!this.targetCameraPos) return;

    this.gameCamera.scrollX = Phaser.Math.Linear(
      this.gameCamera.scrollX,
      this.targetCameraPos.x,
      lerpSpeed
    );
    this.gameCamera.scrollY = Phaser.Math.Linear(
      this.gameCamera.scrollY,
      this.targetCameraPos.y,
      lerpSpeed
    );
  }

  triggerBop() {
    this.gameCamera?.setZoom(this.gameZoom + this.bopZoom);
    this.uiCamera?.setZoom(this.defaultZoom + this.bopZoom);
  }

  startBoping() {
    this.isBopping = true;
    this.lastBeatTime = 0;
    this.beatCounter = 0;
  }

  stopBoping() {
    this.isBopping = false;
    this.gameCamera?.setZoom(this.gameZoom);
    this.uiCamera?.setZoom(this.defaultZoom);
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

  async reset() {
    try {
        // Verificar que las cámaras existan antes de intentar limpiarlas
        if (this.gameCamera && !this.gameCamera.destroyed) {
            this.gameCamera.setScroll(0, 0);
            this.gameCamera.setZoom(1);
            if (this.gameCamera.layer && typeof this.gameCamera.layer.clear === 'function') {
                this.gameCamera.layer.clear();
            }
        }

        if (this.uiCamera && !this.uiCamera.destroyed) {
            this.uiCamera.setScroll(0, 0);
            this.uiCamera.setZoom(1);
            if (this.uiCamera.layer && typeof this.uiCamera.layer.clear === 'function') {
                this.uiCamera.layer.clear();
            }
        }

        // Resetear otras propiedades
        this.targetX = 0;
        this.targetY = 0;
        this.currentZoom = 1;
        this.defaultZoom = 1;
        this.isBoping = false;
        this.bopIntensity = 0.015;
        this.lastBopTime = 0;

        // Limpiar tweens si existen
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }

    } catch (error) {
        console.warn('Error during camera reset:', error);
    }
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
}
}