import { AudioManager } from './PlayState/AudioManager.js';
import { DataManager } from './PlayState/DataManager.js';
import { ArrowsManager } from './PlayState/ArrowsManager.js';

class PlayState extends Phaser.Scene {
    constructor() {
        super({ key: "PlayState" });
        this.audioManager = new AudioManager(this);
        this.dataManager = new DataManager(this);
        this.arrowsManager = new ArrowsManager(this);
        this.songPosition = 0; // Tiempo actual de la canción
        this.isMusicPlaying = false; // Indica si la música está reproduciéndose
    }

    init(data) {
        this.dataManager.init(data);
    }

    preload() {
        // Cargar el atlas de texturas para las notas móviles
        this.load.atlasXML('notes', 'assets/PlayState/notes.png', 'assets/PlayState/notes.xml');

        // Cargar las flechas estáticas (strumline)
        this.load.atlasXML('noteStrumline', 'assets/PlayState/noteStrumline.png', 'assets/PlayState/noteStrumline.xml');

        // Cargar los assets de las notas largas
        this.load.atlasXML('NOTE_hold_assets', 'assets/PlayState/NOTE_hold_assets.png', 'assets/PlayState/NOTE_hold_assets.xml');

        // Cambiar el fondo a verde limón
        this.cameras.main.setBackgroundColor("#cbfa4c");

        const { width, height } = this.scale;
        this.loadingImage = this.add.image(width / 2, height / 2, 'funkay');
        this.loadingImage.setScale(Math.min(width / this.loadingImage.width, height / this.loadingImage.height) * 0.8);

        this.loadBar = this.add.graphics();
        this.loadBar.fillStyle(0x8A2BE2, 1);
        this.loadBar.fillRect(0, height - 20, width, 20);

        this.load.audio('intro3', 'assets/sounds/countdown/funkin/intro3.ogg');
        this.load.audio('intro2', 'assets/sounds/countdown/funkin/intro2.ogg');
        this.load.audio('intro1', 'assets/sounds/countdown/funkin/intro1.ogg');
        this.load.audio('introGo', 'assets/sounds/countdown/funkin/introGo.ogg');

        this.load.image('ready', 'assets/PlayState/countdown/funkin/ready.png');
        this.load.image('set', 'assets/PlayState/countdown/funkin/set.png');
        this.load.image('go', 'assets/PlayState/countdown/funkin/go.png');

        this.load.audio('freakyMenu', 'assets/music/FreakyMenu.mp3');

        if (this.dataManager.songList.length > 0) {
            this.loadCurrentAndNextSong();
        } else {
            console.error("No hay canciones para cargar.");
            this.redirectToNextState();
        }

        this.load.on('progress', (value) => {
            this.loadBar.clear();
            this.loadBar.fillStyle(0x8A2BE2, 1);
            this.loadBar.fillRect(0, height - 20, width * value, 20);
        });
    }

    async loadCurrentAndNextSong() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        if (typeof currentSong !== 'string') {
            console.error("La canción actual no es válida.");
            this.redirectToNextState();
            return;
        }

        await this.audioManager.loadSongAudio(currentSong);

        // Cargar el JSON de la canción
        const songIndex = this.dataManager.currentSongIndex;
        const difficulty = this.dataManager.selectedDifficulty;
        const jsonPath = difficulty === 'normal' ? 
            `assets/weeks/data/${currentSong}/${currentSong}.json` :
            `assets/weeks/data/${currentSong}/${currentSong}-${difficulty}.json`;

        this.load.json('songData', jsonPath);
        this.load.start();

        this.load.once('complete', () => {
            const songData = this.cache.json.get('songData');
            console.log("songData:", songData);

            if (!songData) {
                console.error("Error: No se pudo cargar el JSON de la canción.");
                return;
            }

            // Pasar el BPM y la velocidad al ArrowsManager
            this.arrowsManager.loadNotes(songData.song.notes, songData.song.bpm, songData.song.speed);

            this.loadingImage.destroy();
            this.loadBar.destroy();
            this.cameras.main.setBackgroundColor("#000000");
            this.dataManager.showData();
            this.startCountdown();
        });
    }

    create() {
        console.log("PlayState iniciado.");
        this.sound.stopAll();
        this.dataManager.setupF3Toggle();
        this.cameras.main.setBackgroundColor("#000000");
        this.dataManager.setStartTime(this.time.now);

        // Crear las flechas estáticas
        this.arrowsManager.createPlayerArrows();
        this.arrowsManager.createEnemyArrows();
    }

    update(time, delta) {
        // Actualizar el tiempo de la canción solo si la música está reproduciéndose
        if (this.isMusicPlaying) {
            this.songPosition += delta;

            // Actualizar las notas móviles
            this.arrowsManager.update(this.songPosition);
        }

        if (this.dataManager.isDataVisible) {
            this.dataManager.updateData();
        }
    }

    startCountdown() {
        const countdownData = [
            { sound: 'intro3', image: null },
            { sound: 'intro2', image: 'ready' },
            { sound: 'intro1', image: 'set' },
            { sound: 'introGo', image: 'go' }
        ];

        let step = 0;

        const showStep = () => {
            if (step < countdownData.length) {
                const { sound, image } = countdownData[step];
                const countdownSound = this.sound.add(sound);
                countdownSound.play();

                if (image) {
                    const countdownImage = this.add.image(this.scale.width / 2, this.scale.height / 2, image);
                    countdownSound.on('complete', () => {
                        countdownImage.destroy();
                    });
                }

                countdownSound.on('complete', () => {
                    step++;
                    showStep();
                });
            } else {
                this.startMusic();
            }
        };

        showStep();
    }

    startMusic() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        const inst = this.audioManager.playSongAudio(currentSong);

        // Indicar que la música está reproduciéndose
        this.isMusicPlaying = true;

        inst.on('complete', () => {
            this.dataManager.currentSongIndex++;
            if (this.dataManager.currentSongIndex < this.dataManager.songList.length) {
                this.scene.restart(this.dataManager.getSceneData());
            } else {
                this.playFreakyMenuAndRedirect();
            }
        });

        console.log("Reproduciendo canción:", currentSong);
    }

    playFreakyMenuAndRedirect() {
        if (!this.sound.get('freakyMenu')) {
            const freakyMenu = this.sound.add('freakyMenu', { loop: true });
            freakyMenu.play();
        }

        this.redirectToNextState();
    }

    redirectToNextState() {
        const target = this.dataManager.isStoryMode ? "StoryModeState" : "FreePlayState";
        this.scene.start(target);
    }
}

globalThis.PlayState = PlayState;