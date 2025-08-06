class GfDanceState extends Phaser.Scene {
    constructor() {
        super({ key: "GfDanceState" });
        this.isTransitioning = false;
        this.isMobile = this.detectMobile();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    preload() {
        console.log("GfDanceState cargado correctamente");

        const titleEnterKey = this.isMobile ? 'titleEnter_mobile' : 'titleEnter';
        const titleEnterPath = this.isMobile ? 
            'public/assets/images/states/GFDanceState/titleEnter_mobile' :
            'public/assets/images/states/GFDanceState/titleEnter';

        const assets = [
            { type: 'atlasXML', key: 'gfDance', img: 'public/assets/images/states/GFDanceState/gfDanceTitle.png', xml: 'public/assets/images/states/GFDanceState/gfDanceTitle.xml' },
            { type: 'atlasXML', key: 'logoBumpin', img: 'public/assets/images/states/GFDanceState/logoBumpin.png', xml: 'public/assets/images/states/GFDanceState/logoBumpin.xml' },
            { type: 'audio', key: 'confirm', url: 'public/assets/audio/sounds/confirmMenu.ogg' },
            { type: 'atlasXML', key: titleEnterKey, img: `${titleEnterPath}.png`, xml: `${titleEnterPath}.xml` }
        ];

        assets.forEach(asset => {
            this.load[asset.type](asset.key, asset.img || asset.url, asset.xml);
        });
    }

    create() {
        this.isTransitioning = false;
        this.setupAnimations();
        this.createSprites();
        this.setupControls();

        this.events.on('wake', () => {
            this.isTransitioning = false;
        });
    }

    setupAnimations() {
        const titleEnterKey = this.isMobile ? 'titleEnter_mobile' : 'titleEnter';

        this.anims.create({
            key: 'enter_idle',
            frames: this.anims.generateFrameNames(titleEnterKey, {
                prefix: 'Press Enter to Begin', suffix: '', start: 0, end: 44, zeroPad: 4
            }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'enter_pressed',
            frames: this.anims.generateFrameNames(titleEnterKey, {
                prefix: 'ENTER PRESSED', suffix: '', start: 0, end: 8, zeroPad: 4
            }),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'gf_dance',
            frames: this.anims.generateFrameNames('gfDance', {
                start: 0, end: 29, zeroPad: 4, prefix: 'gfDance', suffix: ''
            }),
            frameRate: 23,
            repeat: -1
        });

        this.anims.create({
            key: 'logo_bumpin',
            frames: this.anims.generateFrameNames('logoBumpin', {
                start: 0, end: 9, prefix: 'logo bumpin', suffix: '', zeroPad: 4
            }),
            frameRate: 16,
            repeat: -1
        });
    }

    createSprites() {
        const titleEnterKey = this.isMobile ? 'titleEnter_mobile' : 'titleEnter';

        this.gf = this.add.sprite(560, 50, 'gfDance')
            .setScale(1)
            .setOrigin(0)
            .play('gf_dance');

        this.logo = this.add.sprite(-165, -140, 'logoBumpin')
            .setScale(1.07)
            .setOrigin(0)
            .play('logo_bumpin');

        // Ajustar posición según dispositivo
        const enterLogoX = this.isMobile ? 630 : 800; // Posición más a la izquierda en móviles
        this.enterLogo = this.add.sprite(enterLogoX, 620, titleEnterKey)
            .setOrigin(0.5)
            .setScale(1)
            .play('enter_idle');
    }

    setupControls() {
        // Remover listeners previos
        this.input.keyboard.removeAllListeners('keydown-ENTER');
        
        // Configurar control de teclado
        this.input.keyboard.on('keydown-ENTER', () => this.handleTransition());
        
        // Añadir control táctil
        if (this.isMobile) {
            this.input.on('pointerdown', () => this.handleTransition());
        }
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
}

game.scene.add("GfDanceState", GfDanceState);