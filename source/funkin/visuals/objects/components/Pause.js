import Alphabet from "../../../../utils/Alphabet.js";

export class PauseMenu extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        this.scene = scene;
        
        // Propiedades del menú
        this.visible = false;
        this.isActive = false;
        this.selectedIndex = 0;
        this.menuItems = [];
        
        // Configuración de animación
        this.menuInitialY = -200;
        this.isEntering = true;
        this.targetPositions = [];

        // Información de la canción
        this.songInfo = null;
        this.isShowingArtist = true;
        this.songInfoTimer = 0;
        this.songInfoDelay = 5000;
        this.songInfoAlpha = 1;
        this.isChangingText = false;

        // Sonidos - Initialize as null and load when available
        this.scrollSound = null;
        this.pauseMusic = null;
        
        // Try to initialize audio immediately, but don't warn if not found yet
        this._initializeAudio();

        this.lastRealTime = Date.now();

        // Crear elementos
        this._createBackground();
        this._createMenuItems();
        this._setupInputs();
        this._setupTouchControls();
        
        // Añadir a la escena
        scene.add.existing(this);
        this.setDepth(9999);
        this.setVisible(false);
        this.setActive(false);
        this.alpha = 0;
    }

    _initializeAudio() {
        // Initialize scroll sound if available
        if (!this.scrollSound && this.scene.cache.audio.exists('scrollMenu')) {
            this.scrollSound = this.scene.sound.add('scrollMenu');
        }
        
        // Initialize pause music if available
        if (!this.pauseMusic && this.scene.cache.audio.exists('breakfast')) {
            this.pauseMusic = this.scene.sound.add('breakfast', {
                volume: 0,
                loop: true,
                ignorePause: true
            });
        }
    }

    _createBackground() {
        const bg = new Phaser.GameObjects.Rectangle(
            this.scene,
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            0x000000,
            0.7
        );
        this.add(bg);
    }

    _createMenuItems() {
        // Texto del nombre de la canción (usando Text para info estática)
        const songName = this.scene.songData?.song?.song || 'Unknown Song';
        const pausedText = new Phaser.GameObjects.Text(
            this.scene,
            this.scene.scale.width - 20,
            20,
            songName.toUpperCase(),
            {
                fontSize: '32px',
                fontFamily: 'VCR',
                fill: '#ffffff',
                align: 'right'
            }
        );
        pausedText.setOrigin(1, 0);
        this.add(pausedText);

        // Texto de dificultad
        const difficulty = this.scene.dataManager?.storyDifficulty || 'normal';
        const difficultyText = new Phaser.GameObjects.Text(
            this.scene,
            this.scene.scale.width - 20,
            60,
            `DIFFICULTY: ${difficulty.toUpperCase()}`,
            {
                fontSize: '24px',
                fontFamily: 'VCR',
                fill: '#ffffff',
                align: 'right'
            }
        );
        difficultyText.setOrigin(1, 0);
        this.add(difficultyText);

        // Texto de Artista/Charter
        const artist = this.scene.songData?.song?.Artis || 'Unknown';
        this.songInfo = new Phaser.GameObjects.Text(
            this.scene,
            this.scene.scale.width - 20,
            90,
            `ARTIST: ${artist}`,
            {
                fontSize: '24px',
                fontFamily: 'VCR',
                fill: '#ffffff',
                align: 'right'
            }
        );
        this.songInfo.setOrigin(1, 0);
        this.add(this.songInfo);

        // Opciones del menú usando Alphabet
        const menuOptions = ['RESUME', 'RESET', 'BACK TO MENU'];
        const padding = 60;
        const centerY = this.scene.scale.height / 2;
        const spacing = 110;

        menuOptions.forEach((option, index) => {
            const text = new Alphabet(
                this.scene,
                padding,
                this.menuInitialY,
                option,
                true,
                1
            );
            
            if (this.scene._isMobileDevice()) {
                text.setInteractive(new Phaser.Geom.Rectangle(0, 0, text.width, text.height), 
                    Phaser.Geom.Rectangle.Contains);
                
                text.on('pointerdown', () => {
                    if (this.isActive) {
                        this.selectedIndex = index;
                        this._selectCurrentOption();
                    }
                });
            }

            // Configurar propiedades iniciales
            text.setAlpha(0);
            text.setActive(false);
            
            // Guardar posición objetivo
            this.targetPositions[index] = centerY + ((index - 1) * spacing);
            
            this.menuItems.push(text);
            this.add(text);
        });
    }

    _animateMenuItems() {
        this.menuItems.forEach((item, index) => {
            this.scene.tweens.add({
                targets: item,
                y: this.targetPositions[index],
                alpha: index === this.selectedIndex ? 1 : 0.3,
                duration: 500,
                ease: 'Back.easeOut',
                delay: index * 150,
                ignorePause: true
            });
        });
    }

    _moveSelection(direction) {
        // Try to initialize audio if not already done
        if (!this.scrollSound) {
            this._initializeAudio();
        }
        
        if (this.scrollSound) {
            this.scrollSound.play();
        }

        this.selectedIndex = Phaser.Math.Wrap(
            this.selectedIndex + direction,
            0,
            this.menuItems.length
        );

        this._updateSelection();
    }

    _updateSelection() {
        const centerY = this.scene.scale.height / 2;
        const spacing = 120;
        
        this.menuItems.forEach((item, index) => {
            const isHighlighted = index === this.selectedIndex;
            const offsetFromSelected = index - this.selectedIndex;
            const targetY = centerY + (offsetFromSelected * spacing);
            
            this.scene.tweens.killTweensOf(item);

            this.scene.tweens.add({
                targets: item,
                y: targetY,
                x: isHighlighted ? 100 : 60,
                scale: isHighlighted ? 1.2 : 0.8,
                alpha: isHighlighted ? 1 : 0.3,
                duration: 200,
                ease: 'Sine.easeOut',
                ignorePause: true
            });
        });
    }

    _selectCurrentOption() {
        const selectedItem = this.menuItems[this.selectedIndex];
        const scene = this.scene;

        this.scene.tweens.add({
            targets: selectedItem,
            scale: 1.5,
            alpha: 0.8,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut',
            ignorePause: true,
            onComplete: () => {
                if (this.pauseMusic && this.pauseMusic.isPlaying) {
                    this.pauseMusic.stop();
                }

                switch (this.selectedIndex) {
                    case 0: // RESUME
                        scene._resumeGame();
                        break;
                        
                    case 1: // RESET
                        scene._cleanupBeforeRestart();
                        this.destroy();
                        scene.scene.restart();
                        break;
                        
                    case 2: // BACK TO MENU
                        scene._cleanupBeforeRestart();
                        this.destroy();
                        scene.playFreakyMenuAndRedirect();
                        break;
                }
            }
        });
    }

    _handlePauseMusic() {
        // Try to initialize audio if not already done
        if (!this.pauseMusic) {
            this._initializeAudio();
        }

        // If still not available after initialization attempt, try to create it manually
        if (!this.pauseMusic && this.scene.cache.audio.exists('breakfast')) {
            this.pauseMusic = this.scene.sound.add('breakfast', {
                volume: 0,
                loop: true,
                ignorePause: true
            });
        }

        if (!this.pauseMusic) return;

        if (this.visible) {
            if (!this.pauseMusic.isPlaying) {
                this.pauseMusic.play();
                this.pauseMusic.volume = 0;
            }
            
            this.scene.tweens.killTweensOf(this.pauseMusic);
            
            this.scene.tweens.add({
                targets: this.pauseMusic,
                volume: 0.7,
                duration: 1000,
                ease: 'Cubic.easeIn',
                ignorePause: true
            });
        } else {
            if (this.pauseMusic.isPlaying) {
                this.pauseMusic.stop();
            }
        }
    }

    _setupInputs() {
        // Limpiar listeners previos
        this.scene.input.keyboard.removeListener('keydown-UP');
        this.scene.input.keyboard.removeListener('keydown-DOWN');
        this.scene.input.keyboard.removeListener('keydown-ENTER');

        // Configurar controles desde localStorage
        const controls = {
            up: localStorage.getItem("CONTROLS.UI.UP") || "UP",
            down: localStorage.getItem("CONTROLS.UI.DOWN") || "DOWN",
            accept: localStorage.getItem("CONTROLS.UI.ACCEPT") || "ENTER"
        };

        this.scene.input.keyboard.on('keydown-' + controls.up, () => {
            if (this.isActive) {
                this._moveSelection(-1);
            }
        });

        this.scene.input.keyboard.on('keydown-' + controls.down, () => {
            if (this.isActive) {
                this._moveSelection(1);
            }
        });

        this.scene.input.keyboard.on('keydown-' + controls.accept, () => {
            if (this.isActive) {
                this._selectCurrentOption();
            }
        });
    }

    _setupTouchControls() {
        if (!this.scene._isMobileDevice()) return;

        let startY = 0;
        let isDragging = false;

        this.scene.input.on('pointerdown', (pointer) => {
            if (!this.isActive) return;
            
            startY = pointer.y;
            isDragging = true;

            // Verificar si se hizo clic directamente en una opción
            this.menuItems.forEach((item, index) => {
                if (item.getBounds().contains(pointer.x, pointer.y)) {
                    this.selectedIndex = index;
                    this._selectCurrentOption();
                }
            });
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (!isDragging || !this.isActive) return;

            const deltaY = pointer.y - startY;
            if (Math.abs(deltaY) > 50) { // umbral de desplazamiento
                this._moveSelection(deltaY > 0 ? -1 : -1);
                startY = pointer.y;
            }
        });

        this.scene.input.on('pointerup', () => {
            isDragging = false;
        });
    }

    _creditsMenu() {
        if (this.songInfo && this.visible && this.isActive) {
            const currentRealTime = Date.now();
            const elapsed = currentRealTime - this.lastRealTime;
            this.lastRealTime = currentRealTime;

            this.songInfoTimer += elapsed;

            if (this.songInfoTimer >= this.songInfoDelay && !this.isChangingText) {
                this.isChangingText = true;
                
                const artist = this.scene.songData?.song?.Artis || 'Unknown';
                const charter = this.scene.songData?.song?.Charter || 'Unknown';
                
                this.scene.tweens.killTweensOf(this.songInfo);
                
                const fadeOut = () => {
                    if (this.songInfo.alpha > 0.01) {
                        this.songInfo.alpha = this.lerp(this.songInfo.alpha, 0, 0.2);
                        requestAnimationFrame(fadeOut);
                    } else {
                        this.songInfo.alpha = 0;
                        this.isShowingArtist = !this.isShowingArtist;
                        this.songInfo.setText(this.isShowingArtist ? 
                            `ARTIST: ${artist}` : 
                            `CHARTER: ${charter}`
                        );
                        fadeIn();
                    }
                };

                const fadeIn = () => {
                    if (this.songInfo.alpha < 0.99) {
                        this.songInfo.alpha = this.lerp(this.songInfo.alpha, 1, 0.2);
                        requestAnimationFrame(fadeIn);
                    } else {
                        this.songInfo.alpha = 1;
                        this.isChangingText = false;
                        this.songInfoTimer = 0;
                    }
                };

                fadeOut();
            }
        }
    }

    update() {
        this._creditsMenu();

        if (this.pauseMusic) {
            if (this.visible && this.alpha > 0 && this.isActive) {
                if (!this.pauseMusic.isPlaying) {
                    this.pauseMusic.play();
                    this.pauseMusic.volume = 0.7;
                }
            } else {
                if (this.pauseMusic.isPlaying) {
                    this.pauseMusic.stop();
                }
            }
        }

        if (!this.isActive || !this.visible) return;

        this._updateMenuPositions();
    }

    lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    _updateMenuPositions() {
        const centerY = this.scene.scale.height / 2;
        const spacing = 110;

        this.menuItems.forEach((item, index) => {
            const isHighlighted = index === this.selectedIndex;
            const offsetFromSelected = index - this.selectedIndex;
            const targetY = centerY + (offsetFromSelected * spacing);
            
            item.y = this.lerp(item.y, targetY, 0.2);
            item.x = this.lerp(item.x, isHighlighted ? 100 : 60, 0.2);
            item.scale = this.lerp(item.scale, isHighlighted ? 1.2 : 1, 0.2);
            item.alpha = this.lerp(item.alpha, isHighlighted ? 1 : 0.3, 0.2);
        });
    }

    show() {
        if (!this.visible) {
            // Ensure audio is initialized when showing the menu
            this._initializeAudio();
            
            this.setVisible(true);
            this.setActive(true);
            this.isActive = true;
            this.isEntering = true;

            this.menuItems.forEach((item, index) => {
                item.setVisible(true);
                item.setActive(true);
                item.y = this.menuInitialY;
                
                this.scene.tweens.add({
                    targets: item,
                    y: this.targetPositions[index],
                    alpha: index === this.selectedIndex ? 1 : 0.3,
                    duration: 500,
                    ease: 'Back.easeOut',
                    delay: index * 150,
                    ignorePause: true
                });
            });

            this.scene.tweens.add({
                targets: this,
                alpha: 1,
                duration: 300,
                ease: 'Linear',
                ignorePause: true
            });

            this.selectedIndex = 0;
            this.songInfoTimer = 0;
            this.isChangingText = false;
            this.isShowingArtist = true;
            this._updateSelection();
            this.setDepth(9999);
            this.lastRealTime = Date.now();
            
            // Manejar música de pausa
            this._handlePauseMusic();
        }
    }

    hide() {
        if (this.visible) {
            this.scene.tweens.add({
                targets: [this, ...this.menuItems],
                alpha: 0,
                duration: 300,
                ease: 'Linear',
                ignorePause: true,
                onComplete: () => {
                    this.setVisible(false);
                    this.setActive(false);
                    this.isActive = false;
                    this.songInfoTimer = 0;
                    this.isChangingText = false;
                    
                    // Detener música de pausa
                    if (this.pauseMusic && this.pauseMusic.isPlaying) {
                        this.pauseMusic.stop();
                    }
                }
            });
        }
    }

    destroy() {
        // Limpiar sonidos
        if (this.pauseMusic) {
            this.pauseMusic.stop();
            this.pauseMusic.destroy();
        }

        // Limpiar listeners de teclado
        this.scene.input.keyboard.removeListener('keydown-UP');
        this.scene.input.keyboard.removeListener('keydown-DOWN');
        this.scene.input.keyboard.removeListener('keydown-ENTER');

        // Destruir elementos del menú
        this.menuItems.forEach(item => {
            if (item.destroy) {
                item.destroy();
            }
        });

        // Destruir contenedor padre
        super.destroy();
    }
}