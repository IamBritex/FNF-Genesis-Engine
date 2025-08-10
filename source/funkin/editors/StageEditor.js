class StageEditor extends Phaser.Scene {
    constructor() {
        super({ key: 'StageEditorScene' });
        this.stageObjects = [];
        this.selectedObject = null;
        this.isDragging = false;
        this.isCameraDragging = false;
        this.isLayerDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.cameraDragStartX = 0;
        this.cameraDragStartY = 0;
        this.gridSize = 50;
        this.showGrid = false; // Grid deshabilitado por defecto
        this.gameCamera = null;
        this.hudCamera = null;
        this.loadedImages = [];
        this.fileInput = null;
        this.zoomLevel = 1;
        this.layerManagerUI = null;
        this.usedImageKeys = new Set();

        // Parallax settings
        this.parallaxFactor = 0.1;
        this.maxLayer = 12;
        this.enableParallax = false; // Desactivado por defecto para facilitar edición

        // Sistema de undo/redo
        this.actionHistory = [];
        this.maxHistorySize = 10;
        this.currentHistoryIndex = -1;

        // Sistema de animación de sprites
        this.activeAnimations = new Map(); // Para controlar animaciones activas
        this.defaultBPM = 120; // BPM por defecto

        // ⭐ IMPORTANTE: Usar el mismo sistema de coordenadas que StageManager
        // StageManager usa setOrigin(0, 0) para todas las imágenes
        // Esto asegura que las posiciones se vean igual en editor y juego


    }

    preload() {
        // Solo cargar sonidos y fondo básico
        this.load.image('editorBg', 'public/assets/images/states/Editors/temp-bg.png');

        // Sonidos
        this.load.audio('selectSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');

        // Mostrar progreso de carga
        this.createLoadingScreen();
    }

    createLoadingScreen() {
        const { width, height } = this.scale;

        this.loadingBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
        this.loadingText = this.add.text(width / 2, height / 2, 'Loading Stage Editor...', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.loadingBar = this.add.rectangle(width / 2, height / 2 + 50, 300, 20, 0x333333);
        this.loadingProgress = this.add.rectangle(width / 2 - 150, height / 2 + 50, 0, 20, 0x00FF00).setOrigin(0, 0.5);

        this.load.on('progress', (progress) => {
            this.loadingProgress.width = 300 * progress;
        });

        this.load.on('complete', () => {
            this.time.delayedCall(500, () => {
                if (this.loadingBg) this.loadingBg.destroy();
                if (this.loadingText) this.loadingText.destroy();
                if (this.loadingBar) this.loadingBar.destroy();
                if (this.loadingProgress) this.loadingProgress.destroy();
            });
        });
    }

    create() {
        const { width, height } = this.scale;

        // Configurar cámara principal para el juego (objetos del escenario)
        this.gameCamera = this.cameras.main;
        this.gameCamera.setBounds(-4000, -4000, 8000, 8000);
        this.gameCamera.setZoom(1);

        // Crear cámara separada para el HUD
        this.hudCamera = this.cameras.add(0, 0, width, height);
        this.hudCamera.setScroll(0, 0);

        // Cargar stage.json como template base
        this.loadDefaultStageTemplate();

        // Crear input file invisible
        this.createFileInput();

        // Crear grid (en la cámara del juego)
        this.createGrid();

        // Crear UI (en la cámara HUD)
        this.createUI();

        // Sonidos
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        // Input handlers
        this.setupInputHandlers();

        // Controles de cámara
        this.setupCameraControls();

        // Inicializar historial
        this.saveState('initial');
    }

    // ===== SISTEMA DE ANIMACIÓN DE SPRITES =====
    startSpriteAnimation(spriteObject, mode, bpm = null) {
        if (!spriteObject || spriteObject.getData('type') !== 'spriteObject') return;

        const frames = spriteObject.getData('frames');
        if (!frames || frames.length <= 1) return;

        // Detener animación anterior si existe
        this.stopSpriteAnimation(spriteObject);

        const baseKey = spriteObject.getData('baseKey');
        let frameRate, interval;

        if (mode === 'bpm') {
            const actualBPM = bpm || this.defaultBPM;
            // Convertir BPM a frames por segundo (asumiendo que queremos 1 frame por beat)
            frameRate = actualBPM / 60; // beats por segundo
            interval = 1000 / frameRate; // milisegundos por frame
        } else if (mode === 'loop') {
            frameRate = 12; // 12 FPS para loop suave
            interval = 1000 / frameRate;
        }

        let currentFrame = spriteObject.getData('currentFrame') || 0;

        const animationTimer = this.time.addEvent({
            delay: interval,
            callback: () => {
                currentFrame = (currentFrame + 1) % frames.length;
                const frameKey = `${baseKey}_frame_${currentFrame}`;
                
                if (this.textures.exists(frameKey)) {
                    spriteObject.setTexture(frameKey);
                    spriteObject.setData('currentFrame', currentFrame);
                    
                    // Actualizar panel si este objeto está seleccionado
                    if (this.selectedObject === spriteObject) {
                        this.updatePropertiesPanel();
                    }
                }
            },
            loop: true
        });

        // Guardar la animación activa
        this.activeAnimations.set(spriteObject, {
            timer: animationTimer,
            mode: mode,
            bpm: bpm
        });

        // Marcar como modificado
        this.markAsModified(spriteObject);
    }

    stopSpriteAnimation(spriteObject) {
        if (!spriteObject) return;

        const animationData = this.activeAnimations.get(spriteObject);
        if (animationData) {
            animationData.timer.destroy();
            this.activeAnimations.delete(spriteObject);
        }
    }

    getSpriteAnimationStatus(spriteObject) {
        return this.activeAnimations.get(spriteObject) || null;
    }

    // ===== FUNCIÓN AUXILIAR PARA MARCAR ELEMENTOS COMO MODIFICADOS =====
    markAsModified(gameObject) {
        if (!gameObject) return;
        
        // Si es un elemento del template, marcarlo como modificado
        if (gameObject.getData('isTemplate')) {
            gameObject.setData('isTemplate', false);
            // También actualizar en la lista de imágenes cargadas
            const imgData = this.loadedImages.find(img => img.object === gameObject);
            if (imgData) {
                imgData.isTemplate = false;
            }
        }
    }

    // ===== SISTEMA DE UNDO/REDO =====
    saveState(actionType) {
        const state = {
            action: actionType,
            timestamp: Date.now(),
            objects: this.stageObjects.map(obj => ({
                x: obj.x,
                y: obj.y,
                imageKey: obj.getData('imageKey'),
                imageName: obj.getData('imageName'),
                layer: obj.getData('layer'),
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                rotation: obj.rotation,
                alpha: obj.alpha,
                visible: obj.visible
            })),
            loadedImages: this.loadedImages.map(img => ({
                key: img.key,
                name: img.name,
                width: img.width,
                height: img.height,
                visible: img.visible,
                layer: img.layer
            }))
        };

        // Remover estados futuros si estamos en el medio del historial
        if (this.currentHistoryIndex < this.actionHistory.length - 1) {
            this.actionHistory = this.actionHistory.slice(0, this.currentHistoryIndex + 1);
        }

        this.actionHistory.push(state);
        this.currentHistoryIndex = this.actionHistory.length - 1;

        // Mantener límite de historial
        if (this.actionHistory.length > this.maxHistorySize) {
            this.actionHistory.shift();
            this.currentHistoryIndex--;
        }
    }

    changeSpriteFrame(direction) {
        if (!this.selectedObject) return;

        const frames = this.selectedObject.getData('frames');
        if (!frames || frames.length <= 1) return;

        const currentFrame = this.selectedObject.getData('currentFrame') || 0;
        let newFrame = currentFrame + direction;

        // Wrap around
        if (newFrame < 0) newFrame = frames.length - 1;
        if (newFrame >= frames.length) newFrame = 0;

        // Cambiar el frame del sprite usando la clave base del spritesheet
        const frameData = frames[newFrame];
        const baseKey = this.selectedObject.getData('baseKey');
        const frameKey = `${baseKey}_frame_${newFrame}`;

        // Verificar si la textura del frame existe
        if (this.textures.exists(frameKey)) {
            this.selectedObject.setTexture(frameKey);
            this.selectedObject.setData('currentFrame', newFrame);

            // Si es un elemento del template, marcarlo como modificado
            this.markAsModified(this.selectedObject);

            // Actualizar el panel de propiedades
            this.updatePropertiesPanel();

            this.selectSound.play();
        } else {
            this.showErrorMessage(`Frame ${newFrame + 1} not found`);
        }
    }

    createSpriteData() {
        if (!this.selectedObject) return null;

        const isSprite = this.selectedObject.getData('type') === 'spriteObject';
        if (!isSprite) return null;

        const frames = this.selectedObject.getData('frames') || [];
        const currentFrame = this.selectedObject.getData('currentFrame') || 0;

        return {
            isSprite: true,
            frames: frames.map(frame => ({
                name: frame.name,
                x: frame.x,
                y: frame.y,
                width: frame.width,
                height: frame.height
            })),
            currentFrame: currentFrame,
            totalFrames: frames.length
        };
    }

    undo() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            this.restoreState(this.actionHistory[this.currentHistoryIndex]);
            this.selectSound.play();
        }
    }

    redo() {
        if (this.currentHistoryIndex < this.actionHistory.length - 1) {
            this.currentHistoryIndex++;
            this.restoreState(this.actionHistory[this.currentHistoryIndex]);
            this.selectSound.play();
        }
    }

    restoreState(state) {
        // Limpiar objetos actuales y sus animaciones
        this.stageObjects.forEach(obj => {
            this.stopSpriteAnimation(obj);
            obj.destroy();
        });
        this.stageObjects = [];
        this.loadedImages = [];
        this.selectedObject = null;

        // Restaurar estado
        state.loadedImages.forEach((imgData, index) => {
            // Recrear objeto si la textura existe
            if (this.textures.exists(imgData.key)) {
                const newObject = this.add.image(
                    state.objects[index].x,
                    state.objects[index].y,
                    imgData.key
                );

                newObject.setOrigin(0, 0); // ⭐ CAMBIO: Usar el mismo origen que StageManager
                newObject.setInteractive();
                newObject.setData('type', 'stageObject');
                newObject.setData('imageKey', imgData.key);
                newObject.setData('imageName', imgData.name);
                newObject.setData('layer', imgData.layer);
                newObject.setScale(state.objects[index].scaleX, state.objects[index].scaleY);
                newObject.setRotation(state.objects[index].rotation);
                newObject.setAlpha(state.objects[index].alpha);
                newObject.setVisible(state.objects[index].visible);
                newObject.setDepth(imgData.layer);

                this.hudCamera.ignore(newObject);
                this.stageObjects.push(newObject);

                this.loadedImages.push({
                    key: imgData.key,
                    name: imgData.name,
                    width: imgData.width,
                    height: imgData.height,
                    object: newObject,
                    visible: imgData.visible,
                    layer: imgData.layer
                });
            }
        });

        this.updateLayerManager();
        this.updateUI();
    }

    createFileInput() {
        // Crear input file invisible para imágenes normales
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.multiple = true;
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        // Event listener para cuando se seleccionen archivos
        this.fileInput.addEventListener('change', (event) => {
            this.handleFileSelect(event);
        });

        // Crear input file para spritesheet (imagen)
        this.spriteImageInput = document.createElement('input');
        this.spriteImageInput.type = 'file';
        this.spriteImageInput.accept = 'image/*';
        this.spriteImageInput.style.display = 'none';
        document.body.appendChild(this.spriteImageInput);

        // Crear input file para XML
        this.spriteXMLInput = document.createElement('input');
        this.spriteXMLInput.type = 'file';
        this.spriteXMLInput.accept = '.xml,text/xml';
        this.spriteXMLInput.style.display = 'none';
        document.body.appendChild(this.spriteXMLInput);
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);

        if (files.length === 0) return;

        console.log(`📁 Procesando ${files.length} archivos seleccionados`);

        // Filtrar solo archivos de imagen
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            this.showErrorMessage('No se encontraron archivos de imagen válidos');
            return;
        }

        console.log(`🖼️ Encontrados ${imageFiles.length} archivos de imagen`);

        // Mostrar indicador de carga
        this.showLoadingIndicator(imageFiles.length);

        let loadedCount = 0;
        let errorCount = 0;

        // Procesar cada archivo
        imageFiles.forEach((file, index) => {
            console.log(`📄 Procesando archivo ${index + 1}/${imageFiles.length}: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`);

            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    await this.loadImageFromData(e.target.result, file.name);
                    loadedCount++;
                    console.log(`✅ Archivo ${index + 1} cargado: ${file.name}`);
                } catch (error) {
                    console.error(`❌ Error procesando ${file.name}:`, error);
                    errorCount++;
                }
                this.updateLoadingProgress(loadedCount + errorCount, imageFiles.length);

                // Si terminamos todos los archivos
                if (loadedCount + errorCount === imageFiles.length) {
                    console.log(`📊 Resumen: ${loadedCount} cargados, ${errorCount} errores`);
                    if (errorCount > 0) {
                        this.showErrorMessage(`${loadedCount} imágenes cargadas, ${errorCount} errores`);
                    }
                }
            };

            reader.onerror = () => {
                console.error(`❌ Error leyendo archivo: ${file.name}`);
                errorCount++;
                this.updateLoadingProgress(loadedCount + errorCount, imageFiles.length);
            };

            reader.readAsDataURL(file);
        });

        // Resetear el input para permitir cargar los mismos archivos otra vez
        event.target.value = '';
    }

    showLoadingIndicator(totalFiles) {
        const { width, height } = this.scale;

        if (this.loadingIndicator) {
            this.loadingIndicator.destroy();
        }

        this.loadingIndicator = this.add.container(width / 2, height / 2);

        const bg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0xFFFFFF);

        const text = this.add.text(0, -20, `Loading ${totalFiles} images...`, {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const progressBg = this.add.rectangle(0, 10, 250, 20, 0x333333);
        this.loadingProgressBar = this.add.rectangle(-125, 10, 0, 20, 0x00FF00).setOrigin(0, 0.5);

        this.loadingIndicator.add([bg, text, progressBg, this.loadingProgressBar]);
        this.gameCamera.ignore(this.loadingIndicator);
    }

    updateLoadingProgress(loaded, total) {
        if (this.loadingProgressBar) {
            this.loadingProgressBar.width = (loaded / total) * 250;
        }

        if (loaded >= total) {
            this.time.delayedCall(500, () => {
                if (this.loadingIndicator) {
                    this.loadingIndicator.destroy();
                    this.loadingIndicator = null;
                }
            });
        }
    }

    async loadImageFromData(dataURL, fileName) {
        // Crear una clave única basada en el nombre, tamaño y timestamp
        const timestamp = Date.now();
        const baseKey = fileName.replace(/[^a-zA-Z0-9]/g, '_');
        let imageKey = `uploaded_${baseKey}_${timestamp}`;
        let counter = 1;

        // Asegurar que la clave sea única
        while (this.usedImageKeys.has(imageKey) || this.textures.exists(imageKey)) {
            imageKey = `uploaded_${baseKey}_${timestamp}_${counter}`;
            counter++;
        }

        // Marcar la clave como en uso ANTES de cualquier operación
        this.usedImageKeys.add(imageKey);

        console.log(`Iniciando carga de imagen: ${fileName} con clave: ${imageKey}`);

        try {
            // Usar createImageBitmap si está disponible (más moderno y confiable)
            let imageBitmap;
            let width, height;

            if (typeof createImageBitmap !== 'undefined') {
                // Método moderno usando createImageBitmap
                const response = await fetch(dataURL);
                const blob = await response.blob();
                imageBitmap = await createImageBitmap(blob);
                width = imageBitmap.width;
                height = imageBitmap.height;
                console.log(`ImageBitmap creado: ${fileName}, dimensiones: ${width}x${height}`);
            } else {
                // Fallback al método tradicional
                imageBitmap = await new Promise((resolve, reject) => {
                    const tempImg = new Image();
                    tempImg.onload = () => resolve(tempImg);
                    tempImg.onerror = reject;
                    tempImg.src = dataURL;
                });
                width = imageBitmap.width;
                height = imageBitmap.height;
                console.log(`Imagen tradicional cargada: ${fileName}, dimensiones: ${width}x${height}`);
            }

            // Verificar que la textura no exista antes de proceder
            if (this.textures.exists(imageKey)) {
                console.warn(`⚠️ La textura ${imageKey} ya existe, abortando creación`);
                this.usedImageKeys.delete(imageKey);
                throw new Error(`Texture ${imageKey} already exists`);
            }

            // Intentar crear la textura con canvas (método más confiable)
            let textureCreated = false;

            try {
                console.log(`🔄 Creando textura con canvas para: ${imageKey}`);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = width;
                canvas.height = height;

                // Dibujar la imagen en el canvas
                if (imageBitmap.drawImage) {
                    // Si es una imagen tradicional
                    ctx.drawImage(imageBitmap, 0, 0);
                } else {
                    // Si es un ImageBitmap
                    ctx.drawImage(imageBitmap, 0, 0);
                }

                // Verificar una vez más antes de agregar
                if (!this.textures.exists(imageKey)) {
                    this.textures.addCanvas(imageKey, canvas);
                    textureCreated = this.textures.exists(imageKey);
                    if (textureCreated) {
                        console.log(`✅ Textura creada con canvas: ${imageKey}`);
                    } else {
                        console.warn(`❌ addCanvas no creó la textura: ${imageKey}`);
                    }
                } else {
                    console.warn(`⚠️ Textura ya existe al momento de addCanvas: ${imageKey}`);
                    textureCreated = true; // La textura ya existe, no necesitamos crearla
                }

            } catch (canvasError) {
                console.warn(`❌ Canvas method falló:`, canvasError);
                textureCreated = false;
            }

            // Si el canvas falló, intentar con addBase64
            if (!textureCreated && !this.textures.exists(imageKey)) {
                try {
                    console.log(`🔄 Intentando con addBase64 como fallback...`);
                    this.textures.addBase64(imageKey, dataURL);
                    textureCreated = this.textures.exists(imageKey);
                    if (textureCreated) {
                        console.log(`✅ Textura creada con addBase64: ${imageKey}`);
                    } else {
                        console.warn(`❌ addBase64 no creó la textura: ${imageKey}`);
                    }
                } catch (base64Error) {
                    console.warn(`❌ addBase64 falló:`, base64Error);
                }
            }

            // Verificar que tenemos una textura válida
            if (!this.textures.exists(imageKey)) {
                this.usedImageKeys.delete(imageKey);
                throw new Error(`No se pudo crear la textura para: ${imageKey}`);
            }

            // Crear el objeto de imagen
            this.createImageObject(imageKey, fileName, width, height);

            // Limpiar ImageBitmap si es necesario
            if (imageBitmap && imageBitmap.close) {
                imageBitmap.close();
            }

        } catch (error) {
            console.error(`❌ Error loading image ${fileName}:`, error);
            this.usedImageKeys.delete(imageKey);
            this.showErrorMessage(`Error loading ${fileName}: ${error.message}`);
            throw error;
        }
    }

    createImageObject(imageKey, fileName, width, height) {
        try {
            // Remover extensión del nombre del archivo
            const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

            console.log(`🔧 Creando objeto de imagen: ${nameWithoutExtension} con textura: ${imageKey}`);

            // Verificar que la textura existe antes de crear el objeto
            if (!this.textures.exists(imageKey)) {
                throw new Error(`La textura ${imageKey} no existe al crear el objeto`);
            }

            // Determinar la capa más alta + 1
            const maxLayer = this.loadedImages.length > 0 ?
                Math.max(...this.loadedImages.map(img => img.layer)) + 1 : 0;

            // Crear la imagen en el escenario inmediatamente usando el mismo sistema que StageManager
            const newObject = this.add.image(0, 0, imageKey);
            newObject.setOrigin(0, 0); // ⭐ CAMBIO: Usar el mismo origin que StageManager
            newObject.setInteractive();
            newObject.setData('type', 'stageObject');
            newObject.setData('imageKey', imageKey);
            newObject.setData('imageName', nameWithoutExtension);
            newObject.setData('layer', maxLayer);
            newObject.setData('baseX', newObject.x);
            newObject.setData('baseY', newObject.y);
            newObject.setDepth(maxLayer);

            // Hacer que la imagen NO sea visible en la cámara HUD, pero SÍ en la cámara del juego
            this.hudCamera.ignore(newObject);

            // Configurar interactividad y eventos inmediatamente
            this.setupObjectEvents(newObject);

            // Asegurar que la imagen esté visible y configurar opacidad original
            newObject.setVisible(true);
            newObject.setAlpha(1);
            newObject.setData('originalAlpha', 1); // ⭐ Establecer opacidad original

            console.log(`✅ Objeto creado exitosamente:`, {
                name: nameWithoutExtension,
                key: imageKey,
                position: `(${newObject.x}, ${newObject.y})`,
                visible: newObject.visible,
                alpha: newObject.alpha,
                depth: newObject.depth,
                texture: newObject.texture.key,
                hasTexture: !!newObject.texture,
                width: newObject.width,
                height: newObject.height
            });

            // Agregar a la lista de objetos
            this.stageObjects.push(newObject);

            // Agregar a la lista de imágenes cargadas
            this.loadedImages.push({
                key: imageKey,
                name: nameWithoutExtension,
                width: width,
                height: height,
                object: newObject,
                visible: true,
                layer: maxLayer
            });

            // Seleccionar automáticamente la imagen recién cargada
            this.selectedObject = newObject;
            this.highlightSelectedObject();

            this.confirmSound.play();
            this.updateUI();
            this.updateLayerManager();
            this.saveState('add_image');

            console.log(`🎉 Imagen completamente cargada: ${nameWithoutExtension} en layer ${maxLayer}, total objects: ${this.stageObjects.length}`);

        } catch (error) {
            console.error(`❌ Error creating image object for ${fileName}:`, error);
            this.usedImageKeys.delete(imageKey);
            this.showErrorMessage(`Error creating object for ${fileName}: ${error.message}`);
            throw error;
        }
    }

    showErrorMessage(message) {
        const { width, height } = this.scale;

        // Crear mensaje de error temporal
        const errorContainer = this.add.container(width / 2, height / 2);

        const bg = this.add.rectangle(0, 0, 400, 100, 0xFF0000, 0.8);
        bg.setStrokeStyle(2, 0xFFFFFF);

        const text = this.add.text(0, 0, message, {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: 380 }
        }).setOrigin(0.5);

        errorContainer.add([bg, text]);
        this.gameCamera.ignore(errorContainer);

        // Auto-destruir después de 3 segundos
        this.time.delayedCall(3000, () => {
            errorContainer.destroy();
        });
    }

    // ===== SISTEMA DE SPRITESHEETS =====
    openSpriteLoader() {
        // Crear modal para cargar spritesheet
        this.createSpriteLoaderModal();
    }

    createSpriteLoaderModal() {
        const { width, height } = this.scale;

        // Modal container
        this.spriteModal = this.add.container(width / 2, height / 2);

        // Background semi-transparente
        const modalOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        modalOverlay.setInteractive();

        // Panel del modal
        const modalPanel = this.add.rectangle(0, 0, 400, 300, 0x222222, 0.95);
        modalPanel.setStrokeStyle(3, 0xFFFFFF);

        // Título
        const title = this.add.text(0, -120, 'ADD SPRITESHEET', {
            fontSize: '18px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Instrucciones
        const instructions = this.add.text(0, -80, 'Select both image and XML files:', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Botón para seleccionar imagen
        const imageBtn = this.add.rectangle(0, -30, 200, 40, 0x0066CC, 0.8);
        imageBtn.setStrokeStyle(2, 0xFFFFFF);
        imageBtn.setInteractive();

        const imageBtnText = this.add.text(0, -30, 'SELECT IMAGE', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Botón para seleccionar XML
        const xmlBtn = this.add.rectangle(0, 20, 200, 40, 0x00AA00, 0.8);
        xmlBtn.setStrokeStyle(2, 0xFFFFFF);
        xmlBtn.setInteractive();

        const xmlBtnText = this.add.text(0, 20, 'SELECT XML', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Botón de cerrar
        const closeBtn = this.add.rectangle(0, 100, 100, 30, 0xFF0000, 0.8);
        closeBtn.setStrokeStyle(2, 0xFFFFFF);
        closeBtn.setInteractive();

        const closeBtnText = this.add.text(0, 100, 'CANCEL', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Variables para tracking de archivos
        let selectedImage = null;
        let selectedXML = null;

        // Event handlers
        imageBtn.on('pointerdown', () => {
            this.spriteImageInput.click();
        });

        xmlBtn.on('pointerdown', () => {
            this.spriteXMLInput.click();
        });

        closeBtn.on('pointerdown', () => {
            this.closeSpriteModal();
        });

        // Handlers para los archivos
        this.spriteImageInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedImage = file;
                imageBtnText.setText(`✓ ${file.name}`);
                imageBtnText.setFill('#00FF00');
                this.tryCreateSpritesheet(selectedImage, selectedXML);
            }
        };

        this.spriteXMLInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedXML = file;
                xmlBtnText.setText(`✓ ${file.name}`);
                xmlBtnText.setFill('#00FF00');
                this.tryCreateSpritesheet(selectedImage, selectedXML);
            }
        };

        // Agregar elementos al modal
        this.spriteModal.add([
            modalOverlay, modalPanel, title, instructions,
            imageBtn, imageBtnText, xmlBtn, xmlBtnText,
            closeBtn, closeBtnText
        ]);

        this.gameCamera.ignore(this.spriteModal);
    }

    closeSpriteModal() {
        if (this.spriteModal) {
            this.spriteModal.destroy();
            this.spriteModal = null;
        }

        // Reset inputs
        this.spriteImageInput.value = '';
        this.spriteXMLInput.value = '';
    }

    async tryCreateSpritesheet(imageFile, xmlFile) {
        if (!imageFile || !xmlFile) return;

        console.log('🎨 Creating spritesheet with:', imageFile.name, 'and', xmlFile.name);

        try {
            // Leer el archivo XML
            const xmlText = await this.readFileAsText(xmlFile);
            const xmlData = this.parseXMLData(xmlText);

            // Leer la imagen
            const imageDataURL = await this.readFileAsDataURL(imageFile);

            // Crear el spritesheet
            await this.createSpritesheetObject(imageDataURL, imageFile.name, xmlData);

            // Cerrar modal
            this.closeSpriteModal();

        } catch (error) {
            console.error('❌ Error creating spritesheet:', error);
            this.showErrorMessage(`Error creating spritesheet: ${error.message}`);
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    parseXMLData(xmlText) {
        // Parsear XML dinámicamente
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const frames = [];

        // Buscar diferentes formatos de XML automáticamente
        let frameElements = [];

        // Formato 1: <SubTexture> (común en muchos spritesheets)
        frameElements = xmlDoc.querySelectorAll('SubTexture');
        if (frameElements.length === 0) {
            // Formato 2: <sprite> o <frame>
            frameElements = xmlDoc.querySelectorAll('sprite, frame');
        }
        if (frameElements.length === 0) {
            // Formato 3: cualquier elemento con atributos x, y, width, height
            frameElements = xmlDoc.querySelectorAll('*[x][y][width][height]');
        }

        console.log(`📋 Found ${frameElements.length} frames in XML`);

        frameElements.forEach((element, index) => {
            const name = element.getAttribute('name') ||
                element.getAttribute('id') ||
                element.getAttribute('frameName') ||
                `frame_${index}`;

            const x = parseInt(element.getAttribute('x') || '0');
            const y = parseInt(element.getAttribute('y') || '0');
            const width = parseInt(element.getAttribute('width') || '0');
            const height = parseInt(element.getAttribute('height') || '0');

            // Algunos XMLs tienen offset/anchor points
            const frameX = parseInt(element.getAttribute('frameX') || element.getAttribute('offsetX') || '0');
            const frameY = parseInt(element.getAttribute('frameY') || element.getAttribute('offsetY') || '0');
            const frameWidth = parseInt(element.getAttribute('frameWidth') || width);
            const frameHeight = parseInt(element.getAttribute('frameHeight') || height);

            if (width > 0 && height > 0) {
                frames.push({
                    name: name,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    frameX: frameX,
                    frameY: frameY,
                    frameWidth: frameWidth,
                    frameHeight: frameHeight
                });
            }
        });

        console.log(`✅ Parsed ${frames.length} valid frames`);
        return frames;
    }

    async createSpritesheetObject(imageDataURL, fileName, xmlFrames) {
        if (xmlFrames.length === 0) {
            throw new Error('No valid frames found in XML');
        }

        // Crear una clave única para el spritesheet
        const timestamp = Date.now();
        const baseKey = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
        const spriteKey = `sprite_${baseKey}_${timestamp}`;

        console.log(`🎨 Creating spritesheet: ${spriteKey} with ${xmlFrames.length} frames`);

        try {
            // Cargar la imagen base
            const response = await fetch(imageDataURL);
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);

            // Crear canvas para la imagen completa
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            ctx.drawImage(imageBitmap, 0, 0);

            // Agregar la textura principal
            this.textures.addCanvas(spriteKey, canvas);

            // Crear frames individuales
            xmlFrames.forEach((frame, index) => {
                const frameKey = `${spriteKey}_${frame.name}`;

                // Crear canvas para el frame individual
                const frameCanvas = document.createElement('canvas');
                const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
                frameCanvas.width = frame.width;
                frameCanvas.height = frame.height;

                // Extraer el frame de la imagen principal
                frameCtx.drawImage(
                    imageBitmap,
                    frame.x, frame.y, frame.width, frame.height,
                    0, 0, frame.width, frame.height
                );

                // Agregar frame como textura separada (ambas nomenclaturas)
                const frameKeyName = `${spriteKey}_${frame.name}`;
                const frameKeyIndex = `${spriteKey}_frame_${index}`; // Clave con índice para navegación

                this.textures.addCanvas(frameKeyName, frameCanvas);
                this.textures.addCanvas(frameKeyIndex, frameCanvas);

                console.log(`📋 Frame ${index + 1}: ${frame.name} (${frame.width}x${frame.height})`);
            });

            // Crear el objeto spritesheet en el escenario
            this.createSpriteObject(spriteKey, fileName, xmlFrames, imageBitmap.width, imageBitmap.height);

            // Limpiar
            imageBitmap.close();

        } catch (error) {
            console.error('❌ Error creating spritesheet object:', error);
            throw error;
        }
    }

    createSpriteObject(spriteKey, fileName, frames, totalWidth, totalHeight) {
        // Determinar la capa más alta + 1
        const maxLayer = this.loadedImages.length > 0 ?
            Math.max(...this.loadedImages.map(img => img.layer)) + 1 : 0;

        const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

        // Crear el objeto sprite (usando el primer frame como preview)
        const firstFrameKey = `${spriteKey}_frame_0`; // Usar nomenclatura de índice
        const spriteObject = this.add.sprite(0, 0, firstFrameKey);

        spriteObject.setOrigin(0, 0); // ⭐ CAMBIO: Usar el mismo origen que StageManager
        spriteObject.setInteractive();
        spriteObject.setData('type', 'spriteObject');
        spriteObject.setData('spriteKey', spriteKey);
        spriteObject.setData('baseKey', spriteKey); // Guardar la clave base para cambiar frames
        spriteObject.setData('imageName', nameWithoutExtension);
        spriteObject.setData('layer', maxLayer);
        spriteObject.setData('baseX', spriteObject.x);
        spriteObject.setData('baseY', spriteObject.y);
        spriteObject.setData('frames', frames);
        spriteObject.setData('currentFrame', 0);
        spriteObject.setDepth(maxLayer);

        // Hacer que NO sea visible en la cámara HUD
        this.hudCamera.ignore(spriteObject);

        // Configurar interactividad y eventos inmediatamente
        this.setupObjectEvents(spriteObject);
        
        // Configurar opacidad original para sprites
        spriteObject.setData('originalAlpha', 1); // ⭐ Establecer opacidad original

        console.log(`✅ Sprite object created: ${nameWithoutExtension} with ${frames.length} frames`);

        // Agregar a la lista de objetos
        this.stageObjects.push(spriteObject);

        // Agregar a la lista de imágenes cargadas
        this.loadedImages.push({
            key: spriteKey,
            name: `${nameWithoutExtension} (Sprite)`,
            width: totalWidth,
            height: totalHeight,
            object: spriteObject,
            visible: true,
            layer: maxLayer,
            isSprite: true,
            frameCount: frames.length
        });

        // Seleccionar automáticamente
        this.selectedObject = spriteObject;
        this.highlightSelectedObject();

        this.confirmSound.play();
        this.updateUI();
        this.updateLayerManager();
        this.saveState('add_sprite');

        console.log(`🎉 Spritesheet loaded: ${nameWithoutExtension}, frames: ${frames.length}`);
    }

    createSpriteFramesSynchronously(spriteKey, xmlFrames) {
        if (!xmlFrames || xmlFrames.length === 0) {
            console.warn('No frames to create for sprite:', spriteKey);
            return;
        }

        console.log(`🎨 Creating ${xmlFrames.length} frames for ${spriteKey} (synchronous)`);

        const baseTexture = this.textures.get(spriteKey);
        if (!baseTexture) {
            console.error(`Base texture not found: ${spriteKey}`);
            return;
        }

        // Crear frames individuales usando la textura base de Phaser
        xmlFrames.forEach((frame, index) => {
            const frameKey = `${spriteKey}_frame_${index}`;

            // Solo crear si no existe ya
            if (!this.textures.exists(frameKey)) {
                // Usar el método correcto de Phaser para añadir frames
                baseTexture.add(frameKey, 0, frame.x, frame.y, frame.width, frame.height);
                console.log(`📋 Frame created: ${frameKey} (${frame.width}x${frame.height})`);
            }
        });
    }

    setupObjectEvents(gameObject) {
        // Verificar si ya se configuraron los eventos para evitar duplicados
        if (gameObject.getData('eventsConfigured')) {
            return;
        }
        
        // Verificar si es un objeto del template
        const isTemplate = gameObject.getData('isTemplate');
        
        if (isTemplate) {
            // Los objetos del template NO deben ser interactivos
            gameObject.setData('eventsConfigured', true);
            return;
        }
        
        try {
            // Asegurar que el objeto tenga input configurado
            if (!gameObject.input) {
                gameObject.setInteractive();
            }
            
            // Configurar drag para todos los tipos de objetos usando scene.input
            this.input.setDraggable(gameObject, true);
            
            // Configurar eventos de drag para TODOS los objetos
            gameObject.on('dragstart', (pointer, dragX, dragY) => {
                this.isDragging = true;
                
                // Calcular offset para mantener la posición relativa del mouse
                this.dragOffsetX = gameObject.x - pointer.worldX;
                this.dragOffsetY = gameObject.y - pointer.worldY;
                
                this.selectedObject = gameObject;
                this.highlightSelectedObject();
                this.updatePropertiesPanel();
                
                // Si es un elemento del template, marcarlo como modificado
                this.markAsModified(gameObject);
            });

            gameObject.on('drag', (pointer, dragX, dragY) => {
                // Usar las coordenadas del mundo del pointer más el offset
                gameObject.x = pointer.worldX + this.dragOffsetX;
                gameObject.y = pointer.worldY + this.dragOffsetY;
                this.updatePropertiesPanel();
            });

            gameObject.on('dragend', () => {
                this.isDragging = false;
                this.saveState('move_object');
            });
            
        } catch (error) {
            this.setupBasicEvents(gameObject);
            return;
        }

        // Evento de selección con click (para objetos nuevos únicamente)
        gameObject.on('pointerdown', (pointer) => {
            if (!this.isDragging) {
                this.selectedObject = gameObject;
                this.highlightSelectedObject();
                this.updatePropertiesPanel();
                this.selectSound.play();
            }
        });
        
        // Evento hover para indicar que es seleccionable
        gameObject.on('pointerover', () => {
            if (!this.isDragging) {
                document.body.style.cursor = 'pointer';
            }
        });
        
        gameObject.on('pointerout', () => {
            document.body.style.cursor = 'default';
        });

        gameObject.setData('eventsConfigured', true);
    }

    setupBasicEvents(gameObject) {
        // Configurar solo eventos básicos sin drag
        if (gameObject.getData('eventsConfigured')) {
            return;
        }

        // Verificar si es un objeto del template
        const isTemplate = gameObject.getData('isTemplate');
        
        if (isTemplate) {
            // Los objetos del template NO deben tener eventos
            console.log('🎭 Template object - no events configured:', gameObject.getData('imageName'));
            gameObject.setData('eventsConfigured', true);
            return;
        }

        try {
            // Solo para objetos NO template: asegurar que el objeto tenga input básico
            if (!gameObject.input) {
                gameObject.setInteractive();
            }

            // Solo evento de click para selección (objetos nuevos únicamente)
            gameObject.on('pointerdown', (pointer) => {
                if (!this.isDragging) {
                    this.selectedObject = gameObject;
                    this.highlightSelectedObject();
                    this.updatePropertiesPanel();
                    this.selectSound.play();
                }
            });
            
            // Evento hover para indicar que es seleccionable
            gameObject.on('pointerover', () => {
                if (!this.isDragging) {
                    document.body.style.cursor = 'pointer';
                }
            });
            
            gameObject.on('pointerout', () => {
                document.body.style.cursor = 'default';
            });
            
            gameObject.setData('eventsConfigured', true);
            console.log(`✅ Basic events configured for: ${gameObject.getData('imageName') || 'unnamed'}`);
        } catch (error) {
            console.error('❌ Failed to configure basic events:', error);
            // Marcar como configurado incluso si falla para evitar loops
            gameObject.setData('eventsConfigured', true);
        }
    }

    createGrid() {
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x333333, 0.3);

        for (let x = -4000; x <= 4000; x += this.gridSize) {
            this.gridGraphics.moveTo(x, -4000);
            this.gridGraphics.lineTo(x, 4000);
        }

        for (let y = -4000; y <= 4000; y += this.gridSize) {
            this.gridGraphics.moveTo(-4000, y);
            this.gridGraphics.lineTo(4000, y);
        }

        this.gridGraphics.strokePath();
        this.gridGraphics.setVisible(this.showGrid);

        // Hacer que el grid no sea visible en la cámara HUD
        this.hudCamera.ignore(this.gridGraphics);
    }

    createUI() {
        const { width, height } = this.scale;

        // Panel superior
        const topPanel = this.add.rectangle(width / 2, 30, width, 60, 0x000000, 0.8);
        topPanel.setStrokeStyle(2, 0xFFFFFF);
        this.gameCamera.ignore(topPanel);

        // Info de cámara
        this.cameraInfoText = this.add.text(300, 30, 'Camera: (0, 0) | Zoom: 1.0', {
            fontSize: '16px',
            fill: '#00FF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);
        this.gameCamera.ignore(this.cameraInfoText);

        // Botón para cargar imágenes
        this.loadButton = this.add.rectangle(width - 300, 30, 120, 40, 0x0066CC, 0.8);
        this.loadButton.setStrokeStyle(2, 0xFFFFFF);
        this.loadButton.setInteractive();
        this.loadButton.on('pointerdown', () => {
            this.fileInput.click();
        });
        this.gameCamera.ignore(this.loadButton);

        const loadButtonText = this.add.text(width - 300, 30, 'ADD IMAGE', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.gameCamera.ignore(loadButtonText);

        // Botón para agregar sprite (spritesheet + XML)
        this.addSpriteButton = this.add.rectangle(width - 300, 80, 120, 40, 0xFF6600, 0.8);
        this.addSpriteButton.setStrokeStyle(2, 0xFFFFFF);
        this.addSpriteButton.setInteractive();
        this.addSpriteButton.on('pointerdown', () => {
            this.openSpriteLoader();
        });
        this.gameCamera.ignore(this.addSpriteButton);

        const addSpriteButtonText = this.add.text(width - 300, 80, 'ADD SPRITE', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.gameCamera.ignore(addSpriteButtonText);

        // Botón para guardar stage
        this.saveButton = this.add.rectangle(width - 150, 30, 120, 40, 0x00CC66, 0.8);
        this.saveButton.setStrokeStyle(2, 0xFFFFFF);
        this.saveButton.setInteractive();
        this.saveButton.on('pointerdown', () => {
            this.saveStageAsJSON();
        });
        this.gameCamera.ignore(this.saveButton);

        const saveButtonText = this.add.text(width - 150, 30, 'SAVE STAGE', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.gameCamera.ignore(saveButtonText);

        // Botón para limpiar template
        this.clearTemplateButton = this.add.rectangle(width - 450, 30, 120, 40, 0xFF3366, 0.8);
        this.clearTemplateButton.setStrokeStyle(2, 0xFFFFFF);
        this.clearTemplateButton.setInteractive();
        this.clearTemplateButton.on('pointerdown', () => {
            this.clearTemplate();
        });
        this.gameCamera.ignore(this.clearTemplateButton);

        const clearTemplateButtonText = this.add.text(width - 450, 30, 'CLEAR STAGE', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.gameCamera.ignore(clearTemplateButtonText);

        // Panel lateral izquierdo - Layer Manager
        this.createLayerManager();

        // Panel lateral derecho - Propiedades del objeto
        this.createPropertiesPanel();

        this.updateUI();
    }

    clearTemplate() {
        // Mostrar confirmación antes de limpiar
        const { width, height } = this.scale;
        
        const confirmContainer = this.add.container(width / 2, height / 2);
        
        const bg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.9);
        bg.setStrokeStyle(3, 0xFF3366);
        
        const titleText = this.add.text(0, -50, '🗑️ Limpiar Stage', {
            fontSize: '20px',
            fill: '#FF3366',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        const questionText = this.add.text(0, -10, '¿Eliminar todos los elementos\ny empezar desde cero?', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5);
        
        // Botón Confirmar
        const confirmBtn = this.add.rectangle(-80, 40, 120, 30, 0xFF3366, 0.8);
        confirmBtn.setStrokeStyle(2, 0xFFFFFF);
        confirmBtn.setInteractive();
        
        const confirmText = this.add.text(-80, 40, 'CONFIRMAR', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Botón Cancelar  
        const cancelBtn = this.add.rectangle(80, 40, 120, 30, 0x666666, 0.8);
        cancelBtn.setStrokeStyle(2, 0xFFFFFF);
        cancelBtn.setInteractive();
        
        const cancelText = this.add.text(80, 40, 'CANCELAR', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        confirmContainer.add([bg, titleText, questionText, confirmBtn, confirmText, cancelBtn, cancelText]);
        this.gameCamera.ignore(confirmContainer);
        
        // Eventos
        confirmBtn.on('pointerdown', () => {
            this.performClearTemplate();
            confirmContainer.destroy();
        });
        
        cancelBtn.on('pointerdown', () => {
            this.cancelSound.play();
            confirmContainer.destroy();
        });
    }

    performClearTemplate() {
        // Guardar estado antes de limpiar
        this.saveState('clear_template');
        
        // Limpiar todos los objetos y sus animaciones
        this.stageObjects.forEach(obj => {
            this.stopSpriteAnimation(obj);
            obj.destroy();
        });
        this.stageObjects = [];
        this.loadedImages = [];
        this.selectedObject = null;
        
        // Actualizar UI
        this.updateLayerManager();
        this.updateUI();
        
        // Mostrar confirmación
        const { width, height } = this.scale;
        const notice = this.add.container(width / 2, height / 2);
        
        const bg = this.add.rectangle(0, 0, 300, 80, 0x001122, 0.9);
        bg.setStrokeStyle(2, 0x00FF88);
        
        const text = this.add.text(0, 0, '✅ Stage limpiado\nListo para nuevos elementos', {
            fontSize: '14px',
            fill: '#00FF88',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5);
        
        notice.add([bg, text]);
        this.gameCamera.ignore(notice);
        
        // Auto-ocultar después de 2 segundos
        this.time.delayedCall(2000, () => {
            if (notice) notice.destroy();
        });
        
        this.confirmSound.play();
        console.log('✅ Template limpiado correctamente');
    }

    createPropertiesPanel() {
        const { width, height } = this.scale;

        // Panel de propiedades
        const propertiesPanel = this.add.rectangle(width - 100, height / 2, 200, height, 0x000000, 0.8);
        propertiesPanel.setStrokeStyle(2, 0xFFFFFF);
        this.gameCamera.ignore(propertiesPanel);

        // Título
        const propertiesTitle = this.add.text(width - 190, 80, 'PROPERTIES', {
            fontSize: '18px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);
        this.gameCamera.ignore(propertiesTitle);

        // Container para controles interactivos
        this.propertiesControlsContainer = this.add.container(width - 190, 110);
        this.gameCamera.ignore(this.propertiesControlsContainer);

        // Área de propiedades (información de solo lectura)
        this.propertiesText = this.add.text(width - 190, 200, 'No object selected', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            wordWrap: { width: 180 }
        }).setOrigin(0, 0);
        this.gameCamera.ignore(this.propertiesText);
    }

    updatePropertiesPanel() {
        if (!this.propertiesText || !this.propertiesControlsContainer) return;

        // Limpiar controles anteriores
        this.propertiesControlsContainer.removeAll(true);

        // Limpiar event listener del teclado si existe
        if (this.scaleInputKeyHandler) {
            document.removeEventListener('keydown', this.scaleInputKeyHandler);
            this.scaleInputKeyHandler = null;
        }

        if (this.selectedObject) {
            // Crear controles interactivos
            this.createInteractiveControls();

            // Información de solo lectura
            const imageName = this.selectedObject.getData('imageName');
            const imageKey = this.selectedObject.getData('imageKey');
            const x = Math.round(this.selectedObject.x * 100) / 100;
            const y = Math.round(this.selectedObject.y * 100) / 100;
            const scaleX = Math.round(this.selectedObject.scaleX * 100) / 100;
            const scaleY = Math.round(this.selectedObject.scaleY * 100) / 100;
            const rotation = Math.round((this.selectedObject.rotation * 180 / Math.PI) * 100) / 100;
            const alpha = Math.round(this.selectedObject.alpha * 100) / 100;

            // Encontrar dimensiones originales
            const imgData = this.loadedImages.find(img => img.object === this.selectedObject);
            const width = imgData ? imgData.width : 'Unknown';
            const height = imgData ? imgData.height : 'Unknown';

            const propertiesInfo = [
                `NAME: ${imageName}`,
                '',
                `POSITION:`,
                `  X: ${x}`,
                `  Y: ${y}`,
                '',
                `SCALE:`,
                `  X: ${scaleX}`,
                `  Y: ${scaleY}`,
                '',
                `ROTATION: ${rotation}°`,
                `ALPHA: ${alpha}`,
                '',
                `DIMENSIONS:`,
                `  ${width} x ${height}`,
                '',
                `KEY: ${imageKey}`
            ].join('\n');

            this.propertiesText.setText(propertiesInfo);
        } else {
            this.propertiesText.setText('No object selected\n\nClick on an object in the\nscene or layer manager\nto view its properties.');
        }
    }

    createInteractiveControls() {
        if (!this.selectedObject) return;

        const layer = this.selectedObject.getData('layer');
        const visible = this.selectedObject.visible;
        const isSprite = this.selectedObject.getData('type') === 'spriteObject';

        let yOffset = 0;

        // Control de visibilidad
        const visibilityLabel = this.add.text(0, yOffset, 'VISIBLE:', {
            fontSize: '12px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        const visibilitySwitch = this.add.rectangle(80, yOffset + 6, 30, 14,
            visible ? 0x00FF00 : 0xFF0000, 0.8);
        visibilitySwitch.setStrokeStyle(1, 0xFFFFFF);
        visibilitySwitch.setInteractive();
        visibilitySwitch.on('pointerdown', () => {
            this.toggleSelectedObjectVisibility();
        });

        const visibilityText = this.add.text(95, yOffset + 6, visible ? 'ON' : 'OFF', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        yOffset += 25;

        // Control de layer
        const layerLabel = this.add.text(0, yOffset, 'LAYER:', {
            fontSize: '12px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        const layerValue = this.add.text(50, yOffset, layer.toString(), {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        // Botones para cambiar layer
        const layerUpBtn = this.add.rectangle(120, yOffset + 6, 20, 14, 0x0099FF, 0.8);
        layerUpBtn.setStrokeStyle(1, 0xFFFFFF);
        layerUpBtn.setInteractive();
        layerUpBtn.on('pointerdown', () => {
            this.changeSelectedObjectLayer(1);
        });

        const layerUpText = this.add.text(120, yOffset + 6, '+', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const layerDownBtn = this.add.rectangle(145, yOffset + 6, 20, 14, 0xFF9900, 0.8);
        layerDownBtn.setStrokeStyle(1, 0xFFFFFF);
        layerDownBtn.setInteractive();
        layerDownBtn.on('pointerdown', () => {
            this.changeSelectedObjectLayer(-1);
        });

        const layerDownText = this.add.text(145, yOffset + 6, '-', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        yOffset += 25;

        // Control de escala
        const scaleLabel = this.add.text(0, yOffset, 'SCALE:', {
            fontSize: '12px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);

        // Input personalizado para escala
        const scaleInputBg = this.add.rectangle(80, yOffset + 6, 60, 16, 0xFFFFFF, 0.9);
        scaleInputBg.setStrokeStyle(1, 0x000000);
        scaleInputBg.setInteractive();

        const currentScale = Math.round(this.selectedObject.scaleX * 100) / 100;
        const scaleInputText = this.add.text(82, yOffset + 6, currentScale.toString(), {
            fontSize: '10px',
            fill: '#000000',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Estado del input
        let isScaleInputActive = false;
        let scaleInputValue = currentScale.toString();

        scaleInputBg.on('pointerdown', () => {
            isScaleInputActive = true;
            scaleInputValue = '';
            scaleInputText.setText('|');
            console.log('📝 Scale input activated');
        });

        // Event listener para el teclado (solo cuando el input está activo)
        this.scaleInputKeyHandler = (event) => {
            if (!isScaleInputActive) return;

            const key = event.key;

            if (key === 'Enter') {
                // Aplicar el valor
                const newScale = parseFloat(scaleInputValue) || 1.0;
                const clampedScale = Math.max(0.1, Math.min(5.0, newScale)); // Límites entre 0.1 y 5.0

                this.selectedObject.setScale(clampedScale);
                scaleInputText.setText(clampedScale.toString());
                isScaleInputActive = false;

                // ⭐ IMPORTANTE: Si es un elemento del template, marcarlo como modificado
                this.markAsModified(this.selectedObject);

                this.updatePropertiesPanel();
                this.saveState('change_scale');
                this.selectSound.play();
            } else if (key === 'Escape') {
                // Cancelar edición
                scaleInputText.setText(currentScale.toString());
                isScaleInputActive = false;
            } else if (key === 'Backspace') {
                // Borrar último carácter
                scaleInputValue = scaleInputValue.slice(0, -1);
                scaleInputText.setText(scaleInputValue + '|');
            } else if (/^[0-9.]$/.test(key) && scaleInputValue.length < 6) {
                // Solo números y punto decimal, máximo 6 caracteres
                if (key === '.' && scaleInputValue.includes('.')) return; // Solo un punto
                scaleInputValue += key;
                scaleInputText.setText(scaleInputValue + '|');
            }
        };

        // Agregar el event listener
        document.addEventListener('keydown', this.scaleInputKeyHandler);

        yOffset += 25;

        // Controles específicos para sprites
        let spriteControls = [];
        if (isSprite) {
            const frames = this.selectedObject.getData('frames') || [];
            const currentFrame = this.selectedObject.getData('currentFrame') || 0;
            const animationStatus = this.getSpriteAnimationStatus(this.selectedObject);

            // Control de frame para sprites
            const frameLabel = this.add.text(0, yOffset, 'FRAME:', {
                fontSize: '12px',
                fill: '#FF6600',
                fontFamily: 'Arial'
            }).setOrigin(0, 0);

            const frameValue = this.add.text(50, yOffset, `${currentFrame + 1}/${frames.length}`, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0, 0);

            // Botones para cambiar frame
            const framePrevBtn = this.add.rectangle(120, yOffset + 6, 20, 14, 0x6600FF, 0.8);
            framePrevBtn.setStrokeStyle(1, 0xFFFFFF);
            framePrevBtn.setInteractive();
            framePrevBtn.on('pointerdown', () => {
                this.changeSpriteFrame(-1);
            });

            const framePrevText = this.add.text(120, yOffset + 6, '◀', {
                fontSize: '8px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            const frameNextBtn = this.add.rectangle(145, yOffset + 6, 20, 14, 0x6600FF, 0.8);
            frameNextBtn.setStrokeStyle(1, 0xFFFFFF);
            frameNextBtn.setInteractive();
            frameNextBtn.on('pointerdown', () => {
                this.changeSpriteFrame(1);
            });

            const frameNextText = this.add.text(145, yOffset + 6, '▶', {
                fontSize: '8px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            yOffset += 25;

            // Controles de animación
            const animLabel = this.add.text(0, yOffset, 'ANIMATION:', {
                fontSize: '12px',
                fill: '#FF6600',
                fontFamily: 'Arial'
            }).setOrigin(0, 0);

            // Botón BPM
            const bpmBtn = this.add.rectangle(80, yOffset + 6, 35, 14, 
                animationStatus && animationStatus.mode === 'bpm' ? 0x00FF00 : 0x666666, 0.8);
            bpmBtn.setStrokeStyle(1, 0xFFFFFF);
            bpmBtn.setInteractive();
            bpmBtn.on('pointerdown', () => {
                if (animationStatus && animationStatus.mode === 'bpm') {
                    this.stopSpriteAnimation(this.selectedObject);
                } else {
                    this.startSpriteAnimation(this.selectedObject, 'bpm', this.defaultBPM);
                }
                this.updatePropertiesPanel();
            });

            const bpmText = this.add.text(97.5, yOffset + 6, 'BPM', {
                fontSize: '8px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // Botón Loop
            const loopBtn = this.add.rectangle(120, yOffset + 6, 35, 14, 
                animationStatus && animationStatus.mode === 'loop' ? 0x00FF00 : 0x666666, 0.8);
            loopBtn.setStrokeStyle(1, 0xFFFFFF);
            loopBtn.setInteractive();
            loopBtn.on('pointerdown', () => {
                if (animationStatus && animationStatus.mode === 'loop') {
                    this.stopSpriteAnimation(this.selectedObject);
                } else {
                    this.startSpriteAnimation(this.selectedObject, 'loop');
                }
                this.updatePropertiesPanel();
            });

            const loopText = this.add.text(137.5, yOffset + 6, 'LOOP', {
                fontSize: '8px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // Botón Stop
            const stopBtn = this.add.rectangle(160, yOffset + 6, 25, 14, 0xFF0000, 0.8);
            stopBtn.setStrokeStyle(1, 0xFFFFFF);
            stopBtn.setInteractive();
            stopBtn.on('pointerdown', () => {
                this.stopSpriteAnimation(this.selectedObject);
                this.updatePropertiesPanel();
            });

            const stopText = this.add.text(172.5, yOffset + 6, '■', {
                fontSize: '8px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            spriteControls = [
                frameLabel, frameValue, framePrevBtn, framePrevText, frameNextBtn, frameNextText,
                animLabel, bpmBtn, bpmText, loopBtn, loopText, stopBtn, stopText
            ];
        }

        // Agregar todos los controles al container
        this.propertiesControlsContainer.add([
            visibilityLabel, visibilitySwitch, visibilityText,
            layerLabel, layerValue, layerUpBtn, layerUpText, layerDownBtn, layerDownText,
            scaleLabel, scaleInputBg, scaleInputText,
            ...spriteControls
        ]);
    }

    toggleSelectedObjectVisibility() {
        if (!this.selectedObject) return;

        const imgData = this.loadedImages.find(img => img.object === this.selectedObject);
        if (imgData) {
            imgData.visible = !imgData.visible;
            this.selectedObject.setVisible(imgData.visible);
            
            // ⭐ IMPORTANTE: Si es un elemento del template, marcarlo como modificado
            this.markAsModified(this.selectedObject);
            
            this.updatePropertiesPanel();
            this.updateLayerManager();
            this.saveState('toggle_visibility');
            this.selectSound.play();
        }
    }

    changeSelectedObjectLayer(delta) {
        if (!this.selectedObject) return;

        const imgData = this.loadedImages.find(img => img.object === this.selectedObject);
        if (imgData) {
            const newLayer = Math.max(0, imgData.layer + delta);
            imgData.layer = newLayer;
            this.selectedObject.setData('layer', newLayer);
            this.selectedObject.setDepth(newLayer);

            // ⭐ IMPORTANTE: Si es un elemento del template, marcarlo como modificado
            this.markAsModified(this.selectedObject);

            this.updatePropertiesPanel();
            this.updateLayerManager();
            this.saveState('change_layer');
            this.selectSound.play();
        }
    }

    createLayerManager() {
        const { height } = this.scale;

        // Panel del Layer Manager
        const layerPanel = this.add.rectangle(120, height / 2, 240, height, 0x000000, 0.8);
        layerPanel.setStrokeStyle(2, 0xFFFFFF);
        this.gameCamera.ignore(layerPanel);

        // Título del Layer Manager
        const layerTitle = this.add.text(20, 80, 'LAYER MANAGER', {
            fontSize: '18px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0);
        this.gameCamera.ignore(layerTitle);

        // Container para las layers con scroll
        this.layerScrollContainer = this.add.container(20, 110);
        this.gameCamera.ignore(this.layerScrollContainer);

        this.updateLayerManager();
    }

    truncateText(text, maxLength = 15) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    updateLayerManager() {
        if (!this.layerScrollContainer) return;

        // Limpiar contenido anterior
        this.layerScrollContainer.removeAll(true);

        // Filtrar solo objetos NO template para el layer manager
        const nonTemplateImages = this.loadedImages.filter(img => !img.isTemplate);

        if (nonTemplateImages.length === 0) {
            const noLayersText = this.add.text(0, 0, 'No editable layers\n(Template objects are hidden)', {
                fontSize: '14px',
                fill: '#888888',
                fontFamily: 'Arial',
                align: 'center'
            });
            this.layerScrollContainer.add(noLayersText);
            return;
        }

        // Ordenar por layer (del más alto al más bajo)
        const sortedImages = [...nonTemplateImages].sort((a, b) => b.layer - a.layer);

        // Crear elementos para cada layer
        sortedImages.forEach((img, visualIndex) => {
            const yPos = visualIndex * 55;

            // Background del layer
            const layerBg = this.add.rectangle(100, yPos + 25, 200, 50,
                img.object === this.selectedObject ? 0x003366 : 0x222222, 0.8);
            layerBg.setStrokeStyle(1, 0x666666);

            // Hacer el layer arrastrable (corregido)
            layerBg.setInteractive({ draggable: true });
            layerBg.setData('layerIndex', this.loadedImages.indexOf(img));
            layerBg.setData('originalIndex', this.loadedImages.indexOf(img));
            layerBg.setData('visualIndex', visualIndex);
            layerBg.setData('imageObject', img); // Referencia directa al objeto de imagen

            // Variable para rastrear el estado de drag sin setTint/clearTint
            let originalColor = img.object === this.selectedObject ? 0x003366 : 0x222222;

            // Nombre truncado del layer
            const truncatedName = this.truncateText(img.name, 12);
            const layerName = this.add.text(10, yPos + 8, truncatedName, {
                fontSize: '12px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0, 0);

            // Layer number
            const layerNumber = this.add.text(10, yPos + 25, `Layer: ${img.layer}`, {
                fontSize: '10px',
                fill: '#CCCCCC',
                fontFamily: 'Arial'
            }).setOrigin(0, 0);

            // Dimensiones y estado
            const statusText = img.visible ? 'VISIBLE' : 'HIDDEN';
            const statusColor = img.visible ? '#00FF00' : '#FF0000';
            const dimensions = this.add.text(10, yPos + 38, `${img.width}x${img.height} - ${statusText}`, {
                fontSize: '9px',
                fill: statusColor,
                fontFamily: 'Arial'
            }).setOrigin(0, 0);

            // Botón de eliminar
            const deleteBtn = this.add.rectangle(190, yPos + 25, 18, 18, 0xFF0000, 0.8);
            deleteBtn.setStrokeStyle(1, 0xFFFFFF);
            deleteBtn.setInteractive();
            deleteBtn.on('pointerdown', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.deleteLayer(this.loadedImages.indexOf(img));
            });

            const deleteText = this.add.text(190, yPos + 25, 'X', {
                fontSize: '9px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // Eventos de arrastre para reordenar layers (corregido)
            layerBg.on('dragstart', () => {
                this.isLayerDragging = true;
                // Cambiar color sin setTint
                layerBg.fillColor = 0x555555;
            });

            layerBg.on('drag', (pointer, dragX, dragY) => {
                layerBg.y = yPos + 25 + dragY;
            });

            layerBg.on('dragend', (pointer, dragX, dragY) => {
                this.isLayerDragging = false;
                // Restaurar color original sin clearTint
                layerBg.fillColor = originalColor;
                layerBg.y = yPos + 25;

                // Calcular nueva posición en la lista basándose en la posición final del arrastre
                const layerHeight = 55;
                const draggedDistance = dragY;
                const layersMoved = Math.round(draggedDistance / layerHeight);
                const newVisualIndex = Math.max(0, Math.min(sortedImages.length - 1, visualIndex + layersMoved));

                const imageObject = layerBg.getData('imageObject');

                console.log(`🎯 Drag info: visualIndex=${visualIndex}, dragY=${dragY}, layersMoved=${layersMoved}, newVisualIndex=${newVisualIndex}`);

                if (newVisualIndex !== visualIndex) {
                    this.reorderLayerByObject(imageObject, visualIndex, newVisualIndex);
                }
            });

            // Click para seleccionar
            layerBg.on('pointerdown', () => {
                if (!this.isLayerDragging) {
                    this.selectObjectByIndex(this.loadedImages.indexOf(img));
                }
            });

            this.layerScrollContainer.add([layerBg, layerName, layerNumber, dimensions, deleteBtn, deleteText]);
        });
    }

    reorderLayerByObject(imageObject, oldVisualIndex, newVisualIndex) {
        if (!imageObject || oldVisualIndex === newVisualIndex) return;

        console.log(`🔄 Reordenando layer: ${imageObject.name} de posición visual ${oldVisualIndex} a ${newVisualIndex}`);

        // Crear lista de todos los layers ordenados por su layer actual (mayor a menor)
        const sortedLayers = [...this.loadedImages].sort((a, b) => b.layer - a.layer);

        // Encontrar el objeto que se está moviendo en la lista ordenada
        const layerToMoveIndex = sortedLayers.findIndex(layer => layer === imageObject);
        if (layerToMoveIndex === -1) {
            console.error('❌ No se encontró el layer a mover');
            return;
        }

        // Remover el layer que se está moviendo de su posición actual
        const layerToMove = sortedLayers.splice(layerToMoveIndex, 1)[0];

        // Insertarlo en la nueva posición
        sortedLayers.splice(newVisualIndex, 0, layerToMove);

        // Reasignar los números de layer basados en la nueva posición
        // El más alto en la lista visual = layer más alto numéricamente
        sortedLayers.forEach((layer, index) => {
            const newLayerValue = sortedLayers.length - 1 - index;

            console.log(`📍 Layer "${layer.name}": ${layer.layer} → ${newLayerValue}`);

            // Actualizar el layer en el objeto loadedImages
            layer.layer = newLayerValue;

            // Actualizar el layer en el objeto de juego
            layer.object.setData('layer', newLayerValue);
            layer.object.setDepth(newLayerValue);
        });

        // Actualizar la UI
        this.updateLayerManager();
        this.updatePropertiesPanel();
        this.saveState('reorder_layer');
        this.selectSound.play();

        console.log(`✅ Reordenamiento completado`);
    }

    reorderLayer(originalIndex, oldVisualIndex, newVisualIndex) {
        if (originalIndex < 0 || originalIndex >= this.loadedImages.length) return;

        // Obtener el objeto que se está moviendo
        const movedLayer = this.loadedImages[originalIndex];
        if (!movedLayer) return;

        this.reorderLayerByObject(movedLayer, oldVisualIndex, newVisualIndex);
    }

    toggleLayerVisibility(index) {
        if (index >= 0 && index < this.loadedImages.length) {
            const layer = this.loadedImages[index];
            layer.visible = !layer.visible;
            layer.object.setVisible(layer.visible);
            this.updateLayerManager();
            this.updatePropertiesPanel();
            this.saveState('toggle_visibility');
            this.selectSound.play();
        }
    }

    deleteLayer(index) {
        if (index >= 0 && index < this.loadedImages.length) {
            const layer = this.loadedImages[index];

            // Detener animación si existe
            this.stopSpriteAnimation(layer.object);

            // Remover del set de claves usadas
            this.usedImageKeys.delete(layer.key);

            // Remover del array de objetos
            const objIndex = this.stageObjects.indexOf(layer.object);
            if (objIndex > -1) {
                this.stageObjects.splice(objIndex, 1);
            }

            // Destruir el objeto
            layer.object.destroy();

            // Remover textura
            if (this.textures.exists(layer.key)) {
                this.textures.remove(layer.key);
            }

            // Remover del array de imágenes cargadas
            this.loadedImages.splice(index, 1);

            // Si era el objeto seleccionado, deseleccionar
            if (this.selectedObject === layer.object) {
                this.selectedObject = null;
            }

            this.updateLayerManager();
            this.updatePropertiesPanel();
            this.updateUI();
            this.saveState('delete_layer');
            this.cancelSound.play();
        }
    }

    moveLayerUp(index) {
        if (index >= 0 && index < this.loadedImages.length) {
            const layer = this.loadedImages[index];
            layer.layer = layer.layer + 1;
            layer.object.setDepth(layer.layer);
            layer.object.setData('layer', layer.layer);

            this.updateLayerManager();
            this.updatePropertiesPanel();
            this.saveState('move_layer_up');
            this.selectSound.play();

            console.log(`📈 Moved layer "${layer.name}" up to layer ${layer.layer}`);
        }
    }

    moveLayerDown(index) {
        if (index >= 0 && index < this.loadedImages.length) {
            const layer = this.loadedImages[index];
            // No permitir que vaya por debajo de 0
            if (layer.layer > 0) {
                layer.layer = layer.layer - 1;
                layer.object.setDepth(layer.layer);
                layer.object.setData('layer', layer.layer);

                this.updateLayerManager();
                this.updatePropertiesPanel();
                this.saveState('move_layer_down');
                this.selectSound.play();

                console.log(`📉 Moved layer "${layer.name}" down to layer ${layer.layer}`);
            } else {
                console.log(`⚠️ Cannot move layer "${layer.name}" below 0`);
            }
        }
    }

    selectObjectByIndex(index) {
        if (index >= 0 && index < this.loadedImages.length) {
            this.selectedObject = this.loadedImages[index].object;
            this.highlightSelectedObject();
            this.updateUI();
            this.updateLayerManager();
            this.updatePropertiesPanel();
            this.selectSound.play();
        }
    }

    updateUI() {
        // Calcular estadísticas de elementos
        const templateCount = this.loadedImages.filter(img => img.isTemplate).length;
        const customCount = this.loadedImages.filter(img => !img.isTemplate).length;
        const totalCount = this.loadedImages.length;

        // Actualizar info de cámara y elementos
        this.cameraInfoText.setText(
            `Camera: (${Math.round(this.gameCamera.scrollX)}, ${Math.round(this.gameCamera.scrollY)}) | Zoom: ${this.zoomLevel.toFixed(1)}\n📦 Elements: ${totalCount} total (🎭 ${templateCount} template, ✏️ ${customCount} custom)`
        );

        // Actualizar panel de propiedades
        this.updatePropertiesPanel();
    }

    setupInputHandlers() {
        // Keyboard controls
        this.input.keyboard.on('keydown-SPACE', () => {
            this.toggleGrid();
        });

        this.input.keyboard.on('keydown-L', () => {
            this.fileInput.click();
        });

        this.input.keyboard.on('keydown-R', () => {
            this.resetCamera();
        });

        this.input.keyboard.on('keydown-P', () => {
            this.enableParallax = !this.enableParallax;
            console.log(`🎭 Parallax ${this.enableParallax ? 'ENABLED' : 'DISABLED'}`);
            this.selectSound.play();
        });

        this.input.keyboard.on('keydown-DELETE', () => {
            this.deleteSelected();
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.exitEditor();
        });

        // Undo/Redo
        this.input.keyboard.on('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                if (event.code === 'KeyZ' && !event.shiftKey) {
                    event.preventDefault();
                    this.undo();
                } else if ((event.code === 'KeyY') || (event.code === 'KeyZ' && event.shiftKey)) {
                    event.preventDefault();
                    this.redo();
                }
            } else if (event.code === 'KeyC') {
                // Centrar cámara en el objeto seleccionado
                if (this.selectedObject) {
                    this.gameCamera.scrollX = this.selectedObject.x - this.scale.width / 2;
                    this.gameCamera.scrollY = this.selectedObject.y - this.scale.height / 2;
                    this.updateUI();
                    console.log(`Cámara centrada en objeto: (${this.selectedObject.x}, ${this.selectedObject.y})`);
                } else {
                    // Si no hay objeto seleccionado, ir al centro (0,0)
                    this.gameCamera.scrollX = -this.scale.width / 2;
                    this.gameCamera.scrollY = -this.scale.height / 2;
                    this.updateUI();
                    console.log('Cámara centrada en (0,0)');
                }
            }
        });

        // Mouse controls
        this.input.on('pointerdown', (pointer) => {
            // Ignorar clics en las áreas del HUD
            if (pointer.x < 240 || pointer.x > this.scale.width - 200) return;

            if (pointer.button === 1) { // Middle mouse button
                this.isCameraDragging = true;
                this.cameraDragStartX = pointer.x;
                this.cameraDragStartY = pointer.y;
                this.input.setDefaultCursor('grabbing');
            } else if (pointer.button === 0) { // Left mouse button
                this.selectObject(pointer.worldX, pointer.worldY);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isCameraDragging) {
                const deltaX = pointer.x - this.cameraDragStartX;
                const deltaY = pointer.y - this.cameraDragStartY;

                this.gameCamera.scrollX -= deltaX / this.zoomLevel;
                this.gameCamera.scrollY -= deltaY / this.zoomLevel;

                this.cameraDragStartX = pointer.x;
                this.cameraDragStartY = pointer.y;
                this.updateUI();
            } else if (this.isDragging && this.selectedObject) {
                // Movimiento libre sin restricciones de grid
                this.selectedObject.x = pointer.worldX;
                this.selectedObject.y = pointer.worldY;
                this.updateUI();
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.button === 1) { // Middle mouse button
                this.isCameraDragging = false;
                this.input.setDefaultCursor('default');
            } else {
                if (this.isDragging && this.selectedObject) {
                    // Actualizar posiciones base para el parallax
                    this.selectedObject.setData('baseX', this.selectedObject.x);
                    this.selectedObject.setData('baseY', this.selectedObject.y);
                    this.saveState('move_object');
                }
                this.isDragging = false;
            }
        });

        // Mouse wheel para zoom
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const zoomChange = deltaY > 0 ? -0.1 : 0.1;
            this.zoomLevel = Phaser.Math.Clamp(this.zoomLevel + zoomChange, 0.2, 3.0);
            this.gameCamera.setZoom(this.zoomLevel);
            this.updateUI();
        });
    }

    setupCameraControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    }

    update() {
        // Controles de cámara (solo afectan la cámara del juego)
        const speed = 8 / this.zoomLevel; // Ajustar velocidad según zoom

        if (this.wasd.W.isDown || this.cursors.up.isDown) {
            this.gameCamera.scrollY -= speed;
        }
        if (this.wasd.S.isDown || this.cursors.down.isDown) {
            this.gameCamera.scrollY += speed;
        }
        if (this.wasd.A.isDown || this.cursors.left.isDown) {
            this.gameCamera.scrollX -= speed;
        }
        if (this.wasd.D.isDown || this.cursors.right.isDown) {
            this.gameCamera.scrollX += speed;
        }

        // Actualizar parallax en objetos (solo si está activado)
        if (this.enableParallax) {
            this.updateParallaxEffects();
        }

        // Actualizar UI si la cámara se está moviendo
        if (this.wasd.W.isDown || this.wasd.S.isDown || this.wasd.A.isDown || this.wasd.D.isDown ||
            this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.left.isDown || this.cursors.right.isDown) {
            this.updateUI();
        }
    }

    updateParallaxEffects() {
        // Aplicar efecto parallax a todos los objetos basado en su layer
        this.stageObjects.forEach(obj => {
            const layer = obj.getData('layer') || 0;
            const baseX = obj.getData('baseX') || 0;
            const baseY = obj.getData('baseY') || 0;

            // Si no se han guardado las posiciones base, guardarlas
            if (obj.getData('baseX') === undefined) {
                obj.setData('baseX', obj.x);
                obj.setData('baseY', obj.y);
                return;
            }

            // Calcular factor parallax basado en la capa
            const parallaxMultiplier = (layer / this.maxLayer) * this.parallaxFactor;
            const scrollFactor = 1 + parallaxMultiplier;

            // Aplicar efecto parallax
            const offsetX = this.gameCamera.scrollX * (scrollFactor - 1);
            const offsetY = this.gameCamera.scrollY * (scrollFactor - 1);

            obj.x = baseX - offsetX;
            obj.y = baseY - offsetY;
        });
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridGraphics.setVisible(this.showGrid);
        this.selectSound.play();
    }

    selectObject(x, y) {
        let foundObject = null;

        // Buscar el objeto más cercano al clic (del más alto al más bajo)
        const sortedObjects = [...this.stageObjects].sort((a, b) =>
            b.getData('layer') - a.getData('layer')
        );

        for (let obj of sortedObjects) {
            const bounds = obj.getBounds();
            if (bounds.contains(x, y)) {
                foundObject = obj;
                break;
            }
        }

        if (foundObject) {
            this.selectedObject = foundObject;
            this.selectSound.play();

            // Highlight del objeto seleccionado
            this.highlightSelectedObject();
        } else {
            this.selectedObject = null;
            this.highlightSelectedObject(); // Limpiar highlights
        }

        this.updateUI();
        this.updateLayerManager();
    }

    highlightSelectedObject() {
        // Guardar opacidades originales antes de aplicar highlight
        this.stageObjects.forEach(obj => {
            if (!obj.getData('originalAlpha')) {
                obj.setData('originalAlpha', obj.alpha);
            }
        });

        // Remover highlights previos restaurando opacidad original
        this.stageObjects.forEach(obj => {
            if (obj !== this.selectedObject) {
                const originalAlpha = obj.getData('originalAlpha') || 1;
                obj.setAlpha(originalAlpha * 0.7); // Dimming effect manteniendo la opacidad original
            }
        });

        // Highlight del objeto seleccionado (restaurar su opacidad original)
        if (this.selectedObject) {
            const originalAlpha = this.selectedObject.getData('originalAlpha') || 1;
            this.selectedObject.setAlpha(originalAlpha);
        } else {
            // Restaurar alpha original de todos los objetos
            this.stageObjects.forEach(obj => {
                const originalAlpha = obj.getData('originalAlpha') || 1;
                obj.setAlpha(originalAlpha);
            });
        }
    }

    deleteSelected() {
        if (this.selectedObject) {
            const imgIndex = this.loadedImages.findIndex(img => img.object === this.selectedObject);
            if (imgIndex > -1) {
                this.deleteLayer(imgIndex);
            }
        }
    }

    resetCamera() {
        this.gameCamera.scrollX = 0;
        this.gameCamera.scrollY = 0;
        this.zoomLevel = 1;
        this.gameCamera.setZoom(this.zoomLevel);
        this.selectSound.play();
        this.updateUI();
    }

    exitEditor() {
        this.cancelSound.play();

        // Limpiar el input file
        if (this.fileInput) {
            document.body.removeChild(this.fileInput);
            this.fileInput = null;
        }

        // Guardar el escenario
        this.saveStage();

        this.time.delayedCall(200, () => {
            this.scene.get('TransitionScene').startTransition('EditorsState');
        });
    }

    saveStage() {
        // Filtrar solo objetos que NO son template
        const nonTemplateObjects = this.stageObjects.filter(obj => !obj.getData('isTemplate'));
        
        const stageData = {
            objects: nonTemplateObjects.map(obj => ({
                x: obj.x,
                y: obj.y,
                imageKey: obj.getData('imageKey'),
                imageName: obj.getData('imageName'),
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                rotation: obj.rotation,
                alpha: obj.alpha,
                layer: obj.getData('layer'),
                visible: obj.visible
            })),
            camera: {
                x: this.gameCamera.scrollX,
                y: this.gameCamera.scrollY,
                zoom: this.zoomLevel
            }
        };

        // Guardar en localStorage
        localStorage.setItem('stageEditorData', JSON.stringify(stageData));
    }

    saveStageAsJSON() {
        // Filtrar solo elementos que NO son template
        const nonTemplateImages = this.loadedImages.filter(img => !img.isTemplate);
        
        if (nonTemplateImages.length === 0) {
            this.showErrorMessage('No custom elements to save (only template elements found)');
            return;
        }

        // Crear el JSON en el formato del stage.json
        const stageJSON = {
            stage: nonTemplateImages.map(img => {
                const baseData = {
                    layer: img.layer,
                    scale: img.object.scaleX, // Asumiendo escala uniforme
                    namePath: img.name.replace(/\.[^/.]+$/, ""), // Remover extensión
                    visible: img.visible,
                    opacity: img.object.getData('originalAlpha') || img.object.alpha, // ⭐ CORREGIDO: Usar opacidad original del usuario
                    position: [Math.round(img.object.x), Math.round(img.object.y)]
                };

                // Agregar datos específicos de sprites
                const isSprite = img.object.getData('type') === 'spriteObject';
                if (isSprite) {
                    const frames = img.object.getData('frames') || [];
                    const currentFrame = img.object.getData('currentFrame') || 0;

                    baseData.type = 'sprite';
                    baseData.spriteData = {
                        totalFrames: frames.length,
                        currentFrame: currentFrame,
                        frames: frames.map(frame => ({
                            name: frame.name,
                            x: frame.x,
                            y: frame.y,
                            width: frame.width,
                            height: frame.height
                        }))
                    };
                } else {
                    baseData.type = 'image';
                }

                return baseData;
            }).sort((a, b) => a.layer - b.layer) // Ordenar por layer
        };

        // Crear nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const fileName = `stage_${timestamp}.json`;

        // Crear y descargar el archivo
        const jsonString = JSON.stringify(stageJSON, null, 4);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.confirmSound.play();
    }

    // ===== CARGA DE STAGE TEMPLATE =====
    async loadDefaultStageTemplate() {
        try {
            console.log('🎭 Cargando stage.json como template...');
            
            // Cargar el stage.json por defecto
            const response = await fetch('public/assets/data/stages/stage.json');
            if (!response.ok) {
                throw new Error(`Error al cargar stage.json: ${response.status}`);
            }
            
            const stageData = await response.json();
            
            if (!stageData || !stageData.stage) {
                throw new Error('Formato de stage.json inválido');
            }
            
            console.log('📊 Stage data cargado:', stageData);
            
            // Filtrar solo los elementos que tienen imágenes (no jugadores)
            const imageElements = stageData.stage.filter(element => 
                element.namePath && !element.player
            );
            
            if (imageElements.length === 0) {
                console.log('ℹ️ No hay elementos de imagen en el stage template');
                return;
            }
            
            // Precargar todas las texturas del stage
            await this.preloadStageTextures(imageElements);
            
            // Crear los objetos del stage
            this.createStageObjects(imageElements);
            
            console.log(`✅ Template cargado: ${imageElements.length} elementos`);
            
        } catch (error) {
            console.error('❌ Error cargando stage template:', error);
            this.showErrorMessage('Error cargando stage template');
        }
    }

    async preloadStageTextures(imageElements) {
        console.log('🖼️ Precargando texturas del stage...');
        
        const loadPromises = imageElements.map(element => {
            return new Promise((resolve) => {
                const imagePath = `public/assets/images/stages/stage/${element.namePath}.png`;
                const textureKey = `stage_${element.namePath}`;
                
                // Solo cargar si no existe ya
                if (this.textures.exists(textureKey)) {
                    resolve();
                    return;
                }
                
                this.load.image(textureKey, imagePath);
                resolve();
            });
        });
        
        await Promise.all(loadPromises);
        
        // Iniciar la carga si hay elementos nuevos
        if (this.load.totalToLoad > 0) {
            return new Promise((resolve) => {
                this.load.once('complete', resolve);
                this.load.start();
            });
        }
    }

    createStageObjects(imageElements) {
        console.log('🏗️ Creando objetos del stage...');
        
        imageElements.forEach((element, index) => {
            const textureKey = `stage_${element.namePath}`;
            
            if (!this.textures.exists(textureKey)) {
                console.warn(`⚠️ Textura no encontrada: ${textureKey}`);
                return;
            }
            
            // Crear el objeto de imagen usando el mismo sistema que el editor
            const [x = 0, y = 0] = Array.isArray(element.position) ? element.position : [0, 0];
            
            const stageObject = this.add.image(x, y, textureKey);
            stageObject.setOrigin(0, 0); // Mismo origen que StageManager
            stageObject.setScale(element.scale || 1.0);
            stageObject.setAlpha(element.opacity ?? 1.0);
            stageObject.setDepth(element.layer || 0);
            stageObject.setVisible(element.visible !== false);
            // NO hacer interactivo a los objetos del template
            
            // Configurar datos del objeto
            stageObject.setData('type', 'stageObject');
            stageObject.setData('imageKey', textureKey);
            stageObject.setData('imageName', element.namePath);
            stageObject.setData('layer', element.layer || 0);
            stageObject.setData('baseX', stageObject.x);
            stageObject.setData('baseY', stageObject.y);
            stageObject.setData('isTemplate', true); // Marcar como elemento del template
            stageObject.setData('originalAlpha', element.opacity ?? 1.0); // ⭐ Guardar opacidad original del template
            
            // Hacer que NO sea visible en la cámara HUD
            this.hudCamera.ignore(stageObject);
            
            // NO configurar eventos para objetos del template
            stageObject.setData('eventsConfigured', true); // Marcar como ya configurado para evitar procesamiento
            
            // Agregar a las arrays
            this.stageObjects.push(stageObject);
            
            // Agregar a loadedImages para el layer manager
            this.loadedImages.push({
                key: textureKey,
                name: element.namePath,
                width: stageObject.width,
                height: stageObject.height,
                visible: stageObject.visible,
                layer: element.layer || 0,
                object: stageObject,
                isTemplate: true
            });
            
            console.log(`➕ Objeto creado: ${element.namePath} en (${x}, ${y})`);
        });
        
        // Actualizar la UI después de cargar
        this.time.delayedCall(100, () => {
            this.updateLayerManager();
            this.updateUI();
        });
    }
}

// Registrar la escena
if (typeof game !== 'undefined') {
    game.scene.add('StageEditorScene', StageEditor);
}

