import { initVolumeControl, setVolumeUI, setCurrentScene, setVolumeSounds } from './soundtray.js';
import { MainScene } from './MainScene.js';
import { CrashHandler } from './CrashHandler.js';

class VolumeUIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VolumeUIScene', active: true });  // Hacemos la escena siempre activa
    }

    preload() {
        this.load.image('volumeBox', 'public/assets/images/UI/soundtray/volumebox.png');
        for (let i = 1; i <= 10; i++) {
            this.load.image(`volumeBar${i}`, `public/assets/images/UI/soundtray/bars_${i}.png`);}
        this.load.audio('volUp', 'public/assets/audio/sounds/soundtray/Volup.ogg');
        this.load.audio('volDown', 'public/assets/audio/sounds/soundtray/Voldown.ogg');
        this.load.audio('volMax', 'public/assets/audio/sounds/soundtray/VolMAX.ogg');
    }

    create() {
        // Posiciones iniciales ajustadas
        const initialY = -70;
        const showY = 80; // Bajamos la posición de la caja en la ventana
        const barOffset = -22; // Ajustamos el offset de la barra para que esté más arriba en la caja
        
        this.volumeUI = {
            box: this.add.sprite(640, initialY, 'volumeBox'),
            barBackground: this.add.sprite(640, initialY + barOffset, 'volumeBar10'),
            bar: this.add.sprite(640, initialY + barOffset, 'volumeBar1')
        };
        
        // Configurar la opacidad del fondo de las barras
        this.volumeUI.barBackground.setAlpha(0.5); // Ajusta este valor entre 0 y 1
        
        // Configurar las profundidades
        this.volumeUI.box.setDepth(9000);
        this.volumeUI.barBackground.setDepth(9001);
        this.volumeUI.bar.setDepth(9002);
        
        // Asignar la referencia global
        setVolumeUI(this.volumeUI);
        setCurrentScene(this);

        // Método para animar la UI
        this.showVolumeUI = () => {
            if (this.hideTimeline) {
                this.hideTimeline.stop();
            }
            
            // Animar todos los elementos
            this.tweens.add({
                targets: [
                    this.volumeUI.box,
                    this.volumeUI.barBackground,
                    this.volumeUI.bar
                ],
                y: function (target) {
                    return target === this.volumeUI.box ? showY : showY + barOffset;
                }.bind(this),
                duration: 300,
                ease: 'Back.easeOut'
            });

            if (this.hideTimer) clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(() => this.hideVolumeUI(), 2000);
        };

        // Método para ocultar la UI
        this.hideVolumeUI = () => {
            this.hideTimeline = this.tweens.add({
                targets: [
                    this.volumeUI.box,
                    this.volumeUI.barBackground,
                    this.volumeUI.bar
                ],
                y: function (target) {
                    return target === this.volumeUI.box ? initialY : initialY + barOffset;
                }.bind(this),
                duration: 300,
                ease: 'Back.easeIn'
            });
        };

        // Crear los sonidos
        this.volumeSounds = {
            up: this.sound.add('volUp'),
            down: this.sound.add('volDown'),
            max: this.sound.add('volMax')
        };
        
        // Asignar los sonidos globalmente
        setVolumeSounds(this.volumeSounds);

        // Hacer que esta escena persista
        this.scene.get('VolumeUIScene').scene.bringToTop();
    }

    shutdown() {
        // Evitamos que la escena se destruya
        return;
    }
}

let config = {
    autoFocus: true,
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    scene: [MainScene, VolumeUIScene],
    backgrounColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
        fullscreenTarget: 'game-container',
    },
};

// Iniciar el juego después de definir las escenas
window.game = new Phaser.Game(config);

game.events.once('ready', () => {
    window.crashHandler = new CrashHandler(game.scene.scenes[0]);
});

initVolumeControl();

// ====== CONTROL DE PAUSA SEGÚN FOCO ======
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        console.log("Juego pausado por pérdida de foco");
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

document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.style.display = document.fullscreenElement ? 'none' : 'block';
});