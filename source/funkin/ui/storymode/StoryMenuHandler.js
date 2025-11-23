// ====== ARCHIVO: StoryMenuHandler.js ======
import { Character } from './StoryCharacters.js';
import { NumberAnimation } from './NumberAnimation.js';

/**
 * Maneja toda la lógica de estado e interacción para la StoryModeState.
 */
export class StoryMenuHandler {
    constructor(scene) {
        /** @type {StoryModeState} */
        this.scene = scene;
        this.weeks = scene.weeks;
        this.weekKeys = scene.weekKeys;
        this.difficulties = scene.difficulties;
        this.keyState = {};
    }

    setupInputs() {
        this.onKeyUp = async () => { await this.changeWeek(-1); this.scene.sound.play('scrollSound'); };
        this.onKeyDown = async () => { await this.changeWeek(1); this.scene.sound.play('scrollSound'); };
        this.onKeyLeft = () => { this.scene.leftDifficultyArrow.play('leftConfirm'); this.changeDifficulty(-1); this.scene.sound.play('scrollSound'); };
        this.onKeyRight = () => { this.scene.rightDifficultyArrow.play('rightConfirm'); this.changeDifficulty(1); this.scene.sound.play('scrollSound'); };
        this.onKeyEnter = () => this.handleConfirm();
        this.onKeyBack = () => this.handleBack();

        this.onKeyUpUp = () => this.scene.leftDifficultyArrow.play('leftIdle');
        this.onKeyRightUp = () => this.scene.rightDifficultyArrow.play('rightIdle');

        const kb = this.scene.input.keyboard;
        kb.on('keydown-UP', this.onKeyUp);
        kb.on('keydown-DOWN', this.onKeyDown);
        kb.on('keydown-LEFT', this.onKeyLeft);
        kb.on('keydown-RIGHT', this.onKeyRight);
        kb.on('keydown-ENTER', this.onKeyEnter);
        kb.on('keydown-ESCAPE', this.onKeyBack);
        kb.on('keydown-BACKSPACE', this.onKeyBack);

        kb.on('keyup-LEFT', this.onKeyUpUp);
        kb.on('keyup-RIGHT', this.onKeyRightUp);

        this.onMouseWheel = async (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) await this.changeWeek(1);
            else if (deltaY < 0) await this.changeWeek(-1);
        };
        this.scene.input.on('wheel', this.onMouseWheel);
    }

    loadCharacters() {
        this.scene.characters.forEach(character => character.destroy());
        this.scene.characters = [];

        const weekData = this.weeks[this.weekKeys[this.scene.selectedWeekIndex]];
        if (!weekData || !weekData.weekCharacters) return;

        const positions = [ { x: 280, y: 260 }, { x: 650, y: 260 }, { x: 1050, y: 260 } ];

        weekData.weekCharacters.forEach((characterName, index) => {
            if (!characterName || characterName === '') return;
            const characterDataKey = `${characterName}Data`;
            const characterTextureKey = characterName;

            if (!this.scene.textures.exists(characterTextureKey) || !this.scene.cache.json.exists(characterDataKey)) {
                console.warn(`Assets for character ${characterName} were expected but not found.`);
                return;
            }

            try {
                // 1. Obtener datos del JSON
                const characterData = this.scene.cache.json.get(characterDataKey);
                
                // 2. (ARREGLO) Asignar la clave de textura al objeto de datos
                //    Esto es lo que el constructor de Character (V4) espera.
                characterData.image = characterTextureKey;

                // 3. (ARREGLO) Llamar al constructor con 4 argumentos
                const character = new Character(this.scene, positions[index].x, positions[index].y, characterData);
                
                this.scene.characters.push(character);
            } catch (error) {
                console.error(`Error creating character instance ${characterName}:`, error);
            }
        });
    }

    async changeWeek(direction) {
        this.scene.weekTitlesContainer.list[this.scene.selectedWeekIndex]?.setAlpha(0.6); // Added safe navigation

        this.scene.selectedWeekIndex = (this.scene.selectedWeekIndex + direction + this.weekKeys.length) % this.weekKeys.length;
        let currentWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        let currentWeek = this.weeks[currentWeekKey];

        // Cargar assets de personajes (si no están ya cargados)
        await this.scene._loadCharactersForWeek(this.scene.selectedWeekIndex);

        // Actualizar el fondo (con la nueva lógica de fade)
        this.updateBackground(); 

        // Actualizar UI
        this.scene.levelTitleText.setText(currentWeek.weekName.toUpperCase());
        this.updateTracks();
        this.loadCharacters(); // Crea las instancias de los personajes
        this.repositionTitles();

        this.scene.weekTitlesContainer.list[this.scene.selectedWeekIndex]?.setAlpha(1); // Added safe navigation
    }

    /**
     * --- FUNCIÓN MODIFICADA ---
     * Actualiza el color de fondo.
     * Si la semana tiene un color hex válido, hace un fade a ese color.
     * Si no, usa el color amarillo por defecto.
     */
    updateBackground() {
        const DEFAULT_COLOR = 0xF9CF51; // Color amarillo por defecto
        const { width } = this.scene.scale;

        // 1. Asegurarse de que el rectángulo de fondo exista
        if (!this.scene.weekBackground || this.scene.weekBackground.type !== 'Rectangle') {
            if (this.scene.weekBackground) this.scene.weekBackground.destroy();
            
            // Crear con el color por defecto
            this.scene.weekBackground = this.scene.add.rectangle(width / 2, 56 + 200, width, 400, DEFAULT_COLOR)
                .setOrigin(0.5, 0.5)
                .setDepth(100);
        }

        // 2. Obtener el color de la semana actual
        const currentWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        const currentWeek = this.weeks[currentWeekKey];
        const bgData = currentWeek?.bg; // ej: "#FF0000", "0xFF0000", o "stage"

        let targetColorNumber;

        // 3. Validar y parsear el color
        if (typeof bgData === 'string' && (bgData.startsWith('#') || bgData.startsWith('0x'))) {
            try {
                // parseInt puede manejar "0xFFFFFF" y (con replace) "#FFFFFF"
                targetColorNumber = parseInt(bgData.replace('#', '0x'));
                if (isNaN(targetColorNumber)) {
                    targetColorNumber = DEFAULT_COLOR; // El parseo falló (ej. "0xGG")
                }
            } catch (e) {
                targetColorNumber = DEFAULT_COLOR; // Error de parseo
            }
        } else {
            // No es un string de color (es "stage", undefined, null, etc.)
            targetColorNumber = DEFAULT_COLOR;
        }

        // 4. Obtener el color actual del rectángulo
        const currentColor = this.scene.weekBackground.fillColor;

        // 5. Si el color ya es el correcto, no hacer nada
        if (currentColor === targetColorNumber) {
            return;
        }

        // 6. Detener cualquier tween de color anterior
        this.scene.tweens.killTweensOf(this.scene.weekBackground);

        // 7. Crear objetos de color para la interpolación
        const startColor = new Phaser.Display.Color(currentColor);
        const endColor = new Phaser.Display.Color(targetColorNumber);

        // 8. Animar (fade) de un color a otro
        this.scene.tweens.add({
            targets: { t: 0 }, // Objeto dummy para animar
            t: 1,
            duration: 400, // Duración del fade (en ms)
            ease: 'Linear',
            onUpdate: (tween) => {
                // Interpolar entre el color inicial y final
                const interpolatedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                    startColor,
                    endColor,
                    100, // Rango (0-100)
                    tween.progress * 100 // Progreso (0-100)
                );
                
                // Obtener el valor numérico (integer) del color interpolado
                const colorInt = Phaser.Display.Color.GetColor(interpolatedColor.r, interpolatedColor.g, interpolatedColor.b);
                
                // Aplicar el nuevo color al rectángulo en cada frame
                if (this.scene.weekBackground) { // Comprobación de seguridad
                    this.scene.weekBackground.setFillStyle(colorInt);
                }
            }
        });
    }


    repositionTitles() {
        const spacing = 120;
        const selectedY = 530;
        this.scene.weekTitlesContainer.list.forEach((title, index) => {
            let targetY = 0;
            if (index < this.scene.selectedWeekIndex) { targetY = selectedY - (spacing * (this.scene.selectedWeekIndex - index)); }
            else { targetY = selectedY + (spacing * (index - this.scene.selectedWeekIndex)); }
            this.scene.tweens.add({
                targets: title,
                y: targetY,
                duration: 450, 
                ease: 'Cubic.easeInOut'
            });
        });
        this.scene.time.delayedCall(450, () => this.updateWeekScore(true)); 
    }

    changeDifficulty(direction) {
        if (direction === 0) return;
        this.scene.selectedDifficulty = (this.scene.selectedDifficulty + direction + this.difficulties.length) % this.difficulties.length;
        this.scene.difficultyImage.setTexture(this.difficulties[this.scene.selectedDifficulty]);
        this.updateWeekScore();
    }

    updateTracks() {
        this.scene.trackTexts.forEach(text => text.destroy());
        this.scene.trackTexts = [];
        let currentWeek = this.weekKeys[this.scene.selectedWeekIndex];
        
        let songs = this.weeks[currentWeek]?.tracks || [];
        const tracklistX = this.scene.scale.width * 0.05 + 150;
        this.scene.trackLabel.setPosition(tracklistX, 56 + 400 + 100);
        let tracksContainer = this.scene.add.container(tracklistX, this.scene.trackLabel.y + 80);
        
        // Esta parte para calcular maxWidth no parece usarse, pero se mantiene la lógica
        let maxWidth = 0;
        songs.forEach(track => {
            let tempText = this.scene.add.text(0, 0, track, { fontFamily: 'VCR', fontSize: '32px' }).setVisible(false);
            maxWidth = Math.max(maxWidth, tempText.width);
            tempText.destroy();
        });
        
        songs.forEach((track, i) => {
            let text = this.scene.add.text(0, i * 40, track, { fontFamily: 'VCR', fontSize: '32px', color: '#E55777' }).setOrigin(0.5, 0.5);
            this.scene.trackTexts.push(text);
            tracksContainer.add(text);
        });
        this.scene.trackLabel.x = tracksContainer.x;
    }

     updateWeekScore(forceUpdate = false) {
        const difficulty = this.difficulties[this.scene.selectedDifficulty];
        const currentWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        const currentWeek = this.weeks[currentWeekKey];
        if (!currentWeek) return;

        const weekName = currentWeek.weekName;
        const weekKey = `weekScore_${weekName}_${difficulty}`;
        const savedScore = parseInt(localStorage.getItem(weekKey) || "0");

        if (!this.scene.scoreAnimator) {
            this.scene.scoreAnimator = new NumberAnimation(this.scene, this.scene.scoreText);
        }

        if (forceUpdate) { this.scene.scoreText.setText('HIGH SCORE: 0'); }
        const currentScoreText = this.scene.scoreText.text || 'HIGH SCORE: 0';
        const currentScore = parseInt(currentScoreText.replace('HIGH SCORE: ', '') || '0');

        if (currentScore !== savedScore || forceUpdate) {
            if (this.scene.scoreAnimator.isAnimating) { this.scene.scoreAnimator.stop(); }
            this.scene.scoreAnimator.animateNumber(0, savedScore, 'HIGH SCORE: ', '', 500);
        }
    }

    // --- [FUNCIÓN MODIFICADA] ---
    selectWeek() {
        // --- 1. Get Data ---
        const selectedWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        const selectedWeekData = this.weeks[selectedWeekKey];

        if (!selectedWeekData) {
             console.error("Selected week data is missing! Cannot start week.");
             if (this.scene.cancelSound) this.scene.cancelSound.play();
             return; 
        }

        const playlistSongIds = selectedWeekData.tracks.flat();
        const currentDifficulty = this.difficulties[this.scene.selectedDifficulty];

        // --- 2. Prepare Data Object ---
        const storyData = {
            isStoryMode: true,
            playlistSongIds: playlistSongIds || [],
            Score: 0,
            storyTitle: selectedWeekData.weekName || "Unknown Week",
            DifficultyID: currentDifficulty,
            WeekId: selectedWeekKey,
            targetSongId: playlistSongIds?.[0] || null,
            currentSongIndex: 0
        };

        // --- 3. Log, Store in Registry, and Disable Input ---
        console.log("Preparing to start PlayState with:", storyData);
        // La línea del registry puede ser usada por tu TransitionScene,
        // pero la llamada a scene.start NECESITA los datos.
        this.scene.registry.set('playStateData', storyData);
        this.scene.canPressEnter = false; // Disable input

        // --- 4. Fade Out and Transition ---
        const fadeDuration = 500; // ms
        this.scene.cameras.main.fadeOut(fadeDuration, 0, 0, 0, (_camera, progress) => {
            if (progress === 1) {
                const transitionScene = this.scene.scene.get("TransitionScene");

                if (transitionScene?.startTransition) {
                     // [CORREGIDO] Pasa los datos de la canción a la escena de transición
                     transitionScene.startTransition("PlayState", storyData);
                } else {
                     // [CORREGIDO] Pasa los datos de la canción directamente a PlayState
                     this.scene.scene.start("PlayState", storyData);
                }
            }
        });
    }
    // --- [FIN DE LA MODIFICACIÓN] ---

    handleConfirm() {
        if (!this.scene.canPressEnter || this.keyState['ENTER']) return;
        this.scene.canPressEnter = false;
        this.keyState['ENTER'] = true;
        this.scene.sound.play('confirmSound');

        this.scene.characters.forEach(character => {
             if (character && typeof character.playConfirmAnim === 'function') {
                character.playConfirmAnim();
            }
        });

        const selectedTitle = this.scene.weekTitlesContainer?.list[this.scene.selectedWeekIndex];
        if (!selectedTitle) {
            console.error("Selected title not found during confirm!");
            this.selectWeek(); 
            return;
        }

        selectedTitle.setData('isFlashing', true);
        this.scene.tweens.add({
            targets: selectedTitle,
            tint: 0x33FFFF,
            duration: 50,
            ease: 'Linear',
            yoyo: true,
            repeat: 10, 
            onComplete: () => {
                selectedTitle.setData('isFlashing', false);
                selectedTitle.clearTint();
                this.keyState['ENTER'] = false; 
                this.scene.canPressEnter = true; 
                this.selectWeek();
            }
        });
    }

    handleBack() {
        if (this.keyState['BACKSPACE'] || this.keyState['ESCAPE']) return;
        this.keyState['BACKSPACE'] = true;
        this.keyState['ESCAPE'] = true;
        this.scene.sound.play('cancelSound');

        if (this.scene.scene.get("TransitionScene")?.startTransition) {
             this.scene.scene.get("TransitionScene").startTransition("MainMenuState");
        } else {
             this.scene.scene.start("MainMenuState");
        }
    }

    destroy() {
        const kb = this.scene.input.keyboard;
        kb.off('keydown-UP', this.onKeyUp);
        kb.off('keydown-DOWN', this.onKeyDown);
        kb.off('keydown-LEFT', this.onKeyLeft);
        kb.off('keydown-RIGHT', this.onKeyRight);
        kb.off('keydown-ENTER', this.onKeyEnter);
        kb.off('keydown-ESCAPE', this.onKeyBack);
        kb.off('keydown-BACKSPACE', this.onKeyBack);

        kb.off('keyup-LEFT', this.onKeyUpUp);
        kb.off('keyup-RIGHT', this.onKeyRightUp);

        this.scene.input.off('wheel', this.onMouseWheel);

         if(this.scene.flickerTimer){
             this.scene.flickerTimer.remove();
             this.scene.flickerTimer = null;
         }
    }
}