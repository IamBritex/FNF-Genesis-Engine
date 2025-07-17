// Función para convertir formato de atlas personalizado al formato de Phaser
function convertAtlasFormat(customFormat) {
  const phaserFormat = {
    frames: {},
    meta: {
      app: "https://www.codeandweb.com/texturepacker",
      version: "1.0",
      image: customFormat.TextureAtlas.imagePath,
      format: "RGBA8888",
      size: { w: 512, h: 512 },
      scale: "1",
    },
  }

  // Convertir cada SubTexture al formato de frame de Phaser
  customFormat.TextureAtlas.SubTextures.forEach((subTexture) => {
    phaserFormat.frames[subTexture.name] = {
      frame: {
        x: subTexture.x,
        y: subTexture.y,
        w: subTexture.width,
        h: subTexture.height,
      },
      sourceSize: {
        w: subTexture.width,
        h: subTexture.height,
      },
      spriteSourceSize: {
        x: 0,
        y: 0,
        w: subTexture.width,
        h: subTexture.height,
      },
    }
  })

  return phaserFormat
}

// Ejemplo de uso:
const customAtlas = {
  TextureAtlas: {
    imagePath: "bold.png",
    SubTextures: [
      // Tu array de SubTextures existente
    ],
  },
}

const phaserAtlas = convertAtlasFormat(customAtlas)
console.log(JSON.stringify(phaserAtlas, null, 2))

// También se puede usar directamente en el navegador:
// window.convertAtlasFormat = convertAtlasFormat;
