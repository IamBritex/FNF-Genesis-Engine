export class HealthBar {
  constructor(scene, options = {}) {
    this.scene = scene
    this.health = 1 // 1 = 50% health (centro)
    this.minHealth = 0 // Puede llegar a 0 (sin vida)
    this.maxHealth = 2 // Puede llegar al doble de vida (100%)

    // Añadir variables para el BPM bounce
    this.lastBeatTime = 0
    this.bpm = scene.songData?.song?.bpm || 100
    this.beatInterval = (60 / this.bpm) * 1000 // Convertir BPM a milisegundos

    // Initialize iconFrames object
    this.iconFrames = {
      p1: 0,
      p2: 0,
    }

    this.config = {
      position: {
        x: this.scene.cameras.main.width / 2,
        y: this.scene.cameras.main.height - 70,
      },
      scale: 1.2,
      colors: {
        // Usar el color recibido solo si es un número válido
        p1: typeof options.p1Color === "number" && !isNaN(options.p1Color) ? options.p1Color : 0x00ff00,
        p2: typeof options.p2Color === "number" && !isNaN(options.p2Color) ? options.p2Color : 0xff0000,
      },
      icons: {
        p1: options.p1Icon || "face",
        p2: options.p2Icon || "face",
      },
    }

    // Añadir propiedades para el bouncing
    this.iconBounceScale = 0.7
    this.iconBounceDuration = 0.2
    this.iconTweens = {
      p1: null,
      p2: null,
    }

    this.init()
  }

  init() {
    this.container = this.scene.add.container(this.config.position.x, this.config.position.y)

    // Crear la barra de fondo
    this.backgroundBar = this.scene.add.image(0, 0, "healthBar")
    this.backgroundBar.setScale(this.config.scale)
    this.backgroundBar.setOrigin(0.5)

    // Crear las barras de salud
    this.createHealthBars()

    // Crear los iconos
    this.createIcons()

    // Añadir todo al contenedor en el orden correcto
    this.container.add([this.p1HealthBar, this.p2HealthBar, this.backgroundBar, this.p1Icon, this.p2Icon])

    this.container.setDepth(90)
    this.updateBar()
  }

  createHealthBars() {
    const width = this.backgroundBar.width * this.config.scale
    const height = this.backgroundBar.height * this.config.scale

    this.p1HealthBar = this.scene.add.graphics()
    this.p2HealthBar = this.scene.add.graphics()

    // Posicionar las barras correctamente
    this.p1HealthBar.x = -width / 2 // Verde a la izquierda
    this.p2HealthBar.x = -width / 2 // Rojo empieza desde el mismo punto

    this.p1HealthBar.y = -height / 2
    this.p2HealthBar.y = -height / 2

    this.drawHealthBars(width, height)
  }

  createIcons() {
    const width = this.backgroundBar.width * this.config.scale

    const p1IconKey = `icon-${this.config.icons.p1}`
    const p2IconKey = `icon-${this.config.icons.p2}`

    if (this.scene.textures.exists(p1IconKey)) {
      const p1Texture = this.scene.textures.get(p1IconKey)
      const p1Frame = p1Texture.get(0)

      // Get the actual dimensions of the texture
      const p1Width = p1Frame.width
      const p1Height = p1Frame.height

      console.log(`P1 Icon dimensions: ${p1Width}x${p1Height}`)

      // If the sprite is a single image with two frames side by side
      // We need to create a spritesheet dynamically
      if (p1Width > p1Height * 1.5) {
        // If width is significantly larger than height, likely has two frames
        const frameWidth = Math.floor(p1Width / 2)

        // If the texture doesn't already have frames defined
        if (p1Texture.frameTotal <= 1) {
          console.log(`Dividing P1 sprite into frames: ${frameWidth}x${p1Height}`)

          // Create a new frame collection for this texture
          p1Texture.add("__BASE", 0, 0, 0, p1Width, p1Height)

          // Add frames to the texture - NORMAL frame (left half)
          p1Texture.add(0, 0, 0, 0, frameWidth, p1Height)

          // LOSING frame (right half)
          p1Texture.add(1, 0, frameWidth, 0, frameWidth, p1Height)

          // Update frame count
          this.iconFrames.p1 = 2
        } else {
          this.iconFrames.p1 = p1Texture.frameTotal
        }
      } else {
        this.iconFrames.p1 = p1Texture.frameTotal
      }

      // Create player 1 sprite (right)
      this.p1Icon = this.scene.add.sprite(
        width / 4,
        0,
        p1IconKey,
        0, // initial frame (neutral)
      )
      console.log(`P1 Icon frames: ${this.iconFrames.p1}`)
      this.p1Icon.setOrigin(0.5)
      this.p1Icon.setScale(this.iconBounceScale)
      this.p1Icon.setFlipX(true) // Añadir esta línea para hacer flip horizontal
    }

    if (this.scene.textures.exists(p2IconKey)) {
      const p2Texture = this.scene.textures.get(p2IconKey)
      const p2Frame = p2Texture.get(0)

      // Get the actual dimensions of the texture
      const p2Width = p2Frame.width
      const p2Height = p2Frame.height

      console.log(`P2 Icon dimensions: ${p2Width}x${p2Height}`)

      // If the sprite is a single image with two frames side by side
      if (p2Width > p2Height * 1.5) {
        // If width is significantly larger than height, likely has two frames
        const frameWidth = Math.floor(p2Width / 2)

        // If the texture doesn't already have frames defined
        if (p2Texture.frameTotal <= 1) {
          console.log(`Dividing P2 sprite into frames: ${frameWidth}x${p2Height}`)

          // Create a new frame collection for this texture
          p2Texture.add("__BASE", 0, 0, 0, p2Width, p2Height)

          // Add frames to the texture - NORMAL frame (left half)
          p2Texture.add(0, 0, 0, 0, frameWidth, p2Height)

          // LOSING frame (right half)
          p2Texture.add(1, 0, frameWidth, 0, frameWidth, p2Height)

          // Update frame count
          this.iconFrames.p2 = 2
        } else {
          this.iconFrames.p2 = p2Texture.frameTotal
        }
      } else {
        this.iconFrames.p2 = p2Texture.frameTotal
      }

      // Create player 2 sprite (left)
      this.p2Icon = this.scene.add.sprite(
        -width / 4,
        0,
        p2IconKey,
        0, // initial frame (neutral)
      )
      console.log(`P2 Icon frames: ${this.iconFrames.p2}`)
      this.p2Icon.setOrigin(0.5)
      this.p2Icon.setScale(this.iconBounceScale)
    }
  }

  drawHealthBars(width, height) {
    this.p1HealthBar.clear()
    this.p2HealthBar.clear()

    const halfWidth = width / 2

    // Dibujar barra verde (jugador) desde la derecha
    this.p1HealthBar.fillStyle(this.config.colors.p1)
    this.p1HealthBar.fillRect(0, 0, halfWidth, height)

    // Dibujar barra roja (enemigo) desde la izquierda
    this.p2HealthBar.fillStyle(this.config.colors.p2)
    this.p2HealthBar.fillRect(0, 0, halfWidth, height)
  }

  bounceIcon(icon, scale) {
    if (this.iconTweens[icon]) {
      this.iconTweens[icon].kill()
    }

    const targetIcon = icon === "p1" ? this.p1Icon : this.p2Icon

    this.iconTweens[icon] = gsap.to(targetIcon, {
      scaleX: scale,
      scaleY: scale,
      duration: this.iconBounceDuration,
      ease: "elastic.out(1, 0.5)",
      onComplete: () => {
        gsap.to(targetIcon, {
          scaleX: this.iconBounceScale,
          scaleY: this.iconBounceScale,
          duration: this.iconBounceDuration,
          ease: "elastic.out(1, 0.5)",
        })
      },
    })
  }

  updateBar() {
    const width = this.backgroundBar.width * this.config.scale
    const height = this.backgroundBar.height * this.config.scale
    const totalWidth = width

    this.p1HealthBar.clear()
    this.p2HealthBar.clear()

    const healthPercent = Phaser.Math.Clamp(this.health, 0, 2)
    const halfWidth = totalWidth / 2

    // Calculate green width based on health (0-2)
    const greenWidth = halfWidth * healthPercent
    const redWidth = totalWidth - greenWidth

    // Draw green bar (right)
    this.p1HealthBar.fillStyle(this.config.colors.p1)
    this.p1HealthBar.fillRect(totalWidth - greenWidth, 0, greenWidth, height)

    // Draw red bar (left)
    this.p2HealthBar.fillStyle(this.config.colors.p2)
    this.p2HealthBar.fillRect(0, 0, redWidth, height)

    // Calculate icon positions based on health bars
    const iconOffset = 50; // Ajusta este valor para la distancia del icono al borde de la barra

    // P1 (verde) ahora se comporta como P2
    this.p1Icon.x = -halfWidth + redWidth + iconOffset;
    
    // P2 (rojo) ahora se comporta como P1
    this.p2Icon.x = halfWidth - greenWidth - iconOffset;

    // Remover el bounce basado en salud
    this.p1Icon.setScale(0.7);
    this.p2Icon.setScale(0.7);

    // Actualizar frames de los iconos basado en la salud
    if (this.p1Icon && this.p2Icon) {
      this.p1Icon.setFrame(0); // frame normal para jugador
      this.p2Icon.setFrame(0); // frame normal para oponente

      if (healthPercent < 0.2 && this.iconFrames.p1 > 1) {
        this.p1Icon.setFrame(1); // frame losing para jugador
      } else if (healthPercent > 1.8 && this.iconFrames.p2 > 1) {
        this.p2Icon.setFrame(1); // frame losing para oponente
      }
    }
  }

  updateBeatBounce(currentTime) {
    if (!this.lastBeatTime || currentTime - this.lastBeatTime >= this.beatInterval) {
      this.bounceIcons();
      this.lastBeatTime = currentTime;
    }
  }

  bounceIcons() {
    const bounceScale = 0.8;
    const normalScale = 0.7;
    const duration = 0.1;

    if (this.p1Icon) {
      gsap.to(this.p1Icon, {
        scaleX: bounceScale,
        scaleY: bounceScale,
        duration: duration,
        ease: "linear",
        onComplete: () => {
          gsap.to(this.p1Icon, {
            scaleX: normalScale,
            scaleY: normalScale,
            duration: duration,
            ease: "linear"
          });
        }
      });
    }

    if (this.p2Icon) {
      gsap.to(this.p2Icon, {
        scaleX: bounceScale,
        scaleY: bounceScale,
        duration: duration,
        ease: "linear",
        onComplete: () => {
          gsap.to(this.p2Icon, {
            scaleX: normalScale,
            scaleY: normalScale,
            duration: duration,
            ease: "linear"
          });
        }
      });
    }
  }

  setHealth(value) {
    // Limitamos el valor entre 0 y 2 para evitar que se salga de la imagen
    this.health = Phaser.Math.Clamp(value, 0, 2)
    this.updateBar()
  }

  // Modificamos la lógica de daño y curación para que coincida con FNF
  damage(amount) {
    // Al recibir daño, la barra verde se reduce hacia la derecha
    this.setHealth(this.health - amount)
  }

  heal(amount) {
    // Al curarse, la barra verde crece hacia la izquierda
    this.setHealth(this.health + amount)
  }

  destroy() {
    if (this.iconTweens.p1) this.iconTweens.p1.kill()
    if (this.iconTweens.p2) this.iconTweens.p2.kill()
    this.container.destroy()
  }
}
