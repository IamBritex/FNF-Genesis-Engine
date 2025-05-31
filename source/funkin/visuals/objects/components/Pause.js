export class PauseMenu extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        this.scene = scene;
        
        // Inicializar propiedades del menú
        this.visible = false;
        this.isActive = false;
        this.selectedIndex = 0;
        this.menuItems = [];
        
        //this.menuTweens = [];
        
        // Cargar sonido de scroll
        this.scrollSound = this.scene.sound.add('scrollMenu');
        
        this.menuInitialY = -200; // Para la animación inicial
        this.isEntering = true;  // Flag para la animación de entrada
        this.targetPositions = []; // Para guardar las posiciones finales

        this.songInfo = null;
        this.isShowingArtist = true;
        this.songInfoTimer = 0;
        this.songInfoDelay = 5000; // 3 segundos entre cambios
        this.songInfoAlpha = 1;
        this.isChangingText = false;

        // Configurar la música de pausa
        this.pauseMusic = this.scene.sound.add('breakfast', {
            volume: 0,
            loop: true,
            ignorePause: true // que suene aunque el juego esté pausado
        });

        this.lastRealTime = Date.now(); // Usamos tiempo real en lugar del tiempo del juego

        this._createBackground();
        this._createMenuItems();
        this._setupInputs();
        
        scene.add.existing(this);
        this.setDepth(9999);
        this.setVisible(false);
        this.setActive(false);
        this.alpha = 0;
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
        // Texto del nombre de la canción en vez de PAUSED
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

        // Texto de dificultad con fuente VCR
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

        // Texto de Artista/Charter con fuente VCR
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

        // Opciones del menú
        const menuOptions = ['RESUME', 'RESET', 'BACK TO MENU'];
        const padding = 60;
        const centerY = this.scene.scale.height / 2;
        const spacing = 120;

        menuOptions.forEach((option, index) => {
            const text = new Phaser.GameObjects.Text(
                this.scene,
                padding,
                this.menuInitialY,
                option,
                {
                    fontSize: '64px',
                    fontFamily: 'FNF',
                    fill: '#ffffff',
                    align: 'left'
                }
            );
            
            text.setOrigin(0, 0.5);
            text.alpha = 0;
            
            // Guardar posición final para la animación
            this.targetPositions[index] = centerY + ((index - 1) * spacing);
            
            this.menuItems.push(text);
            this.add(text);
        });
    }

    _animateMenuItems() {
        // Animar cada elemento con un retraso escalonado
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
        // Reproducir sonido de scroll
        this.scrollSound.play();

        // Actualizar índice con el ciclo correcto
        this.selectedIndex += direction;
        
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.menuItems.length - 1;
        } else if (this.selectedIndex >= this.menuItems.length) {
            this.selectedIndex = 0;
        }

        // Aplicar efecto de selección
        this._updateSelection();
    }

    _updateSelection() {
        const centerY = this.scene.scale.height / 2;
        const spacing = 120;
        
        this.menuItems.forEach((item, index) => {
            const isHighlighted = index === this.selectedIndex;
            const offsetFromSelected = index - this.selectedIndex;
            const targetY = centerY + (offsetFromSelected * spacing);
            
            // Detener tweens anteriores
            this.scene.tweens.killTweensOf(item);

            // Configurar la animación con ignorePause
            this.scene.tweens.add({
                targets: item,
                y: targetY,
                x: isHighlighted ? 100 : 60,
                scaleX: isHighlighted ? 1.2 : 0.8,
                scaleY: isHighlighted ? 1.2 : 0.8,
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
        const selectedIndex = this.selectedIndex;

        // Flash effect cuando se selecciona realmente
        this.scene.tweens.add({
            targets: selectedItem,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0.8,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut',
            ignorePause: true,
            onComplete: () => {
                // Detener la música de pausa primero
                if (this.pauseMusic && this.pauseMusic.isPlaying) {
                    this.pauseMusic.stop();
                }

                switch (selectedIndex) {
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
        if (!this.pauseMusic) {
            this.pauseMusic = this.scene.sound.add('breakfast', {
                volume: 0,
                loop: true,
                ignorePause: true
            });
        }

        if (this.visible) {
            // Si la música no está sonando, iniciamos con volumen 0 y hacemos fade in
            if (!this.pauseMusic.isPlaying) {
                this.pauseMusic.play();
                this.pauseMusic.volume = 0; // Aseguramos que empiece en 0
            }
            
            // Detenemos cualquier tween anterior
            this.scene.tweens.killTweensOf(this.pauseMusic);
            
            // Creamos el fade in
            this.scene.tweens.add({
                targets: this.pauseMusic,
                volume: 0.7,
                duration: 1000, // Duración más larga para un fade in más suave
                ease: 'Cubic.easeIn', // Curva de ease más suave
                ignorePause: true
            });
        } else {
            if (this.pauseMusic.isPlaying) {
                this.pauseMusic.stop();
            }
        }
    }

    destroy() {
        // Detener y destruir la música de pausa
        if (this.pauseMusic) {
            this.pauseMusic.stop();
            this.pauseMusic.destroy();
        }

        // Limpiar los event listeners
        this.scene.input.keyboard.off('keydown-UP');
        this.scene.input.keyboard.off('keydown-DOWN');
        this.scene.input.keyboard.off('keydown-ENTER');

        super.destroy();
    }

    _setupInputs() {
        this.scene.input.keyboard.on('keydown-UP', () => {
            if (this.isActive) {
                this.scrollSound.play();
                this._moveSelection(-1);
            }
        });

        this.scene.input.keyboard.on('keydown-DOWN', () => {
            if (this.isActive) {
                this.scrollSound.play();
                this._moveSelection(1);
            }
        });

        this.scene.input.keyboard.on('keydown-ENTER', () => {
            if (this.isActive) {
                this._selectCurrentOption();
            }
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
                
                // Detener tweens anteriores del songInfo
                this.scene.tweens.killTweensOf(this.songInfo);
                
                // Usamos la misma técnica que el selector de opciones
                // pero usando this.lerp en lugar de this.scene.lerp
                
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
        // Actualizar los créditos usando tiempo real
        this._creditsMenu();

        // Manejar la música de pausa
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
        const spacing = 120;

        this.menuItems.forEach((item, index) => {
            const isHighlighted = index === this.selectedIndex;
            const offsetFromSelected = index - this.selectedIndex;
            const targetY = centerY + (offsetFromSelected * spacing);
            
            item.y = this.lerp(item.y, targetY, 0.2);
            item.x = this.lerp(item.x, isHighlighted ? 100 : 60, 0.2);
            item.scaleX = this.lerp(item.scaleX, isHighlighted ? 1.2 : 0.8, 0.2);
            item.scaleY = this.lerp(item.scaleY, isHighlighted ? 1.2 : 0.8, 0.2);
            item.alpha = this.lerp(item.alpha, isHighlighted ? 1 : 0.3, 0.2);
        });
    }

    show() {
        if (!this.visible) {
            this.setVisible(true);
            this.setActive(true);
            this.isActive = true;
            this.isEntering = true;

            // Mostrar todos los elementos del menú con ignorePause
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

            // Hacer fade in del menú con ignorePause
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
            this.lastRealTime = Date.now(); // Resetear el timer al mostrar el menú
        }
    }

    hide() {
        if (this.visible) {
            // Fade out de todos los elementos con ignorePause
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
                }
            });
        }
    }
}