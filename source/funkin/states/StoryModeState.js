import { PlayState } from './PlayState.js';  // Añade esta línea al principio
import { ModManager } from '../../utils/ModDetect.js';
import { Character } from '../visuals/objects/components/StoryCharacters.js'
import { NumberAnimation } from '../../utils/NumberAnimation.js'; // Añadir import al inicio del archivo
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

    async loadWeekData() {
        let weekList = [];
        
        // 1. Primero cargar semanas del juego base
        const baseWeekList = this.cache.text.get('weekList').trim().split('\n')
            .map(week => week.trim())
            .filter(week => week.length > 0);
        
        // Cargar los JSON de las semanas base primero
        for (const week of baseWeekList) {
            const weekPath = `public/assets/data/weekList/${week}.json`;
            try {
                const response = await fetch(weekPath);
                if (response.ok) {
                    const weekData = await response.json();
                    this.cache.json.add(week, weekData);
                    weekList.push(week);
                }
            } catch (error) {
                console.warn(`Error loading base week ${week}:`, error);
            }
        }
        
        // 2. Después cargar las semanas del mod
        if (ModManager.isModActive()) {
            const currentMod = ModManager.getCurrentMod();
            const modWeekList = currentMod.weekList;
            
            for (const week of modWeekList) {
                const weekPath = `${currentMod.path}/data/weekList/${week}.json`;
                try {
                    const response = await fetch(weekPath);
                    if (response.ok) {
                        const weekData = await response.json();
                        // Añadir información del mod al weekData
                        weekData.isMod = true;
                        weekData.modName = currentMod.name;
                        this.cache.json.add(week, weekData);
                        weekList.push(week);
                    }
                } catch (error) {
                    console.warn(`Error loading week ${week} from mod:`, error);
                }
            }
        }

        // 3. Actualizar el método loadAssets para manejar la búsqueda en cascada
        this.loadAssets(weekList);
    }

    async loadAssets(weekList) {
        for (const week of weekList) {
            const weekData = this.cache.json.get(week);
            if (!weekData) continue;

            const isModWeek = weekData.isMod;
            const modPath = isModWeek ? `public/mods/${weekData.modName}` : null;

            // Función auxiliar para cargar un asset con fallback
            const loadWithFallback = async (assetType, assetName, subFolder) => {
                if (isModWeek) {
                    // Intentar primero en el mod
                    const modAssetPath = `${modPath}/images/states/storyMenu/${subFolder}/${assetName}.png`;
                    try {
                        const modResponse = await fetch(modAssetPath);
                        if (modResponse.ok) {
                            return modAssetPath;
                        }
                    } catch (error) {
                        // Si falla, continuará con el fallback
                    }
                }
                // Fallback al juego base
                return `public/assets/images/states/storyMenu/${subFolder}/${assetName}.png`;
            };

            // Cargar background
            const bgPath = await loadWithFallback('background', weekData.weekBackground, 'menuBackgrounds');
            this.load.image(weekData.weekBackground, bgPath);

            // Cargar título
            const titlePath = await loadWithFallback('title', weekData.weekName, 'titles');
            this.load.image(`${weekData.weekName}Title`, titlePath);

            // Cargar personajes
            for (const character of weekData.weekCharacters) {
                if (!character) continue;
                if (this.characterCache[character]) continue;

                const characterBasePath = await loadWithFallback('character', `Menu_${character}`, 'menucharacters');
                const characterXMLPath = characterBasePath.replace('.png', '.xml');
                const characterJSONPath = characterBasePath.replace('Menu_', '').replace('.png', '.json');

                this.load.atlasXML(character, characterBasePath, characterXMLPath);
                this.load.json(`${character}Data`, characterJSONPath);
            }
        }

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
        
        // Filtrar las semanas que son visibles en Story Mode
        const visibleWeeks = weekList.filter(week => {
            const weekData = this.cache.json.get(week);
            // Si StoryVisible no está definido, asumimos que es true
            return weekData && (weekData.StoryVisible !== false);
        });

        visibleWeeks.forEach(week => {
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
                weekCharacters: weekData.weekCharacters,
                StoryVisible: weekData.StoryVisible !== false
            };
        });

        this.weekKeys = Object.keys(this.weeks);
        console.log("Processed weeks:", this.weeks);
        console.log("Week keys:", this.weekKeys);

        if (this.weekKeys.length > 0) {
            this.initializeScene();
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
        }) .setDepth(10);

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
            let text = this.add.text(maxWidth/2, i * 30, track, {
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
        let selectedWeekData = this.weeks[this.weekKeys[this.selectedWeekIndex]];
        let selectedDifficulty = this.difficulties[this.selectedDifficulty];

        // Asegurarse de que las canciones estén en formato plano
        const storyPlaylist = selectedWeekData.tracks.flat();

        const storyData = {
            storyPlaylist: storyPlaylist,
            songList: storyPlaylist, // Añadir esto
            storyDifficulty: selectedDifficulty,
            isStoryMode: true,
            currentSongIndex: 0, // Asegurarse de que empiece desde la primera canción
            campaignScore: 0,
            campaignMisses: 0,
            weekName: selectedWeekData.weekName,
            weekBackground: selectedWeekData.bg,
            weekCharacters: selectedWeekData.weekCharacters,
            weekTracks: selectedWeekData.tracks,
            selectedDifficulty: selectedDifficulty
        };

        console.log("Enviando datos a PlayState:", storyData);
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
    
}

// ====== ASIGNACIONES GLOBALES ======
globalThis.PlayState = PlayState; // Asegúrate de que PlayState esté definido en otro archivo
game.scene.add("PlayState", PlayState);
game.scene.add("StoryModeState", StoryModeState);