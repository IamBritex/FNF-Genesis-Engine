export default class Alphabet {
    static init(scene) {
        this.scene = scene;
        this.frames = null;
        this.image = null;
        this.charSpacing = 6; // Espaciado aumentado
        this.lineHeight = 40; // Altura entre líneas
        this.debug = false;
    }

    static async loadResources() {
        this.scene.load.image('alphabet', 'public/assets/images/UI/alphabet.png');
        this.scene.load.json('alphabetData', 'public/assets/images/UI/alphabet.json');
    }

    static createResources() {
        this.frames = this.scene.cache.json.get('alphabetData').frames;
        this.image = this.scene.textures.get('alphabet').getSourceImage();
    }

    static getFrame(char) {
        // Mapeo de caracteres especiales
        const specialMap = {
            '#': 'hashtag', '(': 'parenthesis left', ')': 'parenthesis right',
            '-': 'hyphen', ' ': 'space', '_': 'underscore',
            '.': 'period', ',': 'comma', "'": 'apostrophe',
            '"': 'quotation', '!': 'exclamation', '?': 'question'
        };

        // Buscar en mapeo especial primero
        if (specialMap[char]) {
            const frameName = `${specialMap[char]} bold instance 10000`;
            return this.frames[frameName] || this.getDefaultFrame();
        }

        // Letras (a-z)
        if (/[a-zA-Z]/.test(char)) {
            const frameName = `${char.toLowerCase()} bold instance 10000`;
            return this.frames[frameName] || this.getDefaultFrame();
        }

        // Números (0-9)
        if (/[0-9]/.test(char)) {
            const frameName = `${char} bold instance 10000`;
            return this.frames[frameName] || this.getDefaultFrame();
        }

        // Carácter no reconocido
        console.warn(`Carácter no reconocido: "${char}"`);
        return this.getDefaultFrame();
    }

    static getDefaultFrame() {
        return this.frames['space bold instance 10000'] || { x: 0, y: 0, w: 32, h: 32 };
    }

    static drawText(scene, container, x, y, text, scale = 0.7) {
        container.removeAll(true);
        
        // Dividir en líneas si hay saltos de línea
        const lines = text.split('\n');
        let currentY = 0;
        
        for (const line of lines) {
            let currentX = 0;
            const lineContainer = scene.add.container(0, currentY);
            
            // Primera pasada: calcular ancho total
            let totalWidth = 0;
            const charData = [];
            
            for (const char of line) {
                const frame = this.getFrame(char);
                if (frame) {
                    const charWidth = frame.w * scale;
                    charData.push({ char, frame, width: charWidth });
                    totalWidth += charWidth + this.charSpacing;
                } else {
                    // Espacio por defecto para caracteres desconocidos
                    const defaultWidth = 25 * scale;
                    charData.push({ char, frame: null, width: defaultWidth });
                    totalWidth += defaultWidth;
                }
            }
            
            // Ajustar espaciado del último carácter
            if (charData.length > 0) {
                totalWidth -= this.charSpacing;
            }
            
            // Segunda pasada: dibujar caracteres
            for (const { char, frame, width } of charData) {
                if (frame) {
                    const sprite = scene.add.image(currentX, 0, 'alphabet')
                        .setOrigin(0, 0.5)
                        .setCrop(frame.x, frame.y, frame.w, frame.h)
                        .setScale(scale);
                    
                    lineContainer.add(sprite);
                }
                currentX += width + (frame ? this.charSpacing : 0);
            }
            
            // Centrar la línea horizontalmente
            lineContainer.x = -totalWidth / 2;
            container.add(lineContainer);
            currentY += this.lineHeight;
        }
        
        // Posicionar el contenedor principal
        container.setPosition(x, y);
        
        // Debug visual
        if (this.debug) {
            const bounds = container.getBounds();
            const debugRect = scene.add.rectangle(
                0, 0, bounds.width, bounds.height, 0xff0000, 0.2
            ).setOrigin(0.5);
            container.addAt(debugRect, 0);
        }
    }
}