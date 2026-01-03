/**
 * source/funkin/ui/editors/inputs/mouse.js
 * Maneja la interacción del mouse para el Editor:
 * - Sonidos de UI Globales (Click Down/Up en cualquier parte, incluyendo DOM).
 * - Zoom con la rueda.
 * - Paneo con clic central.
 */
export class EditorMouseHandler {
    /**
     * @param {Phaser.Scene} scene La escena principal del editor.
     */
    constructor(scene) {
        this.scene = scene;

        // Estado interno del mouse
        this.panStart = new Phaser.Math.Vector2();
        this.isPanning = false;

        // Bindeamos los eventos globales para poder removerlos después
        this.onGlobalMouseDown = this.onGlobalMouseDown.bind(this);
        this.onGlobalMouseUp = this.onGlobalMouseUp.bind(this);

        this.init();
    }

    init() {
        // 1. SONIDOS GLOBALES (Window Listener)
        // Usamos 'true' (useCapture) para detectar el clic ANTES de que el DOM lo detenga.
        // Esto asegura que suene aunque hagas clic en una ventana, botón o input HTML.
        window.addEventListener('mousedown', this.onGlobalMouseDown, true);
        window.addEventListener('mouseup', this.onGlobalMouseUp, true);

        // 2. Lógica de Paneo (Solo en Canvas / Phaser Input)
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.middleButtonDown()) {
                this.isPanning = true;
                this.panStart.set(pointer.x, pointer.y);
                this.scene.input.setDefaultCursor('grabbing');
            }
        });

        this.scene.input.on('pointerup', (pointer) => {
            if (pointer.middleButtonReleased()) {
                this.isPanning = false;
                this.scene.input.setDefaultCursor('default');
            }
        });

        this.scene.input.on('gameout', () => {
            this.isPanning = false;
            this.scene.input.setDefaultCursor('default');
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (this.isPanning) {
                const dx = pointer.x - pointer.prevPosition.x;
                const dy = pointer.y - pointer.prevPosition.y;

                this.scene.baseScrollX -= dx / this.scene.baseZoom;
                this.scene.baseScrollY -= dy / this.scene.baseZoom;

                this.panStart.set(pointer.x, pointer.y);
            }
        });

        // 3. Zoom con Rueda
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Evitamos hacer zoom si estamos sobre un elemento DOM que tiene scroll propio
            // (Opcional, pero recomendado para no hacer zoom mientras scrolleas una lista)
            if (this.isOverScrollableDOM(deltaY)) return;

            pointer.event.preventDefault();

            const zoomAmount = 0.1;

            if (deltaY > 0) {
                this.scene.baseZoom -= zoomAmount;
            } else {
                this.scene.baseZoom += zoomAmount;
            }

            this.scene.baseZoom = Phaser.Math.Clamp(this.scene.baseZoom, 0.1, 5.0);
        });

        // Limpieza automática al cerrar la escena
        this.scene.events.on('shutdown', this.destroy, this);
    }

    // --- MANEJADORES GLOBALES DE SONIDO ---

    onGlobalMouseDown(event) {
        // 0 = Clic Izquierdo
        if (event.button === 0) {
            this.playSound('clickDown');
        }
    }

    onGlobalMouseUp(event) {
        // 0 = Clic Izquierdo
        if (event.button === 0) {
            this.playSound('clickUp');
        }
    }

    playSound(key) {
        try {
            if (this.scene.sound && this.scene.cache.audio.exists(key)) {
                this.scene.sound.play(key);
            }
        } catch (e) {
            // Ignorar errores de audio si la escena se está destruyendo
        }
    }

    // --- UTILIDADES ---

    isOverScrollableDOM(deltaY) {
        // Pequeña utilidad para no hacer zoom si el usuario está scrolleando una lista HTML
        // Verifica si el elemento bajo el mouse es scrolleable
        const target = document.elementFromPoint(this.scene.input.activePointer.x, this.scene.input.activePointer.y);
        if (target && (target.tagName === 'DIV' || target.tagName === 'UL')) {
            const hasVerticalScroll = target.scrollHeight > target.clientHeight;
            // Si tiene scroll y estamos intentando scrollear, bloqueamos el zoom
            if (hasVerticalScroll) return true;
        }
        return false;
    }

    destroy() {
        // Es muy importante remover los listeners globales para no duplicar sonidos al recargar
        window.removeEventListener('mousedown', this.onGlobalMouseDown, true);
        window.removeEventListener('mouseup', this.onGlobalMouseUp, true);
    }
}