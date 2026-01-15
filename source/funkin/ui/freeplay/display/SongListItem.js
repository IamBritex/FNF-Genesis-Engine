import Alphabet from "../../../../utils/Alphabet.js";
import { IconSongEnemy } from "./iconSongEnemy.js";

export class SongListItem extends Phaser.GameObjects.Container {
    constructor(scene, x, y, songData, index) {
        super(scene, x, y);
        this.targetY = index;

        // 1. Crear el Icono PRIMERO (Al frente)
        // Lo colocamos un poco desplazado para que el centro del icono quede bien alineado
        this.icon = new IconSongEnemy(scene, 0, 8, songData.icon);
        this.add(this.icon);

        // 2. Crear el Texto DESPUÉS
        // Lo movemos a la derecha (ej. 130px) para que no se encime con el icono
        const textX = 90; 
        this.text = new Alphabet(scene, textX, 0, songData.displayName.toUpperCase(), true, 1.0);
        this.add(this.text);

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