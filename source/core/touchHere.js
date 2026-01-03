export class touchHere extends Phaser.Scene {
    constructor() {
        super({ key: 'touchHere' });
        this.bf = null;
        this.pressEnterSprite = null;
        this.maskGraphics = null;
        this.loadingFinished = false;
        this.canPressEnter = false;
        this.enterKey = null;
    }

    preload() {
        this.load.image('loadingImage', 'public/images/ui/loading/funkin.png');
        this.load.image('boxNoodles', 'public/images/ui/loading/boxOfNoodles.png');
        this.load.image('longNoodle', 'public/images/ui/loading/longNoodle.png');
        this.load.atlasXML('bf_atlas', 'public/images/ui/loading/bf.png', 'public/images/ui/loading/bf.xml');
        this.load.atlasXML('pressEnter', 'public/images/ui/loading/pressEnter.png', 'public/images/ui/loading/pressEnter.xml');
        this.load.audio('enterSound', 'public/sounds/scrollMenu.ogg');
    }

    create() {
        const { width, height } = this.scale;
        const margin = 25;
        const noodleYOffset = 60;
        const noodleXShift = 50;

        this.add.image(0, 0, 'loadingImage').setOrigin(0, 0).setDisplaySize(width, height);
        this.add.image(margin, height - margin, 'boxNoodles').setOrigin(0, 1);
        this.longNoodle = this.add.image((width / 2) + noodleXShift, height - noodleYOffset, 'longNoodle')
            .setOrigin(0.5, 1);

        this.maskGraphics = this.make.graphics();
        const mask = this.longNoodle.createGeometryMask(this.maskGraphics);
        this.longNoodle.setMask(mask);

        const noodleCenterX = this.longNoodle.x;
        const noodleCenterY = this.longNoodle.y - (this.longNoodle.displayHeight / 2);

        const pressStartXOffset = 70;
        const pressStartYOffset = 20;

        this.pressEnterSprite = this.add.sprite(
            noodleCenterX - pressStartXOffset,
            noodleCenterY - pressStartYOffset,
            'pressEnter',
            'press to start образец 10005'
        );
        this.pressEnterSprite.setAlpha(0);

        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        if (!this.anims.exists('bf_ate_anim')) {
            this.anims.create({
                key: 'bf_ate_anim',
                frames: this.anims.generateFrameNames('bf_atlas', { prefix: 'bf ate', start: 0, end: 7, zeroPad: 4 }),
                frameRate: 24,
                repeat: -1
            });
        }
        if (!this.anims.exists('bf_complete_anim')) {
            this.anims.create({
                key: 'bf_complete_anim',
                frames: this.anims.generateFrameNames('bf_atlas', { prefix: 'load complete', start: 0, end: 23, zeroPad: 4 }),
                frameRate: 24,
                repeat: 0
            });
        }

        if (!this.anims.exists('press_enter_anim')) {
            this.anims.create({
                key: 'press_enter_anim',
                frames: this.anims.generateFrameNames('pressEnter', {
                    prefix: 'press to start образец 1',
                    start: 0,
                    end: 5,
                    zeroPad: 4
                }),
                frameRate: 24,
                repeat: 0
            });
        }

        // --- BF SETUP ---
        this.noodleRightEdge = this.longNoodle.x + (this.longNoodle.displayWidth / 2);
        this.noodleLeftEdge = this.longNoodle.x - (this.longNoodle.displayWidth / 2);

        this.bf = this.add.sprite(0, 0, 'bf_atlas').setOrigin(0, 0);

        this.startBX = this.noodleRightEdge - (this.bf.width / 2);
        this.targetBX = this.noodleLeftEdge - (this.bf.width / 2);

        this.fixedBY = (noodleCenterY - (this.bf.height - 80)) - 50;

        this.bf.setPosition(this.startBX, this.fixedBY);
        this.bf.play('bf_ate_anim');
    }

    update() {
        if (this.canPressEnter && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.startGameTransition();
        }

        if (this.loadingFinished) return;

        let progress = window.loadProgress || 0;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;

        const currentX = Phaser.Math.Interpolation.Linear([this.startBX, this.targetBX], progress);
        this.bf.x = currentX;

        this.maskGraphics.clear();
        this.maskGraphics.fillStyle(0xffffff);
        const maskX = this.noodleLeftEdge;
        const maskY = 0;
        const maskW = (this.bf.x - this.noodleLeftEdge) + (this.bf.width / 2);
        const maskH = this.scale.height;

        if (maskW > 0) {
            this.maskGraphics.fillRect(maskX, maskY, maskW, maskH);
        }

        if (progress >= 1 && window.isGameLoaded && !this.loadingFinished) {
            this.finishLoadingSequence();
        }
    }

    finishLoadingSequence() {
        this.loadingFinished = true;
        this.bf.stop();

        this.bf.y -= 35;

        this.bf.play('bf_complete_anim');
        console.log("¡Carga completa!");

        this.tweens.add({
            targets: this.bf,
            x: this.bf.x + 40, // Rebote hacia la derecha
            duration: 800,
            ease: 'Bounce.easeOut'
        });

        this.tweens.add({
            targets: this.pressEnterSprite,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.canPressEnter = true;
            }
        });
    }

    startGameTransition() {
        this.canPressEnter = false;

        this.sound.play('enterSound');

        this.pressEnterSprite.play('press_enter_anim');

        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('IntroMenu');
        });
    }

    shutdown() {
        this.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        super.shutdown();
    }
}