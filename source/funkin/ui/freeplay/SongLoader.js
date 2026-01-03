import ModHandler from "../../../core/ModHandler.js";

/**
 * Carga canciones combinando weekList base y mods.
 */
export async function loadSongsFromWeeklist(cache) {
  const songList = [];

  // 1. Obtener lista combinada desde ModHandler
  const weekNames = await ModHandler.getCombinedWeekList(cache);

  const loadPromises = [];

  // 2. Cargar JSONs
  for (const weekName of weekNames) {
    // Usar ModHandler.getPath para encontrar el JSON donde sea que esté
    const weekPath = ModHandler.getPath('data', `weeks/${weekName}.json`);

    loadPromises.push(
      fetch(weekPath)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json().then(jsonData => ({ jsonData, weekName }));
        })
        .catch(err => {
          // console.warn(...) 
          return null;
        })
    );
  }

  const results = await Promise.allSettled(loadPromises);

  // 3. Procesar resultados (Igual que antes)
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { jsonData: weekData, weekName } = result.value;

      if (weekData.tracks && Array.isArray(weekData.tracks)) {
        for (const trackList of weekData.tracks) {
          // Soportar tanto array simple ["Bopeebo"] como array de arrays [["Bopeebo", ...]]
          const songs = Array.isArray(trackList) ? trackList : [trackList];

          for (const songName of songs) {
            if (typeof songName === 'string') {
              songList.push({
                displayName: songName,
                icon: weekData.weekCharacters ? weekData.weekCharacters[0] : 'face',
                difficulties: ["easy", "normal", "hard"],
                weekName: weekData.weekName || weekName,
                // Color opcional si quieres agregarlo al freeplay
                color: weekData.weekBackground || '#FFFFFF'
              });
            }
          }
        }
      }
    }
  }

  return songList;
}