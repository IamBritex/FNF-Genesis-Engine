import { ModularWindow } from '../../utils/window.js';

/**
 * source/funkin/ui/editors/stage/AddElement.js
 * Abre una ventana modal para añadir nuevos assets a la escena.
 */
export class AddElementWindow {

    /**
     * @param {Phaser.Scene} scene La escena (StageEditor)
     */
    constructor(scene) {
        this.scene = scene;
        this.windowInstance = null;
        this.onDestroy = null;

        const config = {
            width: 400,
            height: 200,
            title: 'Add Element',
            close: true,
            maximize: false,
            minimize: false,
            overlay: true, 
            move: false,    
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };
        
        this.windowInstance = new ModularWindow(this.scene, config);

        if (this.windowInstance) {
            this.windowInstance.onDestroy = () => {
                if (this.onDestroy) this.onDestroy();
            };
        }
        this.addListeners();
    }

    get domElement() {
        return this.windowInstance.domElement;
    }

    createContent() {
        return `
            <div class="add-element-container">
                <button class="add-btn" id="btn-add-asset">Add Asset</button>
                <button class="add-btn" id="btn-add-object">Add Object</button>
                <input type="file" id="asset-file-input" multiple accept=".png,.xml" style="display: none;">
            </div>
        `;
    }

    addListeners() {
        if (!this.windowInstance?.domElement) return;
        const node = this.windowInstance.domElement.node;
        const assetBtn = node.querySelector('#btn-add-asset');
        const objectBtn = node.querySelector('#btn-add-object');
        const fileInput = node.querySelector('#asset-file-input');

        assetBtn.addEventListener('click', () => fileInput.click());

        objectBtn.addEventListener('click', () => {
            this.createBasicObject();
            this.windowInstance.destroy();
        });

        fileInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                this.onAssetsSelected(files);
                this.windowInstance.destroy();
            }
        });
    }
    
    createBasicObject() {
        const x = this.scene.gameCam.scrollX;
        const y = this.scene.gameCam.scrollY;
        const rect = this.scene.add.rectangle(x, y, 100, 100, 0xFFFFFF);
        rect.setData('characterName', 'BasicObject'); 
        this.scene.cameraManager.assignToGame(rect);
        this.scene.elementsManager.registerElement(rect);
        const topDepth = (this.scene.elementsManager.registeredElements.length || 1);
        rect.setDepth(topDepth);
        if (this.scene.reassignAllDepths) this.scene.reassignAllDepths(); 
        this.scene.elementsManager.setSelected(rect);
    }

    createStyles() {
        const colorPrimary = '#663399';
        const colorHover = '#7a4fcf';

        return `
            .add-element-container {
                display: flex; flex-direction: column; justify-content: center;
                align-items: center; height: 100%; gap: 15px;
            }
            .add-btn {
                background-color: ${colorPrimary}; color: white; border: none;
                padding: 12px 20px; font-size: 16px; font-weight: bold;
                border-radius: 5px; cursor: pointer; width: 80%;
                transition: background-color 0.2s ease;
            }
            .add-btn:hover { background-color: ${colorHover}; }
            .add-btn#btn-add-object { background-color: #007bff; }
            .add-btn#btn-add-object:hover { background-color: #009cff; }
        `;
    }

    onAssetsSelected(fileList) {
        const files = Array.from(fileList);
        const pngFiles = files.filter(f => f.name.endsWith('.png'));
        const xmlFiles = files.filter(f => f.name.endsWith('.xml'));

        if (xmlFiles.length > 0 && pngFiles.length > 0) {
            const xmlFile = xmlFiles[0];
            const pngFile = pngFiles.find(p => p.name.replace('.png', '') === xmlFile.name.replace('.xml', ''));

            if (pngFile && xmlFile) {
                console.log(`Detectado par Spritesheet: ${pngFile.name} + ${xmlFile.name}`);
                this.loadSparrowAtlas(pngFile, xmlFile);
            } else {
                this.loadImages(pngFiles);
            }
        } else if (pngFiles.length > 0) {
            this.loadImages(pngFiles);
        }
    }

    loadImages(pngFiles) {
        pngFiles.forEach(file => {
            const key = `custom_asset_${file.name.replace('.png', '')}`;
            const url = URL.createObjectURL(file);
            this.scene.load.image(key, url);
            this.scene.load.once(`filecomplete-image-${key}`, () => {
                this.createAssetInScene(key, 'image');
                URL.revokeObjectURL(url); 
            });
        });
        this.scene.load.start();
    }

    loadSparrowAtlas(pngFile, xmlFile) {
        const key = `custom_atlas_${xmlFile.name.replace('.xml', '')}`;
        const pngUrl = URL.createObjectURL(pngFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlData = e.target.result;
            const frames = this.parseXmlAtlas(xmlData);

            const image = new Image();
            image.onload = () => {
                if (this.scene.textures.exists(key)) {
                    this.scene.textures.remove(key);
                }

                const texture = this.scene.textures.createCanvas(key, image.width, image.height);
                if (!texture) {
                    console.error("Fallo al crear la textura de canvas");
                    return;
                }
                const context = texture.getContext();
                context.drawImage(image, 0, 0); 

                for (const [frameName, frameData] of Object.entries(frames)) {
                    const frame = texture.add(frameName, 0, frameData.x, frameData.y, frameData.width, frameData.height);
                    
                    // --- [CORRECCIÓN: Aplicar Trim] ---
                    if (frameData.frameWidth > 0 && frameData.frameHeight > 0) {
                        frame.setTrim(
                            frameData.frameWidth,   // realWidth
                            frameData.frameHeight,  // realHeight
                            Math.abs(frameData.frameX), // x (offset positivo)
                            Math.abs(frameData.frameY), // y (offset positivo)
                            frameData.width,        // width (recortado)
                            frameData.height        // height (recortado)
                        );
                    }
                    // ----------------------------------
                }
                
                texture.refresh(); 
                URL.revokeObjectURL(pngUrl);
                this.createAssetInScene(key, 'spritesheet');
            };
            image.src = pngUrl; 
        };
        reader.readAsText(xmlFile);
    }
    
    parseXmlAtlas(xmlData) {
        const frames = {};
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlData, "text/xml");
        const subTextures = xmlDoc.getElementsByTagName("SubTexture");

        for (let i = 0; i < subTextures.length; i++) {
            const subTexture = subTextures[i];
            const name = subTexture.getAttribute("name");
            const x = parseInt(subTexture.getAttribute("x") || 0);
            const y = parseInt(subTexture.getAttribute("y") || 0);
            const width = parseInt(subTexture.getAttribute("width") || 0);
            const height = parseInt(subTexture.getAttribute("height") || 0);
            
            // --- [CORRECCIÓN: Leer datos de trim] ---
            const frameX = parseInt(subTexture.getAttribute("frameX") || 0);
            const frameY = parseInt(subTexture.getAttribute("frameY") || 0);
            const frameWidth = parseInt(subTexture.getAttribute("frameWidth") || 0);
            const frameHeight = parseInt(subTexture.getAttribute("frameHeight") || 0);

            if (name) {
                frames[name] = { x, y, width, height, frameX, frameY, frameWidth, frameHeight };
            }
        }
        return frames;
    }

    createAssetInScene(textureKey, assetType) {
        const x = this.scene.gameCam.scrollX;
        const y = this.scene.gameCam.scrollY;
        
        let newElement;
        const assetName = textureKey.replace('custom_atlas_', '').replace('custom_asset_', '');
        
        if (assetType === 'spritesheet') {
            newElement = this.scene.elementsManager.createSpritesheetElement(
                textureKey, x, y, assetName, 24
            );
        } else {
            newElement = this.scene.elementsManager.createImageElement(
                textureKey, x, y, assetName
            );
        }

        const topDepth = (this.scene.elementsManager.registeredElements.length || 1);
        newElement.setDepth(topDepth);
        
        if (this.scene.reassignAllDepths) this.scene.reassignAllDepths(); 
        this.scene.elementsManager.setSelected(newElement);
    }
}