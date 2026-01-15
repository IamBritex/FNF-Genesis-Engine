import ModHandler from "../../../../core/ModHandler.js";

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
    // FIX: ModHandler.getPath devuelve una promesa. Debemos resolverla antes de hacer fetch.
    // Creamos una cadena de promesas: Obtener Ruta -> Fetch -> Parsear JSON
    const promise = ModHandler.getPath('data', `weeks/${weekName}.json`)
      .then(weekPath => fetch(weekPath))
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json().then(jsonData => ({ jsonData, weekName }));
      })
      .catch(err => {
        console.warn(`Error loading week ${weekName}:`, err);
        return null;
      });

    loadPromises.push(promise);
  }

  const results = await Promise.allSettled(loadPromises);

  // 3. Procesar resultados
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