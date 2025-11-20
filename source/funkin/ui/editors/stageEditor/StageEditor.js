import { CameraManager } from '../../../play/camera/Camera.js';
import { StageCharacters } from './objects/StageCharacters.js';
import NavBarMenu from '../utils/NavBarMenu.js';
import { ModularWindow } from '../utils/window.js';
import { EditorStageManager } from './EditorStageManager.js';
import { ElementSelector } from './objects/Elements.js';
import { LayersPanel } from './components/Layers.js';
import { ActionHistory } from './input/ActionHistory.js';
import { CamerasBoxes } from './camera/CamerasBoxes.js';
import { Conductor } from '../../../play/Conductor.js';
import { SaveStage } from './input/Save.js';
import { SaveAsManager } from './input/SaveAs.js';
import { CameraEditor } from './camera/CameraEditor.js';
import { TestManager } from './camera/TestManager.js';
import { initKeyInputs, initMouseInputs } from './input/shortCuts.js';
import navConfig from './components/NavButtonsConfig.js';
import { NavMethods } from './components/NavMethods.js';
import { EditorMethods } from './components/EditorMethods.js';
import { updateStageBackground } from '../utils/checkboard.js'; 
import { GlobalEditorConfig } from '../utils/GlobalEditorConfig.js';
import { ToastManager } from '../utils/Toast.js';
import { ElementClipboard } from './input/ElementClipboard.js';
import { PreferencesManager } from './input/PreferencesManager.js';
import { LoadingLol } from './components/LoadingLol.js';

export class StageEditor extends Phaser.Scene {

    constructor() {
        super({ key: 'StageEditor' });

        this.cameraManager = null;
        this.stageManager = null;
        this.elementsManager = null;
        this.stageCharacters = null;
        this.actionHistory = null;
        this.conductor = null;
        this.saveManager = null;
        this.saveAsManager = null;
        this.clipboard = null;
        this.preferencesManager = null;
        this.cameraEditor = null;
        this.testManager = null;
        this.editorMethods = null;
        this.navMethods = null;
        this.toastManager = null;
        this.gameCam = null;
        this.cameraFocusPoint = null;
        this.floorLines = null;
        this.cursors = null;
        this.panStart = null;
        this.navBar = null;
        this.layersPanel = null;
        this.propertiesWindow = null;
        this.welcomeWindow = null;
        this.findWindow = null;
        this.keybindingsWindow = null;
        this.settingsWindow = null;
        this.isTestMode = false;
        this.isCharactersReady = false;
        this.isCamBoxVisible = false;
        this.isFloorVisible = false;
        this.baseZoom = 1.0;
        this.baseScrollX = 0;
        this.baseScrollY = 0;
        this.editorMusicInstance = null;
        this.CamerasBoxes = CamerasBoxes;
        this.emergencySaveHandler = null;
        this.globalConfig = null;
        this.bgCheckerboard = null;
        
        this.loadingScreen = null;

        // Límites del Checkerboard (Ajustar según la generación real en checkboard.js)
        this.cameraBounds = {
            minX: -2000,
            maxX: 4000,
            minY: -2000,
            maxY: 2000
        };
    }

    preload() {
        this.load.image('loading-bg', 'public/images/menu/bg/funkay.png');

        this.load.audio('clickDown', 'public/sounds/editor/ClickDown.ogg');
        this.load.audio('clickUp', 'public/sounds/editor/ClickUp.ogg');
        this.load.audio('undo', 'public/sounds/editor/undo.ogg');

        this.load.text('css_global', 'source/funkin/ui/editors/GUI/global.css');
        
        this.load.text('html_properties', 'source/funkin/ui/editors/GUI/spanish/stageEditor/PropertiesWindow.html');
        this.load.text('css_properties', 'source/funkin/ui/editors/GUI/spanish/stageEditor/PropertiesWindow.css');
        
        this.load.text('html_prop_general', 'source/funkin/ui/editors/GUI/spanish/stageEditor/properties/GeneralPropertiesWin.html');
        this.load.text('html_prop_object', 'source/funkin/ui/editors/GUI/spanish/stageEditor/properties/ObjectPropertiesWin.html');
        this.load.text('html_prop_char', 'source/funkin/ui/editors/GUI/spanish/stageEditor/properties/CharacterPropertiesWin.html');
        this.load.text('html_prop_sprite', 'source/funkin/ui/editors/GUI/spanish/stageEditor/properties/SpriteSheetsPropertiesWin.html');

        this.load.text('html_settings', 'source/funkin/ui/editors/GUI/spanish/stageEditor/EditorSettingsWindow.html');
        this.load.text('css_settings', 'source/funkin/ui/editors/GUI/spanish/stageEditor/EditorSettingsWindow.css');

        this.load.text('html_char_web', 'source/funkin/ui/editors/GUI/spanish/stageEditor/CharacterSelectorWindow_Web.html');
        this.load.text('html_char_electron', 'source/funkin/ui/editors/GUI/spanish/stageEditor/CharacterSelectorWindow_Electron.html');
        this.load.text('css_char_selector', 'source/funkin/ui/editors/GUI/spanish/stageEditor/CharacterSelectorWindow.css');

        this.load.text('html_keybinds', 'source/funkin/ui/editors/GUI/spanish/stageEditor/KeybindingsWindow.html');
        this.load.text('css_keybinds', 'source/funkin/ui/editors/GUI/spanish/stageEditor/KeybindingsWindow.css');

        this.load.text('html_sure', 'source/funkin/ui/editors/GUI/spanish/stageEditor/Sure.html');
        this.load.text('css_sure', 'source/funkin/ui/editors/GUI/spanish/stageEditor/Sure.css');

        this.load.text('html_welcome', 'source/funkin/ui/editors/GUI/spanish/stageEditor/WelcomeWindow.html');
        this.load.text('html_welcome_list', 'source/funkin/ui/editors/GUI/spanish/stageEditor/WelcomeWindow_List.html');
        this.load.text('html_welcome_create', 'source/funkin/ui/editors/GUI/spanish/stageEditor/WelcomeWindow_Create.html');
        this.load.text('css_welcome', 'source/funkin/ui/editors/GUI/spanish/stageEditor/WelcomeWindow.css');

        this.load.text('html_layers', 'source/funkin/ui/editors/GUI/spanish/stageEditor/components/LayersPanel.html');
        this.load.text('css_layers', 'source/funkin/ui/editors/GUI/spanish/stageEditor/components/LayersPanel.css');

        this.cameraManager = new CameraManager(this);
        this.conductor = new Conductor(130);
        this.preferencesManager = new PreferencesManager(this);
        this.actionHistory = new ActionHistory(this);
        this.elementsManager = new ElementSelector(this, this.cameraManager, this.actionHistory);
        this.stageManager = new EditorStageManager(this, this.cameraManager, this.elementsManager);
        this.stageCharacters = new StageCharacters(this, this.cameraManager, this.elementsManager, this.conductor);

        this.globalConfig = new GlobalEditorConfig();

        this.stageCharacters.preload();
        this.load.audio('editorOpen', 'public/sounds/editor/openWindow.ogg');
        this.load.audio('editorClose', 'public/sounds/editor/exitWindow.ogg');
        this.load.audio('editorsMusic', 'public/music/chartEditorLoop.ogg');
        this.load.audio('menuMusic', 'public/music/FreakyMenu.mp3');

        const styleElement = document.createElement('style');
        styleElement.id = 'modular-window-css';
        styleElement.innerHTML = ModularWindow.getWindowCSS();
        if (!document.getElementById('modular-window-css')) {
            document.head.appendChild(styleElement);
        }
    }

    create() {
        const globalCSS = this.cache.text.get('css_global');
        const globalStyle = document.createElement('style');
        globalStyle.id = 'editor-global-css';
        globalStyle.innerHTML = globalCSS;
        document.head.appendChild(globalStyle);

        document.body.classList.add('editor-scope');

        // Listener global para el sonido de click izquierdo en UI
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Click izquierdo
                this.sound.play('clickDown');
            }
        });
        window.addEventListener('mouseup', (e) => {
             if (e.button === 0) {
                this.sound.play('clickUp');
             }
        });

        this.loadingScreen = new LoadingLol(this);

        this.gameCam = this.cameraManager.gameCamera;
        this.sound.stopAll();

        this.baseZoom = this.gameCam.zoom;
        this.baseScrollX = this.gameCam.scrollX;
        this.baseScrollY = this.gameCam.scrollY;

        if (!this.editorMusicInstance) {
            this.editorMusicInstance = this.sound.add('editorsMusic', {
                loop: true,
                volume: 0
            });
        }
        this.updateMusicState();

        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Estos listeners de Phaser manejan interacción en Canvas (middle click, etc.)
        this.input.on('pointerdown', (pointer) => {
            // Evitar doble sonido si se hace click en canvas (ya manejado por window)
            // Pero mantenemos para lógica interna si es necesario
        });

        const currentTheme = this.globalConfig.get().theme;
        updateStageBackground(this, currentTheme);

        this.toastManager = new ToastManager(this);

        this.saveManager = new SaveStage(this, this.elementsManager, this.stageCharacters, this.stageManager, this.toastManager);
        this.saveAsManager = new SaveAsManager(this, this.elementsManager, this.stageCharacters, this.stageManager, this.toastManager);
        this.clipboard = new ElementClipboard(this, this.elementsManager);
        this.cameraEditor = new CameraEditor(this);
        this.cameraEditor.initKeys();

        this.testManager = new TestManager(this);
        this.editorMethods = new EditorMethods(this);
        this.navMethods = new NavMethods(this);

        this.cameraFocusPoint = this.add.zone(0, 0, 1, 1);
        this.cameraManager.assignToGame(this.cameraFocusPoint);

        this.stageCharacters.create();

        this.floorLines = this.add.graphics();
        this.cameraManager.assignToGame(this.floorLines);
        this.floorLines.setDepth(9997);

        this.setAsHUDElement = (gameObject) => {
            if (gameObject && gameObject.scene && this.cameraManager) {
                this.cameraManager.assignToHUD(gameObject);
            } else {
                console.warn('[StageEditor] Se intentó asignar un objeto no válido a la cámara HUD:', gameObject);
            }
        };

        this.layersPanel = new LayersPanel(this, this.elementsManager);
        this.setAsHUDElement(this.layersPanel.domElement);
        // Ocultar inicialmente
        this.layersPanel.domElement.node.classList.add('hidden-ui');

        this.stageManager.loadRecentStagesList();
        const recentStages = this.stageManager.getRecentStages();
        const recentFileItems = recentStages.length > 0
            ? recentStages.map(stageName => ({
                name: stageName,
                module: 'Stage',
                method: `loadRecent-${stageName}`
              }))
            : [{ name: '(Vacío)', module: 'None', method: 'null' }];

        const fileButton = navConfig.buttons.find(b => b.name === 'Archivo');
        if (fileButton) {
            const recentItem = fileButton.items.find(i => i.name === 'Cargar Reciente');
            if (recentItem) {
                recentItem.items = recentFileItems;
            }
        }

        this.navBar = new NavBarMenu(this);
        this.navBar.create(navConfig);
        // Ocultar inicialmente
        if(this.navBar.domElement) this.navBar.domElement.node.classList.add('hidden-ui');

        this.executeModule = this.navMethods.execute.bind(this.navMethods);

        this.loadStageMethod = (stageName) => {
            if (this.actionHistory) this.actionHistory.clear();
            if (this.saveManager) this.saveManager.clearAutoSaveTimer();
            this.stageManager.loadStage(stageName, this.onStageLoaded.bind(this));
        };
        this.onWelcomeWindowClose = () => {
            this.welcomeWindow = null;
        };

        this.panStart = new Phaser.Math.Vector2();
        this.cursors = this.input.keyboard.createCursorKeys();
        initMouseInputs(this);
        initKeyInputs(this);

        this.events.on('shutdown', this.shutdown, this);

        this.emergencySaveHandler = () => {
            if (this.saveManager && this.stageManager && this.stageManager.currentStageName) {
                console.log("Detectado cierre/error: Intentando guardado de emergencia...");
                this.saveManager.performAutoSave();
            }
        };

        window.addEventListener('beforeunload', this.emergencySaveHandler);
        window.addEventListener('error', this.emergencySaveHandler);
    }

    updateMusicState() {
        const muted = this.globalConfig.get().musicMuted;
        
        if (muted) {
            if (this.editorMusicInstance.isPlaying) {
                this.tweens.add({
                    targets: this.editorMusicInstance,
                    volume: 0,
                    duration: 1000,
                    onComplete: () => {
                        if (this.editorMusicInstance) this.editorMusicInstance.pause();
                    }
                });
            }
        } else {
            if (!this.editorMusicInstance.isPlaying) {
                this.editorMusicInstance.volume = 0;
                this.editorMusicInstance.play();
            }
            this.tweens.add({
                targets: this.editorMusicInstance,
                volume: 0.7,
                duration: 1000
            });
        }
    }

    reassignAllDepths() {
        const allElements = [...this.elementsManager.registeredElements];
        allElements.sort((a, b) => a.depth - b.depth);
        allElements.forEach((el, index) => {
            el.setDepth(index + 1);
        });
        if (this.layersPanel) this.layersPanel.refreshList();
        if (this.propertiesWindow) this.propertiesWindow.refreshValues();
    }

    onStageLoaded(stageContent) {
        if (this.stageCharacters) this.stageCharacters.updateCharacterProperties(stageContent);
        if (this.layersPanel) {
            this.layersPanel.loadFromJSON(stageContent, this.elementsManager);
        }
        if (this.camerasBoxes) this.camerasBoxes.setVisible(this.isCamBoxVisible);
        this.isCharactersReady = true;
        if (this.editorMethods) this.editorMethods.drawFloorLines();
        if (this.saveManager && this.saveManager.autoSaveInterval > 0) {
            this.saveManager.setAutoSave(this.saveManager.autoSaveInterval);
        }
    }

    update(time, delta) {
        const elapsedSeconds = delta / 1000;

        if (this.gameCam) {
            const zoomLerpSpeed = elapsedSeconds * 5;
            this.gameCam.zoom = Phaser.Math.Linear(
                this.gameCam.zoom,
                this.baseZoom,
                zoomLerpSpeed
            );
        }

        if (this.isTestMode) {
            if (this.testManager) {
                this.testManager.update(delta);
            }
        } else {
            const panLerpSpeed = elapsedSeconds * 10;

            // Aplicar límites a la cámara (Checkerboard Bounds)
            this.baseScrollX = Phaser.Math.Clamp(this.baseScrollX, this.cameraBounds.minX, this.cameraBounds.maxX);
            this.baseScrollY = Phaser.Math.Clamp(this.baseScrollY, this.cameraBounds.minY, this.cameraBounds.maxY);

            if (this.gameCam) {
                this.gameCam.scrollX = Phaser.Math.Linear(
                    this.gameCam.scrollX,
                    this.baseScrollX,
                    panLerpSpeed
                );
                this.gameCam.scrollY = Phaser.Math.Linear(
                    this.gameCam.scrollY,
                    this.baseScrollY,
                    panLerpSpeed
                );
            }

            this.cameraEditor.update(delta);

            if (this.elementsManager) {
                this.elementsManager.update(this.cursors);
            }
        }

        if (this.camerasBoxes) {
            this.camerasBoxes.update();
        }

        if (this.isFloorVisible && this.editorMethods) {
            this.editorMethods.drawFloorLines();
        }
    }

    shutdown() {
        console.log("StageEditor apagándose y limpiando...");
        window.removeEventListener('beforeunload', this.emergencySaveHandler);
        window.removeEventListener('error', this.emergencySaveHandler);
        
        // Limpiar listeners globales de window para evitar duplicados al recargar
        // Nota: Phaser no tiene un metodo 'off' para window, se debe hacer manual si se guardaron referencias.
        // Como usamos arrow functions anónimas arriba, no se pueden remover fácilmente. 
        // En una app SPA esto sería un memory leak, pero en este contexto se asume recarga de escena o juego.
        // Para hacerlo bien:
        // window.removeEventListener('mousedown', this.onWindowMouseDown); 

        this.load.off('complete');
        this.load.off('filecomplete');

        if (this.editorMusicInstance) {
            this.editorMusicInstance.stop();
        }

        if (this.stageCharacters) this.stageCharacters.shutdown();
        if (this.stageManager) this.stageManager.shutdown();
        if (this.cameraManager) this.cameraManager.shutdown(this);
        if (this.elementsManager) this.elementsManager.shutdown();
        if (this.saveManager) this.saveManager.clearAutoSaveTimer();

        if (this.welcomeWindow) this.welcomeWindow.destroy();
        if (this.layersPanel) this.layersPanel.destroy();
        if (this.propertiesWindow) this.propertiesWindow.destroy();
        if (this.toastManager) this.toastManager.destroy();
        if (this.findWindow) this.findWindow.windowInstance.destroy();
        if (this.keybindingsWindow) this.keybindingsWindow.windowInstance.destroy();
        if (this.settingsWindow) this.settingsWindow.windowInstance.destroy();
        if (this.loadingScreen) this.loadingScreen.destroy();

        if (this.camerasBoxes) this.camerasBoxes.destroy();
        if (this.floorLines) this.floorLines.destroy();
        if (this.cameraFocusPoint) this.cameraFocusPoint.destroy();

        if (this.actionHistory) this.actionHistory.clear();

        if (this.conductor) {
            this.conductor.off('beat');
            this.conductor.stop();
        }

        this.input.keyboard.off('keydown');
        this.input.keyboard.off('keydown-ESC');
        this.input.off('pointerdown');
        this.input.off('pointermove');
        this.input.off('wheel');

        this.cameraManager = null;
        this.stageManager = null;
        this.elementsManager = null;
        this.stageCharacters = null;
        this.actionHistory = null;
        this.conductor = null;
        this.saveManager = null;
        this.saveAsManager = null;
        this.clipboard = null;
        this.preferencesManager = null;
        this.cameraEditor = null;
        this.testManager = null;
        this.editorMethods = null;
        this.navMethods = null;
        this.toastManager = null;
        this.gameCam = null;
        this.globalConfig = null;
        this.bgCheckerboard = null;
    }
}

game.scene.add("StageEditor", StageEditor);