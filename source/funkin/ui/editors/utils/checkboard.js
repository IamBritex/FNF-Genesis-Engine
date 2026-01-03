import GlobalEditorConfig from './GlobalEditorConfig.js';

// --- CLASE PRINCIPAL ---
export default class Checkboard extends Phaser.GameObjects.TileSprite {
    constructor(scene, x, y, width, height) {
        // 1. GENERAR LA TEXTURA SI NO EXISTE
        // Creamos un patrón de ajedrez básico de 64x64 (2 cuadros de 32x32)
        const key = 'gen_checkboard';
        const size = 32;

        if (!scene.textures.exists(key)) {
            const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

            // Dibujar patrón base (Blanco y Gris Claro)
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, size, size);
            graphics.fillRect(size, size, size, size);

            graphics.fillStyle(0xdddddd, 1);
            graphics.fillRect(size, 0, size, size);
            graphics.fillRect(0, size, size, size);

            graphics.generateTexture(key, size * 2, size * 2);
        }

        // 2. Llamar al super con la textura generada
        super(scene, x, y, width, height, key);
        scene.add.existing(this);

        // 3. Callback para actualizar cuando cambie la config global
        this.onConfigUpdate = (config) => {
            this.updateVisuals(config);
        };

        GlobalEditorConfig.addListener(this.onConfigUpdate);

        // 4. LIMPIEZA (Vital para arreglar el crash 'reading sys')
        this.on('destroy', this.cleanup, this);
        if (scene.events) {
            scene.events.once('shutdown', this.cleanup, this);
        }

        // 5. Aplicar configuración inicial inmediatamente
        this.updateVisuals(GlobalEditorConfig.getConfig());
    }

    cleanup() {
        GlobalEditorConfig.removeListener(this.onConfigUpdate);

        if (this.scene) {
            this.scene.events.off('shutdown', this.cleanup, this);
        }
    }

    updateVisuals(config) {
        if (!this.active || !this.scene) return;

        try {
            this.setVisible(config.showCheckboard);

            if (config.checkboardColor !== undefined) {
                this.setTint(config.checkboardColor);
            }

            if (config.checkboardAlpha !== undefined) {
                this.setAlpha(config.checkboardAlpha);
            }

        } catch (e) {
            console.warn("Checkboard: Error actualizando visuales", e);
        }
    }
}

// --- FUNCIÓN DE COMPATIBILIDAD ---
// Agregamos esto para que 'EditorSettingsWindow.js' no de error al importar.
// En lugar de modificar el objeto directamente, actualizamos la Config Global,
// lo que disparará el cambio en la clase Checkboard automáticamente.

export function updateStageBackground(scene, newSettings) {
    // Si newSettings viene con estructura { theme: ... } o directa, adáptalo aquí si es necesario.
    // Asumimos que newSettings trae las propiedades como checkboardColor, etc.
    GlobalEditorConfig.updateConfig(newSettings);
}