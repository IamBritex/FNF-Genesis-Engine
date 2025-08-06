const antiAliasing = localStorage.getItem('APPEARANCE.VISUAL.ANTI-ALIASING') === 'false' ? false : true;
import { initVolumeControl, setVolumeUI, setCurrentScene, setVolumeSounds } from './soundtray.js';
import { MainScene } from './MainScene.js';
import { CrashHandler } from './CrashHandler.js';
import { DetailInfo } from './DetailInfo.js';

class BaseScene extends Phaser.Scene {
    constructor(config) {
        super(config);
    }
    preload() {
        this.load.maxParallelDownloads = 4;
    }
    create() {
        DetailInfo.init(this);
    }
    shutdown() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    }
}

class VolumeUIScene extends BaseScene {
    constructor() {
        super({ key: 'VolumeUIScene', active: true });
    }

    preload() {
        super.preload();
        this.load.binary('fnf_font', 'public/assets/fonts/FridayNightFunkin-Regular.ttf');
        this.load.binary('vcr_font', 'public/assets/fonts/vcr.ttf');
        this.load.image('volumeBox', 'public/assets/images/UI/soundtray/volumebox.png');
        for (let i = 1; i <= 10; i++) {
            this.load.image(`volumeBar${i}`, `public/assets/images/UI/soundtray/bars_${i}.png`);
        }
        const audioConfig = {
            volume: 1.0,
            instances: 3
        };
        this.load.audio('volUp', 'public/assets/audio/sounds/soundtray/Volup.ogg', audioConfig);
        this.load.audio('volDown', 'public/assets/audio/sounds/soundtray/Voldown.ogg', audioConfig);
        this.load.audio('volMax', 'public/assets/audio/sounds/soundtray/VolMAX.ogg', audioConfig);
    }

    create() {
        super.create();
        const WebFontConfig = {
            custom: {
                families: ['FNF', 'VCR', 'FiraCode'],
                urls: ['public/html/index.css']
            },
        };
        // @ts-ignore
        WebFont.load(WebFontConfig);

        const initialY = -100;
        const showY = 50;
        const barOffset = -15;
        
        this.volumeUI = {
            box: this.add.sprite(640, initialY, 'volumeBox'),
            barBackground: this.add.sprite(640, initialY + barOffset, 'volumeBar10'),
            bar: this.add.sprite(640, initialY + barOffset, 'volumeBar1')
        };
        
        this.volumeUI.barBackground.setAlpha(0.5);
        this.volumeUI.box.setDepth(9000);
        this.volumeUI.barBackground.setDepth(9001);
        this.volumeUI.bar.setDepth(9002);
        this.volumeUI.box.setScale(0.5);
        this.volumeUI.barBackground.setScale(0.5);
        this.volumeUI.bar.setScale(0.5);
        
        setVolumeUI(this.volumeUI);
        setCurrentScene(this);

        this.showVolumeUI = () => {
            if (this.hideTimeline) this.hideTimeline.stop();
            this.tweens.add({
                targets: [this.volumeUI.box, this.volumeUI.barBackground, this.volumeUI.bar],
                y: target => target === this.volumeUI.box ? showY : showY + barOffset,
                duration: 300,
                ease: 'Back.easeOut'
            });

            if (this.hideTimer) clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(() => this.hideVolumeUI(), 2000);
        };

        this.hideVolumeUI = () => {
            this.hideTimeline = this.tweens.add({
                targets: [this.volumeUI.box, this.volumeUI.barBackground, this.volumeUI.bar],
                y: target => target === this.volumeUI.box ? initialY : initialY + barOffset,
                duration: 300,
                ease: 'Back.easeIn'
            });
        };

        this.volumeSounds = {
            up: this.sound.add('volUp'),
            down: this.sound.add('volDown'),
            max: this.sound.add('volMax')
        };
        
        const versionText = this.add.text(5, this.scale.height - 24, 
            `v0.1.0`, 
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#FFFFFF',
                align: 'left',
                lineSpacing: 5,
                stroke: '#000000',
                strokeThickness: 2
            });

        setVolumeSounds(this.volumeSounds);
        versionText.setDepth(9000);
        versionText.setScrollFactor(0);
        this.scene.get('VolumeUIScene').scene.bringToTop();
    }
}

class OptimizedMainScene extends MainScene {
    constructor() {
        super();
        this.accumulator = 0;
        this.fixedDelta = 1000 / 80; // ~16.66ms para 80 updates por segundo 
    }

    preload() {
        super.preload();
    }

    create() {
        super.create();
    }

    update(time, delta) {
        const maxDelta = 100;
        delta = Math.min(delta, maxDelta);

        this.accumulator += delta;

        while (this.accumulator >= this.fixedDelta) {
            this.fixedUpdate(this.fixedDelta / 1000); // pasa en segundos
            this.accumulator -= this.fixedDelta;
        }

        const alpha = this.accumulator / this.fixedDelta;
        this.interpolate(alpha);
    }

    fixedUpdate(dt) {
        // Lógica de física o movimiento constante aquí
         // Ejemplo: actualiza posiciones o física de objetos
        // super.update() no se llama directamente, ya que implementas aquí tu lógica
    }

    interpolate(alpha) {
        // Interpolación de render para suavidad
        // Ejemplo: actualiza sprite.x interpolando entre la posición anterior y actual
    }
}

// Main game configuration
const gameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    scene: [OptimizedMainScene, VolumeUIScene],
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
        fullscreenTarget: 'game-container',
    },
    render: {
        pixelArt: !antiAliasing,
        antialias: antiAliasing,
        roundPixels: !antiAliasing,
        powerPreference: 'high-performance',
        batchSize: 2048,
        maxTextures: 32
    },
    fps: {
        target: 120,
        forceSetTimeOut: false,
        smoothStep: true,
        deltaHistory: 20
    },
    callbacks: {
        postBoot: game => {
            game.renderer.optimizeRedraw = true;
            if (game.renderer.type === Phaser.CANVAS) {
                const context = game.renderer.context;
                if (context) {
                    context.imageSmoothingEnabled = antiAliasing;
                    context.mozImageSmoothingEnabled = antiAliasing;
                    context.webkitImageSmoothingEnabled = antiAliasing;
                    context.msImageSmoothingEnabled = antiAliasing;
                }
            }
        }
    }
};

// Initialize the game
window.game = new Phaser.Game(gameConfig);

game.events.on('ready', () => {
    window.crashHandler = new CrashHandler(game.scene.scenes[0]);
});

initVolumeControl();

// Focus management
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        game.loop.sleep(); 
    } else {
        game.loop.wake(); 
    }
});

window.addEventListener("blur", () => game.loop.sleep());
window.addEventListener("focus", () => game.loop.wake());

// Fullscreen handling
const fullscreenBtn = document.getElementById('fullscreen-btn');
document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.style.display = document.fullscreenElement ? 'none' : 'block';
});
