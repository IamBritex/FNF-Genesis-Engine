// ====== CHARACTER CLASS ======
class Character extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, characterData) {
        super(scene, x, y, characterData.image);
        scene.add.existing(this);

        this.setScale(characterData.scale || 1)
            .setFlipX(characterData.flipX || false)
            .setDepth(2);

        this.setupRotations(characterData);
        this.setupAnimations(scene, characterData);

        // Nueva propiedad para rastrear si la animación está en curso
        this.isAnimationPlaying = false;
    }

    setupRotations(data) {
        this.globalRotation = data.globalRotation || 0;
        this.idleRotation = data.idleRotation || 0;
        this.confirmRotation = data.confirmRotation || 0;
        
        if (this.globalRotation) {
            this.setRotation(Phaser.Math.DegToRad(this.globalRotation));
        }
    }

    setupAnimations(scene, data) {
        [data.idle_anim, data.confirm_anim].forEach(anim => {
            if (anim && !scene.anims.exists(anim)) {
                this.createAnimation(scene, anim);
            }
        });

        if (scene.anims.exists(data.idle_anim)) {
            this.play(data.idle_anim);
            this.applyRotation(this.idleRotation);
        }

        this.confirmAnim = data.confirm_anim;
    }

    createAnimation(scene, animKey) {
        const frames = scene.textures.get(this.texture.key)
            .getFrameNames()
            .filter(frame => frame.startsWith(animKey))
            .sort();

        if (frames.length > 0) {
            scene.anims.create({
                key: animKey,
                frames: frames.map(frame => ({ key: this.texture.key, frame })),
                frameRate: 24,
                repeat: animKey.includes("Idle") ? -1 : 0
            });
        }
    }

    applyRotation(rotation) {
        if (rotation) {
            this.setRotation(Phaser.Math.DegToRad(rotation));
        }
    }

    playConfirmAnim() {
        if (this.confirmAnim && this.scene.anims.exists(this.confirmAnim)) {
            this.applyRotation(this.confirmRotation);
            this.play(this.confirmAnim);
            this.isAnimationPlaying = true; // Marcar que la animación está en curso
        }
    }

    stopAnimation() {
        this.anims.stop();
        this.isAnimationPlaying = false; // Marcar que la animación se detuvo
    }

    resetRotation() {
        this.setRotation(this.globalRotation !== 0 ? Phaser.Math.DegToRad(this.globalRotation) : 0);
    }
}

// ====== CLASE STORYMODESTATE ======
// ====== STORYMODESTATE CLASS ======
class StoryModeState extends Phaser.Scene {
    constructor() {
        super({ key: "StoryModeState" });
        this.weeks = {};
        this.weekKeys = [];
        this.selectedWeekIndex = 0;
        this.difficulties = ["easy", "normal", "hard"];
        this.selectedDifficulty = 1;
        this.characters = [];
        this.characterCache = {};
        this.keyState = {};
        this.canPressEnter = true; // Variable para controlar si se puede presionar Enter
    }

    preload() {
        console.log("StoryModeState preload started");

        this.load.text('weekList', 'public/assets/data/weekList.txt');
        this.load.image('tracksLabel', 'public/assets/images/states/storyMenu/Menu_Tracks.png');
        this.load.image('easy', 'public/assets/images/states/storyMenu/difficults/easy.png');
        this.load.image('normal', 'public/assets/images/states/storyMenu/difficults/normal.png');
        this.load.image('hard', 'public/assets/images/states/storyMenu/difficults/hard.png');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('scrollSound', 'public/assets/audio/sounds/scrollMenu.ogg');

        this.load.on('filecomplete', (key, type, data) => {
            console.log(`File loaded: ${key}, Type: ${type}`);
        });

        this.load.on('filecomplete-xml', (key, type, data) => {
            console.log(`XML file loaded: ${key}`);
        });

        this.load.on('loaderror', (file) => {
            console.error(`Error loading file: ${file.key}`);
        });

        this.load.once('complete', () => {
            console.log("Initial load complete");
            this.loadWeekData();
        });

        this.load.start();
    }

    loadWeekData() {
        const weekList = this.cache.text.get('weekList').trim().split('\n');
        console.log("Week list:", weekList);

        weekList.forEach(week => {
            this.load.json(week, `public/assets/data/weekList/${week}.json`);
        });

        this.load.once('complete', () => {
            console.log("Week data load complete");
            this.loadAssets();
        });

        this.load.start();
    }

    loadAssets() {
        const weekList = this.cache.text.get('weekList').trim().split('\n');

        weekList.forEach(week => {
            const weekData = this.cache.json.get(week);
            if (weekData) {
                console.log(`Loading assets for week: ${week}`);
                this.load.image(weekData.weekBackground, `public/assets/images/states/storyMenu/menuBackgrounds/${weekData.weekBackground}.png`);
                this.load.image(`${weekData.weekName}Title`, `public/assets/images/states/storyMenu/titles/${weekData.weekName}.png`);

                weekData.weekCharacters.forEach(character => {
                    if (character) {
                        // Verificar si el personaje ya está en la caché
                        if (!this.characterCache[character]) {
                            // Cargar como Atlas XML
                            this.load.atlasXML({
                                key: character, // Clave única
                                textureURL: `public/assets/images/states/storyMenu/menucharacters/Menu_${character}.png`,
                                atlasURL: `public/assets/images/states/storyMenu/menucharacters/Menu_${character}.xml`
                            });

                            // Cargar metadata del personaje
                            this.load.json(`${character}Data`, `public/assets/images/states/storyMenu/menucharacters/${character}.json`);
                        }
                    }
                });
            } else {
                console.error(`Week data not found for: ${week}`);
            }
        });

        this.load.once('complete', () => {
            console.log("Asset load complete");
            this.processWeeks(weekList);
        });

        this.load.start();
    }

    create() {
        console.log("StoryModeState create started");
        this.canPressEnter = true; // Habilitar la tecla Enter al crear la escena
        this.registry.remove('selectedWeekIndex');
                // ====== BARRA SUPERIOR ======
                this.topBar = this.add.rectangle(
                    this.scale.width / 2, // Centrada en X
                    200, // Ubicación en Y
                    this.scale.width, // Ancho total
                    500, // Altura de la barra
                    0x000000 // Color negro
                ).setDepth(1).setAlpha(1); // Semi-transparente
    }

    processWeeks(weekList) {
        console.log("Processing weeks");
        this.selectedWeekIndex = 0;
        weekList.forEach(week => {
            const weekData = this.cache.json.get(week);

            if (!weekData) {
                console.error(`Could not load JSON for week: ${week}`);
                return;
            }

            if (!weekData.weekCharacters) {
                console.warn(`Week ${week} does not have the property 'weekCharacters'. Using default characters.`);
                weekData.weekCharacters = ["", "bf", "gf"];
            }

            this.weeks[week] = {
                bg: weekData.weekBackground,
                tracks: weekData.tracks,
                phrase: weekData.phrase,
                weekName: weekData.weekName,
                weekCharacters: weekData.weekCharacters
            };
        });

        this.weekKeys = Object.keys(this.weeks);
        console.log("Processed weeks:", this.weeks);
        console.log("Week keys:", this.weekKeys);

        this.initializeScene();
    }

    initializeScene() {
        console.log("Initializing scene");
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#000000");

        if (!this.weeks[this.weekKeys[this.selectedWeekIndex]]) {
            console.error("The selected week is not defined.");
            return;
        }

        this.weekBackground = this.add.image(width / 2, height / 4 + 60, this.weeks[this.weekKeys[this.selectedWeekIndex]].bg)
            .setOrigin(0.5, 0.5)
            .setScale(1.1)
            .setCrop(0, 24, width, height - 34)
            .setDepth(2);

        this.scoreText = this.add.text(20, 20, "LEVEL SCORE: 0", {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FFFFFF'
        }) .setDepth(10);

        this.weekPhrase = this.add.text(width - 20, 20, this.weeks[this.weekKeys[this.selectedWeekIndex]].phrase, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#AAAAFF'
        }).setOrigin(1, 0)
            .setDepth(10);

        // Ajustar la posición inicial del contenedor de títulos
        this.weekTitlesContainer = this.add.container(width / 2, height - 185);
        this.weekTitlesContainer.setDepth(0);

        // Aumentar la separación entre los títulos
        const titleSpacing = 120; // Cambiado de 100 a 120
        this.weekKeys.forEach((weekKey, index) => {
            const title = this.add.image(0, index * titleSpacing, `${this.weeks[weekKey].weekName}Title`)
                .setOrigin(0.5, 0.5)
                .setAlpha(0.6); // Opacidad predeterminada

            this.weekTitlesContainer.add(title);
        });

        // Aplicar opacidad completa al título de la semana seleccionada
        this.weekTitlesContainer.list[this.selectedWeekIndex].setAlpha(1);
        
        this.trackLabel = this.add.image(100, 480, 'tracksLabel').setOrigin(0, 0);
        this.trackTexts = [];
        this.updateTracks();

        this.difficultyImage = this.add.image(width / 2 + 430, height - 200, this.difficulties[this.selectedDifficulty]).setOrigin(0.5, 0.5);

        this.loadCharacters();

        // Añadir soporte táctil para Android
        if (this.game.device.os.android) {
            if (window.AndroidSupport) {
                window.AndroidSupport.initialize(this);
                
                // Precargar el atlas de virtualpad si no está cargado
                if (!this.textures.exists('virtualpad')) {
                    this.load.atlasXML('virtualpad', 'public/assets/android/virtualpad.png', 'public/assets/android/virtualpad.xml');
                    this.load.once('complete', () => {
                        window.AndroidSupport.createVirtualButtons(this);
                    });
                    this.load.start();
                } else {
                    window.AndroidSupport.createVirtualButtons(this);
                }
            }
        }

        // Modificar los listeners existentes para incluir los eventos de Android
        this.input.keyboard.on('keydown-ENTER', () => {
            this.handleConfirm();
        });

        this.input.keyboard.on('keydown-BACKSPACE', () => {
            this.handleBack();
        });

        // Listener para la tecla Enter
        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.canPressEnter || this.keyState['ENTER']) return; // Evitar pulsaciones mantenidas
            this.canPressEnter = false; // Deshabilitar la tecla Enter
            this.keyState['ENTER'] = true; // Marcar la tecla como presionada
            this.sound.play('confirmSound');
            this.characters.forEach(character => {
                character.playConfirmAnim(); // Reproducir animación de confirmación
            });
            this.selectWeek(); // Seleccionar semana
        });

        this.input.keyboard.on('keyup-ENTER', () => {
            this.keyState['ENTER'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.keyState['DOWN']) return; // Evitar pulsaciones mantenidas
            this.keyState['DOWN'] = true; // Marcar la tecla como presionada
            this.changeWeek(1);
            this.sound.play('scrollSound');
        });

        this.input.keyboard.on('keyup-DOWN', () => {
            this.keyState['DOWN'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-UP', () => {
            if (this.keyState['UP']) return; // Evitar pulsaciones mantenidas
            this.keyState['UP'] = true; // Marcar la tecla como presionada
            this.changeWeek(-1);
            this.sound.play('scrollSound');
        });

        this.input.keyboard.on('keyup-UP', () => {
            this.keyState['UP'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.keyState['SPACE']) return; // Evitar pulsaciones mantenidas
            this.keyState['SPACE'] = true; // Marcar la tecla como presionada
            this.selectWeek();
        });

        this.input.keyboard.on('keyup-SPACE', () => {
            this.keyState['SPACE'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.keyState['ESC']) return; // Evitar pulsaciones mantenidas
            this.keyState['ESC'] = true; // Marcar la tecla como presionada
            this.scene.start("MainMenuState");
        });

        this.input.keyboard.on('keyup-ESC', () => {
            this.keyState['ESC'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-BACKSPACE', () => {
            this.handleBack();
        });

        this.input.keyboard.on('keyup-BACKSPACE', () => {
            this.keyState['BACKSPACE'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-LEFT', () => {
            if (this.keyState['LEFT']) return; // Evitar pulsaciones mantenidas
            this.keyState['LEFT'] = true; // Marcar la tecla como presionada
            this.changeDifficulty(-1);
        });

        this.input.keyboard.on('keyup-LEFT', () => {
            this.keyState['LEFT'] = false; // Marcar la tecla como no presionada
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            if (this.keyState['RIGHT']) return; // Evitar pulsaciones mantenidas
            this.keyState['RIGHT'] = true; // Marcar la tecla como presionada
            this.changeDifficulty(1);
        });

        this.input.keyboard.on('keyup-RIGHT', () => {
            this.keyState['RIGHT'] = false; // Marcar la tecla como no presionada
        });
    }

    adjustTitleContainerPosition() {
        const { height } = this.scale;
        const targetY = height / 2 - this.selectedWeekIndex * 200; // Ajustar la posición en la mitad de la pantalla

        this.tweens.add({
            targets: this.weekTitlesContainer,
            y: targetY,
            duration: 400,
            ease: 'Power2'
        });
    }

    loadCharacters() {
        this.characters.forEach(character => character.destroy());
        this.characters = [];
    
        const weekData = this.weeks[this.weekKeys[this.selectedWeekIndex]];
        const charactersData = weekData.weekCharacters;
    
        const positions = [
            { x: 280, y: 260 }, // dad
            { x: 650, y: 260 }, // bf
            { x: 1050, y: 260 } // gf
        ];
    
        charactersData.forEach((characterName, index) => {
            if (!characterName) return;
    
            const characterKey = `${characterName}Data`;
            if (!this.cache.json.exists(characterKey)) {
                console.error(`Datos de ${characterName} no encontrados en la caché.`);
                return;
            }
    
            // Verificar si el personaje ya está en la caché
            if (!this.characterCache[characterName]) {
                console.log(`Cargando datos de ${characterName} por primera vez...`);
                const characterData = this.cache.json.get(characterKey);
                this.characterCache[characterName] = characterData; // Almacenar en caché
            }
    
            const characterData = this.characterCache[characterName];
            console.log(`Datos de ${characterName}:`, characterData);
    
            const character = new Character(this, positions[index].x, positions[index].y, characterData);
            this.characters.push(character);
    
            // Verificar si la animación ya está en curso
            if (this.anims.exists(characterData.idle_anim)) {
                if (!character.anims.isPlaying) {
                    character.play(characterData.idle_anim); // Solo reproducir si no está en curso
                }
            } else {
                character.play(characterData.idle_anim);
            }
        });
    }

    changeWeek(direction) {
        // Restablecer la opacidad del título anterior
        this.weekTitlesContainer.list[this.selectedWeekIndex].setAlpha(0.6);

        this.selectedWeekIndex = (this.selectedWeekIndex + direction + this.weekKeys.length) % this.weekKeys.length;
        let currentWeek = this.weekKeys[this.selectedWeekIndex];

        this.weekBackground.setTexture(this.weeks[currentWeek].bg);
        this.weekPhrase.setText(this.weeks[currentWeek].phrase);
        this.updateTracks();
        this.loadCharacters();

        // Calcular la posición objetivo del contenedor de títulos
        const targetY = this.scale.height - 200 - this.selectedWeekIndex * 120; // Usar el mismo espaciado que en initializeScene

        // Aplicar el desplazamiento sin limitar la posición
        this.tweens.add({
            targets: this.weekTitlesContainer,
            y: targetY,
            duration: 400,
            ease: 'Power2'
        });

        // Aplicar opacidad completa al nuevo título seleccionado
        this.weekTitlesContainer.list[this.selectedWeekIndex].setAlpha(1);
    }

    changeDifficulty(direction) {
        this.selectedDifficulty = (this.selectedDifficulty + direction + this.difficulties.length) % this.difficulties.length;
        this.difficultyImage.setTexture(this.difficulties[this.selectedDifficulty]);
        console.log("Selected difficulty:", this.difficulties[this.selectedDifficulty]);
    }    

    updateTracks() {
        this.trackTexts.forEach(text => text.destroy());
        this.trackTexts = [];

        let currentWeek = this.weekKeys[this.selectedWeekIndex];
        let songs = this.weeks[currentWeek].tracks;

        songs.forEach((track, i) => {
            let text = this.add.text(100, 580 + i * 30, track, {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ff69b4'
            }).setOrigin(0, 0.5);
            this.trackTexts.push(text);
        });
    }

    selectWeek() {
        let selectedWeekData = this.weeks[this.weekKeys[this.selectedWeekIndex]];
        let selectedDifficulty = this.difficulties[this.selectedDifficulty]; // Ahora guarda "easy", "normal" o "hard"
    
        // Asegúrate de que storyPlaylist sea un array
        const storyPlaylist = Array.isArray(selectedWeekData.tracks) ? selectedWeekData.tracks : [selectedWeekData.tracks];
    
        const storyData = {
            storyPlaylist: selectedWeekData.tracks.flat(),
            storyDifficulty: selectedDifficulty, // Ahora tiene el nombre de la dificultad en vez de un número
            isStoryMode: true,
            campaignScore: 0,
            campaignMisses: 0,
            weekName: selectedWeekData.weekName,
            weekBackground: selectedWeekData.bg,
            weekCharacters: selectedWeekData.weekCharacters,
            weekTracks: selectedWeekData.tracks,
            selectedDifficulty: selectedDifficulty // También aquí
        };
    
        console.log("Datos guardados:", storyData);
    
        if (!this.scene.get("PlayState")) {
            console.error("PlayState no está registrado en Phaser. Registrándolo...");
            this.scene.add("PlayState", globalThis.PlayState);
        }
    
        this.time.delayedCall(1500, () => {
            this.scene.start("PlayState", storyData);
        });
    }

    handleConfirm() {
        if (!this.canPressEnter || this.keyState['ENTER']) return;
        this.canPressEnter = false;
        this.keyState['ENTER'] = true;
        this.sound.play('confirmSound');
        this.characters.forEach(character => {
            character.playConfirmAnim();
        });
        this.selectWeek();
    }
    
    handleBack() {
        if (this.keyState['BACKSPACE']) return;
        this.keyState['BACKSPACE'] = true;
        this.scene.start("MainMenuState");
    }
    
}

// ====== ASIGNACIONES GLOBALES ======
globalThis.PlayState = PlayState; // Asegúrate de que PlayState esté definido en otro archivo
game.scene.add("PlayState", PlayState);
game.scene.add("StoryModeState", StoryModeState);