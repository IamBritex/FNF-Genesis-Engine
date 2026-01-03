import { PauseOptionsHandler, PauseConfig } from "./options.js";
import { PauseUI } from "./PauseUI.js";

export class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: "PauseScene" });

        this.ui = null; // Instancia de nuestra clase UI
        this.currentSelection = 0;
        this.isClosing = false;

        // Datos del juego
        this.parentScene = null;
        this.songName = "";
        this.difficultyName = "";
        this.deathCounter = 0;

        // Audio
        this.pauseMusic = null;
        this.scrollSound = null;
    }

    init(data) {
        this.parentScene = data.parent;
        this.songName = data.songName || "Unknown";
        this.difficultyName = data.difficulty || "Normal";
        this.deathCounter = data.deaths || 0;

        this.currentSelection = 0;
        this.isClosing = false;
    }

    preload() {
        const musicPath = PauseConfig.music || 'public/music/breakfast.ogg';

        if (!this.cache.audio.exists('breakfast')) {
            this.load.audio('breakfast', musicPath);
        }
        if (!this.cache.audio.exists('scrollMenu')) {
            this.load.audio('scrollMenu', 'public/sounds/scrollMenu.ogg');
        }
    }

    create() {
        // 1. Inicializar UI
        this.ui = new PauseUI(this);
        this.ui.createBackground();
        this.ui.createInfoText(this.songName, this.difficultyName, this.deathCounter);
        this.ui.createMenuOptions();

        // 2. Audio
        this.startPauseMusic();
        if (this.cache.audio.exists('scrollMenu')) {
            this.scrollSound = this.sound.add('scrollMenu');
        }

        // 3. Inputs
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        // 4. Iniciar visuales
        // Seteamos la selección inicial (sin sonido)
        this.ui.updateTargets(this.currentSelection);
        this.ui.animateIn();
    }

    update(time, delta) {
        // Delegamos la animación matemática a la clase UI
        if (this.ui) this.ui.updateLerp(0.2);

        if (this.isClosing) return;

        // Lógica de Inputs
        if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
            this.changeSelection(-1);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
            this.changeSelection(1);
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            // Obtenemos la acción del item seleccionado desde la UI
            const selectedItem = this.ui.menuItems[this.currentSelection];
            if (selectedItem) {
                PauseOptionsHandler.execute(selectedItem.action, this.parentScene, this);
            }
        }
    }

    changeSelection(change) {
        if (change !== 0 && this.scrollSound) {
            this.scrollSound.play();
        }

        const totalItems = this.ui.menuItems.length;
        this.currentSelection += change;

        if (this.currentSelection >= totalItems) this.currentSelection = 0;
        if (this.currentSelection < 0) this.currentSelection = totalItems - 1;

        // Le decimos a la UI que recalcule posiciones basada en la nueva selección
        this.ui.updateTargets(this.currentSelection);
    }

    resumeGame() {
        if (this.isClosing) return;
        this.isClosing = true;

        // La UI maneja la animación de salida, y nos avisa cuando termine para cerrar la escena
        this.ui.animateOut(() => {
            this.closeScene();
        });
    }

    closeScene() {
        if (this.pauseMusic) this.pauseMusic.stop();
        if (this.parentScene) this.parentScene.resumeFromPause();
        this.scene.stop();
    }

    startPauseMusic() {
        const musicKey = this.cache.audio.exists('breakfast') ? 'breakfast' : 'menuMusic';
        if (this.cache.audio.exists(musicKey)) {
            this.pauseMusic = this.sound.add(musicKey, { volume: 0, loop: true });
            this.pauseMusic.play();
            this.tweens.add({ targets: this.pauseMusic, volume: 0.5, duration: 1000 });
        }
    }

    // --- NUEVO MÉTODO PARA LIMPIEZA AL SALIR AL MENÚ ---
    exitToMainMenu() {
        // 1. Detener la música de pausa inmediatamente
        if (this.pauseMusic) {
            this.pauseMusic.stop();
        }

        // 2. Detener la escena de pausa para limpiar recursos
        this.scene.stop();

        // 3. Llamar a la función de salida de la PlayScene
        if (this.parentScene && typeof this.parentScene.exitToMenu === 'function') {
            this.parentScene.exitToMenu();
        }
    }
}

game.scene.add("PauseScene", PauseScene);