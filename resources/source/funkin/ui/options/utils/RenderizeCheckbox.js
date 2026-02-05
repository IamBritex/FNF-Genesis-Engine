/**
 * Utilitario para renderizar el checkbox animado en un Canvas HTML.
 * Solución: Alineación estricta al BOTTOM-CENTER y Caché de Textura.
 */
export default class RenderizeCheckbox {
    
    // Cache para almacenar la referencia a la textura y evitar búsquedas constantes (reutilización)
    static cachedTexture = null;
    static cachedSource = null;

    static draw(scene, canvas, isChecked, animFrame) {
        if (!canvas) return;

        // --- OPTIMIZACIÓN: REUTILIZAR TEXTURA ---
        // Solo buscamos la textura si no la tenemos guardada o si la escena ha cambiado (por seguridad)
        if (!this.cachedTexture || !this.cachedSource) {
            if (scene.textures.exists('checkboxAnim')) {
                this.cachedTexture = scene.textures.get('checkboxAnim');
                this.cachedSource = this.cachedTexture.getSourceImage();
            } else {
                return; // Si no existe, no dibujamos nada
            }
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;

        let frameName = '';

        if (!isChecked) {
            frameName = 'Check Box unselected0000';
        } else {
            const selectionTotalFrames = 11;
            if (animFrame < selectionTotalFrames) {
                const indexStr = animFrame.toString().padStart(4, '0');
                frameName = `Check Box selecting animation${indexStr}`;
            } else {
                const loopIndex = (animFrame - selectionTotalFrames) % 2; 
                const indexStr = loopIndex.toString().padStart(4, '0');
                frameName = `Check Box Selected Static${indexStr}`;
            }
        }

        // Obtenemos el frame desde la textura cacheada
        const frame = this.cachedTexture.get(frameName);
        if (!frame || frame.missing) return;

        // --- LÓGICA DE POSICIONAMIENTO ---
        const drawW = frame.cutWidth;
        const drawH = frame.cutHeight;
        const realW = frame.realWidth || drawW;
        const realH = frame.realHeight || drawH;
        const offsetX = frame.spriteSourceSizeX || 0;
        const offsetY = frame.spriteSourceSizeY || 0;

        // Alineación al fondo del canvas
        const originX = (canvas.width - realW) / 2;
        const originY = canvas.height - realH; 

        const finalX = originX + offsetX;
        const finalY = originY + offsetY;

        ctx.drawImage(
            this.cachedSource,
            frame.cutX, frame.cutY, drawW, drawH,
            finalX, finalY, drawW, drawH
        );
    }
}