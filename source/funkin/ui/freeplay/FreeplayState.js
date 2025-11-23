import Alphabet from "../../../utils/Alphabet.js";
import { loadSongsFromWeeklist } from './SongLoader.js';

class FreeplayState extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayState" });

    this.songs = [];
    this.curSelected = 0;
    this.curDifficulty = 1; // 0=easy, 1=normal, 2=hard

    this.grpSongs = null;
    this.scoreText = null;
    this.diffText = null;
    this.bg = null;

    this.targetScrollY = 0;
    this.selectingSong = false;
  }

  preload() {
    this.load.image("menuBGMagenta", "public/images/menu/bg/menuBGMagenta.png");

    this.load.text('weekList', 'public/data/ui/weeks.txt');

    this.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
    this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
    this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg'); // Asegúrate que la ruta es correcta
  }

  async create() {

    if (window.Genesis && window.Genesis.discord) {
        Genesis.discord.setActivity({
            details: "Menu in Friday Night Funkin'", 
            state: "Freeplay Menu"
        });
    }

    this.selectingSong = false;

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

      this.setupUI();
      this.setupInput();
      this.changeSelection(0, false); // Inicializa sin sonido

    } catch (error) {
      // Mantenemos el log de error
      console.error("Error creating FreeplayState:", error);
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `ERROR:\n${error.message}\nCheck console.`,
        { fontSize: "32px", fill: "#ff0000", align: "center" }
      ).setOrigin(0.5);
    }
  }

  setupUI() {
    this.grpSongs = this.add.container(100, this.cameras.main.height / 2);

    const songSpacing = 100; // Espaciado entre nombres de canciones

    for (let i = 0; i < this.songs.length; i++) {
      const song = this.songs[i];
      const displayName = song && typeof song.displayName === 'string' ? song.displayName : 'MISSING_NAME';
      const songText = new Alphabet(
        this, 0, i * songSpacing, displayName, true, 1.0
      );
      songText.targetY = i; // Guardamos el índice para la lógica de scroll y alfa
      this.grpSongs.add(songText);
    }

    // Textos de UI (puntuación y dificultad)
    this.scoreText = this.add.text(
      this.cameras.main.width * 0.95, 20, "Best Score: 0",
      { fontSize: "32px", fill: "#fff", align: "right" }
    ).setOrigin(1, 0);

    this.diffText = this.add.text(
      this.cameras.main.width * 0.95, 60, "< NORMAL >",
      { fontSize: "24px", fill: "#fff", align: "right" }
    ).setOrigin(1, 0);
  }

  setupInput() {
    // Configuración de teclas
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.backKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);

    // Referencias a los sonidos para fácil acceso
    this.scrollSnd = this.sound.add('scrollSound');
    this.confirmSnd = this.sound.add('confirmSound');
    this.cancelSnd = this.sound.add('cancelSound'); // Referencia al sonido de cancelar
  }

  update(time, delta) {
    // Si la UI no está lista o estamos en transición, no hacer nada
    if (!this.grpSongs || this.selectingSong) return;

    // --- Manejo de Controles ---
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.changeSelection(-1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.changeSelection(1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.changeDiff(-1);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.changeDiff(1);
    } else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.selectSong();
    } else if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
      this.goToMenu();
    }
    // --- Fin Manejo de Controles ---

    // --- Actualizaciones Visuales ---
    // Scroll suave del contenedor de canciones
    this.grpSongs.y = Phaser.Math.Linear(
      this.grpSongs.y,
      this.targetScrollY,
      0.1 // Factor de suavizado (0 a 1)
    );

    // Ajustar transparencia de canciones (seleccionada vs no seleccionada)
    this.grpSongs.each((songText) => {
      // Aseguramos que sea un objeto Alphabet válido con targetY
      if (songText instanceof Alphabet && typeof songText.targetY === "number") {
        const isSelected = songText.targetY === this.curSelected;
        const targetAlpha = isSelected ? 1.0 : 0.6; // Seleccionada=100%, No seleccionada=60%
        // Suaviza el cambio de alfa
        songText.setAlpha(Phaser.Math.Linear(songText.alpha, targetAlpha, 0.1));
      }
    });
    // --- Fin Actualizaciones Visuales ---
  }

  /** Cambia la canción seleccionada */
  changeSelection(change = 0, playSound = true) {
    if (!this.songs || this.songs.length === 0) return;

    if (change !== 0 && playSound && this.scrollSnd) {
      this.scrollSnd.play();
    }

    this.curSelected = Phaser.Math.Wrap(this.curSelected + change, 0, this.songs.length);

    const songSpacing = 100;
    const centerOffset = this.cameras.main.height / 2;
    this.targetScrollY = -this.curSelected * songSpacing + centerOffset;

    const currentSong = this.songs[this.curSelected];
    if (currentSong && currentSong.difficulties) {
      if (this.curDifficulty >= currentSong.difficulties.length) {
        this.curDifficulty = Math.min(1, currentSong.difficulties.length - 1);
        if (this.curDifficulty < 0) this.curDifficulty = 0;
      }
    } else {
      this.curDifficulty = 0; 
    }

    this.changeDiff(0);
  }

  changeDiff(change = 0) {
    if (!this.songs || this.songs.length === 0) {
        this.diffText.setText("-");
        return;
    }
    const song = this.songs[this.curSelected];
    if (!song || !song.difficulties || song.difficulties.length === 0) {
        this.diffText.setText("-");
        return;
    }

    if (change !== 0 && this.scrollSnd) {
        this.scrollSnd.play();
    }

    this.curDifficulty = Phaser.Math.Wrap(this.curDifficulty + change, 0, song.difficulties.length);

    const diffName = song.difficulties[this.curDifficulty];
    const diffTextDisplay = typeof diffName === 'string' ? diffName.toUpperCase() : '???';
    this.diffText.setText(`< ${diffTextDisplay} >`);

    this.updateScore();
  }

  updateScore() {
    const score = 0;
    this.scoreText.setText(`Best Score: ${score}`);
  }

selectSong() {
    if (this.selectingSong || !this.songs?.length) return;
    this.selectingSong = true;

    const selectedSongData = this.songs[this.curSelected];
    if (!selectedSongData?.difficulties) {
      console.error("Invalid song data selected.");
      this.selectingSong = false;
      return;
    }

    if (this.confirmSnd) this.confirmSnd.play();

    const currentDifficultyName = selectedSongData.difficulties[this.curDifficulty] || 'normal';
    const playlistSongIds = [selectedSongData.displayName];

    // Guarda los datos en una variable local para asegurar su alcance
    const dataToSend = {
      isStoryMode: false,
      playlistSongIds: playlistSongIds,
      Score: 0,
      storyTitle: selectedSongData.weekName || "Freeplay",
      DifficultyID: currentDifficultyName,
      WeekId: selectedSongData.weekName || "Freeplay",
      targetSongId: selectedSongData.displayName,
      currentSongIndex: 0
    };

    console.log("Preparing to start PlayState with:", dataToSend);

    this.time.delayedCall(1200, () => {
      const fadeDuration = 500;
      this.cameras.main.fadeOut(fadeDuration, 0, 0, 0, (camera, progress) => {
        if (progress === 1) {
          console.log("Fade complete. Starting PlayState scene...");
          this.scene.start('PlayState', dataToSend);
        }
      });
    });
  }

  goToMenu() {
    if (this.selectingSong) return;

    if (this.cancelSnd) {
      this.cancelSnd.play();
    }

    this.scene.start('MainMenuState');
  }
}

game.scene.add("FreeplayState", FreeplayState);