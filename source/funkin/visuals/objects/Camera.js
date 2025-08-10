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

    this.defaultCameraPos = { x: 600, y: 400 }; // Posición inicial centrada
    this.targetCameraPos = { ...this.defaultCameraPos };
    this.cameraLerpSpeed = this.config.lerpSpeed || 0.05;

    this.gameCamera.setZoom(this.gameZoom);
    this.uiCamera.setZoom(this.defaultZoom).setScroll(0, 0);

    this.followSinging = false;
    this.forcedTarget = null;

    // Propiedades para el sistema de cámara dinámica
    this.dynamicCameraEnabled = true;
    this.playerSinging = false;
    this.enemySinging = false;
    this.lastPlayerSingTime = 0;
    this.lastEnemySingTime = 0;
    this.singTimeThreshold = 500; // ms sin cantar antes de cambiar enfoque
    
    // Configuración para detección de dueto
    this.duetStartTime = 0; // Momento cuando ambos empezaron a cantar juntos
    this.duetThreshold = 2500; // 2.5 segundos para considerar dueto
    this.bothSinging = false;
    
    // Sistema de beats para posición neutra
    this.idleBeatsCount = 0; // Contador de beats sin cantar
    this.idleBeatsThreshold = 4; // 4 beats para volver a posición media
    this.lastBeatUpdate = 0; // Último beat registrado
    
    // Posiciones de cámara de los personajes
    this.playerCameraPos = { x: 800, y: 450 };
    this.enemyCameraPos = { x: 400, y: 450 };
    this.gfCameraPos = { x: 600, y: 400 };
    
    // Configuración para modo dueto
    this.duetZoom = 0.9; // Zoom ligeramente reducido cuando ambos cantan (más sutil)
    this.singleZoom = 1.0; // Zoom normal cuando uno canta
    this.currentTargetZoom = this.singleZoom;
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
    
    // Actualizar el sistema de cámara dinámica
    if (this.dynamicCameraEnabled) {
      this._updateDynamicCamera(time);
    }
    
    this._updateCameraPosition(lerpSpeed);
    if (this.isBopping) {
        this._handleBeatBop(songPosition);
    }
    this._updateZooms(elapsedSeconds);
  }

  _updateZooms(elapsedSeconds) {
    // Interpolar hacia el zoom objetivo del sistema dinámico
    this.gameZoom = Phaser.Math.Linear(
        this.gameZoom,
        this.currentTargetZoom,
        elapsedSeconds * 3 // Velocidad de interpolación
    );
    
    // Aplicar el zoom interpolado a la cámara
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

  // ===== SISTEMA DE CÁMARA DINÁMICA =====

  /**
   * Configura las posiciones de cámara desde los datos de los personajes
   */
  setupCharacterCameraPositions(characters) {
    if (!characters) return;

    const { currentPlayer, currentEnemy, currentGF } = characters;

    // Obtener posiciones del jugador
    if (currentPlayer) {
      const playerData = characters.loadedCharacters.get(currentPlayer);
      if (playerData?.data?.camera_position) {
        this.playerCameraPos = {
          x: playerData.data.camera_position[0],
          y: playerData.data.camera_position[1]
        };
      }
    }

    // Obtener posiciones del enemigo
    if (currentEnemy) {
      const enemyData = characters.loadedCharacters.get(currentEnemy);
      if (enemyData?.data?.camera_position) {
        this.enemyCameraPos = {
          x: enemyData.data.camera_position[0],
          y: enemyData.data.camera_position[1]
        };
      }
    }

    // Obtener posiciones de GF
    if (currentGF) {
      const gfData = characters.loadedCharacters.get(currentGF);
      if (gfData?.data?.camera_position) {
        this.gfCameraPos = {
          x: gfData.data.camera_position[0],
          y: gfData.data.camera_position[1]
        };
      }
    }
  }

  /**
   * Notifica que el jugador está cantando
   */
  onPlayerSinging() {
    this.playerSinging = true;
    this.lastPlayerSingTime = this.scene.time.now;
  }

  /**
   * Notifica que el enemigo está cantando
   */
  onEnemySinging() {
    this.enemySinging = true;
    this.lastEnemySingTime = this.scene.time.now;
  }

  /**
   * Actualiza el sistema de cámara dinámica
   */
  _updateDynamicCamera(currentTime) {
    // Verificar si los personajes han dejado de cantar
    if (this.playerSinging && currentTime - this.lastPlayerSingTime > this.singTimeThreshold) {
      this.playerSinging = false;
    }
    
    if (this.enemySinging && currentTime - this.lastEnemySingTime > this.singTimeThreshold) {
      this.enemySinging = false;
    }

    // Actualizar contador de beats si nadie está cantando
    const nobodyIsSinging = !this.playerSinging && !this.enemySinging;
    if (nobodyIsSinging) {
      // Calcular beats transcurridos basándose en BPM
      const beatLength = (60000 / this.currentBPM); // ms por beat
      const beatsSinceLastUpdate = Math.floor((currentTime - this.lastBeatUpdate) / beatLength);
      
      if (beatsSinceLastUpdate >= 1) {
        this.idleBeatsCount += beatsSinceLastUpdate;
        this.lastBeatUpdate = currentTime;
      }
    } else {
      // Si alguien está cantando, resetear contador
      this.idleBeatsCount = 0;
      this.lastBeatUpdate = currentTime;
    }

    // Detectar si ambos están cantando y por cuánto tiempo
    const currentlyBothSinging = this.playerSinging && this.enemySinging;
    
    if (currentlyBothSinging) {
      if (!this.bothSinging) {
        // Inicio del dueto
        this.bothSinging = true;
        this.duetStartTime = currentTime;
      }
    } else {
      // Al menos uno dejó de cantar
      if (this.bothSinging) {
      }
      this.bothSinging = false;
      this.duetStartTime = 0;
    }

    // Determinar el enfoque de cámara
    this._determineCameraFocus(currentTime);
  }

  /**
   * Determina hacia dónde debe enfocar la cámara
   */
  _determineCameraFocus(currentTime) {
    let targetPos;
    let targetZoom;

    // Verificar si es un dueto válido (ambos cantando por al menos 2.5 segundos)
    const isDuet = this.bothSinging && (currentTime - this.duetStartTime >= this.duetThreshold);

    if (isDuet) {
      // Dueto confirmado: punto medio y zoom reducido
      targetPos = this._calculateMidpoint(this.playerCameraPos, this.enemyCameraPos);
      targetZoom = this.duetZoom;
      console.log(`[Camera] DUETO ACTIVO - Zoom: ${targetZoom}, Duración: ${currentTime - this.duetStartTime}ms`);
    } else if (this.playerSinging) {
      // Solo jugador cantando
      targetPos = { ...this.playerCameraPos };
      targetZoom = this.singleZoom;
    } else if (this.enemySinging) {
      // Solo enemigo cantando
      targetPos = { ...this.enemyCameraPos };
      targetZoom = this.singleZoom;
    } else {
      // Nadie cantando: usar posición basada en beats de inactividad
      targetPos = this._getDefaultCameraPosition();
      targetZoom = this.singleZoom;
    }

    // Aplicar el enfoque
    this._setCameraTarget(targetPos, targetZoom);
  }

  /**
   * Calcula el punto medio entre dos posiciones
   */
  _calculateMidpoint(pos1, pos2) {
    return {
      x: (pos1.x + pos2.x) / 2,
      y: (pos1.y + pos2.y) / 2
    };
  }

  /**
   * Obtiene la posición por defecto cuando nadie canta
   */
  _getDefaultCameraPosition() {
    // Si han pasado 4+ beats sin cantar, calcular punto medio entre jugador y enemigo
    if (this.idleBeatsCount >= this.idleBeatsThreshold) {
      return this._calculateMidpoint(this.playerCameraPos, this.enemyCameraPos);
    }
    // Si no, usar la posición por defecto (centro)
    return { ...this.defaultCameraPos };
  }

  /**
   * Establece el objetivo de la cámara
   */
  _setCameraTarget(position, zoom) {
    // Actualizar zoom objetivo (para interpolación suave)
    this.currentTargetZoom = zoom;
    
    // Actualizar posición objetivo usando el zoom actual para cálculos
    const centerX = this.gameCamera.width / (2 * this.gameCamera.zoom);
    const centerY = this.gameCamera.height / (2 * this.gameCamera.zoom);

    this.targetCameraPos = {
      x: position.x - centerX,
      y: position.y - centerY
    };
  }

  /**
   * Habilita o deshabilita el sistema de cámara dinámica
   */
  setDynamicCameraEnabled(enabled) {
    this.dynamicCameraEnabled = enabled;
  }

  /**
   * Configura la sensibilidad del sistema de cámara
   */
  configureDynamicCamera(config = {}) {
    if (config.singTimeThreshold !== undefined) {
      this.singTimeThreshold = config.singTimeThreshold;
    }
    
    if (config.duetZoom !== undefined) {
      this.duetZoom = config.duetZoom;
    }
    
    if (config.singleZoom !== undefined) {
      this.singleZoom = config.singleZoom;
    }
    
    if (config.lerpSpeed !== undefined) {
      this.cameraLerpSpeed = config.lerpSpeed;
    }
  }

  /**
   * Obtiene el estado actual del sistema de cámara dinámica (para debug)
   */
  getDynamicCameraState() {
    return {
      enabled: this.dynamicCameraEnabled,
      playerSinging: this.playerSinging,
      enemySinging: this.enemySinging,
      bothSinging: this.bothSinging,
      duetDuration: this.bothSinging ? Date.now() - this.duetStartTime : 0,
      duetThreshold: this.duetThreshold,
      isValidDuet: this.bothSinging && (Date.now() - this.duetStartTime >= this.duetThreshold),
      idleBeatsCount: this.idleBeatsCount,
      idleBeatsThreshold: this.idleBeatsThreshold,
      currentTarget: this.targetCameraPos,
      currentZoom: this.gameZoom,
      targetZoom: this.currentTargetZoom,
      playerCameraPos: this.playerCameraPos,
      enemyCameraPos: this.enemyCameraPos,
      gfCameraPos: this.gfCameraPos
    };
  }

  /**
   * Fuerza el enfoque a una posición específica (override del sistema dinámico)
   */
  forceCameraTarget(position, zoom = null, duration = 1000) {
    this.dynamicCameraEnabled = false;
    if (zoom) {
      this.gameZoom = zoom;
    }
    
    if (duration > 0) {
      // Transición suave
      this.panToPosition(position.x, position.y, duration);
    } else {
      // Cambio inmediato
      this._setCameraTarget(position, zoom || this.gameZoom);
    }
  }

  /**
   * Reactiva el sistema de cámara dinámica
   */
  enableDynamicCamera() {
    this.dynamicCameraEnabled = true;
  }
}