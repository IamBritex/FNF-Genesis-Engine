import { ModalWindows } from '../../utils/WindowsModals.js';

// Character Editor with proper XML parsing for FNF-style sprites
class CharacterEditorState extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterEditorState" });
    this.isDragging = false;
    this.currentZoom = 1;
    this.minZoom = 0.1;
    this.maxZoom = 5;
    this.characterSprite = null;
    this.ghostSprite = null;
    this.isGhostActive = false;
    this.ghostInitialAnim = null;
    this.currentAnimation = null;
    this.characterData = null;
    this.activeTweens = {}; // Store active tweens

    // Añade la nueva cámara UI
    this.uiCamera = null;
    this.modalLayer = null;
    this.gameLayer = null;

    // Inicializar el gestor de ventanas modales
    const modalWindows = new ModalWindows();
    this.ModalWindow = modalWindows.getModalWindow();
    this.AnimationsModal = modalWindows.getAnimationsModal();
    this.CharacterPropertiesModal = modalWindows.getCharacterPropertiesModal();
    this.CharacterConfigsModal = modalWindows.getCharacterConfigsModal();

    this.modal = null;
    this.animsModal = null;
    this.characterPropertiesModal = null;
    this.characterConfigsModal = null;
  }

  preload() {
    // Load shit background
    this.load.image("tempBG", "public/assets/images/states/Editors/temp-bg.png");
    
    // Load checkbox textures - Using atlas instead of assetAtlas
    this.load.atlasXML(
        'checkboxThingie',
        'public/assets/images/UI/checkboxThingie.png',
        'public/assets/images/UI/checkboxThingie.xml'
    );
  }

  create() {
    const { width, height } = this.scale;

    // 1. Create main camera for game content
    this.cameras.main.setViewport(0, 0, width, height);

    // 2. Create UI camera that stays fixed
    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.scrollX = 0;
    this.uiCamera.scrollY = 0;
    this.uiCamera.setName('UICamera');

    // 3. Create game objects layer and UI layer
    this.gameLayer = this.add.container(0, 0);
    this.modalLayer = this.add.container(0, 0);
    this.modalLayer.setScrollFactor(0);

    // 4. Create the game elements in the game layer
    this.bg = this.add.image(width / 2, height / 2, "tempBG").setOrigin(0.5);
    this.gameLayer.add(this.bg);
    const scaleFactor = 1.5;
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height) * scaleFactor);

    // COnfiguracion de como es que se ven las camaras
    this.uiCamera.ignore(this.gameLayer); // Ignorar camaras de la UI para separarlas del jugador
    this.cameras.main.ignore(this.modalLayer); // Camara principla ignora  al acamara de la UI

    // INput de teclas
    this.setupInputHandlers();

    // Configurar controles de cámara
    this.setupCameraControls();

    // Hacer que las ventanas modales usen la cámara UI
    if (this.modal) this.modal.container.setScrollFactor(0);
    if (this.animsModal) this.animsModal.container.setScrollFactor(0);
    if (this.characterPropertiesModal) this.characterPropertiesModal.container.setScrollFactor(0);
    if (this.characterConfigsModal) this.characterConfigsModal.container.setScrollFactor(0);

    // Añadir las ventanas modales
    this.setupModals();

    // Create menu bar
    this.createMenuBar();
  }

  createMenuBar() {
    // Crear el menu del fondo con profundidad
    const menuBar = this.add.rectangle(0, 0, this.scale.width, 25, 0x333333);
    menuBar.setOrigin(0, 0);
    menuBar.setScrollFactor(0);
    menuBar.setDepth(50);
    this.modalLayer.add(menuBar);

    // Create File menu
    const fileMenu = this.createDropdownMenu('File', 10, 0, [
        {
            text: 'Load JSON File',
            callback: () => {
                if (this.modal) {
                    this.modal.openFileDialog();
                }
            }
        },
        {
            text: 'Save Character Data',
            callback: () => {
                if (this.modal) {
                    this.modal.saveCharacter();
                }
            }
        },
        // NUEVA OPCIÓN: Cargar spritesheet (PNG + XML)
        {
            text: 'Load Spritesheet (PNG + XML)',
            callback: () => {
                this.openSpritesheetDialog();
            }
        }
    ]);
    fileMenu.setDepth(50);

    // Create Panels menu with dynamic items
    const getPanelsItems = () => {
        const items = [];
        
        // Check Character Loader
        if (!this.modal) {
            items.push({
                text: 'Character Loader',
                callback: () => {
                    this.setupModals();
                    // Actualizar inmediatamente el menú
                    updatePanelsMenu();
                }
            });
        }
        
        // Check Animations panel
        if (!this.animsModal && this.characterData) {
            items.push({
                text: 'Animations',
                callback: () => {
                    this.modal.createAnimationsModal(this.characterData);
                    // Actualizar inmediatamente el menú
                    updatePanelsMenu();
                }
            });
        }
        
        // Check Properties panel
        if (!this.characterPropertiesModal && this.characterData) {
            items.push({
                text: 'Properties',
                callback: () => {
                    this.modal.createCharacterPropertiesModal(this.characterData);
                    // Actualizar inmediatamente el menú
                    updatePanelsMenu();
                }
            });
        }
        
        // Check Configs panel
        if (!this.characterConfigsModal && this.characterData) {
            items.push({
                text: 'Configs',
                callback: () => {
                    this.modal.createCharacterConfigsModal(this.characterData);
                    // Actualizar inmediatamente el menú
                    updatePanelsMenu();
                }
            });
        }

        // If no panels are closed, show a disabled message
        if (items.length === 0) {
            items.push({
                text: 'No closed panels',
                callback: () => {},
                disabled: true
            });
        }

        return items;
    };

    // Create Panels menu
    const panelsMenu = this.createDropdownMenu('Panels', 60, 0, getPanelsItems());
    panelsMenu.setDepth(50);

    // Función para actualizar el menú de paneles
    const updatePanelsMenu = () => {
        // Remove old menu items
        panelsMenu.getAll().forEach(item => {
            if (item !== panelsMenu.label) {
                item.destroy();
            }
        });
        
        // Add new menu items
        const newItems = getPanelsItems().map((item, index) => {
            const menuItem = this.add.text(5, 30 + (index * 25), item.text, {
                fontSize: '12px',
                fill: item.disabled ? '#666666' : '#ffffff'
            });
            
            if (!item.disabled) {
                menuItem.setInteractive({ useHandCursor: true });
                menuItem.on('pointerover', () => menuItem.setStyle({ fill: '#3498db' }));
                menuItem.on('pointerout', () => menuItem.setStyle({ fill: '#ffffff' }));
                menuItem.on('pointerdown', () => {
                    item.callback();
                    // Cerrar el menú después de hacer clic
                    panelsMenu.getAll().forEach((item, i) => {
                        if (i > 0) item.setVisible(false);
                    });
                });
            }
            
            menuItem.setVisible(false);
            return menuItem;
        });

        panelsMenu.updateItems(newItems);
    };

    // Update panels menu when clicking on it
    panelsMenu.label.on('pointerdown', () => {
        // Update menu items before showing them
        updatePanelsMenu();
        
        // Toggle visibility
        const isVisible = !panelsMenu.getAll()[1]?.visible;
        panelsMenu.getAll().forEach((item, i) => {
            if (i > 0) item.setVisible(isVisible);
        });
    });

    this.modalLayer.add([fileMenu, panelsMenu]);
  }

  createDropdownMenu(label, x, y, items) {
    const container = this.add.container(x, y);
    const padding = 5;
    
    // Create menu label
    const menuLabel = this.add.text(padding, padding, label, {
        fontSize: '14px',
        fill: '#ffffff'
    });
    
    // Create menu background
    const menuBg = this.add.rectangle(
        0, 0,
        150, 25,
        0x444444
    ).setOrigin(0, 0);
    
    // Create dropdown background
    const dropdownBg = this.add.rectangle(
        0, 25, 
        150, (items.length * 25) + 10,
        0x444444
    );
    dropdownBg.setOrigin(0, 0);
    dropdownBg.setVisible(false);
    
    // Create menu items
    const menuItems = items.map((item, index) => {
        const menuItem = this.add.text(padding, 30 + (index * 25), item.text, {
            fontSize: '12px',
            fill: item.disabled ? '#666666' : '#ffffff'
        });
        
        if (!item.disabled) {
            menuItem.setInteractive({ useHandCursor: true });
            menuItem.on('pointerover', () => menuItem.setStyle({ fill: '#3498db' }));
            menuItem.on('pointerout', () => menuItem.setStyle({ fill: '#ffffff' }));
            menuItem.on('pointerdown', () => {
                item.callback();
                // Cerrar el menú después de hacer clic en un ítem
                dropdownBg.setVisible(false);
                menuItems.forEach(item => item.setVisible(false));
            });
        }
        
        menuItem.setVisible(false);
        return menuItem;
    });

    // Make label interactive
    menuLabel.setInteractive({ useHandCursor: true });
    
    // Handle menu open/close
    menuLabel.on('pointerover', () => {
        menuLabel.setStyle({ fill: '#3498db' });
        menuBg.setFillStyle(0x555555);
    });
    menuLabel.on('pointerout', () => {
        menuLabel.setStyle({ fill: '#ffffff' });
        menuBg.setFillStyle(0x444444);
    });
    menuLabel.on('pointerdown', () => {
        // Toggle visibility
        const isVisible = !dropdownBg.visible;
        dropdownBg.setVisible(isVisible);
        menuItems.forEach(item => item.setVisible(isVisible));
    });

    // Close menu when clicking outside
    this.input.on('pointerdown', (pointer) => {
        if (!dropdownBg.getBounds().contains(pointer.x, pointer.y) && 
            !menuBg.getBounds().contains(pointer.x, pointer.y)) {
            dropdownBg.setVisible(false);
            menuItems.forEach(item => item.setVisible(false));
        }
    });

    // Add everything to container
    container.add([menuBg, menuLabel, dropdownBg, ...menuItems]);
    
    // Add methods for updating items
    container.label = menuLabel;
    container.updateItems = (newItems) => {
        container.add(newItems);
    };
    container.getAll = () => container.list;
    
    return container;
  }

  setupModalLayer() {
    this.modalLayer = this.add.container(0, 0);
    return this.modalLayer;
  }

  setupInputHandlers() {
    this.input.keyboard.on("keydown-BACKSPACE", () => {
      if (this.scene.get("TransitionScene")) {
        this.scene.get("TransitionScene").startTransition("EditorsState");
      }
    });

    this.input.keyboard.on("keydown-SPACE", () => {
      // Solo si tenemos un sprite y una animación actual
      if (this.characterSprite && this.currentAnimation) {
        // Detener la animación actual si está reproduciéndose
        this.characterSprite.stop();
        
        // Reproducir la animación desde el principio
        const animKey = `${this.characterData.image}_${this.currentAnimation}`;
        this.characterSprite.play(animKey);
        
        // Reaplicar los offsets para asegurar la posición correcta
        this.applyOffsets(this.currentAnimation);

        console.log(`Replaying animation: ${this.currentAnimation}`);
      }
    });
  }

  setupModals() {
    // Los métodos que usan las ventanas modales ahora usarán las clases importadas
    this.modal = new this.ModalWindow(this, {
      x: 100,
      y: 100,
      width: 300,
      height: 150,
      title: "Character Loader",
    });
  }

  setupCameraControls() {
    // Control de arrastre con rueda del ratón
    this.input.on("pointerdown", (pointer) => {
      if (pointer.middleButtonDown()) {
        this.isDragging = true;
        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (this.isDragging && pointer.middleButtonDown()) {
        const deltaX = pointer.x - this.lastPointerPosition.x;
        const deltaY = pointer.y - this.lastPointerPosition.y;

        this.cameras.main.scrollX -= deltaX / this.cameras.main.zoom;
        this.cameras.main.scrollY -= deltaY / this.cameras.main.zoom;

        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    // Control de zoom con la rueda
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      // Verificar si el puntero está sobre alguna ventana modal
      if (this.isPointerOverModal(pointer)) {
        return; // No hacer zoom si está sobre una ventana modal
      }

      const zoomChange = deltaY > 0 ? 0.9 : 1.1; // Reducir/aumentar en un 10%
      const newZoom = this.cameras.main.zoom * zoomChange;

      // Aplicar zoom solo si está dentro de los límites
      if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
        // Calcular el punto focal del zoom (posición del puntero)
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        this.cameras.main.zoom = newZoom;
        this.currentZoom = newZoom;

        // Ajustar la posición de la cámara para mantener el punto focal
        const newWorldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.cameras.main.scrollX += worldPoint.x - newWorldPoint.x;
        this.cameras.main.scrollY += worldPoint.y - newWorldPoint.y;
      }
    });
  }

  // New method to load character data
  loadCharacter(characterData) {
    this.characterData = characterData;

    // Clear any existing character
    if (this.characterSprite) {
      this.characterSprite.destroy();
      this.characterSprite = null;
    }

    // Clear any existing ghost
    this.clearGhost();

    // Clear any existing animations
    try {
      const keys = this.anims.getAnimationNames ? this.anims.getAnimationNames() : Object.keys(this.anims.anims.entries);

      for (let i = 0; i < keys.length; i++) {
        this.anims.remove(keys[i]);
      }
    } catch (error) {
      console.warn("Could not clear animations:", error);
    }

    // Get the image path from the character data
    const imagePath = characterData.image;
    if (!imagePath) {
      console.error("No image path found in character data");
      return;
    }

    // Construct the paths for the image and XML
    const imageFullPath = `public/assets/images/${imagePath}.png`;
    const xmlFullPath = `public/assets/images/${imagePath}.xml`;

    console.log(`Loading character: ${imagePath}`);
    console.log(`Image path: ${imageFullPath}`);
    console.log(`XML path: ${xmlFullPath}`);

    // Load the image and XML
    this.load.image(imagePath, imageFullPath);
    this.load.xml(imagePath + "_xml", xmlFullPath);

    // When loading is complete, create the sprite and animations
    this.load.once("complete", () => {
      this.createCharacterSprite(characterData, imagePath);
    });

    // Start loading
    this.load.start();
  }

  createCharacterSprite(characterData, imagePath) {
    if (this.characterSprite) {
      this.characterSprite.destroy();
      this.characterSprite = null;
    }

    // Create sprite exactly as Characters.js does
    const sprite = this.add.sprite(0, 0, imagePath);
    sprite.setOrigin(0, 0); // Must be first
    
    this.characterSprite = sprite;
    this.gameLayer.add(sprite);

    // Store base position exactly as Characters.js does
    this.basePosition = {
      x: characterData.position ? characterData.position[0] : 0,
      y: characterData.position ? characterData.position[1] : 0
    };

    // Set properties in the exact same order as Characters.js
    sprite.setDepth(characterData._editor_isPlayer ? 2 : 1);

    // Apply scale
    if (characterData.scale) {
      sprite.setScale(characterData.scale);
    }

    // Handle flip_x exactly like Characters.js does
    if (characterData.flip_x) {
      const texture = this.textures.get(imagePath);
      this.flipFrames(texture);
    }

    // Position sprite using gsap like Characters.js
    gsap.set(sprite, {
      x: this.basePosition.x,
      y: this.basePosition.y
    });

    // Parse frames and setup animations
    this.parseXMLAndCreateFrames(characterData, imagePath);

    // Center camera on the sprite's actual position
    this.cameras.main.centerOn(this.basePosition.x, this.basePosition.y);

    // Setup offset controls after sprite is fully created
    this.setupOffsetControls();

    return sprite;
  }

  parseXMLAndCreateFrames(characterData, imagePath) {
    const xmlData = this.cache.xml.get(imagePath + "_xml");
    if (!xmlData) return;

    try {
      const texture = this.textures.get(imagePath);
      if (!texture) {
        console.error('Texture not found:', imagePath);
        return;
      }

      const subTextures = xmlData.getElementsByTagName("SubTexture");
      console.log('Processing SubTextures:', subTextures.length);

      // Create a temporary canvas for the full texture
      const fullTexture = texture.source[0].image;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = fullTexture.width;
      canvas.height = fullTexture.height;
      ctx.drawImage(fullTexture, 0, 0);

      // Process each SubTexture
      for (const subTexture of subTextures) {
        const name = subTexture.getAttribute("name");
        const x = parseInt(subTexture.getAttribute("x"), 10);
        const y = parseInt(subTexture.getAttribute("y"), 10);
        const width = parseInt(subTexture.getAttribute("width"), 10);
        const height = parseInt(subTexture.getAttribute("height"), 10);
        const frameX = subTexture.hasAttribute("frameX") ? parseInt(subTexture.getAttribute("frameX"), 10) : 0;
        const frameY = subTexture.hasAttribute("frameY") ? parseInt(subTexture.getAttribute("frameY"), 10) : 0;
        const frameWidth = subTexture.hasAttribute("frameWidth") ? parseInt(subTexture.getAttribute("frameWidth"), 10) : width;
        const frameHeight = subTexture.hasAttribute("frameHeight") ? parseInt(subTexture.getAttribute("frameHeight"), 10) : height;

        // Create a frame exactly like Characters.js
        texture.add(name, 0, x, y, width, height);
        console.log(`Created frame: ${name} at (${x},${y}) size: ${width}x${height}`);
      }

      // Setup animations after frames are properly created
      this.setupAnimations(characterData, imagePath);
    } catch (error) {
      console.error("Error parsing XML:", error);
      console.error("Stack:", error.stack);
    }
  }

  setupAnimations(characterData, imagePath) {
    if (!characterData.animations?.length) return;

    const texture = this.textures.get(imagePath);
    if (!texture) {
      console.error('No texture found for animations');
      return;
    }

    characterData.animations.forEach(animation => {
      try {
        const frames = texture.getFrameNames();
        let animationFrames = [];

        if (animation.indices?.length > 0) {
          animationFrames = animation.indices
            .map(index => {
              const paddedIndex = String(index).padStart(4, "0");
              return frames.find(frame => frame.startsWith(`${animation.name}${paddedIndex}`));
            })
            .filter(Boolean);
        } else {
          animationFrames = frames
            .filter(frame => frame.startsWith(animation.name))
            .sort();
        }

        if (animationFrames.length > 0) {
          const animKey = `${imagePath}_${animation.anim}`;
          console.log(`Creating animation: ${animKey} with ${animationFrames.length} frames`);
          
          if (this.anims.exists(animKey)) {
            this.anims.remove(animKey);
          }

          this.anims.create({
            key: animKey,
            frames: animationFrames.map(frame => ({
              key: imagePath,
              frame: frame
            })),
            frameRate: animation.fps || 24,
            repeat: animation.loop ? -1 : 0
          });
        }
      } catch (error) {
        console.error(`Error creating animation ${animation.anim}:`, error);
      }
    });

    // Play idle animation by default
    this.playAnimation("idle");
  }

  // Añadir método flipFrames idéntico al de Characters.js
  flipFrames(texture) {
    const frames = texture.getFrameNames();
    frames.forEach((frameName) => {
        const frame = texture.frames[frameName];
        if (frame && !frame._flipped) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = frame.width;
            canvas.height = frame.height;

            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(
                frame.source.image,
                -frame.cutX - frame.width,
                frame.cutY,
                frame.width,
                frame.height,
                0,
                0,
                frame.width,
                frame.height
            );
            ctx.restore();

            texture.add(frameName, 0, frame.cutX, frame.cutY, frame.width, frame.height, canvas);
            frame._flipped = true;
        }
    });
  }

  // Play animation with offsets - match the approach in Characters.js
  playAnimation(animName) {
    if (!this.characterSprite || !this.characterData) {
      console.warn("Cannot play animation: character sprite or data is missing");
      return;
    }

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === animName);
    if (!animation) {
      console.warn(`Animation not found in character data: ${animName}`);
      return;
    }

    // Only change animation if it's different from current
    if (this.currentAnimation !== animName) {
      // Get the animation key
      const animKey = `${this.characterData.image}_${animName}`;

      // Check if the animation exists
      if (!this.anims.exists(animKey)) {
        console.warn(`Animation not found in Phaser: ${animKey}`);
        return;
      }

      // Store current animation
      this.currentAnimation = animName;

      // Apply offsets
      this.applyOffsets(animName);

      // Play the animation
      this.characterSprite.play(animKey);

      console.log(`Playing animation: ${animName}`);
    }
  }

  // Apply offsets - match the approach in Characters.js
  applyOffsets(animName) {
    if (!this.characterSprite || !this.characterData) return;

    const animation = this.characterData.animations.find((a) => a.anim === animName);
    if (!animation) return;

    // Kill any existing tween
    if (this.activeTweens?.character) {
        if (typeof gsap !== "undefined" && gsap.isTweening(this.characterSprite)) {
            gsap.killTweensOf(this.characterSprite);
        }
        this.activeTweens.character = null;
    }

    // Reset to base position first
    gsap.set(this.characterSprite, {
        x: this.basePosition.x,
        y: this.basePosition.y,
    });

    const offsets = animation.offsets || [0, 0];
    const [offsetX, offsetY] = offsets;

    // Apply offsets using gsap
    const tween = gsap.to(this.characterSprite, {
        x: this.basePosition.x + offsetX,
        y: this.basePosition.y + offsetY,
        duration: 0,
        ease: "none",
        overwrite: "auto",
    });

    this.activeTweens = this.activeTweens || {};
    this.activeTweens.character = tween;
  }

  // Setup offset controls
  setupOffsetControls() {
    // Track if control key is pressed
    this.isCtrlPressed = false;

    // Add keyboard listeners
    this.input.keyboard.on("keydown-CTRL", () => {
      this.isCtrlPressed = true;
    });

    this.input.keyboard.on("keyup-CTRL", () => {
      this.isCtrlPressed = false;
    });

    // Arrow key handlers
    this.input.keyboard.on("keydown-LEFT", () => {
      this.moveOffset(-1 * (this.isCtrlPressed ? 5 : 1), 0);
    });

    this.input.keyboard.on("keydown-RIGHT", () => {
      this.moveOffset(1 * (this.isCtrlPressed ? 5 : 1), 0);
    });

    this.input.keyboard.on("keydown-UP", () => {
      this.moveOffset(0, -1 * (this.isCtrlPressed ? 5 : 1));
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      this.moveOffset(0, 1 * (this.isCtrlPressed ? 5 : 1));
    });

    // Make character draggable
    if (this.characterSprite) {
      this.characterSprite.setInteractive({ draggable: true });

      this.characterSprite.on("dragstart", () => {
        this.dragStartPosition = {
          x: this.characterSprite.x,
          y: this.characterSprite.y,
        };
      });

      this.characterSprite.on("drag", (pointer, dragX, dragY) => {
        // Calculate the offset from the base position
        const offsetX = Math.round(dragX - this.basePosition.x);
        const offsetY = Math.round(dragY - this.basePosition.y);

        // Update the character position
        this.characterSprite.setPosition(dragX, dragY);

        // Update the offsets in the character data
        this.updateOffsets(offsetX, offsetY);
      });
    }
  }

  // Add method to move offset by a specific amount
  moveOffset(deltaX, deltaY) {
    if (!this.characterSprite || !this.characterData || !this.currentAnimation) return;

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === this.currentAnimation);
    if (!animation) return;

    // Get current offsets
    const currentOffsets = animation.offsets || [0, 0];

    // Calculate new offsets
    const newOffsetX = currentOffsets[0] + deltaX;
    const newOffsetY = currentOffsets[1] + deltaY;

    // Update the offsets
    this.updateOffsets(newOffsetX, newOffsetY);

    // Apply the new offsets
    this.applyOffsets(this.currentAnimation);
  }

  // Add method to update offsets in the character data
  updateOffsets(offsetX, offsetY) {
    if (!this.characterData || !this.currentAnimation) return;

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === this.currentAnimation);
    if (!animation) return;

    // Update the offsets
    animation.offsets = [offsetX, offsetY];

    // Update the animation text in the animations modal if it exists
    if (this.animsModal) {
      this.animsModal.updateAnimationText(this.currentAnimation, [offsetX, offsetY]);
    }

    console.log(`Updated offsets for ${this.currentAnimation}: [${offsetX}, ${offsetY}]`);
  }

  // Create ghost sprite
  createGhost(animName) {
    if (!this.characterSprite || !this.characterData) return;

    // Clear any existing ghost
    this.clearGhost();

    const animation = this.characterData.animations.find((a) => a.anim === animName);
    if (!animation) return;
    
    const offsets = animation.offsets || [0, 0];
    const imagePath = this.characterData.image;

    // Create ghost with explicit origin 0,0
    this.ghostSprite = this.add.sprite(0, 0, imagePath);
    this.ghostSprite.setOrigin(0, 0);
    
    // Configure ghost appearance
    this.ghostSprite.setAlpha(0.5);
    this.ghostSprite.setTint(0x0088ff);
    this.ghostSprite.setDepth(-1);
    
    // Add to gameLayer
    this.gameLayer.add(this.ghostSprite);
    
    // Copy properties from main character
    this.ghostSprite.setScale(this.characterSprite.scaleX, this.characterSprite.scaleY);
    this.ghostSprite.setFlipX(this.characterSprite.flipX);

    // Position ghost using the same base position system
    gsap.set(this.ghostSprite, {
        x: this.basePosition.x + offsets[0],
        y: this.basePosition.y + offsets[1]
    });

    // Play the same animation
    const animKey = `${imagePath}_${animName}`;
    if (this.anims.exists(animKey)) {
        this.ghostSprite.play(animKey);
    }

    this.ghostInitialAnim = animName;
    this.isGhostActive = true;
    
    // Make sure UI ignores ghost
    if (this.uiCamera) {
        this.uiCamera.ignore(this.ghostSprite);
    }
    
    this.gameLayer.moveBelow(this.ghostSprite, this.characterSprite);
  }

  // Clear ghost sprite
  clearGhost() {
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
    this.isGhostActive = false;
    this.ghostInitialAnim = null;
  }

  // Toggle ghost visibility
  toggleGhost(active) {
    if (active && !this.isGhostActive && this.currentAnimation) {
      this.createGhost(this.currentAnimation);
    } else if (!active && this.isGhostActive) {
      this.clearGhost();
    }
  }

  // Añade este método auxiliar a CharacterEditorState:
  isPointerOverModal(pointer) {
    const modals = [
      this.modal,
      this.animsModal,
      this.characterPropertiesModal,
      this.characterConfigsModal,
      this.jsonEditorModal
    ].filter(Boolean);

    return modals.some(modal => {
      if (!modal?.container) return false;
      const bounds = new Phaser.Geom.Rectangle(
        modal.container.x,
        modal.container.y,
        modal.width,
        modal.height
      );
      return bounds.contains(pointer.x, pointer.y);
    });
  }

  openSpritesheetDialog() {
    // Crear input para PNG y XML
    const inputPng = document.createElement('input');
    inputPng.type = 'file';
    inputPng.accept = '.png';

    const inputXml = document.createElement('input');
    inputXml.type = 'file';
    inputXml.accept = '.xml';

    // Paso 1: Seleccionar PNG
    inputPng.onchange = (e) => {
        const pngFile = e.target.files[0];
        if (!pngFile) return;

        inputXml.onchange = (e2) => {
            const xmlFile = e2.target.files[0];
            if (!xmlFile) return;

            const readerPng = new FileReader();
            const readerXml = new FileReader();

            readerPng.onload = (evPng) => {
                readerXml.onload = (evXml) => {
                    const sheetKey = `custom_sheet_${Date.now()}`;
                    this.textures.remove(sheetKey);
                    this.textures.addBase64(sheetKey, evPng.target.result);

                    this.textures.once(Phaser.Textures.Events.ADD, () => {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(evXml.target.result, "application/xml");
                        const texture = this.textures.get(sheetKey);
                        const subTextures = xmlDoc.getElementsByTagName("SubTexture");
                        for (const subTexture of subTextures) {
                            const name = subTexture.getAttribute("name");
                            const x = parseInt(subTexture.getAttribute("x"), 10);
                            const y = parseInt(subTexture.getAttribute("y"), 10);
                            const width = parseInt(subTexture.getAttribute("width"), 10);
                            const height = parseInt(subTexture.getAttribute("height"), 10);
                            texture.add(name, 0, x, y, width, height);
                        }

                        // Crear sprite en el editor
                        if (this.characterSprite) this.characterSprite.destroy();
                        this.characterSprite = this.add.sprite(0, 0, sheetKey);
                        this.gameLayer.add(this.characterSprite);
                        this.cameras.main.centerOn(0, 0);

                        // Generar JSON de animaciones automáticamente
                        const generatedJson = this.generateAnimationsJsonFromFrames(texture.getFrameNames(), sheetKey);
                        this.characterData = generatedJson;
                        alert('Spritesheet cargado y JSON de animaciones generado automáticamente.');
                        console.log('Animaciones generadas:', generatedJson);
                      });

                };
                readerXml.readAsText(xmlFile);
            };
            readerPng.readAsDataURL(pngFile);
        };
        inputXml.click();
    };
    inputPng.click();
  }

  /**
   * Genera un JSON de animaciones a partir de los nombres de frames.
   * Cada animación tendrá offsets [0,0] y fps 24.
   */
  generateAnimationsJsonFromFrames(frameNames, imageKey) {
    // Agrupar frames por prefijo (antes del primer dígito)
    const animMap = {};
    frameNames.forEach(name => {
        // Ejemplo: "idle0000", "singLEFT0010", etc.
        const match = name.match(/^([^\d]+)/);
        const animName = match ? match[1] : name;
        if (!animMap[animName]) animMap[animName] = [];
        animMap[animName].push(name);
    });

    // Crear el objeto de animaciones
    const animations = Object.entries(animMap).map(([anim, frames]) => ({
        name: anim,
        anim: anim, // Usar el mismo nombre para 'anim'
        indices: [], // Si quieres usar indices, puedes extraerlos de los nombres
        offsets: [0, 0],
        fps: 24,
        loop: anim.toLowerCase().includes('idle') // Solo idle en loop por defecto
    }));

    return {
        image: imageKey,
        position: [0, 0],
        scale: 1,
        flip_x: false,
        animations
    };
  }
}

// Kill me
window.game.scene.add("CharacterEditorState", CharacterEditorState);