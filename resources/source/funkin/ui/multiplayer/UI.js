/**
 * Clase base para la interfaz de usuario de las salas multijugador.
 * Crea un panel de fondo semi-transparente.
 */
export class UI {

    /**
     * @param {Phaser.Scene} scene La escena a la que se añadirá esta UI.
     * @param {function} [onCreateRoomClick] Callback que se ejecuta al presionar "Create Room".
     */
    constructor(scene, onCreateRoomClick = null) {
        this.scene = scene;
        this.graphics = null; // Aquí dibujaremos el panel
        this.onCreateRoomClick = onCreateRoomClick;
        this.createRoomButton = null;

        this.createMainPanel();
        this.createButtons(); // <- Añadido
    }

    /**
     * Crea el panel gráfico principal.
     */
    createMainPanel() {
        const { width, height } = this.scene.cameras.main;

        // Definimos un padding para que no ocupe *toda* la ventana
        const padding = 50;
        const panelWidth = width - (padding * 2);
        const panelHeight = height - (padding * 2);
        const panelX = padding;
        const panelY = padding;
        const borderRadius = 10; // Bordes redondeados
        
        // --- MODIFICADO ---
        // Se eliminó borderWidth

        // Color de relleno: negro semi-transparente
        const fillColor = 0x000000;
        const fillAlpha = 0.7;

        // --- ELIMINADO ---
        // const strokeColor = 0xffffff;
        // const strokeAlpha = 1.0;

        // Creamos el objeto gráfico
        this.graphics = this.scene.add.graphics();

        // Dibujamos el relleno
        this.graphics.fillStyle(fillColor, fillAlpha);
        this.graphics.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, borderRadius);

        // --- ELIMINADO ---
        // Dibujamos el borde
        // this.graphics.lineStyle(borderWidth, strokeColor, strokeAlpha);
        // this.graphics.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, borderRadius);
        
        // Nota: El efecto "blur" (desenfoque de fondo) requeriría un shader
        // o pipeline personalizado en Phaser. Esto es un panel semi-transparente.
    }

    /**
     * Crea los botones interactivos de la UI.
     */
    createButtons() {
        const { width, height } = this.scene.cameras.main;

        // --- Configuración del Botón "Create Room" ---
        const btnWidth = 300;
        const btnHeight = 60;
        const btnX = width / 2;
        const btnY = height / 2 - 100; // Un poco arriba del centro
        const btnRadius = 10;
        
        const btnColor = 0x5D3FD3; // Un color morado
        const btnColorHover = 0x7A5DF3; // Un morado más claro

        // Gráfico para el fondo del botón
        const btnGraphics = this.scene.add.graphics();
        btnGraphics.fillStyle(btnColor, 1);
        btnGraphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, btnRadius);

        // Texto del botón
        const btnText = this.scene.add.text(0, 0, 'Create Room', {
            fontFamily: 'Arial', // Puedes cambiar esto por la fuente de tu juego
            fontSize: '28px',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        // Contenedor para el botón
        this.createRoomButton = this.scene.add.container(btnX, btnY, [btnGraphics, btnText]);
        this.createRoomButton.setSize(btnWidth, btnHeight);
        this.createRoomButton.setInteractive({ useHandCursor: true });

        // --- Eventos Interactivos ---

        this.createRoomButton.on('pointerover', () => {
            btnGraphics.clear();
            btnGraphics.fillStyle(btnColorHover, 1);
            btnGraphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, btnRadius);
        });

        this.createRoomButton.on('pointerout', () => {
            btnGraphics.clear();
            btnGraphics.fillStyle(btnColor, 1);
            btnGraphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, btnRadius);
        });

        this.createRoomButton.on('pointerdown', () => {
            // Ejecutar el callback si existe
            if (this.onCreateRoomClick) {
                this.onCreateRoomClick();
            }
        });
    }

    /**
     * Destruye los elementos gráficos de esta UI.
     */
    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }

        // --- AÑADIDO ---
        if (this.createRoomButton) {
            this.createRoomButton.destroy(); // Esto destruye el contenedor y sus hijos (gráficos y texto)
            this.createRoomButton = null;
        }
        // --- FIN DE AÑADIDO ---
    }
}