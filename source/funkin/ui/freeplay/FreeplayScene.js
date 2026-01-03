import { loadSongsFromWeeklist } from './SongLoader.js';
import { FreeUI } from './FreeUI.js';
import { InputHandler } from './InputHandler.js';
import { HealthIcon } from '../../play/health/healthIcon.js';

class FreeplayScene extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayScene" });
    this.songs = [];
    this.bg = null;

    this.ui = null;
    this.inputHandler = null;
  }

  preload() {
    this.load.image("menuBGMagenta", "public/images/menu/bg/menuBGMagenta.png");
    this.load.text('weekList', 'public/data/ui/weeks.txt');
    this.load.font('vcr', 'public/fonts/vcr.ttf');

    this.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
    this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
    this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
    this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");
    HealthIcon.preload(this, 'face', 'freeplay_session');
  }

  async create() {
    if (window.Genesis && window.Genesis.discord) {
      Genesis.discord.setActivity({
        details: "Menu in Friday Night Funkin'",
        state: "Freeplay Menu"
      });
    }

    // --- Lógica de Música del Menú (Loop) ---
    if (!this.sound.get('freakyMenu')) {
      this.sound.add('freakyMenu');
    }

    const menuMusic = this.sound.get('freakyMenu');

    if (menuMusic && !menuMusic.isPlaying) {
      menuMusic.play({ loop: true, volume: 0.7 });
    }
    // ---------------------------------------

    this.bg = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "menuBGMagenta",
    );

    try {
      this.songs = await loadSongsFromWeeklist(this.cache);

      if (!this.songs || this.songs.length === 0) {
        throw new Error("No songs found. Check weekList.txt and week JSON files.");
      }

      const iconsToLoad = new Set();
      this.songs.forEach(song => {
        if (song.icon) iconsToLoad.add(song.icon);
      });

      iconsToLoad.forEach(iconName => {
        HealthIcon.preload(this, iconName, 'freeplay_session');
      });

      this.load.once('complete', () => {
        this.initModules();
      });

      this.load.start();

    } catch (error) {
      console.error("Error creating FreePlayScene:", error);
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `ERROR:\n${error.message}\nCheck console.`,
        { fontSize: "32px", fill: "#ff0000", align: "center" }
      ).setOrigin(0.5);
    }
  }

  initModules() {
    // Inicializar Módulos UI y Input
    this.ui = new FreeUI(this, this.songs);
    this.ui.setupUI();

    this.inputHandler = new InputHandler(this, this.ui);
    this.inputHandler.setupInput();

    // Inicializar selección (sin sonido al inicio)
    this.ui.changeSelection(0, false);
  }

  update(time, delta) {
    if (this.inputHandler) {
      this.inputHandler.update();
    }
    if (this.ui) {
      this.ui.update(time, delta);
    }
  }
}

game.scene.add("FreeplayScene", FreeplayScene);