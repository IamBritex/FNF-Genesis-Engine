import Alphabet from "../../../utils/Alphabet.js";
import { PauseConfig } from "./options.js";

export class PauseUI {
    /**
     * @param {Phaser.Scene} scene - La escena de pausa principal
     */
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

        // Creamos los textos fuera de pantalla (y: -100) para animarlos después
        this.levelInfo = this.scene.add.text(rightX, -100, songName, infoStyle).setOrigin(1, 0);
        this.levelDifficulty = this.scene.add.text(rightX, -100, difficultyName, infoStyle).setOrigin(1, 0);
        this.deathCounterText = this.scene.add.text(rightX, -100, `Blueballed: ${deathCounter}`, infoStyle).setOrigin(1, 0);
    }

    createMenuOptions() {
        const optionsData = PauseConfig && PauseConfig.options ? PauseConfig.options : [
            { name: "Resume", action: "resume" },
            { name: "Restart", action: "restart" },
            { name: "Exit", action: "exit" }
        ];
        
        this.menuItems = [];

        optionsData.forEach((opt) => {
            // [MODIFICADO] Usamos toUpperCase() para forzar las letras BOLD del Alphabet
            const item = new Alphabet(this.scene, 0, 0, opt.name.toUpperCase(), true);
            item.isMenuItem = true;
            item.setScale(1.1);

            // Configuración inicial (fuera de pantalla)
            item.x = -500;
            item.y = (this.scene.scale.height / 2);
            item.alpha = 0;

            // Variables objetivo para el LERP
            item.targetX = 70; // Posición X base
            item.targetY = 0;  // Se calculará dinámicamente
            item.targetAlpha = 0;
            item.targetScale = 1;

            // Guardamos la acción en el objeto
            item.actionID = opt.action;

            // Guardamos referencia: textObj es el Alphabet Container
            this.menuItems.push({ textObj: item, action: opt.action });
            this.scene.add.existing(item);
        });
    }

    // --- LÓGICA DE ANIMACIÓN (LERP) ---
    updateLerp(lerpSpeed = 0.2) {
        this.menuItems.forEach((item) => {
            const obj = item.textObj;

            // Interpolación lineal suave
            obj.x = Phaser.Math.Linear(obj.x, obj.targetX, lerpSpeed);
            obj.y = Phaser.Math.Linear(obj.y, obj.targetY, lerpSpeed);
            obj.alpha = Phaser.Math.Linear(obj.alpha, obj.targetAlpha, lerpSpeed);

            const currentScale = obj.scaleX; // Alphabet usa escala uniforme, scaleX basta
            const newScale = Phaser.Math.Linear(currentScale, obj.targetScale, lerpSpeed);
            obj.setScale(newScale);
        });
    }

    // Calcula dónde debe ir cada ítem según cuál está seleccionado
    updateTargets(currentSelection) {
        const spacing = 120;
        const centerY = this.scene.scale.height / 2;

        // Centramos verticalmente el grupo entero basado en la selección actual
        const startY = centerY - (currentSelection * spacing);

        this.menuItems.forEach((item, index) => {
            const isSelected = (index === currentSelection);
            
            // Calculamos la posición Y relativa
            // Opción A: Lista estática centrada
            // item.textObj.targetY = (centerY - (this.menuItems.length * spacing) / 2) + (index * spacing);
            
            // Opción B: Lista dinámica (el seleccionado siempre está cerca del centro)
            const distance = index - currentSelection;
            item.textObj.targetY = centerY + (distance * spacing);

            if (isSelected) {
                item.textObj.targetAlpha = 1;
                item.textObj.targetScale = 1.2; // Un poco más grande al seleccionar
                item.textObj.targetX = 120; // Se mueve un poco a la derecha
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
        
        // Animación en cascada de los textos de info
        this.scene.tweens.add({ targets: this.levelInfo, y: 15, duration: 300, ease: 'Quartic.Out', delay: 0 });
        this.scene.tweens.add({ targets: this.levelDifficulty, y: 47, duration: 300, ease: 'Quartic.Out', delay: 50 });
        this.scene.tweens.add({ targets: this.deathCounterText, y: 79, duration: 300, ease: 'Quartic.Out', delay: 100 });
    }

    animateOut(onCompleteCallback) {
        // Mover items del menú hacia la izquierda (fuera de pantalla)
        this.menuItems.forEach((item) => {
            item.textObj.targetX = -700;
            item.textObj.targetAlpha = 0;
        });

        // Mover info hacia arriba (fuera de pantalla)
        this.scene.tweens.add({
            targets: [this.levelInfo, this.levelDifficulty, this.deathCounterText],
            y: -100, duration: 300, ease: 'Quartic.In'
        });

        // Desvanecer fondo y ejecutar callback
        this.scene.tweens.add({
            targets: this.bg, alpha: 0, duration: 300, ease: 'Quartic.In',
            onComplete: onCompleteCallback
        });
    }
}