// --- Lógica de Electron ---
let isElectron = !!window.process && !!window.process.type;
let fs, path, PREFERENCES_PATH; 

if (isElectron) {
    try {
        fs = require('fs');
        path = require('path');
        const { app } = require('@electron/remote'); 
        
        // Crear carpetas: AppData/TuApp/Preferences/StageEditor
        const prefsDir = path.join(app.getPath('userData'), 'Preferences', 'StageEditor');
        if (!fs.existsSync(prefsDir)) {
            fs.mkdirSync(prefsDir, { recursive: true });
        }
        PREFERENCES_PATH = path.join(prefsDir, 'ShortCuts.json');
        
    } catch (e) {
        console.error("Error al cargar módulos de Electron:", e);
        isElectron = false;
    }
}
// --- Fin de la lógica de Electron ---

// Definición de todas las acciones
const DEFAULT_KEYBINDINGS = {
    // --- Edición General ---
    UNDO: { key: 'z', ctrl: true, shift: false, alt: false, description: 'Deshacer' },
    REDO: { key: 'y', ctrl: true, shift: false, alt: false, description: 'Rehacer' },
    COPY: { key: 'c', ctrl: true, shift: false, alt: false, description: 'Copiar Elemento' },
    PASTE: { key: 'v', ctrl: true, shift: false, alt: false, description: 'Pegar Elemento' },
    DUPLICATE: { key: 'd', ctrl: true, shift: false, alt: false, description: 'Duplicar Elemento' },
    DELETE: { key: 'Delete', ctrl: false, shift: false, alt: false, description: 'Eliminar Elemento' },
    DELETE_ALT: { key: 'Backspace', ctrl: false, shift: false, alt: false, description: 'Eliminar Elemento (Alt)' },
    FIND: { key: 'f', ctrl: true, shift: false, alt: false, description: 'Encontrar Elemento' },
    
    // --- Archivo y Navegación ---
    SAVE: { key: 's', ctrl: true, shift: false, alt: false, description: 'Guardar Escenario' },
    EXIT: { key: 'q', ctrl: true, shift: false, alt: false, description: 'Salir del Editor' },
    
    // --- Herramientas y Modos ---
    TEST_MODE: { key: 'Enter', ctrl: false, shift: false, alt: false, description: 'Modo Prueba (Test)' },
    
    // --- Movimiento de Cámara ---
    CAM_UP: { key: 'W', ctrl: false, shift: false, alt: false, description: 'Cámara: Mover Arriba' },
    CAM_DOWN: { key: 'S', ctrl: false, shift: false, alt: false, description: 'Cámara: Mover Abajo' },
    CAM_LEFT: { key: 'A', ctrl: false, shift: false, alt: false, description: 'Cámara: Mover Izquierda' },
    CAM_RIGHT: { key: 'D', ctrl: false, shift: false, alt: false, description: 'Cámara: Mover Derecha' },
    CAM_TURBO: { key: 'Shift', ctrl: false, shift: false, alt: false, description: 'Cámara: Turbo (Velocidad)' },
    
    // --- Zoom (NUEVO) ---
    ZOOM_IN: { key: 'e', ctrl: false, shift: false, alt: false, description: 'Cámara: Acercar (Zoom In)' },
    ZOOM_OUT: { key: 'q', ctrl: false, shift: false, alt: false, description: 'Cámara: Alejar (Zoom Out)' }
};

/**
 * Gestiona la carga y guardado de las preferencias del usuario (atajos).
 */
export class PreferencesManager {
    constructor(scene) {
        this.scene = scene;
        this.keymap = null;
        this.loadKeybindings();
    }

    /**
     * Carga los atajos desde Electron (JSON) o Web (LocalStorage).
     */
    loadKeybindings() {
        console.log("Cargando atajos de teclado...");
        try {
            if (isElectron && fs.existsSync(PREFERENCES_PATH)) {
                const data = fs.readFileSync(PREFERENCES_PATH, 'utf-8');
                this.keymap = JSON.parse(data);
                this.validateKeymap();
                console.log("Atajos cargados desde AppData.");
                return;
            } else if (!isElectron) {
                const data = localStorage.getItem('ShortCuts');
                if (data) {
                    this.keymap = JSON.parse(data);
                    this.validateKeymap();
                    console.log("Atajos cargados desde LocalStorage.");
                    return;
                }
            }
        } catch (e) {
            console.error("Error al cargar atajos guardados, reestableciendo:", e);
            this.keymap = null;
        }

        // Si falla o no existe, usa los por defecto
        console.log("Usando atajos por defecto.");
        this.keymap = JSON.parse(JSON.stringify(DEFAULT_KEYBINDINGS));
    }
    
    /**
     * Asegura que el keymap cargado tenga todas las acciones por defecto.
     */
    validateKeymap() {
        let needsUpdate = false;
        for (const action in DEFAULT_KEYBINDINGS) {
            if (!this.keymap[action]) {
                this.keymap[action] = DEFAULT_KEYBINDINGS[action];
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            console.log("Keymap actualizado con nuevas acciones por defecto.");
            this.saveKeybindings(this.keymap);
        }
    }

    /**
     * Guarda los atajos en Electron o Web.
     */
    saveKeybindings(keymap) {
        this.keymap = keymap;
        try {
            const data = JSON.stringify(this.keymap, null, 4);
            if (isElectron && PREFERENCES_PATH) {
                fs.writeFileSync(PREFERENCES_PATH, data);
            } else if (!isElectron) {
                localStorage.setItem('ShortCuts', data);
            }
            
            if (this.scene.events) {
                this.scene.events.emit('keybindingsUpdated');
            }
        } catch (e) {
            console.error("Error al guardar atajos:", e);
        }
    }

    getKeymap() {
        return this.keymap;
    }

    getDefaultKeymap() {
        return JSON.parse(JSON.stringify(DEFAULT_KEYBINDINGS));
    }
}