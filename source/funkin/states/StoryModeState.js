import { PlayState } from './PlayState.js';
import { ModManager } from '../../utils/ModDetect.js';
import { Character } from '../visuals/objects/components/StoryCharacters.js';
import { NumberAnimation } from '../../utils/NumberAnimation.js';

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
        this.canPressEnter = true;
        this.isMobile = this.detectMobile(); // Añadir esta línea
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    preload() {
        console.log("StoryModeState preload started");

        // Cargas existentes
        this.load.text('weekList', 'public/assets/data/weekList.txt');
        this.load.image('tracksLabel', 'public/assets/images/states/storyMenu/Menu_Tracks.png');
        this.load.audio('scrollSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.image('easy', 'public/assets/images/states/storyMenu/difficults/easy.png');
        this.load.image('normal', 'public/assets/images/states/storyMenu/difficults/normal.png');
        this.load.image('hard', 'public/assets/images/states/storyMenu/difficults/hard.png');
        if (this.isMobile) {
        this.load.atlasXML('backButton', 
                'public/assets/images/UI/mobile/backButton.png', 
                'public/assets/images/UI/mobile/backButton.xml'
            );
        }

        // Precargar datos de personajes base
        const baseCharacters = ['bf', 'gf', 'dad'];
        baseCharacters.forEach(char => {
            this.load.json(
                `${char}Data`,
                `public/assets/images/states/storyMenu/menucharacters/${char}.json`
            );
            this.load.atlasXML(
                char,
                `public/assets/images/states/storyMenu/menucharacters/Menu_${char}.png`,
                `public/assets/images/states/storyMenu/menucharacters/Menu_${char}.xml`
            );
        });

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

    async loadWeekData() {
        let weekList = [];

        // 1. Cargar semanas del juego base
        const baseWeekList = this.cache.text.get('weekList').trim().split('\n')
            .map(week => week.trim())
            .filter(week => week.length > 0);

        // 2. Obtener todas las semanas de los mods
        const modWeeks = ModManager.getModWeekList();
        console.log('Semanas de mods encontradas:', modWeeks);

        // 3. Procesar todas las semanas
        for (const weekData of [...baseWeekList, ...modWeeks]) {
            const weekName = typeof weekData === 'string' ? weekData : weekData.week;
            const isMod = typeof weekData === 'object';
            const modPath = isMod ? weekData.modPath : null;

            try {
                const weekPath = isMod
                    ? `${modPath}/data/weekList/${weekName}.json`
                    : `public/assets/data/weekList/${weekName}.json`;

                const response = await fetch(weekPath);
                if (response.ok) {
                    const data = await response.json();
                    // Añadir información del mod si es necesario
                    if (isMod) {
                        data.isMod = true;
                        data.modPath = modPath;
                        data.modName = weekData.modName;
                    }
                    this.cache.json.add(weekName, data);
                    weekList.push(weekName);
                }
            } catch (error) {
                console.warn(`Error loading week ${weekName}:`, error);
            }
        }

        // 4. Procesar las semanas cargadas
        this.processWeeks(weekList);
    }

    async loadAssets(weekList) {
        this.characterCache = {};

        for (const week of weekList) {
            const weekData = this.cache.json.get(week);
            if (!weekData) continue;

            const isModWeek = weekData.isMod;
            const basePath = isModWeek ? weekData.modPath : 'public/assets';

            try {
                // 1. Cargar background
                const bgPath = `${basePath}/images/states/storyMenu/menuBackgrounds/${weekData.weekBackground}.png`;
                if (!this.textures.exists(weekData.weekBackground)) {
                    this.load.image(weekData.weekBackground, bgPath);
                    console.log(`Loading background: ${bgPath}`);
                }

                // 2. Cargar título
                const titleKey = `${weekData.weekName}Title`;
                const titlePath = `${basePath}/images/states/storyMenu/titles/${weekData.weekName}.png`;
                if (!this.textures.exists(titleKey)) {
                    this.load.image(titleKey, titlePath);
                    console.log(`Loading title: ${titlePath}`);
                }

                // 3. Cargar personajes
                if (weekData.weekCharacters) {
                    for (const character of weekData.weekCharacters) {
                        if (!character || character === '') continue;
                        if (this.characterCache[character]) continue;

                        // Try loading from base assets first
                        let characterLoaded = false;
                        try {
                            const baseCharPath = 'public/assets/images/states/storyMenu/menucharacters';
                            const response = await fetch(`${baseCharPath}/Menu_${character}.png`);

                            if (response.ok) {
                                console.log(`Loading character from base assets: ${character}`);
                                this.load.atlasXML(
                                    character,
                                    `${baseCharPath}/Menu_${character}.png`,
                                    `${baseCharPath}/Menu_${character}.xml`
                                );
                                this.load.json(
                                    `${character}Data`,
                                    `${baseCharPath}/${character}.json`
                                );
                                characterLoaded = true;
                            }
                        } catch (error) {
                            console.log(`Character not found in base assets: ${character}`);
                        }

                        // If not found in base assets and it's a mod week, try mod path
                        if (!characterLoaded && isModWeek) {
                            try {
                                const modCharPath = `${basePath}/images/states/storyMenu/menucharacters`;
                                const response = await fetch(`${modCharPath}/${character}.png`);

                                if (response.ok) {
                                    console.log(`Loading character from mod: ${character}`);
                                    this.load.atlasXML(
                                        character,
                                        `${modCharPath}/${character}.png`,
                                        `${modCharPath}/${character}.xml`
                                    );
                                    this.load.json(
                                        `${character}Data`,
                                        `${modCharPath}/${character}.json`
                                    );
                                    characterLoaded = true;
                                }
                            } catch (error) {
                                console.warn(`Failed to load mod character ${character}:`, error);
                            }
                        }

                        if (!characterLoaded) {
                            console.warn(`Could not load character ${character} from any source`);
                        } else {
                            this.characterCache[character] = true;
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error loading assets for week ${week}:`, error);
            }
        }

        return new Promise((resolve, reject) => {
            this.load.once('complete', () => {
                console.log('All assets loaded successfully');
                resolve();
            });
            this.load.once('loaderror', (file) => {
                console.warn('Error loading file:', file.key);
                // Don't reject here, just log the error
                resolve();
            });
            if (!this.load.isLoading()) {
                this.load.start();
            }
        });
    }

    create() {
        console.log("StoryModeState create started");
        this.canPressEnter = true;
        this.keyState = {}; // <-- Reinicia el estado de teclas
        this.registry.remove('selectedWeekIndex');
        // ====== BARRA SUPERIOR ======
        this.topBar = this.add.rectangle(
            this.scale.width / 2, // Centrada en X
            200, // Ubicación en Y
            this.scale.width, // Ancho total
            500, // Altura de la barra
            0x000000 // Color negro
        ).setDepth(1).setAlpha(1); // Semi-transparente

        // Reinicia también al volver de otra escena
        this.events.on('wake', () => {
            this.canPressEnter = true;
            this.keyState = {};
        });
    }

    async processWeeks(weekList) {
        console.log("Processing weeks");
        this.selectedWeekIndex = 0;

        // Filtrar las semanas que son visibles en Story Mode
        const visibleWeeks = weekList.filter(week => {
            const weekData = this.cache.json.get(week);
            return weekData && (weekData.StoryVisible !== false);
        });

        // Procesar las semanas y cargar sus datos
        for (const week of visibleWeeks) {
            const weekData = this.cache.json.get(week);
            if (!weekData) continue;

            if (!weekData.weekCharacters) {
                weekData.weekCharacters = ["", "bf", "gf"];
            }

            this.weeks[week] = {
                bg: weekData.weekBackground,
                tracks: weekData.tracks,
                phrase: weekData.phrase,
                weekName: weekData.weekName,
                weekCharacters: weekData.weekCharacters,
                StoryVisible: weekData.StoryVisible !== false
            };
        }

        this.weekKeys = Object.keys(this.weeks);
        console.log("Processed weeks:", this.weeks);

        if (this.weekKeys.length > 0) {
            try {
                // Cargar todos los assets necesarios
                await this.loadAssets(this.weekKeys);
                // Inicializar la escena solo después de que los assets estén cargados
                this.initializeScene();
            } catch (error) {
                console.error("Error loading assets:", error);
                this.scene.start("MainMenuState");
            }
        } else {
            console.warn("No visible weeks found for Story Mode");
            this.scene.start("MainMenuState");
        }
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
            fontFamily: 'VCR',
            fontSize: '30px',
            color: '#FFFFFF'
        }).setDepth(10);

        this.weekPhrase = this.add.text(width - 20, 20, this.weeks[this.weekKeys[this.selectedWeekIndex]].phrase, {
            fontFamily: 'VCR',
            fontSize: '30px',
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

        // QUITA los listeners estáticos de teclas aquí (keydown-UP, keydown-ENTER, etc.)
        // y usa solo el sistema de teclas personalizadas:
        this.setupInputs();
        if (this.isMobile) {
            this.setupMobileBackButton();
        }

        // Hacer la imagen de dificultad interactiva en móviles
        this.difficultyImage
            .setInteractive()
            .on('pointerdown', () => {
                if (this.isMobile) {
                    this.changeDifficulty(1);
                    this.sound.play('scrollSound');
                }
            });

        // Hacer los títulos interactivos solo para confirmar
        this.weekKeys.forEach((weekKey, index) => {
            const title = this.weekTitlesContainer.list[index];
            title.setInteractive()
                .on('pointerdown', () => {
                    if (this.isMobile && this.selectedWeekIndex === index) {
                        // Solo confirmar si el título está seleccionado
                        this.handleConfirm();
                    }
                });
        });

        // Mejorar la detección de scroll táctil
        if (this.isMobile) {
            let startY = 0;
            let currentY = 0;
            let isDragging = false;
            let totalDelta = 0;
            
            this.input.on('pointerdown', (pointer) => {
                startY = pointer.y;
                currentY = pointer.y;
                isDragging = true;
                totalDelta = 0;
            });

            this.input.on('pointermove', (pointer) => {
                if (!isDragging) return;
                
                const deltaY = pointer.y - currentY;
                totalDelta += deltaY;
                currentY = pointer.y;

                // Si el desplazamiento total supera el umbral
                if (Math.abs(totalDelta) > 50) { // Umbral más alto para cambios más intencionales
                    // Cambiar semana en la dirección del deslizamiento
                    this.changeWeek(totalDelta > 0 ? -1 : 1);
                    // Reproducir sonido
                    this.sound.play('scrollSound');
                    // Resetear el total para el siguiente cambio
                    totalDelta = 0;
                }
            });

            this.input.on('pointerup', () => {
                isDragging = false;
                startY = 0;
                currentY = 0;
                totalDelta = 0;
            });

            this.input.on('pointercancel', () => {
                isDragging = false;
                startY = 0;
                currentY = 0;
                totalDelta = 0;
            });
        }

        // Agregar soporte para wheel en PC
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.isMobile) {
                if (deltaY > 0) {
                    this.changeWeek(1);
                } else if (deltaY < 0) {
                    this.changeWeek(-1);
                }
            }
        });
    }

    // Método para formatear nombres de teclas igual que en OptionsState
    formatKeyName(key, code) {
        const specialKeys = {
            " ": "SPACE",
            ArrowUp: "UP",
            ArrowDown: "DOWN",
            ArrowLeft: "LEFT",
            ArrowRight: "RIGHT",
            Control: "CTRL",
            Alt: "ALT",
            Shift: "SHIFT",
            Tab: "TAB",
            CapsLock: "CAPS",
            Backspace: "BACKSPACE",
            Delete: "DELETE",
            Insert: "INSERT",
            Home: "HOME",
            End: "END",
            PageUp: "PAGEUP",
            PageDown: "PAGEDOWN",
            Enter: "ENTER",
            Meta: "META",
            ContextMenu: "MENU",
        };
        if (specialKeys[key]) return specialKeys[key];
        if (key && key.startsWith("F") && key.length <= 3) return key.toUpperCase();
        if (code && code.startsWith("Numpad")) return code.replace("Numpad", "NUM_");
        if (key && key.length === 1) return key.toUpperCase();
        return key ? key.toUpperCase() : "";
    }

    setupInputs() {
        // Obtener controles personalizados del localStorage
        const getKeyFromStorage = (key, fallback) => {
            const value = localStorage.getItem(key);
            return value && value !== "null" && value !== "undefined" ? value : fallback;
        };

        // Mapea los controles de UI a teclas reales (en formato amigable)
        const controls = {
            up: getKeyFromStorage('CONTROLS.UI.UP', 'UP'),
            down: getKeyFromStorage('CONTROLS.UI.DOWN', 'DOWN'),
            left: getKeyFromStorage('CONTROLS.UI.LEFT', 'LEFT'),
            right: getKeyFromStorage('CONTROLS.UI.RIGHT', 'RIGHT'),
            accept: getKeyFromStorage('CONTROLS.UI.ACCEPT', 'ENTER'),
            back: getKeyFromStorage('CONTROLS.UI.BACK', 'ESCAPE')
        };

        this.input.keyboard.removeAllListeners('keydown');
        this.input.keyboard.on('keydown', (event) => {
            if (this.isMobile) return; // Ignorar en dispositivos móviles
            
            const pressed = this.formatKeyName(event.key, event.code);

            if (pressed === controls.up) {
                this.changeWeek(-1);
                this.sound.play('scrollSound');
            } else if (pressed === controls.down) {
                this.changeWeek(1);
                this.sound.play('scrollSound');
            } else if (pressed === controls.left) {
                this.changeDifficulty(-1);
                this.sound.play('scrollSound');
            } else if (pressed === controls.right) {
                this.changeDifficulty(1);
                this.sound.play('scrollSound');
            } else if (pressed === controls.accept) {
                this.handleConfirm();
            } else if (pressed === controls.back || pressed === "BACKSPACE") {
                this.handleBack();
            }
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
        // Limpiar personajes existentes
        this.characters.forEach(character => character.destroy());
        this.characters = [];

        const weekData = this.weeks[this.weekKeys[this.selectedWeekIndex]];
        if (!weekData || !weekData.weekCharacters) {
            console.error('No week data or characters found');
            return;
        }

        const positions = [
            { x: 280, y: 260 },  // dad
            { x: 650, y: 260 },  // bf
            { x: 1050, y: 260 }  // gf
        ];

        weekData.weekCharacters.forEach((characterName, index) => {
            if (!characterName || characterName === '') return;

            const characterKey = `${characterName}Data`;
            try {
                // Verificar si los assets necesarios están cargados
                if (!this.textures.exists(characterName)) {
                    console.warn(`Texture not found for character: ${characterName}`);
                    return;
                }

                if (!this.cache.json.exists(characterKey)) {
                    console.warn(`Data not found for character: ${characterName}`);
                    return;
                }

                const characterData = this.cache.json.get(characterKey);
                const character = new Character(
                    this,
                    positions[index].x,
                    positions[index].y,
                    characterData
                );

                this.characters.push(character);
                console.log(`Character loaded successfully: ${characterName}`);

                // Reproducir animación idle si existe
                if (characterData.idle_anim) {
                    character.play(characterData.idle_anim);
                }
            } catch (error) {
                console.error(`Error creating character ${characterName}:`, error);
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
        const targetY = this.scale.height - 200 - this.selectedWeekIndex * 120;

        // Aplicar el desplazamiento sin limitar la posición
        this.tweens.add({
            targets: this.weekTitlesContainer,
            y: targetY,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                // Forzar actualización del score después de la animación
                this.updateWeekScore(true);
            }
        });

        // Aplicar opacidad completa al nuevo título seleccionado
        this.weekTitlesContainer.list[this.selectedWeekIndex].setAlpha(1);
    }

    changeDifficulty(direction) {
        this.selectedDifficulty = (this.selectedDifficulty + direction + this.difficulties.length) % this.difficulties.length;
        this.difficultyImage.setTexture(this.difficulties[this.selectedDifficulty]);
        this.updateWeekScore(); // Actualizar score al cambiar dificultad
        console.log("Selected difficulty:", this.difficulties[this.selectedDifficulty]);
    }

    updateTracks() {
        this.trackTexts.forEach(text => text.destroy());
        this.trackTexts = [];

        let currentWeek = this.weekKeys[this.selectedWeekIndex];
        let songs = this.weeks[currentWeek].tracks;

        // Crear un contenedor para los tracks
        let tracksContainer = this.add.container(100, 580);

        // Calcular el ancho máximo de los textos para centrarlos
        let maxWidth = 0;
        let tempTexts = songs.map(track => {
            let text = this.add.text(0, 0, track, {
                fontFamily: 'VCR',
                fontSize: '24px',
                color: '#ff69b4'
            });
            maxWidth = Math.max(maxWidth, text.width);
            text.destroy();
            return track;
        });

        // Crear los textos centrados
        songs.forEach((track, i) => {
            let text = this.add.text(maxWidth / 2, i * 30, track, {
                fontFamily: 'VCR',
                fontSize: '24px',
                color: '#ff69b4'
            })
                .setOrigin(0.5, 0.5); // Centrar el texto

            this.trackTexts.push(text);
            tracksContainer.add(text);
        });
    }

    updateWeekScore(forceUpdate = false) {
        const difficulty = this.difficulties[this.selectedDifficulty];
        const currentWeek = this.weekKeys[this.selectedWeekIndex];
        const weekName = this.weeks[currentWeek].weekName;
        const weekKey = `weekScore_${weekName}_${difficulty}`;
        const savedScore = parseInt(localStorage.getItem(weekKey) || "0");

        // Si no existe el animador, créalo
        if (!this.scoreAnimator) {
            this.scoreAnimator = new NumberAnimation(this, this.scoreText);
        }

        // Si es una actualización forzada, resetear el texto actual
        if (forceUpdate) {
            this.scoreText.setText('LEVEL SCORE: 0');
        }

        // Obtener el score actual
        const currentScore = parseInt(this.scoreText.text.replace('LEVEL SCORE: ', '') || '0');

        // Si el score es diferente o es una actualización forzada, animar
        if (currentScore !== savedScore || forceUpdate) {
            // Detener cualquier animación anterior
            if (this.scoreAnimator.isAnimating) {
                this.scoreAnimator.stop();
            }

            // Animar al nuevo valor
            this.scoreAnimator.animateNumber(
                0, // Siempre empezar desde 0 para evitar confusiones
                savedScore,
                'LEVEL SCORE: ',
                '',
                500
            );
        }
    }

    selectWeek() {
        // Obtener los datos del JSON original para verificar si es un mod
        const weekData = this.cache.json.get(this.weekKeys[this.selectedWeekIndex]);
        const selectedWeekData = this.weeks[this.weekKeys[this.selectedWeekIndex]];

        // Verificar explícitamente si es un mod y obtener sus datos
        const isMod = Boolean(weekData?.isMod);
        const modPath = weekData?.modPath || null;
        const modName = weekData?.modName || null;

        console.log('Week Data:', {
            isMod,
            modPath,
            modName,
            weekData
        });

        // Asegurarse de que las canciones estén en formato plano
        const storyPlaylist = selectedWeekData.tracks.flat();

        const storyData = {
            // Datos de la historia
            isStoryMode: true,
            storyPlaylist: storyPlaylist,
            songList: storyPlaylist,
            currentSongIndex: 0,

            // Datos de la semana
            weekName: selectedWeekData.weekName,
            weekBackground: selectedWeekData.bg,
            weekCharacters: selectedWeekData.weekCharacters,
            weekTracks: selectedWeekData.tracks,

            // Datos del juego
            campaignScore: 0,
            campaignMisses: 0,

            // Dificultad
            storyDifficulty: this.difficulties[this.selectedDifficulty],
            selectedDifficulty: this.difficulties[this.selectedDifficulty],

            // Datos del mod
            isMod: isMod,
            modPath: modPath,
            modName: modName
        };

        console.log("Enviando datos a PlayState:", storyData);

        // Verificar que los datos del mod estén presentes si es un mod
        if (isMod && (!modPath || !modName)) {
            console.error('Datos del mod incompletos:', { isMod, modPath, modName });
        }

        this.scene.start("PlayState", storyData);
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

    setupMobileBackButton() {
        const { width, height } = this.scale;
        
        this.backButton = this.add.sprite(width - 105, height - 75, 'backButton')
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive()
            .setScale(0.5)
            .setFrame('back0000');
        
        this.backButton.on('pointerdown', () => {
            // Crear la animación
            this.sound.play('cancelMenu');
            this.anims.create({
                key: 'backPress',
                frames: this.anims.generateFrameNames('backButton', {
                    prefix: 'back',
                    zeroPad: 4,
                    start: 0,
                    end: 22
                }),
                frameRate: 24,
                repeat: 0
            });

            this.backButton.play('backPress');
            
            // Esperar a que la animación llegue a la mitad antes de cambiar de escena
            this.time.delayedCall(100, () => {
                this.scene.get("TransitionScene").startTransition('MainMenuState');
            });
        });
    }

}

// ====== ASIGNACIONES GLOBALES ======
globalThis.PlayState = PlayState; // Asegúrate de que PlayState esté definido en otro archivo
game.scene.add("PlayState", PlayState);
game.scene.add("StoryModeState", StoryModeState);