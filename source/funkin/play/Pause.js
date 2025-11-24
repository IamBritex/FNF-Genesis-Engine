import Alphabet from "../../utils/Alphabet.js";

/**
 * Pause.js
 * Gestiona la lógica de pausa, menú, música y metadatos.
 * Actualiza la información al momento de pausar para asegurar datos y fuentes correctas.
 */
export class Pause {
    /**
     * @param {Phaser.Scene} scene - La escena PlayState.
     * @param {import('./camera/Camera.js').CameraManager} cameraManager - Gestor de cámaras.
     */
    constructor(scene, cameraManager) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.isPaused = false;
        
        // Contenedor visual principal
        this.container = null;
        this.bg = null;
        
        // Grupo de textos del menú
        this.grpMenu = null;
        this.menuItems = [];
        this.curSelected = 0;

        // Configuración del menú
        this.menuOptions = [
            { name: "Resume", action: "resume" },
            { name: "Restart", action: "restart" },
            { name: "Back to Menu", action: "exit" }
        ];

        // Referencias de audio
        this.songAudio = null; 
        this.pauseMusic = null;
        
        // Metadatos
        this.creditsInfo = {};
        this.creditKeys = [];
        this.currentCreditIndex = 0;

        // Variables de control
        this.tweens = []; 
        this.metaTween = null;

        this._createUI();
        
        // Teclas
        this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.upKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    }

    static preload(scene) {
        scene.load.audio('breakfast', 'public/music/breakfast.ogg');
        if (!scene.cache.audio.exists('scrollMenu')) {
            scene.load.audio('scrollMenu', 'public/sounds/scrollMenu.ogg');
        }
    }

    setSongAudio(audioObj) {
        this.songAudio = audioObj;
    }

    _createUI() {
        const { width, height } = this.scene.cameras.main;
        const centerY = height / 2;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(99999); 
        this.container.setVisible(false);
        this.container.setScrollFactor(0);

        // 1. Fondo negro semi-transparente
        this.bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.6);
        this.bg.setOrigin(0, 0);
        this.container.add(this.bg);

        // 2. Contenedor del Menú (Alphabet Items)
        this.grpMenu = this.scene.add.container(0, 0);
        this.container.add(this.grpMenu);

        // Crear items del menú
        this.menuOptions.forEach((option, index) => {
            const item = new Alphabet(this.scene, 0, 0, option.name, true);
            item.isMenuItem = true;
            item.targetY = index;
            item.alpha = 0; 
            
            this.menuItems.push(item);
            this.grpMenu.add(item);
        });

        // 3. Textos de Metadatos (Inicialmente vacíos para evitar problemas de fuente)
        const metaTextStyle = {
            fontFamily: "VCR OSD Mono",
            fontSize: "32px",
            color: "#FFFFFF",
            align: "right",
            stroke: "#000000",
            strokeThickness: 3
        };

        // Se posicionan pero no se les pone texto aún
        this.songText = this.scene.add.text(width - 20, 15, "", metaTextStyle).setOrigin(1, 0);
        this.diffText = this.scene.add.text(width - 20, 15 + 32, "", metaTextStyle).setOrigin(1, 0);
        this.deathText = this.scene.add.text(width - 20, 15 + 64, "", metaTextStyle).setOrigin(1, 0);

        this.songText.alpha = 0;
        this.diffText.alpha = 0;
        this.deathText.alpha = 0;

        this.container.add([this.songText, this.diffText, this.deathText]);

        // 4. Texto Inferior (Créditos)
        this.bottomMetaText = this.scene.add.text(width - 20, height - 20, "", {
            fontFamily: "VCR OSD Mono",
            fontSize: "32px",
            color: "#FFFFFF",
            align: "right",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(1, 1);
        this.bottomMetaText.alpha = 0;
        this.container.add(this.bottomMetaText);

        if (this.cameraManager) {
            this.cameraManager.assignToHUD(this.container);
        }
    }

    /**
     * Actualiza los textos con la información actual de la escena.
     * Se llama al pausar para garantizar que los datos y fuentes estén listos.
     */
    refreshMetadata() {
        // Datos básicos
        const songName = this.scene.chartData?.song || "Unknown";
        const difficulty = (this.scene.initData?.DifficultyID || "NORMAL").toUpperCase();
        const blueBalls = this.scene.deathCounter || 0;

        this.songText.setText(`Song: ${songName}`);
        this.diffText.setText(`Difficulty: ${difficulty}`);
        this.deathText.setText(`BlueBalls: ${blueBalls}`);

        // Créditos Dinámicos
        this.creditsInfo = {};
        this.creditKeys = [];
        
        // Intentar obtener créditos del chartData
        if (this.scene.chartData && this.scene.chartData.credits) {
            this.creditsInfo = this.scene.chartData.credits;
            this.creditKeys = Object.keys(this.creditsInfo);
        } 
        // Fallback para estructura antigua o diferente
        else if (this.scene.chartData) {
            // Si no hay bloque "credits", intentar inferir o dejar vacío
            // console.log("No credits found in chartData");
        }
    }

    update() {
        if (!this.isPaused) {
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
                this.pauseGame();
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
            this.changeSelection(-1);
        }
        if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
            this.changeSelection(1);
        }
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.selectOption();
        }
    }

    changeSelection(change) {
        this.curSelected += change;

        if (this.curSelected < 0) {
            this.curSelected = this.menuItems.length - 1;
        }
        if (this.curSelected >= this.menuItems.length) {
            this.curSelected = 0;
        }

        const soundKey = this.scene.cache.audio.exists('scrollMenu') ? 'scrollMenu' : 'scrollSound';
        if (this.scene.cache.audio.exists(soundKey)) {
            this.scene.sound.play(soundKey);
        }

        this.updateMenuVisuals();
    }

    updateMenuVisuals() {
        // [FIX CRÍTICO] Verificar si la escena y la cámara existen antes de acceder a sus propiedades
        if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) {
            return;
        }

        const centerY = this.scene.cameras.main.height / 2;
        const spacing = 120;

        this.menuItems.forEach((item, index) => {
            const distance = index - this.curSelected;
            const targetY = centerY + (distance * spacing);
            
            this.scene.tweens.add({
                targets: item,
                y: targetY,
                duration: 250,
                ease: 'Quad.out'
            });

            if (index === this.curSelected) {
                item.alpha = 1;
                this.scene.tweens.add({ targets: item, x: 120, duration: 200, ease: 'Quad.out' });
            } else {
                item.alpha = 0.6;
                this.scene.tweens.add({ targets: item, x: 100, duration: 200, ease: 'Quad.out' });
            }
        });
    }

    selectOption() {
        const selectedAction = this.menuOptions[this.curSelected].action;

        switch (selectedAction) {
            case 'resume':
                this.resumeGame();
                break;
            case 'restart':
                this.restartGame();
                break;
            case 'exit':
                this.exitToMenu();
                break;
        }
    }

    pauseGame() {
        if (this.isPaused) return;
        
        // [FIX ADICIONAL] Validación previa
        if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

        this.isPaused = true;
        
        // Actualizar textos antes de mostrar
        this.refreshMetadata();
        
        this.container.setVisible(true);

        // Pausar juego
        if (this.songAudio) {
            if (this.songAudio.inst && this.songAudio.inst.isPlaying) this.songAudio.inst.pause();
            if (this.songAudio.voices) {
                this.songAudio.voices.forEach(v => { if (v.isPlaying) v.pause(); });
            }
        }

        this.scene.anims.pauseAll();
        
        if (this.scene.countdown) {
            this.scene.countdown.pause();
        }

        // Música de pausa
        if (this.scene.cache.audio.exists('breakfast')) {
            this.pauseMusic = this.scene.sound.add('breakfast', { volume: 0, loop: true });
            this.pauseMusic.play();

            this.scene.tweens.add({
                targets: this.pauseMusic,
                volume: 0.6,
                duration: 2000,
                ease: 'Linear'
            });
        }
        
        // Visuales
        this.curSelected = 0;
        this.updateMenuVisuals();
        
        // Animación de entrada de metadatos
        this.songText.y = -50; this.songText.alpha = 0;
        this.diffText.y = -50; this.diffText.alpha = 0;
        this.deathText.y = -50; this.deathText.alpha = 0;

        this.scene.tweens.add({ targets: this.songText, y: 15, alpha: 1, duration: 400, ease: 'Quad.out', delay: 0 });
        this.scene.tweens.add({ targets: this.diffText, y: 15 + 32, alpha: 1, duration: 400, ease: 'Quad.out', delay: 100 });
        this.scene.tweens.add({ targets: this.deathText, y: 15 + 64, alpha: 1, duration: 400, ease: 'Quad.out', delay: 200 });

        // Iniciar ciclo de créditos
        if (this.creditKeys.length > 0) {
            this.startBottomMetaCycle();
        }

        console.log("[Pause] Juego Pausado");
    }

    startBottomMetaCycle() {
        if (this.metaTween) this.metaTween.stop();
        
        this.currentCreditIndex = 0;
        this.updateBottomTextContent();
        this.bottomMetaText.alpha = 0;

        const cycle = () => {
            if (!this.isPaused) return;

            // Fade In
            this.metaTween = this.scene.tweens.add({
                targets: this.bottomMetaText,
                alpha: 1,
                duration: 1000,
                ease: 'Quad.out',
                onComplete: () => {
                    if (!this.isPaused) return;
                    // Espera
                    this.scene.time.delayedCall(3000, () => {
                        if (!this.isPaused) return;
                        // Fade Out
                        this.metaTween = this.scene.tweens.add({
                            targets: this.bottomMetaText,
                            alpha: 0,
                            duration: 1000,
                            ease: 'Quad.in',
                            onComplete: () => {
                                if (!this.isPaused) return;
                                // Siguiente
                                this.currentCreditIndex = (this.currentCreditIndex + 1) % this.creditKeys.length;
                                this.updateBottomTextContent();
                                cycle();
                            }
                        });
                    });
                }
            });
        };
        cycle();
    }

    stopBottomMetaCycle() {
        if (this.metaTween) {
            this.metaTween.stop();
            this.metaTween = null;
        }
        this.bottomMetaText.alpha = 0;
    }

    updateBottomTextContent() {
        if (this.creditKeys.length === 0) return;
        const key = this.creditKeys[this.currentCreditIndex];
        const value = this.creditsInfo[key];
        // Mostrar Clave: Valor
        this.bottomMetaText.setText(`${key}: ${value}`);
    }

    resumeGame() {
        this.cleanupPauseState();

        if (this.songAudio) {
            if (this.songAudio.inst && this.songAudio.inst.isPaused) this.songAudio.inst.resume();
            if (this.songAudio.voices) {
                this.songAudio.voices.forEach(v => { if (v.isPaused) v.resume(); });
            }
        }

        this.scene.anims.resumeAll();
        // No necesitamos resumeAll tweens si no pausamos la escena globalmente, 
        // pero es buena práctica por si acaso.
        this.scene.tweens.resumeAll();

        if (this.scene.countdown) {
            this.scene.countdown.resume();
        }

        if (this.scene.conductor && this.songAudio && this.songAudio.inst) {
            this.scene.conductor.updateFromSong(this.songAudio.inst.seek * 1000);
        }

        console.log("[Pause] Juego Reanudado");
    }

    restartGame() {
        this.cleanupPauseState();
        this.scene.tweens.resumeAll();
        this.scene.anims.resumeAll();
        this.scene.sound.stopAll();
        this.scene.scene.restart(this.scene.initData);
    }

    exitToMenu() {
        this.cleanupPauseState();
        this.scene.tweens.resumeAll();
        this.scene.anims.resumeAll();
        if (this.scene.countdown) {
            this.scene.countdown.resume();
        }
        this.scene.sound.stopAll();
        this.scene.exitToMenu();
    }

    cleanupPauseState() {
        this.isPaused = false;
        this.container.setVisible(false);
        this.stopBottomMetaCycle();

        if (this.pauseMusic) {
            this.scene.tweens.killTweensOf(this.pauseMusic);
            this.pauseMusic.stop();
            this.pauseMusic.destroy();
            this.pauseMusic = null;
        }
    }

    destroy() {
        this.cleanupPauseState();
        if (this.container) this.container.destroy();
        if (this.enterKey) this.scene.input.keyboard.removeKey(this.enterKey);
        if (this.upKey) this.scene.input.keyboard.removeKey(this.upKey);
        if (this.downKey) this.scene.input.keyboard.removeKey(this.downKey);
    }
}