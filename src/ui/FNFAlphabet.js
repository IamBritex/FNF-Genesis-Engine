export default class FNFAlphabet {
  constructor(scene, spriteSheetKey) {
    this.scene = scene;
    this.spriteSheetKey = spriteSheetKey;
    this.charData = {}; // Diccionario con los datos de cada carácter

    this.loadXMLData(); // Cargar datos del XML
  }

  loadXMLData() {
    
    const xmlText = this.scene.cache.text.get('alphabetXML');
    if (!xmlText) {
      console.error("❌ No se pudo cargar el archivo alphabet.xml");
      return;
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const subTextures = xml.getElementsByTagName("SubTexture");

    console.log("📜 Lista de nombres en XML:");
    for (let subTexture of subTextures) {
      let fullName = subTexture.getAttribute("name");
      console.log(fullName); // Verificar los nombres en la consola

      // Extraer el primer carácter de la primera palabra en el nombre
      let match = fullName.match(/^([a-zA-Z0-9])/i);
      if (!match) continue;

      let char = match[0].toLowerCase(); // Convertir a minúscula

      let x = parseInt(subTexture.getAttribute("x"));
      let y = parseInt(subTexture.getAttribute("y"));
      let width = parseInt(subTexture.getAttribute("width"));
      let height = parseInt(subTexture.getAttribute("height"));

      // Evitar sobrescribir caracteres si ya existen
      if (!this.charData[char]) {
        this.charData[char] = { x, y, width, height };
      }
    }

    console.log("✅ Caracteres cargados:", this.charData);
  }

  renderText(text, x, y, scale = 1) {
    const characters = text.toLowerCase().split('');
    const sprites = [];
    let currentX = x;

    characters.forEach(char => {
      if (char === ' ') {
        currentX += 30 * scale;
        return;
      }

      if (this.charData[char]) {
        const { x: frameX, y: frameY, width, height } = this.charData[char];

        const sprite = this.scene.add.image(currentX, y, this.spriteSheetKey)
          .setCrop(frameX, frameY, width, height)
          .setScale(scale)
          .setOrigin(0, 0.5); // Alinear verticalmente

        sprites.push(sprite);
        currentX += (width + 5) * scale;
      } else {
        console.warn(`⚠ Carácter no encontrado en el XML: ${char}`);
        currentX += 20 * scale;
      }
    });

    return sprites;
  }
}
