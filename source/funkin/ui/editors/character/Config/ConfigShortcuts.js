export default class ConfigShortcuts {
    constructor(scene) {
        this.scene = scene
        this.modalContainer = null
        this.shortcuts = [
            { key: "Ctrl + S", description: "Save character as JSON", action: "saveJson" },
            { key: "Ctrl + Shift + S", description: "Save all files (JSON, PNG, XML)", action: "saveAll" },
            { key: "Space", description: "Replay current animation", action: "replayAnimation" },
            { key: "Q", description: "Previous animation", action: "prevAnimation" },
            { key: "E", description: "Next animation", action: "nextAnimation" },
            { key: "Arrows", description: "Move sprite by 5px", action: "move5px" },
            { key: "Shift + Arrows", description: "Move sprite by 1px", action: "move1px" },
            { key: "Ctrl + Arrows", description: "Move sprite by 10px", action: "move10px" },
            { key: "Ctrl + Z", description: "Undo last action", action: "undo" },
            { key: "Ctrl + Y", description: "Redo last action", action: "redo" }
        ]
        
        // Historial para undo/redo
        this.undoStack = []
        this.redoStack = []
        
        // Cargar sonidos
        this.loadSounds()
    }

    loadSounds() {
        // Cargar sonidos si no existen
        if (!this.scene.cache.audio.exists('openWindow')) {
            this.scene.load.audio('openWindow', 'public/assets/audio/sounds/editor/openWindow.ogg')
        }
        if (!this.scene.cache.audio.exists('exitWindow')) {
            this.scene.load.audio('exitWindow', 'public/assets/audio/sounds/editor/exitWindow.ogg')
        }
        if (!this.scene.cache.audio.exists('undo')) {
            this.scene.load.audio('undo', 'public/assets/audio/sounds/editor/undo.ogg')
        }
        
        // Iniciar la carga si hay nuevos archivos
        if (this.scene.load.list.size > 0) {
            this.scene.load.once('complete', () => {
                this.setupSounds()
            })
            this.scene.load.start()
        } else {
            this.setupSounds()
        }
    }

    setupSounds() {
        this.openWindowSound = this.scene.sound.add('openWindow')
        this.exitWindowSound = this.scene.sound.add('exitWindow')
        this.undoSound = this.scene.sound.add('undo')
    }

    show() {
        if (this.modalContainer) {
            this.modalContainer.destroy()
        }

        const { width, height } = this.scene.scale
        const modalWidth = 600
        const modalHeight = 400

        // Crear el contenedor modal centrado
        this.modalContainer = this.scene.add.container(
            width / 2 - modalWidth / 2,
            height / 2 - modalHeight / 2
        )

        // Fondo modal
        const bg = this.scene.add.rectangle(0, 0, modalWidth, modalHeight, 0x2A2A3A)
            .setOrigin(0)
            .setStrokeStyle(2, 0x663399)

        // Título
        const title = this.scene.add.text(modalWidth / 2, 20, "Keyboard Shortcuts", {
            fontSize: "24px",
            fill: "#FFFFFF",
            fontFamily: "VCR"
        }).setOrigin(0.5, 0)

        this.modalContainer.add([bg, title])

        // Crear tabla de atajos
        const startY = 70
        const rowHeight = 35
        const col1Width = 200
        const col2Width = 300

        // Headers
        this.createTableHeader("Shortcut", 20, startY, col1Width)
        this.createTableHeader("Description", col1Width + 40, startY, col2Width)

        // Rows
        this.shortcuts.forEach((shortcut, index) => {
            const rowY = startY + 40 + (index * rowHeight)
            this.createTableRow(shortcut, 20, rowY, col1Width, col2Width)
        })

        // Botón cerrar
        const closeBtn = this.scene.add.rectangle(
            modalWidth - 30,
            10,
            20,
            20,
            0xFF4444
        ).setInteractive({ cursor: 'pointer' })

        const closeText = this.scene.add.text(
            modalWidth - 30,
            10,
            '✕',
            {
                fontSize: '16px',
                fill: '#FFFFFF',
                fontFamily: 'VCR'
            }
        ).setOrigin(0.5)

        closeBtn.on('pointerdown', () => this.hide())
        closeText.setInteractive({ cursor: 'pointer' })
            .on('pointerdown', () => this.hide())

        this.modalContainer.add([closeBtn, closeText])
        this.modalContainer.setDepth(3000)

        // Registrar como elemento HUD
        if (typeof this.scene.setAsHUDElement === 'function') {
            this.scene.setAsHUDElement(this.modalContainer)
        }

        this.openWindowSound?.play()

        this.setupGlobalShortcuts()
    }

    createTableHeader(text, x, y, width) {
        const headerBg = this.scene.add.rectangle(x, y, width, 30, 0x663399)
            .setOrigin(0)
        const headerText = this.scene.add.text(x + 10, y + 15, text, {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'VCR'
        }).setOrigin(0, 0.5)

        this.modalContainer.add([headerBg, headerText])
    }

    createTableRow(shortcut, x, y, col1Width, col2Width) {
        const rowBg = this.scene.add.rectangle(x, y, col1Width + col2Width + 20, 30, 0x3A3A4A)
            .setOrigin(0)
        const shortcutText = this.scene.add.text(x + 10, y + 15, shortcut.key, {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'VCR'
        }).setOrigin(0, 0.5)
        const descText = this.scene.add.text(x + col1Width + 30, y + 15, shortcut.description, {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'VCR'
        }).setOrigin(0, 0.5)

        this.modalContainer.add([rowBg, shortcutText, descText])
    }

    hide() {
        if (this.modalContainer) {
            this.exitWindowSound?.play()
            this.modalContainer.destroy()
            this.modalContainer = null
        }
    }

    setupGlobalShortcuts() {
        // Remover listeners anteriores si existen
        this.removeExistingListeners()

        const keyboard = this.scene.input.keyboard
        if (!keyboard) return

        // Save JSON (Ctrl + S)
        keyboard.on('keydown-S', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                event.preventDefault()
                this.scene.moduleRegistry.get('SaveJson')?.execute()
            }
        })

        // Save All (Ctrl + Shift + S)
        keyboard.on('keydown-S', (event) => {
            if (event.ctrlKey && event.shiftKey) {
                event.preventDefault()
                this.scene.moduleRegistry.get('SaveAll')?.execute()
            }
        })

        // Space - Replay animation
        keyboard.on('keydown-SPACE', () => {
            const animPanel = this.scene.moduleRegistry.get('AnimationsPanel')
            if (animPanel) {
                const currentChar = this.getCurrentCharacter()
                if (currentChar?.currentAnimation) {
                    animPanel.playAnimation({
                        name: currentChar.currentAnimation,
                        anim: currentChar.currentAnimation
                    })
                }
            }
        })

        // Q - Previous animation
        keyboard.on('keydown-Q', () => {
            this.changeAnimation('prev')
        })

        // E - Next animation
        keyboard.on('keydown-E', () => {
            this.changeAnimation('next')
        })

        // Movement shortcuts
        this.setupMovementShortcuts()

        // Añadir Undo/Redo
        keyboard.on('keydown-Z', (event) => {
            if (event.ctrlKey) {
                event.preventDefault()
                this.undo()
            }
        })

        keyboard.on('keydown-Y', (event) => {
            if (event.ctrlKey) {
                event.preventDefault()
                this.redo()
            }
        })
    }

    setupMovementShortcuts() {
        const keyboard = this.scene.input.keyboard
        if (!keyboard) return

        // Teclas de movimiento
        const keys = ['UP', 'DOWN', 'LEFT', 'RIGHT']
        const distances = {
            normal: 5,
            shift: 1,
            ctrl: 10
        }

        keys.forEach(key => {
            keyboard.on(`keydown-${key}`, (event) => {
                const char = this.getCurrentCharacter()
                if (!char?.sprite) return

                let distance = distances.normal
                if (event.shiftKey) distance = distances.shift
                if (event.ctrlKey) distance = distances.ctrl

                switch (key) {
                    case 'UP':
                        char.sprite.y -= distance
                        break
                    case 'DOWN':
                        char.sprite.y += distance
                        break
                    case 'LEFT':
                        char.sprite.x -= distance
                        break
                    case 'RIGHT':
                        char.sprite.x += distance
                        break
                }

                // Actualizar posición original
                char.originalX = char.sprite.x
                char.originalY = char.sprite.y
            })
        })
    }

    getCurrentCharacter() {
        if (!this.scene.charactersManager?.loadedCharacters) return null
        return Array.from(this.scene.charactersManager.loadedCharacters.values())[0]
    }

    changeAnimation(direction) {
        const char = this.getCurrentCharacter();
        if (!char?.data?.animations) return;

        const animations = char.data.animations;
        const currentIndex = animations.findIndex(a => 
            (a.name || a.anim) === char.currentAnimation
        );

        let newIndex;
        if (direction === 'next') {
            newIndex = currentIndex === animations.length - 1 ? 0 : currentIndex + 1;
        } else {
            newIndex = currentIndex <= 0 ? animations.length - 1 : currentIndex - 1;
        }

        const newAnimation = animations[newIndex];
        
        if (newAnimation) {
            const animKey = `${char.textureKey}_${newAnimation.name || newAnimation.anim}`;
            
            char.currentAnimation = newAnimation.name || newAnimation.anim;
            
            char.sprite.setPosition(char.originalX || 0, char.originalY || 0);
            
            if (newAnimation.offsets) {
                char.sprite.x += newAnimation.offsets[0];
                char.sprite.y += newAnimation.offsets[1];
            }
            
            if (this.scene.anims.exists(animKey)) {
                const anim = this.scene.anims.get(animKey);
                anim.repeat = newAnimation.loop ? -1 : 0;
                char.sprite.play(animKey);
                
                const animPanel = this.scene.moduleRegistry.get('AnimationsPanel');
                if (animPanel?.modalContainer) {
                    animPanel.refreshContent();
                }
            }
        }
    }

    // Métodos para undo/redo
    addToUndoStack(action) {
        this.undoStack.push(action)
        this.redoStack = [] // Limpiar redo stack cuando se hace una nueva acción
    }

    undo() {
        if (this.undoStack.length > 0) {
            const action = this.undoStack.pop()
            this.redoStack.push(action)
            this.undoSound?.play()
            this.executeUndo(action)
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const action = this.redoStack.pop()
            this.undoStack.push(action)
            this.undoSound?.play()
            this.executeRedo(action)
        }
    }

    executeUndo(action) {
        // Implementar la lógica de deshacer según el tipo de acción
        switch (action.type) {
            case 'move':
                const char = this.getCurrentCharacter()
                if (char?.sprite) {
                    char.sprite.x = action.oldX
                    char.sprite.y = action.oldY
                }
                break
            // Añadir más casos según necesites
        }
    }

    executeRedo(action) {
        // Implementar la lógica de rehacer según el tipo de acción
        switch (action.type) {
            case 'move':
                const char = this.getCurrentCharacter()
                if (char?.sprite) {
                    char.sprite.x = action.newX
                    char.sprite.y = action.newY
                }
                break
            // Añadir más casos según necesites
        }
    }

    removeExistingListeners() {
        const keyboard = this.scene.input.keyboard
        if (!keyboard) return

        keyboard.removeListener('keydown-S')
        keyboard.removeListener('keydown-SPACE')
        keyboard.removeListener('keydown-Q')
        keyboard.removeListener('keydown-E')
        keyboard.removeListener('keydown-UP')
        keyboard.removeListener('keydown-DOWN')
        keyboard.removeListener('keydown-LEFT')
        keyboard.removeListener('keydown-RIGHT')
        keyboard.removeListener('keydown-Z')
        keyboard.removeListener('keydown-Y')
    }

    destroy() {
        this.removeExistingListeners()
        this.hide()
    }
}