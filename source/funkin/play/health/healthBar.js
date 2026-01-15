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
                player: 0x00ff00,
                enemy: 0xff0000
            }
        };

        this.bpm = conductor.bpm || 100;
        this.damageMultiplier = 0.04;
        this.healMultiplier = 0.023;

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

    loadCharacterData() {
        const p1Name = this.chartData?.player || 'bf';
        const p2Name = this.chartData?.enemy || 'dad';

        if (!this.scene.cache.json.exists(`char_${p1Name}`)) {
            this.scene.load.json(`char_${p1Name}`, `public/data/characters/${p1Name}.json`);
        }
        if (!this.scene.cache.json.exists(`char_${p2Name}`)) {
            this.scene.load.json(`char_${p2Name}`, `public/data/characters/${p2Name}.json`);
        }
    }

    _processCharacterData() {
        const p1Data = this.scene.cache.json.get(`char_${this.chartData?.player || 'bf'}`);
        const p2Data = this.scene.cache.json.get(`char_${this.chartData?.enemy || 'dad'}`);

        this.playerIconName = p1Data?.healthicon || 'bf';
        this.enemyIconName = p2Data?.healthicon || 'dad';

        this.isPixelPlayer = p1Data?.isPixel === true || p1Data?.no_antialiasing === true || p1Data?.antialiasing === false;
        this.isPixelEnemy = p2Data?.isPixel === true || p2Data?.no_antialiasing === true || p2Data?.antialiasing === false;

        this.config.colors.player = p1Data?.healthbar_colors ? Phaser.Display.Color.GetColor(p1Data.healthbar_colors[0], p1Data.healthbar_colors[1], p1Data.healthbar_colors[2]) : 0x00ff00;
        this.config.colors.enemy = p2Data?.healthbar_colors ? Phaser.Display.Color.GetColor(p2Data.healthbar_colors[0], p2Data.healthbar_colors[1], p2Data.healthbar_colors[2]) : 0xff0000;
    }

    _loadOpacityFromStorage() {
        const storedOpacity = localStorage.getItem('APPEARANCE.UI.HEALTH BAR OPACITY');
        this.opacity = storedOpacity !== null ? parseFloat(storedOpacity) : 1.0;
    }

    _applyOpacity() {
        if (!this.container) return;

        [this.backgroundBar, this.playerBar, this.enemyBar]
            .forEach(element => {
                if (element) element.setAlpha(this.opacity);
            });

        if (this.playerIcon) this.playerIcon.setAlpha(this.opacity);
        if (this.enemyIcon) this.enemyIcon.setAlpha(this.opacity);
    }

    async init() {
        this._processCharacterData();

        this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
        this.container.setName("HealthBar_container");
        this.container.y = this.scene.cameras.main.height - 70;
        
        // [MODIFICADO] Inicia invisible
        this.container.alpha = 0;

        this.playerIcon = new HealthIcon(this.scene, this.playerIconName, true, this.isPixelPlayer, this.sessionId);
        this.enemyIcon = new HealthIcon(this.scene, this.enemyIconName, false, this.isPixelEnemy, this.sessionId);

        this.playerIcon.bpm = this.bpm;
        this.enemyIcon.bpm = this.bpm;

        await this._createHealthBar();

        this._applyOpacity();
        this.updateBar();
    }

    // [NUEVO] Método para mostrar la barra suavemente
    show(duration = 250) {
        if (this.container && this.container.alpha === 0) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 1,
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
        const width = this.backgroundBar.width * this.config.scale;
        const height = this.backgroundBar.height * this.config.scale;

        const healthPercent = Phaser.Math.Clamp(this.health, this.minHealth, this.maxHealth);

        const playerWidth = (width / 2) * healthPercent;
        const enemyWidth = width - playerWidth;

        this._updateHealthBar(this.playerBar, this.config.colors.player, width - playerWidth, playerWidth, height);
        this._updateHealthBar(this.enemyBar, this.config.colors.enemy, 0, enemyWidth, height);

        this._updateIcons(width / 2, healthPercent, width);
    }

    _updateHealthBar(bar, color, x, width, height) {
        bar.clear().fillStyle(color).fillRect(x, 0, width, height);
    }

    _updateIcons(halfWidth, healthPercent, totalWidth) {
        const iconOffset = 30;
        const greenWidth = halfWidth * healthPercent;
        const redWidth = totalWidth - greenWidth;

        if (this.playerIcon) {
            if (this.playerIcon.sprite) gsap.killTweensOf(this.playerIcon.sprite);

            gsap.to(this.playerIcon, {
                x: -halfWidth + redWidth + iconOffset,
                duration: 0.3,
                ease: "power1.out"
            });
        }

        if (this.enemyIcon) {
            if (this.enemyIcon.sprite) gsap.killTweensOf(this.enemyIcon.sprite);

            gsap.to(this.enemyIcon, {
                x: halfWidth - greenWidth - iconOffset,
                duration: 0.3,
                ease: "power1.out"
            });
        }

        this._updateIconFrames(healthPercent);
    }

    _updateIconFrames(healthPercent) {
        if (!this.playerIcon || !this.enemyIcon) return;

        this.playerIcon.updateIconState(healthPercent < 0.4);
        this.enemyIcon.updateIconState(healthPercent > 1.6);
    }

    updateBeatBounce(currentTime, delta) {
        if (this.playerIcon) this.playerIcon.updateBeatBounce(currentTime, delta);
        if (this.enemyIcon) this.enemyIcon.updateBeatBounce(currentTime, delta);
    }

    updateHealth(elapsed) {
        const newHealth = Phaser.Math.Linear(
            this.health,
            this.curHealth,
            1 - Math.exp(-elapsed * 5)
        );

        this.health = Math.round(newHealth * 10000) / 10000;

        if (this.health < 0.001) {
            this.health = 0;
        }

        this.updateBar();
    }

    setHealth(value) {
        const roundedValue = Math.round(value * 10000) / 10000;
        this.curHealth = Phaser.Math.Clamp(roundedValue, this.minHealth, this.maxHealth);

        if (this.curHealth < 0.001) {
            this.curHealth = 0;
        }
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
        if (this.playerIcon) this.playerIcon.destroy();
        if (this.enemyIcon) this.enemyIcon.destroy();

        if (this.container) this.container.destroy();
    }
}