export class ArrowManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.playerArrows = [];
        this.enemyArrows = [];
    }

    createPlayerArrows() {
        this.playerArrows = [];
        for (let i = 0; i < 4; i++) {
            const pos = this.config.playerStatic[i];
            const direction = this.config.directions[i];
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', 
                `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            
            arrow.setScale(this.config.scale.static);
            arrow.setDepth(10);
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            
            this.playerArrows[i] = arrow;
        }
        return this.playerArrows;
    }

    createEnemyArrows() {
        this.enemyArrows = [];
        for (let i = 0; i < 4; i++) {
            const pos = this.config.enemyStatic[i];
            const direction = this.config.directions[i];
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', 
                `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            
            arrow.setScale(this.config.scale.static);
            arrow.setDepth(10);
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            
            this.enemyArrows[i] = arrow;
        }
        return this.enemyArrows;
    }

    updateArrowState(arrow, state, isPlayer = true) {
        const config = isPlayer ? this.config.playerConfirm : this.config.enemyConfirm;
        const pos = config[arrow.directionIndex];
        
        arrow.setPosition(pos.x, pos.y)
            .setTexture('noteStrumline', `confirm${arrow.direction.charAt(0).toUpperCase() + arrow.direction.slice(1)}0001`)
            .setScale(this.config.scale.confirm);
    }

    resetArrow(arrow) {
        arrow.setPosition(arrow.originalX, arrow.originalY)
            .setTexture('noteStrumline', `static${arrow.direction.charAt(0).toUpperCase() + arrow.direction.slice(1)}0001`)
            .setScale(this.config.scale.static);
    }
}