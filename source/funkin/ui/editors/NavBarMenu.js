export default class NavBarMenu {
    constructor(scene) {
        this.scene = scene
        this.activeDropdown = null
        this.activeDropdownButton = null
        this.dropdownItems = []
    }

    create(config) {
        const { width } = this.scene.scale
        const navHeight = 30

        const navContainer = this.scene.add.container(0, 0)
        const navBar = this.scene.add.rectangle(0, 0, width, navHeight, 0x663399).setOrigin(0, 0)
        navBar.setDepth(1000)
        navContainer.add(navBar)

        const buttonWidth = 100
        const buttonSpacing = 10
        let xOffset = buttonSpacing

        config.buttons.forEach((btn) => {
            const button = this.createButton(xOffset, 0, buttonWidth, navHeight, btn.name, 0x4a2c66, "#FFFFFF", btn.items)
            navContainer.add(button)
            xOffset += buttonWidth + buttonSpacing
        })

        navContainer.setDepth(1000)
        this.scene.setAsHUDElement(navContainer)
    }

    createButton(x, y, width, height, text, color = 0x4a2c66, textColor = "#FFFFFF", dropdownItems = []) {
        const button = this.scene.add.container(x, y)
        const bg = this.scene.add.rectangle(0, 0, width, height, color).setOrigin(0, 0)
        const label = this.scene.add
            .text(width / 2, height / 2, text, {
                fontSize: "18px",
                fill: textColor,
                fontFamily: "VCR",
            })
            .setOrigin(0.5)

        button.add([bg, label])

        button.setInteractive({
            hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            cursor: "pointer",
        })

        button.dropdownItems = dropdownItems
        button.isPointerOver = false
        button.originalColor = color
        button.hoverColor = 0x7a4fcf

        button.on("pointerover", () => {
            button.isPointerOver = true
            if (this.activeDropdown && this.activeDropdownButton !== button) {
                this.showDropdown(button, x, y + height, width)
            } else if (!this.activeDropdown) {
                bg.setFillStyle(button.hoverColor)
            }
        })

        button.on("pointerout", () => {
            button.isPointerOver = false
            if (this.activeDropdownButton !== button) {
                bg.setFillStyle(button.originalColor)
            }
        })

        button.on("pointerdown", () => {
            if (this.activeDropdown && this.activeDropdownButton === button) {
                this.hideDropdown()
            } else {
                this.showDropdown(button, x, y + height, width)
            }
        })

        return button
    }

    showDropdown(button, x, y, buttonWidth) {
        this.hideDropdown()

        if (button.dropdownItems.length === 0) return

        const itemHeight = 30
        const dropdownHeight = button.dropdownItems.length * itemHeight
        const dropdownColor = 0x7a4fcf
        const hoverColor = 0x8a6fdf
        const dropdownWidth = buttonWidth * 1.5

        const dropdownContainer = this.scene.add.container(x, y)
        dropdownContainer.setDepth(1100)
        this.scene.setAsHUDElement(dropdownContainer)

        const dropdownBg = this.scene.add
            .rectangle(0, 0, dropdownWidth, dropdownHeight, dropdownColor)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x4a2c66)

        dropdownContainer.add(dropdownBg)

        button.dropdownItems.forEach((itemData, index) => {
            const itemY = index * itemHeight
            const itemBg = this.scene.add.rectangle(0, itemY, dropdownWidth, itemHeight, dropdownColor).setOrigin(0, 0)
            const itemText = this.scene.add
                .text(10, itemY + itemHeight / 2, itemData.name, {
                    fontSize: "16px",
                    fill: "#FFFFFF",
                    fontFamily: "VCR",
                })
                .setOrigin(0, 0.5)

            itemBg.setInteractive({
                hitArea: new Phaser.Geom.Rectangle(0, 0, dropdownWidth, itemHeight),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                cursor: "pointer",
            })

            itemBg.on("pointerover", () => {
                itemBg.setFillStyle(hoverColor)
                if (this.activeDropdownButton) {
                    const buttonBg = this.activeDropdownButton.list[0]
                    if (buttonBg && buttonBg.setFillStyle) {
                        buttonBg.setFillStyle(this.activeDropdownButton.hoverColor)
                    }
                }
            })

            itemBg.on("pointerout", () => {
                itemBg.setFillStyle(dropdownColor)
            })

            itemBg.on("pointerdown", () => {
                this.scene.executeModule(itemData.module, itemData.method)
                this.hideDropdown()
            })

            dropdownContainer.add([itemBg, itemText])
            this.dropdownItems.push(itemBg)
        })

        dropdownBg.setInteractive()
        this.setupDropdownEvents(dropdownBg, button)

        this.activeDropdown = dropdownContainer
        this.activeDropdownButton = button

        const buttonBg = button.list[0]
        if (buttonBg && buttonBg.setFillStyle) {
            buttonBg.setFillStyle(button.hoverColor)
        }
    }

    setupDropdownEvents(dropdownBg, button) {
        dropdownBg.on("pointerover", () => {
            if (this.activeDropdownButton) {
                const buttonBg = this.activeDropdownButton.list[0]
                if (buttonBg && buttonBg.setFillStyle) {
                    buttonBg.setFillStyle(this.activeDropdownButton.hoverColor)
                }
            }
        })

        dropdownBg.on("pointerout", (pointer) => {
            if (this.activeDropdownButton) {
                const buttonBounds = this.activeDropdownButton.getBounds()
                if (!buttonBounds.contains(pointer.x, pointer.y)) {
                    const buttonBg = this.activeDropdownButton.list[0]
                    if (buttonBg && buttonBg.setFillStyle) {
                        if (this.activeDropdownButton.isPointerOver) {
                            buttonBg.setFillStyle(this.activeDropdownButton.hoverColor)
                        } else {
                            buttonBg.setFillStyle(this.activeDropdownButton.originalColor)
                        }
                    }
                }
            }
        })
    }

    hideDropdown() {
        if (this.activeDropdown) {
            this.activeDropdown.destroy()
            this.activeDropdown = null

            if (this.activeDropdownButton) {
                const bg = this.activeDropdownButton.list[0]
                if (bg && bg.setFillStyle) {
                    if (this.activeDropdownButton.isPointerOver) {
                        bg.setFillStyle(this.activeDropdownButton.hoverColor)
                    } else {
                        bg.setFillStyle(this.activeDropdownButton.originalColor)
                    }
                }
                this.activeDropdownButton = null
            }

            this.dropdownItems = []
        }
    }

    isDropdownActive() {
        return this.activeDropdown !== null
    }

    getActiveDropdown() {
        return this.activeDropdown
    }
}