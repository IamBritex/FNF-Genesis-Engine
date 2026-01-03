import { NoteSpawner } from "./NoteSpawner.js";
import { Parser } from "./parser.js";
import { Strumline } from "./Strumline.js";
import { SustainNote } from "./SustainNote.js";
import { PlayerNotesHandler } from "./player/PlayerNotesHandler.js";
import { EnemyNotesHandler } from "./enemy/EnemyNotesHandler.js";
import { NoteSkin } from "./NoteSkin.js"; 

export class NotesHandler {
  constructor(scene, chartData, ratingManager, conductor, sessionId) {
    this.scene = scene;
    this.sessionId = sessionId;
    this.chartData = chartData;
    this.ratingManager = ratingManager;
    this.mainUICADContainer = scene.add.layer(0, 0);

    // 1. Inicializar el NoteSkin Manager
    // Asumimos que PlayScene YA cargó los assets (ver PlayScene.js modificado abajo)
    this.noteSkin = new NoteSkin(scene, chartData);
    
    // Seguridad: Si por alguna razón no cargó (fallback), intentar cargar
    if (!this.noteSkin.getSkinData()) {
         this.noteSkin.loadAssets();
    }

    // 2. Crear Strumlines usando el Skin
    this.playerStrums = Strumline.setupStrumlines(scene, this.noteSkin, true);
    this.enemyStrums = Strumline.setupStrumlines(scene, this.noteSkin, false);

    // --- [CORRECCIÓN] Filtrar NULLs antes de añadir ---
    this.playerStrums.forEach(s => { if(s) this.mainUICADContainer.add(s); });
    this.enemyStrums.forEach(s => { if(s) this.mainUICADContainer.add(s); });
    // -----------------------------------------------

    // 3. Parsear notas
    const allNotes = Parser.parseNotes(chartData);
    const playerNotesData = allNotes.filter(n => n.isPlayerNote);
    const enemyNotesData = allNotes.filter(n => !n.isPlayerNote);

    const commonConfig = {
        sessionId: this.sessionId,
        noteSkin: this.noteSkin, 
        scrollSpeed: (chartData.speed || 1) * 0.3 * (conductor.bpm / 100),
        bpm: conductor.bpm,
        speed: chartData.speed,
        noteScale: this.noteSkin.getSkinData()?.scale || 0.7, 
        noteOffsetX: 0, 
        parentContainer: this.mainUICADContainer
    };

    this.playerHandler = new PlayerNotesHandler(
        scene, playerNotesData, this.playerStrums, commonConfig, ratingManager
    );

    this.enemyHandler = new EnemyNotesHandler(
        scene, enemyNotesData, this.enemyStrums, commonConfig
    );
  }

  // (El resto del archivo NotesHandler.js se mantiene igual...)
  static preload(scene) {
      scene.load.audio("missnote1", "public/sounds/gameplay/miss/missnote1.ogg");
      scene.load.audio("missnote2", "public/sounds/gameplay/miss/missnote2.ogg");
      scene.load.audio("missnote3", "public/sounds/gameplay/miss/missnote3.ogg");
      scene.load.json('skinCfg_Funkin', 'public/data/noteSkins/Funkin.json');
  }

  update(songPosition) {
    if (this.playerHandler) this.playerHandler.update(songPosition);
    if (this.enemyHandler) this.enemyHandler.update(songPosition);
  }

  setCharactersHandler(handler) {
      if (this.playerHandler) this.playerHandler.setCharactersHandler(handler);
      if (this.enemyHandler) this.enemyHandler.setCharactersHandler(handler);
  }

  shutdown() {
    if (this.playerHandler) this.playerHandler.destroy();
    if (this.enemyHandler) this.enemyHandler.destroy();
    if (this.mainUICADContainer) this.mainUICADContainer.destroy();
    this.noteSkin = null;
  }
}