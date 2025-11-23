import { UI } from './UI.js';
class RoomsScene extends Phaser.Scene {

    constructor() {
        super({ key: 'RoomsScene' });
        this.uiPanel = null;
        this.confirmSound = null; // <- Faltaba esto
    }

    preload() {
        // Carga la imagen de fondo.
        this.load.image('menuBackground', 'public/images/menu/bg/menuBG.png');

        // Carga el sonido de "cancelar"
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');

        // --- AÑADIDO ---
        // Carga el sonido de "confirmar" para el botón
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        // --- FIN DE AÑADIDO ---
    }

    create() {
        const { width, height } = this.cameras.main;

        // Añade la imagen de fondo
        const bg = this.add.image(width / 2, height / 2, 'menuBackground');
        
        // Escala la imagen para que llene toda la pantalla
        bg.setDisplaySize(width, height);

        // --- MODIFICADO ---
        // Crea la instancia de la UI y le pasa la función de callback
        // this.uiPanel = new UI(this); // <- Tu versión
        this.uiPanel = new UI(this, () => this.startPlayState()); // <- Versión corregida
        // --- FIN DE MODIFICADO ---

        // Prepara el sonido de "cancelar"
        this.cancelSound = this.sound.add('cancelSound');

        // --- AÑADIDO ---
        // Prepara el sonido de "confirmar"
        this.confirmSound = this.sound.add('confirmSound');
        // --- FIN DE AÑADIDO ---

        // Configura la tecla BACKSPACE para regresar
        this.backKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);

        this.backKey.on('down', this.goBack, this);
        

        // Fade-in de la cámara para una entrada suave
        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    goBack() {
        // Evita que se active múltiples veces si la transición ya está en curso
        if (this.cameras.main.fadeEffect.isRunning) {
            return;
        }

        // Reproduce el sonido de "cancelar"
        this.cancelSound.play();
        
        // Inicia un fade-out
        this.cameras.main.fadeOut(500, 0, 0, 0);

        // Cuando el fade-out termine, cambia a la escena del menú principal
        this.cameras.main.once('camerafadeoutcomplete', () => {
             this.scene.start('MainMenuState');
        });
    }

    /**
     * --- FUNCIÓN QUE FALTABA ---
     * Se llama al hacer clic en "Create Room" desde la UI.
     */
    startPlayState() {
        // Evita doble clic si la transición ya está en curso
        if (this.cameras.main.fadeEffect.isRunning) {
            return;
        }

        // Sonido de confirmación
        this.confirmSound.play();

        // Inicia un fade-out
        this.cameras.main.fadeOut(500, 0, 0, 0);

        // Cuando termine el fade-out, cambia a PlayState con datos por defecto
        this.cameras.main.once('camerafadeoutcomplete', () => {
            
            // Datos por defecto para PlayState
            const defaultPlayData = {
                targetSongId: 'Bopeebo',
                DifficultyID: 'normal',
                isStoryMode: false 
            };
            
             // ¡Aquí es donde se inicia el PlayState!
             this.scene.start('PlayState', defaultPlayData);
        });
    }


    shutdown() {
        // Destruye el panel de la UI para limpiar los gráficos
        if (this.uiPanel) {
            this.uiPanel.destroy();
            this.uiPanel = null;
        }

        // Limpia el listener de la tecla para evitar fugas de memoria
        if (this.backKey) {
            this.backKey.off('down', this.goBack, this);
            this.backKey.destroy(); 
            this.backKey = null;
        }
        
        // Detiene el sonido si se estaba reproduciendo
        this.cancelSound?.stop();

        // --- AÑADIDO ---
        // Detiene el sonido de confirmación
        this.confirmSound?.stop();
        // --- FIN DE AÑADIDO ---
    }
}

// Añade la nueva escena al juego.
if (window.game) {
    window.game.scene.add("RoomsScene", RoomsScene);
} else {
    console.error("No se pudo añadir 'RoomsScene' porque la variable 'game' no está definida globalmente.");
}