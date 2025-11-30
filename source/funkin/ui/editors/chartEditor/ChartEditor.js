/**
 * source/funkin/ui/editors/chartEditor/ChartEditor.js
 */
import { GlobalEditorConfig } from '../utils/GlobalEditorConfig.js';
import NavBarMenu from '../utils/NavBarMenu.js';
import { ToastManager } from '../utils/Toast.js';
import { Conductor } from '../../../play/Conductor.js';

import { ChartDataManager } from './data/ChartDataManager.js';
import { ChartGrid } from './components/ChartGrid.js';
import { navConfig } from './components/ChartNavConfig.js';
import { NavMethods } from './components/NavMethods.js';

import { NoteSkin } from '../../../play/notes/NoteSkin.js';

export class ChartEditor extends Phaser.Scene {
    constructor() {
        super({ key: 'ChartEditor' });

        this.globalConfig = null;
        this.toastManager = null;
        this.navBar = null;
        this.navMethods = null;
        
        this.conductor = null;
        this.dataManager = null;
        this.grid = null;

        this.zoom = 1.0;
        this.scrollSpeed = 1.0;
        
        this.bgImage = null;
        this.sessionId = null; 

        this.isMetronomeActive = false;
        this.metronomeSound = null;

        this.noteSkin = null;
        this.isEditorReady = false;

        // Cámaras
        this.gameCamera = null;
        this.uiCamera = null;

        this.initialBgScaleX = 1;
        this.initialBgScaleY = 1;
    }

    init() {
        this.sessionId = 'editor_' + Date.now();
        this.isEditorReady = false;
    }

    preload() {
        this.load.audio('clickDown', 'public/sounds/editor/ClickDown.ogg');
        this.load.audio('metronomeTick', 'public/sounds/editor/ClickUp.ogg'); 
        this.load.text('css_global', 'source/funkin/ui/editors/GUI/global.css');
        this.load.image('menuDesat', 'public/images/menu/bg/menuDesat.png');

        this.globalConfig = new GlobalEditorConfig();

        this.noteSkin = new NoteSkin(this, { noteSkin: 'Funkin' });
        this.noteSkin.preloadJSON();
    }

    create() {
        this.sound.stopAll();
        this.metronomeSound = this.sound.add('metronomeTick', { volume: 0.5 });

        this.noteSkin.loadAssets();

        this.load.once('complete', () => {
            this.initEditorUI();
        });
        this.load.start();
    }

    initEditorUI() {
        const globalCSS = this.cache.text.get('css_global');
        const style = document.createElement('style');
        style.innerHTML = globalCSS;
        document.head.appendChild(style);
        document.body.classList.add('editor-scope');

        // --- 1. CÁMARAS ---
        
        // Game Camera (Principal)
        this.gameCamera = this.cameras.main;
        this.gameCamera.setName('GameCamera');

        // UI Camera (HUD)
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setName('UICamera');
        this.uiCamera.setScroll(0, 0);

        // --- 2. INSTANCIAS ---
        this.toastManager = new ToastManager(this);
        this.conductor = new Conductor(100);
        this.conductor.on('beat', this.onBeatHit, this);

        this.dataManager = new ChartDataManager(this);
        this.navMethods = new NavMethods(this);

        // --- FONDO (En GameCamera) ---
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.bgImage = this.add.image(centerX, centerY, 'menuDesat');
        this.bgImage.setOrigin(0.5, 0.5);
        this.bgImage.setDisplaySize(this.scale.width, this.scale.height);
        this.bgImage.setTint(0x555555);
        this.bgImage.setDepth(-100); 
        this.bgImage.setScrollFactor(0); // No se mueve lateralmente

        this.initialBgScaleX = this.bgImage.scaleX;
        this.initialBgScaleY = this.bgImage.scaleY;

        // Grid
        this.grid = new ChartGrid(this, this.conductor, this.dataManager, this.sessionId, this.noteSkin);
        this.grid.create();

        // UI Navbar
        this.navBar = new NavBarMenu(this);
        this.navBar.create(navConfig);

        // --- 3. ASIGNAR OBJETOS A CÁMARAS ---
        this.assignObjectsToCameras();

        // Inputs
        this.input.keyboard.on('keydown-SPACE', () => {
            this.togglePlayback();
        });
        
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (this.conductor && !this.conductor.isPlaying) {
                const scrollAmount = (deltaY > 0 ? 1 : -1) * 150; 
                const maxTime = 300000; 
                let newTime = this.conductor.songPosition + scrollAmount;
                newTime = Math.max(0, Math.min(newTime, maxTime));
                
                this.conductor.songPosition = newTime;
                if (this.grid) this.grid.updateScroll(newTime);
            }
        });

        // Controles: J/L Mover, U/O Zoom
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
        this.keyZoomIn = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
        this.keyZoomOut = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);

        this.isEditorReady = true;
        this.toastManager.show("Chart Editor", "Listo.");
    }

    assignObjectsToCameras() {
        // Elementos del JUEGO (Notas, Grid, Fondo)
        // Usamos filter para eliminar nulos si ghostNote u otros no cargaron
        const gameElements = [
            this.grid.graphics,
            this.grid.notePool,
            this.grid.holdPool,
            this.grid.ghostNote,
            this.grid.inputZone,
            this.bgImage,
            ...this.grid.strumSprites
        ].filter(e => e !== null && e !== undefined);

        // Elementos del HUD (Navbar, Toast)
        const uiElements = [
            this.navBar.bgGraphics, 
            this.toastManager.container
        ].filter(e => e !== null && e !== undefined);

        // 1. Game Camera ve Juego. IGNORA HUD.
        this.gameCamera.ignore(uiElements);

        // 2. UI Camera ve HUD. IGNORA Juego.
        // Esto asegura que las notas NO se vean en el HUD y que el clic no se detecte desde el HUD
        this.uiCamera.ignore(gameElements);
    }

    onBeatHit(beat) {
        if (this.isMetronomeActive && this.conductor && this.conductor.isPlaying) {
            this.metronomeSound.play();
        }
    }

    toggleMetronome() {
        this.isMetronomeActive = !this.isMetronomeActive;
        const iconContainer = document.getElementById('metronome-icon-container');
        if (iconContainer) {
            iconContainer.style.color = this.isMetronomeActive ? '#00FFFF' : '#ccc';
        }
    }

    update(time, delta) {
        if (!this.isEditorReady) return;

        if (this.conductor) this.conductor.update(delta);
        if (this.grid) this.grid.update(delta);

        // Movimiento
        const moveSpeed = 10;
        if (this.keyLeft.isDown) {
            this.gameCamera.scrollX -= moveSpeed;
        }
        if (this.keyRight.isDown) {
            this.gameCamera.scrollX += moveSpeed;
        }

        // Zoom y Escalado de Fondo
        const zoomSpeed = 0.02;
        let zoomChanged = false;

        if (this.keyZoomIn.isDown) {
            this.gameCamera.zoom = Math.min(this.gameCamera.zoom + zoomSpeed, 3.0);
            zoomChanged = true;
        }
        if (this.keyZoomOut.isDown) {
            this.gameCamera.zoom = Math.max(this.gameCamera.zoom - zoomSpeed, 0.5);
            zoomChanged = true;
        }

        if (zoomChanged && this.bgImage) {
            const currentZoom = this.gameCamera.zoom;
            // Escala inversa: Si el zoom aumenta (acerca), reducimos la imagen
            // para que ocupe el mismo espacio visual en pantalla.
            this.bgImage.setScale(
                this.initialBgScaleX / currentZoom,
                this.initialBgScaleY / currentZoom
            );
        }
    }

    togglePlayback() {
        if (!this.conductor) return;
        if (this.conductor.isPlaying) {
            this.conductor.stop();
        } else {
            this.conductor.start();
        }
    }

    executeModule(module, method, value) {
        this.navMethods.execute(module, method, value);
    }

    shutdown() {
        if (this.conductor) this.conductor.stop();
        if (this.toastManager) this.toastManager.destroy();
        if (this.navBar) this.navBar.destroy();
        
        if (this.noteSkin) {
            const keys = ['notes', 'strumline', 'sustain'];
            keys.forEach(k => {
                const key = this.noteSkin.getTextureKey(k);
                if (this.textures.exists(key)) this.textures.remove(key);
            });
        }
    }
}

game.scene.add('ChartEditor', ChartEditor);