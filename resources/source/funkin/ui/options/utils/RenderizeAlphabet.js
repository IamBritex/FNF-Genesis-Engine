import { AlphabetData } from '../../../../utils/AlphabetData.js';

export default class RenderizeAlphabet {
    /**
     * Dibuja texto utilizando el atlas "bold" del juego en un elemento Canvas HTML.
     * @param {Phaser.Scene} scene - La escena activa.
     * @param {HTMLCanvasElement} canvas - El elemento canvas.
     * @param {string} text - El texto a renderizar.
     * @param {number} scale - Escala del texto (default 0.8).
     * @param {number} offsetX - Espacio reservado a la izquierda (para iconos).
     */
    static drawText(scene, canvas, text, scale = 0.8, offsetX = 0) {
        if (!canvas || !text) return;

        const ctx = canvas.getContext('2d');
        
        // Obtener la imagen fuente
        let textureSource = scene.textures.get('bold').getSourceImage();
        
        if (!textureSource || textureSource instanceof Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper) {
            if (scene.textures.exists('alphabet')) {
                textureSource = scene.textures.get('alphabet').getSourceImage();
            } else {
                return;
            }
        }

        let cursorX = offsetX; // Iniciamos el cursor DESPUÉS del offset
        const lettersToDraw = [];
        const cleanText = text.toString();

        // --- PASE 1: Calcular geometría ---
        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            
            if (char === " ") {
                cursorX += 40 * scale;
                continue;
            }

            const frameName = this.getFrameName(char);
            
            if (frameName) {
                const frameData = AlphabetData.frames.find(f => f.filename === frameName);
                
                if (frameData) {
                    const { x, y, w, h } = frameData.frame;
                    
                    const bottomAlignedChars = ['.', ',', '_'];
                    let offsetY = 0;
                    const maxHeight = 70; 
                    
                    if (bottomAlignedChars.includes(char)) {
                        offsetY = (maxHeight - h) * scale;
                    } else {
                        offsetY = (maxHeight - h) / 2 * scale;
                    }

                    lettersToDraw.push({
                        srcX: x, srcY: y, srcW: w, srcH: h,
                        destX: cursorX,
                        destY: offsetY,
                        destW: w * scale,
                        destH: h * scale
                    });

                    cursorX += (w * scale) + (2 * scale); 
                }
            } else {
                cursorX += 20 * scale; 
            }
        }

        // --- PASE 2: Ajustar Canvas y Dibujar Texto ---
        // Ajustamos el ancho total incluyendo el offset
        const finalWidth = Math.max(cursorX, 1);
        
        // Solo cambiamos el tamaño si es diferente para evitar parpadeos innecesarios
        if (canvas.width !== finalWidth) {
            canvas.width = finalWidth;
        }

        // Limpiamos todo el canvas antes de dibujar
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        lettersToDraw.forEach(l => {
            ctx.drawImage(
                textureSource,
                l.srcX, l.srcY, l.srcW, l.srcH, 
                l.destX, l.destY, l.destW, l.destH
            );
        });
    }

    static getFrameName(char) {
        const specialChars = {
            "#": "hashtag", "$": "dollarsign", "%": "%", "&": "amp",
            "(": "start parentheses", ")": "end parentheses", "*": "*", "+": "+", "-": "-",
            "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
            ":": ":", ";": ";", "<": "<", "=": "=", ">": ">", "@": "@",
            "[": "[", "\\": "\\", "]": "]", "^": "^", "_": "_",
            "'": "apostraphie", "!": "exclamation point", "?": "question mark",
            ".": "period", ",": "comma", "|": "|", "~": "~", "/": "forward slash"
        };

        let prefix = "";
        if (specialChars[char] !== undefined) prefix = specialChars[char];
        else if (/^[A-Z]$/.test(char)) prefix = char + " bold";
        else if (/^[a-z]$/.test(char)) prefix = char + " lowercase";
        else prefix = char;

        return prefix + "0000"; 
    }
}