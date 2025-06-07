export default class WindowsChangesScript {
    constructor(scene) {
        this.scene = scene;
        this.currentWindow = 0;
        this.windowCount = 4;
        this.beatCount = 0;
        this.lastBeat = 0;
        this.beatInterval = 0;
    }

    async init() {
        console.log("Inicializando script de ventanas");
        
        this.windowLayer = this.scene.stageManager.layers.find(
            layer => layer.layerData?.layer === 3 && 
                    layer.layerData?.path?.includes('win')
        );

        const bpm = this.scene.currentBPM || this.scene.songData.song.bpm;
        this.beatInterval = 60000 / bpm;
        
        this.changeWindow(0);
    }

    changeWindow(windowIndex) {
        if (!this.windowLayer?.image) return;

        const textureKey = `philly_win${windowIndex}`;
        
        if (this.scene.textures.exists(textureKey)) {
            this.windowLayer.image.setTexture(textureKey);
        } else {
            this.scene.load.image(textureKey, `public/assets/images/stages/philly/win${windowIndex}.png`);
            this.scene.load.once('complete', () => {
                this.windowLayer.image.setTexture(textureKey);
            });
            this.scene.load.start();
        }
    }

    update(time, delta) {
        const currentTime = this.scene.songPosition;
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
        this.windowLayer = null;
    }
}