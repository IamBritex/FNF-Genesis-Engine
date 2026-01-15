import { PauseConfig } from "../options.js";

export class PauseAudio {
    constructor(scene) {
        this.scene = scene;
        this.music = null;
        this.scrollSnd = null;
    }

    preload() {
        const musicPath = (PauseConfig && PauseConfig.music) ? PauseConfig.music : 'public/music/breakfast.ogg';
        
        if (!this.scene.cache.audio.exists('breakfast')) {
            this.scene.load.audio('breakfast', musicPath);
        }
        if (!this.scene.cache.audio.exists('scrollMenu')) {
            this.scene.load.audio('scrollMenu', 'public/sounds/scrollMenu.ogg');
        }
    }

    create() {
        // Sonido de Scroll
        if (this.scene.cache.audio.exists('scrollMenu')) {
            this.scrollSnd = this.scene.sound.add('scrollMenu');
        }

        // Música con Fade In
        const musicKey = this.scene.cache.audio.exists('breakfast') ? 'breakfast' : 'menuMusic';
        if (this.scene.cache.audio.exists(musicKey)) {
            this.music = this.scene.sound.add(musicKey, { volume: 0, loop: true });
            this.music.play();
            this.scene.tweens.add({ targets: this.music, volume: 0.5, duration: 1000 });
        }
    }

    playScroll() {
        if (this.scrollSnd) this.scrollSnd.play();
    }

    stop() {
        if (this.music) {
            this.music.stop();
            this.music = null;
        }
    }
}