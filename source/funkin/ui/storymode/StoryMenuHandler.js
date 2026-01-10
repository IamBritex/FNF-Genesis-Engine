import { Character } from './StoryCharacters.js';
import { NumberAnimation } from './NumberAnimation.js';

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
                const characterData = this.scene.cache.json.get(characterDataKey);
                characterData.image = characterTextureKey;

                const character = new Character(this.scene, positions[index].x, positions[index].y, characterData);
                this.scene.characters.push(character);
            } catch (error) {
                console.error(`Error creating character instance ${characterName}:`, error);
            }
        });
    }

    async changeWeek(direction) {
        this.scene.weekTitlesContainer.list[this.scene.selectedWeekIndex]?.setAlpha(0.6);

        this.scene.selectedWeekIndex = (this.scene.selectedWeekIndex + direction + this.weekKeys.length) % this.weekKeys.length;
        let currentWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        let currentWeek = this.weeks[currentWeekKey];

        await this.scene._loadCharactersForWeek(this.scene.selectedWeekIndex);

        this.updateBackground(); 

        this.scene.levelTitleText.setText(currentWeek.weekName.toUpperCase());
        this.updateTracks();
        this.loadCharacters();
        this.repositionTitles();

        this.scene.weekTitlesContainer.list[this.scene.selectedWeekIndex]?.setAlpha(1);
    }

    updateBackground() {
        const DEFAULT_COLOR = 0xF9CF51; // Amarillo
        const { width } = this.scene.scale;
        const currentWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        const currentWeek = this.weeks[currentWeekKey];
        const bgData = currentWeek?.bg;

        // 1. Intentar parsear como color (Hex o RGB)
        const parsedColor = this.parseColor(bgData);
        const isColor = parsedColor !== null;
        
        // 2. Si no es color, ver si es una imagen cargada
        let isImage = false;
        if (!isColor && bgData && this.scene.textures.exists(bgData)) {
            isImage = true;
        }

        const currentBg = this.scene.weekBackground;
        
        // Detener tweens anteriores para evitar conflictos
        this.scene.tweens.killTweensOf(currentBg);

        // --- CASO A: Es Color (o fallback a color por defecto) ---
        if (isColor || (!isImage && !isColor)) {
            const targetColor = isColor ? parsedColor : DEFAULT_COLOR;
            const isCurrentRect = currentBg && currentBg.type === 'Rectangle';

            if (!currentBg || !isCurrentRect) {
                // Si no hay fondo o es una imagen, destruir y crear rectángulo
                if (currentBg) currentBg.destroy();
                this.scene.weekBackground = this.scene.add.rectangle(width / 2, 56 + 200, width, 400, targetColor)
                    .setOrigin(0.5, 0.5).setDepth(100);
            } else {
                // Si ya es rectángulo, hacemos tween de color
                // FIX: Usar ValueToColor para evitar el bug del color ROJO
                const startColor = Phaser.Display.Color.ValueToColor(currentBg.fillColor);
                const endColor = Phaser.Display.Color.ValueToColor(targetColor);

                this.scene.tweens.add({
                    targets: { t: 0 },
                    t: 1,
                    duration: 400,
                    ease: 'Linear',
                    onUpdate: (tween) => {
                        const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(
                            startColor, endColor, 100, tween.progress * 100
                        );
                        // Convertir el objeto {r,g,b} de vuelta a integer para setFillStyle
                        const colorInt = Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b);
                        
                        if (this.scene.weekBackground && this.scene.weekBackground.active) {
                            this.scene.weekBackground.setFillStyle(colorInt);
                        }
                    }
                });
            }
        } 
        // --- CASO B: Es Imagen ---
        else if (isImage) {
            // Si el actual es rectángulo o es una imagen distinta, cambiar
            if (!currentBg || currentBg.type !== 'Image' || currentBg.texture.key !== bgData) {
                if (currentBg) currentBg.destroy();
                this.scene.weekBackground = this.scene.add.image(width / 2, 56 + 200, bgData)
                    .setOrigin(0.5, 0.5).setDepth(100);
                
                // Opcional: Escalar imagen si es muy pequeña/grande
                // this.scene.weekBackground.setDisplaySize(width, 400);
            }
        }
    }

    /**
     * Parsea un string a número de color. Soporta Hex (#, 0x) y RGB (rgb(r,g,b)).
     * @param {string} input 
     * @returns {number|null}
     */
    parseColor(input) {
        if (typeof input !== 'string') return null;

        // Limpiar espacios
        input = input.trim();

        // Hexadecimal
        if (input.startsWith('#')) {
            return parseInt(input.replace('#', '0x'), 16);
        }
        if (input.startsWith('0x')) {
            return parseInt(input, 16);
        }
        
        // RGB: rgb(255, 0, 0)
        const rgbRegex = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
        const match = input.match(rgbRegex);
        if (match) {
            return Phaser.Display.Color.GetColor(
                parseInt(match[1]), 
                parseInt(match[2]), 
                parseInt(match[3])
            );
        }

        return null;
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

    selectWeek() {
        const selectedWeekKey = this.weekKeys[this.scene.selectedWeekIndex];
        const selectedWeekData = this.weeks[selectedWeekKey];

        if (!selectedWeekData) {
             console.error("Selected week data is missing! Cannot start week.");
             if (this.scene.cancelSound) this.scene.cancelSound.play();
             return; 
        }

        const playlistSongIds = selectedWeekData.tracks.flat();
        const currentDifficulty = this.difficulties[this.scene.selectedDifficulty];

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

        this.scene.registry.set('PlaySceneData', storyData);
        this.scene.canPressEnter = false;

        const fadeDuration = 500;
        this.scene.cameras.main.fadeOut(fadeDuration, 0, 0, 0, (_camera, progress) => {
            if (progress === 1) {
                const transitionScene = this.scene.scene.get("TransitionScene");

                if (transitionScene?.startTransition) {
                     transitionScene.startTransition("PlayScene", storyData);
                } else {
                     this.scene.scene.start("PlayScene", storyData);
                }
            }
        });
    }

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
             this.scene.scene.get("TransitionScene").startTransition("MainMenuScene");
        } else {
             this.scene.scene.start("MainMenuScene");
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