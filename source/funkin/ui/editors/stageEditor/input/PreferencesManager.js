const DEFAULT_KEYBINDINGS = {
    UNDO: { key: 'z', ctrl: true, shift: false, alt: false, description: 'Deshacer' },
    REDO: { key: 'y', ctrl: true, shift: false, alt: false, description: 'Rehacer' },
    COPY: { key: 'c', ctrl: true, shift: false, alt: false, description: 'Copiar Elemento' },
    PASTE: { key: 'v', ctrl: true, shift: false, alt: false, description: 'Pegar Elemento' },
    DUPLICATE: { key: 'd', ctrl: true, shift: false, alt: false, description: 'Duplicar Elemento' },
    DELETE: { key: 'Delete', ctrl: false, shift: false, alt: false, description: 'Eliminar Elemento' },
    DELETE_ALT: { key: 'Backspace', ctrl: false, shift: false, alt: false, description: 'Eliminar Elemento (Alt)' },
    FIND: { key: 'f', ctrl: true, shift: false, alt: false, description: 'Encontrar Elemento' },
    SAVE: { key: 's', ctrl: true, shift: false, alt: false, description: 'Guardar Escenario' },
    EXIT: { key: 'q', ctrl: true, shift: false, alt: false, description: 'Salir del Editor' },
    TEST_MODE: { key: 'Enter', ctrl: false, shift: false, alt: false, description: 'Modo Prueba (Test)' },
    CAM_UP: { key: 'W', ctrl: false, shift: false, alt: false, description: 'Cámara: Arriba' },
    CAM_DOWN: { key: 'S', ctrl: false, shift: false, alt: false, description: 'Cámara: Abajo' },
    CAM_LEFT: { key: 'A', ctrl: false, shift: false, alt: false, description: 'Cámara: Izquierda' },
    CAM_RIGHT: { key: 'D', ctrl: false, shift: false, alt: false, description: 'Cámara: Derecha' },
    CAM_TURBO: { key: 'Shift', ctrl: false, shift: false, alt: false, description: 'Cámara: Turbo' },
    ZOOM_IN: { key: 'e', ctrl: false, shift: false, alt: false, description: 'Cámara: Acercar' },
    ZOOM_OUT: { key: 'q', ctrl: false, shift: false, alt: false, description: 'Cámara: Alejar' }
};

export class PreferencesManager {
    constructor(scene) {
        this.scene = scene;
        this.keymap = this.getDefaultKeymap(); 
        this.loadKeybindings();
    }

    loadKeybindings() {
        console.log("Cargando preferencias (Async)...");
        
        // RUTA REQUERIDA: preferences/ShortCuts.json
        const storageKey = 'preferences/ShortCuts';

        Genesis.storage.load(storageKey).then(savedData => {
            if (savedData) {
                this.keymap = savedData;
                this.validateKeymap();
                console.log("Atajos cargados y aplicados.");
                if (this.scene.events) {
                    this.scene.events.emit('keybindingsUpdated');
                }
            } else {
                console.log("Usando atajos por defecto.");
            }
        }).catch(err => {
            console.warn("Error cargando atajos:", err);
        });
    }
    
    validateKeymap() {
        let needsUpdate = false;
        for (const action in DEFAULT_KEYBINDINGS) {
            if (!this.keymap[action]) {
                this.keymap[action] = DEFAULT_KEYBINDINGS[action];
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            this.saveKeybindings(this.keymap);
        }
    }

    saveKeybindings(keymap) {
        this.keymap = keymap;
        // RUTA REQUERIDA
        const storageKey = 'preferences/ShortCuts';
        Genesis.storage.save(storageKey, this.keymap);
        
        if (this.scene.events) {
            this.scene.events.emit('keybindingsUpdated');
        }
    }

    getKeymap() { return this.keymap; }
    getDefaultKeymap() { return JSON.parse(JSON.stringify(DEFAULT_KEYBINDINGS)); }
}