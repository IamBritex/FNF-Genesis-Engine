export default class NewStage {
  constructor(scene) {
    this.scene = scene
    this.modalContainer = null
  }

  execute() {
    if (this.modalContainer) return
    this.createModal()
  }

  createModal() {
    const { width, height } = this.scene.scale

    // Crear overlay oscuro
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.7)
    overlay.setOrigin(0)
    
    // Crear contenedor modal
    this.modalContainer = this.scene.add.container(width/2, height/2)

    // Fondo del modal
    const modalBg = this.scene.add.rectangle(0, 0, 400, 200, 0x663399)
      .setStrokeStyle(2, 0x4a2c66)
    
    // Texto de advertencia
    const warningText = this.scene.add.text(0, -50, 
      "Are you sure?\nThis will erase your progress\nin this stage forever!", {
        fontSize: '20px',
        fill: '#FFFFFF',
        align: 'center',
        fontFamily: 'VCR'
      }).setOrigin(0.5)

    // Crear botones
    const buttonY = 40
    const buttonSpacing = 130

    // Botón Cancelar
    const cancelButton = this.createButton(-buttonSpacing, buttonY, "Cancelar", 0x4a2c66, () => {
      this.closeModal()
    })

    // Botón Guardar y Crear
    const saveButton = this.createButton(0, buttonY, "Guardar y Crear", 0x4a2c66, async () => {
      await this.scene.executeModule("SaveStage", "execute")
      this.resetStage()
      this.closeModal()
    })

    // Botón Crear
    const createButton = this.createButton(buttonSpacing, buttonY, "Crear", 0x4a2c66, () => {
      this.resetStage()
      this.closeModal()
    })

    // Agregar elementos al contenedor
    this.modalContainer.add([
      modalBg,
      warningText,
      cancelButton,
      saveButton,
      createButton
    ])

    // Hacer el modal parte del HUD
    this.scene.setAsHUDElement(this.modalContainer)
    this.scene.setAsHUDElement(overlay)

    // Guardar referencia al overlay
    this.overlay = overlay
  }

  createButton(x, y, text, color, callback) {
    const buttonWidth = 120
    const buttonHeight = 40
    
    const buttonContainer = this.scene.add.container(x, y)
    
    const buttonBg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, color)
      .setStrokeStyle(2, 0x7a4fcf)
    
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      fill: '#FFFFFF',
      fontFamily: 'VCR'
    }).setOrigin(0.5)

    buttonContainer.add([buttonBg, buttonText])
    
    buttonContainer.setInteractive(
      new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    )
    .on('pointerover', () => buttonBg.setFillStyle(0x7a4fcf))
    .on('pointerout', () => buttonBg.setFillStyle(color))
    .on('pointerdown', callback)

    return buttonContainer
  }

  resetStage() {
    // En lugar de limpiar manualmente, reiniciamos la escena
    this.scene.scene.restart()
  }

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.destroy()
      this.modalContainer = null
    }
    if (this.overlay) {
      this.overlay.destroy()
      this.overlay = null
    }
  }
}