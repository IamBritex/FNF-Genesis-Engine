export class HealthBar {  
  constructor(scene, options = {}) {  
      this.scene = scene;  
      this._initProperties(options);  
      this._setupBPM();  
  }  
  
  _initProperties(options) {  
      this.health = 1.0;  
      this.curHealth = 1.0;  
      this.minHealth = 0.0;  
      this.maxHealth = 2.0;  
        
      this.damageMultiplier = 1.6;  
      this.healMultiplier = 1.3;  
        
      this.minIconScale = 0.8;  
      this.maxIconScale = 1;  
      this.curIconScale = this.minIconScale;  
        
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
        
      this.iconBounceScale = 0.7;  
      this.iconBounceDuration = 0.2;  
      this.iconTweens = { p1: null, p2: null };  
      this.iconFrames = { p1: 0, p2: 0 };  
  
      this.p1UsingDefault = false;  
      this.p2UsingDefault = false;  
      this.opacity = 1.0;  
      this._loadOpacityFromStorage();  
  }  

  _loadOpacityFromStorage() {
      const storedOpacity = localStorage.getItem('APPEARANCE.UI.HEALTH BAR OPACITY');
      this.opacity = storedOpacity !== null ? parseFloat(storedOpacity) : 1.0;
  }

  _applyOpacity() {
      if (!this.container) return;

      [this.backgroundBar, this.p1HealthBar, this.p2HealthBar, this.p1Icon, this.p2Icon]
          .forEach(element => {
              if (element) element.setAlpha(this.opacity);
          });
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
      this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
      this.container.setName("HealthBar_container");

      const downScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.DOWNSCROLL') === 'true';
      if (downScroll) {
          this.container.y = 25 + (this.backgroundBar?.height ? (this.backgroundBar.height * this.config.scale) / 2 : 20);
      } else {
          this.container.y = this.scene.cameras.main.height - 70;
      }

      this._createBackground();
      this._createHealthBars();
      await this._createIcons();

      this.container.setDepth(100);
      this.container.setScrollFactor(0);
      this.container.setVisible(true);

      if (this.backgroundBar) {
          this.container.add([
              this.p1HealthBar,
              this.p2HealthBar,
              this.backgroundBar,
              this.p1Icon,
              this.p2Icon
          ]);
      }

      this._applyOpacity();

      if (this.scene.cameraController) {
          this.scene.cameraController.addToUILayer(this.container);
      }

      this.updateBar();
  }  
  
  _createBackground() {  
      if (!this.scene.textures.exists("healthBar")) {  
          console.error("Textura 'healthBar' no encontrada");  
          return;  
      }  

      this.backgroundBar = this.scene.add.image(0, 0, "healthBar")  
          .setScale(this.config.scale)  
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(100);
  }  
  
  _createHealthBars() {  
      const width = this.backgroundBar.width * this.config.scale;  
      const height = this.backgroundBar.height * this.config.scale;  

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

          if (this.p1Icon) this.p1Icon.setDepth(101);  
          if (this.p2Icon) this.p2Icon.setDepth(101);  

      } catch (error) {  
          console.error("Error creating icons:", error);  
          this.p1Icon = await this._createDefaultIcon(width / 4, true, 'p1');  
          this.p2Icon = await this._createDefaultIcon(-width / 4, false, 'p2');  
            
          if (this.p1Icon) this.p1Icon.setDepth(101);  
          if (this.p2Icon) this.p2Icon.setDepth(101);  
      }  
  }  
  
  _createIcon(iconInfo, xPos, playerKey, flipX) {  
      if (!iconInfo || !iconInfo.name) {  
          return this._createDefaultIcon(xPos, flipX, playerKey);  
      }  

      const iconKey = `icon-${iconInfo.name}`;  
        
      return new Promise((resolve) => {  
          const loadIcon = (path) => {  
              if (!this.scene.textures.exists(iconKey)) {  
                  this.scene.load.image(iconKey, path);  
                    
                  this.scene.load.once('loaderror', () => {  
                      if (iconInfo.isMod) {  
                          console.log(`Failed to load icon from mod, trying base game...`);  
                          loadIcon(`public/assets/images/characters/icons/${iconInfo.name}.png`);  
                      } else {  
                          console.warn(`Failed to load icon, using default`);  
                          resolve(this._createDefaultIcon(xPos, flipX, playerKey));  
                      }  
                  });  

                  this.scene.load.once('complete', () => {  
                      resolve(this._createIconSprite(iconKey, xPos, flipX, playerKey));  
                  });  

                  this.scene.load.start();  
              } else {  
                  resolve(this._createIconSprite(iconKey, xPos, flipX, playerKey));  
              }  
          };  

          const iconPath = iconInfo.isMod && iconInfo.modPath  
              ? `${iconInfo.modPath}/images/characters/icons/${iconInfo.name}.png`  
              : `public/assets/images/characters/icons/${iconInfo.name}.png`;  

          loadIcon(iconPath);  
      });  
  }  
  
  _createIconSprite(iconKey, xPos, flipX, playerKey) {  
      const sprite = this.scene.add.sprite(xPos, 0, iconKey)  
          .setOrigin(0.5)  
          .setScale(this.minIconScale)  
          .setFlipX(flipX);  

      this._processIconFrames(iconKey, playerKey);  
      return sprite;  
  }  
  
  _processIconFrames(iconKey, playerKey) {  
      const texture = this.scene.textures.get(iconKey);  
      const frame = texture.get(0);  

      // Verificar si la imagen es lo suficientemente ancha para dividir
      if (frame.width > frame.height * 1.5) {  
          const frameWidth = Math.floor(frame.width / 2);  
            
          // Eliminar frames existentes para evitar duplicados
          texture.remove('normal');
          texture.remove('losing');
            
          // Crear frames divididos
          texture.add('normal', 0, 0, 0, frameWidth, frame.height);  
          texture.add('losing', 0, frameWidth, 0, frameWidth, frame.height);  
            
          this.iconFrames[playerKey] = 2;  
      } else {  
          // Si no se divide, usar el frame completo como 'normal'
          texture.add('normal', 0, 0, 0, frame.width, frame.height);
          this.iconFrames[playerKey] = 1;  
      }  
  }  
  
  _createDefaultIcon(xPos, flipX, playerKey) {  
      const iconKey = 'icon-face';  
        
      return new Promise((resolve) => {  
          if (!this.scene.textures.exists(iconKey)) {  
              this.scene.load.image(iconKey, 'public/assets/images/characters/icons/face.png');  
                
              this.scene.load.once('complete', () => {  
                  const icon = this._createIconSprite(iconKey, xPos, flipX, playerKey);  
                  this[flipX ? 'p1UsingDefault' : 'p2UsingDefault'] = true;  
                  resolve(icon);  
              });  

              this.scene.load.start();  
          } else {  
              const icon = this._createIconSprite(iconKey, xPos, flipX, playerKey);  
              this[flipX ? 'p1UsingDefault' : 'p2UsingDefault'] = true;  
              resolve(icon);  
          }  
      });  
  }  
  
  updateBar() {  
      const width = this.backgroundBar.width * this.config.scale;  
      const height = this.backgroundBar.height * this.config.scale;  
      const totalWidth = width;  
      const halfWidth = totalWidth / 2;  
      const healthPercent = Phaser.Math.Clamp(this.health, this.minHealth, this.maxHealth);  

      this._animateHealthBars(width, height, totalWidth, halfWidth, healthPercent);  
      this._animateIcons(halfWidth, healthPercent, totalWidth);  
  }  
  
  _animateHealthBars(width, height, totalWidth, halfWidth, healthPercent) {  
      if (healthPercent <= 0.001 && !this.scene.gameOver?.isActive) {  
          this.scene.events.emit('gameOver', 'player1');  
          return;  
      }  
        
      const greenWidth = halfWidth * healthPercent;  
      const redWidth = totalWidth - greenWidth;  
      const p1Color = this.p1UsingDefault ? 0x808080 : this.config.colors.p1;  
      const p2Color = this.p2UsingDefault ? 0x808080 : this.config.colors.p2;  

      this._animateBar(this.p1HealthBar, p1Color, totalWidth - greenWidth, greenWidth, height);  
      this._animateBar(this.p2HealthBar, p2Color, 0, redWidth, height);  
  }  
  
  _animateBar(bar, color, x, width, height) {  
      gsap.to(bar, {  
          duration: 0.3,  
          onUpdate: () => bar.clear().fillStyle(color).fillRect(x, 0, width, height)  
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

      // Función para establecer el frame de manera segura
      const setIconFrame = (icon, playerKey, useLosingFrame) => {
          const texture = icon.texture;
          
          if (this.iconFrames[playerKey] > 1) {
              // Si tenemos frames divididos
              if (useLosingFrame) {
                  if (texture.has('losing')) {
                      icon.setFrame('losing');
                  } else if (texture.has(1)) {
                      icon.setFrame(1);
                  } else {
                      icon.setFrame('normal');
                  }
              } else {
                  icon.setFrame('normal');
              }
          } else {
              // Si solo tenemos un frame
              icon.setFrame('normal');
          }
      };

      // Player 1 (derecha) - mostrar cara "losing" cuando la salud está baja
      setIconFrame(this.p1Icon, 'p1', healthPercent < 0.4);

      // Player 2 (izquierda) - mostrar cara "losing" cuando la salud está alta
      setIconFrame(this.p2Icon, 'p2', healthPercent > 1.6);
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
          Math.exp(-elapsed * 5)
      );
      
      this.health = Math.round(newHealth * 10000) / 10000;
      
      if (this.health < 0.001) {
          this.health = 0;
      }
  }

  setHealth(value) {
      const roundedValue = Math.round(value * 10000) / 10000;
      this.curHealth = Phaser.Math.Clamp(roundedValue, this.minHealth, this.maxHealth);
      
      if (this.curHealth < 0.001) {
          this.curHealth = 0;
      }
      
      this.updateBar();
  }

  damage(amount) {
      const scaledAmount = amount * this.damageMultiplier;
      const newHealth = Math.max(0, this.curHealth - scaledAmount);
      this.setHealth(newHealth);
  }

  heal(amount) {
      const scaledAmount = amount * this.healMultiplier;
      this.setHealth(Math.min(this.maxHealth, this.curHealth + scaledAmount));
  }

  updateOpacity() {
      this._loadOpacityFromStorage();
      this._applyOpacity();
  }

  destroy() {
      if (this.iconTweens.p1) this.iconTweens.p1.kill();
      if (this.iconTweens.p2) this.iconTweens.p2.kill();
      if (this.container) this.container.destroy();
  }
}