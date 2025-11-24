// core/soundtray/styleSoundtray.js
import {
  roundVolume,
  saveVolumeState,
  updateVolumeUI,
  setVolumeSounds,
  setVolumeUI,
  setCurrentScene,
  updateVolumeControlKeys,
  setGlobalVolume,
  setPreviousVolume,
  globalVolume,
  previousVolume,
  VOLUME_SETTINGS,
  volumeSounds,
  keyMute,
  keyVolDown,
  keyVolUp,
} from "./mainSoundtray.js";

// Inicializar el control de volumen
export function initVolumeControl() {
  window.addEventListener("load", () => {
    if (game && game.sound) {
      game.sound.volume = globalVolume;
      updateVolumeUI();
    }
  });

  updateVolumeControlKeys();

  // Se eliminó la escucha de cambios en localStorage

  // Replace direct assignments in the keydown event listener
  document.addEventListener("keydown", (event) => {
    if (!volumeSounds || !game || !game.sound) return;

    const code = event.code.toUpperCase();
    const key = (event.key || "").toUpperCase();

    // Volumen UP
    if (code === keyVolUp || key === keyVolUp.replace("NUMPAD", "") || key === "+") {
        if (globalVolume >= VOLUME_SETTINGS.MAX) {
            volumeSounds.max.play({ volume: 0.5 });
            // Requerimiento: Si ya está al máximo, igual mostrar la UI (y luego se oculta automáticamente)
            updateVolumeUI(); 
        } else {
            setPreviousVolume(globalVolume > 0 ? globalVolume : previousVolume);
            setGlobalVolume(Math.min(globalVolume + VOLUME_SETTINGS.STEP, VOLUME_SETTINGS.MAX));
            game.sound.volume = globalVolume;
            volumeSounds.up.play({ volume: 0.5 });
            updateVolumeUI();
            saveVolumeState();
        }
    }
    // Volumen DOWN
    else if (code === keyVolDown || key === keyVolDown.replace("NUMPAD", "") || key === "-") {
        if (globalVolume > VOLUME_SETTINGS.MIN) {
            setPreviousVolume(globalVolume);
            setGlobalVolume(Math.max(globalVolume - VOLUME_SETTINGS.STEP, VOLUME_SETTINGS.MIN));
            game.sound.volume = globalVolume;
            volumeSounds.down.play({ volume: 0.5 });
            updateVolumeUI();
            saveVolumeState();
        }
    }
    // Mute
    else if (code === keyMute || key === keyMute.replace("NUMPAD", "") || key === "0") {
        if (globalVolume > 0) {
            setPreviousVolume(globalVolume);
            setGlobalVolume(0);
            game.sound.volume = 0;
            volumeSounds.down.play({ volume: 0.5 });
            updateVolumeUI();
            saveVolumeState();
        }
    }
  });
}

export class VolumeUIScene extends Phaser.Scene {
  constructor() {
    super({ key: "VolumeUIScene", active: true });
  }

  preload() {
    this.load.image(
      "volumeBox",
      "public/assets/images/UI/soundtray/volumebox.png"
    );
    for (let i = 1; i <= 10; i++) {
      this.load.image(
        `volumeBar${i}`,
        `public/assets/images/UI/soundtray/bars_${i}.png`
      );
    }

    this.load.audio("volUp", "public/assets/audio/sounds/soundtray/Volup.ogg");
    this.load.audio(
      "volDown",
      "public/assets/audio/sounds/soundtray/Voldown.ogg"
    );
    this.load.audio(
      "volMax",
      "public/assets/audio/sounds/soundtray/VolMAX.ogg"
    );
  }

  // crear la UI del Volumen
  create() {
    const initialY = -70;
    const showY = 80;
    const barOffset = -22;

    this.volumeUI = {
      box: this.add.sprite(640, initialY, "volumeBox"),
      barBackground: this.add.sprite(640, initialY + barOffset, "volumeBar10"),
      bar: this.add.sprite(640, initialY + barOffset, "volumeBar1"),
    };

    this.volumeUI.barBackground.setAlpha(0.5);

    // Aumentar la escala de 0.5 a 0.75
    this.volumeUI.box.setDepth(9000).setScale(0.75);
    this.volumeUI.barBackground.setDepth(9001).setScale(0.75);
    this.volumeUI.bar.setDepth(9002).setScale(0.75);

    setVolumeUI(this.volumeUI);
    setCurrentScene(this);

    /**
     * Muestra la UI del volumen.
     * @param {boolean} [permanent=false] Si es true, omite el temporizador de ocultación (utilizado para Mute/Volumen 0).
     */
    this.showVolumeUI = (permanent = false) => {
      if (this.hideTimeline) {
        this.hideTimeline.stop();
      }

      this.tweens.add({
        targets: [
          this.volumeUI.box,
          this.volumeUI.barBackground,
          this.volumeUI.bar,
        ],
        y: function (target) {
          return target === this.volumeUI.box ? showY : showY + barOffset;
        }.bind(this),
        duration: 300,
        ease: "Back.easeOut",
      });

      if (this.hideTimer) clearTimeout(this.hideTimer);
      
      // Ocultar solo si no es permanente
      if (!permanent) {
        this.hideTimer = setTimeout(() => this.hideVolumeUI(), 3000);
      }
    };

    this.hideVolumeUI = () => {
      this.hideTimeline = this.tweens.add({
        targets: [
          this.volumeUI.box,
          this.volumeUI.barBackground,
          this.volumeUI.bar,
        ],
        y: function (target) {
          return target === this.volumeUI.box ? initialY : initialY + barOffset;
        }.bind(this),
        duration: 300,
        ease: "Back.easeIn",
      });
    };

    this.volumeSounds = {
      up: this.sound.add("volUp"),
      down: this.sound.add("volDown"),
      max: this.sound.add("volMax"),
    };

    setVolumeSounds(this.volumeSounds);
    this.scene.get("VolumeUIScene").scene.bringToTop();
  }

  shutdown() {
    return;
  }
}