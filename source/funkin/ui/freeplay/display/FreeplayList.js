import { SongListItem } from "./SongListItem.js";

export class FreeplayList {
    constructor(scene, songs) {
        this.scene = scene;
        this.items = [];
        this.songSpacing = 160;
        
        this.container = this.scene.add.container(100, scene.cameras.main.height / 2);
        
        this._createItems(songs);
    }

    _createItems(songs) {
        songs.forEach((song, index) => {
            const item = new SongListItem(
                this.scene, 
                0, 
                index * this.songSpacing, 
                song, 
                index
            );
            this.container.add(item);
            this.items.push(item);
        });
    }

    update(curSelected, time, delta) {
        const targetY = -curSelected * this.songSpacing;
        
        this.container.y = Phaser.Math.Linear(this.container.y, targetY + this.scene.cameras.main.height / 2, 0.1);

        this.items.forEach((item, index) => {
            item.updateState(index === curSelected, time, delta);
        });
    }

    destroy() {
        this.items.forEach(i => i.destroy());
        this.container.destroy();
    }
}