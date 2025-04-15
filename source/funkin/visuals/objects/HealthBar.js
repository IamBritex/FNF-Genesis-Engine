export class HealthBar {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.health = 1; // 1 = 50% health (centro)
        this.minHealth = 0; // Puede llegar a 0 (sin vida)
        this.maxHealth = 2; // Puede llegar al doble de vida (100%)
        
        this.config = {
            position: {
                x: this.scene.cameras.main.width / 2,
                y: this.scene.cameras.main.height - 70
            },
            scale: 1.2,
            colors: {
                // Usar el color recibido solo si es un número válido
                p1: typeof options.p1Color === 'number' && !isNaN(options.p1Color) ? 
                    options.p1Color : 0x00FF00,
                p2: typeof options.p2Color === 'number' && !isNaN(options.p2Color) ? 
                    options.p2Color : 0xFF0000
            },
            icons: {
                p1: options.p1Icon || 'face',
                p2: options.p2Icon || 'face'
            }
        };

        this.init();
    }

    init() {
        this.container = this.scene.add.container(this.config.position.x, this.config.position.y);
        
        // Crear la barra de fondo
        this.backgroundBar = this.scene.add.image(0, 0, 'healthBar');
        this.backgroundBar.setScale(this.config.scale);
        this.backgroundBar.setOrigin(0.5);
        
        // Crear las barras de salud
        this.createHealthBars();
        
        // Crear los iconos
        this.createIcons();
        
        // Añadir todo al contenedor en el orden correcto
        this.container.add([
            this.p1HealthBar, 
            this.p2HealthBar, 
            this.backgroundBar,
            this.p1Icon,
            this.p2Icon
        ]);
        
        this.container.setDepth(90);
        this.updateBar();
    }

    createHealthBars() {
        const width = this.backgroundBar.width * this.config.scale;
        const height = this.backgroundBar.height * this.config.scale;
        
        this.p1HealthBar = this.scene.add.graphics();
        this.p2HealthBar = this.scene.add.graphics();
        
        // Posicionar las barras correctamente
        this.p1HealthBar.x = -width/2; // Verde a la izquierda
        this.p2HealthBar.x = -width/2; // Rojo empieza desde el mismo punto
        
        this.p1HealthBar.y = -height/2;
        this.p2HealthBar.y = -height/2;
        
        this.drawHealthBars(width, height);
    }

    createIcons() {
        const width = this.backgroundBar.width * this.config.scale;
        
        // Verificar que las texturas existan antes de crear los iconos
        const p1IconKey = `icon-${this.config.icons.p1}`;
        const p2IconKey = `icon-${this.config.icons.p2}`;

        console.log('Creando iconos:', {
            p1Key: p1IconKey,
            p2Key: p2IconKey,
            p1Exists: this.scene.textures.exists(p1IconKey),
            p2Exists: this.scene.textures.exists(p2IconKey)
        });

        if (this.scene.textures.exists(p1IconKey)) {
            // Crear icono del jugador 1 (derecha)
            this.p1Icon = this.scene.add.image(
                width/2 - 25, 
                0, 
                p1IconKey
            );
            this.p1Icon.setOrigin(0.5);
            this.p1Icon.setScale(0.5);
        } else {
            console.error(`Texture not found: ${p1IconKey}`);
        }
        
        if (this.scene.textures.exists(p2IconKey)) {
            // Crear icono del jugador 2 (izquierda)
            this.p2Icon = this.scene.add.image(
                -width/2 + 25, 
                0, 
                p2IconKey
            );
            this.p2Icon.setOrigin(0.5);
            this.p2Icon.setScale(0.5);
        } else {
            console.error(`Texture not found: ${p2IconKey}`);
        }
    }

    drawHealthBars(width, height) {
        this.p1HealthBar.clear();
        this.p2HealthBar.clear();
        
        const halfWidth = width/2;
        
        // Dibujar barra verde (jugador) desde la derecha
        this.p1HealthBar.fillStyle(this.config.colors.p1);
        this.p1HealthBar.fillRect(0, 0, halfWidth, height);
        
        // Dibujar barra roja (enemigo) desde la izquierda
        this.p2HealthBar.fillStyle(this.config.colors.p2);
        this.p2HealthBar.fillRect(0, 0, halfWidth, height);
    }

    updateBar() {
        const width = this.backgroundBar.width * this.config.scale;
        const height = this.backgroundBar.height * this.config.scale;
        const totalWidth = width;
        
        this.p1HealthBar.clear();
        this.p2HealthBar.clear();
        
        // Limitar el porcentaje de salud entre 0 y 2 (0% a 100% del ancho total)
        const healthPercent = Phaser.Math.Clamp(this.health, 0, 2);
        
        const halfWidth = totalWidth / 2;
        const greenWidth = halfWidth * healthPercent;
        
        // Limitar el ancho verde al ancho total de la barra
        const limitedGreenWidth = Math.min(greenWidth, totalWidth);
        
        // Dibujar barra verde (jugador) - comienza desde la derecha y crece hacia la izquierda
        this.p1HealthBar.fillStyle(this.config.colors.p1);
        this.p1HealthBar.fillRect(totalWidth - limitedGreenWidth, 0, limitedGreenWidth, height);
        
        // Dibujar barra roja (enemigo) - lado izquierdo
        this.p2HealthBar.fillStyle(this.config.colors.p2);
        this.p2HealthBar.fillRect(0, 0, totalWidth - limitedGreenWidth, height);

        // Actualizar posición de los iconos basado en la salud
        const iconOffset = 25;
        
        // Mover los iconos basado en la salud
        this.p1Icon.x = totalWidth/2 - iconOffset - (1 - healthPercent) * 100;
        this.p2Icon.x = -totalWidth/2 + iconOffset + (1 - healthPercent) * 100;
        
        // Animar los iconos basado en la salud
        if (healthPercent < 0.2) {
            this.p1Icon.setScale(0.55);
            this.p2Icon.setScale(0.45);
        } else if (healthPercent > 1.8) {
            this.p1Icon.setScale(0.45);
            this.p2Icon.setScale(0.55);
        } else {
            this.p1Icon.setScale(0.5);
            this.p2Icon.setScale(0.5);
        }
    }

    setHealth(value) {
        // Limitamos el valor entre 0 y 2 para evitar que se salga de la imagen
        this.health = Phaser.Math.Clamp(value, 0, 2);
        this.updateBar();
    }

    // Modificamos la lógica de daño y curación para que coincida con FNF
    damage(amount) {
        // Al recibir daño, la barra verde se reduce hacia la derecha
        this.setHealth(this.health - amount);
    }

    heal(amount) {
        // Al curarse, la barra verde crece hacia la izquierda
        this.setHealth(this.health + amount);
    }

    destroy() {
        this.container.destroy();
    }
}