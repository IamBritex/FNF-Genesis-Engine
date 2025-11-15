export default class UIBuilder {
  constructor(scene, colors) {
    this.scene = scene
    this.colors = colors
  }

  createButton(x, y, text, callback) {
    const button = this.scene.add
      .text(x, y, text, {
        fontSize: "20px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" })
      .on("pointerdown", callback)
      .on("pointerover", () => button.setTint(this.colors.buttonHover))
      .on("pointerout", () => button.clearTint())

    return button
  }

  createPropertyControl(y, label, value, decreaseCallback, increaseCallback) {
    const container = this.scene.add.container(0, y)

    const labelText = this.scene.add.text(0, 0, label, {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    const decreaseBtn = this.scene.add
      .text(130, 0, "<", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setInteractive({ cursor: "pointer" })
      .on("pointerdown", decreaseCallback)
      .on("pointerover", () => decreaseBtn.setTint(this.colors.buttonHover))
      .on("pointerout", () => decreaseBtn.clearTint())

    const valueText = this.scene.add.text(150, 0, value, {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    const increaseBtn = this.scene.add
      .text(190, 0, ">", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setInteractive({ cursor: "pointer" })
      .on("pointerdown", increaseCallback)
      .on("pointerover", () => increaseBtn.setTint(this.colors.buttonHover))
      .on("pointerout", () => increaseBtn.clearTint())

    container.add([labelText, decreaseBtn, valueText, increaseBtn])
    return { container, valueText }
  }

  createCheckbox(y, label, toggleCallback) {
    const container = this.scene.add.container(0, y)

    const labelText = this.scene.add.text(0, 0, label, {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    const checkbox = this.scene.add
      .rectangle(130, 10, 20, 20, 0x666666)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ cursor: "pointer" })
      .on("pointerdown", toggleCallback)

    const checkMark = this.scene.add
      .text(133, 10, "✓", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setVisible(false)

    container.add([labelText, checkbox, checkMark])
    return { container, checkMark }
  }

  createLabelValue(y, label, value) {
    const container = this.scene.add.container(0, y)

    const labelText = this.scene.add.text(0, 0, label, {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    const valueText = this.scene.add.text(130, 0, value, {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    container.add([labelText, valueText])
    return { container, valueText }
  }
}
