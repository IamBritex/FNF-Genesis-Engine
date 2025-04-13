export class ModalWindows {
    constructor() {
        this.ModalWindow = class ModalWindow {
          constructor(scene, options = {}) {
            this.scene = scene
            this.camera = scene.cameras.main
        
            // Default options
            this.x = options.x || 100
            this.y = options.y || 100
            this.width = options.width || 300
            this.height = options.height || 150
            this.title = options.title || "Character Editor"
            this.backgroundColor = options.backgroundColor || 0x2c3e50
            this.titleColor = options.titleColor || 0x3498db
            this.textColor = options.textColor || 0xffffff
            this.alpha = options.alpha !== undefined ? options.alpha : 0.9
            this.padding = options.padding || 10
        
            // State variables
            this.isMinimized = false
            this.isDragging = false
            this.dragOffset = { x: 0, y: 0 }
            this.characterData = null
        
            // Create the modal container
            this.createModal()
        
            // Add event listeners
            this.addEventListeners()
          }
        
          createModal() {
            this.container = this.scene.add.container(this.x, this.y)
            this.container.setDepth(1000)
        
            // Asegurarse de que el contenedor no se mueva con el scroll
            this.container.setScrollFactor(0)
        
            // Añadir el contenedor a la capa de modales
            if (this.scene.modalLayer) {
              this.scene.modalLayer.add(this.container)
            }
        
            this.height = 200 // Increase height to accommodate save button
            this.panel = this.scene.add.rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
            this.panel.setOrigin(0, 0)
            this.container.add(this.panel)
        
            // Title bar
            this.titleBar = this.scene.add.rectangle(0, 0, this.width, 30, this.titleColor, this.alpha)
            this.titleBar.setOrigin(0, 0)
            this.container.add(this.titleBar)
        
            // Title text
            this.titleText = this.scene.add.text(10, 5, this.title, { fontSize: "16px", fill: "#ffffff" })
            this.container.add(this.titleText)
        
            // Close button
            this.closeButton = this.scene.add.text(this.width - 30, 5, "X", { fontSize: "16px", fill: "#ffffff" })
            this.closeButton.setInteractive({ useHandCursor: true })
            this.closeButton.on("pointerdown", () => this.close())
            this.container.add(this.closeButton)
        
            // Minimize button
            this.minimizeButton = this.scene.add.text(this.width - 50, 5, "_", { fontSize: "16px", fill: "#ffffff" })
            this.minimizeButton.setInteractive({ useHandCursor: true })
            this.minimizeButton.on("pointerdown", () => this.toggleMinimize())
            this.container.add(this.minimizeButton)
        
            // Content area
            this.contentArea = this.scene.add.container(this.padding, 40)
            this.container.add(this.contentArea)
        
            // Add file input instructions
            this.fileInputText = this.scene.add.text(0, 0, "Load Character JSON:", { fontSize: "14px", fill: "#ffffff" })
            this.contentArea.add(this.fileInputText)
        
            // Add load button
            this.loadButton = this.scene.add.rectangle(0, 30, 150, 30, 0x3498db, 1)
            this.loadButton.setOrigin(0, 0)
            this.contentArea.add(this.loadButton)
        
            this.loadButtonText = this.scene.add.text(75, 45, "Load JSON File", { fontSize: "14px", fill: "#ffffff" })
            this.loadButtonText.setOrigin(0.5, 0.5)
            this.contentArea.add(this.loadButtonText)
        
            // Make load button interactive
            this.loadButton.setInteractive({ useHandCursor: true })
            this.loadButton.on("pointerdown", () => this.openFileDialog())
        
            // Add save button
            this.saveButton = this.scene.add.rectangle(0, 70, 150, 30, 0x27ae60, 1)
            this.saveButton.setOrigin(0, 0)
            this.contentArea.add(this.saveButton)
        
            this.saveButtonText = this.scene.add.text(75, 85, "Save Character", { fontSize: "14px", fill: "#ffffff" })
            this.saveButtonText.setOrigin(0.5, 0.5)
            this.contentArea.add(this.saveButtonText)
        
            // Make save button interactive
            this.saveButton.setInteractive({ useHandCursor: true })
            this.saveButton.on("pointerdown", () => this.saveCharacter())
        
            // Move status text down
            this.statusText = this.scene.add.text(0, 110, "No character data loaded", { fontSize: "14px", fill: "#ffffff" })
            this.contentArea.add(this.statusText)
        
            // Create an invisible file input element
            this.createFileInput()
        
            // Hacer la ventana modal exclusiva
            this.makeModalExclusive();
          }
        
          createFileInput() {
            // Create a file input element in the DOM
            const fileInput = document.createElement("input")
            fileInput.type = "file"
            fileInput.id = "character-file-input"
            fileInput.accept = ".json"
            fileInput.style.display = "none"
            document.body.appendChild(fileInput)
        
            // Add event listener for file selection
            fileInput.addEventListener("change", (event) => {
              const file = event.target.files[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  try {
                    const jsonData = JSON.parse(e.target.result)
                    this.loadCharacterData(jsonData)
                  } catch (error) {
                    this.statusText.setText(`Error parsing JSON: ${error.message}`)
                  }
                }
                reader.readAsText(file)
              }
            })
        
            this.fileInput = fileInput
          }
        
          openFileDialog() {
            // Trigger the file input click
            if (this.fileInput) {
              this.fileInput.click()
            }
          }
        
          loadCharacterData(data) {
            this.characterData = data
        
            // Update status text to just show "Loaded!"
            this.statusText.setText("Loaded!")
        
            console.log("Character data loaded:", data)
        
            // Store the data in the scene for reference
            this.scene.characterData = data
        
            // Load the character in the scene
            this.scene.loadCharacter(data)
        
            // Create the animations modal
            this.createAnimationsModal(data)
        
            // Create the character properties modal
            this.createCharacterPropertiesModal(data)
        
            // Create the character configs modal
            this.createCharacterConfigsModal(data)
          }
        
          createAnimationsModal(data) {
            // Check if we have animations data
            if (data && data.animations && data.animations.length > 0) {
                // Create a new modal for animations
                if (this.scene.animsModal) {
                    this.scene.animsModal.close();
                }

                // Use the constructor from the ModalWindows class
                const AnimationsModal = this.scene.AnimationsModal;
                if (!AnimationsModal) {
                    console.error('AnimationsModal class is not defined');
                    return;
                }

                this.scene.animsModal = new AnimationsModal(this.scene, {
                    x: this.x + this.width + 20,
                    y: this.y,
                    width: 300,
                    height: 600,
                    title: "CharacterAnims",
                    animations: data.animations,
                    imagePath: data.image,
                });
            }
          }
        
          createCharacterPropertiesModal(data) {
            // Create a new modal for character properties
            if (this.scene.characterPropertiesModal) {
                this.scene.characterPropertiesModal.close();
            }

            // Use the constructor from the ModalWindows class
            const CharacterPropertiesModal = this.scene.CharacterPropertiesModal;
            if (!CharacterPropertiesModal) {
                console.error('CharacterPropertiesModal class is not defined');
                return;
            }

            this.scene.characterPropertiesModal = new CharacterPropertiesModal(this.scene, {
                x: this.x + this.width + 340,
                y: this.y,
                width: 350,
                height: 450,
                characterData: data,
            });
          }
        
          createCharacterConfigsModal(data) {
            // Create a new modal for character configs
            if (this.scene.characterConfigsModal) {
                this.scene.characterConfigsModal.close();
            }

            // Use the constructor from the ModalWindows class
            const CharacterConfigsModal = this.scene.CharacterConfigsModal;
            if (!CharacterConfigsModal) {
                console.error('CharacterConfigsModal class is not defined');
                return;
            }

            this.scene.characterConfigsModal = new CharacterConfigsModal(this.scene, {
                x: this.x,
                y: this.y + this.height + 20,
                width: 300,
                height: 200,
                characterData: data,
            });
          }
        
          addEventListeners() {
            // Make title bar draggable
            this.titleBar.setInteractive({ useHandCursor: true })
        
            this.titleBar.on("pointerdown", (pointer) => {
              this.isDragging = true
              this.dragOffset.x = pointer.x - this.container.x
              this.dragOffset.y = pointer.y - this.container.y
            })
        
            this.scene.input.on("pointermove", (pointer) => {
              if (this.isDragging) {
                this.container.x = pointer.x - this.dragOffset.x
                this.container.y = pointer.y - this.dragOffset.y
              }
            })
        
            this.scene.input.on("pointerup", () => {
              this.isDragging = false
            })
        
            // Make sure the modal stays in the camera view
            this.scene.events.on("update", this.updatePosition, this)
          }
        
          updatePosition() {
            const bounds = {
              left: 0,
              top: 0,
              right: this.scene.scale.width,
              bottom: this.scene.scale.height,
            }
        
            if (this.container.x < bounds.left) {
              this.container.x = bounds.left
            } else if (this.container.x + this.width > bounds.right) {
              this.container.x = bounds.right - this.width
            }
        
            if (this.container.y < bounds.top) {
              this.container.y = bounds.top
            } else if (this.container.y + this.height > bounds.bottom) {
              this.container.y = bounds.bottom - this.height
            }
          }
        
          toggleMinimize() {
            this.isMinimized = !this.isMinimized
        
            if (this.isMinimized) {
              // Hide content area and resize panel
              this.contentArea.setVisible(false)
              this.panel.height = 30
            } else {
              // Show content area and restore panel size
              this.contentArea.setVisible(true)
              this.panel.height = this.height
            }
          }
        
          close() {
            // Remove the file input from DOM
            if (this.fileInput && this.fileInput.parentNode) {
              this.fileInput.parentNode.removeChild(this.fileInput)
            }
        
            // Remove event listeners
            this.scene.events.off("update", this.updatePosition, this)
        
            // Emit modal closed event
            this.scene.events.emit('modalClosed')
        
            // Clear the reference in the scene
            this.scene.modal = null
        
            // Destroy the container
            this.container.destroy()
          }
        
          saveCharacter() {
            if (!this.characterData) {
              this.statusText.setText("No character data to save")
              return
            }
        
            try {
              // Convert the character data to JSON
              const jsonData = JSON.stringify(this.characterData, null, 2)
        
              // Create a blob with the JSON data
              const blob = new Blob([jsonData], { type: "application/json" })
        
              // Create a URL for the blob
              const url = URL.createObjectURL(blob)
        
              // Create a temporary link element
              const a = document.createElement("a")
              a.href = url
        
              // Set the filename to the original name or a default
              const filename = this.characterData.image ? `${this.characterData.image}.json` : "character.json"
              a.download = filename
        
              // Append the link to the body
              document.body.appendChild(a)
        
              // Trigger the download
              a.click()
        
              // Clean up
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
        
              this.statusText.setText("Character saved!")
            } catch (error) {
              console.error("Error saving character:", error)
              this.statusText.setText(`Error saving: ${error.message}`)
            }
          }
        
          makeModalExclusive() {
            // Hacer que el panel bloquee eventos
            this.panel.setInteractive({
                useHandCursor: false,
                hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, this.height),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                cursor: 'default'
            });
        
            // Hacer que la barra de título bloquee eventos
            this.titleBar.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, 30),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains
            });
        
            // Añadir control de profundidad al hacer click
            const bringToFront = () => {
                if (this.scene.modalLayer) {
                    this.scene.modalLayer.bringToTop(this.container);
                }
            };
        
            this.panel.on('pointerdown', bringToFront);
            this.titleBar.on('pointerdown', (pointer) => {
                bringToFront();
                // Iniciar arrastre solo si es la barra de título
                this.isDragging = true;
                this.dragOffset.x = pointer.x - this.container.x;
                this.dragOffset.y = pointer.y - this.container.y;
            });
          }
        }

        this.AnimationsModal = class AnimationsModal {
          constructor(scene, options = {}) {
            this.scene = scene
            this.camera = scene.cameras.main
        
            // Default options
            this.x = options.x || 400
            this.y = options.y || 100
            this.width = options.width || 300
            this.height = options.height || 600 // Updated height
            this.title = "Animations"
            this.backgroundColor = 0x2c3e50
            this.titleColor = 0x3498db
            this.alpha = 0.9
            this.padding = 10
        
            // Animations data
            this.animations = options.animations || []
            this.imagePath = options.imagePath
        
            // State variables
            this.isMinimized = false
            this.isDragging = false
            this.dragOffset = { x: 0, y: 0 }
            this.animTextObjects = []
        
            this.createModal()
            this.addEventListeners()
          }
        
          createModal() {
            // Container setup
            this.container = this.scene.add.container(this.x, this.y)
            this.container.setDepth(1000)
            this.container.setScrollFactor(0)
        
            // Add to modal layer
            if (this.scene.modalLayer) {
              this.scene.modalLayer.add(this.container)
            }
        
            // Background
            this.panel = this.scene.add
              .rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
              .setOrigin(0, 0)
            this.container.add(this.panel)
        
            // Title bar
            this.titleBar = this.scene.add
              .rectangle(0, 0, this.width, 30, this.titleColor, this.alpha)
              .setOrigin(0, 0)
            this.container.add(this.titleBar)
        
            // Title text
            this.titleText = this.scene.add.text(10, 5, this.title, {
              fontSize: "16px",
              fill: "#ffffff",
            })
            this.container.add(this.titleText)
        
            // Setup buttons
            this.setupButtons()
        
            // Create content area
            this.contentContainer = this.scene.add.container(this.padding, 40)
            this.container.add(this.contentContainer)
        
            // Create animations list
            this.createAnimationsList()
        
            // Make modal exclusive
            this.makeModalExclusive()
          }
        
          setupButtons() {
            // Close button
            this.closeButton = this.scene.add
                .text(this.width - 30, 5, "X", {
                    fontSize: "16px",
                    fill: "#ffffff",
                })
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => this.close())
            this.container.add(this.closeButton)
        
            // Minimize button
            this.minimizeButton = this.scene.add
                .text(this.width - 50, 5, "_", {
                    fontSize: "16px",
                    fill: "#ffffff",
                })
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => this.toggleMinimize())
            this.container.add(this.minimizeButton)
          }
        
          createAnimationsList() {
            let yPos = 0
            this.animTextObjects = []
        
            this.animations.forEach((anim, index) => {
              const animName = anim.anim || "unnamed"
              const offsets = anim.offsets || [0, 0]
        
              const animText = this.scene.add.text(
                0,
                yPos,
                `${animName} [${offsets[0]}, ${offsets[1]}]`,
                { fontSize: "14px", fill: "#ffffff" }
              )
        
              animText.setInteractive({ useHandCursor: true })
              
              animText.on("pointerover", () => {
                if (this.scene.currentAnimation !== animName) {
                  animText.setStyle({ fill: "#3498db" })
                }
              })
              
              animText.on("pointerout", () => {
                if (this.scene.currentAnimation !== animName) {
                  animText.setStyle({ fill: "#ffffff" })
                }
              })
              
              animText.on("pointerdown", () => {
                this.scene.playAnimation(animName)
                this.highlightSelectedAnimation(index)
              })
        
              this.contentContainer.add(animText)
              this.animTextObjects.push(animText)
              yPos += 25
            })
          }
        
          highlightSelectedAnimation(selectedIndex) {
            this.animTextObjects.forEach((text, index) => {
              text.setStyle({
                fill: index === selectedIndex ? "#3498db" : "#ffffff"
              })
            })
          }
        
          updateAnimationText(animName, offsets) {
            const index = this.animations.findIndex(a => a.anim === animName)
            if (index !== -1 && this.animTextObjects[index]) {
              this.animTextObjects[index].setText(`${animName} [${offsets[0]}, ${offsets[1]}]`)
            }
          }
        
          makeModalExclusive() {
            this.panel.setInteractive({
              useHandCursor: false,
              hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, this.height),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
              cursor: 'default'
            })
        
            this.titleBar.setInteractive({
              useHandCursor: true,
              hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, 30),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
              cursor: 'default'
            })
        
            const bringToFront = () => {
              if (this.scene.modalLayer) {
                this.scene.modalLayer.bringToTop(this.container)
              }
            }
        
            this.panel.on('pointerdown', bringToFront)
            this.titleBar.on('pointerdown', (pointer) => {
              bringToFront()
              this.isDragging = true
              this.dragOffset.x = pointer.x - this.container.x
              this.dragOffset.y = pointer.y - this.container.y
            })
          }
        
          addEventListeners() {
            this.scene.input.on("pointermove", (pointer) => {
              if (this.isDragging) {
                this.container.x = pointer.x - this.dragOffset.x
                this.container.y = pointer.y - this.dragOffset.y
              }
            })
        
            this.scene.input.on("pointerup", () => {
              this.isDragging = false
            })
        
            this.scene.events.on("update", this.updatePosition, this)
          }
        
          updatePosition() {
            const bounds = {
              left: 0,
              top: 0,
              right: this.scene.scale.width,
              bottom: this.scene.scale.height
            }
        
            if (this.container.x < bounds.left) {
              this.container.x = bounds.left
            } else if (this.container.x + this.width > bounds.right) {
              this.container.x = bounds.right - this.width
            }
        
            if (this.container.y < bounds.top) {
              this.container.y = bounds.top
            } else if (this.container.y + this.height > bounds.bottom) {
              this.container.y = bounds.bottom - this.height
            }
          }
        
          toggleMinimize() {
            this.isMinimized = !this.isMinimized
            if (this.isMinimized) {
              this.contentContainer.setVisible(false)
              this.panel.height = 30
            } else {
              this.contentContainer.setVisible(true)
              this.panel.height = this.height
            }
          }
        
          close() {
            this.scene.events.off("update", this.updatePosition, this)
            this.scene.events.emit('animsModalClosed')
            
            // Clear the reference in the scene
            this.scene.animsModal = null
            
            this.container.destroy()
          }
        }

        this.CharacterPropertiesModal = class CharacterPropertiesModal {
          constructor(scene, options = {}) {
            this.scene = scene
            this.camera = scene.cameras.main
        
            // Default options
            this.x = options.x || 800 // Positioned to the right of animations modal
            this.y = options.y || 100
            this.width = options.width || 350 // Updated width
            this.height = options.height || 450 // Increased height
            this.title = "Character Properties"
            this.backgroundColor = 0x2c3e50
            this.titleColor = 0x3498db
            this.alpha = 0.9
            this.padding = 10
        
            // Properties data
            this.characterData = options.characterData || {}
        
            // State variables
            this.isMinimized = false
            this.isDragging = false
            this.dragOffset = { x: 0, y: 0 }
        
            this.createModal()
            this.addEventListeners()
          }
        
          createModal() {
            // Container setup
            this.container = this.scene.add.container(this.x, this.y)
            this.container.setDepth(1000)
        
            // Asegurarse de que el contenedor no se mueva con el scroll
            this.container.setScrollFactor(0)
        
            // Añadir el contenedor a la capa de modales
            if (this.scene.modalLayer) {
              this.scene.modalLayer.add(this.container)
            }
        
            // Background
            this.panel = this.scene.add
              .rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
              .setOrigin(0, 0)
            this.container.add(this.panel)
        
            // Title bar
            this.titleBar = this.scene.add.rectangle(0, 0, this.width, 30, this.titleColor, this.alpha).setOrigin(0, 0)
            this.container.add(this.titleBar)
        
            // Title text
            this.titleText = this.scene.add.text(10, 5, this.title, {
              fontSize: "16px",
              fill: "#ffffff",
            })
            this.container.add(this.titleText)
        
            // Minimize/Close buttons
            this.setupButtons()
        
            // Content area
            this.contentArea = this.scene.add.container(this.padding, 40)
            this.container.add(this.contentArea)
        
            // Create animations and display properties directly
            this.createAnims()
            this.displayProperties()
        
            // Hacer la ventana modal exclusiva
            this.makeModalExclusive();
          }
        
          createAnims() {
            if (!this.scene.anims.exists('checkbox_select')) {
                // Cambiar los nombres de los frames para que coincidan con el XML
                this.scene.anims.create({
                    key: 'checkbox_select',
                    frames: this.scene.anims.generateFrameNames('checkboxThingie', {
                        prefix: 'Check Box selecting animation',
                        zeroPad: 4,
                        start: 0,
                        end: 10
                    }),
                    frameRate: 24,
                    repeat: 0
                });
        
                this.scene.anims.create({
                    key: 'checkbox_selected',
                    frames: this.scene.anims.generateFrameNames('checkboxThingie', {
                        prefix: 'Check Box Selected Static',
                        zeroPad: 4,
                        start: 0,
                        end: 1
                    }),
                    frameRate: 24,
                    repeat: 0
                });
        
                this.scene.anims.create({
                    key: 'checkbox_unselected',
                    frames: this.scene.anims.generateFrameNames('checkboxThingie', {
                        prefix: 'Check Box unselected',
                        zeroPad: 4,
                        start: 0,
                        end: 0
                    }),
                    frameRate: 24
                });
            }
          }
        
          setupButtons() {
            // Close button
            this.closeButton = this.scene.add
              .text(this.width - 30, 5, "X", {
                fontSize: "16px",
                fill: "#ffffff",
              })
              .setInteractive({ useHandCursor: true })
              .on("pointerdown", () => this.close())
            this.container.add(this.closeButton)
        
            // Minimize button
            this.minimizeButton = this.scene.add
              .text(this.width - 50, 5, "_", {
                fontSize: "16px",
                fill: "#ffffff",
              })
              .setInteractive({ useHandCursor: true })
              .on("pointerdown", () => this.toggleMinimize())
            this.container.add(this.minimizeButton)
          }
        
          displayProperties() {
            // First clear any existing content
            this.contentArea.removeAll()
            
            const properties = {
              "Anti-aliasing": {
                type: "boolean",
                value: !this.characterData.no_antialiasing,
                updateFn: (value) => this.characterData.no_antialiasing = !value
              },
              "Position": {
                type: "array",
                value: this.characterData.position || [0, 0]
              },
              "Camera Position": {
                type: "array",
                value: this.characterData.camera_position || [0, 0]
              },
              "Sing Duration": {
                type: "number",
                value: this.characterData.sing_duration || 4
              },
              "Flip X": {
                type: "boolean",
                value: this.characterData.flip_x || false,
                updateFn: (newValue) => {
                    // Actualizar el valor en characterData
                    this.characterData.flip_x = newValue;
                    
                    // Actualizar el sprite inmediatamente
                    if (this.scene.characterSprite) {
                        this.scene.characterSprite.setFlipX(newValue);
                    }
                    if (this.scene.ghostSprite) {
                        this.scene.ghostSprite.setFlipX(newValue);
                    }
                }
              },
              "Scale": {
                type: "number",
                value: this.characterData.scale || 1
              },
              "Is Player": {
                type: "boolean",
                value: this.characterData._editor_isPlayer || false,
                updateFn: (value) => this.characterData._editor_isPlayer = value
              },
              "Image Path": {
                type: "text",
                value: this.characterData.image || "Not set"
              },
              "JSON Version": {
                type: "text",
                value: this.characterData.json_version || "1.0"
              },
              "Sprite Type": {
                type: "text",
                value: this.characterData.sprite_type || "SparrowAtlas"
              },
              "Icon Name": {
                type: "text",
                value: this.characterData.healthicon || this.characterData.image || "face"
              }
            }
        
            let yPos = 0
            Object.entries(properties).forEach(([key, prop]) => {
              // Property label (left-aligned)
              const propText = this.scene.add.text(0, yPos, `${key}:`, {
                fontSize: "14px",
                fill: "#3498db",
                fontStyle: "bold"
              })
        
              if (prop.type === "boolean" && key === "Flip X") {
                const checkboxState = {
                    value: this.characterData.flip_x || false
                };

                const checkbox = this.scene.add.sprite(
                    this.width - 25,
                    yPos + 7,
                    'checkboxThingie'
                ).setScale(0.25);

                // Establecer estado inicial correcto
                checkbox.play(checkboxState.value ? 'checkbox_selected' : 'checkbox_unselected');

                checkbox.setInteractive({ 
                    useHandCursor: true 
                }).on('pointerover', function() {
                    this.scene.game.canvas.style.cursor = 'pointer';
                }).on('pointerout', function() {
                    this.scene.game.canvas.style.cursor = 'default';
                });

                checkbox.on('pointerdown', () => {
                    // Invertir el valor
                    const newValue = !checkboxState.value;
                    
                    // Actualizar el estado local
                    checkboxState.value = newValue;
                    
                    // Actualizar el valor en el characterData y sprites inmediatamente
                    if (prop.updateFn) {
                        prop.updateFn(newValue);
                    }
                    
                    // Reproducir la animación de selección
                    checkbox.play('checkbox_select');
                    checkbox.once('animationcomplete', () => {
                        // Asegurarnos de que el estado visual coincida con el estado real
                        checkbox.play(newValue ? 'checkbox_selected' : 'checkbox_unselected');
                    });
                });

                this.contentArea.add(checkbox);
              } else if (prop.type === "boolean") {
                const checkboxState = {
                    value: prop.value
                };

                const checkbox = this.scene.add.sprite(
                    this.width - 25,
                    yPos + 7,
                    'checkboxThingie'
                ).setScale(0.25);

                // Establecer estado inicial
                checkbox.play(checkboxState.value ? 'checkbox_selected' : 'checkbox_unselected');

                checkbox.setInteractive({ 
                    useHandCursor: true 
                }).on('pointerover', function() {
                    this.scene.game.canvas.style.cursor = 'pointer';
                }).on('pointerout', function() {
                    this.scene.game.canvas.style.cursor = 'default';
                });

                checkbox.on('pointerdown', () => {
                    // Invertir el valor
                    checkboxState.value = !checkboxState.value;
                    
                    // Reproducir animación
                    checkbox.play('checkbox_select');
                    checkbox.once('animationcomplete', () => {
                        checkbox.play(checkboxState.value ? 'checkbox_selected' : 'checkbox_unselected');
                        // Actualizar el valor en las propiedades
                        prop.value = checkboxState.value;
                        // Llamar a la función de actualización
                        if (prop.updateFn) {
                            prop.updateFn(checkboxState.value);
                        }
                    });
                });

                this.contentArea.add(checkbox);
              } else {
                // Para otros tipos de propiedades, mantener el texto original
                let valueText = Array.isArray(prop.value) ? 
                  `[${prop.value.join(", ")}]` : 
                  prop.value.toString();
        
                const valueDisplay = this.scene.add.text(0, yPos, valueText, {
                  fontSize: "14px",
                  fill: "#ffffff"
                });
                valueDisplay.x = this.width - this.padding - valueDisplay.width;
                this.contentArea.add(valueDisplay);
              }
        
              this.contentArea.add(propText);
              yPos += 35; // Aumentado de 30 a 35 para más espacio entre elementos
            });
          }
        
          addEventListeners() {
            this.titleBar.setInteractive({ useHandCursor: true })
            this.titleBar.on("pointerdown", (pointer) => {
              this.isDragging = true
              this.dragOffset.x = pointer.x - this.container.x
              this.dragOffset.y = pointer.y - this.container.y
            })
        
            this.scene.input.on("pointermove", (pointer) => {
              if (this.isDragging) {
                this.container.x = pointer.x - this.dragOffset.x
                this.container.y = pointer.y - this.dragOffset.y
              }
            })
        
            this.scene.input.on("pointerup", () => {
              this.isDragging = false
            })
        
            this.scene.events.on("update", this.updatePosition, this)
          }
        
          updatePosition() {
            const bounds = {
              left: 0,
              top: 0,
              right: this.scene.scale.width,
              bottom: this.scene.scale.height,
            }
        
            if (this.container.x < bounds.left) {
              this.container.x = bounds.left
            } else if (this.container.x + this.width > bounds.right) {
              this.container.x = bounds.right - this.width
            }
        
            if (this.container.y < bounds.top) {
              this.container.y = bounds.top
            } else if (this.container.y + this.height > bounds.bottom) {
              this.container.y = bounds.bottom - this.height
            }
          }
        
          toggleMinimize() {
            this.isMinimized = !this.isMinimized
            if (this.isMinimized) {
              this.contentArea.setVisible(false)
              this.panel.height = 30
            } else {
              this.contentArea.setVisible(true)
              this.panel.height = this.height
            }
          }
        
          close() {
            this.scene.events.off("update", this.updatePosition, this)
        
            // Emit properties modal closed event
            this.scene.events.emit('propertiesModalClosed')
        
            // Clear the reference in the scene
            this.scene.characterPropertiesModal = null
        
            this.container.destroy()
          }
        
          makeModalExclusive() {
            // Hacer que el panel bloquee eventos
            this.panel.setInteractive({
                useHandCursor: false,
                hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, this.height),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                cursor: 'default'
            });
        
            // Hacer que la barra de título bloquee eventos
            this.titleBar.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, 30),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains
            });
        
            // Añadir control de profundidad al hacer click
            const bringToFront = () => {
                if (this.scene.modalLayer) {
                    this.scene.modalLayer.bringToTop(this.container);
                }
            };
        
            this.panel.on('pointerdown', bringToFront);
            this.titleBar.on('pointerdown', (pointer) => {
                bringToFront();
                // Iniciar arrastre solo si es la barra de título
                this.isDragging = true;
                this.dragOffset.x = pointer.x - this.container.x;
                this.dragOffset.y = pointer.y - this.container.y;
            });
          }
        }

        this.CharacterConfigsModal = class CharacterConfigsModal {
          constructor(scene, options = {}) {
            this.scene = scene;
            this.camera = scene.cameras.main;

            // Default options
            this.x = options.x || 400;
            this.y = options.y || 100;
            this.width = options.width || 300;
            this.height = options.height || 200; // Altura más pequeña para configs
            this.title = "Character Configs"; // Título correcto
            this.backgroundColor = 0x2c3e50;
            this.titleColor = 0x3498db;
            this.alpha = 0.9;
            this.padding = 10;

            // Character data
            this.characterData = options.characterData || {};

            // State variables
            this.isMinimized = false;
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };

            this.createModal();
            this.addEventListeners();
          }

          createModal() {
            // Container setup
            this.container = this.scene.add.container(this.x, this.y);
            this.container.setDepth(1000);
            this.container.setScrollFactor(0);

            // Add to modal layer
            if (this.scene.modalLayer) {
              this.scene.modalLayer.add(this.container);
            }

            // Background
            this.panel = this.scene.add
              .rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
              .setOrigin(0, 0);
            this.container.add(this.panel);

            // Title bar
            this.titleBar = this.scene.add
              .rectangle(0, 0, this.width, 30, this.titleColor, this.alpha)
              .setOrigin(0, 0);
            this.container.add(this.titleBar);

            // Title text
            this.titleText = this.scene.add.text(10, 5, this.title, {
              fontSize: "16px",
              fill: "#ffffff",
            });
            this.container.add(this.titleText);

            // Setup buttons
            this.setupButtons();

            // Create content area
            this.contentContainer = this.scene.add.container(this.padding, 40);
            this.container.add(this.contentContainer);

            // Display configs
            this.displayConfigs();

            // Make modal exclusive
            this.makeModalExclusive();
          }

          displayConfigs() {
            this.contentContainer.removeAll();

            let yPos = 0;
            const configText = this.scene.add.text(0, yPos, "Show Ghost:", {
                fontSize: "14px",
                fill: "#3498db",
                fontStyle: "bold"
            });

            // Mantener una referencia al estado actual
            let isChecked = this.scene.isGhostActive || false;

            const checkbox = this.scene.add.sprite(
                this.width - 25,
                yPos + 7,
                'checkboxThingie'
            ).setScale(0.25);

            // Establecer estado inicial
            checkbox.play(isChecked ? 'checkbox_selected' : 'checkbox_unselected');

            // Hacer el checkbox interactivo
            checkbox.setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    this.scene.game.canvas.style.cursor = 'pointer';
                })
                .on('pointerout', () => {
                    this.scene.game.canvas.style.cursor = 'default';
                });

            checkbox.on('pointerdown', () => {
                // Invertir el estado
                isChecked = !isChecked;
                
                // Actualizar el estado y el fantasma inmediatamente
                this.scene.isGhostActive = isChecked;
                
                // Asegurarse de que el fantasma se cree con la animación actual
                if (isChecked && this.scene.currentAnimation) {
                    this.scene.createGhost(this.scene.currentAnimation);
                } else {
                    this.scene.clearGhost();
                }
                
                // Actualizar la apariencia del checkbox después
                checkbox.play('checkbox_select');
                checkbox.once('animationcomplete', () => {
                    checkbox.play(isChecked ? 'checkbox_selected' : 'checkbox_unselected');
                });
            });

            this.contentContainer.add([configText, checkbox]);
          }

          createAnims() {
            // Crear las animaciones del checkbox
            this.scene.anims.create({
                key: 'checkbox_select',
                frames: this.scene.anims.generateFrameNames('checkboxThingie', {
                    prefix: 'Check Box selecting animation',
                    zeroPad: 4,
                    start: 0,
                    end: 10
                }),
                frameRate: 24,
                repeat: 0
            });

            this.scene.anims.create({
                key: 'checkbox_selected',
                frames: this.scene.anims.generateFrameNames('checkboxThingie', {
                    prefix: 'Check Box Selected Static',
                    zeroPad: 4,
                    start: 0,
                    end: 1
                }),
                frameRate: 24,
                repeat: 0
            });

            this.scene.anims.create({
                key: 'checkbox_unselected',
                frames: this.scene.anims.generateFrameNames('checkboxThingie', {
                    prefix: 'Check Box unselected',
                    zeroPad: 4,
                    start: 0,
                    end: 0
                }),
                frameRate: 24
            });
          }

          setupButtons() {
            // Close button
            this.closeButton = this.scene.add
              .text(this.width - 30, 5, "X", {
                fontSize: "16px",
                fill: "#ffffff",
              })
              .setInteractive({ useHandCursor: true })
              .on("pointerdown", () => this.close());
            this.container.add(this.closeButton);

            // Minimize button
            this.minimizeButton = this.scene.add
              .text(this.width - 50, 5, "_", {
                fontSize: "16px",
                fill: "#ffffff",
              })
              .setInteractive({ useHandCursor: true })
              .on("pointerdown", () => this.toggleMinimize());
            this.container.add(this.minimizeButton);
          }

          makeModalExclusive() {
            this.panel.setInteractive({
              useHandCursor: false,
              hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, this.height),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
              cursor: 'default'
            });

            this.titleBar.setInteractive({
              useHandCursor: true,
              hitArea: new Phaser.Geom.Rectangle(0, 0, this.width, 30),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
              cursor: 'default'
            });

            const bringToFront = () => {
              if (this.scene.modalLayer) {
                this.scene.modalLayer.bringToTop(this.container);
              }
            };

            this.panel.on('pointerdown', bringToFront);
            this.titleBar.on('pointerdown', (pointer) => {
              bringToFront();
              this.isDragging = true;
              this.dragOffset.x = pointer.x - this.container.x;
              this.dragOffset.y = pointer.y - this.container.y;
            });
          }

          addEventListeners() {
            this.scene.input.on("pointermove", (pointer) => {
              if (this.isDragging) {
                this.container.x = pointer.x - this.dragOffset.x;
                this.container.y = pointer.y - this.dragOffset.y;
              }
            });

            this.scene.input.on("pointerup", () => {
              this.isDragging = false;
            });

            this.scene.events.on("update", this.updatePosition, this);
          }

          updatePosition() {
            const bounds = {
              left: 0,
              top: 0,
              right: this.scene.scale.width,
              bottom: this.scene.scale.height
            };

            if (this.container.x < bounds.left) {
              this.container.x = bounds.left;
            } else if (this.container.x + this.width > bounds.right) {
              this.container.x = bounds.right - this.width;
            }

            if (this.container.y < bounds.top) {
              this.container.y = bounds.top;
            } else if (this.container.y + this.height > bounds.bottom) {
              this.container.y = bounds.bottom - this.height;
            }
          }

          toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            if (this.isMinimized) {
              this.contentContainer.setVisible(false);
              this.panel.height = 30;
            } else {
              this.contentContainer.setVisible(true);
              this.panel.height = this.height;
            }
          }

          close() {
            this.scene.events.off("update", this.updatePosition, this);
            this.scene.events.emit('configsModalClosed'); // Cambiar el evento emitido
            
            // Clear the reference in the scene
            this.scene.characterConfigsModal = null; // Corregir la referencia
            
            this.container.destroy();
          }
        }
    }

    getModalWindow() {
        return this.ModalWindow;
    }

    getAnimationsModal() {
        return this.AnimationsModal;
    }

    getCharacterPropertiesModal() {
        return this.CharacterPropertiesModal;
    }

    getCharacterConfigsModal() {
        return this.CharacterConfigsModal;
    }
}