import { loadSongsFromWeeklist } from './data/SongLoader.js';
import { FreeplayStateData } from './data/FreeplayStateData.js';
import { FreeplayBackground } from './display/FreeplayBackground.js';
import { FreeplayList } from './display/FreeplayList.js';
import { InputHandler } from './InputHandler.js';
import { HealthIcon } from '../../play/health/healthIcon.js';

class FreeplayScene extends Phaser.Scene {
    constructor() {
        super({ key: "FreeplayScene" });
        
        this.dataManager = null;
        this.bg = null;
        this.listRenderer = null;
        this.inputHandler = null;

        this.scoreText = null;
        this.diffText = null;
    }

    preload() {
        this.load.image("menuBGMagenta", "public/images/menu/bg/menuBGMagenta.png");
        this.load.text('weekList', 'public/data/ui/weeks.txt');
        this.load.font('vcr', 'public/fonts/vcr.ttf');

        this.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");
        
        HealthIcon.preload(this, 'face', 'freeplay_session');
    }

    async create() {
        this.setupDiscord();
        
        this.checkMenuMusic();

        this.bg = new FreeplayBackground(this);

        try {
            const songs = await loadSongsFromWeeklist(this.cache);
            this.preloadIcons(songs);

            this.load.once('complete', () => {
                this.initModules(songs);
            });
            this.load.start();

        } catch (error) {
            this.showError(error);
        }
    }

    initModules(songs) {
        this.dataManager = new FreeplayStateData();
        this.dataManager.setSongs(songs);

        this.listRenderer = new FreeplayList(this, songs);
        this.createUIText(); // Aquí se crean los textos alineados a la derecha

        this.inputHandler = new InputHandler(this);
        
        this.inputHandler.on('select', (dir) => this.onSelectionChange(dir));
        this.inputHandler.on('diff', (dir) => this.onDiffChange(dir));
        this.inputHandler.on('confirm', () => this.onConfirm());
        this.inputHandler.on('back', () => this.scene.start('MainMenuScene'));

        this.updateUIState();
    }

    update(time, delta) {
        if (this.inputHandler) this.inputHandler.update();
        if (this.listRenderer) this.listRenderer.update(this.dataManager.curSelected, time, delta);
    }

    onSelectionChange(direction) {
        this.dataManager.changeSelection(direction);
        this.updateUIState();
    }

    onDiffChange(direction) {
        this.dataManager.changeDiff(direction);
        this.updateUIText();
    }

    onConfirm() {
        this.inputHandler.blocked = true;
        this.sound.play('confirmSound');

        const song = this.dataManager.getCurrentSong();
        const diffId = this.dataManager.getCurrentDifficultyId();

        const dataToSend = {
            isStoryMode: false,
            playlistSongIds: [song.displayName],
            Score: 0,
            storyTitle: song.weekName || "Freeplay",
            DifficultyID: diffId,
            WeekId: song.weekName || "Freeplay",
            targetSongId: song.displayName,
            currentSongIndex: 0
        };

        this.cameras.main.fadeOut(500, 0, 0, 0, (camera, progress) => {
            if (progress === 1) this.scene.start('PlayScene', dataToSend);
        });
    }

    updateUIState() {
        this.updateUIText();
    }

    createUIText() {
        const { width } = this.cameras.main;
        
        // CORRECCIÓN: Usamos (width - 20) para pegar al borde derecho
        // setOrigin(1, 0) significa que el punto de anclaje es la esquina superior DERECHA del texto.
        this.scoreText = this.add.text(width - 20, 5, "", { 
            fontFamily: 'vcr', 
            fontSize: "32px", 
            fill: "#fff", 
            align: "right" 
        }).setOrigin(1, 0);
        
        this.diffText = this.add.text(width - 20, 45, "", { 
            fontFamily: 'vcr', 
            fontSize: "24px", 
            fill: "#fff", 
            align: "right" 
        }).setOrigin(1, 0);
        
        this.scoreText.setScrollFactor(0);
        this.diffText.setScrollFactor(0);
    }

    updateUIText() {
        this.scoreText.setText("PERSONAL BEST: " + this.dataManager.getCurrentScore());
        this.diffText.setText("< " + this.dataManager.getCurrentDifficultyName() + " >");
    }

    preloadIcons(songs) {
        const iconsToLoad = new Set();
        songs.forEach(s => { if (s.icon) iconsToLoad.add(s.icon); });
        iconsToLoad.forEach(icon => HealthIcon.preload(this, icon, 'freeplay_session'));
    }

    checkMenuMusic() {
        if (!this.sound.get('freakyMenu')) this.sound.add('freakyMenu');
        const m = this.sound.get('freakyMenu');
        if (m && !m.isPlaying) m.play({ loop: true, volume: 0.7 });
    }

    setupDiscord() {
        if (window.Genesis && window.Genesis.discord) {
            Genesis.discord.setActivity({ details: "Menu in Friday Night Funkin'", state: "Freeplay Menu" });
        }
    }

    showError(error) {
        console.error(error);
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, "ERROR LOADING FREEPLAY", { color: '#ff0000', fontSize: 32 }).setOrigin(0.5);
    }
}

game.scene.add("FreeplayScene", FreeplayScene);