import { initVolumeControl, VolumeUIScene } from './core/soundtray.js';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('startImage', 'public/assets/images/touchHereToPlay.png');
        this.load.image('funkay', 'public/assets/images/funkay.png');
    }

    create() {
        let startButton = this.add.image(640, 360, 'startImage').setScale(0.5).setInteractive();

        startButton.on('pointerdown', () => {
            startButton.destroy();
            this.scene.start('IntroMenu');
            this.scene.get('VolumeUIScene').scene.bringToTop();
        });

        startButton.on('pointerover', () => {
            startButton.setScale(0.55);
            this.input.manager.canvas.style.cursor = 'pointer';
        });

        startButton.on('pointerout', () => {
            startButton.setScale(0.5);
            this.input.manager.canvas.style.cursor = 'default';
        });
    }

    shutdown() {
        this.input.keyboard.shutdown();
        this.input.mouse.shutdown();
        this.events.shutdown();
        super.shutdown();
    }
}

let config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    scene: [MainScene, VolumeUIScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

window.game = new Phaser.Game(config);
initVolumeControl();

// ====== CONTROL DE PAUSA SEGÚN FOCO ======
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        console.log("Juego pausado");
        game.loop.sleep(); 
    } else {
        console.log("Juego reanudado");
        game.loop.wake(); 
    }
});

window.addEventListener("blur", () => {
    console.log("Juego pausado por pérdida de foco");
    game.loop.sleep();
});

window.addEventListener("focus", () => {
    console.log("Juego reanudado");
    game.loop.wake();
});

// ====== BOTÓN DE PANTALLA COMPLETA ======
const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const gameContainer = document.getElementById('game-container');

    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen?.() || gameContainer.webkitRequestFullscreen?.() || gameContainer.msRequestFullscreen?.();
    } else {
        document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.();
    }
});

document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.style.display = document.fullscreenElement ? 'none' : 'block';
});