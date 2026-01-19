import ModHandler from "../../../core/ModHandler.js";

export class SongPlayer {

  static async loadSongAudio(scene, targetSongId, chartData) {
    if (!targetSongId || !chartData || !chartData.song) {
      console.error("SongPlayer.loadSongAudio: Faltan datos (targetSongId o chartData).");
      return;
    }

    const songName = chartData.song;
    const timestamp = Date.now();

    const loadAudio = async (key, fileName) => {
      if (!scene.cache.audio.exists(key)) {
        const internalPath = `${targetSongId}/song/${fileName}`;
        const finalUrl = await ModHandler.getPath('songs', internalPath);
        scene.load.audio(key, `${finalUrl}?t=${timestamp}`);
        console.log(`SongPlayer: Cargando ${key} desde ${finalUrl}`);
      }
    };

    const instKey = `Inst_${songName}`;
    await loadAudio(instKey, 'Inst.ogg');

    if (chartData.needsVoices) {
      const playerKey = `Voices-Player_${songName}`;
      const opponentKey = `Voices-Opponent_${songName}`;
      await loadAudio(playerKey, 'Voices-Player.ogg');
      await loadAudio(opponentKey, 'Voices-Opponent.ogg');
    } else {
      const voicesKey = `Voices_${songName}`;
      await loadAudio(voicesKey, 'Voices.ogg');
    }
  }

  static playSong(scene, chartData) {
    if (!chartData || !chartData.song) {
      console.error("SongPlayer.playSong: chartData.song no es válido.");
      return null;
    }

    const songName = chartData.song;
    const instKey = `Inst_${songName}`;
    let inst = null;
    let voices = [];

    if (scene.cache.audio.exists(instKey)) {
      inst = scene.sound.add(instKey);
      inst.play();
    } else {
      console.error(`¡Error Crítico! No se encontró el instrumental: ${instKey}`);
      return null;
    }

    if (chartData.needsVoices) {
      const playerKey = `Voices-Player_${songName}`;
      const opponentKey = `Voices-Opponent_${songName}`;

      if (scene.cache.audio.exists(playerKey) && scene.cache.audio.exists(opponentKey)) {
        const voicesP = scene.sound.add(playerKey);
        const voicesO = scene.sound.add(opponentKey);
        voicesP.play();
        voicesO.play();
        voices.push(voicesP, voicesO);
        console.log("SongPlayer: Reproduciendo pistas de voz separadas.");
      } else {
        console.warn(`SongPlayer: Faltan pistas de voz separadas. Reproduciendo solo instrumental.`);
      }

    } else {
      const voicesKey = `Voices_${songName}`;
      if (scene.cache.audio.exists(voicesKey)) {
        const singleVoice = scene.sound.add(voicesKey);
        singleVoice.play();
        voices.push(singleVoice);
        console.log("SongPlayer: Reproduciendo pista de voz combinada.");
      } else {
        console.log("SongPlayer: No se encontró pista combinada. Reproduciendo solo instrumental.");
      }
    }

    return { inst: inst, voices: voices };
  }

  static shutdown(scene, chartData, songAudio) {
    if (songAudio) {
      if (songAudio.inst) {
        songAudio.inst.stop();
        songAudio.inst.destroy();
      }
      if (songAudio.voices) {
        songAudio.voices.forEach(voice => {
          voice.stop();
          voice.destroy();
        });
      }
    }

    if (!chartData || !chartData.song) {
      return;
    }

    const songName = chartData.song;
    const instKey = `Inst_${songName}`;
    const voicesKey = `Voices_${songName}`;
    const playerKey = `Voices-Player_${songName}`;
    const opponentKey = `Voices-Opponent_${songName}`;

    const keysToClean = [instKey, voicesKey, playerKey, opponentKey];

    keysToClean.forEach(key => {
      if (scene.cache.audio.exists(key)) {
        scene.cache.audio.remove(key);
        console.log(`SongPlayer: Limpiado ${key} del caché.`);
      }
    });
  }
}