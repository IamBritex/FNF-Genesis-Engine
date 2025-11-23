/**
 * Escena modal para el menú de editores.
 * Se lanza sobre 'MainMenuState' y utiliza elementos DOM para el fondo borroso y las opciones.
 */
class EditorsState extends Phaser.Scene {
    
    /**
     * @param {object} config - Configuración de la escena de Phaser.
     */
    constructor() {
        super({
            key: 'EditorsState',
            plugins: {
                dom: {
                    createContainer: true
                }
            }
        });

        this.selectedIndex = 0;
        this.bgMusic = null;
        this.enterCooldown = false;
        this.backspaceCooldown = false;
        this.canInteract = false;

        this.editorConfig = [
            {
                key: 'CharacterEditorState',
                image: 'characterEditor',
                path: 'public/images/menu/editors/characterEditor.png'
            },
            {
                key: 'StageEditor',
                image: 'stageEditor',
                path: 'public/images/menu/editors/stageEditor.png'
            },
            {
                key: "ChartEditor",
                image: "chartEditor",
                path: "public/images/menu/editors/chartEditor.png"    
            }
        ];

        /** @type {Phaser.GameObjects.DOMElement[]} */
        this.imageElements = [];
        
        /** @type {Phaser.GameObjects.DOMElement} */
        this.overlay = null;
    }

    preload() {
        this.load.audio('selectSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        // this.load.audio('editorsMusic', 'public/music/chartEditorLoop.ogg');
        // this.load.audio('menuMusic', 'public/music/FreakyMenu.mp3');
    }

    create() {
        const { width, height } = this.scale;
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');

        this.setupDOMOverlay(width, height);
        
        this.input.keyboard.on('keydown-LEFT', () => this.changeSelection(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this.changeSelection(1));
        this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
        this.input.keyboard.on('keydown-BACKSPACE', () => this.returnToMainMenu());

        this.backspaceCooldown = false;
        this.enterCooldown = false;
        this.canInteract = false;
    }

    /**
     * Configura la transición de audio de entrada.
     * Hace fade-out de la música del menú y fade-in de la música de los editores.
     */
    setupAudioEntry() {
        // No se maneja audio en esta escena.
    }

    /**
     * Crea el overlay del DOM con fondo borroso y tamaño fijo 720p.
     * @param {number} width - Ancho de la pantalla (para centrar).
     * @param {number} height - Alto de la pantalla (para centrar).
     */
    setupDOMOverlay(width, height) {
        /**
         * Este es el CSS que aplica el blur.
         * 'backdrop-filter' SOLO funciona si la escena de detrás
         * (MainMenuState) sigue visible (no pausada).
         */
        const overlayHTML = `
            <div id="editors-overlay" style="width: 1280px; height: 720px;">
            </div>
        `;
        
        this.overlay = this.add.dom(width / 2, height / 2);
        this.overlay.createFromHTML(overlayHTML);
        this.overlay.setAlpha(0);

        // Aplicamos el desenfoque y el fondo oscuro directamente al contenedor del DOMElement
        this.overlay.node.style.width = '1280px';
        this.overlay.node.style.height = '720px';
        this.overlay.node.style.backgroundColor = 'rgba(0,0,0,0.3)';
        this.overlay.node.style.backdropFilter = 'blur(8px)';
        this.overlay.node.style.webkitBackdropFilter = 'blur(8px)';

        this.tweens.add({
            targets: this.overlay,
            alpha: 1,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
                this.createEditorImages();
            }
        });
    }

    /**
     * Crea las imágenes del editor como elementos DOM y las anima.
     * Se llama después de que el overlay DOM haya aparecido.
     */
    createEditorImages() {
        const { width, height } = this.scale;
        const center_x = width / 2;
        
        // Mover las imágenes más arriba (0.45 en lugar de 0.5)
        const center_y = height / 2; 
        
        const side_offset = width * 0.35;

        this.imageElements = this.editorConfig.map((config, index) => {
            const isSelected = (index === this.selectedIndex);
            const targetX = center_x + (index - this.selectedIndex) * side_offset;
            const targetScale = isSelected ? 0.85 : 0.6;

            // --- [INICIO DE LA CORRECCIÓN DEFINITIVA] ---
            // El método setOrigin(0.5) en un elemento DOM de Phaser solo centra el contenedor, no su contenido.
            // Para centrar la imagen DENTRO del contenedor, usamos una combinación de posicionamiento
            // absoluto y una transformación CSS. Esto simula un origen de (0.5, 0.5) para la imagen.
            const html = `<img src="${config.path}" 
                               style="position: absolute; 
                                      left: 50%; top: 50%; 
                                      transform: translate(-50%, -50%); 
                                      pointer-events: none;">`;
            const imgElement = this.add.dom(targetX, center_y).createFromHTML(html);
            // --- [FIN DE LA CORRECCIÓN DEFINITIVA] ---
            
            imgElement.setAlpha(0);
            imgElement.setScale(targetScale);
            imgElement.setOrigin(0.5);

            return imgElement;
        });

        this.tweens.add({
            targets: this.imageElements,
            alpha: 1,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
                this.canInteract = true;
            }
        });
    }

    /**
     * Maneja el cambio de selección con las teclas Izquierda/Derecha.
     * @param {number} direction - -1 para izquierda, 1 para derecha.
     */
    changeSelection(direction) {
        if (!this.canInteract) return;

        this.selectSound.play();
        this.selectedIndex = (this.selectedIndex + direction + this.imageElements.length) % this.imageElements.length;
        this.updateSelection();
    }

    /**
     * Actualiza visualmente las opciones (posición y escala) con una animación suave (tween).
     */
    updateSelection() {
        const { width } = this.scale;
        const center_x = width / 2;
        const side_offset = width * 0.35;


        this.imageElements.forEach((imgElement, index) => {
            const isSelected = (index === this.selectedIndex);
            const targetX = center_x + (index - this.selectedIndex) * side_offset;
            const targetScale = isSelected ? 0.85 : 0.6;

            this.tweens.add({
                targets: imgElement,
                x: targetX,
                scale: targetScale,
                duration: 300,
                ease: 'Quad.easeOut'
            });
        });
    }

    /**
     * Confirma la selección actual, transicionando a la escena del editor elegido.
     */
    confirmSelection() {
        if (!this.canInteract || this.enterCooldown) return;
        this.confirmSound.play();

        this.canInteract = false;
        this.enterCooldown = true;
        
        const targetSceneKey = this.editorConfig[this.selectedIndex].key;
        
        if (!this.game.scene.keys[targetSceneKey]) {
            console.error(`¡Error! La escena '${targetSceneKey}' no está registrada.`);
            this.canInteract = true;
            this.enterCooldown = false;
            return;
        }

        this.tweens.add({
            targets: [this.overlay, ...this.imageElements],
            alpha: 0,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
                this.cleanupDOMElements();
                // Detener la escena de fondo (MainMenu) antes de cambiar
                this.scene.stop('MainMenuState');

                const transition = this.scene.get('TransitionScene');
                if (transition?.startTransition) {
                    transition.startTransition(targetSceneKey);
                } else {
                    console.warn("TransitionScene no disponible, iniciando directamente.");
                    this.scene.start(targetSceneKey);
                }
                
                // Detener esta escena modal
                this.scene.stop('EditorsState');
            }
        });
    }

    /**
     * Regresa al menú principal, cerrando este modal.
     */
    returnToMainMenu() {
        if (!this.canInteract || this.backspaceCooldown) return;

        this.canInteract = false;
        this.backspaceCooldown = true;

        this.tweens.add({
            targets: [this.overlay, ...this.imageElements],
            alpha: 0,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
                this.cleanupDOMElements();
                
                // En lugar de reanudar, le devolvemos la interactividad
                const mainMenu = this.scene.get('MainMenuState');
                if (mainMenu) {
                    mainMenu.canInteract = true;
                }
                
                // Detener esta escena modal
                this.scene.stop('EditorsState');
            }
        });
    }

    /**
     * Configura la transición de audio de salida.
     * Hace fade-out de la música de editores y fade-in de la música del menú.
     */
    setupAudioExit() {
        // No se maneja audio en esta escena.
    }

    /**
     * Destruye y limpia todos los elementos DOM creados por esta escena.
     */
    cleanupDOMElements() {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        if (this.imageElements.length > 0) {
            this.imageElements.forEach(img => img.destroy());
        }
        this.imageElements = [];
    }
}

game.scene.add('EditorsState', EditorsState);