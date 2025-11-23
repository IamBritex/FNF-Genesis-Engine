import { StageElements } from '../../../../play/stage/StageElements.js';
import { StageSpritesheet } from '../../../../play/stage/StageSpritesheet.js';
import { serializeElement, createFromData } from '../input/ElementSerializer.js';

/**
 * Maneja la selección, movimiento y visualización de elementos.
 */
export class ElementSelector {

    /**
     * @param {Phaser.Scene} scene 
     * @param {import('../../../../play/camera/Camera.js').CameraManager} cameraManager 
     * @param {import('../input/ActionHistory.js').ActionHistory} actionHistory 
     */
    constructor(scene, cameraManager, actionHistory) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.actionHistory = actionHistory || null;

        this.selectedElement = null;
        this.selectionBox = this.scene.add.graphics();
        this.registeredElements = []; 

        this.stageElements = new StageElements(this.scene, 'editor', this.cameraManager);
        this.stageSpritesheet = new StageSpritesheet(this.scene, 'editor', this.cameraManager);

        this.cameraManager.assignToGame(this.selectionBox);
        this.selectionBox.setDepth(9998);
        
        this.currentFlash = null; 

        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        this.isSelectionLocked = false;
        
        this.isBoxVisible = false;
        this.boxColor = 0xff0000;
        this.boxThickness = 2;

        this.ctrlKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL, false);
        this.deleteKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE, false);
        this.backspaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE, false);

        this.onElementRegistered = null;
        this.onElementUnregistered = null;
        this.onSelectionChanged = null;
        this.onElementUpdated = null; 
        
        this.scene.input.on('pointermove', this.onDragMove, this);
        this.scene.input.on('pointerup', this.onDragEnd, this);
    }

    /**
     * @param {Phaser.GameObjects.GameObject} element
     */
    registerElement(element) {
        if (!element || this.registeredElements.includes(element)) return;

        if (!element.name) {
            element.setName(`element_${Date.now()}_${Math.random()}`);
        }

        if (element.type === 'Sprite' || element.type === 'Image') {
            element.setInteractive(this.scene.input.makePixelPerfect(1));
        } else {
            element.setInteractive();
        }
        
        this.registeredElements.push(element);

        element.on('pointerdown', (pointer, localX, localY, event) => {
            if (this.isSelectionLocked) return;
            if (!pointer.leftButtonDown()) return;
            
            event.stopPropagation();
            this.setSelected(element);

            this.isDragging = true;
            this.dragOffsetX = element.x - pointer.worldX;
            this.dragOffsetY = element.y - pointer.worldY;
            
            this.dragStartX = element.x;
            this.dragStartY = element.y;
        });

        element.on('destroy', this.unregisterElement, this);

        if (this.onElementRegistered) {
            this.onElementRegistered(element);
        }
    }

    /**
     * @param {Phaser.GameObjects.GameObject} element
     */
    unregisterElement(element) {
        this.registeredElements = this.registeredElements.filter(el => el !== element);
        if (this.selectedElement === element) {
            this.clearSelection(false);
        }

        if (this.onElementUnregistered) {
            this.onElementUnregistered(element);
        }
    }

    /**
     * Implementa la lógica de "flash con fadeout"
     * @param {Phaser.GameObjects.GameObject} element
     */
    setSelected(element) {
        if (this.isSelectionLocked) return;
        if (this.selectedElement === element) return; 
        
        this.clearFlash();
        this.selectedElement = element;
        
        if (element) {
            if (element.type === 'Sprite' || element.type === 'Image') {
                
                // --- CORRECCIÓN: Verificar validez de textura/frame antes de crear el Flash ---
                if (!element.texture || element.texture.key === '__MISSING' || !element.frame) {
                    console.warn("No se puede aplicar efecto Flash: Textura inválida.");
                    // Aun así lo seleccionamos lógicamente, pero no visualmente con flash
                } else {
                    const flashSprite = this.scene.add.sprite(element.x, element.y, element.texture, element.frame.name);
                    flashSprite.setOrigin(element.originX, element.originY);
                    flashSprite.setScale(element.scaleX, element.scaleY);
                    flashSprite.setFlipX(element.flipX);
                    flashSprite.setFlipY(element.flipY);
                    flashSprite.setScrollFactor(element.scrollFactorX, element.scrollFactorY);
                    flashSprite.setDepth(element.depth); 
                    flashSprite.setTintFill(0xFFFFFF);
                    flashSprite.setAlpha(0.7);
                    this.cameraManager.assignToGame(flashSprite);
                    
                    const flashTween = this.scene.tweens.add({
                        targets: flashSprite,
                        alpha: 0,
                        duration: 900,
                        ease: 'Cubic.easeOut',
                        onComplete: () => {
                            this.clearFlash();
                        }
                    });
                    
                    this.currentFlash = { sprite: flashSprite, tween: flashTween };
                }
            
            } else if (element.type === 'Rectangle') {
                element.setStrokeStyle(4, 0xFFFFFF, 1.0);
                
                const flashTimer = this.scene.time.delayedCall(150, () => {
                    if (element.active) {
                        element.setStrokeStyle(0);
                    }
                    this.clearFlash();
                });
                
                this.currentFlash = { target: element, timer: flashTimer };
            }
        }
        
        this.update(null); 

        if (this.onSelectionChanged) {
            this.onSelectionChanged(element);
        }
    }

    /**
     * Limpia la selección y cualquier flash activo.
     * @param {boolean} [triggerCallback=true]
     */
    clearSelection(triggerCallback = true) {
        this.clearFlash();

        if (this.selectedElement === null) return; 
        
        this.selectedElement = null;
        this.selectionBox.clear();
        
        if (triggerCallback && this.onSelectionChanged) {
            this.onSelectionChanged(null);
        }
    }

    /**
     * Helper para limpiar solo el efecto de flash.
     */
    clearFlash() {
        if (!this.currentFlash) return;

        if (this.currentFlash.tween) {
            this.currentFlash.tween.stop();
            if (this.currentFlash.sprite) this.currentFlash.sprite.destroy();
        }
        if (this.currentFlash.timer) {
            this.currentFlash.timer.remove();
            if (this.currentFlash.target && this.currentFlash.target.active) {
                this.currentFlash.target.setStrokeStyle(0);
            }
        }
        this.currentFlash = null;
    }

    onDragMove(pointer) {
        if (this.isDragging && this.selectedElement && pointer.leftButtonDown()) {
            if (this.isSelectionLocked) {
                this.isDragging = false;
                return;
            }
            
            this.selectedElement.x = pointer.worldX + this.dragOffsetX;
            this.selectedElement.y = pointer.worldY + this.dragOffsetY;
            
            if (this.onElementUpdated) {
                this.onElementUpdated(this.selectedElement);
            }
            
            if (this.currentFlash && this.currentFlash.sprite) {
                this.currentFlash.sprite.x = this.selectedElement.x;
                this.currentFlash.sprite.y = this.selectedElement.y;
            }
            
        } else if (this.isDragging) {
            this.isDragging = false;
        }
    }

    onDragEnd(pointer) {
        if (this.isDragging && this.selectedElement && pointer.leftButtonReleased()) {
            this.isDragging = false;
            
            if (this.isSelectionLocked) return;

            const newX = this.selectedElement.x;
            const newY = this.selectedElement.y;

            if (newX !== this.dragStartX || newY !== this.dragStartY) {
                if (this.actionHistory) {
                    this.actionHistory.addAction({
                        type: 'move',
                        element: this.selectedElement,
                        oldPos: { x: this.dragStartX, y: this.dragStartY },
                        newPos: { x: newX, y: newY }
                    });
                }
            }

        } else if (this.isDragging) {
            this.isDragging = false;
        }
    }

    drawSelectionBox() {
        this.selectionBox.clear();
        
        if (!this.selectedElement || !this.selectedElement.active || !this.isBoxVisible) {
            this.selectedElement = this.selectedElement?.active ? this.selectedElement : null;
            return;
        }

        const bounds = this.selectedElement.getBounds();
        
        this.selectionBox.lineStyle(this.boxThickness, this.boxColor, 1);
        this.selectionBox.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    handleKeyboardMovement(cursors) {
        if (this.isSelectionLocked) return;
        
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
            return; 
        }
        
        let amount = 5; 
        if (cursors.shift.isDown) {
            amount = 1; 
        } else if (this.ctrlKey.isDown) {
            amount = 10;
        }

        const oldPos = { x: this.selectedElement.x, y: this.selectedElement.y };
        let moved = false;

        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.selectedElement.y -= amount;
            moved = true; 
        } else if (Phaser.Input.Keyboard.JustDown(cursors.down)) {
            this.selectedElement.y += amount;
            moved = true; 
        } else if (Phaser.Input.Keyboard.JustDown(cursors.left)) {
            this.selectedElement.x -= amount;
            moved = true; 
        } else if (Phaser.Input.Keyboard.JustDown(cursors.right)) {
            this.selectedElement.x += amount;
            moved = true; 
        }
        
        if (moved) {
            if (this.onElementUpdated) {
                this.onElementUpdated(this.selectedElement);
            }
            
            if (this.currentFlash && this.currentFlash.sprite) {
                this.currentFlash.sprite.x = this.selectedElement.x;
                this.currentFlash.sprite.y = this.selectedElement.y;
            }
            
            if (this.actionHistory) {
                this.actionHistory.addAction({
                    type: 'move',
                    element: this.selectedElement,
                    oldPos: oldPos,
                    newPos: { x: this.selectedElement.x, y: this.selectedElement.y }
                });
            }
        }
    }

    handleDeletion() {
        if (this.isSelectionLocked) return;
        
        const deletePressed = Phaser.Input.Keyboard.JustDown(this.deleteKey);
        const backspacePressed = Phaser.Input.Keyboard.JustDown(this.backspaceKey);

        if (deletePressed || backspacePressed) {
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
                return; 
            }
            
            this.deleteSelectedElement();
        }
    }

    deleteSelectedElement() {
        if (!this.selectedElement) return;

        const charName = this.selectedElement.getData('characterName');
        if (charName === 'Player (BF)' || charName === 'Opponent (Dad)' || charName === 'Girlfriend (GF)') {
            console.warn(`No se pueden eliminar los personajes base (${charName})`);
            return;
        }
        
        const elementToDestroy = this.selectedElement;
        
        const elementData = serializeElement(elementToDestroy);

        if (this.actionHistory) {
            this.actionHistory.addAction({
                type: 'delete',
                elementData: elementData 
            });
        }
        
        this.clearSelection(); 
        elementToDestroy.destroy();
        
        console.log("Elemento eliminado:", elementData.data.characterName || elementData.type);
    }

    /**
     * Crea un elemento de imagen.
     * @param {string} textureKey
     * @param {number} x
     * @param {number} y
     * @param {string} namePath
     */
    createImageElement(textureKey, x, y, namePath) {
        const data = {
            type: 'Image',
            x: x,
            y: y,
            textureKey: textureKey,
            origin: { x: 0.5, y: 1.0 },
            scale: { x: 1, y: 1 },
            visible: true,
            flipX: false,
            flipY: false,
            depth: (this.registeredElements.length || 1),
            scrollFactor: { x: 1, y: 1 }, 
            data: {
                characterName: namePath
            }
        };
        return createFromData(this.scene, data);
    }

    /**
     * Crea un elemento spritesheet.
     * @param {string} textureKey
     * @param {number} x
     * @param {number} y
     * @param {string} namePath
     * @param {number} [fps=24]
     */
    createSpritesheetElement(textureKey, x, y, namePath, fps = 24) {
        const data = {
            type: 'Sprite',
            x: x,
            y: y,
            textureKey: textureKey,
            origin: { x: 0.5, y: 1.0 },
            scale: { x: 1, y: 1 },
            visible: true,
            flipX: false,
            flipY: false,
            depth: (this.registeredElements.length || 1),
            scrollFactor: { x: 1, y: 1 }, 
            data: {
                characterName: namePath,
                animFrameRate: fps,
                animPlayMode: 'None',
                animPlayList: {}, 
                animOffsets: {}
            },
            currentFrame: null
        };
        return createFromData(this.scene, data);
    }

    update(cursors) {
        if (this.selectedElement || this.isBoxVisible) {
            this.drawSelectionBox();
        }

        if (this.selectedElement && !this.isDragging) {
            if (cursors) {
                this.handleKeyboardMovement(cursors);
            }
        }
    }

    shutdown() {
        this.scene.input.off('pointermove', this.onDragMove, this);
        this.scene.input.off('pointerup', this.onDragEnd, this);
        
        this.clearFlash(); 

        if (this.stageElements) {
            this.stageElements.destroy();
            this.stageElements = null;
        }
        if (this.stageSpritesheet) {
            this.stageSpritesheet.destroy();
            this.stageSpritesheet = null;
        }

        this.selectionBox.destroy();
        this.selectedElement = null;
        this.registeredElements = [];

        this.onElementRegistered = null;
        this.onElementUnregistered = null;
        this.onSelectionChanged = null;
        
        this.onElementUpdated = null;
        this.actionHistory = null;
    }
}