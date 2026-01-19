/**
 * CharacterPositioner.js
 * Módulo estático encargado exclusivamente de calcular la posición base (Anchor)
 * de un personaje para que se alinee correctamente (Bottom-Center) manteniendo un origen (0,0).
 */
export class CharacterPositioner {

    /**
     * Calcula la coordenada (x, y) de la esquina superior izquierda del sprite
     * para que visualmente sus "pies" (Bottom-Center) coincidan con stageX, stageY.
     * @param {number} stageX - Posición X deseada en el escenario (Centro del personaje).
     * @param {number} stageY - Posición Y deseada en el escenario (Pies del personaje).
     * @param {number} charScale - Escala definida en el JSON del personaje.
     * @param {object} frameDimensions - { width, height } del frame inicial/referencia.
     * @param {Array<number>} initialAnimOffset - [x, y] Offset de la animación inicial (idle).
     * @returns {{x: number, y: number}} La posición base calculada.
     */
    static calculateBasePosition(stageX, stageY, charScale, frameDimensions, initialAnimOffset = [0, 0]) {
        const scaledWidth = frameDimensions.width * charScale;
        const scaledHeight = frameDimensions.height * charScale;

        // FÓRMULA DE ALINEACIÓN (Bottom-Center con Origin 0,0):
        const baseX = stageX - (initialAnimOffset[0] * charScale) - (scaledWidth / 2);
        const baseY = stageY - (initialAnimOffset[1] * charScale) - scaledHeight;

        return { x: baseX, y: baseY };
    }
}