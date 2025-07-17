class GfDanceState extends Phaser.Scene {
    constructor() {
        super({ key: "GfDanceState" });
        this.isTransitioning = false;
    }

    preload() {
        console.log("GfDanceState cargado correctamente");
        this.loadAssets();
    }

    create() {
        this.isTransitioning = false;

        this.setupAnimations();
        this.createSprites();
        this.setupControls();
        this.initAndroidSupport();

        this.events.on('wake', () => {
            this.isTransitioning = false;
        });
    }

    loadAssets() {
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
        
        const assets = [
            { type: 'atlasXML', key: 'gfDance', img: 'public/assets/images/states/IntroMenu/gfDanceTitle.png', xml: 'public/assets/images/states/IntroMenu/gfDanceTitle.xml' },
            { 
                type: 'atlasXML', 
                key: 'titleEnter', 
                img: isMobile ? 'public/assets/images/states/IntroMenu/titleEnter_mobile.png' : 'public/assets/images/states/IntroMenu/titleEnter.png', 
                xml: isMobile ? 'public/assets/images/states/IntroMenu/titleEnter_mobile.xml' : 'public/assets/images/states/IntroMenu/titleEnter.xml' 
            },
            { type: 'atlasXML', key: 'logoBumpin', img: 'public/assets/images/states/IntroMenu/logoBumpin.png', xml: 'public/assets/images/states/IntroMenu/logoBumpin.xml' },
            { type: 'audio', key: 'confirm', url: 'public/assets/audio/sounds/confirmMenu.ogg' }
        ];

        assets.forEach(asset => {
            this.load[asset.type](asset.key, asset.img || asset.url, asset.xml);
        });
    }

    setupAnimations() {
        // Animación de GF bailando
        this.anims.create({
            key: 'gf_dance',
            frames: this.anims.generateFrameNames('gfDance', {
                start: 0, end: 29, zeroPad: 4, prefix: 'gfDance', suffix: ''
            }),
            frameRate: 23,
            repeat: -1
        });

        // Animación 'enter_idle'
        this.anims.create({
            key: 'enter_idle',
            frames: this.anims.generateFrameNames('titleEnter', {
                prefix: 'Press Enter to Begin', suffix: '', start: 0, end: 44, zeroPad: 4
            }),
            frameRate: 12,
            repeat: -1
        });

        // Animación 'logo_bumpin'
        this.anims.create({
            key: 'logo_bumpin',
            frames: this.anims.generateFrameNames('logoBumpin', {
                start: 0, end:9, prefix: 'logo bumpin', suffix: '', zeroPad: 4
            }),
            frameRate: 16,
            repeat: -1
        });

        // Animación 'enter_pressed'
        this.anims.create({
            key: 'enter_pressed',
            frames: [
                { key: 'titleEnter', frame: 'ENTER PRESSED0000' }, 
                { key: 'titleEnter', frame: 'ENTER PRESSED0001' },
                { key: 'titleEnter', frame: 'ENTER PRESSED0002' }, 
                { key: 'titleEnter', frame: 'ENTER PRESSED0003' },
                { key: 'titleEnter', frame: 'ENTER PRESSED0004' }, 
                { key: 'titleEnter', frame: 'ENTER PRESSED0005' },
                { key: 'titleEnter', frame: 'ENTER PRESSED0006' }, 
                { key: 'titleEnter', frame: 'ENTER PRESSED0007' },
                { key: 'titleEnter', frame: 'ENTER PRESSED0008' },
            ],
            frameRate: 14,
            repeat: 0
        });
    }

    createSprites() {
        // GF bailando
        this.gf = this.add.sprite(560, 50, 'gfDance')
            .setScale(1)
            .setOrigin(0)
            .play('gf_dance');

        // Logo "Press Enter" o "Tap to Begin" en móvil
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
        this.enterLogo = this.add.sprite(900, 620, 'titleEnter')
            .setScale(isMobile ? 0.8 : 1) // Escala reducida en móvil si es necesario
            .setOrigin(0.5)
            .play('enter_idle');

        // Logo principal
        this.logo = this.add.sprite(-165, -140, 'logoBumpin')
            .setScale(1.07)
            .setOrigin(0)
            .play('logo_bumpin');
    }

    setupControls() {
        this.input.keyboard.removeAllListeners('keydown-ENTER');
        this.input.removeAllListeners('pointerdown');

        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
        
        if (!isMobile) {
            this.input.keyboard.on('keydown-ENTER', () => this.handleTransition());
        }
        
        // En móvil, cualquier toque en la pantalla activa la transición
        this.input.on('pointerdown', () => this.handleTransition());
    }

    handleTransition() {
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        this.enterLogo.play('enter_pressed');
        this.sound.play('confirm');

        this.time.delayedCall(800, () => {
            this.transitionToMainMenu();
        });
    }

    transitionToMainMenu() {
        if (this.scene.get("TransitionScene")?.startTransition) {
            this.scene.get("TransitionScene").startTransition("MainMenuState");
        } else {
            console.warn("TransitionScene no encontrada o no tiene el método startTransition. Cambiando directamente.");
            this.scene.start("MainMenuState");
        }
    }

    initAndroidSupport() {
        if (this.sys.game.device.os.android && window.AndroidSupport?.initialize) {
            window.AndroidSupport.initialize(this);
        }
    }
}

game.scene.add("GfDanceState", GfDanceState);