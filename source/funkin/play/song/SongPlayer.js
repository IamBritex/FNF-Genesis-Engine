import ModHandler from "../../../core/ModHandler.js";

/**
 * SongPlayer.js
 * Módulo encargado de cargar y reproducir los assets de la canción.
 * Integra el sistema de Mods para cargar audio desde carpetas personalizadas.
 */
export class SongPlayer {

  /**
   * Carga los assets de audio de la canción.
   */
  static loadSongAudio(scene, targetSongId, chartData) {
    if (!targetSongId || !chartData || !chartData.song) {
      console.error("SongPlayer.loadSongAudio: Faltan datos (targetSongId o chartData).");
      return;
    }

    const songName = chartData.song;
    const timestamp = Date.now();

    // [LÓGICA SEGURA]: Esta función encapsula el "If Mod -> Load Mod, Else -> Load Base"
    const loadAudio = (key, fileName) => {
      if (!scene.cache.audio.exists(key)) {
        // Construimos la ruta interna: "nombreCancion/song/archivo.ogg"
        const internalPath = `${targetSongId}/song/${fileName}`;

        // Aquí ocurre la magia: ModHandler verifica si el archivo existe en el mod.
        // Si existe -> devuelve URL del mod (https://mods.genesis/...)
        // Si no -> devuelve URL base (public/songs/...)
        const finalUrl = ModHandler.getPath('songs', internalPath);

        scene.load.audio(key, `${finalUrl}?t=${timestamp}`);
        console.log(`SongPlayer: Cargando ${key} desde ${finalUrl}`);
      }
    };

    const instKey = `Inst_${songName}`;
    loadAudio(instKey, 'Inst.ogg');

    if (chartData.needsVoices) {
      const playerKey = `Voices-Player_${songName}`;
      const opponentKey = `Voices-Opponent_${songName}`;
      loadAudio(playerKey, 'Voices-Player.ogg');
      loadAudio(opponentKey, 'Voices-Opponent.ogg');
    } else {
      const voicesKey = `Voices_${songName}`;
      loadAudio(voicesKey, 'Voices.ogg');
    }
  }

  /**
   * Reproduce la canción que ya fue cargada.
   * @returns {object|null} Un objeto {inst, voices} o null si falla.
   */
  static playSong(scene, chartData) {
    if (!chartData || !chartData.song) {
      console.error("SongPlayer.playSong: chartData.song no es válido.");
      return null;
    }

    const songName = chartData.song;
    const instKey = `Inst_${songName}`;
    let inst = null;
    let voices = []; // Array para todas las pistas de voz

    // 1. Reproducir el instrumental (siempre)
    if (scene.cache.audio.exists(instKey)) {
      inst = scene.sound.add(instKey);
      inst.play();
    } else {
      console.error(`¡Error Crítico! No se encontró el instrumental: ${instKey}`);
      return null; // Falló
    }

    // 2. Decidir qué pistas de voz reproducir
    if (chartData.needsVoices) {
      const playerKey = `Voices-Player_${songName}`;
      const opponentKey = `Voices-Opponent_${songName}`;

      if (scene.cache.audio.exists(playerKey) && scene.cache.audio.exists(opponentKey)) {
        const voicesP = scene.sound.add(playerKey);
        const voicesO = scene.sound.add(opponentKey);
        voicesP.play();
        voicesO.play();
        voices.push(voicesP, voicesO); // Añadirlas al array
        console.log("SongPlayer: Reproduciendo pistas de voz separadas.");
      } else {
        console.warn(`SongPlayer: Faltan pistas de voz separadas. Reproduciendo solo instrumental.`);
      }

    } else {
      const voicesKey = `Voices_${songName}`;
      if (scene.cache.audio.exists(voicesKey)) {
        const singleVoice = scene.sound.add(voicesKey);
        singleVoice.play();
        voices.push(singleVoice); // Añadirla al array
        console.log("SongPlayer: Reproduciendo pista de voz combinada.");
      } else {
        console.log("SongPlayer: No se encontró pista combinada. Reproduciendo solo instrumental.");
      }
    }

    // Devolvemos los objetos de sonido para que la escena los controle
    return { inst: inst, voices: voices };
  }

  /**
   * Detiene y limpia los sonidos de la canción del caché.
   */
  static shutdown(scene, chartData, songAudio) {
    // 1. Detener los sonidos que están en reproducción
    if (songAudio) {
      if (songAudio.inst) {
        songAudio.inst.stop();
        songAudio.inst.destroy(); // Asegurar destrucción del objeto
      }
      if (songAudio.voices) {
        songAudio.voices.forEach(voice => {
          voice.stop();
          voice.destroy();
        });
      }
    }

    // 2. Limpiar los archivos del caché de Phaser
    if (!chartData || !chartData.song) {
      return;
    }

    const songName = chartData.song;
    const instKey = `Inst_${songName}`;
    const voicesKey = `Voices_${songName}`;
    const playerKey = `Voices-Player_${songName}`;
    const opponentKey = `Voices-Opponent_${songName}`;

    // Array de todas las claves a limpiar
    const keysToClean = [instKey, voicesKey, playerKey, opponentKey];

    keysToClean.forEach(key => {
      if (scene.cache.audio.exists(key)) {
        scene.cache.audio.remove(key); // Eliminar del caché
        console.log(`SongPlayer: Limpiado ${key} del caché.`);
      }
    });
  }
}