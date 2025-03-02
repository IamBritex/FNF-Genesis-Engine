class GfDanceState extends Phaser.Scene {
    constructor() {
        super({ key: "GfDanceState" });
    }

    preload() {
        console.log("GfDanceState cargado correctamente");

        // ====== CARGAR ASSETS ======
        this.load.atlasXML('gfDance', 'assets/IntroMenu/gfDanceTitle.png', 'assets/IntroMenu/gfDanceTitle.xml');
        this.load.atlasXML('titleEnter', 'assets/IntroMenu/titleEnter.png', 'assets/IntroMenu/titleEnter.xml');
        this.load.atlasXML('logoBumpin', 'assets/IntroMenu/logoBumpin.png', 'assets/IntroMenu/logoBumpin.xml');
        this.load.audio('confirm', 'assets/sounds/confirmMenu.ogg');
    }

    create() {
        let gfX = 880;
        let gfY = 380;

        // ====== ANIMACIONES ======
        this.anims.create({
            key: 'gf_dance',
            frames: this.anims.generateFrameNames('gfDance', {
                start: 0,
                end: 29,
                zeroPad: 4,
                prefix: 'gfDance',
                suffix: ''
            }),
            frameRate: 23,
            repeat: -1
        });

        let gf = this.add.sprite(gfX, gfY, 'gfDance').setScale(1).setOrigin(0.5);
        gf.play('gf_dance');

        this.anims.create({
            key: 'enter_idle',
            frames: this.anims.generateFrameNames('titleEnter', {
                start: 0,
                end: 0,
                prefix: 'ENTER IDLE000',
                suffix: ''
            }),
            frameRate: 0,
            repeat: -1
        });

        let enterLogo = this.add.sprite(900, 620, 'titleEnter').setScale(1).setOrigin(0.5);
        enterLogo.play('enter_idle');

        this.anims.create({
            key: 'logo_bumpin',
            frames: this.anims.generateFrameNames('logoBumpin', {
                start: 0,
                end: 14,
                prefix: 'logo bumpin000',
                suffix: ''
            }),
            frameRate: 19,
            repeat: -1
        });

        let logo = this.add.sprite(340, 250, 'logoBumpin').setScale(0.9).setOrigin(0.5);
        logo.play('logo_bumpin');

        this.anims.create({
            key: 'enter_pressed',
            frames: this.anims.generateFrameNames('titleEnter', {
                start: 0,
                end: 1,
                prefix: 'ENTER PRESSED000',
                suffix: ''
            }),
            frameRate: 14,
            repeat: -1
        });

        // ====== DETECTAR TECLA ENTER ======
        this.input.keyboard.on('keydown-ENTER', () => {
            enterLogo.play('enter_pressed');
            this.sound.play('confirm');
            this.scene.get("TransitionScene").startTransition("MainMenuState");
        });
    }
}

game.scene.add("GfDanceState", GfDanceState);
