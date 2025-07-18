import { ModManager } from "../../utils/ModDetect.js";
import Alphabet from "../../utils/Alphabet.js";

class FreeplayState extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayState" });
    this._initProperties();
  }

  _initProperties() {
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
    
    // Propiedades para control táctil
    this.touchStartY = 0;
    this.touchStartX = 0;
    this.isDragging = false;
    this.songSpacing = 122;
    this.difficultyText = null;
    this.difficultyInteractiveArea = null;
    this.lastTapTime = 0;
    this.tapDelay = 300;
    this.songHitAreaPadding = 40; // Padding adicional para el área de toque
  }

  init(data) {
    this._initProperties();
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
    
    this.cameras.main.fadeIn(500);
  }

  setupBackground(width, height) {
    this.bg = this.add.image(width/2, height/2, "menuBGMagenta")
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
    try {
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
    } catch (error) {
      console.error("Error loading week data:", error);
      throw error;
    }
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
          if (chartData.song?.player2) iconName = chartData.song.player2;
        }
      } catch (e) {
        console.warn(`Couldn't load chart for ${song.name}:`, e);
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

      // Calcular el área de hit ampliada
      const hitWidth = container._iconSprite ? 
        (container._iconSprite.x + container._iconSprite.displayWidth/2 + this.songHitAreaPadding) : 
        (songText.width + this.songHitAreaPadding);
      
      const hitHeight = Math.max(
        songText.height,
        container._iconSprite ? container._iconSprite.displayHeight : 0
      ) + this.songHitAreaPadding;

      // Hacer todo el contenedor interactivo con área ampliada
      container.setInteractive(new Phaser.Geom.Rectangle(
        -this.songHitAreaPadding/2,
        -hitHeight/2,
        hitWidth + this.songHitAreaPadding,
        hitHeight
      ), Phaser.Geom.Rectangle.Contains);
      
      container.on('pointerdown', () => {
        this.selectedIndex = index;
        this.updateSelection();
        this.scrollSound?.play();
      });
      
      container.on('pointerup', () => {
        if (!this.isDragging && (this.time.now - this.lastTapTime) < this.tapDelay) {
          this.selectSong();
        }
      });

      container._songText = songText;
      this.textContainer.add(container);
      return container;
    });

    // Configurar contenedor de dificultad
    this.difficultyContainer = this.add.container(width - 250, 170);
    this.updateDifficultyText();
  }

  updateDifficultyText() {
    this.difficultyContainer?.removeAll(true);

    if (this.songList.length === 0 || !this.songList[this.selectedIndex]) return;

    const difficulty = this.difficulties[this.selectedDifficulty];
    const song = this.songList[this.selectedIndex];
    const savedData = this.loadSongScore(song.name, difficulty);

    // Texto de dificultad
    this.difficultyText = this.createVCRText(0, 0, `DIFFICULTY: ${difficulty.toUpperCase()}`, 36);
    this.difficultyContainer.add(this.difficultyText);

    // Área interactiva para cambiar dificultad
    this.difficultyInteractiveArea = this.add.zone(0, 0, this.difficultyText.width + 40, this.difficultyText.height + 20)
      .setOrigin(0.5)
      .setInteractive();
    this.difficultyContainer.add(this.difficultyInteractiveArea);

    // Configurar evento de toque
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
    // Limpiar eventos previos
    this.input.off('pointerdown');
    this.input.off('pointerup');
    this.input.off('pointermove');

    // Configurar eventos de arrastre general
    this.input.on('pointerdown', (pointer) => {
      this.touchStartY = pointer.y;
      this.touchStartX = pointer.x;
      this.isDragging = false;
      this.lastTapTime = this.time.now;
    });

    this.input.on('pointermove', (pointer) => {
      if (Math.abs(pointer.y - this.touchStartY) > 10 || Math.abs(pointer.x - this.touchStartX) > 10) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        const deltaY = pointer.y - this.touchStartY;
        this.touchStartY = pointer.y;
        
        // Mover el contenedor
        this.textContainer.y += deltaY;
        
        // Actualizar selección basada en la posición
        this.updateSelectionFromScroll();
      }
    });

    this.input.on('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.snapToNearestSong();
      }
    });
  }

  updateSelectionFromScroll() {
    const cameraHeight = this.cameras.main.height;
    const centerY = cameraHeight / 2;
    const currentPos = centerY - this.textContainer.y;
    
    const newIndex = Phaser.Math.Clamp(
      Math.round(currentPos / this.songSpacing),
      0,
      this.songList.length - 1
    );
    
    if (newIndex !== this.selectedIndex) {
      this.selectedIndex = newIndex;
      this.updateSelection();
      this.updateDifficultyText();
      this.scrollSound?.play();
    }
  }

  snapToNearestSong() {
    const cameraHeight = this.cameras.main.height;
    const centerY = cameraHeight / 2;
    const selectedY = this.selectedIndex * this.songSpacing;
    
    const targetY = centerY - selectedY;
    const minY = centerY - ((this.songList.length - 1) * this.songSpacing);
    const maxY = centerY;
    
    const clampedY = Phaser.Math.Clamp(targetY, minY, maxY);
    
    if (this.scrollTween) this.scrollTween.stop();
    
    this.scrollTween = this.tweens.add({
      targets: this.textContainer,
      y: clampedY,
      duration: 300,
      ease: "Cubic.out",
      onComplete: () => {
        this.updateSelection();
        this.updateDifficultyText();
      }
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
      duration: immediate ? 200 : 400,
      ease: "Cubic.out"
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
    this.input.off('pointermove');
    this.tweens.killAll();
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