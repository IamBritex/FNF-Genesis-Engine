export default class AlphabetCanvasRenderer {
    // ESCALA POR DEFECTO: 0.7 (Tamaño legible y consistente)
    static DEFAULT_SCALE = 0.7;

    static render(scene, alphabetGroup, canvas, paddingX = 0, align = 'left', fixedScale = null) {
        const ctx = canvas.getContext('2d');

        // --- 1. VALIDACIÓN Y LIMPIEZA ---
        if (!alphabetGroup) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

        // Obtener letras (Soporte para Group o Array directo)
        const letters = alphabetGroup.letters || (alphabetGroup.children ? alphabetGroup.children.entries : []);
        if (!letters || letters.length === 0) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

        // --- 2. PREPARACIÓN ---
        let globalScale = fixedScale !== null ? fixedScale : AlphabetCanvasRenderer.DEFAULT_SCALE;
        const lineHeight = 65 * globalScale;
        const maxWidth = canvas.width - (paddingX * 2);

        let currentX = 0;
        let currentY = 0;

        // Almacenamos líneas completas para poder alinearlas individualmente despues
        const lines = [];
        let currentLine = []; // Buffer de la línea actual

        let wordBuffer = [];
        let wordWidth = 0;
        let lastOriginalRight = null;

        // Función: Mueve el buffer de palabra a la línea actual
        const flushWord = () => {
            if (wordBuffer.length === 0) return;

            // ¿Cabe en la línea actual?
            let fitsOnLine = (currentX + wordWidth) <= maxWidth;

            // Si no cabe y no es el principio, salto de línea
            if (!fitsOnLine && currentX > 0) {
                // Guardar línea anterior
                lines.push({ items: currentLine, width: currentX });
                currentLine = [];

                currentX = 0;
                currentY += lineHeight;
                // Recalcular si cabe ahora (si la palabra es gigante se escala abajo)
                fitsOnLine = wordWidth <= maxWidth;
            }

            // Factor de escala por si la palabra sola es más ancha que el canvas (evita desbordamiento)
            let wordScale = 1.0;
            if (!fitsOnLine) wordScale = maxWidth / wordWidth;

            // Añadir palabra a la línea actual
            wordBuffer.forEach(item => {
                const finalW = item.w * wordScale;
                const finalH = item.h * wordScale;
                const finalX = currentX + (item.x * wordScale); // Posición relativa en la línea

                currentLine.push({
                    texture: item.texture,
                    frame: item.frame,
                    x: finalX, // X relativa al inicio de la línea
                    y: currentY,
                    w: finalW,
                    h: finalH
                });
            });

            currentX += wordWidth * wordScale;
            wordBuffer = [];
            wordWidth = 0;
        };

        // --- 3. PROCESAR LETRAS ---
        letters.forEach((letter) => {
            // Detector de espacios
            const originalX = letter.x || 0;
            if (lastOriginalRight !== null) {
                const gap = originalX - lastOriginalRight;
                if (gap > 20) {
                    flushWord();
                    currentX += 15 * globalScale; // Espacio visual
                }
            }

            let texture = letter.texture;
            // Fallback textura missing
            if (!texture || texture.key === '__MISSING') {
                if (scene.textures.exists('bold')) {
                    letter.setTexture('bold');
                    texture = scene.textures.get('bold');
                } else {
                    // Si falla todo, espacio en blanco y skip
                    flushWord();
                    currentX += 20 * globalScale;
                    lastOriginalRight = originalX;
                    return;
                }
            }

            const frame = letter.frame;
            const rawWidth = frame.cutWidth;
            const rawHeight = frame.cutHeight;

            if (!rawWidth || rawWidth <= 0) {
                flushWord();
                currentX += 20 * globalScale;
                lastOriginalRight = originalX;
                return;
            }

            const letterBaseScale = letter.scaleX || 1;
            const letterW = (rawWidth * letterBaseScale) * globalScale;
            const letterH = (rawHeight * (letter.scaleY || 1)) * globalScale;

            // Agregar al buffer de palabra (x relativa al inicio de palabra)
            wordBuffer.push({ texture, frame, x: wordWidth, w: letterW, h: letterH });

            wordWidth += letterW;
            lastOriginalRight = originalX + (rawWidth * letterBaseScale);
        });

        flushWord(); // Soltar lo que quede
        if (currentLine.length > 0) {
            lines.push({ items: currentLine, width: currentX });
        }

        // --- 4. AJUSTAR CANVAS ---
        const totalContentHeight = currentY + lineHeight;

        // Ajustar altura si es necesario (canvas dinámico) o limpiar
        if (totalContentHeight > canvas.height) {
            canvas.height = totalContentHeight;
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Centrado Vertical Global
        let offsetY = 0;
        if (canvas.height > totalContentHeight) {
            offsetY = (canvas.height - totalContentHeight) / 2;
        }

        // --- 5. DIBUJAR FINAL ---
        lines.forEach(line => {
            // Calcular offset X para alineación (Left, Center, Right)
            let offsetX = paddingX;

            if (align === 'center') {
                offsetX = (canvas.width - line.width) / 2;
            } else if (align === 'right') {
                offsetX = canvas.width - line.width - paddingX;
            }

            line.items.forEach(item => {
                const source = item.texture.getSourceImage();
                if (!source) return;

                const drawX = offsetX + item.x;
                // Centrar letra verticalmente en su renglón
                const drawY = offsetY + item.y + (lineHeight - item.h) / 2;

                ctx.globalAlpha = 1.0;
                ctx.drawImage(
                    source,
                    item.frame.cutX, item.frame.cutY, item.frame.cutWidth, item.frame.cutHeight,
                    drawX, drawY, item.w, item.h
                );
            });
        });
    }
}