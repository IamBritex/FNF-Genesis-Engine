export default class Alphabet extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, bold = false, scale = 1.2) {
    super(scene, x, y);
    this.scene = scene;
    this.text = text.toUpperCase();
    this.bold = bold;
    this.scale = scale;
    this.letters = [];
    this.spacing = 0 * scale;

    scene.add.existing(this);
    this.setVisible(true);
    this.createLetters();
  }

  createLetters() {
    // Limpiar letras existentes
    this.removeAll(true);
    this.letters = [];

    let xPos = 0;
    const texture = this.scene.textures.get("bold");

    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];
      const frameBase = this.getFrameBase(char);

      if (frameBase) {
        // Encontrar la primera variante de frame disponible
        const frameName = this.findFrameVariant(texture, frameBase);

        if (frameName) {
          const letter = this.scene.add.sprite(xPos, 0, "bold", frameName);

          letter.setOrigin(0.5, 0.5);
          letter.setScale(this.scale);

          this.add(letter);
          this.letters.push(letter);

          xPos += letter.width * this.scale + this.spacing;
        } else {
          xPos += 20 * this.scale;
        }
      } else {
        // Manejar espacios o caracteres no soportados
        xPos += 20 * this.scale;
      }
    }
  }

  findFrameVariant(texture, frameBase) {
    // Verificar variantes de frame (0000, 0001, etc.)
    for (let i = 0; i < 4; i++) {
      const frameName = `${frameBase}${i.toString().padStart(4, "0")}`;
      if (texture.has(frameName)) {
        return frameName;
      }
    }
    return null;
  }

  getFrameBase(char) {
    const specialChars = {
      "&": "-andpersand-",
      "@": "@",
      "!": "-exclamation point-",
      "?": "-question mark-",
      ".": "-period-",
      ",": "-comma-",
      "'": "-apostraphie-",
      '"': "-start quote-",
      "<": "-less than-",
      ">": "-greater than-",
      "/": "-forward slash-",
      "\\": "-back slash-",
      "|": "|",
      "-": "-dash-",
      _: "_",
      "+": "+",
      "*": "*",
      "=": "=",
      "^": "^",
      ":": ":",
      ";": ";",
      "(": "(",
      ")": ")",
      "[": "[",
      "]": "]",
      "{": "(",
      "}": ")",
      "~": "~",
      " ": null, // Espacio
    };

    // Verificar caracteres especiales primero
    if (specialChars[char] !== undefined) {
      return specialChars[char];
    }

    // Verificar letras (A-Z)
    if (/^[A-Z]$/.test(char)) {
      return char;
    }

    // Verificar números (0-9)
    if (/^[0-9]$/.test(char)) {
      return "#" + char;
    }

    return null;
  }

  setText(text) {
    this.text = text.toUpperCase();
    this.createLetters();
  }

  setScale(scale) {
    this.scale = scale;
    this.spacing = 5 * scale;
    this.letters.forEach((letter) => {
      letter.setScale(scale);
    });
  }

  setAlpha(alpha) {
    super.setAlpha(alpha);
    this.letters.forEach((letter) => letter.setAlpha(alpha));
  }

  setVisible(visible) {
    super.setVisible(visible);
    this.letters.forEach((letter) => letter.setVisible(visible));
  }

  destroy() {
    this.letters.forEach((letter) => letter.destroy());
    super.destroy();
  }

  get width() {
    if (this.letters.length === 0) return 0;
    const lastLetter = this.letters[this.letters.length - 1];
    return lastLetter.x + lastLetter.width * lastLetter.scaleX;
  }

  get height() {
    if (this.letters.length === 0) return 0;
    return this.letters[0].height * this.letters[0].scaleY;
  }
}