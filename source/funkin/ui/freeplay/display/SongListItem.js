import Alphabet from "../../../../utils/Alphabet.js";
import { IconSongEnemy } from "./iconSongEnemy.js";

export class SongListItem extends Phaser.GameObjects.Container {
    constructor(scene, x, y, songData, index) {
        super(scene, x, y);
        this.targetY = index;

        this.text = new Alphabet(scene, 0, 0, songData.displayName, true, 1.0);
        this.add(this.text);

        const iconX = this.text.width + 50; 
        this.icon = new IconSongEnemy(scene, iconX, 8, songData.icon);
        this.add(this.icon);

        scene.add.existing(this);
    }

    updateState(isSelected, time, delta) {
        const targetAlpha = isSelected ? 1.0 : 0.6;
        
        this.alpha = Phaser.Math.Linear(this.alpha, targetAlpha, 0.1);

        if (this.icon) {
            if (isSelected) {
                this.icon.playBeat(time, delta);
            } else {
                this.icon.idle();
            }
        }
    }
}