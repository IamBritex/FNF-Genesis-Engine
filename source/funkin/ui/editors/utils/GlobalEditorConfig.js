class GlobalEditorConfigService {
    constructor() {
        this.listeners = [];
        this.config = {
            checkboardColor: 0x222222, // Color ejemplo
            checkboardAlpha: 1,
            showCheckboard: true,
            gridSize: 32 // Tamaño de los cuadros
        };
    }

    getConfig() {
        return this.config;
    }

    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    // ESTO EVITA EL CRASH DE LA TERCERA VEZ
    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.config);
            } catch (error) {
                console.error("GlobalConfig Error:", error);
            }
        });
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.notifyListeners();
    }
}

const GlobalEditorConfig = new GlobalEditorConfigService();
export default GlobalEditorConfig;