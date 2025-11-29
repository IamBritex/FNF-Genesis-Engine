/**
 * SongPlayer.js
 * Módulo encargado de cargar y reproducir los assets de la canción.
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
    const SONG_PATH_BASE = 'public/songs';
    const songPath = `${SONG_PATH_BASE}/${targetSongId}/song`;
    const timestamp = Date.now(); 

    const instKey = `Inst_${songName}`;
    // Verificar si ya existe para no recargar y duplicar claves si algo falla
    if (!scene.cache.audio.exists(instKey)) {
        scene.load.audio(instKey, `${songPath}/Inst.ogg?t=${timestamp}`);
        console.log(`SongPlayer: Iniciando carga de ${instKey} (Inst.ogg)`);
    }

    if (chartData.needsVoices) {
      const playerKey = `Voices-Player_${songName}`;
      const opponentKey = `Voices-Opponent_${songName}`;
      if (!scene.cache.audio.exists(playerKey)) scene.load.audio(playerKey, `${songPath}/Voices-Player.ogg?t=${timestamp}`);
      if (!scene.cache.audio.exists(opponentKey)) scene.load.audio(opponentKey, `${songPath}/Voices-Opponent.ogg?t=${timestamp}`);
    } else {
      const voicesKey = `Voices_${songName}`;
      if (!scene.cache.audio.exists(voicesKey)) scene.load.audio(voicesKey, `${songPath}/Voices.ogg?t=${timestamp}`);
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
   * @param {Phaser.Scene} scene - La escena (PlayScene).
   * @param {object} chartData - El objeto de datos del chart.
   * @param {object} songAudio - El objeto {inst, voices} devuelto por playSong.
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