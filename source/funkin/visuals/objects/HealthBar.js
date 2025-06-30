export class HealthBar {  
  constructor(scene, options = {}) {  
      this.scene = scene;  
      this._initProperties(options);  
      this._setupBPM();  
      // No llamar a init() aquí, dejarlo para que se llame desde fuera  
  }  
  
  _initProperties(options) {  
      // Configuración básica con más rango de salud  
      this.health = 1.0;      // Valor inicial (50%)  
      this.curHealth = 1.0;  
      this.minHealth = 0.0;   // Valor mínimo exacto  
      this.maxHealth = 2.0;   // Valor máximo exacto  
        
      // Factores de daño y curación  
      this.damageMultiplier = 3.0;  // Aumentado de 2.0 a 3.0  
      this.healMultiplier = 2.5;    // Aumentado de 2.0 a 2.5  
        
      // Ajustar escalas de iconos para reflejar estados más extremos  
      this.minIconScale = 0.8;  
      this.maxIconScale = 1;  
      this.curIconScale = this.minIconScale;  
        
      // Configuración visual  
      this.config = {  
          position: {  
              x: this.scene.cameras.main.width / 2,  
              y: this.scene.cameras.main.height - 70  
          },  
          scale: 1,  
          colors: {  
              p1: this._validateColor(options.p1Color, 0x00ff00),  
              p2: this._validateColor(options.p2Color, 0xff0000)  
          },  
          icons: {  
              p1: options.p1Icon || "face",  
              p2: options.p2Icon || "face"  
          }  
      };  
        
      // Animaciones  
      this.iconBounceScale = 0.7;  
      this.iconBounceDuration = 0.2;  
      this.iconTweens = { p1: null, p2: null };  
      this.iconFrames = { p1: 0, p2: 0 };  
  
      // Inicializar estados de iconos por defecto  
      this.p1UsingDefault = false;  
      this.p2UsingDefault = false;  
  }  
  
  _setupBPM() {  
      this.lastBeatTime = 0;  
      this.bpm = this.scene.songData?.song?.bpm || 100;  
      this.beatInterval = (60 / this.bpm) * 1000;  
  }  
  
  _validateColor(color, defaultValue) {  
      return typeof color === "number" && !isNaN(color) ? color : defaultValue;  
  }  
  
  async init() {
    // Crear el contenedor principal
    this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
    this.container.setName("HealthBar_container");

    // --- POSICIONAR ARRIBA SI DOWNSCROLL ---
    const downScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.DOWNSCROLL') === 'true';
    if (downScroll) {
      // Arriba, separado 10px
      this.container.y = 25 + (this.backgroundBar?.height ? (this.backgroundBar.height * this.config.scale) / 2 : 20);
    } else {
      // Por defecto, abajo
      this.container.y = this.scene.cameras.main.height - 70;
    }

    // Crear elementos
    this._createBackground();
    this._createHealthBars();
    await this._createIcons(); // Esperar a que los iconos se creen

    // Configurar el contenedor
    this.container.setDepth(100);
    this.container.setScrollFactor(0);
    this.container.setVisible(true);

    // Añadir explícitamente todos los elementos al contenedor
    if (this.backgroundBar) {
        this.container.add([
            this.p1HealthBar,
            this.p2HealthBar,
            this.backgroundBar,
            this.p1Icon,
            this.p2Icon
        ]);
    }

    // Asegurar que se añada a la capa UI
    if (this.scene.cameraController) {
        this.scene.cameraController.addToUILayer(this.container);
    }

    this.updateBar();
  }  
  
  _createBackground() {  
      // Verificar si la textura existe  
      if (!this.scene.textures.exists("healthBar")) {  
          console.error("Textura 'healthBar' no encontrada");  
          return;  
      }  
  
      this.backgroundBar = this.scene.add.image(0, 0, "healthBar")  
          .setScale(this.config.scale)  
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(100); // Ajustado para estar en medio  
  }  
  
  _createHealthBars() {  
      const width = this.backgroundBar.width * this.config.scale;  
      const height = this.backgroundBar.height * this.config.scale;  
  
      // Las barras de salud van debajo del fondo  
      this.p1HealthBar = this.scene.add.graphics()  
          .setPosition(-width / 2, -height / 2)  
          .setDepth(99);  
        
      this.p2HealthBar = this.scene.add.graphics()  
          .setPosition(-width / 2, -height / 2)  
          .setDepth(99);  
  }  
  
  async _createIcons() {  
    const width = this.backgroundBar.width * this.config.scale;  
      
    try {  
        // Los iconos van arriba del fondo  
        this.p1Icon = await this._createIcon(  
            this.config.icons.p1,   
            width / 4,   
            'p1',   
            true  
        );  
          
        this.p2Icon = await this._createIcon(  
            this.config.icons.p2,   
            -width / 4,   
            'p2',   
            false  
        );  
  
        // Establecer la profundidad después de que los iconos estén creados  
        if (this.p1Icon) this.p1Icon.setDepth(101);  
        if (this.p2Icon) this.p2Icon.setDepth(101);  
  
    } catch (error) {  
        console.error("Error creating icons:", error);  
        // Crear iconos por defecto si falla  
        this.p1Icon = await this._createDefaultIcon(width / 4, true, 'p1');  
        this.p2Icon = await this._createDefaultIcon(-width / 4, false, 'p2');  
          
        if (this.p1Icon) this.p1Icon.setDepth(101);  
        if (this.p2Icon) this.p2Icon.setDepth(101);  
    }  
}  
  
  _createIcon(iconInfo, xPos, playerKey, flipX) {  
    if (!iconInfo || !iconInfo.name) {  
        console.warn(`No icon info provided for ${playerKey}, using default`);  
        return this._createDefaultIcon(xPos, flipX, playerKey);  
    }  
  
    const iconKey = `icon-${iconInfo.name}`;  
      
    try {  
        // Determinar la ruta del icono basado en la fuente del personaje  
        let iconPath;  
        if (iconInfo.isMod && iconInfo.modPath) {  
            iconPath = `${iconInfo.modPath}/images/characters/icons/${iconInfo.name}.png`;  
        } else {  
            iconPath = `public/assets/images/characters/icons/${iconInfo.name}.png`;  
        }  
  
        // Si la textura no existe, cargarla  
        if (!this.scene.textures.exists(iconKey)) {  
            return new Promise((resolve) => {  
                this.scene.load.image(iconKey, iconPath);  
                  
                // Manejar error si falla la carga desde mod  
                this.scene.load.once('loaderror', () => {  
                    if (iconInfo.isMod) {  
                        console.log(`Failed to load icon ${iconInfo.name} from mod, trying base game...`);  
                        this.scene.load.image(iconKey, `public/assets/images/characters/icons/${iconInfo.name}.png`);  
                          
                        this.scene.load.once('complete', () => {  
                            const icon = this._createIconSprite(iconKey, xPos, flipX, playerKey);  
                            resolve(icon);  
                        });  
                          
                        this.scene.load.start();  
                    } else {  
                        console.warn(`Failed to load icon ${iconInfo.name}, using default`);  
                        resolve(this._createDefaultIcon(xPos, flipX, playerKey));  
                    }  
                });  
  
                this.scene.load.once('complete', () => {  
                    const icon = this._createIconSprite(iconKey, xPos, flipX, playerKey);  
                    resolve(icon);  
                });  
  
                this.scene.load.start();  
            });  
        }  
  
        return this._createIconSprite(iconKey, xPos, flipX, playerKey);  
  
    } catch (error) {  
        console.warn(`Failed to load icon ${iconInfo.name}, using default`);  
        return this._createDefaultIcon(xPos, flipX, playerKey);  
    }  
}  
  
_createIconSprite(iconKey, xPos, flipX, playerKey) {  
    const sprite = this.scene.add.sprite(xPos, 0, iconKey)  
        .setOrigin(0.5)  
        .setScale(this.minIconScale)  
        .setFlipX(flipX);  
  
    // Procesar frames después de crear el sprite  
    const texture = this.scene.textures.get(iconKey);  
    const frame = texture.get(0);  
    this._processIconFrames(texture, frame, playerKey);  
  
    return sprite;  
}  
  
_createDefaultIcon(xPos, flipX, playerKey) {  
    // Crear un sprite con la textura por defecto 'face'  
    const iconKey = 'icon-face';  
      
    // Si la textura por defecto no existe, cargarla  
    if (!this.scene.textures.exists(iconKey)) {  
        return new Promise((resolve) => {  
            this.scene.load.image(iconKey, 'public/assets/images/characters/icons/face.png');  
              
            this.scene.load.once('complete', () => {  
                const icon = this._createIconSprite(iconKey, xPos, flipX, playerKey);  
                // Marcar que estamos usando el icono por defecto  
                this[flipX ? 'p1UsingDefault' : 'p2UsingDefault'] = true;  
                resolve(icon);  
            });  
  
            this.scene.load.start();  
        });  
    }  
  
    const icon = this._createIconSprite(iconKey, xPos, flipX, playerKey);  
    // Marcar que estamos usando el icono por defecto  
    this[flipX ? 'p1UsingDefault' : 'p2UsingDefault'] = true;  
    return icon;  
}  
  
  _processIconFrames(texture, frame, playerKey) {  
    // Solo procesar si la imagen es horizontal y tiene un solo frame  
    if (frame.width > frame.height * 1.5 && texture.frameTotal <= 1) {  
        const frameWidth = Math.floor(frame.width / 2);  
          
        // Crear frames como en el original  
        texture.add("__BASE", 0, 0, 0, frame.width, frame.height);  
        texture.add('normal', 0, 0, 0, frameWidth, frame.height);  // Mitad izquierda  
        texture.add('losing', 0, frameWidth, 0, frameWidth, frame.height);  // Mitad derecha  
          
        // Actualizar contador de frames  
        this.iconFrames[playerKey] = 2;  
          
    } else {  
        this.iconFrames[playerKey] = texture.frameTotal;  
    }  
}  
  
  _assembleContainer() {  
      // Asegurarse de que todos los elementos tengan scrollFactor 0  
      [this.p1HealthBar, this.p2HealthBar, this.backgroundBar, this.p1Icon, this.p2Icon].forEach(element => {  
          if (element && typeof element.setScrollFactor === 'function') {  
              element.setScrollFactor(0);  
          }  
      });  
  
      // Añadir todos los elementos al contenedor  
      this.container.add([  
          this.p1HealthBar,  
          this.p2HealthBar,  
          this.backgroundBar,  
          this.p1Icon,  
          this.p2Icon  
      ]).setDepth(150);  
  }  
  
  _setupKeyboardInput() {  
    if (!this.scene.input.keyboard) {  
        this.scene.input.keyboard = this.scene.input.keyboard.addKey();   
    }  
  
    // Escuchar la tecla R  
    this.keyR = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);  
  
    // Configurar el evento  
    this.keyR.on('down', () => {  
        this.setHealth(this.minHealth); // Establecer salud al mínimo  
        console.log('Tecla R presionada - Salud establecida al minimo')  
    });  
  }  
  
  updateBar() {  
      const width = this.backgroundBar.width * this.config.scale;  
      const height = this.backgroundBar.height * this.config.scale;  
      const totalWidth = width;  
      const halfWidth = totalWidth / 2;  
        
      // Ajustar el rango de clamp para permitir más valores  
      const healthPercent = Phaser.Math.Clamp(this.health, this.minHealth, this.maxHealth);  
  
      this._animateHealthBars(width, height, totalWidth, halfWidth, healthPercent);  
      this._animateIcons(halfWidth, healthPercent, totalWidth);  
  }  
  
  _animateHealthBars(width, height, totalWidth, halfWidth, healthPercent) {  
  
      // Verificar si la salud llegó al mínimo  
      if (healthPercent <= 0.001) {  
          console.log('CRITICAL: Health reached minimum threshold!');  
            
          if (!this.scene.gameOver?.isActive) {  
              console.log('Triggering game over event...');  
              this.scene.events.emit('gameOver', 'player1');  
                
              // Verificar si el evento fue emitido  
              if (this.scene.events.listenerCount('gameOver') > 0) {  
                  console.log('Game over event listeners found:', this.scene.events.listenerCount('gameOver'));  
              } else {  
                  console.warn('No game over event listeners found!');  
              }  
          }  
          return;  
      }  
        
      const greenWidth = halfWidth * healthPercent;  
      const redWidth = totalWidth - greenWidth;  
  
      // Use default colors if using default icons  
      const p1Color = this.p1UsingDefault ? 0x808080 : this.config.colors.p1;  
      const p2Color = this.p2UsingDefault ? 0x808080 : this.config.colors.p2;  
  
      this._animateBar(this.p1HealthBar, p1Color, totalWidth - greenWidth, greenWidth, height);  
      this._animateBar(this.p2HealthBar, p2Color, 0, redWidth, height);  
  }  
  
  _animateBar(bar, color, x, width, height) {  
      gsap.to(bar, {  
          duration: 0.3,  
          onUpdate: () => {  
              bar.clear().fillStyle(color).fillRect(x, 0, width, height);  
          }  
      });  
  }  

  _animateIcons(halfWidth, healthPercent, totalWidth) {
      const iconOffset = 30;
      const greenWidth = halfWidth * healthPercent;
      const redWidth = totalWidth - greenWidth;

      if (this.p1Icon) {
          gsap.to(this.p1Icon, {
              x: -halfWidth + redWidth + iconOffset,
              duration: 0.3,
              ease: "power1.out"
          });
      }

      if (this.p2Icon) {
          gsap.to(this.p2Icon, {
              x: halfWidth - greenWidth - iconOffset,
              duration: 0.3,
              ease: "power1.out"
          });
      }

      this._updateIconFrames(healthPercent);
  }

  _updateIconFrames(healthPercent) {
      if (!this.p1Icon || !this.p2Icon) return;

      // Player 1 (derecha) - mostrar cara "losing" cuando la salud está baja
      if (this.p1Icon) {
          // Si el icono tiene más de 1 frame, usa 0 = normal, 1 = losing
          if (this.p1Icon.texture.frameTotal > 1) {
              this.p1Icon.setFrame(healthPercent < 0.4 ? 1 : 0);
          } else {
              this.p1Icon.setFrame('normal');
          }
      }

      // Player 2 (izquierda) - mostrar cara "losing" cuando la salud está alta
      if (this.p2Icon) {
          if (this.p2Icon.texture.frameTotal > 1) {
              this.p2Icon.setFrame(healthPercent > 1.6 ? 1 : 0);
          } else {
              this.p2Icon.setFrame('normal');
          }
      }
  }

  updateBeatBounce(currentTime, time, delta) {
      const beatTime = (60 / this.bpm) * 1000;
      const currentBeat = Math.floor(currentTime / beatTime);

      if (currentBeat > Math.floor(this.lastBeatTime / beatTime)) {
          this.curIconScale = this.maxIconScale;
          this.lastBeatTime = currentTime;
      }

      this.updateIconsScale(delta / 1000);
      this.updateHealth(delta / 1000);
  }

  updateIconsScale(elapsed) {
      this.curIconScale = Phaser.Math.Linear(
          this.minIconScale, 
          this.curIconScale, 
          Math.exp(-elapsed * 9)
      );
      
      if (this.p1Icon) this.p1Icon.setScale(this.curIconScale);
      if (this.p2Icon) this.p2Icon.setScale(this.curIconScale);
  }

  updateHealth(elapsed) {
      const newHealth = Phaser.Math.Linear(
          this.health,
          this.curHealth,
          Math.exp(-elapsed * 9)
      );
      
      // Redondear a 4 decimales
      this.health = Math.round(newHealth * 10000) / 10000;
      
      // Si la salud es muy cercana a 0, forzarla a 0
      if (this.health < 0.001) {
          this.health = 0;
      }
  }

  setHealth(value) {
      // Redondear a 4 decimales para evitar números muy pequeños
      const roundedValue = Math.round(value * 10000) / 10000;
      this.curHealth = Phaser.Math.Clamp(roundedValue, this.minHealth, this.maxHealth);
      
      // Si el valor es muy cercano a 0, forzarlo a 0
      if (this.curHealth < 0.001) {
          this.curHealth = 0;
      }
      
      this.updateBar();
  }

  damage(amount) {
      const scaledAmount = amount * this.damageMultiplier;
      
      // Aplicar el daño con un mínimo garantizado
      const newHealth = Math.max(0, this.curHealth - scaledAmount);
      
      // Si la salud es muy cercana a 0, forzarla a 0
      if (newHealth < 0.001) {
          this.setHealth(0);
      } else {
          this.setHealth(newHealth);
      }
      
  }

  heal(amount) {
      // Aumentar la curación base
      const scaledAmount = amount * this.healMultiplier;
      
      const newHealth = Math.min(this.maxHealth, this.curHealth + scaledAmount);
      this.setHealth(newHealth);
      
  }

  destroy() {
      if (this.iconTweens.p1) this.iconTweens.p1.kill();
      if (this.iconTweens.p2) this.iconTweens.p2.kill();
      if (this.container) this.container.destroy();
  }
}