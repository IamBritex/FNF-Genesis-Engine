import Alphabet from "../../../utils/Alphabet.js";
import { PauseConfig } from "./options.js";

export class PauseUI {
    constructor(scene) {
        this.scene = scene;
        this.menuItems = [];

        // Elementos visuales
        this.bg = null;
        this.levelInfo = null;
        this.levelDifficulty = null;
        this.deathCounterText = null;
    }

    createBackground() {
        this.bg = this.scene.add.rectangle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            0x000000
        ).setAlpha(0);
    }

    createInfoText(songName, difficultyName, deathCounter) {
        const infoStyle = { fontFamily: "VCR OSD Mono", fontSize: 32, color: "#FFFFFF", align: "right" };
        const rightX = this.scene.scale.width - 20;

        // Creamos los textos fuera de pantalla (y: -100)
        this.levelInfo = this.scene.add.text(rightX, -100, songName, infoStyle).setOrigin(1, 0);
        this.levelDifficulty = this.scene.add.text(rightX, -100, difficultyName, infoStyle).setOrigin(1, 0);
        this.deathCounterText = this.scene.add.text(rightX, -100, `Blueballed: ${deathCounter}`, infoStyle).setOrigin(1, 0);
    }

    createMenuOptions() {
        const optionsData = PauseConfig.options || [];
        this.menuItems = [];

        optionsData.forEach((opt) => {
            const item = new Alphabet(this.scene, 0, 0, opt.name, true);
            item.isMenuItem = true;
            item.setScale(1.1);

            // Configuración inicial
            item.x = -500;
            item.y = (this.scene.scale.height / 2);
            item.alpha = 0;

            // Variables objetivo para el LERP
            item.targetX = 70;
            item.targetY = 0;
            item.targetAlpha = 0;
            item.targetScale = 1;

            // Guardamos la acción en el objeto para recuperarla luego
            item.actionID = opt.action;

            this.menuItems.push({ textObj: item, action: opt.action });
            this.scene.add.existing(item);
        });
    }

    // --- LÓGICA DE ANIMACIÓN (LERP) ---
    updateLerp(lerpSpeed = 0.2) {
        this.menuItems.forEach((item) => {
            const obj = item.textObj;

            obj.x = Phaser.Math.Linear(obj.x, obj.targetX, lerpSpeed);
            obj.y = Phaser.Math.Linear(obj.y, obj.targetY, lerpSpeed);
            obj.alpha = Phaser.Math.Linear(obj.alpha, obj.targetAlpha, lerpSpeed);

            const currentScale = obj.scaleX;
            const newScale = Phaser.Math.Linear(currentScale, obj.targetScale, lerpSpeed);
            obj.setScale(newScale);
        });
    }

    // Calcula dónde debe ir cada ítem según cuál está seleccionado
    updateTargets(currentSelection) {
        const spacing = 120;
        const centerY = this.scene.scale.height / 2;

        this.menuItems.forEach((item, index) => {
            const isSelected = (index === currentSelection);
            const distance = index - currentSelection;

            item.textObj.targetY = centerY + (distance * spacing);

            if (isSelected) {
                item.textObj.targetAlpha = 1;
                item.textObj.targetScale = 1.1;
                item.textObj.targetX = 100;
            } else {
                item.textObj.targetAlpha = 0.6;
                item.textObj.targetScale = 1.0;
                item.textObj.targetX = 70;
            }
        });
    }

    // --- TWEENS DE ENTRADA Y SALIDA ---
    animateIn() {
        this.scene.tweens.add({ targets: this.bg, alpha: 0.6, duration: 300, ease: 'Quartic.Out' });
        this.scene.tweens.add({ targets: this.levelInfo, y: 15, duration: 300, ease: 'Quartic.Out', delay: 0 });
        this.scene.tweens.add({ targets: this.levelDifficulty, y: 47, duration: 300, ease: 'Quartic.Out', delay: 50 });
        this.scene.tweens.add({ targets: this.deathCounterText, y: 79, duration: 300, ease: 'Quartic.Out', delay: 100 });
    }

    animateOut(onCompleteCallback) {
        // Mover items fuera
        this.menuItems.forEach((item) => {
            item.textObj.targetX = -700;
            item.textObj.targetAlpha = 0;
        });

        // Mover info fuera
        this.scene.tweens.add({
            targets: [this.levelInfo, this.levelDifficulty, this.deathCounterText],
            y: -100, duration: 300, ease: 'Quartic.In'
        });

        // Fondo y Callback
        this.scene.tweens.add({
            targets: this.bg, alpha: 0, duration: 300, ease: 'Quartic.In',
            onComplete: onCompleteCallback
        });
    }
}