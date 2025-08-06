import { ModalWindows } from '../../utils/WindowsModals.js';

export class StageEditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StageEditorScene' });
        
        this.currentStageData = {
            stage: []
        };
        
        this.selectedLayerIndex = -1;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.cameraDrag = false;
        this.currentZoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3;
        this.cameraBounds = null;
        this.layerList = null;
        this.stageContainer = null;
        this.bg = null;
        this.gameCamera = null;
        this.hudCamera = null;
    }

    preload() {
        // Load background image
        this.load.image('editor-bg', 'public/assets/images/states/Editors/temp-bg.png');
        
        // Load UI assets if needed
        this.load.image('ui-button', 'public/assets/images/UI/button.png');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Create game world first
        this.createGameWorld(width, height);
        
        // 2. Create HUD
        this.createHUD(width, height);
        
        // 3. Set up event listeners
        this.setupEventListeners();
        
        // 4. Create initial camera bounds
        this.updateCameraBounds();
    }

    createGameWorld(width, height) {
        // Main game camera (will move/zoom)
        this.gameCamera = this.cameras.main;
        this.gameCamera.setBackgroundColor(0x222222);
        this.gameCamera.setZoom(1);
        
        // Create container for all game elements
        this.stageContainer = this.add.container(0, 0);
        
        // Add background
        this.bg = this.add.image(0, 0, 'editor-bg');
        this.bg.setOrigin(0, 0);
        
        // Calculate scale after creating the image
        const bgScale = Math.max(
            width / this.bg.width, 
            height / this.bg.height
        ) * 1.5;
        this.bg.setScale(bgScale);
        
        this.stageContainer.add(this.bg);
        
        // Grid for reference
        this.createGrid();
    }

    createHUD(width, height) {
        // HUD camera (stays fixed)
        this.hudCamera = this.cameras.add(0, 0, width, height)
            .setScroll(0, 0)
            .setZoom(1)
            .setName('hud');
        
        // Make sure game camera ignores HUD elements
        const hudBg = this.add.rectangle(0, 0, width, 60, 0x333333)
            .setOrigin(0, 0)
            .setScrollFactor(0);
        this.gameCamera.ignore(hudBg);
        
        // Title in HUD
        const title = this.add.text(20, 20, 'Stage Editor', { 
            fontFamily: 'Arial', 
            fontSize: 24, 
            color: '#ffffff' 
        }).setScrollFactor(0);
        this.gameCamera.ignore(title);
        
        // Buttons in HUD
        const addBtn = this.addButton(width - 120, 30, 'Add Image', () => this.addImage());
        const saveBtn = this.addButton(width - 120, 70, 'Save JSON', () => this.saveStage());
        this.gameCamera.ignore(addBtn);
        this.gameCamera.ignore(saveBtn);
        
        // Layer list container in HUD
        this.layerList = this.add.container(20, 100).setScrollFactor(0);
        this.gameCamera.ignore(this.layerList);
        this.updateLayerList();
        
        // Create menu bar
        this.createMenuBar();
    }

    createMenuBar() {
        const menuBar = this.add.rectangle(0, 0, this.scale.width, 25, 0x333333)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(50);
        this.hudCamera.ignore(menuBar);

        // Create File menu
        const fileMenu = this.createDropdownMenu('File', 10, 0, [
            {
                text: 'Load JSON File',
                callback: () => this.loadStage()
            },
            {
                text: 'Save Stage Data',
                callback: () => this.saveStage()
            }
        ]);
        fileMenu.setDepth(50);
        this.hudCamera.ignore(fileMenu);
    }

    createDropdownMenu(label, x, y, items) {
        const container = this.add.container(x, y);
        const padding = 5;
        
        // Create menu label
        const menuLabel = this.add.text(padding, padding, label, {
            fontSize: '14px',
            fill: '#ffffff'
        }).setScrollFactor(0);
        
        // Create menu background
        const menuBg = this.add.rectangle(0, 0, 150, 25, 0x444444)
            .setOrigin(0, 0)
            .setScrollFactor(0);
        
        // Create dropdown background
        const dropdownBg = this.add.rectangle(0, 25, 150, (items.length * 25) + 10, 0x444444)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setVisible(false);
        
        // Create menu items
        const menuItems = items.map((item, index) => {
            const menuItem = this.add.text(padding, 30 + (index * 25), item.text, {
                fontSize: '12px',
                fill: '#ffffff'
            }).setScrollFactor(0);
            
            menuItem.setInteractive({ useHandCursor: true });
            menuItem.on('pointerover', () => menuItem.setStyle({ fill: '#3498db' }));
            menuItem.on('pointerout', () => menuItem.setStyle({ fill: '#ffffff' }));
            menuItem.on('pointerdown', () => {
                item.callback();
                dropdownBg.setVisible(false);
                menuItems.forEach(item => item.setVisible(false));
            });
            
            menuItem.setVisible(false);
            return menuItem;
        });

        // Make label interactive
        menuLabel.setInteractive({ useHandCursor: true });
        
        // Handle menu open/close
        menuLabel.on('pointerdown', () => {
            const isVisible = !dropdownBg.visible;
            dropdownBg.setVisible(isVisible);
            menuItems.forEach(item => item.setVisible(isVisible));
        });

        // Add everything to container
        container.add([menuBg, menuLabel, dropdownBg, ...menuItems]);
        
        return container;
    }

    createGrid() {
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x444444, 0.5);
        
        const size = 50;
        const width = 2000;
        const height = 2000;
        
        for (let x = -width/2; x <= width/2; x += size) {
            grid.moveTo(x, -height/2);
            grid.lineTo(x, height/2);
        }
        
        for (let y = -height/2; y <= height/2; y += size) {
            grid.moveTo(-width/2, y);
            grid.lineTo(width/2, y);
        }
        
        this.stageContainer.add(grid);
    }

    updateCameraBounds() {
        if (this.cameraBounds) {
            this.cameraBounds.destroy();
        }
        
        this.cameraBounds = this.add.rectangle(
            this.gameCamera.width / 2,
            this.gameCamera.height / 2,
            this.gameCamera.width,
            this.gameCamera.height,
            0x000000,
            0
        ).setStrokeStyle(2, 0x00ff00);
        
        this.cameraBounds.setScrollFactor(0);
    }

    addButton(x, y, text, callback) {
        const btn = this.add.rectangle(x, y, 100, 30, 0x444444)
            .setInteractive()
            .on('pointerdown', callback)
            .setScrollFactor(0);
        
        const btnText = this.add.text(x, y, text, { 
            fontFamily: 'Arial', 
            fontSize: '14px', 
            color: '#ffffff' 
        }).setOrigin(0.5).setScrollFactor(0);
        
        return btn;
    }

    setupEventListeners() {
        // Camera pan with middle mouse button (only on game camera)
        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 1 && !this.isPointerOverHUD(pointer)) {
                this.cameraDrag = true;
                this.cameraStart = {
                    x: pointer.x,
                    y: pointer.y,
                    scrollX: this.gameCamera.scrollX,
                    scrollY: this.gameCamera.scrollY
                };
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            // Handle camera pan
            if (this.cameraDrag) {
                const dx = pointer.x - this.cameraStart.x;
                const dy = pointer.y - this.cameraStart.y;
                
                this.gameCamera.scrollX = this.cameraStart.scrollX - dx;
                this.gameCamera.scrollY = this.cameraStart.scrollY - dy;
                this.updateCameraBounds();
            }
            
            // Handle layer dragging
            if (this.isDragging && this.selectedLayerIndex >= 0) {
                const layer = this.currentStageData.stage[this.selectedLayerIndex];
                const worldPoint = this.gameCamera.getWorldPoint(pointer.x, pointer.y);
                
                const dx = worldPoint.x - this.dragStart.x;
                const dy = worldPoint.y - this.dragStart.y;
                
                layer.position = [
                    this.dragLayerStartPos[0] + dx,
                    this.dragLayerStartPos[1] + dy
                ];
                
                this.updateSelectedLayerPosition();
            }
        });
        
        this.input.on('pointerup', () => {
            this.cameraDrag = false;
            this.isDragging = false;
        });
        
        // Mouse wheel for zoom (only on game camera)
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (this.isPointerOverHUD(pointer)) return;
            
            const zoomDelta = deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Phaser.Math.Clamp(this.gameCamera.zoom * zoomDelta, this.minZoom, this.maxZoom);
            
            // Calculate the point focal of the zoom (pointer position)
            const worldPoint = this.gameCamera.getWorldPoint(pointer.x, pointer.y);
            
            this.gameCamera.zoom = newZoom;
            this.currentZoom = newZoom;
            
            // Adjust camera position to maintain the focal point
            const newWorldPoint = this.gameCamera.getWorldPoint(pointer.x, pointer.y);
            this.gameCamera.scrollX += worldPoint.x - newWorldPoint.x;
            this.gameCamera.scrollY += worldPoint.y - newWorldPoint.y;
            
            this.updateCameraBounds();
        });
    }

    isPointerOverHUD(pointer) {
        // Check if pointer is over any HUD elements
        const hudElements = [
            this.layerList,
            // Add other HUD elements here
        ];
        
        return hudElements.some(element => {
            if (!element) return false;
            const bounds = element.getBounds();
            return bounds.contains(pointer.x, pointer.y);
        });
    }

    addImage() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
            document.body.removeChild(fileInput);
        });
        
        fileInput.click();
    }

    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const imageName = file.name.replace(/\.[^/.]+$/, "");
            const textureKey = `uploaded_${Date.now()}`;
            
            const img = new Image();
            img.onload = () => {
                this.textures.addImage(textureKey, img);
                
                // Add new layer
                const newLayer = {
                    namePath: imageName,
                    layer: this.currentStageData.stage.length + 1,
                    scale: 1.0,
                    visible: true,
                    opacity: 1.0,
                    position: [0, 0]
                };
                
                this.currentStageData.stage.push(newLayer);
                this.selectedLayerIndex = this.currentStageData.stage.length - 1;
                
                // Create sprite for the stage
                const sprite = this.add.image(0, 0, textureKey)
                    .setOrigin(0.5, 0.5)
                    .setInteractive()
                    .on('pointerdown', (pointer) => {
                        this.selectLayer(this.currentStageData.stage.length - 1);
                        this.isDragging = true;
                        
                        const worldPoint = this.gameCamera.getWorldPoint(pointer.x, pointer.y);
                        this.dragStart.x = worldPoint.x;
                        this.dragStart.y = worldPoint.y;
                        
                        this.dragLayerStartPos = [...newLayer.position];
                    });
                
                this.stageContainer.add(sprite);
                this.updateLayerList();
            };
            img.src = imageUrl;
        };
        reader.readAsDataURL(file);
    }

    selectLayer(index) {
        this.selectedLayerIndex = index;
        this.updateLayerList();
        
        // Highlight selected layer
        this.stageContainer.list.forEach((child, i) => {
            if (child.setTint) { // Skip non-image elements
                if (i === index) {
                    child.setTint(0x8888ff);
                } else {
                    child.clearTint();
                }
            }
        });
    }

    updateSelectedLayerPosition() {
        if (this.selectedLayerIndex >= 0 && this.selectedLayerIndex < this.stageContainer.list.length) {
            const layer = this.currentStageData.stage[this.selectedLayerIndex];
            const sprite = this.stageContainer.list[this.selectedLayerIndex];
            
            sprite.setPosition(layer.position[0], layer.position[1]);
            
            // Apply parallax effect based on layer depth
            const parallaxFactor = (layer.layer / 10) * 0.5;
            sprite.setScrollFactor(1 + parallaxFactor);
        }
    }

    updateLayerList() {
        this.layerList.removeAll(true);
        
        // Add title
        this.layerList.add(this.add.text(0, 0, 'Layers:', { 
            fontFamily: 'Arial', 
            fontSize: '16px', 
            color: '#ffffff' 
        }));
        
        // Add layer items
        this.currentStageData.stage.forEach((layer, index) => {
            const yPos = 30 + (index * 30);
            const isSelected = index === this.selectedLayerIndex;
            
            const bg = this.add.rectangle(0, yPos, 200, 25, isSelected ? 0x555555 : 0x333333)
                .setOrigin(0, 0.5)
                .setInteractive()
                .on('pointerdown', () => this.selectLayer(index));
            
            const text = this.add.text(10, yPos, layer.namePath || `Layer ${layer.layer}`, { 
                fontFamily: 'Arial', 
                fontSize: '14px', 
                color: '#ffffff' 
            }).setOrigin(0, 0.5);
            
            this.layerList.add([bg, text]);
        });
    }

    loadStage() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        this.currentStageData = JSON.parse(e.target.result);
                        this.selectedLayerIndex = -1;
                        
                        // Clear existing stage
                        this.stageContainer.removeAll(true);
                        this.createGrid();
                        
                        // Load all images from the stage data
                        this.loadStageImages();
                        
                    } catch (error) {
                        console.error('Error loading stage file:', error);
                    }
                };
                reader.readAsText(file);
            }
            document.body.removeChild(fileInput);
        });
        
        fileInput.click();
    }

    loadStageImages() {
        this.currentStageData.stage.forEach(layer => {
            if (layer.namePath) {
                const textureKey = `stage_${layer.namePath}`;
                
                // Check if texture already exists
                if (!this.textures.exists(textureKey)) {
                    console.log(`Would load image: ${layer.namePath}`);
                    // In a real implementation, you would load the image here
                    // this.load.image(textureKey, `path/to/${layer.namePath}.png`);
                    // this.load.start();
                    return;
                }
                
                // Create sprite
                const sprite = this.add.image(
                    layer.position[0] || 0,
                    layer.position[1] || 0,
                    textureKey
                ).setOrigin(0.5, 0.5);
                
                // Apply layer properties
                if (layer.scale) sprite.setScale(layer.scale);
                if (layer.opacity) sprite.setAlpha(layer.opacity);
                if (layer.visible !== undefined) sprite.setVisible(layer.visible);
                
                // Apply parallax
                const parallaxFactor = (layer.layer / 10) * 0.5;
                sprite.setScrollFactor(1 + parallaxFactor);
                
                // Make interactive
                sprite.setInteractive();
                sprite.on('pointerdown', () => {
                    this.selectLayer(this.currentStageData.stage.indexOf(layer));
                });
                
                this.stageContainer.add(sprite);
            }
        });
        
        this.updateLayerList();
    }

    saveStage() {
        // Update layer data with current positions
        this.stageContainer.list.forEach((child, index) => {
            if (child instanceof Phaser.GameObjects.Image && this.currentStageData.stage[index]) {
                this.currentStageData.stage[index].position = [child.x, child.y];
                
                // Update parallax factor based on scroll factor
                const parallaxFactor = (child.scrollFactorX - 1) / 0.5 * 10;
                this.currentStageData.stage[index].layer = Math.round(parallaxFactor);
            }
        });
        
        // Convert to JSON
        const jsonStr = JSON.stringify(this.currentStageData, null, 2);
        
        // Create download link
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stage.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    update() {
        // Update parallax effects based on camera movement
        this.stageContainer.list.forEach((sprite, index) => {
            if (index < this.currentStageData.stage.length && sprite.setScrollFactor) {
                const layer = this.currentStageData.stage[index];
                const parallaxFactor = (layer.layer / 10) * 0.5;
                sprite.setScrollFactor(1 + parallaxFactor);
            }
        });
    }
}
game.scene.add('StageEditorScene', StageEditorScene)