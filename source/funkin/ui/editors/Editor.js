import { CameraManager } from '../../play/camera/Camera.js';
import Checkboard from './utils/checkboard.js';
import NavBarMenu from './utils/NavBarMenu.js';
import { PreferencesManager } from './stageEditor/input/PreferencesManager.js';
import { ToastManager } from './utils/Toast.js';
import { mainEditorNavConfig } from './components/UI/navBar.js';
import GeneralPreload from './utils/preload/GeneralPreload.js';
import { ExecuteModule } from './components/UI/navBar/ExecuteModule.js';
import { EditorMouseHandler } from './inputs/mouse.js';
import { EditorKeyboardHandler } from './inputs/keyboard.js';
import { EditorBottomBar } from './components/UI/bottomBar/EditorBottomBar.js';
import { WindowManager } from './window/setWindow.js';

export class Editor extends Phaser.Scene {
    constructor() {
        super({ key: 'Editor' });
        this.cameraManager = null;
        this.globalConfig = null;
        this.preferencesManager = null;
        this.navBar = null;
        this.toastManager = null;
        this.executeHandler = null;
        this.mouseHandler = null;
        this.keyboardHandler = null;
        this.bottomBar = null;
        this.windowManager = null;
        this.gameCam = null;
        this.hudCam = null;
        this.music = null;
        this.baseZoom = 1.0;
        this.baseScrollX = 0;
        this.baseScrollY = 0;
        this.bgCheckerboard = null;
        this.elementsManager = null;
        this.currentEditorTab = 'stage';
    }

    preload() {
        GeneralPreload.preload(this);
    }

    create() {
        this.sound.stopAll();
        this.setupGlobalCSS();

        this.cameraManager = new CameraManager(this);
        this.setupCameras();

        this.toastManager = new ToastManager(this);
        this.preferencesManager = new PreferencesManager(this);
        this.executeHandler = new ExecuteModule(this);

        this.setupBackground();
        this.setupUI();

        this.windowManager = new WindowManager(this);

        this.bottomBar = new EditorBottomBar(this);
        this.bottomBar.create(
            this.currentEditorTab,
            (selectedId) => this.onEditorTabChanged(selectedId)
        );

        this.mouseHandler = new EditorMouseHandler(this);
        this.keyboardHandler = new EditorKeyboardHandler(this);
        this.cameraEditor = this.keyboardHandler;

        this.playEditorMusic();

        this.baseZoom = this.gameCam.zoom;
        this.baseScrollX = this.gameCam.scrollX;
        this.baseScrollY = this.gameCam.scrollY;

        this.toastManager.show("Genesis Editor", "Editor Unificado Listo.");
    }

    onEditorTabChanged(newId) {
        this.currentEditorTab = newId;
        console.log(`[Editor] Pestaña cambiada a: ${newId}`);
    }

    setupGlobalCSS() {
        if (!document.getElementById('editor-global-css')) {
            const globalCSS = this.cache.text.get('css_global');
            const style = document.createElement('style');
            style.id = 'editor-global-css';
            style.innerHTML = globalCSS;
            document.head.appendChild(style);
            document.body.classList.add('editor-scope');
        }
    }

    setupCameras() {
        this.gameCam = this.cameraManager.gameCamera;
        this.gameCam.setBackgroundColor('#1a1a1a');
        this.hudCam = this.cameraManager.HUDCamera;
        if (!this.hudCam) {
            this.hudCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
            this.hudCam.setName('HUDCamera');
            this.hudCam.setScroll(0, 0);
        }
    }

    setupBackground() {
        const width = this.scale.width;
        const height = this.scale.height;
        this.bgCheckerboard = new Checkboard(this, width / 2, height / 2, width, height);
        this.bgCheckerboard.setDepth(-100);
        this.bgCheckerboard.setScrollFactor(0);
    }

    setupUI() {
        this.navBar = new NavBarMenu(this);
        this.navBar.create(mainEditorNavConfig);
        if (this.navBar.domElement) this.cameraManager.assignToHUD(this.navBar.domElement);
        if (this.toastManager.container) this.cameraManager.assignToHUD(this.toastManager.container);
    }

    playEditorMusic() {
        this.music = this.sound.add('chartEditorLoop', { loop: true, volume: 0 });
        this.music.play();
        this.tweens.add({ targets: this.music, volume: 0.7, duration: 2000, ease: 'Linear' });
    }

    update(time, delta) {
        if (this.keyboardHandler) this.keyboardHandler.update(delta);
        const lerpFactor = 0.15;
        this.gameCam.setZoom(Phaser.Math.Linear(this.gameCam.zoom, this.baseZoom, lerpFactor));
        this.gameCam.scrollX = Phaser.Math.Linear(this.gameCam.scrollX, this.baseScrollX, lerpFactor);
        this.gameCam.scrollY = Phaser.Math.Linear(this.gameCam.scrollY, this.baseScrollY, lerpFactor);
        if (this.bgCheckerboard) {
            this.bgCheckerboard.tilePositionX = this.gameCam.scrollX;
            this.bgCheckerboard.tilePositionY = this.gameCam.scrollY;
            this.bgCheckerboard.tileScaleX = this.gameCam.zoom;
            this.bgCheckerboard.tileScaleY = this.gameCam.zoom;
        }
    }

    executeModule(module, method, value) {
        if (this.executeHandler) this.executeHandler.execute(module, method, value);
    }

    returnToMenu() {
        if (this.music) {
            this.tweens.add({ targets: this.music, volume: 0, duration: 500, onComplete: () => { this.music.stop(); this.shutdownEditor(); } });
        } else {
            this.sound.stopAll();
            this.shutdownEditor();
        }
    }

    shutdownEditor() {
        if (this.cameraManager) this.cameraManager.shutdown(this);
        this.scene.start('MainMenuScene');
    }
}

game.scene.add('Editor', Editor);