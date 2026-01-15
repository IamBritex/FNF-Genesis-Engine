import { AlphabetData } from './AlphabetData.js';

export default class Alphabet extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {string} text 
     * @param {boolean} bold 
     * @param {number} scale 
     */
    constructor(scene, x, y, text, bold = false, scale = 1.0) {
        super(scene, x, y);
        this.scene = scene;
        this.text = text;
        this.bold = bold;
        this.scale = scale;
        this.letters = [];
        this.spacing = 0 * scale;

        scene.add.existing(this);
        this.setVisible(true);
        this.createLetters();
    }

    /**
     * Helper Estático: Llama a esto en el PRELOAD de tu escena (ej: MainMenu o Loader)
     * @param {Phaser.Scene} scene 
     */
    static load(scene) {
        // Carga la imagen desde la ruta que indicaste
        scene.load.image('alphabet', 'public/images/ui/alphabet.png');
    }

    /**
     * Helper Estático: Llama a esto en el CREATE de tu escena antes de crear cualquier texto.
     * Inyecta la data del alfabeto en el sistema de texturas.
     * @param {Phaser.Scene} scene 
     */
    static createAtlas(scene) {
        if (!scene.textures.exists('bold')) {
            // Usamos la imagen 'alphabet' cargada y le aplicamos el JSON de AlphabetData
            const alphabetImg = scene.textures.get('alphabet').getSourceImage();
            scene.textures.addAtlas('bold', alphabetImg, AlphabetData);
        }
    }

    createLetters() {
        // Asegurar que el atlas exista (por si se les olvidó llamar a createAtlas)
        if (!this.scene.textures.exists('bold')) {
            Alphabet.createAtlas(this.scene);
        }

        this.removeAll(true);
        this.letters = [];

        let xPos = 0;
        
        // Mapeo de caracteres especiales a sus prefijos en el XML/JSON
        const specialChars = {
            "#": "hashtag",
            "$": "dollarsign",
            "%": "%",
            "&": "amp",
            "(": "start parentheses",
            ")": "end parentheses",
            "*": "*",
            "+": "+",
            "-": "-",
            "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
            "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
            ":": ":",
            ";": ";",
            "<": "<",
            "=": "=",
            ">": ">",
            "@": "@",
            "[": "[",
            "\\": "\\",
            "]": "]",
            "^": "^",
            "_": "_",
            "'": "apostraphie",
            "!": "exclamation point",
            "?": "question mark",
            ".": "period",
            ",": "comma",
            "|": "|",
            "~": "~",
            "/": "forward slash",
            " ": null 
        };

        for (let i = 0; i < this.text.length; i++) {
            const char = this.text[i];
            let prefix = "";

            // 1. Determinar el prefijo base del sprite
            if (specialChars[char] !== undefined) {
                prefix = specialChars[char];
            } 
            else if (/^[A-Z]$/.test(char)) {
                prefix = char + (this.bold ? " bold" : " capital");
            } 
            else if (/^[a-z]$/.test(char)) {
                prefix = char + " lowercase";
            } 
            else {
                prefix = char; // Intento fallback
            }

            // Manejo de espacio
            if (prefix === null) {
                xPos += 40 * this.scale;
                continue;
            }

            // 2. Crear y reproducir animación
            const animKey = this.getOrCreateAnimation(prefix);

            if (animKey) {
                // Crear el sprite usando el primer frame de la animación
                const letter = this.scene.add.sprite(xPos, 0, "bold");
                
                // Reproducir animación
                letter.play(animKey);

                letter.setOrigin(0, 0.5);
                letter.setScale(this.scale);

                this.add(letter);
                this.letters.push(letter);

                xPos += letter.width * this.scale + this.spacing;
            } else {
                // Si no se encuentra, dejamos un espacio vacío por seguridad
                xPos += 20 * this.scale;
            }
        }
    }

    /**
     * Busca o crea una animación para el prefijo dado (ej: "A bold").
     * @param {string} prefix 
     * @returns {string|null} La clave de la animación o null si no existe.
     */
    getOrCreateAnimation(prefix) {
        // El nombre de la animación será igual al prefijo
        const animKey = prefix;

        // Si ya existe la animación, la devolvemos
        if (this.scene.anims.exists(animKey)) {
            return animKey;
        }

        // Si no existe, intentamos crearla buscando frames que empiecen con el prefijo
        const texture = this.scene.textures.get('bold');
        const allFrames = texture.getFrameNames();
        
        // Buscamos frames que empiecen con "prefix" (ej: "A bold0000", "A bold0001")
        // Nota: Agregamos un chequeo para asegurarnos que coincida bien (evitar conflictos parciales)
        const animationFrames = allFrames.filter(frame => frame.startsWith(prefix));

        if (animationFrames.length > 0) {
            // Ordenamos los frames para asegurar que van 0000, 0001, etc.
            animationFrames.sort();

            this.scene.anims.create({
                key: animKey,
                frames: animationFrames.map(frameName => ({ key: 'bold', frame: frameName })),
                frameRate: 24,
                repeat: -1 // Loop infinito
            });
            return animKey;
        }

        return null;
    }

    setText(text) {
        this.text = text;
        this.createLetters();
    }

    setScale(scale) {
        this.scale = scale;
        this.createLetters();
    }

    setAlpha(alpha) {
        super.setAlpha(alpha);
        this.letters.forEach((letter) => letter.setAlpha(alpha));
    }

    setVisible(visible) {
        super.setVisible(visible);
        this.letters.forEach((letter) => letter.setVisible(visible));
    }
}