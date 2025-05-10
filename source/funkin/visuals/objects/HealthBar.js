export class HealthBar {
  constructor(scene, options = {}) {
      this.scene = scene;
      this._initProperties(options);
      this._setupBPM();
      this.init();
  }

  _initProperties(options) {
      // Configuración básica
      this.health = 1; // Valor inicial (50%)
      this.curHealth = 1;
      this.minHealth = 0;
      this.maxHealth = 2;
      
      // Escalado de iconos
      this.minIconScale = 0.7;
      this.curIconScale = 0.7;
      this.maxIconScale = 0.9;
      
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
  }

  _setupBPM() {
      this.lastBeatTime = 0;
      this.bpm = this.scene.songData?.song?.bpm || 100;
      this.beatInterval = (60 / this.bpm) * 1000;
  }

  _validateColor(color, defaultValue) {
      return typeof color === "number" && !isNaN(color) ? color : defaultValue;
  }

  init() {
      this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
      this._createBackground();
      this._createHealthBars();
      this._createIcons();
      this._assembleContainer();
      this.updateBar();
  }

  _createBackground() {
      this.backgroundBar = this.scene.add.image(0, 0, "healthBar")
          .setScale(this.config.scale)
          .setOrigin(0.5);
  }

  _createHealthBars() {
      const width = this.backgroundBar.width * this.config.scale;
      const height = this.backgroundBar.height * this.config.scale;

      this.p1HealthBar = this.scene.add.graphics()
          .setPosition(-width / 2, -height / 2);
      
      this.p2HealthBar = this.scene.add.graphics()
          .setPosition(-width / 2, -height / 2);
  }

  _createIcons() {
      const width = this.backgroundBar.width * this.config.scale;
      
      this.p1Icon = this._createIcon(
          `icon-${this.config.icons.p1}`, 
          width / 4, 
          'p1', 
          true
      );
      
      this.p2Icon = this._createIcon(
          `icon-${this.config.icons.p2}`, 
          -width / 4, 
          'p2', 
          false
      );
  }

  _createIcon(iconKey, xPos, playerKey, flipX) {
      if (!this.scene.textures.exists(iconKey)) return null;

      const texture = this.scene.textures.get(iconKey);
      const frame = texture.get(0);
      this._processIconFrames(texture, frame, playerKey);

      const icon = this.scene.add.sprite(xPos, 0, iconKey, 0)
          .setOrigin(0.5)
          .setScale(this.minIconScale)
          .setFlipX(flipX);

      return icon;
  }

  _processIconFrames(texture, frame, playerKey) {
      if (frame.width > frame.height * 1.5 && texture.frameTotal <= 1) {
          const frameWidth = Math.floor(frame.width / 2);
          texture.add("__BASE", 0, 0, 0, frame.width, frame.height);
          texture.add(0, 0, 0, 0, frameWidth, frame.height);
          texture.add(1, 0, frameWidth, 0, frameWidth, frame.height);
          this.iconFrames[playerKey] = 2;
      } else {
          this.iconFrames[playerKey] = texture.frameTotal;
      }
  }

  _assembleContainer() {
      this.container.add([
          this.p1HealthBar, 
          this.p2HealthBar, 
          this.backgroundBar, 
          this.p1Icon, 
          this.p2Icon
      ]).setDepth(150);
  }

  updateBar() {
      const width = this.backgroundBar.width * this.config.scale;
      const height = this.backgroundBar.height * this.config.scale;
      const totalWidth = width;
      const halfWidth = totalWidth / 2;
      const healthPercent = Phaser.Math.Clamp(this.health, 0, 2);

      this._animateHealthBars(width, height, totalWidth, halfWidth, healthPercent);
      this._animateIcons(halfWidth, healthPercent, totalWidth);
  }

  _animateHealthBars(width, height, totalWidth, halfWidth, healthPercent) {
      const greenWidth = halfWidth * healthPercent;
      const redWidth = totalWidth - greenWidth;

      this._animateBar(this.p1HealthBar, this.config.colors.p1, totalWidth - greenWidth, greenWidth, height);
      this._animateBar(this.p2HealthBar, this.config.colors.p2, 0, redWidth, height);
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

      this.p1Icon.setFrame(0);
      this.p2Icon.setFrame(0);

      if (healthPercent < 0.2 && this.iconFrames.p1 > 1) {
          this.p1Icon.setFrame(1);
      } else if (healthPercent > 1.8 && this.iconFrames.p2 > 1) {
          this.p2Icon.setFrame(1);
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
      this.curHealth = Phaser.Math.Linear(
          this.health, 
          this.curHealth, 
          Math.exp(-elapsed * 9)
      );
      this.health = this.curHealth;
  }

  setHealth(value) {
      this.curHealth = Phaser.Math.Clamp(value, 0, 2);
      this.updateBar();
  }

  damage(amount) {
      this.setHealth(this.curHealth - amount);
  }

  heal(amount) {
      this.setHealth(this.curHealth + amount);
  }

  destroy() {
      if (this.iconTweens.p1) this.iconTweens.p1.kill();
      if (this.iconTweens.p2) this.iconTweens.p2.kill();
      if (this.container) this.container.destroy();
  }
}