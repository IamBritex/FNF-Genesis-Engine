export class Save {
    /**
     * @param {import('../animationEditor.js').AnimationEditor} scene
     */
    constructor(scene) {
        this.scene = scene;
    }

    save() {
        const jsonData = this.scene.currentJsonData;
        const charName = this.scene.characterName || 'character';

        if (!jsonData) {
            this.scene.toastManager.show("Error", "No hay datos de personaje para guardar.");
            return;
        }

        try {
            const jsonString = JSON.stringify(jsonData, null, 4);
            const fileName = `${charName}.json`;

            this.downloadFile(jsonString, fileName, 'application/json');
            this.scene.toastManager.show("Guardado", `Archivo ${fileName} guardado.`);
        } catch (e) {
            console.error("Error al guardar JSON:", e);
            this.scene.toastManager.show("Error", "Fallo al generar el JSON.");
        }
    }

    downloadFile(content, fileName, contentType) {
        const blob = new Blob([content], { type: contentType });
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