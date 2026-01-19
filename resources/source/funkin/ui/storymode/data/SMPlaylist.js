export class SMPlaylist {
    /**
     * Procesa los datos de la semana y devuelve un array plano con los IDs de las canciones.
     * @param {Object} weekData - El objeto JSON de la semana.
     * @returns {string[]} Array de strings con los IDs de las canciones.
     */
    static getPlaylist(weekData) {
        if (!weekData || !weekData.tracks) {
            return [];
        }

        // Si es un array (ej: [["Song1", "icon"], ["Song2"]]), lo aplanamos completamente.
        if (Array.isArray(weekData.tracks)) {
            return weekData.tracks
                .flat(Infinity) // Aplana cualquier nivel de anidación
                .filter(item => typeof item === 'string' && item.trim().length > 0); // Filtra solo strings válidos
        }

        return [];
    }
}