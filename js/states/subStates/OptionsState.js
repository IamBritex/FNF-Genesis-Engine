import { createMenuOption } from './utils.js';
import { setupKeyboardControls } from './keyboardHandler.js';

class OptionsMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsMenu' });
        this.selectedCategory = 0;
        this.selectedOption = 0;
        this.categories = []; // Inicialmente vacío, se llenará con fetch
        this.currentOptionsDisplayed = []; // Inicialmente vacío
        this.optionTexts = [];
    }

    preload() {
        this.load.image('menuBgMagenta', 'assets/images/menuBGMagenta.png');
        this.load.image('fnfLogo', 'assets/images/newgrounds.svg');
        this.load.audio('scrollSound', 'assets/sounds/scrollMenu.ogg');
        this.load.audio('selectSound', 'assets/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'assets/sounds/cancelMenu.ogg');
        this.load.audio('menuMusic', 'assets/music/freakyMenuOptions.mp3');
    }

    async create() {
        // Cargar el archivo JSON
        try {
            const response = await fetch('js/states/subStates/optionsConfig.json');
            if (!response.ok) {
                throw new Error('No se pudo cargar el archivo JSON');
            }
            const data = await response.json();
            this.categories = data.categories; // Asignar las categorías cargadas
            console.log('JSON cargado correctamente:', this.categories); // Verificar en consola

            // Inicializar las opciones actuales después de cargar el JSON
            this.currentOptionsDisplayed = this.categories[this.selectedCategory].options;
        } catch (error) {
            console.error('Error al cargar el archivo JSON:', error);
        }

        // Configurar el fondo
        this.add.image(0, 0, 'menuBgMagenta')
            .setOrigin(0, 0)
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Crear el panel izquierdo después de cargar el JSON
        this.createLeftPanel();
        this.createRightPanel();

        this.sound.stopAll();
        this.menuMusic = this.sound.add('menuMusic', { loop: true, volume: 0.6 });
        this.menuMusic.play();

        setupKeyboardControls(this);
        this.updateSelection();
    }

    createLeftPanel() {
        const leftPanel = this.add.rectangle(
            this.cameras.main.width * 0.25,
            this.cameras.main.height / 2,
            this.cameras.main.width * 0.45,
            this.cameras.main.height * 0.9,
            0x000000,
            0.7
        );

        const optionsTitle = this.add.text(
            leftPanel.x,
            leftPanel.y - leftPanel.height / 2 + 70,
            'OPTIONS',
            {
                fontFamily: 'Impact',
                fontSize: '72px',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 8,
                align: 'center'
            }
        ).setOrigin(0.5);

        const startY = optionsTitle.y + optionsTitle.height + 80;
        for (let i = 0; i < this.currentOptionsDisplayed.length; i++) {
            const option = this.currentOptionsDisplayed[i];
            const optionText = createMenuOption(this, leftPanel.x - leftPanel.width / 2 + 50, startY + i * 45, option, i === this.selectedOption);
            this.optionTexts.push(optionText);
        }
    }

    createRightPanel() {
        const rightPanel = this.add.rectangle(
            this.cameras.main.width * 0.75,
            this.cameras.main.height / 2,
            this.cameras.main.width * 0.45,
            this.cameras.main.height * 0.9,
            0x000000,
            0.7
        );

        this.fnfLogo = this.add.image(rightPanel.x, rightPanel.y - 50, 'fnfLogo').setScale(0.8);

        // Verificar que currentOptionsDisplayed esté inicializado
        if (this.currentOptionsDisplayed.length > 0) {
            this.descriptionText = this.add.text(
                rightPanel.x,
                rightPanel.y + rightPanel.height / 2 - 100,
                this.currentOptionsDisplayed[this.selectedOption].description, // Mostrar la descripción de la opción seleccionada
                {
                    fontFamily: 'Arial',
                    fontSize: '24px',
                    color: '#FFFFFF',
                    align: 'center',
                    wordWrap: { width: rightPanel.width - 60 }
                }
            ).setOrigin(0.5);
        } else {
            console.error('No hay opciones disponibles para mostrar.');
        }
    }

    moveSelection(direction) {
        this.selectedOption = Phaser.Math.Wrap(
            this.selectedOption + direction,
            0,
            this.currentOptionsDisplayed.length
        );
        this.updateSelection();
    }

    selectOption() {
        const selectedOption = this.currentOptionsDisplayed[this.selectedOption];
        this.descriptionText.setText(selectedOption.description);
    }

    exitOptionsMenu() {
        this.menuMusic.stop();
        this.scene.get("TransitionScene").startTransition('MainMenuState');
    }

    updateSelection() {
        this.optionTexts.forEach((textPair, index) => {
            const isSelected = index === this.selectedOption;
            textPair.option.setColor(isSelected ? '#FFFF00' : '#FFFFFF');
            textPair.option.setStroke(isSelected ? '#000000' : null, isSelected ? 4 : 0);
            if (textPair.value) {
                textPair.value.setColor(isSelected ? '#FFFF00' : '#BBBBBB');
            }
        });

        // Actualizar la descripción en el panel derecho
        if (this.currentOptionsDisplayed.length > 0) {
            const selectedOption = this.currentOptionsDisplayed[this.selectedOption];
            this.descriptionText.setText(selectedOption.description);
        }
    }

    update() {
        if (this.fnfLogo) {
            this.fnfLogo.angle = Math.sin(this.time.now / 2000) * 2;
            this.fnfLogo.scaleX = 0.8 + Math.sin(this.time.now / 1000) * 0.02;
            this.fnfLogo.scaleY = 0.8 + Math.sin(this.time.now / 1000) * 0.02;
        }
    }
}

game.scene.add('OptionsMenu', OptionsMenu);