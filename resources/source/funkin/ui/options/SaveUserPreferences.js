/**
 * @fileoverview SaveUserPreferences.js
 * Gestor centralizado de preferencias.
 */
export default class SaveUserPreferences {
    static STORAGE_KEY = 'genesis_preferences';
    static preferences = {};

    /**
     * Carga datos del localStorage al iniciar.
     */
    static init() {
        try {
            const stored = localStorage.getItem(SaveUserPreferences.STORAGE_KEY);
            if (stored) {
                SaveUserPreferences.preferences = JSON.parse(stored);
                console.log("[Preferences] Datos cargados:", SaveUserPreferences.preferences);
            } else {
                console.log("[Preferences] Sin datos previos. Creando objeto vacío.");
                SaveUserPreferences.preferences = {};
                SaveUserPreferences.saveToStorage();
            }
        } catch (e) {
            console.error("[Preferences] Error crítico cargando datos, reiniciando:", e);
            SaveUserPreferences.preferences = {};
        }
        return SaveUserPreferences.preferences;
    }

    /**
     * Obtiene una preferencia.
     */
    static get(key, defaultValue = null) {
        if (SaveUserPreferences.preferences && Object.prototype.hasOwnProperty.call(SaveUserPreferences.preferences, key)) {
            return SaveUserPreferences.preferences[key];
        }
        return defaultValue;
    }

    /**
     * Guarda una preferencia y escribe en disco.
     */
    static set(key, value) {
        SaveUserPreferences.preferences[key] = value;
        SaveUserPreferences.saveToStorage();
    }

    static saveToStorage() {
        try {
            const jsonString = JSON.stringify(SaveUserPreferences.preferences);
            localStorage.setItem(SaveUserPreferences.STORAGE_KEY, jsonString);
        } catch (e) {
            console.error("[Preferences] Error al guardar:", e);
        }
    }
}