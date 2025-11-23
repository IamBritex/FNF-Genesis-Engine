export default class ConfigTheme {
    constructor(scene) {
        this.scene = scene
        this.modalContainer = null
        this.modalBg = null
        this.currentTheme = this.scene.currentTheme || 'light'
    }

    execute() {
        this.showThemeModal()
    }

    showThemeModal() {
        const { width, height } = this.scene.scale

        this.modalBg = this.scene.add
            .rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setDepth(4000)
            .setInteractive()

        const modalWidth = 300
        const modalHeight = 200
        this.modalContainer = this.scene.add.container(width / 2, height / 2)
            .setDepth(4001)

        const dialogBg = this.scene.add.rectangle(
            0, 
            0, 
            modalWidth, 
            modalHeight, 
            0x2a2a3a
        )
        .setStrokeStyle(2, 0x663399)

        const title = this.scene.add.text(
            0,
            -60,
            'Select Theme',
            {
                fontSize: '24px',
                fill: '#FFFFFF',
                fontFamily: 'VCR',
                align: 'center'
            }
        ).setOrigin(0.5)

        // Botón Light Theme con texto oscuro
        const lightBtn = this.createThemeButton(
            -70,
            20,
            'Light',
            0xFFFFFF,
            '#000000', // Texto oscuro para el botón light
            () => this.setTheme('light')
        )

        // Botón Dark Theme con texto blanco
        const darkBtn = this.createThemeButton(
            70,
            20,
            'Dark',
            0x333333,
            '#FFFFFF', // Texto blanco para el botón dark
            () => this.setTheme('dark')
        )

        // Marcar el tema actual
        const activeBtn = this.currentTheme === 'light' ? lightBtn : darkBtn
        activeBtn.getAt(0).setStrokeStyle(3, 0x00ff00)

        this.modalContainer.add([dialogBg, title, lightBtn, darkBtn])

        this.scene.setAsHUDElement(this.modalBg)
        this.scene.setAsHUDElement(this.modalContainer)

        this.modalBg.on('pointerdown', () => {
            this.closeModal()
        })
    }

    // Nuevo método para cerrar el modal
    closeModal() {
        if (this.modalBg) {
            this.modalBg.destroy()
            this.modalBg = null
        }
        if (this.modalContainer) {
            this.modalContainer.destroy()
            this.modalContainer = null
        }
    }

    createThemeButton(x, y, text, bgColor, textColor, callback) {
        const button = this.scene.add.container(x, y)
        
        const bg = this.scene.add.rectangle(
            0,
            0,
            100,
            40,
            bgColor
        )
        .setStrokeStyle(2, 0x666666)

        const label = this.scene.add.text(
            0,
            0,
            text,
            {
                fontSize: '16px',
                fill: textColor,
                fontFamily: 'VCR'
            }
        ).setOrigin(0.5)

        button.add([bg, label])

        button.setInteractive({
            hitArea: new Phaser.Geom.Rectangle(-50, -20, 100, 40),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            cursor: 'pointer'
        })

        button.on('pointerover', () => {
            bg.setStrokeStyle(2, 0x888888)
        })

        button.on('pointerout', () => {
            bg.setStrokeStyle(2, 0x666666)
        })

        button.on('pointerdown', () => {
            callback()
            // Actualizar el patrón de ajedrez
            this.updateCheckerboardPattern()
            // Cerrar el modal
            this.closeModal()
        })

        return button
    }

    setTheme(theme) {
        this.scene.currentTheme = theme
        localStorage.setItem('editorTheme', theme)
        
        // Actualizar el patrón inmediatamente
        this.updateCheckerboardPattern()
        
        // Recrear el patrón en el editor
        if (this.scene.createCheckerboardPattern) {
            // Eliminar el sprite existente del patrón
            const existingPattern = this.scene.children.list.find(
                child => child.texture && child.texture.key === 'checkerboardPattern'
            )
            if (existingPattern) {
                existingPattern.destroy()
            }
            
            // Crear nuevo patrón
            this.scene.createCheckerboardPattern()
        }
    }

    updateCheckerboardPattern() {
        // Eliminar textura existente si existe
        if (this.scene.textures.exists('checkerboardPattern')) {
            this.scene.textures.remove('checkerboardPattern')
        }

        const squareSize = 10
        const patternSize = squareSize * 2
        const canvas = document.createElement('canvas')
        canvas.width = patternSize
        canvas.height = patternSize
        const ctx = canvas.getContext('2d')

        // Colores según el tema
        const lightColor = this.scene.currentTheme === 'light' ? '#FFFFFF' : '#333333'
        const darkColor = this.scene.currentTheme === 'light' ? '#F0F0F0' : '#2A2A2A'

        // Dibujar patrón
        ctx.fillStyle = lightColor
        ctx.fillRect(0, 0, squareSize, squareSize)
        ctx.fillStyle = darkColor
        ctx.fillRect(squareSize, 0, squareSize, squareSize)
        ctx.fillStyle = darkColor
        ctx.fillRect(0, squareSize, squareSize, squareSize)
        ctx.fillStyle = lightColor
        ctx.fillRect(squareSize, squareSize, squareSize, squareSize)

        // Crear nueva textura
        this.scene.textures.addCanvas('checkerboardPattern', canvas)

        // Actualizar todos los sprites existentes que usan esta textura
        const sprites = this.scene.children.list.filter(
            child => child.texture && child.texture.key === 'checkerboardPattern'
        )

        sprites.forEach(sprite => {
            sprite.setTexture('checkerboardPattern')
        })
    }
}