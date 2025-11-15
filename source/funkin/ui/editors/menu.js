class EditorsState extends Phaser.Scene {
    constructor() {
        super({ key: 'EditorsState' });
        this.selectedIndex = 0;
        this.bgMusic = null;
        this.enterCooldown = false;
        this.backspaceCooldown = false;

        // 1. Definimos la configuración de los editores de forma explícita
        // Esto mapea un índice a una clave de escena. Es la solución robusta.
        this.editorConfig = [
            {
                key: 'CharacterEditorState', // La escena para el índice 0
                image: 'characterEditor',
            },
            {
                key: 'StageEditorState', // La escena para el índice 1
                image: 'stageEditor',
            }
        ];

        this.editorOptions = []; // El array de imágenes se llenará en create()
    }

    preload() {
        this.load.image('editorsBackground', 'public/images/menu/bg/menuBGBlue.png');
        this.load.image('characterEditor', 'public/images/menu/editors/characterEditor.png');
        this.load.image('stageEditor', 'public/images/menu/editors/stageEditor.png');
        
        this.load.audio('selectSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.load.audio('editorsMusic', 'public/music/chartEditorLoop.ogg');
        this.load.audio('menuMusic', 'public/music/FreakyMenu.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // Gestión de la música (sin cambios)
        const existingEminent = this.sound.get('editorsMusic');
        if (!existingEminent || !existingEminent.isPlaying) {
            this.sound.stopAll();
            this.bgMusic = this.sound.add('editorsMusic');
            this.bgMusic.play({ volume: 0, loop: true });
            this.tweens.add({
                targets: this.bgMusic,
                volume: 1,
                duration: 1000,
                ease: 'Linear'
            });
        } else {
            this.bgMusic = existingEminent;
        }

        // Fondo y Título (sin cambios)
        this.bg = this.add.image(width / 2, height / 2, 'editorsBackground')
            .setOrigin(0.5)
            .setScale(1.2);

        this.add.text(width / 2, 50, 'EDITORS MENU', {
            fontSize: '32px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        // --- CREACIÓN DE OPCIONES (MODIFICADO) ---
        // Usamos la configuración para crear las imágenes dinámicamente
        
        // Posiciones para las opciones (puedes ajustarlas)
        const optionPositions = [
            { x: width * 0.3, y: height * 0.5 }, // Posición para el índice 0
            { x: width * 0.7, y: height * 0.5 }  // Posición para el índice 1
        ];

        this.editorOptions = this.editorConfig.map((config, index) => {
            const pos = optionPositions[index];
            return this.add.image(pos.x, pos.y, config.image)
                .setOrigin(0.5)
                .setScale(0.8);
        });

        // Sonidos (sin cambios)
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');

        // Input handlers (sin cambios)
        this.input.keyboard.on('keydown-LEFT', () => this.changeSelection(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this.changeSelection(1));
        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.enterCooldown) {
                this.enterCooldown = true;
                this.confirmSelection();
                // El cooldown ahora se gestiona dentro de confirmSelection
            }
        });
        this.input.keyboard.on('keydown-BACKSPACE', () => {
            if (!this.backspaceCooldown) {
                this.backspaceCooldown = true;
                this.returnToMainMenu();
            }
        });

        // Resetear el cooldown
        this.backspaceCooldown = false;
        this.enterCooldown = false;
        
        // Actualizar selección inicial
        this.updateSelection();
    }

    changeSelection(direction) {
        this.selectSound.play();
        this.selectedIndex = (this.selectedIndex + direction + this.editorOptions.length) % this.editorOptions.length;
        this.updateSelection();
    }

    updateSelection() {
        this.editorOptions.forEach((option, index) => {
            // Aplicamos un tinte grisáceo en lugar de alfa para mejor visibilidad
            const tint = (index === this.selectedIndex) ? 0xFFFFFF : 0x888888;
            option.setTint(tint);
            
            // Animación suave de escala
            this.tweens.add({
                targets: option,
                scale: (index === this.selectedIndex) ? 0.85 : 0.8,
                duration: 150,
                ease: 'Quad.easeOut'
            });
        });
    }

    // --- FUNCIÓN 'confirmSelection' (RECONSTRUIDA) ---
    // Esta es la versión robusta y legible
    confirmSelection() {
        
        // 1. Obtener la clave de escena directamente desde nuestra configuración
        const targetSceneKey = this.editorConfig[this.selectedIndex].key;
        
        console.log(`Selección de índice: ${this.selectedIndex}`);
        console.log(`Escena objetivo: ${targetSceneKey}`);

        // 2. Verificar que la escena SÍ exista en el registro de Phaser
        // Usamos 'game.scene.keys' para verificar escenas registradas (no solo activas)
        if (!this.game.scene.keys[targetSceneKey]) {
            console.error(`¡Error! La escena '${targetSceneKey}' no está registrada.`);
            console.log("Escenas registradas:", Object.keys(this.game.scene.keys).join(", "));
            
            // Liberamos el cooldown para que el usuario pueda intentarlo de nuevo
            this.time.delayedCall(500, () => {
                this.enterCooldown = false;
            });
            return;
        }

        // 3. Efectos visuales y de sonido (sin cambios)
        this.confirmSound.play();
        const selectedImage = this.editorOptions[this.selectedIndex];

        const blinkEvent = this.time.addEvent({
            delay: 90,
            repeat: 24,
            callback: () => {
                selectedImage.visible = !selectedImage.visible;
            }
        });

        // 4. Transición
        this.time.delayedCall(1700, () => {
            blinkEvent.remove();
            selectedImage.visible = true;
            this.enterCooldown = false; // Liberamos el cooldown

            const transition = this.scene.get('TransitionScene');
            if (transition?.startTransition) {
                transition.startTransition(targetSceneKey); // Usamos la clave correcta
            } else {
                console.warn("TransitionScene no disponible, iniciando directamente.");
                this.scene.start(targetSceneKey); // Usamos la clave correcta
            }
        });
    }

    returnToMainMenu() {
        // Fade out de la música actual
        this.tweens.add({
            targets: this.bgMusic,
            volume: 0,
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                this.bgMusic.stop();
                
                // Iniciar música del menú
                const menuMusic = this.sound.add('menuMusic');
                menuMusic.play({
                    volume: 0,
                    loop: true
                });

                // Fade in de la música del menú
                this.tweens.add({
                    targets: menuMusic,
                    volume: 1,
                    duration: 1500,
                    ease: 'Linear',
                });

                // Cambiar de escena
                try {
                    this.scene.get('TransitionScene').startTransition('MainMenuState');
                } catch (e) {
                    console.warn("TransitionScene no disponible, cambiando directamente.", e);
                    this.scene.start('MainMenuState');
                }

                // Aseguramos que el cooldown se libere
                this.backspaceCooldown = false;
            }
        });
    }
}

// No olvides registrar tu escena
game.scene.add('EditorsState', EditorsState);