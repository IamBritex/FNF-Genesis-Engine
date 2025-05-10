// Constantes para el control de volumen
const VOLUME_SETTINGS = {
    DEFAULT: 0.5,
    MIN: 0.0,
    MAX: 1.0,
    STEP: 0.1
};

// Variables globalespara el control de volumen
let globalVolume = (() => {
    const saved = localStorage.getItem('gameVolume');
    return saved !== null ? parseFloat(saved) : VOLUME_SETTINGS.DEFAULT;
})();

let previousVolume = (() => {
    const saved = localStorage.getItem('previousVolume');
    return saved !== null ? parseFloat(saved) : globalVolume;
})();

let isMuted = localStorage.getItem('isMuted') === 'true';
let volumeUI = null;
let currentScene = null;
let volumeSounds = null;

// Funcion para redondear el volumen
// a un decimal
// Redondea el valor a un decimal
// y lo devuelve
// si, eso lmfao
function roundVolume(value) {
    return Math.round(value * 10) / 10;
}

function saveVolumeState() {
    try {
        localStorage.setItem('gameVolume', roundVolume(globalVolume).toString());
        localStorage.setItem('previousVolume', roundVolume(previousVolume).toString());
        localStorage.setItem('isMuted', isMuted.toString());
    } catch (error) {
        console.warn('Error saving volume state:', error);
    }
}

function updateVolumeUI() {
    if (!volumeUI || !currentScene) return;

    const barLevel = Math.ceil(globalVolume * 10);
    
    try {
        if (barLevel > 0) {
            volumeUI.bar.setTexture(`volumeBar${barLevel}`);
            volumeUI.bar.setVisible(true);
        } else {
            volumeUI.bar.setVisible(false);
        }

        if (currentScene.showVolumeUI) {
            currentScene.showVolumeUI();
        }
    } catch (error) {
        console.warn('Error updating volume UI:', error);
    }
}

// Añadir funciones para setear la UI y la escena
function setVolumeUI(ui) {
    volumeUI = ui;
}

function setCurrentScene(scene) {
    currentScene = scene;
}

function setVolumeSounds(sounds) {
    volumeSounds = sounds;
}

// Inicializar el control de volumen
function initVolumeControl() {
    window.addEventListener('load', () => {
        if (game && game.sound) {
            game.sound.volume = isMuted ? 0 : globalVolume;
            console.log('Initial volume loaded:', globalVolume);
            updateVolumeUI();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!volumeSounds || !game || !game.sound) return;

        // Uncomment to debug key codes
        // console.log('Key pressed:', event.code, event.key);

        // Handle volume controls based on both key code and character
        if (event.code === 'NumpadAdd' || event.key === '+') {
            if (globalVolume >= VOLUME_SETTINGS.MAX) {
                volumeSounds.max.play({ volume: 0.5 });
            } else {
                globalVolume = roundVolume(Math.min(globalVolume + VOLUME_SETTINGS.STEP, VOLUME_SETTINGS.MAX));
                game.sound.volume = globalVolume;
                volumeSounds.up.play({ volume: 0.5 });
                updateVolumeUI();
                saveVolumeState();
            }
        } 
        else if (event.code === 'NumpadSubtract' || event.key === '-') {
            if (globalVolume > VOLUME_SETTINGS.MIN) {
                globalVolume = roundVolume(Math.max(globalVolume - VOLUME_SETTINGS.STEP, VOLUME_SETTINGS.MIN));
                game.sound.volume = globalVolume;
                volumeSounds.down.play({ volume: 0.5 });
                updateVolumeUI();
                saveVolumeState();
            }
        }
        else if (event.code === 'Numpad0' || event.code === 'Digit0') {
            if (isMuted) {
                globalVolume = roundVolume(previousVolume);
                game.sound.volume = globalVolume;
                isMuted = false;
                volumeSounds.up.play({ volume: 0.5 });
            } else {
                previousVolume = roundVolume(globalVolume);
                globalVolume = 0;
                game.sound.volume = 0;
                isMuted = true;
                volumeSounds.down.play({ volume: 0.5 });
            }
            updateVolumeUI();
            saveVolumeState();
        }
    });
}

class VolumeUIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VolumeUIScene', active: true });
    }

    preload() {
        this.load.image('volumeBox', 'public/assets/images/soundtray/volumebox.png');
        for (let i = 1; i <= 10; i++) {
            this.load.image(`volumeBar${i}`, `public/assets/images/soundtray/bars_${i}.png`);
        }
        
        this.load.audio('volUp', 'public/assets/sounds/soundtray/Volup.ogg');
        this.load.audio('volDown', 'public/assets/sounds/soundtray/Voldown.ogg');
        this.load.audio('volMax', 'public/assets/sounds/soundtray/VolMAX.ogg');
    }

    // crear la UI del Volumen 
    create() {
        const initialY = -70;
        const showY = 80;
        const barOffset = -22;
        
        this.volumeUI = {
            box: this.add.sprite(640, initialY, 'volumeBox'),
            barBackground: this.add.sprite(640, initialY + barOffset, 'volumeBar10'),
            bar: this.add.sprite(640, initialY + barOffset, 'volumeBar1')
        };
        
        this.volumeUI.barBackground.setAlpha(0.5);
        
        this.volumeUI.box.setDepth(9000);
        this.volumeUI.barBackground.setDepth(9001);
        this.volumeUI.bar.setDepth(9002);
        
        setVolumeUI(this.volumeUI);
        setCurrentScene(this);

        this.showVolumeUI = () => {
            if (this.hideTimeline) {
                this.hideTimeline.stop();
            }
            
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

        this.volumeSounds = {
            up: this.sound.add('volUp'),
            down: this.sound.add('volDown'),
            max: this.sound.add('volMax')
        };
        
        setVolumeSounds(this.volumeSounds);
        this.scene.get('VolumeUIScene').scene.bringToTop();
    }

    shutdown() {
        return;
    }
}



// Exportar funciones necesarias
export {
    initVolumeControl,
    setVolumeUI,
    setCurrentScene,
    setVolumeSounds,
    updateVolumeUI,
    VolumeUIScene
};