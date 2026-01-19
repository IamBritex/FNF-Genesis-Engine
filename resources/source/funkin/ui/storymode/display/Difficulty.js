import { smEvents } from '../events/SMEventBus.js';

export class Difficulty {
    constructor(scene) {
        this.scene = scene;
        this.leftArrow = null;
        this.rightArrow = null;
        this.activeSprite = null; 
        
        this.difficulties = [];
        this.centerX = 0; 
        this.centerY = 535;
        this.oldSpritesGroup = [];

        this.onDifficultyChangedBinding = this.onDifficultyChanged.bind(this);
        smEvents.on('difficulty-changed', this.onDifficultyChangedBinding);
    }

    create(difficulties) {
        this.difficulties = difficulties;
        const { width } = this.scene.scale;
        
        this.centerX = width - 222;
        const diffY = 520;
        const diffScale = 0.9;

        this.leftArrow = this.scene.add.sprite(width - 410, diffY, 'storymenu/arrows')
            .setDepth(1000).setScale(diffScale);
        
        this.rightArrow = this.scene.add.sprite(width - 35, diffY, 'storymenu/arrows')
            .setDepth(1000).setScale(diffScale);

        this.createAnimations();
        
        this.leftArrow.play('leftIdle');
        this.rightArrow.play('rightIdle');

        const initialTexture = this.difficulties[1] || this.difficulties[0];
        
        if (this.activeSprite) this.activeSprite.destroy();

        this.activeSprite = this.scene.add.image(this.centerX, this.centerY, initialTexture)
            .setOrigin(0.5, 0.5)
            .setDepth(1000)
            .setScale(diffScale);

        // Referencias
        this.scene.leftDifficultyArrow = this.leftArrow;
        this.scene.rightDifficultyArrow = this.rightArrow;
        this.scene.difficultyImage = this.activeSprite;
    }

    createAnimations() {
        if (!this.scene.anims.exists('leftIdle')) {
            this.scene.anims.create({ key: 'leftIdle', frames: this.scene.anims.generateFrameNames('storymenu/arrows', { prefix: 'leftIdle', end: 0, zeroPad: 4 }) });
            this.scene.anims.create({ key: 'leftConfirm', frames: this.scene.anims.generateFrameNames('storymenu/arrows', { prefix: 'leftConfirm', end: 0, zeroPad: 4 }) });
            this.scene.anims.create({ key: 'rightIdle', frames: this.scene.anims.generateFrameNames('storymenu/arrows', { prefix: 'rightIdle', end: 0, zeroPad: 4 }) });
            this.scene.anims.create({ key: 'rightConfirm', frames: this.scene.anims.generateFrameNames('storymenu/arrows', { prefix: 'rightConfirm', end: 0, zeroPad: 4 }) });
        }
    }

    onDifficultyChanged(data) {
        this.changeDifficulty(data.difficultyIndex, data.direction);
    }

    changeDifficulty(newIndex, direction) {
        const newTexture = this.difficulties[newIndex];
        if (!newTexture) return;

        // Animar flechas
        if (this.leftArrow && this.leftArrow.active && direction === -1) {
            this.leftArrow.play('leftConfirm');
            this.leftArrow.chain('leftIdle');
        } 
        if (this.rightArrow && this.rightArrow.active && direction === 1) {
            this.rightArrow.play('rightConfirm');
            this.rightArrow.chain('rightIdle');
        }

        const offset = 50; 
        let startX, endX_Old;

        if (direction === 1) { 
            startX = this.centerX + offset; 
            endX_Old = this.centerX - offset;
        } else { 
            startX = this.centerX - offset;
            endX_Old = this.centerX + offset;
        }

        // Crear nuevo sprite (NO INTERACTIVO AQUÍ, SMInputMobile se encargará si es necesario)
        const nextSprite = this.scene.add.image(startX, this.centerY, newTexture)
            .setOrigin(0.5, 0.5)
            .setDepth(1000)
            .setScale(0.9)
            .setAlpha(0);

        if (this.activeSprite && this.activeSprite.active) {
            const oldSprite = this.activeSprite;
            this.oldSpritesGroup.push(oldSprite);

            this.scene.tweens.killTweensOf(oldSprite);

            this.scene.tweens.add({
                targets: oldSprite,
                x: endX_Old,
                alpha: 0,
                duration: 300,
                ease: 'Quad.out',
                onComplete: () => {
                    if (oldSprite.active) oldSprite.destroy();
                    this.oldSpritesGroup = this.oldSpritesGroup.filter(s => s !== oldSprite);
                }
            });
        }

        this.scene.tweens.add({
            targets: nextSprite,
            x: this.centerX,
            alpha: 1,
            duration: 300,
            ease: 'Quad.out'
        });

        this.activeSprite = nextSprite;
        this.scene.difficultyImage = this.activeSprite;
    }

    destroy() {
        smEvents.off('difficulty-changed', this.onDifficultyChangedBinding);
        
        if (this.leftArrow) this.leftArrow.destroy();
        if (this.rightArrow) this.rightArrow.destroy();
        if (this.activeSprite) this.activeSprite.destroy();
        this.oldSpritesGroup.forEach(s => s.destroy());
    }
}