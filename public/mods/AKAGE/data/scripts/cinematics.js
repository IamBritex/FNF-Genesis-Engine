export default class Cinematics {
    constructor(scene) {
        this.scene = scene;
        this.upperBar = null;
        this.lowerBar = null;
        this.uiContainer = null;
        this.initialized = false;
    }

    async init() {
        if (!this.scene || !this.scene.add) {
            console.error('Scene not properly initialized for Cinematics');
            return;
        }

        const gameWidth = this.scene.game.config.width;
        const gameHeight = this.scene.game.config.height;

        // Create container at world origin
        this.uiContainer = this.scene.add.container(0, 0);
        
        // Create bars with proper dimensions
        this.upperBar = this.scene.add.rectangle(
            0,              
            -350,          
            gameWidth,     
            350,          
            0xFFFFFF      
        );
        
        this.lowerBar = this.scene.add.rectangle(
            0,             
            gameHeight,    
            gameWidth,     
            350,          
            0xFFFFFF      
        );

        // Configure bars
        [this.upperBar, this.lowerBar].forEach(bar => {
            if (bar) {
                bar.setOrigin(0, 0);
                bar.setAlpha(1);
                bar.setScrollFactor(0);
                bar.setVisible(true);
                bar.setActive(true);
                // Set lower depth to be below flash
                bar.setDepth(-1);
            }
        });

        // Add to UI layer explicitly
        if (this.scene.cameraController) {
            this.scene.cameraController.addToUILayer(this.uiContainer);
            [this.upperBar, this.lowerBar].forEach(bar => {
                this.scene.cameraController.addToUILayer(bar);
            });
        }

        // Add bars to container and position container
        this.uiContainer.add([this.upperBar, this.lowerBar]);
        // Establecer un depth bajo para el container
        this.uiContainer.setDepth(-1);
        this.uiContainer.setVisible(true);
        this.uiContainer.setActive(true);
        
        // Manejar cámaras correctamente
        if (this.scene.cameraController) {
            // Primero añadimos al UI layer
            this.scene.cameraController.addToUILayer(this.uiContainer);
            
            // Asegurarnos de que las barras estén en la capa UI
            [this.upperBar, this.lowerBar].forEach(bar => {
                this.scene.cameraController.addToUILayer(bar);
            });
            
            // Solo ignoramos en la gameCamera
            if (this.scene.cameraController.gameCamera) {
                this.scene.cameraController.gameCamera.ignore(this.uiContainer);
            }
        }

        // Agregar un evento para mantener visible después del conteo
        this.scene.events.on('countdown-complete', this._ensureVisibility, this);
        this.scene.events.on('song-start', this._ensureVisibility, this);

        this.initialized = true;
        console.log('Cinematics initialized with visibility checks');
    }

    _ensureVisibility() {
        if (this.uiContainer) {
            this.uiContainer.setVisible(true);
            this.uiContainer.setActive(true);
            [this.upperBar, this.lowerBar].forEach(bar => {
                if (bar) {
                    bar.setVisible(true);
                    bar.setActive(true);
                }
            });
        }
    }

    async define(...inputs) {
        if (!this.initialized || !this.upperBar || !this.lowerBar) {
            console.warn('Cinematics not properly initialized');
            return;
        }

        // If no inputs, animate bars out but keep them usable
        if (!inputs || inputs.length === 0) {
            this.scene.tweens.add({
                targets: this.upperBar,
                y: -350,
                duration: 500,
                ease: 'Quad.In'
            });

            this.scene.tweens.add({
                targets: this.lowerBar,
                y: this.scene.game.config.height,
                duration: 500,
                ease: 'Quad.In'
            });
            return;
        }

        const [speed = 0.5, distance = 0, color = "#FFFFFF"] = inputs;

        // Convert hex color to Phaser color number
        const colorNum = Phaser.Display.Color.HexStringToColor(color).color;

        const targetY1 = -350 + Number(distance);
        const targetY2 = this.scene.game.config.height - Number(distance);
        
        // Stop any existing tweens
        this.scene.tweens.killTweensOf(this.upperBar);
        this.scene.tweens.killTweensOf(this.lowerBar);

        // Update color of both bars
        this.upperBar.setFillStyle(colorNum);
        this.lowerBar.setFillStyle(colorNum);

        if (distance > 0) {
            this.scene.tweens.add({
                targets: this.upperBar,
                y: targetY1,
                duration: speed * 1000,
                ease: 'Quad.Out'
            });
            
            this.scene.tweens.add({
                targets: this.lowerBar,
                y: targetY2,
                duration: speed * 1000,
                ease: 'Quad.Out'
            });
        } else {
            this.scene.tweens.add({
                targets: this.upperBar,
                y: -350,
                duration: speed * 1000,
                ease: 'Quad.In'
            });

            this.scene.tweens.add({
                targets: this.lowerBar,
                y: this.scene.game.config.height,
                duration: speed * 1000,
                ease: 'Quad.In'
            });
        }
    }

    cleanup() {
        // Remover el evento antes de limpiar
        this.scene.events.off('countdown-complete', this._ensureVisibility, this);
        this.scene.events.off('song-start', this._ensureVisibility, this);

        if (this.upperBar) {
            this.upperBar.destroy();
            this.upperBar = null;
        }
        if (this.lowerBar) {
            this.lowerBar.destroy();
            this.lowerBar = null;
        }
        if (this.uiContainer) {
            this.uiContainer.destroy();
            this.uiContainer = null;
        }
        this.initialized = false;
    }
}