class EditorsState extends Phaser.Scene {
    constructor() {
        super({ key: 'EditorsState' });
        this.selectedIndex = 0;
        this.bgMusic = null;
    }

    preload() {
        this.load.image('editorsBackground', 'public/assets/images/menuBGBlue.png');
        this.load.image('characterEditor', 'public/assets/images/states/Editors/characterEditor.png');
        this.load.image('stageEditor', 'public/assets/images/states/Editors/stageEditor.png');
        
        // Cargar sonido de selección (opcional)
        this.load.audio('selectSound', 'public/assets/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/sounds/confirmMenu.ogg');

        // Cargar músicas
        this.load.audio('editorsMusic', 'public/assets/sounds/eminent.mp3');
        this.load.audio('menuMusic', 'public/assets/sounds/FreakyMenu.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // Check if eminent is already playing
        const existingEminent = this.sound.get('editorsMusic');
        if (!existingEminent || !existingEminent.isPlaying) {
            // Start music only if not playing
            // Detener todos los sonidos activos
            this.sound.stopAll();

            // Iniciar música con fade in
            this.bgMusic = this.sound.add('editorsMusic');
            this.bgMusic.play({
                volume: 0,
                loop: true
            });

            // Fade in de la música
            this.tweens.add({
                targets: this.bgMusic,
                volume: 1,
                duration: 1000, // 1 segundo de fade in
                ease: 'Linear'
            });
        } else {
            this.bgMusic = existingEminent;
        }

        // Añadir fondo
        this.bg = this.add.image(width / 2, height / 2, 'editorsBackground')
            .setOrigin(0.5)
            .setScale(1.2);

        // Añadir título
        this.add.text(width / 2, 50, 'EDITORS MENU', {
            fontSize: '32px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        // Crear opciones de editores
        this.editorOptions = [
            this.add.image(width * 0.3, height * 0.5, 'characterEditor'),
            this.add.image(width * 0.7, height * 0.5, 'stageEditor')
        ];

        // Configurar cada opción
        this.editorOptions.forEach((option, index) => {
            option.setOrigin(0.5);
            option.setScale(0.8); // Ajusta según necesites
        });

        // Texto de ayuda
        this.add.text(width / 2, height - 50, 'LEFT/RIGHT to select - ENTER to confirm - BACKSPACE to return', {
            fontSize: '20px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        // Sonidos
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');

        // Input handlers
        this.input.keyboard.on('keydown-LEFT', () => this.changeSelection(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this.changeSelection(1));
        this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
        this.input.keyboard.on('keydown-BACKSPACE', () => {
            // Fade out de la música actual
            this.tweens.add({
                targets: this.bgMusic,
                volume: 0,
                duration: 500, // 0.5 segundos de fade out
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
                        duration: 500,
                        ease: 'Linear'
                    });
                    // Cambiar de escena
                    this.scene.get('TransitionScene').startTransition('MainMenuState');
                }
            });
        });

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
            option.setAlpha(index === this.selectedIndex ? 1 : 0.5);
        });
    }

    confirmSelection() {
        this.confirmSound.play();
        const scenes = ['CharacterEditorState', 'StageEditorState'];
        const targetScene = scenes[this.selectedIndex];
        
        // Verificar si la escena existe
        if (!this.scene.get(targetScene)) {
            console.warn(`La escena ${targetScene} no existe`);
            return;
        }

        // Efecto de parpadeo antes de cambiar de escena
        let blinkCount = 0;
        const blinkEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                this.editorOptions[this.selectedIndex].visible = !this.editorOptions[this.selectedIndex].visible;
                blinkCount++;
                
                if (blinkCount >= 6) {
                    blinkEvent.remove();
                    this.editorOptions[this.selectedIndex].visible = true;
                    // Cambiar a la escena seleccionada usando TransitionScene
                    this.scene.get('TransitionScene').startTransition(targetScene);
                }
            },
            repeat: 5
        });
    }
}

game.scene.add('EditorsState', EditorsState);