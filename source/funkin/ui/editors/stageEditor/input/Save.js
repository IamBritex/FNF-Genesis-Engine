import { serializeStage } from './StageSerializer.js'; 

export class SaveStage {

    constructor(scene, elementsManager, stageCharacters, stageManager, toastManager) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        this.stageCharacters = stageCharacters;
        this.stageManager = stageManager;
        this.toastManager = toastManager;

        this.currentTimer = null;
        this.autoSaveInterval = 0;
    }

    save() {
        console.log("Iniciando guardado MANUAL...");
        if (this.guardadoFallido(false)) return; 

        try {
            const stageData = serializeStage(
                this.elementsManager, 
                this.stageCharacters, 
                this.stageManager,
                this.scene.layersPanel 
            );

            const jsonString = JSON.stringify({ stage: stageData }, null, 4);
            
            const stageName = this.stageManager.currentStageName || 'mi-escenario';
            const fileName = `${stageName}.json`;

            this.triggerDownload(jsonString, fileName);
            this.toastManager.show("Guardado Manual", `Archivo ${fileName} generado.`);
            
        } catch (error) {
            console.error("Error durante el guardado:", error);
            this.showError("Error de Guardado", "Revisa la consola.");
        }
    }

    setAutoSave(minutes) {
        this.clearAutoSaveTimer();
        this.autoSaveInterval = minutes;

        if (minutes > 0) {
            const ms = minutes * 60 * 1000;
            console.log(`Auto-guardado configurado para cada ${minutes} minutos.`);
            this.toastManager.show("Auto-Guardado", `Activado: cada ${minutes} min.`);
            
            this.currentTimer = setInterval(() => {
                this.performAutoSave();
            }, ms);
        } else {
            console.log("Auto-guardado desactivado.");
            this.toastManager.show("Auto-Guardado", "Desactivado.");
        }
    }

    performAutoSave() {
        console.log("Iniciando AUTO-GUARDADO...");
        if (this.guardadoFallido(true)) return;

        this.toastManager.show("Auto Guardado", "Procesando...");

        try {
            const stageData = serializeStage(
                this.elementsManager, 
                this.stageCharacters, 
                this.stageManager,
                this.scene.layersPanel
            );

            const stageName = this.stageManager.currentStageName;
            
            // Generar fecha y hora: YYYY-MM-DD-HH-MM-SS
            const now = new Date();
            const dateStr = now.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
            
            // RUTA REQUERIDA: StageEditor/Stages/backups/{name}-backup-{fecha}.json
            // Nota: Genesis.storage.save añade .json automáticamente si el backend lo espera, 
            // pero nuestro backend saveFile escribe lo que recibe.
            // Ajuste: Genesis.js saveFile añade .json. Así que pasamos la ruta sin extensión.
            
            const backupKey = `StageEditor/Stages/backups/${stageName}-backup-${dateStr}`;
            
            Genesis.storage.save(backupKey, { stage: stageData });
            
            console.log(`Auto-guardado completado: ${backupKey}`);
            this.toastManager.show("Auto Guardado", "Backup completado.");

        } catch (error) {
            console.error("Error durante el auto-guardado:", error);
            this.showError("Error Auto-Save", "Fallo al escribir backup.");
        }
    }

    clearAutoSaveTimer() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
        }
    }

    guardadoFallido(requireStageName = false) {
        if (!this.elementsManager || !this.stageCharacters || !this.stageManager) {
            this.showError("Error", "Gestores no listos.");
            return true;
        }
        if (requireStageName && !this.stageManager.currentStageName) {
            console.warn("Auto-guardado omitido: escenario sin nombre.");
            return true;
        }
        return false;
    }

    showError(title, msg) {
        if (Genesis.env === 'DESKTOP') {
            Genesis.dialog.messageBox({ title: title, message: msg, type: 16 });
        } else {
            this.toastManager.show(title, msg);
        }
    }

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