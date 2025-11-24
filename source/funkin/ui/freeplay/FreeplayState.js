import { loadSongsFromWeeklist } from './SongLoader.js';
import { FreeUI } from './FreeUI.js';
import { InputHandler } from './InputHandler.js';
import { HealthIcon } from '../../play/components/healthIcon.js';

class FreeplayState extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayState" });
    this.songs = [];
    this.bg = null;
    
    this.ui = null;
    this.inputHandler = null;
  }

  preload() {
    this.load.image("menuBGMagenta", "public/images/menu/bg/menuBGMagenta.png");
    this.load.text('weekList', 'public/data/ui/weeks.txt');

    this.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
    this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
    this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
    
    // Asegurar que la música del menú esté disponible
    this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");

    // --- PRECARGA OBLIGATORIA DEL FALLBACK 'FACE' ---
    // Cargamos explícitamente el icono 'face' para que esté disponible si otro falla
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
      // 1. Cargar datos de canciones
      this.songs = await loadSongsFromWeeklist(this.cache);

      if (!this.songs || this.songs.length === 0) {
        throw new Error("No songs found. Check weekList.txt and week JSON files.");
      }

      // 2. Precargar Iconos de Enemigos
      const iconsToLoad = new Set();
      this.songs.forEach(song => {
          // Si la canción tiene icono, lo agendamos para cargar.
          if (song.icon) iconsToLoad.add(song.icon);
      });

      iconsToLoad.forEach(iconName => {
          // Usamos 'freeplay_session' para coincidir con IconSongEnemy
          HealthIcon.preload(this, iconName, 'freeplay_session');
      });

      // Esperar a que los iconos terminen de cargar antes de mostrar la UI
      this.load.once('complete', () => {
          this.initModules();
      });
      
      // Iniciar carga de los iconos
      this.load.start();

    } catch (error) {
      console.error("Error creating FreeplayState:", error);
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

game.scene.add("FreeplayState", FreeplayState);