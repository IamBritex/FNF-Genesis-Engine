/**
 * editors/animationEditor/input/PreferencesManager.js
 * Gestiona la configuración de teclas para el Editor de Animaciones.
 */
const DEFAULT_KEYBINDINGS = {
    // --- Edición ---
    UNDO: { key: 'z', ctrl: true, shift: false, alt: false, description: 'Deshacer' },
    REDO: { key: 'y', ctrl: true, shift: false, alt: false, description: 'Rehacer' },
    SAVE: { key: 's', ctrl: true, shift: false, alt: false, description: 'Guardar JSON' },
    SAVE_ZIP: { key: 's', ctrl: true, shift: true, alt: false, description: 'Guardar ZIP' },
    EXIT: { key: 'q', ctrl: true, shift: false, alt: false, description: 'Salir al Menú' },
    
    // --- Cámara (Movimiento) ---
    CAM_UP: { key: 'i', ctrl: false, shift: false, alt: false, description: 'Cámara: Arriba' },
    CAM_DOWN: { key: 'k', ctrl: false, shift: false, alt: false, description: 'Cámara: Abajo' },
    CAM_LEFT: { key: 'j', ctrl: false, shift: false, alt: false, description: 'Cámara: Izquierda' },
    CAM_RIGHT: { key: 'l', ctrl: false, shift: false, alt: false, description: 'Cámara: Derecha' },
    ZOOM_IN: { key: 'o', ctrl: false, shift: false, alt: false, description: 'Cámara: Acercar' },
    ZOOM_OUT: { key: 'u', ctrl: false, shift: false, alt: false, description: 'Cámara: Alejar' },
    
    // --- Animación ---
    PLAY_ANIM: { key: 'SPACE', ctrl: false, shift: false, alt: false, description: 'Reproducir Anim' },
    PREV_ANIM: { key: 'q', ctrl: false, shift: false, alt: false, description: 'Animación Anterior' },
    NEXT_ANIM: { key: 'e', ctrl: false, shift: false, alt: false, description: 'Animación Siguiente' },
    
    // --- Ajuste de Offsets ---
    OFF_UP: { key: 'UP', ctrl: false, shift: false, alt: false, description: 'Offset: Arriba' },
    OFF_DOWN: { key: 'DOWN', ctrl: false, shift: false, alt: false, description: 'Offset: Abajo' },
    OFF_LEFT: { key: 'LEFT', ctrl: false, shift: false, alt: false, description: 'Offset: Izquierda' },
    OFF_RIGHT: { key: 'RIGHT', ctrl: false, shift: false, alt: false, description: 'Offset: Derecha' },
    
    // --- Sing Test ---
    SING_UP: { key: 'w', ctrl: false, shift: false, alt: false, description: 'Cantar: Arriba' },
    SING_DOWN: { key: 's', ctrl: false, shift: false, alt: false, description: 'Cantar: Abajo' },
    SING_LEFT: { key: 'a', ctrl: false, shift: false, alt: false, description: 'Cantar: Izquierda' },
    SING_RIGHT: { key: 'd', ctrl: false, shift: false, alt: false, description: 'Cantar: Derecha' }
};

export class PreferencesManager {
    constructor(scene) {
        this.scene = scene;
        this.keymap = this.getDefaultKeymap(); 
        this.loadKeybindings();
    }

    loadKeybindings() {
        console.log("[PreferencesManager] Cargando atajos...");
        // Guardamos en una ruta distinta al StageEditor para no mezclar configs
        const storageKey = 'preferences/AnimationShortCuts';

        if (window.Genesis && window.Genesis.storage) {
            window.Genesis.storage.load(storageKey).then(savedData => {
                if (savedData) {
                    // Mezclar con defaults para asegurar que nuevos atajos existan
                    this.keymap = { ...this.getDefaultKeymap(), ...savedData };
                    this.validateKeymap();
                    console.log("Atajos cargados.");
                    this.scene.events.emit('keybindingsUpdated');
                }
            }).catch(err => console.warn("Error cargando atajos:", err));
        }
    }
    
    validateKeymap() {
        // Asegurar que no falten teclas si actualizas el código
        let needsUpdate = false;
        const defaults = this.getDefaultKeymap();
        for (const action in defaults) {
            if (!this.keymap[action]) {
                this.keymap[action] = defaults[action];
                needsUpdate = true;
            }
        }
        if (needsUpdate) this.saveKeybindings(this.keymap);
    }

    saveKeybindings(keymap) {
        this.keymap = keymap;
        const storageKey = 'preferences/AnimationShortCuts';
        
        if (window.Genesis && window.Genesis.storage) {
            window.Genesis.storage.save(storageKey, this.keymap);
        }
        
        // Notificar a todos los sistemas que las teclas cambiaron
        this.scene.events.emit('keybindingsUpdated');
    }

    getKeymap() { return this.keymap; }
    
    // Devuelve una copia limpia para no modificar la referencia original
    getDefaultKeymap() { return JSON.parse(JSON.stringify(DEFAULT_KEYBINDINGS)); }
}