// core/soundtray/styleSoundtray.js
import {
  roundVolume,
  saveVolumeState,
  updateVolumeUI,
  setVolumeSounds,
  setVolumeUI,
  setCurrentScene,
  cleanupVolumeControl,
  updateVolumeControlKeys,
  setGlobalVolume,
  setPreviousVolume,
  startFadeOut,
  startFadeIn,
  stopFade, // Importado
  globalVolume,
  previousVolume,
  VOLUME_SETTINGS,
  volumeSounds,
  keyMute,
  keyVolDown,
  keyVolUp,
} from "./mainSoundtray.js";

export function initVolumeControl() {
  window.addEventListener("load", () => {
    if (game && game.sound) {
      game.sound.volume = globalVolume;
      updateVolumeUI();
    }
  });

  window.addEventListener("blur", () => {
      startFadeOut();
  });

  window.addEventListener("focus", () => {
      startFadeIn();
  });

  updateVolumeControlKeys();

  document.addEventListener("keydown", (event) => {
    if (!volumeSounds || !game || !game.sound) return;

    const code = event.code.toUpperCase();
    const key = (event.key || "").toUpperCase();

    if (code === keyVolUp || key === keyVolUp.replace("NUMPAD", "") || key === "+") {
        stopFade(); // Detener fade automático
        if (globalVolume >= VOLUME_SETTINGS.MAX) {
            // [CORRECCIÓN] Eliminado check de .scene para sonidos
            if (volumeSounds.max) volumeSounds.max.play({ volume: 0.5 });
            updateVolumeUI(); 
        } else {
            setPreviousVolume(globalVolume > 0 ? globalVolume : previousVolume);
            setGlobalVolume(Math.min(globalVolume + VOLUME_SETTINGS.STEP, VOLUME_SETTINGS.MAX));
            
            game.sound.volume = globalVolume;
            
            // [CORRECCIÓN] Eliminado check de .scene para sonidos
            if (volumeSounds.up) volumeSounds.up.play({ volume: 0.5 });
            updateVolumeUI();
            saveVolumeState();
        }
    }
    else if (code === keyVolDown || key === keyVolDown.replace("NUMPAD", "") || key === "-") {
        stopFade(); // Detener fade automático
        if (globalVolume > VOLUME_SETTINGS.MIN) {
            setPreviousVolume(globalVolume);
            setGlobalVolume(Math.max(globalVolume - VOLUME_SETTINGS.STEP, VOLUME_SETTINGS.MIN));
            
            game.sound.volume = globalVolume;
            
            // [CORRECCIÓN] Eliminado check de .scene para sonidos
            if (volumeSounds.down) volumeSounds.down.play({ volume: 0.5 });
            updateVolumeUI();
            saveVolumeState();
        }
    }
    else if (code === keyMute || key === keyMute.replace("NUMPAD", "") || key === "0") {
        stopFade(); // Detener fade automático
        if (globalVolume > 0) {
            setPreviousVolume(globalVolume);
            setGlobalVolume(0);
            
            game.sound.volume = 0;
            
            // [CORRECCIÓN] Eliminado check de .scene para sonidos
            if (volumeSounds.down) volumeSounds.down.play({ volume: 0.5 });
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
      "public/images/ui/soundtray/volumebox.png"
    );
    for (let i = 1; i <= 10; i++) {
      this.load.image(
        `volumeBar${i}`,
        `public/images/ui/soundtray/bars_${i}.png`
      );
    }

    this.load.audio("volUp", "public/sounds/soundtray/Volup.ogg");
    this.load.audio(
      "volDown",
      "public/sounds/soundtray/Voldown.ogg"
    );
    this.load.audio(
      "volMax",
      "public/sounds/soundtray/VolMAX.ogg"
    );
  }

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

    // Z-index muy altos
    this.volumeUI.box.setDepth(999990).setScale(0.75);
    this.volumeUI.barBackground.setDepth(999991).setScale(0.75);
    this.volumeUI.bar.setDepth(999992).setScale(0.75);

    setVolumeUI(this.volumeUI);
    setCurrentScene(this);

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
    
    // Forzar al inicio
    this.scene.bringToTop();
  }

  /**
   * Forzar que esta escena esté siempre arriba en cada frame.
   */
  update() {
      try {
        this.scene.bringToTop();
      } catch (e) {
        // Ignorar errores si la escena está en proceso de destrucción
      }
  }

  shutdown() {
    cleanupVolumeControl();
  }
}