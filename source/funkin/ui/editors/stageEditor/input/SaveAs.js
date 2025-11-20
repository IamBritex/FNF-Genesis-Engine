import { serializeStage, getElementNamePath } from './StageSerializer.js';

// --- Lógica de Electron ---
let isElectron = !!window.process && !!window.process.type;
let fs, path, appDataPath, processCwd; 

if (isElectron) {
    try {
        fs = require('fs');
        path = require('path');
        const { app } = require('@electron/remote'); 
        appDataPath = app.getPath('userData');
        processCwd = process.cwd(); 
    } catch (e) {
        console.error("Error al cargar módulos de Electron:", e);
        isElectron = false;
    }
}
// --- Fin de la lógica de Electron ---

/**
 * Gestiona la lógica de "Guardar Como", empaquetando el escenario
 * y sus assets en un archivo .zip.
 */
export class SaveAsManager {

    /**
     * @param {Phaser.Scene} scene
     * @param {import('../objects/Elements.js').ElementSelector} elementsManager
     * @param {import('./StageCharacters.js').StageCharacters} stageCharacters
     * @param {import('../EditorStageManager.js').EditorStageManager} stageManager
     * @param {import('../../utils/Toast.js').ToastManager} toastManager
     */
    constructor(scene, elementsManager, stageCharacters, stageManager, toastManager) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        this.stageCharacters = stageCharacters;
        this.stageManager = stageManager;
        this.toastManager = toastManager;
    }

    /**
     * Inicia el proceso de empaquetado y descarga de un .zip.
     */
    async saveAsZip() {
        if (typeof JSZip === 'undefined') {
            console.error("JSZip no está cargado. Añade el CDN a tu HTML.");
            this.toastManager.show("Error: JSZip no encontrado", "Añade el CDN de JSZip a tu HTML.");
            return;
        }

        if (!this.stageManager.currentStageName) {
            this.toastManager.show("Error al Guardar", "Carga o crea un escenario primero.");
            return;
        }
        
        this.toastManager.show("Empaquetando...", "Creando archivo .zip del escenario.");
        
        try {
            const zip = new JSZip();
            const stageName = this.stageManager.currentStageName;

            // 1. Generar y añadir el stage.json CON soporte de grupos
            const stageData = serializeStage(
                this.elementsManager, 
                this.stageCharacters, 
                this.stageManager, // IMPORTANTE: Pasar stageManager
                this.scene.layersPanel // IMPORTANTE: Pasar layersPanel
            );
            
            const jsonString = JSON.stringify({ stage: stageData }, null, 4);
            zip.file(`${stageName}.json`, jsonString);

            // 2. Recolectar, leer y añadir todos los assets
            const assets = this.collectAssets();
            const customAssets = [];

            for (const key of assets) {
                if (key.startsWith('custom_asset_') || key.startsWith('custom_atlas_')) {
                    customAssets.push(getElementNamePath(key, this.stageManager));
                    continue;
                }

                const webPath = this.getAssetPath(key); 
                if (webPath) {
                    const fileName = webPath.split('/').pop(); 
                    
                    if (isElectron && processCwd) {
                        // En Electron, leemos el archivo desde el disco usando fs.
                        const fileSystemPath = path.join(processCwd, webPath);

                        if (fs.existsSync(fileSystemPath)) {
                            const fileBuffer = fs.readFileSync(fileSystemPath);
                            zip.file(`assets/${fileName}`, fileBuffer);
                        } else {
                            console.warn(`No se encontró el asset en el disco: ${fileSystemPath}`);
                        }
                    } else {
                        // Web Fetch
                        try {
                            const response = await fetch(webPath);
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            const blob = await response.blob();
                            zip.file(`assets/${fileName}`, blob);
                        } catch (e) {
                            console.error(`Error al fetchear ${webPath}: ${e.message}`);
                        }
                    }
                }
            }

            // 3. Generar el .zip
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // 4. Disparar la descarga
            this.triggerDownload(zipBlob, `${stageName}.zip`);

            if (customAssets.length > 0) {
                this.toastManager.show("ZIP Guardado (con advertencia)", `No se incluyeron assets personalizados: ${customAssets.join(', ')}`);
            } else {
                this.toastManager.show("ZIP Guardado", `Escenario ${stageName}.zip guardado.`);
            }

        } catch (error) {
            console.error("Error al crear el .zip:", error);
            this.toastManager.show("Error al crear ZIP", "Revisa la consola para más detalles.");
        }
    }

    collectAssets() {
        const assetKeys = new Set();
        for (const el of this.elementsManager.registeredElements) {
            if (el && el.active && el.texture && el.texture.key !== '__DEFAULT') {
                assetKeys.add(el.texture.key);
            }
        }
        return assetKeys;
    }

    getAssetPath(key) {
        const stageName = this.stageManager.currentStageName;

        if (stageName && key.startsWith(`stage_${stageName}_`)) {
            const assetName = key.replace(`stage_${stageName}_`, '');
            return `public/data/stages/${stageName}/${assetName}.png`; 
        }

        if (key.startsWith('char_')) {
            const charName = key.replace('char_', '');
            return `public/images/characters/${charName}.png`;
        }
        
        return null;
    }

    triggerDownload(blob, fileName) {
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