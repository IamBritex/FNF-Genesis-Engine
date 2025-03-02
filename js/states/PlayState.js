class PlayState extends Phaser.Scene {
    constructor() {
        super({ key: "PlayState" });
    }

    init(data) {
        // Inicialización de datos recibidos
        this.storyPlaylist = data.storyPlaylist ? data.storyPlaylist.flat() : [];
        this.storyDifficulty = data.storyDifficulty;
        this.isStoryMode = data.isStoryMode;
        this.campaignScore = data.campaignScore;
        this.campaignMisses = data.campaignMisses;
        this.weekName = data.weekName;
        this.weekBackground = data.weekBackground;
        this.weekCharacters = data.weekCharacters;
        this.weekTracks = data.weekTracks;
        this.selectedDifficulty = data.selectedDifficulty;
        this.currentSongIndex = data.currentSongIndex || 0;

        // Verificar que la playlist sea válida
        if (Array.isArray(this.storyPlaylist) && this.storyPlaylist.length > 0) {
            this.songList = this.storyPlaylist;
        } else {
            console.error("Playlist inválida o vacía.");
            this.songList = [];
        }
    }

    preload() {
        // Cambiar el fondo a verde limón
        this.cameras.main.setBackgroundColor("#cbfa4c");

        // Mostrar la imagen de carga (funkay) al centro y ajustar su tamaño
        const { width, height } = this.scale;
        this.loadingImage = this.add.image(width / 2, height / 2, 'funkay');
        this.loadingImage.setScale(Math.min(width / this.loadingImage.width, height / this.loadingImage.height) * 0.8);

        // Crear una barra de carga en la parte inferior
        this.loadBar = this.add.graphics();
        this.loadBar.fillStyle(0x8A2BE2, 1); // Morado claro
        this.loadBar.fillRect(0, height - 20, width, 20);

        // Cargar assets comunes
        this.load.image('funkay', 'assets/images/funkay.png');
        this.load.audio('intro1', 'assets/sounds/countdown/funkin/intro1.ogg');
        this.load.audio('intro2', 'assets/sounds/countdown/funkin/intro2.ogg');
        this.load.audio('intro3', 'assets/sounds/countdown/funkin/intro3.ogg');
        this.load.audio('introGo', 'assets/sounds/countdown/funkin/introGo.ogg');
        this.load.image('set', 'assets/PlayState/countdown/funkin/set.png');
        this.load.image('ready', 'assets/PlayState/countdown/funkin/ready.png');
        this.load.image('go', 'assets/PlayState/countdown/funkin/go.png');

        // Precargar freakyMenu
        this.load.audio('freakyMenu', 'assets/music/FreakyMenu.mp3');

        // Cargar canciones si la playlist no está vacía
        if (this.songList.length > 0) {
            this.loadCurrentAndNextSong();
        } else {
            console.error("No hay canciones para cargar.");
            this.redirectToNextState();
        }

        // Actualizar la barra de carga
        this.load.on('progress', (value) => {
            this.loadBar.clear();
            this.loadBar.fillStyle(0x8A2BE2, 1);
            this.loadBar.fillRect(0, height - 20, width * value, 20);
        });
    }

    loadCurrentAndNextSong() {
        const currentSong = this.songList[this.currentSongIndex];
        if (typeof currentSong !== 'string') {
            console.error("La canción actual no es válida.");
            this.redirectToNextState();
            return;
        }

        console.log("Cargando datos de la canción:", currentSong);

        // Construir la ruta del JSON con la primera letra en mayúscula
        let jsonPath = `assets/weeks/data/${currentSong}/${currentSong}.json`;
        if (this.selectedDifficulty && this.selectedDifficulty !== "normal") {
            jsonPath = `assets/weeks/data/${currentSong}/${currentSong}-${this.selectedDifficulty}.json`;
        }

        this.load.json(`songData_${currentSong}`, jsonPath);

        this.load.once('fileerror', (file) => {
            if (file.key === `songData_${currentSong}`) {
                console.warn(`No se encontró ${jsonPath}, intentando con la primera letra en minúscula.`);

                // Convertir la primera letra de la carpeta y el archivo a minúscula
                let altSongName = currentSong.charAt(0).toLowerCase() + currentSong.slice(1);
                let altJsonPath = `assets/weeks/data/${altSongName}/${altSongName}.json`;

                if (this.selectedDifficulty && this.selectedDifficulty !== "normal") {
                    altJsonPath = `assets/weeks/data/${altSongName}/${altSongName}-${this.selectedDifficulty}.json`;
                }

                console.log(`Intentando cargar: ${altJsonPath}`);
                this.load.json(`songData_${currentSong}`, altJsonPath);
                this.load.start();
            }
        });

        this.load.once('complete', () => {
            const songData = this.cache.json.get(`songData_${currentSong}`);
            if (!songData || !songData.song) {
                console.warn(`No se encontró el JSON en ninguna de las rutas, probando con carpeta en minúsculas...`);

                // Convertir toda la carpeta a minúsculas
                let lowerCaseFolder = currentSong.toLowerCase();
                let lowerCaseJsonPath = `assets/weeks/data/${lowerCaseFolder}/${lowerCaseFolder}.json`;

                if (this.selectedDifficulty && this.selectedDifficulty !== "normal") {
                    lowerCaseJsonPath = `assets/weeks/data/${lowerCaseFolder}/${lowerCaseFolder}-${this.selectedDifficulty}.json`;
                }

                console.log(`Intentando cargar desde carpeta en minúscula: ${lowerCaseJsonPath}`);
                this.load.json(`songData_${currentSong}`, lowerCaseJsonPath);

                this.load.once('complete', () => {
                    const finalData = this.cache.json.get(`songData_${currentSong}`);
                    if (!finalData || !finalData.song) {
                        console.error("No se pudo cargar el JSON de la canción en ninguna de las rutas posibles.");
                        this.redirectToNextState();
                        return;
                    }

                    this.processSongData(finalData, currentSong);
                });

                this.load.start();
                return;
            }

            this.processSongData(songData, currentSong);
        });

        this.load.start();
    }

    processSongData(songData, songName) {
        const playerCharacter = songData.song.player1 || 'bf';
        const enemyCharacter = songData.song.player2 || 'gf';

        console.log(`Jugador: ${playerCharacter}, Enemigo: ${enemyCharacter}`);

        // Cargar los archivos de audio usando los personajes extraídos
        this.loadSongAssets(songName, playerCharacter, enemyCharacter);

        this.load.once('complete', () => {
            this.loadingImage.destroy();
            this.loadBar.destroy();
            this.cameras.main.setBackgroundColor("#000000");
            this.showData();
            this.startCountdown();
        });

        this.load.start();
    }

    loadSongAssets(songName, playerCharacter, enemyCharacter) {
        const instPath = `assets/songs/${songName}/Inst.ogg`;
        const voicePaths = [
            `assets/songs/${songName}/Voices-${playerCharacter}.ogg`,
            `assets/songs/${songName}/Voices-Player.ogg`,
            `assets/songs/${songName}/Voices-${enemyCharacter}.ogg`,
            `assets/songs/${songName}/Voices-Opponent.ogg`
        ];

        // Verificar si la instrumental existe
        fetch(instPath, { method: 'HEAD' })
            .then(response => {
                if (!response.ok) throw new Error("Inst.ogg no encontrado");
                
                // Cargar instrumental
                this.load.audio(`inst_${songName}`, instPath);
                
                // Verificar y cargar voces solo si existen
                voicePaths.forEach(path => {
                    fetch(path, { method: 'HEAD' })
                        .then(res => {
                            if (res.ok) {
                                const key = path.includes(playerCharacter) ? `player_${songName}` : `enemy_${songName}`;
                                this.load.audio(key, path);
                            }
                        })
                        .catch(() => { /* Ignorar errores de voces */ });
                });

                this.load.start();
            })
            .catch(() => {
                console.error(`No se encontró la instrumental para: ${songName}`);
                this.redirectToNextState();
            });
    }

    create() {
        console.log("PlayState iniciado.");
        this.sound.stopAll();

        // Configurar el fondo
        this.cameras.main.setBackgroundColor("#000000");
    }

    showData() {
        const { width } = this.scale;

        // Posición inicial para los textos (parte superior derecha)
        let startX = width - 20; // Margen derecho
        let startY = 20; // Margen superior
        const lineHeight = 24; // Altura de cada línea de texto

        // Crear un texto para cada dato
        const dataToShow = {
            "Semana": this.weekName || "No disponible",
            "Playlist": this.storyPlaylist ? this.storyPlaylist.join(", ") : "No disponible",
            "Dificultad": this.storyDifficulty || "No disponible",
            "Fondo": this.weekBackground || "No disponible",
            "Personajes": this.weekCharacters ? this.weekCharacters.join(", ") : "No disponible",
            "Puntuación": this.campaignScore || 0,
            "Fallos": this.campaignMisses || 0,
            "Modo Historia": this.isStoryMode ? "Activado" : "Desactivado",
        };

        // Recorrer los datos y mostrarlos en pantalla
        Object.entries(dataToShow).forEach(([key, value], index) => {
            const text = this.add.text(startX, startY + index * lineHeight, `${key}: ${value}`, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#FFFFFF',
                align: 'right'
            }).setOrigin(1, 0); // Alinear a la derecha
        });
    }

    startCountdown() {
        const countdownImages = ['set', 'ready', 'go'];
        let step = 0;

        const showStep = () => {
            if (step < countdownImages.length) {
                const image = this.add.image(this.scale.width / 2, this.scale.height / 2, countdownImages[step]);
                this.time.delayedCall(1000, () => {
                    image.destroy();
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
        const currentSong = this.songList[this.currentSongIndex];

        // Verificar si la instrumental está cargada
        if (!this.cache.audio.exists(`inst_${currentSong}`)) {
            console.error(`No se encontró la instrumental para: ${currentSong}`);
            this.redirectToNextState();
            return;
        }

        const inst = this.sound.add(`inst_${currentSong}`);
        const player = this.cache.audio.exists(`player_${currentSong}`) ? this.sound.add(`player_${currentSong}`) : null;
        const enemy = this.cache.audio.exists(`enemy_${currentSong}`) ? this.sound.add(`enemy_${currentSong}`) : null;

        inst.play();
        if (player) player.play();
        if (enemy) enemy.play();

        // Verificar si hay una siguiente canción y precargarla
        if (this.currentSongIndex + 1 < this.songList.length) {
            const nextSong = this.songList[this.currentSongIndex + 1];
            this.preloadNextSong(nextSong);
        }

        inst.on('complete', () => {
            this.currentSongIndex++;
            if (this.currentSongIndex < this.songList.length) {
                if (this.isPreloaded(this.songList[this.currentSongIndex])) {
                    this.scene.restart(this.getSceneData());
                } else {
                    console.error("Error: La siguiente canción no está precargada.");
                    this.redirectToNextState();
                }
            } else {
                this.playFreakyMenuAndRedirect();
            }
        });

        console.log("Reproduciendo canción:", currentSong);
    }

    preloadNextSong(nextSong) {
        const formats = [
            `assets/weeks/data/${nextSong}/${nextSong}.json`,
            `assets/weeks/data/${nextSong.toLowerCase()}/${nextSong.toLowerCase()}.json`,
            `assets/weeks/data/${nextSong}/${nextSong}-${this.selectedDifficulty}.json`,
            `assets/weeks/data/${nextSong.toLowerCase()}/${nextSong.toLowerCase()}-${this.selectedDifficulty}.json`
        ];

        let loaded = false;
        
        // Intentar cargar el JSON en todos los formatos posibles
        formats.forEach(path => {
            fetch(path, { method: 'HEAD' })
                .then(response => {
                    if (!response.ok || loaded) return;
                    loaded = true;
                    this.load.json(`songData_${nextSong}`, path);
                    this.load.start();
                });
        });

        // Si ningún formato funciona después de 1 segundo, omitir precarga
        setTimeout(() => {
            if (!loaded) {
                console.warn(`No se pudo precargar datos para: ${nextSong}`);
                this.load.stop();
            }
        }, 1000);
    }

    isPreloaded(songName) {
        return this.cache.audio.exists(`inst_${songName}`);
    }

    getSceneData() {
        return {
            storyPlaylist: this.storyPlaylist,
            storyDifficulty: this.storyDifficulty,
            isStoryMode: this.isStoryMode,
            campaignScore: this.campaignScore,
            campaignMisses: this.campaignMisses,
            weekName: this.weekName,
            weekBackground: this.weekBackground,
            weekCharacters: this.weekCharacters,
            weekTracks: this.weekTracks,
            selectedDifficulty: this.selectedDifficulty,
            currentSongIndex: this.currentSongIndex
        };
    }

    playFreakyMenuAndRedirect() {
        if (!this.sound.get('freakyMenu')) {
            const freakyMenu = this.sound.add('freakyMenu', { loop: true });
            freakyMenu.play();
        }

        this.redirectToNextState();
    }

    redirectToNextState() {
        const target = this.isStoryMode ? "StoryModeState" : "FreePlayState";
        this.scene.start(target);
    }
}

globalThis.PlayState = PlayState;