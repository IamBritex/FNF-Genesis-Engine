export default class WindowsChangesScript {
    constructor(scene) {
        this.scene = scene;
        this.currentWindow = 0;
        this.windowCount = 4;
        this.beatCount = 0;
        this.lastBeat = 0;
        this.beatInterval = 0;
        this.isInitialized = false;
    }

    async init() {
        console.log("Inicializando script de ventanas");
        
        if (!this.scene.stageManager) {
            console.error('StageManager not found');
            return;
        }

        // Corregir el filtro para encontrar la capa de ventana
        this.windowLayer = this.scene.stageManager.layers.find(
            layer => layer.layerData?.layer === 3 && 
                    layer.layerData?.namePath?.toLowerCase().includes('win')
        );

        if (!this.windowLayer) {
            console.error('Window layer not found');
            return;
        }

        const bpm = this.scene.songData?.song?.bpm || 100;
        this.beatInterval = 60000 / bpm;
        
        await this.preloadTextures();
        this.changeWindow(0);
        this.isInitialized = true;
    }

    async preloadTextures() {
        const promises = [];
        for (let i = 0; i <= this.windowCount; i++) {
            const textureKey = `philly_win${i}`;
            if (!this.scene.textures.exists(textureKey)) {
                promises.push(new Promise((resolve) => {
                    this.scene.load.image(textureKey, `public/assets/images/stages/philly/win${i}.png`);
                    this.scene.load.once(`filecomplete-image-${textureKey}`, resolve);
                }));
            }
        }
        
        if (promises.length > 0) {
            this.scene.load.start();
            await Promise.all(promises);
        }
    }

    changeWindow(windowIndex) {
        if (!this.windowLayer?.image || !this.isInitialized) return;

        const textureKey = `philly_win${windowIndex}`;
        if (this.scene.textures.exists(textureKey)) {
            this.windowLayer.image.setTexture(textureKey);
        }
    }

    update(time, delta) {
        if (!this.isInitialized) return;

        const currentTime = this.scene.songPosition || 0;
        const currentBeat = Math.floor(currentTime / this.beatInterval);

        if (currentBeat > this.lastBeat) {
            this.beatCount++;
            
            if (this.beatCount >= 4) {
                this.beatCount = 0;
                this.currentWindow = (this.currentWindow + 1) % (this.windowCount + 1);
                this.changeWindow(this.currentWindow);
            }
            
            this.lastBeat = currentBeat;
        }
    }

    cleanup() {
        this.isInitialized = false;
        this.windowLayer = null;
    }

    destroy() {
        this.cleanup();
        this.scene = null;
    }
}