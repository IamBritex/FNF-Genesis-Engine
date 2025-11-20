import { serializeStage } from './StageSerializer.js'; 

// --- Lógica de Electron ---
let isElectron = !!window.process && !!window.process.type;
let fs, path, appDataPath; 

if (isElectron) {
    try {
        fs = require('fs');
        path = require('path');
        
        const { app } = require('@electron/remote'); 
        appDataPath = app.getPath('userData');

    } catch (e) {
        console.error("Error al cargar módulos de Electron:", e);
        console.warn("Asegúrate de tener 'enableRemoteModule: true' en tu BrowserWindow.");
        isElectron = false;
    }
}
// --- Fin de la lógica de Electron ---

/**
 * Gestiona la serialización y guardado (manual y automático) 
 * de los datos del escenario.
 */
export class SaveStage {

    /**
     * @param {Phaser.Scene} scene La escena principal (para acceder a layersPanel)
     * @param {import('../objects/Elements.js').ElementSelector} elementsManager
     * @param {import('./StageCharacters.js').StageCharacters} stageCharacters
     * @param {import('../EditorStageManager.js').EditorStageManager} stageManager
     * @param {import('../../utils/Toast.js').ToastManager} toastManager
     */
    constructor(scene, elementsManager, stageCharacters, stageManager, toastManager) {
        this.scene = scene; // Guardamos referencia a la escena
        this.elementsManager = elementsManager;
        this.stageCharacters = stageCharacters;
        this.stageManager = stageManager;
        this.toastManager = toastManager;

        /** @type {NodeJS.Timeout | null} */
        this.currentTimer = null;
        this.autoSaveInterval = 0; // en minutos
    }

    /**
     * Inicia el proceso de guardado MANUAL.
     * Esto dispara la descarga del archivo.
     */
    save() {
        console.log("Iniciando guardado MANUAL del escenario...");
        if (this.guardadoFallido(false)) return; 

        try {
            // Pasamos this.scene.layersPanel para soportar grupos
            const stageData = serializeStage(
                this.elementsManager, 
                this.stageCharacters, 
                this.stageManager,
                this.scene.layersPanel 
            );

            const jsonString = JSON.stringify({ stage: stageData }, null, 4);
            
            const fileName = this.stageManager?.currentStageName 
                ? `${this.stageManager.currentStageName}.json` 
                : 'mi-escenario.json';

            this.triggerDownload(jsonString, fileName);
            this.toastManager.show("Guardado Manual", `Archivo ${fileName} listo para descargar.`);
            
        } catch (error) {
            console.error("Error catastrófico durante el guardado:", error);
            this.toastManager.show("Error de Guardado", "Revisa la consola para más detalles.");
        }
    }

    /**
     * Configura el intervalo de auto-guardado.
     * @param {number} minutes Minutos entre cada guardado (0 para "Nunca").
     */
    setAutoSave(minutes) {
        this.clearAutoSaveTimer();
        this.autoSaveInterval = minutes;

        if (minutes > 0) {
            const ms = minutes * 60 * 1000;
            console.log(`Auto-guardado configurado para cada ${minutes} minutos.`);
            this.toastManager.show("Auto-Guardado Activado", `Se guardará cada ${minutes} min.`);
            
            this.currentTimer = setInterval(() => {
                this.performAutoSave();
            }, ms);
        } else {
            console.log("Auto-guardado desactivado.");
            this.toastManager.show("Auto-Guardado Desactivado", "Nunca se guardará automáticamente.");
        }
    }

    /**
     * Ejecuta la lógica de auto-guardado (Electron o Web).
     */
    performAutoSave() {
        console.log("Iniciando AUTO-GUARDADO del escenario...");
        if (this.guardadoFallido(true)) {
            console.warn("Auto-guardado omitido: los gestores no están listos o falta nombre.");
            return;
        }

        this.toastManager.show("Auto Guardado en progreso", "Espere un momento...");

        try {
            // Pasamos this.scene.layersPanel para soportar grupos
            const stageData = serializeStage(
                this.elementsManager, 
                this.stageCharacters, 
                this.stageManager,
                this.scene.layersPanel
            );

            const jsonString = JSON.stringify({ stage: stageData }, null, 4);
            const stageName = this.stageManager.currentStageName;
            const fileName = `${stageName}-backup.json`;

            if (isElectron && appDataPath) {
                const backupDir = path.join(appDataPath, 'backup');
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                const filePath = path.join(backupDir, fileName);
                
                fs.writeFileSync(filePath, jsonString);
                
                console.log(`Auto-guardado en AppData completado: ${filePath}`);
                this.toastManager.show("Guardado con exito!", filePath);

            } else {
                this.triggerDownload(jsonString, fileName);
                this.toastManager.show("Guardado con exito!", `Descargando ${fileName}`);
            }

        } catch (error) {
            console.error("Error catastrófico durante el auto-guardado:", error);
            this.toastManager.show("Error de Auto-Guardado", "Revisa la consola.");
        }
    }

    /**
     * Limpia el temporizador de auto-guardado actual.
     */
    clearAutoSaveTimer() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
    }

    /**
     * Comprueba si los gestores necesarios están listos.
     * @param {boolean} requireStageName Si es true, también fallará si el escenario no tiene nombre.
     * @returns {boolean} True si no se puede guardar, False si está listo.
     */
    guardadoFallido(requireStageName = false) {
        if (!this.elementsManager || !this.stageCharacters || !this.stageManager) {
            console.warn("No se puede guardar, los gestores no están listos.");
            this.toastManager.show("Error de Guardado", "Los gestores no están listos.");
            return true;
        }
        if (requireStageName && !this.stageManager.currentStageName) {
            console.warn("No se puede guardar, el escenario no tiene nombre.");
            this.toastManager.show("Error de Guardado", "Carga o crea un escenario primero.");
            return true;
        }
        return false;
    }

    /**
     * Crea un enlace <a> temporal y lo clickea para descargar el archivo.
     * @param {string} textContent El contenido JSON.
     * @param {string} fileName El nombre del archivo (ej. 'stage.json').
     */
    triggerDownload(textContent, fileName) {
        const blob = new Blob([textContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}