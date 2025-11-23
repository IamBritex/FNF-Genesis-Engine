import { serializeStage, getElementNamePath } from './StageSerializer.js';

/**
 * Gestiona la lógica de "Guardar Como" (.zip) usando la API de Genesis y JSZip.
 */
export class SaveAsManager {

    constructor(scene, elementsManager, stageCharacters, stageManager, toastManager) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        this.stageCharacters = stageCharacters;
        this.stageManager = stageManager;
        this.toastManager = toastManager;
    }

    async saveAsZip() {
        if (typeof JSZip === 'undefined') {
            const msg = "JSZip no está cargado.";
            if (Genesis.env === 'DESKTOP') Genesis.dialog.messageBox({ title: "Error", message: msg, type: 16 });
            else alert(msg);
            return;
        }

        if (!this.stageManager.currentStageName) {
            this.toastManager.show("Error", "Carga o crea un escenario primero.");
            return;
        }
        
        this.toastManager.show("Empaquetando...", "Generando ZIP...");
        
        try {
            const zip = new JSZip();
            const stageName = this.stageManager.currentStageName;

            // 1. Generar stage.json
            const stageData = serializeStage(
                this.elementsManager, 
                this.stageCharacters, 
                this.stageManager,
                this.scene.layersPanel
            );
            
            const jsonString = JSON.stringify({ stage: stageData }, null, 4);
            zip.file(`${stageName}.json`, jsonString);

            // 2. Recolectar Assets
            const assets = this.collectAssets();
            const customAssets = [];

            // 3. Leer y añadir archivos al ZIP
            // Gracias a Genesis Virtual Host, podemos usar fetch para rutas locales
            for (const key of assets) {
                if (key.startsWith('custom_asset_') || key.startsWith('custom_atlas_')) {
                    customAssets.push(getElementNamePath(key, this.stageManager));
                    continue;
                }

                const assetPath = this.getAssetPath(key); 
                if (assetPath) {
                    try {
                        // fetch funciona en Genesis Desktop apuntando a https://app.genesis/public/...
                        // lo cual lee directamente del disco duro de forma transparente.
                        const response = await fetch(assetPath);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        
                        const blob = await response.blob();
                        const fileName = assetPath.split('/').pop();
                        zip.file(`assets/${fileName}`, blob);
                        
                    } catch (e) {
                        console.warn(`No se pudo incluir ${assetPath}: ${e.message}`);
                    }
                }
            }

            // 4. Generar y Descargar
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            this.triggerDownload(zipBlob, `${stageName}.zip`);

            this.toastManager.show("Éxito", `ZIP generado: ${stageName}.zip`);

        } catch (error) {
            console.error("Error ZIP:", error);
            if (Genesis.env === 'DESKTOP') {
                Genesis.dialog.messageBox({ title: "Error ZIP", message: "Fallo al crear el archivo comprimido.", type: 16 });
            }
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