import Alphabet from "../../../../utils/Alphabet.js";

export class PauseUI {
    constructor(scene) {
        this.scene = scene;
        this.bg = null;
        this.infoGroup = [];
        this.menuSprites = [];
    }

    create(state) {
        this._createBackground();
        this._createInfo(state);
        this._createMenu(state.menuItems);
    }

    _createBackground() {
        this.bg = this.scene.add.rectangle(
            0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000
        ).setOrigin(0,0).setAlpha(0);
    }

    _createInfo(state) {
        const style = { fontFamily: "VCR OSD Mono", fontSize: 32, color: "#FFFFFF", align: "right" };
        const x = this.scene.scale.width - 20;

        // Crear textos fuera de pantalla para animarlos
        const t1 = this.scene.add.text(x, -100, state.songName, style).setOrigin(1, 0);
        const t2 = this.scene.add.text(x, -100, state.difficulty, style).setOrigin(1, 0);
        const t3 = this.scene.add.text(x, -100, `Blueballed: ${state.deathCounter}`, style).setOrigin(1, 0);

        this.infoGroup = [t1, t2, t3];
    }

    _createMenu(items) {
        this.menuSprites = [];
        items.forEach((itemData, index) => {
            // [ALPHABET] UpperCase para activar Bold automático
            const sprite = new Alphabet(this.scene, 0, 0, itemData.name.toUpperCase(), true);
            
            // Config inicial invisible
            sprite.alpha = 0;
            sprite.targetY = 0; // Se calculará después
            sprite.targetAlpha = 0;
            
            this.menuSprites.push(sprite);
        });
    }

    // Actualiza posiciones visuales
    update(curSelected, lerp = 0.2) {
        const spacing = 120;
        const centerY = this.scene.scale.height / 2;

        this.menuSprites.forEach((sprite, index) => {
            const isSelected = (index === curSelected);
            const distance = index - curSelected;

            // Calcular objetivos
            const targetY = centerY + (distance * spacing);
            const targetAlpha = isSelected ? 1 : 0.6;
            const targetX = isSelected ? 120 : 70;

            // Aplicar Lerp
            sprite.y = Phaser.Math.Linear(sprite.y, targetY, lerp);
            sprite.x = Phaser.Math.Linear(sprite.x, targetX, lerp);
            sprite.alpha = Phaser.Math.Linear(sprite.alpha, targetAlpha, lerp);
        });
    }

    animateIn() {
        // Fondo
        this.scene.tweens.add({ targets: this.bg, alpha: 0.6, duration: 400, ease: 'Quartic.Out' });

        // Info Textos (Cascada)
        const targetsY = [15, 47, 79];
        this.infoGroup.forEach((text, i) => {
            this.scene.tweens.add({ targets: text, y: targetsY[i], duration: 400, ease: 'Quartic.Out', delay: i * 50 });
        });
    }

    animateOut(onComplete) {
        // Textos Info hacia arriba
        this.scene.tweens.add({ targets: this.infoGroup, y: -100, duration: 300, ease: 'Quartic.In' });

        // Menu Items hacia la izquierda
        this.menuSprites.forEach(spr => {
            this.scene.tweens.add({ targets: spr, x: -500, alpha: 0, duration: 300, ease: 'Quartic.In' });
        });

        // Fondo y Callback
        this.scene.tweens.add({
            targets: this.bg, 
            alpha: 0, 
            duration: 300, 
            ease: 'Quartic.In',
            onComplete: onComplete
        });
    }
}