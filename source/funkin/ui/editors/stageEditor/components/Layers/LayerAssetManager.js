export class LayerAssetManager {
    constructor(scene, elementsManager) {
        this.scene = scene;
        this.elementsManager = elementsManager;
    }

    createBasicObject() {
        const x = this.scene.gameCam.scrollX + (this.scene.gameCam.width / 2);
        const y = this.scene.gameCam.scrollY + (this.scene.gameCam.height / 2);
        const rect = this.scene.add.rectangle(x, y, 100, 100, 0xFFFFFF);
        rect.setData('characterName', 'BasicObject'); 
        this.scene.cameraManager.assignToGame(rect);
        this.elementsManager.registerElement(rect);
        const topDepth = (this.elementsManager.registeredElements.length || 1);
        rect.setDepth(topDepth);
        if (this.scene.reassignAllDepths) this.scene.reassignAllDepths(); 
        this.elementsManager.setSelected(rect);
    }

    onAssetsSelected(fileList) {
        const files = Array.from(fileList);
        const pngFiles = files.filter(f => f.name.endsWith('.png'));
        const xmlFiles = files.filter(f => f.name.endsWith('.xml'));

        if (xmlFiles.length > 0 && pngFiles.length > 0) {
            const xmlFile = xmlFiles[0];
            const pngFile = pngFiles.find(p => p.name.replace('.png', '') === xmlFile.name.replace('.xml', ''));

            if (pngFile && xmlFile) {
                console.log(`[Layers] Par Spritesheet detectado: ${pngFile.name} + ${xmlFile.name}`);
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
                if (!texture) return;
                
                const context = texture.getContext();
                context.drawImage(image, 0, 0); 

                for (const [frameName, frameData] of Object.entries(frames)) {
                    const frame = texture.add(frameName, 0, frameData.x, frameData.y, frameData.width, frameData.height);
                    if (frameData.frameWidth > 0 && frameData.frameHeight > 0) {
                        frame.setTrim(
                            frameData.frameWidth, frameData.frameHeight,
                            Math.abs(frameData.frameX), Math.abs(frameData.frameY),
                            frameData.width, frameData.height
                        );
                    }
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
            const frameX = parseInt(subTexture.getAttribute("frameX") || 0);
            const frameY = parseInt(subTexture.getAttribute("frameY") || 0);
            const frameWidth = parseInt(subTexture.getAttribute("frameWidth") || 0);
            const frameHeight = parseInt(subTexture.getAttribute("frameHeight") || 0);

            if (name) frames[name] = { x, y, width, height, frameX, frameY, frameWidth, frameHeight };
        }
        return frames;
    }

    createAssetInScene(textureKey, assetType) {
        const x = this.scene.gameCam.scrollX + (this.scene.gameCam.width / 2);
        const y = this.scene.gameCam.scrollY + (this.scene.gameCam.height / 2);
        
        let newElement;
        const assetName = textureKey.replace('custom_atlas_', '').replace('custom_asset_', '');
        
        if (assetType === 'spritesheet') {
            newElement = this.elementsManager.createSpritesheetElement(textureKey, x, y, assetName, 24);
        } else {
            newElement = this.elementsManager.createImageElement(textureKey, x, y, assetName);
        }

        const topDepth = (this.elementsManager.registeredElements.length || 1);
        newElement.setDepth(topDepth);
        if (this.scene.reassignAllDepths) this.scene.reassignAllDepths(); 
        this.elementsManager.setSelected(newElement);
    }
}