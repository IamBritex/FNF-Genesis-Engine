let isElectron = !!window.process && !!window.process.type;
let fs, path, appDataPath, CONFIG_PATH;

if (isElectron) {
    try {
        fs = require('fs');
        path = require('path');
        const { app } = require('@electron/remote');
        const basePath = path.join(app.getPath('userData'), 'Preferences', 'GlobalEditorConfig');
        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath, { recursive: true });
        }
        CONFIG_PATH = path.join(basePath, 'Config.json');
    } catch (e) {
        console.error("Error al cargar módulos de Electron para Config:", e);
        isElectron = false;
    }
}

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
        this.config = null;
        this.load();
    }

    load() {
        try {
            if (isElectron && fs.existsSync(CONFIG_PATH)) {
                const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
                this.config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
            } else if (!isElectron) {
                const data = localStorage.getItem('GlobalEditorConfig');
                if (data) {
                    this.config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
                } else {
                    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                }
            } else {
                this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            }
        } catch (e) {
            console.error("Error al cargar configuración, usando default:", e);
            this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        }
    }

    save(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        try {
            const data = JSON.stringify(this.config, null, 4);
            if (isElectron && CONFIG_PATH) {
                fs.writeFileSync(CONFIG_PATH, data);
            } else {
                localStorage.setItem('GlobalEditorConfig', data);
            }
        } catch (e) {
            console.error("Error al guardar configuración:", e);
        }
    }

    reset() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.save(this.config);
        return this.config;
    }

    get() {
        return this.config;
    }
}