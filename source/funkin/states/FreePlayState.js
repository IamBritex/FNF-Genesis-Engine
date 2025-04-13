class FreeplayState extends Phaser.Scene {
    constructor() {
        super({ key: 'FreeplayState' });
        this.songList = [];
        this.selectedIndex = 0;
        this.keyCooldown = false;
        this.difficulties = ["easy", "normal", "hard"];
        this.selectedDifficulty = 1; // Por defecto "normal"
        this.scrollY = 0; // Nueva variable para controlar el scroll
    }

    init() {
        // Resetear variables importantes al iniciar/reiniciar la escena
        this.keyCooldown = false;
        this.songList = [];
        this.selectedIndex = 0;
        this.selectedDifficulty = 1;
    }

    preload() {
        console.log("FreeplayState cargado");
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');
        this.load.audio('scrollSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        
        this.load.text('weekList', 'public/assets/data/weekList.txt');
        
        // Cargar todos los JSONs de las semanas
        fetch('public/assets/data/weekList.txt')
            .then(response => response.text())
            .then(text => {
                const weeks = text.split('\n').filter(week => week.trim());
                weeks.forEach(week => {
                    this.load.json(week, `public/assets/data/weekList/${week}.json`);
                });
            });

        // Agregar carga del fondo
        this.load.image('menuBGMagenta', 'public/assets/images/menuBGMagenta.png');
    }

    create() {
        // Agregar el fondo al inicio del create
        const { width, height } = this.scale;
        this.bg = this.add.image(width / 2, height / 2, 'menuBGMagenta')
            .setOrigin(0.5)
            .setScale(1.1)
            .setScrollFactor(0);

        // Ajustar la profundidad para que esté detrás de todo
        this.bg.setDepth(-1);

        this.cancelSound = this.sound.add('cancelSound');
        this.scrollSound = this.sound.add('scrollSound');
        this.confirmSound = this.sound.add('confirmSound');

        // Crear contenedor para los textos
        this.textContainer = this.add.container(0, 0);

        // Procesar las canciones de todas las semanas
        const weekList = this.cache.text.get('weekList').split('\n').filter(week => week.trim());
        
        weekList.forEach(week => {
            const weekData = this.cache.json.get(week);
            if (weekData && weekData.tracks) {
                weekData.tracks.flat().forEach(song => {
                    this.songList.push({
                        name: song,
                        weekName: weekData.weekName
                    });
                });
            }
        });

        // Crear textos para las canciones dentro del contenedor
        this.songTexts = this.songList.map((song, index) => {
            const text = this.add.text(50, 100 + (index * 50), song.name, {
                fontSize: '32px',
                fill: '#FFFFFF'
            });
            this.textContainer.add(text);
            return text;
        });

        // Crear texto para la dificultad (fuera del contenedor)
        this.difficultyText = this.add.text(400, 50, this.difficulties[this.selectedDifficulty], {
            fontSize: '32px',
            fill: '#FFFFFF'
        });

        // Posición inicial del scroll
        this.updateScroll(true);
        this.updateSelection();

        // Asegurarnos de que los inputs estén limpios
        this.input.keyboard.removeAllListeners();
        this.setupInputs();
    }

    setupInputs() {
        // Remover listeners anteriores si existen
        this.input.keyboard.removeAllListeners('keydown');
        
        this.input.keyboard.on('keydown', (event) => {
            if (this.keyCooldown) return;

            switch (event.code) {
                case 'ArrowUp':
                    this.changeSelection(-1);
                    break;
                case 'ArrowDown':
                    this.changeSelection(1);
                    break;
                case 'ArrowLeft':
                    this.changeDifficulty(-1);
                    break;
                case 'ArrowRight':
                    this.changeDifficulty(1);
                    break;
                case 'Enter':
                    this.confirmSound.play();
                    this.selectSong();
                    break;
                case 'Backspace':
                    this.cancelSound.play();
                    this.scene.start("MainMenuState");
                    break;
            }

            this.keyCooldown = true;
            this.time.delayedCall(150, () => this.keyCooldown = false);
        });
    }

    changeDifficulty(change) {
        this.selectedDifficulty = (this.selectedDifficulty + change + this.difficulties.length) % this.difficulties.length;
        this.difficultyText.setText(this.difficulties[this.selectedDifficulty]);
        this.scrollSound.play();
    }

    changeSelection(change) {
        this.scrollSound.play();
        const lastIndex = this.selectedIndex;
        this.selectedIndex = (this.selectedIndex + change + this.songList.length) % this.songList.length;
        
        // Actualizar selección visual
        this.updateSelection();
        
        // Actualizar scroll
        this.updateScroll();

        // Añadir efecto de movimiento a los textos
        this.songTexts.forEach((text, index) => {
            if (index === this.selectedIndex) {
                this.tweens.add({
                    targets: text,
                    scale: 1.2,
                    duration: 150,
                    ease: 'Cubic.out'
                });
            } else {
                this.tweens.add({
                    targets: text,
                    scale: 1.0,
                    duration: 150,
                    ease: 'Cubic.out'
                });
            }
        });
    }

    updateScroll(immediate = false) {
        // Calcular posición objetivo del scroll
        const targetY = -(this.selectedIndex * 50) + 300;

        if (immediate) {
            this.textContainer.y = targetY;
            this.scrollY = targetY;
        } else {
            // Solo animar el contenedor de texto
            this.tweens.add({
                targets: this.textContainer,
                y: targetY,
                duration: 150,
                ease: 'Cubic.out'
            });

            this.scrollY = targetY;
        }
    }

    updateSelection() {
        this.songTexts.forEach((text, index) => {
            if (index === this.selectedIndex) {
                text.setColor('#FFFF00');
            } else {
                text.setColor('#FFFFFF');
            }
        });
    }

    selectSong() {
        const selectedSong = this.songList[this.selectedIndex];
        const songData = {
            storyPlaylist: [selectedSong.name],
            storyDifficulty: this.difficulties[this.selectedDifficulty],
            isStoryMode: false,
            weekName: selectedSong.weekName,
            selectedDifficulty: this.difficulties[this.selectedDifficulty]
        };

        this.scene.start("PlayState", songData);
    }
}

game.scene.add("FreeplayState", FreeplayState);