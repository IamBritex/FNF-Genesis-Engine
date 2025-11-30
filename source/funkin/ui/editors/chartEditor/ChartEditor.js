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

import { NoteSpawner } from '../../../play/notes/NoteSpawner.js';
import { Strumline } from '../../../play/notes/Strumline.js';
import { SustainNote } from '../../../play/notes/SustainNote.js';

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
        this.scrollSpeed = 1.0; // [MODIFICADO] Velocidad por defecto 1.0
        
        this.bgImage = null;
        this.sessionId = null; 

        // Metrónomo
        this.isMetronomeActive = false;
        this.metronomeSound = null;
    }

    init() {
        this.sessionId = 'editor_' + Date.now();
    }

    preload() {
        this.load.audio('clickDown', 'public/sounds/editor/ClickDown.ogg');
        this.load.audio('metronomeTick', 'public/sounds/editor/ClickUp.ogg'); // Usamos ClickUp como tick por ahora
        this.load.text('css_global', 'source/funkin/ui/editors/GUI/global.css');
        this.load.image('menuDesat', 'public/images/menu/bg/menuDesat.png');

        this.globalConfig = new GlobalEditorConfig();

        NoteSpawner.preload(this, this.sessionId);
        Strumline.preload(this, this.sessionId);
        SustainNote.preload(this, this.sessionId);
    }

    create() {
        this.sound.stopAll();
        this.metronomeSound = this.sound.add('metronomeTick', { volume: 0.5 });

        const globalCSS = this.cache.text.get('css_global');
        const style = document.createElement('style');
        style.innerHTML = globalCSS;
        document.head.appendChild(style);
        document.body.classList.add('editor-scope');

        this.setAsHUDElement = (gameObject) => {
            if (gameObject && gameObject.setScrollFactor) {
                gameObject.setScrollFactor(0);
            }
        };

        this.toastManager = new ToastManager(this);
        this.conductor = new Conductor(100);
        
        // Escuchar beats para el metrónomo
        this.conductor.on('beat', this.onBeatHit, this);

        this.dataManager = new ChartDataManager(this);
        this.navMethods = new NavMethods(this);

        this.bgImage = this.add.image(0, 0, 'menuDesat');
        this.bgImage.setOrigin(0, 0);
        this.bgImage.setDisplaySize(this.scale.width, this.scale.height);
        this.bgImage.setDepth(-100);
        this.bgImage.setTint(0x555555);
        this.setAsHUDElement(this.bgImage);

        this.grid = new ChartGrid(this, this.conductor, this.dataManager, this.sessionId);
        this.grid.create();

        this.navBar = new NavBarMenu(this);
        this.navBar.create(navConfig);

        this.input.keyboard.on('keydown-SPACE', () => {
            this.togglePlayback();
        });
        
        // --- [MODIFICADO] Scroll de Mouse Suave ---
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.conductor.isPlaying) {
                // Factor reducido para suavidad (antes 500, ahora 100)
                // Dependiendo de tu mouse, ajusta este valor.
                const scrollAmount = (deltaY > 0 ? 1 : -1) * 150; 
                
                const maxTime = 300000; // 5 mins
                let newTime = this.conductor.songPosition + scrollAmount;
                newTime = Math.max(0, Math.min(newTime, maxTime));
                
                this.conductor.songPosition = newTime;
                this.grid.updateScroll(newTime);
            }
        });

        this.toastManager.show("Chart Editor", "Listo.");
    }

    onBeatHit(beat) {
        if (this.isMetronomeActive && this.conductor.isPlaying) {
            this.metronomeSound.play();
        }
    }

    toggleMetronome() {
        this.isMetronomeActive = !this.isMetronomeActive;
        
        // Actualizar visualmente el icono en el DOM
        const iconContainer = document.getElementById('metronome-icon-container');
        if (iconContainer) {
            iconContainer.style.color = this.isMetronomeActive ? '#00FFFF' : '#ccc'; // Azul si activo, gris si no
        }
    }

    update(time, delta) {
        this.conductor.update(delta);
        if (this.grid) {
            this.grid.update(delta);
        }
    }

    togglePlayback() {
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
        this.conductor.stop();
        this.toastManager.destroy();
        if (this.navBar) this.navBar.destroy();
        
        const texturesToClean = [
            `${NoteSpawner.ATLAS_KEY}_${this.sessionId}`, 
            `${Strumline.ATLAS_KEY}_${this.sessionId}`, 
            `${SustainNote.ATLAS_KEY}_${this.sessionId}`
        ];
        texturesToClean.forEach(key => {
            if (this.textures.exists(key)) this.textures.remove(key);
        });
    }
}

game.scene.add('ChartEditor', ChartEditor);