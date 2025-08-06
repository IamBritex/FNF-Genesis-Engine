export function getGenesisLuaAPI(scene) {
    return {
        // Ejemplo de función expuesta a Lua
        setHealth: (value) => {
            if (scene.healthBar) scene.healthBar.setHealth(value);
        },
        getHealth: () => scene.healthBar ? scene.healthBar.health : 1,
        onEnemyNoteHit: (callback) => {
            // Suponiendo que la escena tiene un sistema de eventos
            if (scene.events && typeof scene.events.on === 'function') {
                scene.events.on('enemyNoteHit', callback);
            }
        },
        // Agrega aquí más funciones del engine que quieras exponer a Lua
        getData: () => ({
            songPosition: scene.songPosition || 0,
            bpm: scene.currentBPM || 100,
            // Agrega otros datos que quieras exponer
        }),
        log: (message) => {
            console.log('[Lua]:', message);
        }
    };
}