export default class TitleUiGroup {
  constructor(scene) {
    this.scene = scene
    this.currentSprite = null
    this.currentText = null
    this.imageMap = {
      yu: "yu.png",
      pearto: "pearto.png",
      getdown: "getdown.png",
      dropit: "dropit.png",
      ahhh: "ahhh.png",
      reed: "reed.png",
    }
    this.isLoading = false
    this.fontFamily = "NovaMono"
    this.getdownFrames = []
    this.reedFrames = []
    this.loadedTextures = new Set()
    this.lastUpdate = 0; // Para controlar el deltaTime
  }

  async init() {
    try {
      // Load font
      const font = new FontFace(this.fontFamily, "url(/public/mods/AKAGE/fonts/NovaMono-Regular.ttf)")
      await font.load()
      document.fonts.add(font)

      // Load XMLs
      const [getdownXML, reedXML] = await Promise.all([
        fetch("/public/mods/AKAGE/images/getdown.xml").then((r) => r.text()),
        fetch("/public/mods/AKAGE/images/reed.xml").then((r) => r.text()),
      ])

      this.getdownFrames = this.parseXML(getdownXML)
      this.reedFrames = this.parseXML(reedXML)
    } catch (error) {
      console.error("Error loading resources:", error)
    }
  }

  async define(...inputs) {
    // Handle array input format for off command
    if (Array.isArray(inputs[0]) && inputs[0][0] === "off") {
        const spriteToClean = inputs[0][1];
        this.cleanup(true, spriteToClean);
        return;
    }

    const [type, scale = 1, loop = -1, depth = 2] = inputs;

    if (type === "off") {
        // Clean everything if no specific sprite is specified
        this.cleanup(true);
        return;
    }

    // Limpiar elementos previos sin forzar
    this.cleanup(false);

    if (type === "text") {
        this.createText(scale);
        return;
    }

    if (!type || !this.imageMap[type]) {
        console.error("Invalid image name:", type);
        return;
    }

    try {
        await this.loadImage(type);
        await this.createSprite(type, scale, loop, depth);
    } catch (error) {
        console.error("Error showing image:", error);
    }
}

  createText(content) {
    this.currentText = this.scene.add.text(
      this.scene.game.config.width / 2,
      this.scene.game.config.height / 2,
      content,
      {
        fontFamily: this.fontFamily,
        fontSize: "120px",
        color: "#FF69B4",
        align: "center",
      },
    )

    this.currentText.setOrigin(0.5)
    this.currentText.setDepth(5)

    if (this.scene.cameraController && this.scene.cameraController.addToUILayer) {
      this.scene.cameraController.addToUILayer(this.currentText)
    }
  }

  parseXML(xmlText) {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, "text/xml")
    const frames = []

    const subTextures = xmlDoc.getElementsByTagName("SubTexture")

    for (let i = 0; i < subTextures.length; i++) {
      const frame = subTextures[i]
      const frameName = frame.getAttribute("name")
      frames.push({
        name: frameName,
        x: Number.parseInt(frame.getAttribute("x")),
        y: Number.parseInt(frame.getAttribute("y")),
        width: Number.parseInt(frame.getAttribute("width")),
        height: Number.parseInt(frame.getAttribute("height")),
        frameX: Number.parseInt(frame.getAttribute("frameX") || "0"),
        frameY: Number.parseInt(frame.getAttribute("frameY") || "0"),
        frameWidth: Number.parseInt(frame.getAttribute("frameWidth") || frame.getAttribute("width")),
        frameHeight: Number.parseInt(frame.getAttribute("frameHeight") || frame.getAttribute("height")),
        pivotX: Number.parseFloat(frame.getAttribute("pivotX") || "0"),
        pivotY: Number.parseFloat(frame.getAttribute("pivotY") || "0"),
      })
    }

    return frames
  }

  async loadImage(imageName) {
    if (this.isLoading) return
    this.isLoading = true

    const textureKey = `title_${imageName}`

    // Skip if already loaded
    if (this.loadedTextures.has(textureKey)) {
      this.isLoading = false
      return
    }

    return new Promise((resolve, reject) => {
      const filePath = `/public/mods/AKAGE/images/${this.imageMap[imageName]}`

      const loader = new Phaser.Loader.LoaderPlugin(this.scene)

      if (imageName === "getdown" || imageName === "reed") {
        const frames = imageName === "reed" ? this.reedFrames : this.getdownFrames

        if (!frames || frames.length === 0) {
          reject(new Error(`No frames found for ${imageName}`))
          return
        }

        // Load the image first
        loader.image(textureKey, filePath)

        loader.once(`filecomplete-image-${textureKey}`, () => {
          try {
            const texture = this.scene.textures.get(textureKey)

            // Add frames to the texture using the original frame names from XML
            frames.forEach((frame, index) => {
              // Use both the XML name and a numeric index for compatibility
              texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height)
              texture.add(index.toString(), 0, frame.x, frame.y, frame.width, frame.height)
            })

            console.log(`Loaded ${frames.length} frames for ${imageName}`)
            this.loadedTextures.add(textureKey)
            this.isLoading = false
            resolve()
          } catch (error) {
            console.error("Error processing frames:", error)
            this.isLoading = false
            reject(error)
          }
        })

        loader.once("loaderror", (file) => {
          console.error("Loader error:", file)
          this.isLoading = false
          reject(new Error(`Failed to load image: ${imageName}`))
        })

        loader.start()
      } else {
        // Regular image loading
        loader.image(textureKey, filePath)

        loader.once("complete", () => {
          this.loadedTextures.add(textureKey)
          this.isLoading = false
          resolve()
        })

        loader.once("loaderror", (file) => {
          console.error("Loader error:", file)
          this.isLoading = false
          reject(new Error(`Failed to load image: ${imageName}`))
        })

        loader.start()
      }
    })
  }

  update(time, delta) {
    if (!this.currentSprite?.active) return;

    // Actualizar deltaTime
    const deltaTime = time - this.lastUpdate;
    this.lastUpdate = time;

    try {
      if (this.currentSprite.anims) {
        // Actualizar la animación
        this.currentSprite.anims.update(time, deltaTime);
      }
    } catch (error) {
      console.error("Error updating animation:", error);
    }
  }

  async createSprite(imageName, customScale = 1, loop = -1, depth = 2) {
    const textureKey = `title_${imageName}`;

    if (!this.scene.textures.exists(textureKey)) {
        console.error("Texture not found:", textureKey);
        return;
    }

    try {
        // For animated sprites, use the first frame initially
        let initialFrame = undefined;
        if (imageName === "getdown" || imageName === "reed") {
            const frames = imageName === "reed" ? this.reedFrames : this.getdownFrames;
            if (frames && frames.length > 0) {
                initialFrame = frames[0].name;
            }
        }

        this.currentSprite = this.scene.add.sprite(
            this.scene.game.config.width / 2,
            this.scene.game.config.height / 2,
            textureKey,
            initialFrame,
        );

        this.currentSprite.setOrigin(0.5);
        this.currentSprite.setDepth(depth); // Use custom depth

        // Apply custom scale first
        this.currentSprite.setScale(customScale);

        // Then check if we need to scale down further to fit screen
        const maxWidth = this.scene.game.config.width * 0.8;
        const maxHeight = this.scene.game.config.height * 0.8;

        if (this.currentSprite.width > maxWidth || this.currentSprite.height > maxHeight) {
            const scaleX = maxWidth / this.currentSprite.width;
            const scaleY = maxHeight / this.currentSprite.height;
            const scale = Math.min(scaleX, scaleY);
            this.currentSprite.setScale(scale * customScale);
        }

        if (imageName === "getdown" || imageName === "reed") {
            const animKey = `${imageName}_anim`;

            if (!this.scene.anims.exists(animKey)) {
                const frames = imageName === "reed" ? this.reedFrames : this.getdownFrames;

                const animFrames = frames.map((frame) => ({
                    key: textureKey,
                    frame: frame.name
                }));

                // Simplificar la configuración de la animación
                this.scene.anims.create({
                    key: animKey,
                    frames: animFrames,
                    frameRate: 15,
                    repeat: loop // -1 para loop infinito, 0 para una sola vez
                });

                console.log(`Created animation ${animKey} with ${animFrames.length} frames`);
            }

            // Reproducir la animación
            this.currentSprite.play(animKey);
            
            // Mantener el sprite persistente hasta "off"
            this.currentSprite.persistent = true;
        }

        // Asegurarnos que el sprite persista
        this.currentSprite.persistent = true; // Flag personalizado
        
        // Make sure the sprite persists
        this.scene.add.existing(this.currentSprite);
        
        // Keep reference in scene
        if (!this.scene.titleSprites) {
            this.scene.titleSprites = new Set();
        }
        this.scene.titleSprites.add(this.currentSprite);

        // Make sure the sprite is visible
        this.currentSprite.setVisible(true);
        this.currentSprite.setAlpha(1);

        // Add to appropriate layer
        if (this.scene.cameraController) {
            if (imageName === "getdown" || imageName === "reed") {
                if (this.scene.cameraController.addToGameLayer) {
                    this.scene.cameraController.addToGameLayer(this.currentSprite);
                }
            } else {
                if (this.scene.cameraController.addToUILayer) {
                    this.scene.cameraController.addToUILayer(this.currentSprite);
                }
            }
        }

        console.log(`Created sprite for ${imageName}:`, {
            position: { x: this.currentSprite.x, y: this.currentSprite.y },
            dimensions: { width: this.currentSprite.width, height: this.currentSprite.height },
            scale: customScale,
            depth: depth,
            loop: loop
        });
    } catch (error) {
        console.error("Error creating sprite:", error);
    }
  }

  cleanup(force = false, specificSprite = null) {
    // Limpiar sprites específicos o todos según el caso
    if (this.scene.titleSprites) {
        for (const sprite of this.scene.titleSprites) {
            if (sprite?.active) {
                const spriteKey = sprite.texture.key;
                const shouldClean = force && (!specificSprite || 
                    (specificSprite && spriteKey === `title_${specificSprite}`));

                if (shouldClean) {
                    if (sprite.anims) {
                        sprite.anims.stop();
                    }
                    sprite.destroy();
                    this.scene.titleSprites.delete(sprite);
                }
            }
        }
    }

    // Si estamos limpiando un sprite específico y es el actual
    if (this.currentSprite?.active) {
        const shouldClean = force && (!specificSprite || 
            (specificSprite && this.currentSprite.texture.key === `title_${specificSprite}`));

        if (shouldClean) {
            if (this.currentSprite.anims) {
                this.currentSprite.anims.stop();
            }
            this.currentSprite.destroy();
            this.currentSprite = null;
        }
    }

    // Solo limpiar el texto si es una limpieza general
    if (this.currentText?.active && force && !specificSprite) {
        this.currentText.destroy();
        this.currentText = null;
    }

    this.isLoading = false;

    // Debug log
    console.log(`Cleanup executed: force=${force}, specificSprite=${specificSprite}`);
  }

  // Add this method to ensure proper destruction
  destroy() {
    if (this.scene.titleSprites) {
        for (const sprite of this.scene.titleSprites) {
            if (sprite?.active) {
                sprite.destroy();
            }
        }
        this.scene.titleSprites.clear();
    }
    this.cleanup();
}
}