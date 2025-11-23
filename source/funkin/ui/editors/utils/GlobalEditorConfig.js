// Configuración por defecto
const DEFAULT_CONFIG = {
    theme: {
        backgroundType: 'Checkerboard',
        mode: 'Dark',
        customColor: '#663399'
    },
    language: 'English',
    musicMuted: false
};

export class GlobalEditorConfig {
    constructor() {
        // 1. Iniciar con valores por defecto para evitar errores inmediatos
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.listeners = [];
        
        // 2. Iniciar carga asíncrona
        this.load();
    }

    load() {
        // Si la API Genesis está disponible, cargamos desde disco/storage
        if (window.Genesis && window.Genesis.storage) {
            window.Genesis.storage.load('GlobalEditorConfig').then(data => {
                if (data) {
                    // Mezclamos con defaults por si añadiste opciones nuevas en el código
                    this.config = { ...DEFAULT_CONFIG, ...data };
                    
                    console.log("[GlobalConfig] Configuración cargada:", this.config);
                    this.notifyListeners();
                }
            }).catch(err => {
                console.warn("[GlobalConfig] No se pudo cargar la config (usando default):", err);
            });
        }
    }

    save(newConfig) {
        // Actualizar estado interno
        this.config = { ...this.config, ...newConfig };
        
        // Guardar persistentemente usando la API Genesis
        if (window.Genesis && window.Genesis.storage) {
            window.Genesis.storage.save('GlobalEditorConfig', this.config);
        }
        
        this.notifyListeners();
    }

    reset() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.save(this.config);
        return this.config;
    }

    get() {
        return this.config;
    }

    /**
     * Suscribe una función para que se ejecute cuando la configuración cambie o se cargue.
     * @param {Function} callback Función que recibe la nueva config.
     */
    onChange(callback) {
        this.listeners.push(callback);
        // Ejecutar inmediatamente con la config actual
        callback(this.config);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.config));
    }
}