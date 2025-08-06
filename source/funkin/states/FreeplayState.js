import { ModManager } from "../../utils/ModDetect.js";
import Alphabet from "../../utils/Alphabet.js";

class FreeplayState extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayState" });
    this.songList = [];
    this.selectedIndex = 0;
    this.selectedDifficulty = 1;
    this.difficulties = ["easy", "normal", "hard"];
    this.bg = null;
    this.textContainer = null;
    this.difficultyContainer = null;
    this.songTexts = null;
    this.scrollSound = null;
    this.confirmSound = null;
    this.cancelSound = null;
    this.scrollTween = null;
    this.songSpacing = 122;
    this.difficultyText = null;
    this.difficultyInteractiveArea = null;
    this.lastTapTime = 0;
    this.tapDelay = 300;
    this.songHitAreaPadding = 40;
    this.isMobile = this.detectMobile();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  init(data) {
    if (data?.selectedIndex !== undefined) this.selectedIndex = data.selectedIndex;
    if (data?.selectedDifficulty !== undefined) {
      this.selectedDifficulty = this.difficulties.indexOf(data.selectedDifficulty);
    }
  }

  preload() {
    this.load.image("menuBGMagenta", "public/assets/images/menuBGMagenta.png");
    this.load.audio("scrollMenu", "public/assets/audio/sounds/scrollMenu.ogg");
    this.load.audio("confirmMenu", "public/assets/audio/sounds/confirmMenu.ogg");
    this.load.audio("cancelMenu", "public/assets/audio/sounds/cancelMenu.ogg");
    this.load.text("weekList", "public/assets/data/weekList.txt");
    this.load.atlas("bold", "public/assets/images/UI/bold.png", "public/assets/images/UI/bold.json");
    if (this.isMobile) {
      this.load.atlasXML('backButton',
        'public/assets/images/UI/mobile/backButton.png',
        'public/assets/images/UI/mobile/backButton.xml'
      );
    }
  }

  async create() {
    const { width, height } = this.scale;
    this.setupBackground(width, height);
    this.setupSounds();

    if (this.songList.length === 0) await this.loadWeekData();
    await this.setupUI(width, height);

    this.selectedIndex = Math.min(this.selectedIndex, this.songList.length - 1);
    this.updateScroll(true);
    this.updateSelection();
    this.setupInputs();
    this.setupTouchControls();

    // Agregar el botón de retroceso si es móvil
    if (this.isMobile) {
      this.setupMobileBackButton();
    }

    this.cameras.main.fadeIn(500);
  }

  setupBackground(width, height) {
    this.bg = this.add.image(width / 2, height / 2, "menuBGMagenta")
      .setOrigin(0.5)
      .setScale(1.1)
      .setDepth(-1);
  }

  setupSounds() {
    this.scrollSound = this.sound.add("scrollMenu");
    this.confirmSound = this.sound.add("confirmMenu");
    this.cancelSound = this.sound.add("cancelMenu");
  }

  async loadWeekData() {
    const allSongs = [];
    const baseWeekList = this.cache.text.get("weekList")
      .trim().split("\n").filter(week => week.trim());

    for (const week of baseWeekList) {
      try {
        const response = await fetch(`public/assets/data/weekList/${week}.json`);
        if (response.ok) {
          const weekData = await response.json();
          if (weekData.tracks) {
            weekData.tracks.flat().forEach(song => {
              allSongs.push({
                name: song,
                weekName: weekData.weekName,
                color: weekData.color || "#FFFFFF",
                isMod: false,
                modPath: null
              });
            });
          }
        }
      } catch (error) {
        console.warn(`Error loading week ${week}:`, error);
      }
    }

    if (ModManager.isModActive()) {
      const modWeeks = ModManager.getModWeekList();
      for (const weekData of modWeeks) {
        try {
          const response = await fetch(`${weekData.modPath}/data/weekList/${weekData.week}.json`);
          if (response.ok) {
            const weekJson = await response.json();
            if (weekJson.tracks) {
              weekJson.tracks.flat().forEach(song => {
                allSongs.push({
                  name: song,
                  weekName: weekJson.weekName,
                  color: weekJson.color || "#FFFFFF",
                  isMod: true,
                  modPath: weekData.modPath,
                  modName: weekData.modName
                });
              });
            }
          }
        } catch (error) {
          console.warn(`Error loading mod week ${weekData.week}:`, error);
        }
      }
    }

    this.songList = allSongs;
    if (!this.songList.length) console.warn("No songs loaded");
  }

  createVCRText(x, y, text, size = 32, color = "#FFFFFF") {
    return this.add.text(x, y, text, {
      fontFamily: "VCR",
      fontSize: size,
      color: color
    }).setOrigin(0.5, 0.5);
  }

  async setupUI(width, height) {
    if (this.textContainer) this.textContainer.destroy();
    if (this.difficultyContainer) this.difficultyContainer.destroy();

    this.textContainer = this.add.container(80, 0);

    await Promise.all(this.songList.map(async song => {
      let iconName = "face";
      try {
        const chartPath = song.isMod
          ? `${song.modPath}/audio/songs/${song.name}/charts/${song.name}.json`
          : `public/assets/audio/songs/${song.name}/charts/${song.name}.json`;

        const response = await fetch(chartPath);
        if (response.ok) {
          const chartData = await response.json();
          if (chartData.song?.player2) {
            // Cargar el JSON del personaje para obtener el healthicon
            const charPath = song.isMod
              ? `${song.modPath}/assets/data/characters/${chartData.song.player2}.json`
              : `public/assets/data/characters/${chartData.song.player2}.json`;

            const charResponse = await fetch(charPath);
            if (charResponse.ok) {
              const charData = await charResponse.json();
              // Usar el healthicon del personaje, o el nombre del personaje como fallback
              iconName = charData.healthicon || chartData.song.player2;
            } else {
              iconName = chartData.song.player2;
            }
          }
        }
      } catch (e) {
        console.warn(`Couldn't load data for ${song.name}:`, e);
      }

      const iconKey = `icon-${iconName}-${song.isMod ? song.modName || "mod" : "base"}`;
      if (!this.textures.exists(iconKey)) {
        await new Promise(resolve => {
          this.load.spritesheet(iconKey, `public/assets/images/characters/icons/${iconName}.png`, {
            frameWidth: 150,
            frameHeight: 150
          });
          this.load.once("complete", resolve);
          this.load.start();
        });
      }
      song._enemyIconKey = iconKey;
    }));

    this.songTexts = this.songList.map((song, index) => {
      const container = this.add.container(0, index * this.songSpacing);

      const songText = new Alphabet(this, 0, 0, song.name.toUpperCase(), true, 0.8);
      container.add(songText);

      if (song._enemyIconKey && this.textures.exists(song._enemyIconKey)) {
        const icon = this.add.sprite(songText.width + 80, 0, song._enemyIconKey)
          .setOrigin(0.5, 0.5)
          .setScale(0.7);
        container.add(icon);
        container._iconSprite = icon;
      }

      const hitWidth = container._iconSprite ?
        (container._iconSprite.x + container._iconSprite.displayWidth / 2 + this.songHitAreaPadding) :
        (songText.width + this.songHitAreaPadding);

      const hitHeight = Math.max(
        songText.height,
        container._iconSprite ? container._iconSprite.displayHeight : 0
      ) + this.songHitAreaPadding;

      container.setInteractive(new Phaser.Geom.Rectangle(
        -this.songHitAreaPadding / 2,
        -hitHeight / 2,
        hitWidth + this.songHitAreaPadding,
        hitHeight
      ), Phaser.Geom.Rectangle.Contains);

      container.on('pointerdown', () => {
        this.selectedIndex = index;
        this.updateSelection();
        this.scrollSound?.play();
      });

      container.on('pointerup', () => {
        if ((this.time.now - this.lastTapTime) < this.tapDelay) {
          this.selectSong();
        }
      });

      container._songText = songText;
      this.textContainer.add(container);
      return container;
    });

    this.difficultyContainer = this.add.container(width - 250, 170);
    this.updateDifficultyText();
  }

  updateDifficultyText() {
    this.difficultyContainer?.removeAll(true);

    if (this.songList.length === 0 || !this.songList[this.selectedIndex]) return;

    const difficulty = this.difficulties[this.selectedDifficulty];
    const song = this.songList[this.selectedIndex];
    const savedData = this.loadSongScore(song.name, difficulty);

    this.difficultyText = this.createVCRText(0, 0, `DIFFICULTY: ${difficulty.toUpperCase()}`, 36);
    this.difficultyContainer.add(this.difficultyText);

    this.difficultyInteractiveArea = this.add.zone(0, 0, this.difficultyText.width + 40, this.difficultyText.height + 20)
      .setOrigin(0.5)
      .setInteractive();
    this.difficultyContainer.add(this.difficultyInteractiveArea);

    this.difficultyInteractiveArea.on('pointerdown', () => {
      this.changeDifficulty(1);
      this.scrollSound?.play();
    });

    if (savedData) {
      const statsContainer = this.add.container(0, 50);

      const scoreText = this.createVCRText(0, 0, `SCORE: ${savedData.score}`, 28);
      const accuracyText = this.createVCRText(0, 30, `ACCURACY: ${Math.round(savedData.accuracy * 100)}%`, 28);
      const missesText = this.createVCRText(0, 60, `MISSES: ${savedData.misses}`, 28);

      statsContainer.add([scoreText, accuracyText, missesText]);
      this.difficultyContainer.add(statsContainer);
    }
  }

  loadSongScore(songName, difficulty) {
    const data = localStorage.getItem(`score_${songName}_${difficulty}`);
    return data ? JSON.parse(data) : null;
  }

  setupInputs() {
    this.input.keyboard.removeAllListeners("keydown");

    const controls = {
      up: localStorage.getItem("CONTROLS.UI.UP") || "UP",
      down: localStorage.getItem("CONTROLS.UI.DOWN") || "DOWN",
      left: localStorage.getItem("CONTROLS.UI.LEFT") || "LEFT",
      right: localStorage.getItem("CONTROLS.UI.RIGHT") || "RIGHT",
      accept: localStorage.getItem("CONTROLS.UI.ACCEPT") || "ENTER",
      back: localStorage.getItem("CONTROLS.UI.BACK") || "ESCAPE"
    };

    this.input.keyboard.on("keydown", event => {
      const key = this.formatKeyName(event.key, event.code);

      if (key === controls.up) this.changeSelection(-1);
      else if (key === controls.down) this.changeSelection(1);
      else if (key === controls.left) this.changeDifficulty(-1);
      else if (key === controls.right) this.changeDifficulty(1);
      else if (key === controls.accept) this.selectSong();
      else if (key === controls.back) this.returnToMenu();
    });

    this.input.on("wheel", (_, __, ___, dy) => {
      if (dy < 0) this.changeSelection(-1);
      else if (dy > 0) this.changeSelection(1);
    });
  }

  setupTouchControls() {
    if (!this.isMobile) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let dragVelocity = 0;
    const dragThreshold = 50; // Umbral para el scroll

    this.input.on('pointerdown', (pointer) => {
      startY = pointer.y;
      currentY = pointer.y;
      isDragging = true;
      dragVelocity = 0;
      this.lastTapTime = this.time.now;
    });

    this.input.on('pointermove', (pointer) => {
      if (!isDragging) return;

      const deltaY = pointer.y - currentY;
      dragVelocity = deltaY;

      if (Math.abs(pointer.y - startY) > dragThreshold) {
        // Si el deslizamiento supera el umbral, cambiamos la selección
        if (deltaY > 0) {
          this.changeSelection(-1);
        } else if (deltaY < 0) {
          this.changeSelection(1);
        }
        // Actualizar posición inicial para el siguiente cambio
        startY = pointer.y;
      }

      currentY = pointer.y;
    });

    this.input.on('pointerup', () => {
      isDragging = false;
      startY = 0;
      currentY = 0;
      dragVelocity = 0;
    });

    this.input.on('pointercancel', () => {
      isDragging = false;
      startY = 0;
      currentY = 0;
      dragVelocity = 0;
    });

    // Prevenir scroll cuando se interactúa con elementos específicos
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject === this.difficultyInteractiveArea || gameObject === this.backButton) {
        isDragging = false;
      }
    });
  }

  setupMobileBackButton() {
    const { width, height } = this.scale;

    this.backButton = this.add.sprite(width - 105, height - 75, 'backButton')
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive()
      .setScale(0.5)
      .setFrame('back0000');

    this.backButton.on('pointerdown', () => {
      // Reproducir sonido de cancelar
      this.sound.play('cancelMenu');

      // Crear la animación
      this.anims.create({
        key: 'backPress',
        frames: this.anims.generateFrameNames('backButton', {
          prefix: 'back',
          zeroPad: 4,
          start: 0,
          end: 22
        }),
        frameRate: 24,
        repeat: 0
      });

      this.backButton.play('backPress');

      // Esperar a que la animación llegue a la mitad antes de cambiar de escena
      this.time.delayedCall(100, () => {
        this.scene.get("TransitionScene").startTransition('MainMenuState');
      });
    });
  }

  formatKeyName(key, code) {
    const special = {
      " ": "SPACE", ArrowUp: "UP", ArrowDown: "DOWN",
      ArrowLeft: "LEFT", ArrowRight: "RIGHT", Control: "CTRL",
      Alt: "ALT", Shift: "SHIFT", Tab: "TAB", Enter: "ENTER",
      Escape: "ESCAPE", Backspace: "BACKSPACE"
    };
    return special[key] ||
      (key?.startsWith("F") && key.length <= 3 ? key.toUpperCase() :
        code?.startsWith("Numpad") ? code.replace("Numpad", "NUM_") :
          key?.length === 1 ? key.toUpperCase() : key || "");
  }

  changeDifficulty(change) {
    this.scrollSound?.play();
    this.selectedDifficulty = Phaser.Math.Wrap(
      this.selectedDifficulty + change,
      0,
      this.difficulties.length
    );
    this.updateDifficultyText();
  }

  changeSelection(change) {
    this.scrollSound?.play();
    this.selectedIndex = Phaser.Math.Wrap(
      this.selectedIndex + change,
      0,
      this.songList.length
    );
    this.updateSelection();
    this.updateScroll();
    this.updateDifficultyText();
  }

  updateScroll(immediate = false) {
    if (!this.textContainer) return;

    const cameraHeight = this.cameras.main.height;
    const centerY = cameraHeight / 2;
    const selectedY = this.selectedIndex * this.songSpacing;

    let targetY = centerY - selectedY;
    const minY = centerY - ((this.songList.length - 1) * this.songSpacing);
    const maxY = centerY;

    targetY = Phaser.Math.Clamp(targetY, minY, maxY);

    if (this.scrollTween) this.scrollTween.stop();

    this.scrollTween = this.tweens.add({
      targets: this.textContainer,
      y: targetY,
      duration: immediate ? 200 : this.isMobile ? 300 : 400,
      ease: this.isMobile ? "Quad.out" : "Cubic.out"
    });
  }

  updateSelection() {
    this.songTexts?.forEach((container, index) => {
      const isSelected = index === this.selectedIndex;
      const songText = container._songText;
      const icon = container._iconSprite;

      this.tweens.add({
        targets: songText,
        scale: isSelected ? 1.2 : 1,
        duration: 120,
        ease: "Cubic.out"
      });
      songText.setAlpha(isSelected ? 1 : 0.6);

      if (icon) {
        if (isSelected) {
          this.tweens.add({
            targets: icon,
            x: songText.width + 100,
            scale: 0.8,
            duration: 120,
            ease: "Cubic.out"
          });
        } else {
          icon.x = songText.width + 80;
          icon.setScale(0.7);
        }
        icon.setAlpha(isSelected ? 1 : 0.6);
      }
    });
  }

  selectSong() {
    if (!this.songList[this.selectedIndex]) return;

    this.confirmSound?.play();
    const song = this.songList[this.selectedIndex];

    this.scene.start("PlayState", {
      storyPlaylist: [song.name],
      songList: [song.name],
      currentSongIndex: 0,
      storyDifficulty: this.difficulties[this.selectedDifficulty],
      isStoryMode: false,
      weekName: song.weekName,
      selectedDifficulty: this.difficulties[this.selectedDifficulty],
      isMod: song.isMod,
      modPath: song.modPath
    });
  }

  returnToMenu() {
    this.cancelSound?.play();
    this.scene.start("MainMenuState");
  }

  shutdown() {
    this.textContainer?.destroy(true);
    this.difficultyContainer?.destroy(true);
    this.bg?.destroy();

    [this.scrollSound, this.confirmSound, this.cancelSound].forEach(sound => {
      sound?.stop();
      sound?.destroy();
    });

    this.input.keyboard.removeAllListeners();
    this.input.off('pointerdown');
    this.input.off('pointerup');
    this.tweens.killAll();

    if (this.backButton) {
      this.backButton.destroy();
    }
  }

  update() {
    const selectedContainer = this.songTexts?.[this.selectedIndex];
    const icon = selectedContainer?._iconSprite;

    if (icon) {
      const bpm = icon._bpm || 120;
      const beat = Math.floor(this.time.now / (60000 / bpm));

      if (beat !== icon._lastBeat) {
        icon._lastBeat = beat;
        this.tweens.add({
          targets: icon,
          scale: icon.scale * 1.1,
          duration: 80,
          yoyo: true,
          ease: "Quad.out"
        });
      }
    }
  }
}

game.scene.add("FreeplayState", FreeplayState);