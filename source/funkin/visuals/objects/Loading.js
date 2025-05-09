export class LoadingScreen {
    constructor(scene) {
        this.scene = scene;
        this._initProperties();
    }

    _initProperties() {
        this._loadingDots = 0;
        this._loadingText = null;
        this._loadingItemText = null;
        this._loadingAnim = null;
        this._isCreating = false;
        this._currentLoadingItem = null;
        this.loadingImage = null;
        this.loadingLayer = null;
    }

    setup() {
        const { width, height } = this.scene.scale;
        const fontSize = 32;
        
        // Crear capa especial
        this.loadingLayer = this.scene.add.layer().setDepth(9999);
    
        // Configurar imagen de fondo
        this._setupBackground(width, height);
        
        // Configurar textos
        this._setupLoadingTexts(width, height, fontSize);
    
        // Configurar animación
        this._setupAnimation();
    
        // Configurar listeners
        this._setupListeners();
    }

    _setupBackground(width, height) {
        this.loadingImage = this.scene.add.image(width / 2, height / 2, 'funkay');
        this.loadingLayer.add(this.loadingImage);
        
        const imgRatio = this.scene.textures.get('funkay').getSourceImage().width / 
                       this.scene.textures.get('funkay').getSourceImage().height;
        const screenRatio = width / height;
        
        if (screenRatio > imgRatio) {
            this.loadingImage.setDisplaySize(width, width / imgRatio);
        } else {
            this.loadingImage.setDisplaySize(height * imgRatio, height);
        }
    }

    _setupLoadingTexts(width, height, fontSize) {
        // Texto principal
        this._loadingText = this.scene.add.text(
            20, height - 20, 
            'Loading...', 
            {
                fontFamily: 'VCR',
                fontSize: fontSize,
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 2,
                    stroke: true
                }
            }
        ).setOrigin(0, 1);
        this.loadingLayer.add(this._loadingText);

        // Texto de elemento actual
        this._loadingItemText = this.scene.add.text(
            20, height - 60,
            '',
            {
                fontFamily: 'VCR',
                fontSize: fontSize - 4,
                color: '#CCCCCC',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0, 1);
        this.loadingLayer.add(this._loadingItemText);
    }

    _setupAnimation() {
        this._loadingAnim = this.scene.time.addEvent({
            delay: 300,
            callback: this._animateLoadingText,
            callbackScope: this,
            loop: true
        });
    }

    _setupListeners() {
        // Listener para progreso de archivos
        this.scene.load.on('fileprogress', (file) => {
            this._currentLoadingItem = this._getFileType(file.key || file.url);
        });

        // Listener para completado
        this.scene.events.once('createcomplete', () => {
            this.destroy();
        });
    }

    _animateLoadingText() {
        if (!this._loadingText || !this._loadingItemText) return;
        
        // Animación de puntos
        this._loadingDots = (this._loadingDots + 1) % 4;
        const text = this._isCreating ? 'Creating' : 'Loading';
        const dots = '.'.repeat(this._loadingDots);
        
        this._loadingText.setText(text + dots);
        
        // Actualizar texto de elemento actual
        if (this._currentLoadingItem) {
            this._loadingItemText.setText(`> ${this._currentLoadingItem}`);
        }
    }

    _getFileType(filePath) {
        if (filePath.includes('characters')) return 'Characters';
        if (filePath.includes('stage') || filePath.includes('background')) return 'Background';
        if (filePath.includes('.json')) return 'Data';
        if (filePath.includes('notes') || filePath.includes('strum')) return 'Notes';
        if (filePath.includes('audio') || filePath.includes('sounds')) return 'Sounds';
        if (filePath.includes('songs')) return 'Songs';
        if (filePath.includes('images')) return 'Textures';
        return null;
    }

    setCreatingMode(isCreating) {
        this._isCreating = isCreating;
    }

    setCurrentItem(item) {
        this._currentLoadingItem = item;
    }

    destroy() {
        // Detener animación
        if (this._loadingAnim) {
            this._loadingAnim.destroy();
        }

        // Destruir elementos gráficos
        const elements = [
            this._loadingText,
            this._loadingItemText,
            this.loadingImage,
            this.loadingLayer
        ];

        elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });

        // Limpiar referencias
        this._initProperties();
    }
}