/**
 * Crea y añade una textura de tablero de ajedrez a la escena.
 * Modificado para soportar colores dinámicos y mayor tamaño.
 * @param {Phaser.Scene} scene La escena de Phaser.
 * @param {number} color1 Color hexadecimal (0x...) para el cuadro 1.
 * @param {number} color2 Color hexadecimal (0x...) para el cuadro 2.
 */
export function createCheckerboardTexture(scene, color1 = 0xcccccc, color2 = 0xffffff) {
    const key = 'checkerboard-texture';
    
    // Si ya existe, la destruimos para recrearla con los nuevos colores
    if (scene.textures.exists(key)) {
        scene.textures.remove(key);
    }

    const tileSize = 50; 
    let g = scene.make.graphics({ add: false });
    
    // Color base (Fondo completo del tile)
    g.fillStyle(color1);
    g.fillRect(0, 0, tileSize * 2, tileSize * 2);
    
    // Color secundario (Cuadros alternos)
    g.fillStyle(color2);
    g.fillRect(0, 0, tileSize, tileSize);
    g.fillRect(tileSize, tileSize, tileSize, tileSize);
    
    g.generateTexture(key, tileSize * 2, tileSize * 2);
    g.destroy();
}

/**
 * Helper para actualizar el fondo del StageEditor basado en la configuración.
 */
export function updateStageBackground(scene, themeConfig) {
    const { backgroundType, mode, customColor } = themeConfig;
    
    let col1, col2;
    let hexCustom = parseInt(customColor.replace('#', ''), 16);

    // Definir colores según el modo
    if (mode === 'Light') {
        col1 = 0xe0e0e0;
        col2 = 0xffffff;
    } else if (mode === 'Dark') {
        col1 = 0x444444; // Más oscuro
        col2 = 0x666666;
    } else { // Custom
        col1 = hexCustom;
        // Calcular un color ligeramente más claro u oscuro para el contraste
        // Algoritmo simple de aclarado
        col2 = Phaser.Display.Color.IntegerToColor(col1);
        col2.lighten(20); // Aclara un 20%
        col2 = col2.color; 
    }

    // 1. Manejar Textura Checkerboard
    if (backgroundType === 'Checkerboard') {
        createCheckerboardTexture(scene, col1, col2);
        
        if (!scene.bgCheckerboard) {
            // Ampliado a 16000 para cubrir más a la derecha como pediste
            scene.bgCheckerboard = scene.add.tileSprite(0, 0, 16000, 8000, 'checkerboard-texture');
            scene.bgCheckerboard.setOrigin(0.5, 0.5);
            scene.bgCheckerboard.setDepth(-100); // Muy al fondo
            
            // Si usas cameraManager en tu escena
            if (scene.cameraManager) {
                scene.cameraManager.assignToGame(scene.bgCheckerboard);
            }
            
            scene.bgCheckerboard.setInteractive().on('pointerdown', (pointer) => {
                if (pointer.leftButtonDown() && scene.elementsManager) {
                    scene.elementsManager.clearSelection();
                }
            });
        } else {
            scene.bgCheckerboard.setTexture('checkerboard-texture');
            scene.bgCheckerboard.setVisible(true);
        }
        
        // Resetear color de fondo de cámara por si estaba en sólido
        scene.cameras.main.setBackgroundColor('#000000');

    } else {
        // 2. Manejar Sólido
        if (scene.bgCheckerboard) {
            scene.bgCheckerboard.setVisible(false);
        }
        
        // Convertir hex a string CSS para el fondo
        const colorString = '#' + ('000000' + (mode === 'Custom' ? col1 : col1).toString(16)).slice(-6);
        scene.cameras.main.setBackgroundColor(colorString);
    }
}