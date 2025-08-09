import { ModManager } from "../../utils/ModDetect.js";
import Alphabet from "../../utils/Alphabet.js";

class FreeplayState extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayState" });
    this.songList = [];
    this.selectedIndex = 0;
    this.selectedDifficulty = 1; // Por defecto normal (posición 1)
    this.difficulties = ["easy", "normal", "hard"]; // Orden estándar
    this.currentSongDifficulties = ["normal"]; // Dificultades específicas de la canción actual
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
    // Cache para evitar cargas duplicadas
    this.loadedAssets = new Set();

    // Assets esenciales primero
    const essentialAssets = [
      { type: 'image', key: 'menuBGMagenta', path: 'public/assets/images/menuBGMagenta.png' },
      { type: 'audio', key: 'scrollMenu', path: 'public/assets/audio/sounds/scrollMenu.ogg' },
      { type: 'audio', key: 'confirmMenu', path: 'public/assets/audio/sounds/confirmMenu.ogg' },
      { type: 'audio', key: 'cancelMenu', path: 'public/assets/audio/sounds/cancelMenu.ogg' },
      { type: 'text', key: 'weekList', path: 'public/assets/data/weekList.txt' },
      { type: 'atlas', key: 'bold', path: 'public/assets/images/UI/bold.png', data: 'public/assets/images/UI/bold.json' }
    ];

    // Cargar assets esenciales
    essentialAssets.forEach(asset => {
      if (!this.loadedAssets.has(asset.key)) {
        if (asset.type === 'atlas') {
          this.load.atlas(asset.key, asset.path, asset.data);
        } else {
          this.load[asset.type](asset.key, asset.path);
        }
        this.loadedAssets.add(asset.key);
      }
    });

    // Cargar botón móvil solo si es necesario
    if (this.isMobile && !this.loadedAssets.has('backButton')) {
      this.load.atlasXML('backButton',
        'public/assets/images/UI/mobile/backButton.png',
        'public/assets/images/UI/mobile/backButton.xml'
      );
      this.loadedAssets.add('backButton');
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

    // Inicializar dificultades dinámicas para la canción inicial
    if (this.songList.length > 0) {
      await this.updateSongDifficulties();
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
    const loadPromises = [];

    // Cargar semanas base
    const baseWeekList = this.cache.text.get("weekList")
      .trim().split("\n").filter(week => week.trim());

    // Crear promesas para cargar semanas base
    baseWeekList.forEach(week => {
      loadPromises.push(this._loadWeekSongs(week, false));
    });

    // Cargar semanas de mods si están activos
    if (ModManager.isModActive()) {
      const modWeeks = ModManager.getModWeekList();
      modWeeks.forEach(weekData => {
        loadPromises.push(this._loadWeekSongs(weekData, true));
      });
    }

    // Ejecutar todas las cargas en paralelo
    try {
      const results = await Promise.allSettled(loadPromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allSongs.push(...result.value);
        }
      });
    } catch (error) {
      // Error silencioso en producción
    }

    this.songList = allSongs;

    if (!this.songList.length) {
      // Intentar cargar al menos una canción de prueba
      this.songList = [{
        name: "Tutorial",
        weekName: "tutorial",
        isMod: false,
        modPath: null,
        modName: null
      }];
    }
  }

  async _loadWeekSongs(weekData, isMod = false) {
    try {
      let week, weekName;

      if (isMod) {
        weekName = typeof weekData === 'string' ? weekData : weekData.week;
        const weekPath = `${weekData.modPath}/data/weekList/${weekName}.json`;
        const response = await fetch(weekPath);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        week = await response.json();

        week.isMod = true;
        week.modPath = weekData.modPath;
        week.modName = weekData.modName;
      } else {
        weekName = weekData;
        const weekPath = `public/assets/data/weekList/${weekName}.json`;

        const response = await fetch(weekPath);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - No se pudo cargar ${weekPath}`);
        }

        week = await response.json();
      }

      // Extraer canciones de la semana
      const songs = [];

      // Verificar tanto "songs" como "tracks" para compatibilidad
      let songList = [];
      if (week.songs && Array.isArray(week.songs)) {
        songList = week.songs;
      } else if (week.tracks && Array.isArray(week.tracks)) {
        // Si tracks es un array de arrays (como en el formato original)
        songList = week.tracks.flat();
      }

      if (songList.length > 0) {
        songList.forEach(songName => {
          if (typeof songName === 'string' && songName.trim()) {
            songs.push({
              name: songName.trim(),
              weekName: week.weekName || weekName,
              isMod: isMod,
              modPath: week.modPath,
              modName: week.modName
            });
          }
        });
      }

      return songs;

    } catch (error) {
      return [];
    }
  }

  createVCRText(x, y, text, size = 32, color = "#FFFFFF") {
    return this.add.text(x, y, text, {
      fontFamily: "VCR",
      fontSize: size,
      color: color
    }).setOrigin(0.5, 0.5);
  }

  async detectSongDifficulties(song) {
    const difficulties = [];

    // 1. Verificar el chart base (normal sin sufijo)
    const baseChartPath = song.isMod
      ? `${song.modPath}/audio/songs/${song.name}/charts/${song.name}.json`
      : `public/assets/audio/songs/${song.name}/charts/${song.name}.json`;

    try {
      const response = await fetch(baseChartPath, { method: 'HEAD' });
      if (response.ok) {
        difficulties.push("normal");
      }
    } catch (e) {
      // Chart base no existe
    }

    // 2. Leer dificultades personalizadas desde diff.txt (cacheado)
    let customDifficulties = [];
    const cacheKey = song.isMod ? `${song.modName}-difficulties` : 'base-difficulties';

    if (!this[cacheKey]) {
      try {
        const diffPath = song.isMod
          ? `${song.modPath}/data/diff.txt`
          : `public/assets/data/diff.txt`;

        const diffResponse = await fetch(diffPath);
        if (diffResponse.ok) {
          const diffText = await diffResponse.text();
          customDifficulties = diffText.trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        }
        this[cacheKey] = customDifficulties; // Cachear para reutilizar
      } catch (e) {
        this[cacheKey] = []; // Cachear resultado vacío
      }
    } else {
      customDifficulties = this[cacheKey];
    }

    // 3. Orden correcto: easy, normal (ya añadida), hard, personalizadas
    const standardDifficulties = ["easy", "hard"];
    const allDifficulties = [...standardDifficulties, ...customDifficulties];

    // 4. Verificar cada dificultad
    const checkPromises = allDifficulties.map(async (diff) => {
      const chartPath = song.isMod
        ? `${song.modPath}/audio/songs/${song.name}/charts/${song.name}-${diff}.json`
        : `public/assets/audio/songs/${song.name}/charts/${song.name}-${diff}.json`;

      try {
        const response = await fetch(chartPath, { method: 'HEAD' });
        return response.ok ? diff : null;
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.allSettled(checkPromises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value !== null) {
        difficulties.push(result.value);
      }
    });

    // 5. Reordenar según el orden correcto: easy, normal, hard, personalizadas
    const orderedDifficulties = [];
    if (difficulties.includes("easy")) orderedDifficulties.push("easy");
    if (difficulties.includes("normal")) orderedDifficulties.push("normal");
    if (difficulties.includes("hard")) orderedDifficulties.push("hard");

    // Añadir personalizadas en el orden que aparecen
    customDifficulties.forEach(diff => {
      if (difficulties.includes(diff)) orderedDifficulties.push(diff);
    });

    // 6. Si no se encontró nada, usar normal como fallback
    return orderedDifficulties.length > 0 ? orderedDifficulties : ["normal"];
  }

  async updateSongDifficulties() {
    if (!this.songList[this.selectedIndex]) return;

    const song = this.songList[this.selectedIndex];

    // Si ya tenemos las dificultades cacheadas, usarlas
    if (song._difficulties) {
      this.currentSongDifficulties = song._difficulties;
    } else {
      // Detectar dificultades para esta canción
      this.currentSongDifficulties = await this.detectSongDifficulties(song);
      song._difficulties = this.currentSongDifficulties; // Cachear para uso futuro
    }

    // Asegurar que el índice de dificultad sea válido
    if (this.selectedDifficulty >= this.currentSongDifficulties.length) {
      this.selectedDifficulty = 0;
    }
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

    // Usar dificultades dinámicas de la canción actual
    const difficulty = this.currentSongDifficulties[this.selectedDifficulty] || this.currentSongDifficulties[0] || "normal";
    const song = this.songList[this.selectedIndex];
    const savedData = this.loadSongScore(song.name, difficulty);

    // Mostrar accuracy percentage en lugar del contador de dificultades
    const accuracyPercentage = savedData ? Math.round(savedData.accuracy * 100) : 0;
    const difficultyDisplayText = `DIFFICULTY: ${difficulty.toUpperCase()} (${accuracyPercentage}%)`;

    this.difficultyText = this.createVCRText(0, 0, difficultyDisplayText, 36);
    this.difficultyContainer.add(this.difficultyText);

    // Solo mostrar área interactiva si hay múltiples dificultades
    if (this.currentSongDifficulties.length > 1) {
      this.difficultyInteractiveArea = this.add.zone(0, 0, this.difficultyText.width + 40, this.difficultyText.height + 20)
        .setOrigin(0.5)
        .setInteractive();
      this.difficultyContainer.add(this.difficultyInteractiveArea);

      this.difficultyInteractiveArea.on('pointerdown', () => {
        this.changeDifficulty(1);
        this.scrollSound?.play();
      });
    }

    if (savedData) {
      const statsContainer = this.add.container(0, 50);

      const scoreText = this.createVCRText(0, 0, `MAX SCORE: ${savedData.score}`, 28);
      const missesText = this.createVCRText(0, 30, `MISSES: ${savedData.misses}`, 28);

      statsContainer.add([scoreText, missesText]);
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
    // Solo cambiar dificultad si hay más de una disponible
    if (this.currentSongDifficulties.length <= 1) return;

    this.scrollSound?.play();
    this.selectedDifficulty = Phaser.Math.Wrap(
      this.selectedDifficulty + change,
      0,
      this.currentSongDifficulties.length
    );
    this.updateDifficultyText();
  }

  async changeSelection(change) {
    this.scrollSound?.play();
    this.selectedIndex = Phaser.Math.Wrap(
      this.selectedIndex + change,
      0,
      this.songList.length
    );

    // Actualizar dificultades para la nueva canción seleccionada
    await this.updateSongDifficulties();

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

    // Usar la dificultad dinámica actual
    const selectedDifficulty = this.currentSongDifficulties[this.selectedDifficulty] || this.currentSongDifficulties[0] || "normal";

    this.scene.start("PlayState", {
      storyPlaylist: [song.name],
      songList: [song.name],
      currentSongIndex: 0,
      storyDifficulty: selectedDifficulty,
      isStoryMode: false,
      weekName: song.weekName,
      selectedDifficulty: selectedDifficulty,
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