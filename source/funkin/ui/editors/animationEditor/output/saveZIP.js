export class SaveZIP {
    /**
     * @param {import('../animationEditor.js').AnimationEditor} scene
     */
    constructor(scene) {
        this.scene = scene;
    }

    async save() {
        if (typeof JSZip === 'undefined') {
            this.scene.toastManager.show("Error", "Librería JSZip no encontrada.");
            return;
        }

        const jsonData = this.scene.currentJsonData;
        const charName = this.scene.characterName || 'character';
        const sprite = this.scene.currentCharacter;

        if (!jsonData || !sprite) {
            this.scene.toastManager.show("Error", "No hay personaje para exportar.");
            return;
        }

        this.scene.toastManager.show("Empaquetando...", "Generando ZIP...");

        try {
            const zip = new JSZip();

            const jsonString = JSON.stringify(jsonData, null, 4);
            zip.file(`${charName}.json`, jsonString);

            const pngUrl = this.scene.currentPngUrl;
            const xmlUrl = this.scene.currentXmlUrl;
            
            const imgName = jsonData.image ? jsonData.image.split('/').pop() : charName; 

            if (pngUrl) {
                const pngBlob = await this.fetchAsBlob(pngUrl);
                zip.file(`${imgName}.png`, pngBlob);
            }

            if (xmlUrl) {
                const xmlBlob = await this.fetchAsBlob(xmlUrl);
                zip.file(`${imgName}.xml`, xmlBlob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            this.downloadBlob(zipBlob, `${charName}_pack.zip`);
            this.scene.toastManager.show("Éxito", "Personaje exportado correctamente.");

        } catch (e) {
            console.error("Error ZIP:", e);
            this.scene.toastManager.show("Error", "Fallo al crear ZIP.");
        }
    }

    async fetchAsBlob(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return await response.blob();
    }

    downloadBlob(blob, fileName) {
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