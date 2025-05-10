class FreeplayState extends Phaser.Scene {
    constructor() {
        super({ key: 'FreeplayState' });
        
        // Datos persistentes
        this.songList = [];
        this.selectedIndex = 0;
        this.selectedDifficulty = 1;
        this.difficulties = ["easy", "normal", "hard"]; // Asegurar que está definido
        
        // Estado temporal
        this.keyCooldown = false;
        this.scrollY = 0;
        this.assetsLoaded = false;
    }

    init() {
        this.keyCooldown = false;
    }

    preload() {
        console.log("FreeplayState cargado");
        
        // Verificar y cargar imágenes
        if (!this.textures.exists('menuBGMagenta')) {
            this.load.image('menuBGMagenta', 'public/assets/images/menuBGMagenta.png');
        }
        
        // Cargar audios con verificaciones
        const audioKeys = ['cancelSound', 'scrollSound', 'confirmSound'];
        audioKeys.forEach(key => {
            if (!this.cache.audio.exists(key)) {
                this.load.audio(key, `public/assets/audio/sounds/${key}.ogg`);
            }
        });
        
        // Cargar datos de semanas
        if (!this.cache.text.exists('weekList')) {
            this.load.text('weekList', 'public/assets/data/weekList.txt');
        }
    }

    async create() {
        // Esperar a que los recursos estén listos
        if (!this.assetsLoaded && this.load.isLoading()) {
            await new Promise(resolve => {
                this.load.once('complete', () => {
                    this.assetsLoaded = true;
                    resolve();
                });
                if (!this.load.isLoading()) this.load.start();
            });
        }
        
        // Verificar carga de audio
        if (!this.sound.get('scrollSound')) {
            console.warn("Audio no cargado, reintentando...");
            this.load.audio('scrollSound', 'public/assets/audio/sounds/scrollMenu.ogg');
            await new Promise(resolve => {
                this.load.once('complete', resolve);
                this.load.start();
            });
        }
        
        // Si ya tenemos datos, recrear la UI
        if (this.songList.length > 0) {
            this.recreateUI();
            return;
        }
        
        // Primera carga
        await this.initialLoad();
    }

    async initialLoad() {
        const { width, height } = this.scale;
        
        this.setupBackground(width, height);
        this.setupSounds();
        
        await this.loadWeekData();
        this.setupUI(width, height);
        
        this.updateScroll(true);
        this.updateSelection();
        this.setupInputs();
    }

    recreateUI() {
        const { width, height } = this.scale;
        
        this.setupBackground(width, height);
        this.setupSounds();
        this.setupUI(width, height);
        
        this.updateScroll(true);
        this.updateSelection();
        this.setupInputs();
    }

    setupBackground(width, height) {
        if (this.bg) this.bg.destroy();
        
        this.bg = this.add.image(width / 2, height / 2, 'menuBGMagenta')
            .setOrigin(0.5)
            .setScale(1.1)
            .setScrollFactor(0)
            .setDepth(-1);
    }

    setupSounds() {
        // Crear o obtener instancias de sonido con verificaciones
        this.cancelSound = this.getOrCreateSound('cancelSound');
        this.scrollSound = this.getOrCreateSound('scrollSound');
        this.confirmSound = this.getOrCreateSound('confirmSound');
        
        if (!this.scrollSound) {
            console.error("Error crítico: scrollSound no disponible");
        }
    }

    getOrCreateSound(key) {
        try {
            return this.sound.get(key) || this.sound.add(key);
        } catch (error) {
            console.error(`Error con el audio ${key}:`, error);
            return null;
        }
    }

    async loadWeekData() {
        try {
            const weekListText = this.cache.text.get('weekList');
            if (!weekListText) throw new Error("weekList no cargado");
            
            const weeks = weekListText.split('\n').filter(week => week.trim());
            
            // Cargar semanas faltantes
            const weeksToLoad = weeks.filter(week => !this.cache.json.exists(week));
            if (weeksToLoad.length > 0) {
                await Promise.all(weeksToLoad.map(week => 
                    new Promise(resolve => {
                        this.load.json(week, `public/assets/data/weekList/${week}.json`);
                        this.load.once(`filecomplete-json-${week}`, resolve);
                        if (!this.load.isLoading()) this.load.start();
                    })
                ));
            }

            // Procesar canciones solo si no hay
            if (this.songList.length === 0) {
                weeks.forEach(week => {
                    const weekData = this.cache.json.get(week);
                    if (weekData?.tracks) {
                        weekData.tracks.flat().forEach(song => {
                            this.songList.push({
                                name: song,
                                weekName: weekData.weekName,
                                color: weekData.color || '#FFFFFF'
                            });
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Error cargando weekData:", error);
            throw error;
        }
    }

    setupUI(width, height) {
        // Limpiar UI existente
        if (this.textContainer) this.textContainer.destroy();
        if (this.difficultyContainer) this.difficultyContainer.destroy();
        
        // Crear nueva UI
        this.textContainer = this.add.container(50, height / 2 - 50);
        
        this.songTexts = this.songList.map((song, index) => {
            const songContainer = this.add.container(0, index * 80);
            const songText = this.createText(0, 0, song.name.toUpperCase(), {
                fontSize: '32px',
                color: '#FFFFFF'
            }).setOrigin(0, 0.5);
            
            songContainer.add(songText);
            this.textContainer.add(songContainer);
            return songContainer;
        });
        
        this.difficultyContainer = this.add.container(width - 150, 100);
        this.updateDifficultyText();
    }

    createText(x, y, text, style = {}) {
        return this.add.text(x, y, text, {
            fontFamily: 'FNF',
            fontSize: '32px',
            color: '#FFFFFF',
            ...style
        });
    }

    updateDifficultyText() {
        if (!this.difficultyContainer) return;
        this.difficultyContainer.removeAll(true);
        
        // Verificación segura de difficulties
        const difficulty = this.difficulties[this.selectedDifficulty] || this.difficulties[0];
        const diffText = this.createText(0, 0, `DIFICULTY: ${difficulty.toUpperCase()}`)
            .setOrigin(0.5);
        
        const leftArrow = this.createText(-100, 0, '<')
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.changeDifficulty(-1));
        
        const rightArrow = this.createText(100, 0, '>')
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.changeDifficulty(1));
        
        this.difficultyContainer.add([diffText, leftArrow, rightArrow]);
    }

    setupInputs() {
        this.input.keyboard.removeAllListeners('keydown');
        this.input.keyboard.on('keydown', this.handleKeyPress.bind(this));
    }

    handleKeyPress(event) {
        if (this.keyCooldown) return;

        const keyActions = {
            'ArrowUp': () => this.changeSelection(-1),
            'ArrowDown': () => this.changeSelection(1),
            'ArrowLeft': () => this.changeDifficulty(-1),
            'ArrowRight': () => this.changeDifficulty(1),
            'Enter': () => {
                if (this.confirmSound) this.confirmSound.play();
                this.selectSong();
            },
            'Backspace': () => {
                if (this.cancelSound) this.cancelSound.play();
                this.scene.start("MainMenuState");
            }
        };

        if (keyActions[event.code]) {
            keyActions[event.code]();
            this.keyCooldown = true;
            this.time.delayedCall(150, () => this.keyCooldown = false);
        }
    }

    changeDifficulty(change) {
        if (!this.scrollSound) {
            console.warn("scrollSound no disponible");
        } else {
            this.scrollSound.play();
        }
        
        this.selectedDifficulty = Phaser.Math.Wrap(
            this.selectedDifficulty + change, 
            0, 
            this.difficulties.length
        );
        this.updateDifficultyText();
    }

    changeSelection(change) {
        if (this.scrollSound) {
            this.scrollSound.play();
        } else {
            console.warn("scrollSound no disponible");
        }
        
        this.selectedIndex = Phaser.Math.Wrap(
            this.selectedIndex + change,
            0,
            this.songList.length
        );
        this.updateSelection();
        this.updateScroll();
    }

    updateScroll(immediate = false) {
        if (!this.textContainer) return;
        
        const targetY = - (this.selectedIndex * 80) + (this.scale.height / 2 - 150);

        if (immediate) {
            this.textContainer.y = targetY;
        } else {
            this.tweens.add({
                targets: this.textContainer,
                y: targetY,
                duration: 200,
                ease: 'Cubic.out'
            });
        }
        this.scrollY = targetY;
    }

    updateSelection() {
        if (!this.songTexts) return;
        
        this.songTexts.forEach((container, index) => {
            const songText = container.list[0];
            if (!songText) return;
            
            const isSelected = index === this.selectedIndex;
            songText.setColor(isSelected ? '#FFFF00' : '#FFFFFF')
                   .setScale(isSelected ? 1.2 : 1)
                   .setStyle({ fontSize: isSelected ? '38px' : '32px' });
        });
    }

    selectSong() {
        const selectedSong = this.songList[this.selectedIndex];
        if (!selectedSong) return;

        const songData = {
            storyPlaylist: [selectedSong.name],
            storyDifficulty: this.difficulties[this.selectedDifficulty] || 'normal',
            isStoryMode: false,
            weekName: selectedSong.weekName,
            selectedDifficulty: this.difficulties[this.selectedDifficulty] || 'normal'
        };

        this.tweens.add({
            targets: this.songTexts[this.selectedIndex],
            scale: 1.3,
            duration: 100,
            yoyo: true,
            onComplete: () => this.scene.start("PlayState", songData)
        });
    }
}

game.scene.add("FreeplayState", FreeplayState);