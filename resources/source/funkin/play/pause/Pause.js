import { PauseOptionsHandler } from "./options.js";
import { PauseInput } from "./components/PauseInput.js";
import { PauseAudio } from "./components/PauseAudio.js";
import { PauseState } from "./components/PauseState.js";
import { PauseUI } from "./components/PauseUI.js";
import Alphabet from "../../../utils/Alphabet.js";

export class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: "PauseScene" });
        
        // Módulos
        this.inputHandler = null;
        this.audioManager = null;
        this.state = new PauseState();
        this.ui = null;
        
        this.parentScene = null;
        this.isClosing = false;
    }

    init(data) {
        this.parentScene = data.parent;
        this.state.init(data);
        this.isClosing = false;
    }

    preload() {
        Alphabet.load(this);
        this.audioManager = new PauseAudio(this);
        this.audioManager.preload();
    }

    create() {
        Alphabet.createAtlas(this);

        // 1. Iniciar Audio
        this.audioManager.create();

        // 2. Iniciar UI
        this.ui = new PauseUI(this);
        this.ui.create(this.state);
        this.ui.animateIn();
        
        // 3. Iniciar Input
        this.inputHandler = new PauseInput(this);
        this.setupEvents();
        
        // Bloquear input por 300ms para evitar que Start active Resume inmediatamente
        if (this.inputHandler.gamepadInput) {
            this.inputHandler.gamepadInput.setInputLockout(300);
        }

        // Estado visual inicial
        this.ui.update(this.state.currentSelection, 1); // 1 = instantáneo al inicio
    }

    update(time, delta) {
        if (this.isClosing) return;
        
        this.inputHandler.update();
        this.ui.update(this.state.currentSelection, 0.2); // 0.2 = suave
    }

    setupEvents() {
        this.inputHandler.on('select', (change) => {
            this.state.changeSelection(change);
            this.audioManager.playScroll();
        });

        this.inputHandler.on('confirm', () => {
            const action = this.state.getCurrentAction();
            PauseOptionsHandler.execute(action, this.parentScene, this);
        });

        // Agregar listener para el botón "back" (B en gamepad, ESC/BACKSPACE en teclado)
        this.inputHandler.on('back', () => {
            this.resumeGame();
        });
    }

    // --- Métodos de Control llamados desde Options o externamente ---

    resumeGame() {
        if (this.isClosing) return;
        this.isClosing = true;
        this.inputHandler.block();

        this.ui.animateOut(() => {
            this.closeScene();
        });
    }

    closeScene() {
        this.audioManager.stop();
        if (this.parentScene) this.parentScene.resumeFromPause();
        this.scene.stop();
    }

    exitToMainMenu() {
        this.audioManager.stop();
        this.scene.stop();
        if (this.parentScene && typeof this.parentScene.exitToMenu === 'function') {
            this.parentScene.exitToMenu();
        }
    }
}

game.scene.add("PauseScene", PauseScene);