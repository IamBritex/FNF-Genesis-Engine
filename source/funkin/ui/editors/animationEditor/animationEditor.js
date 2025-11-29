import { CameraManager } from '../../../play/camera/Camera.js';
import NavBarMenu from '../utils/NavBarMenu.js';
import { ModularWindow } from '../utils/window.js';
import { GlobalEditorConfig } from '../utils/GlobalEditorConfig.js';
import { updateStageBackground } from '../utils/checkboard.js';
import { ToastManager } from '../utils/Toast.js';

import { CameraAnimationEditor } from './camera/CameraAnimationEditor.js';
import { NavMethods } from './components/NavMethods.js';
import { LoadAnimationWindow } from './window/LoadAnimation.js';
import { navConfig } from './components/NavButtons.js';

import { HealthBarPreview } from './components/healthBarPreview.js';
import { CharacterPreview } from './components/characterPreview.js';

import { HealthBar } from '../../../play/components/healthBar.js';
import { HealthIcon } from '../../../play/components/healthIcon.js';

import { SetOffset } from './input/setOffset.js';
import { Save } from './output/save.js';
import { SaveZIP } from './output/saveZIP.js';
import { AnimationProperties } from './window/Properties.js';
import { ActionHistory } from './input/actionHistory.js';

import { MappingAnimations } from './window/MappingAnimations.js';

// Importaciones de Atajos
import { PreferencesManager } from './input/PreferencesManager.js';
import { initKeyInputs } from './input/shortCuts.js';
import { KeybindingsWindow } from '../stageEditor/window/KeybindingsWindow.js'; 

export class AnimationEditor extends Phaser.Scene {

    constructor() {
        super({ key: 'AnimationEditor' });

        this.cameraManager = null;
        this.globalConfig = null;
        this.toastManager = null;
        
        this.cameraEditor = null;
        this.navMethods = null;
        this.navBar = null;
        
        this.settingsWindow = null;
        this.loadWindow = null;
        this.propertiesWindow = null; 
        this.mappingWindow = null;
        this.keybindingsWindow = null;
        
        this.gameCam = null;
        this.bgCheckerboard = null;
        
        this.baseZoom = 1.0;
        this.baseScrollX = 0;
        this.baseScrollY = 0;
        
        this.editorMusicInstance = null;
        
        this.currentCharacter = null; 
        this.currentJsonData = null; 
        this.characterName = "unknown";
        this.currentPngUrl = null;
        this.currentXmlUrl = null;

        this.setOffsetInput = null;
        this.saveModule = null;
        this.saveZipModule = null;
        this.preferencesManager = null;
        
        this.healthBarPreview = null;
        this.characterPreview = null;
        this.sessionId = 'editor_session';

        this.isTyping = false;
        this._focusHandler = null;
        this._blurHandler = null;

        this.history = null;
        this.iconCacheIds = {};
    }

    preload() {
        this.load.audio('clickDown', 'public/sounds/editor/ClickDown.ogg');
        this.load.audio('clickUp', 'public/sounds/editor/ClickUp.ogg');
        this.load.audio('undo', 'public/sounds/editor/undo.ogg');
        this.load.audio('editorOpen', 'public/sounds/editor/openWindow.ogg');
        this.load.audio('editorClose', 'public/sounds/editor/exitWindow.ogg');
        this.load.audio('editorsMusic', 'public/music/chartEditorLoop.ogg');
        
        this.load.text('css_global', 'source/funkin/ui/editors/GUI/global.css');
        this.load.text('html_settings', 'source/funkin/ui/editors/GUI/spanish/animationEditor/EditorSettingsWindow.html');
        this.load.text('css_settings', 'source/funkin/ui/editors/GUI/spanish/animationEditor/EditorSettingsWindow.css');
        
        if (!this.cache.text.exists('html_keybinds')) {
            this.load.text('html_keybinds', 'source/funkin/ui/editors/GUI/spanish/stageEditor/KeybindingsWindow.html');
            this.load.text('css_keybinds', 'source/funkin/ui/editors/GUI/spanish/stageEditor/KeybindingsWindow.css');
        }

        HealthBar.preload(this, this.sessionId);
        HealthIcon.preload(this, 'face', this.sessionId);
        HealthIcon.preload(this, 'bf', this.sessionId);
        HealthIcon.preload(this, 'dad', this.sessionId);

        this.cameraManager = new CameraManager(this);
        this.globalConfig = new GlobalEditorConfig();
        
        if (!document.getElementById('modular-window-css')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'modular-window-css';
            styleElement.innerHTML = ModularWindow.getWindowCSS();
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

        this.onWindowMouseDown = (e) => { if (e.button === 0) this.sound.play('clickDown'); };
        this.onWindowMouseUp = (e) => { if (e.button === 0) this.sound.play('clickUp'); };
        window.addEventListener('mousedown', this.onWindowMouseDown);
        window.addEventListener('mouseup', this.onWindowMouseUp);

        this._setupTypingListeners();

        this.sound.stopAll();
        if (!this.editorMusicInstance) {
            this.editorMusicInstance = this.sound.add('editorsMusic', { loop: true, volume: 0 });
        }

        this.preferencesManager = new PreferencesManager(this);
        this.history = new ActionHistory(this);
        this.toastManager = new ToastManager(this);

        initKeyInputs(this); 

        this.navMethods = new NavMethods(this);
        this.cameraEditor = new CameraAnimationEditor(this);
        
        this.setOffsetInput = new SetOffset(this);
        this.saveModule = new Save(this);
        this.saveZipModule = new SaveZIP(this);
        
        this.characterPreview = new CharacterPreview(this, this.cameraManager, this.sessionId);
        this.healthBarPreview = new HealthBarPreview(this, this.sessionId);

        this.gameCam = this.cameraManager.gameCamera;
        this.baseZoom = this.gameCam.zoom;
        this.baseScrollX = this.gameCam.scrollX;
        this.baseScrollY = this.gameCam.scrollY;
        
        this.cameraEditor.create();
        this.characterPreview.create();
        this.healthBarPreview.create();

        this.setAsHUDElement = (gameObject) => {
            if (gameObject && gameObject.scene && this.cameraManager) {
                this.cameraManager.assignToHUD(gameObject);
            }
        };

        this.globalConfig.onChange((config) => {
            updateStageBackground(this, config.theme);
            this.updateMusicState();
        });

        this.setupNavBar();
        this.openLoadWindow();
    }

    _setupTypingListeners() {
        this._focusHandler = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                this.isTyping = true;
            }
        };
        this._blurHandler = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                this.isTyping = false;
            }
        };
        window.addEventListener('focus', this._focusHandler, true);
        window.addEventListener('blur', this._blurHandler, true);
    }

    update(time, delta) {
        if (this.cameraEditor) this.cameraEditor.update(delta);
        if (this.setOffsetInput) this.setOffsetInput.update(delta);
        
        if (this.healthBarPreview) this.healthBarPreview.update(delta);
        if (this.characterPreview) this.characterPreview.update(time, delta);
    }

    togglePropertiesWindow() {
        if (this.propertiesWindow && this.propertiesWindow.windowInstance) {
            this.propertiesWindow.windowInstance.destroy();
            this.propertiesWindow = null;
        } else {
            this.propertiesWindow = new AnimationProperties(this);
        }
    }

    toggleMappingWindow() {
        if (this.mappingWindow && this.mappingWindow.windowInstance) {
            this.mappingWindow.windowInstance.destroy();
            this.mappingWindow = null;
        } else {
            this.mappingWindow = new MappingAnimations(this);
        }
    }

    openKeybindingsWindow() {
        if (this.keybindingsWindow) {
            this.keybindingsWindow.windowInstance.destroy();
        }
        this.keybindingsWindow = new KeybindingsWindow(this);
        this.keybindingsWindow.onDestroy = () => {
            this.keybindingsWindow = null;
        };
    }

    toggleGhost(isActive) {
        if (this.characterPreview) this.characterPreview.toggleGhost(isActive);
    }
    
    get isGhostActive() {
        return this.characterPreview ? this.characterPreview.isGhostActive : false;
    }

    applyAnimOffset(sprite, animName) {
        if (this.characterPreview) {
            this.characterPreview.applyOffset(animName);
            this.events.emit('animOffsetChanged', animName);
        }
    }

    openLoadWindow() {
        if (this.loadWindow) this.loadWindow.windowInstance.destroy();
        this.loadWindow = new LoadAnimationWindow(this, (data) => {
            this.handleLoadData(data);
        });
        this.loadWindow.windowInstance.onDestroy = () => { this.loadWindow = null; };
    }

    handleLoadData(data) {
        // [FIX] Detener el loader antes de limpiar para evitar que busque assets que vamos a borrar
        if (this.load.isLoading()) {
            console.warn("Deteniendo carga anterior...");
            this.load.stop();
            this.load.removeAllListeners();
        }

        this.clearPreviousAssets();
        
        if (this.history) this.history.clear();
        this.iconCacheIds = {};
        
        if (this.characterPreview) {
            if (data.pngUrl) this.currentPngUrl = data.pngUrl;
            if (data.xmlUrl) this.currentXmlUrl = data.xmlUrl;
            this.characterPreview.loadCharacter(data);
            this.events.emit('characterLoaded', this.currentJsonData);
        }
    }

    promptNewCharacter() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.png,.xml';
        input.style.display = 'none';
        document.body.appendChild(input);
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                const png = files.find(f => f.name.endsWith('.png'));
                const xml = files.find(f => f.name.endsWith('.xml'));

                if (!png || !xml) {
                    this.toastManager.show("Error", "Se requiere un archivo PNG y un XML.");
                } else {
                    const data = {
                        mode: 'new',
                        name: xml.name.replace('.xml', ''),
                        pngUrl: URL.createObjectURL(png),
                        xmlUrl: URL.createObjectURL(xml)
                    };
                    this.handleLoadData(data);
                }
            }
            document.body.removeChild(input);
        };
        input.click();
    }

    clearPreviousAssets() {
        // [FIX] Verificar que la URL sea válida antes de revocar
        if (this.currentPngUrl && this.currentPngUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentPngUrl);
        }
        if (this.currentXmlUrl && this.currentXmlUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentXmlUrl);
        }
        this.currentPngUrl = null;
        this.currentXmlUrl = null;
    }

    updateMusicState() {
        const config = this.globalConfig.get();
        
        if (config.musicMuted) {
            // Si está muteado, bajamos el volumen suavemente y luego pausamos
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
            // Si NO está muteado:
            if (!this.editorMusicInstance.isPlaying) {
                this.editorMusicInstance.volume = 0; // Asegurar que empiece en silencio
                this.editorMusicInstance.play();
            }
            
            // Subir el volumen suavemente hasta 0.7
            this.tweens.add({
                targets: this.editorMusicInstance,
                volume: 0.7,
                duration: 1000
            });
        }
    }

    setupNavBar() {
        this.navBar = new NavBarMenu(this);
        this.navBar.create(navConfig);
        if (this.navBar.domElement) this.setAsHUDElement(this.navBar.domElement);
    }

    executeModule(module, method) {
        if (this.navMethods) this.navMethods.execute(module, method);
    }

    shutdown() {
        // [FIX] Detener carga pendiente al cerrar la escena
        if (this.load.isLoading()) {
            this.load.stop();
        }

        this.clearPreviousAssets();
        
        if (this.onWindowMouseDown) window.removeEventListener('mousedown', this.onWindowMouseDown);
        if (this.onWindowMouseUp) window.removeEventListener('mouseup', this.onWindowMouseUp);
        
        if (this._focusHandler) window.removeEventListener('focus', this._focusHandler, true);
        if (this._blurHandler) window.removeEventListener('blur', this._blurHandler, true);

        if (this.editorMusicInstance) this.editorMusicInstance.stop();
        if (this.cameraManager) this.cameraManager.shutdown(this);
        if (this.navBar) this.navBar.destroy();
        if (this.toastManager) this.toastManager.destroy();
        if (this.loadWindow) this.loadWindow.windowInstance.destroy();
        if (this.settingsWindow) this.settingsWindow.windowInstance.destroy();
        
        if (this.propertiesWindow) {
            this.propertiesWindow.windowInstance.destroy();
            this.propertiesWindow = null;
        }

        if (this.mappingWindow) {
            this.mappingWindow.windowInstance.destroy();
            this.mappingWindow = null;
        }
        
        if (this.keybindingsWindow) {
            this.keybindingsWindow.windowInstance.destroy();
            this.keybindingsWindow = null;
        }
        
        if (this.healthBarPreview) this.healthBarPreview.destroy();
        if (this.characterPreview) this.characterPreview.destroy();
        
        this.events.removeAllListeners();
        this.input.keyboard.removeAllKeys();
    }
}

game.scene.add('AnimationEditor', AnimationEditor);