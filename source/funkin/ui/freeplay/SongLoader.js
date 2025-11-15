/**
 * Carga canciones leyendo 'weekList.txt' y luego cada 'weekName.json'.
 * @param {Phaser.Cache.BaseCache} cache - La caché de la escena de Phaser (scene.cache).
 * @returns {Promise<Array<Object>>} Una promesa que se resuelve con la lista de canciones.
 */
export async function loadSongsFromWeeklist(cache) {
  const songList = [];
  const weekListText = cache.text.get('weekList');

  if (!weekListText) {
    throw new Error("weekList.txt not found in cache. Did preload fail?");
  }

  const weekNames = weekListText.trim().split('\n').map(w => w.trim()).filter(w => w.length > 0);
  const loadPromises = [];

  for (const weekName of weekNames) {
    const weekPath = `public/data/weeks/${weekName}.json`;
    loadPromises.push(
      fetch(weekPath)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${weekName}.json`);
          return response.json().then(jsonData => ({ jsonData, weekName }));
        })
        .catch(err => {
          console.warn(`Failed to load or parse ${weekName}.json:`, err);
          return null;
        })
    );
  }

  const results = await Promise.allSettled(loadPromises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { jsonData: weekData, weekName } = result.value;

      if (weekData.tracks && Array.isArray(weekData.tracks)) {
        for (const trackList of weekData.tracks) {
          if (Array.isArray(trackList)) {
            for (const songName of trackList) {
              if (typeof songName === 'string') {
                songList.push({
                  displayName: songName,
                  icon: weekData.weekCharacters ? weekData.weekCharacters[0] : 'dad',
                  difficulties: ["easy", "normal", "hard"],
                  weekName: weekData.weekName || weekName
                });
              }
            }
          }
        }
      } else {
        // Mantenemos este log, ya que indica un problema potencial con los datos
        console.warn(`Week ${weekData.weekName || 'UNKNOWN'} has no 'tracks' array.`);
      }
    } else if (result.status === 'rejected') {
      // Mantenemos el log de error
      console.error("A week failed to load:", result.reason);
    }
  }

  return songList;
}