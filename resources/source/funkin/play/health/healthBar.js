import { HealthIcon } from './healthIcon.js';

/**
 * HealthBar.js
 * Componente visual que muestra la barra de vida y los iconos de los personajes.
 * Es totalmente pasivo: reacciona a cambios de estado, no calcula lógica de juego.
 */
export class HealthBar {

    /**
     * @param {Phaser.Scene} scene
     * @param {object} chartData
     * @param {import('../data/Conductor.js').Conductor} conductor
     * @param {string} sessionId
     */
    constructor(scene, chartData, conductor, sessionId) {
        this.scene = scene;
        this.chartData = chartData;
        this.sessionId = sessionId;

        this.health = 1.0;
        this.targetHealth = 1.0;
        this.maxHealth = 2.0;
        this.opacity = 1.0;
        
        // Referencias a Iconos
        this.playerIcon = null;
        this.enemyIcon = null;

        // Configuración Visual
        this.config = {
            position: { x: this.scene.cameras.main.width / 2, y: this.scene.cameras.main.height - 70 },
            scale: 1,
            colors: { player: 0x66FF33, enemy: 0xFF0000 },
            iconOffset: 26
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

    /**
     * Precarga dinámica de los iconos específicos de los personajes del chart.
     */
    static preloadIcons(scene, chartData, sessionId) {
        const getIcon = (charRole) => {
            const charName = chartData?.[charRole];
            const charData = charName ? scene.cache.json.get(`char_${charName}`) : null;
            return charData?.healthicon || (charRole === 'player' ? 'bf' : 'dad');
        };

        HealthIcon.preload(scene, getIcon('player'), sessionId);
        HealthIcon.preload(scene, getIcon('enemy'), sessionId);
    }

    async init() {
        this._processCharacterData();

        this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
        this.container.setName("HealthBar_container");
        this.container.alpha = 0;

        // Inicializar Iconos
        this.playerIcon = new HealthIcon(this.scene, this.playerIconName, true, this.isPixelPlayer, this.sessionId);
        this.enemyIcon = new HealthIcon(this.scene, this.enemyIconName, false, this.isPixelEnemy, this.sessionId);
        
        this.playerIcon.bpm = this.bpm;
        this.enemyIcon.bpm = this.bpm;

        await this._createVisuals();

        if (this.opacity < 1) this.container.setAlpha(this.opacity);
        this.updateBar();
    }

    _processCharacterData() {
        const getCharData = (role) => this.scene.cache.json.get(`char_${this.chartData?.[role] || (role === 'player' ? 'bf' : 'dad')}`);
        
        const p1Data = getCharData('player');
        const p2Data = getCharData('enemy');

        this.playerIconName = p1Data?.healthicon || 'bf';
        this.enemyIconName = p2Data?.healthicon || 'dad';

        this.isPixelPlayer = !!(p1Data?.isPixel || p1Data?.no_antialiasing);
        this.isPixelEnemy = !!(p2Data?.isPixel || p2Data?.no_antialiasing);

        if (p1Data?.healthbar_colors) this.config.colors.player = Phaser.Display.Color.GetColor(...p1Data.healthbar_colors);
        if (p2Data?.healthbar_colors) this.config.colors.enemy = Phaser.Display.Color.GetColor(...p2Data.healthbar_colors);
    }

    _loadOpacityFromStorage() {
        const stored = localStorage.getItem('APPEARANCE.UI.HEALTH BAR OPACITY');
        this.opacity = stored !== null ? parseFloat(stored) : 1.0;
    }

    async _createVisuals() {
        this.backgroundBar = this.scene.add.image(0, 0, "healthBar")
            .setScale(this.config.scale).setOrigin(0.5).setDepth(100);

        const w = this.backgroundBar.width * this.config.scale;
        const h = this.backgroundBar.height * this.config.scale;

        // Crear Barras (Graphics)
        this.playerBar = this.scene.add.graphics().setPosition(-w/2, -h/2).setDepth(99);
        this.enemyBar = this.scene.add.graphics().setPosition(-w/2, -h/2).setDepth(99);

        // Crear Iconos
        const p1Sprite = await this.playerIcon.create(w/2, 0); // Posición inicial derecha
        const p2Sprite = await this.enemyIcon.create(-w/2, 0); // Posición inicial izquierda

        this.playerIcon.setDepth(101);
        this.enemyIcon.setDepth(101);

        this.container.add([this.playerBar, this.enemyBar, this.backgroundBar, p1Sprite, p2Sprite]);
        this.container.setScrollFactor(0);
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

    updateBar() {
        if (!this.backgroundBar) return;
        
        const w = this.backgroundBar.width * this.config.scale;
        const h = this.backgroundBar.height * this.config.scale;

        // Porcentaje de salud (0..1)
        const percent = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        const playerWidth = w * percent;

        // Dibujar Barras
        this.playerBar.clear().fillStyle(this.config.colors.player).fillRect(w - playerWidth, 0, playerWidth, h);
        this.enemyBar.clear().fillStyle(this.config.colors.enemy).fillRect(0, 0, w - playerWidth, h);

        // Posicionar Iconos
        const centerX = (w / 2) - (percent * w);
        const offset = this.config.iconOffset;

        if (this.playerIcon?.sprite) {
            const scale = this.playerIcon.sprite.scaleX;
            this.playerIcon.x = centerX + offset + (this.playerIcon.sprite.width * scale * 0.2);
        }

        if (this.enemyIcon?.sprite) {
            const scale = this.enemyIcon.sprite.scaleX;
            this.enemyIcon.x = centerX - offset - (this.enemyIcon.sprite.width * scale * 0.2);
        }

        // Actualizar estado (Losing/Winning)
        // Iconos esperan valor 0-2
        const healthValue = percent * 2;
        if (this.playerIcon) this.playerIcon.updateIconState(healthValue < 0.4);
        if (this.enemyIcon) this.enemyIcon.updateIconState(healthValue > 1.6);
    }

    updateHealth(elapsed) {
        // Interpolación visual suave hacia el valor objetivo
        this.health = Phaser.Math.Linear(this.health, this.targetHealth, 1 - Math.exp(-elapsed * 10));
        this.updateBar();
    }

    updateBeatBounce(currentTime, delta) {
        this.playerIcon?.updateBeatBounce(currentTime, delta);
        this.enemyIcon?.updateBeatBounce(currentTime, delta);
    }

    setHealth(value) {
        this.targetHealth = Phaser.Math.Clamp(value, 0, this.maxHealth);
    }

    destroy() {
        this.playerIcon?.destroy();
        this.enemyIcon?.destroy();
        this.container?.destroy();
    }
}