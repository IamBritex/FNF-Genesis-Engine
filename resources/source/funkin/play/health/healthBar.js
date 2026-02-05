import { HealthIcon } from './healthIcon.js';

export class HealthBar {

    constructor(scene, chartData, conductor, sessionId) {
        this.scene = scene;
        this.chartData = chartData;
        this.sessionId = sessionId;

        this.health = 1.0;
        this.curHealth = 1.0;
        this.minHealth = 0.0;
        this.maxHealth = 2.0;
        this.opacity = 1.0;
        
        this.playerIconName = null;
        this.enemyIconName = null;
        this.playerIcon = null;
        this.enemyIcon = null;

        this.isPixelPlayer = false;
        this.isPixelEnemy = false;

        this.config = {
            position: {
                x: this.scene.cameras.main.width / 2,
                y: this.scene.cameras.main.height - 70
            },
            scale: 1,
            colors: {
                player: 0x66FF33, 
                enemy: 0xFF0000
            }
        };

        this.bpm = conductor.bpm || 100;
        this._loadOpacityFromStorage();
    }

    static preload(scene, sessionId) {
        if (!scene.textures.exists('healthBar')) {
            scene.load.image('healthBar', 'public/images/ui/healthBar.png');
        }
        HealthIcon.preload(scene, 'face', sessionId);
    }

    static preloadIcons(scene, chartData, sessionId) {
        const p1Name = chartData?.player || 'bf';
        const p2Name = chartData?.enemy || 'dad';

        const p1Data = scene.cache.json.get(`char_${p1Name}`);
        const p2Data = scene.cache.json.get(`char_${p2Name}`);

        const p1Icon = p1Data?.healthicon || 'bf';
        const p2Icon = p2Data?.healthicon || 'dad';

        HealthIcon.preload(scene, p1Icon, sessionId);
        HealthIcon.preload(scene, p2Icon, sessionId);
    }

    _processCharacterData() {
        const p1Data = this.scene.cache.json.get(`char_${this.chartData?.player || 'bf'}`);
        const p2Data = this.scene.cache.json.get(`char_${this.chartData?.enemy || 'dad'}`);

        this.playerIconName = p1Data?.healthicon || 'bf';
        this.enemyIconName = p2Data?.healthicon || 'dad';

        this.isPixelPlayer = p1Data?.isPixel === true || p1Data?.no_antialiasing === true;
        this.isPixelEnemy = p2Data?.isPixel === true || p2Data?.no_antialiasing === true;

        if (p1Data?.healthbar_colors) {
             this.config.colors.player = Phaser.Display.Color.GetColor(p1Data.healthbar_colors[0], p1Data.healthbar_colors[1], p1Data.healthbar_colors[2]);
        }
        if (p2Data?.healthbar_colors) {
             this.config.colors.enemy = Phaser.Display.Color.GetColor(p2Data.healthbar_colors[0], p2Data.healthbar_colors[1], p2Data.healthbar_colors[2]);
        }
    }

    _loadOpacityFromStorage() {
        const storedOpacity = localStorage.getItem('APPEARANCE.UI.HEALTH BAR OPACITY');
        this.opacity = storedOpacity !== null ? parseFloat(storedOpacity) : 1.0;
    }

    _applyOpacity() {
        if (!this.container) return;
        this.container.setAlpha(this.opacity);
    }

    async init() {
        this._processCharacterData();

        this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
        this.container.setName("HealthBar_container");
        this.container.alpha = 0;

        this.playerIcon = new HealthIcon(this.scene, this.playerIconName, true, this.isPixelPlayer, this.sessionId);
        this.enemyIcon = new HealthIcon(this.scene, this.enemyIconName, false, this.isPixelEnemy, this.sessionId);

        this.playerIcon.bpm = this.bpm;
        this.enemyIcon.bpm = this.bpm;

        await this._createHealthBar();

        if (this.opacity < 1) this._applyOpacity();
        this.updateBar();
    }

    show(duration = 250) {
        if (this.container && this.container.alpha === 0) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: this.opacity,
                duration: duration,
                ease: 'Linear'
            });
        }
    }

    async _createHealthBar() {
        this.backgroundBar = this.scene.add.image(0, 0, "healthBar")
            .setScale(this.config.scale)
            .setOrigin(0.5)
            .setDepth(100);

        const width = this.backgroundBar.width * this.config.scale;
        const height = this.backgroundBar.height * this.config.scale;

        this.playerBar = this.scene.add.graphics()
            .setPosition(-width / 2, -height / 2)
            .setDepth(99);

        this.enemyBar = this.scene.add.graphics()
            .setPosition(-width / 2, -height / 2)
            .setDepth(99);

        const p1Sprite = await this.playerIcon.create(width / 4, 0);
        const p2Sprite = await this.enemyIcon.create(-width / 4, 0);

        this.playerIcon.setDepth(101);
        this.enemyIcon.setDepth(101);

        this.container.add([
            this.playerBar,
            this.enemyBar,
            this.backgroundBar,
            p1Sprite,
            p2Sprite
        ]);

        this.container.setDepth(100);
        this.container.setScrollFactor(0);
    }

    updateBar() {
        if (!this.backgroundBar) return;
        
        const width = this.backgroundBar.width * this.config.scale;
        const height = this.backgroundBar.height * this.config.scale;

        const percent = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        
        const playerFillWidth = width * percent;
        const enemyFillWidth = width - playerFillWidth;

        this._updateHealthBar(this.playerBar, this.config.colors.player, width - playerFillWidth, playerFillWidth, height);
        this._updateHealthBar(this.enemyBar, this.config.colors.enemy, 0, enemyFillWidth, height);

        this._updateIcons(width, percent);
    }

    _updateHealthBar(bar, color, x, width, height) {
        bar.clear().fillStyle(color).fillRect(x, 0, width, height);
    }

    _updateIcons(totalWidth, percent) {
        const iconOffset = 26;

        // [CORRECCIÓN] Invertir la dirección de los iconos
        // Antes: (percent * totalWidth) -> Se mueve a la derecha al ganar
        // Ahora: (totalWidth - (percent * totalWidth)) -> Se mueve a la izquierda al ganar
        // Ajustamos para que 0.5 siga siendo el centro (0)
        
        // El centro visual de la barra es 0 en coordenadas locales.
        // El rango de movimiento va desde -totalWidth/2 (Izquierda total) hasta totalWidth/2 (Derecha total).
        
        // Si percent = 1 (Full vida), queremos que los iconos estén a la Izquierda (-totalWidth/2)
        // Si percent = 0 (Muerto), queremos que los iconos estén a la Derecha (totalWidth/2)
        
        // Fórmula invertida:
        const centerX = (totalWidth / 2) - (percent * totalWidth);

        if (this.playerIcon && this.playerIcon.sprite) {
            gsap.killTweensOf(this.playerIcon.sprite);
            // Player icon (derecha del centro)
            this.playerIcon.x = centerX + iconOffset + (this.playerIcon.sprite.width * this.playerIcon.sprite.scaleX * 0.2); 
        }

        if (this.enemyIcon && this.enemyIcon.sprite) {
            gsap.killTweensOf(this.enemyIcon.sprite);
            // Enemy icon (izquierda del centro)
            this.enemyIcon.x = centerX - iconOffset - (this.enemyIcon.sprite.width * this.enemyIcon.sprite.scaleX * 0.2);
        }

        this._updateIconFrames(percent * 2);
    }

    _updateIconFrames(healthValue) {
        if (!this.playerIcon || !this.enemyIcon) return;
        this.playerIcon.updateIconState(healthValue < 0.4); 
        this.enemyIcon.updateIconState(healthValue > 1.6); 
    }

    updateBeatBounce(currentTime, delta) {
        if (this.playerIcon) this.playerIcon.updateBeatBounce(currentTime, delta);
        if (this.enemyIcon) this.enemyIcon.updateBeatBounce(currentTime, delta);
    }

    updateHealth(elapsed) {
        const newHealth = Phaser.Math.Linear(
            this.health,
            this.curHealth,
            1 - Math.exp(-elapsed * 10) 
        );

        this.health = newHealth;
        this.updateBar();
    }

    setHealth(value) {
        this.curHealth = Phaser.Math.Clamp(value, this.minHealth, this.maxHealth);
    }
    
    damage(amount) {}
    heal(amount) {}

    updateOpacity() {
        this._loadOpacityFromStorage();
        this._applyOpacity();
    }

    destroy() {
        if (this.playerIcon) this.playerIcon.destroy();
        if (this.enemyIcon) this.enemyIcon.destroy();
        if (this.container) this.container.destroy();
    }
}