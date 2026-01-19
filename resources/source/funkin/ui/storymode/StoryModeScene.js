import { StoryMenuHandler } from './StoryMenuHandler.js';
import { PlayScene } from '../../play/PlayScene.js';
import { SMData } from './data/SMData.js';
import { SMDataFlow } from './data/SMDataFlow.js';
import { SMPreload } from './load/SMPreload.js';
import { SMClearScene } from './load/SMClearScene.js';

class StoryModeScene extends Phaser.Scene {
    constructor() {
        super({ key: "StoryModeScene" });
        this.canPressEnter = true;
        this.handler = null;
        
        this.smData = new SMData();
        this.dataFlow = new SMDataFlow(this, this.smData);
        this.loader = new SMPreload(this);
        this.cleaner = new SMClearScene(this);
    }

    preload() {
        console.log("StoryModeState preload started");
        this.loader.loadStaticAssets();

        this.load.once('complete', () => {
            console.log("Preload base completo. Iniciando carga de semanas...");
            this.initDataFlow();
        });
    }

    async initDataFlow() {
        await this.dataFlow.loadWeeks();
        
        if (this.smData.weekKeys.length > 0) {
            this.initializeScene();
        } else {
            console.warn("No visible weeks found. Returning to Main Menu.");
            this.scene.start("MainMenuScene");
        }
    }

    create() {
        if (window.Genesis && window.Genesis.discord) {
            Genesis.discord.setActivity({
                details: "Menu in Friday Night Funkin'",
                state: "Story Menu"
            });
        }

        if (!this.sound.get('freakyMenu')) this.sound.add('freakyMenu');
        const menuMusic = this.sound.get('freakyMenu');
        if (menuMusic && !menuMusic.isPlaying) menuMusic.play({ loop: true, volume: 0.7 });

        this.canPressEnter = true;
        
        this.add.rectangle(this.scale.width / 2, 0, this.scale.width, 56, 0x000000)
            .setOrigin(0.5, 0).setDepth(500);

        this.events.on('wake', () => {
            this.canPressEnter = true;
            if (this.handler) { this.handler.setupInputs(); }
        });
    }

    initializeScene() {
        this.handler = new StoryMenuHandler(this);
        this.handler.create(); 
        this.handler.setupInputs();
    }
    
    update(time, delta) {
        if (this.handler && this.handler.handleGamepadInput && this.canPressEnter) {
            this.handler.handleGamepadInput(time, delta);
        }
    }

    shutdown() {
        const result = this.cleaner.cleanup({
            handler: this.handler
        });

        this.handler = null;
        this.smData = result.smData;
        this.dataFlow = result.dataFlow;
    }
}

globalThis.PlayScene = PlayScene;
game.scene.add("StoryModeScene", StoryModeScene);