/**
 * ModHandler.js
 * Sistema de Mods: VFS (Virtual File System) con Escaneo Recursivo.
 */
export default class ModHandler {
    static MODS_ROOT = "https://mods.genesis/";
    static BASE_ROOT = "/public/";

    // Registro: 'songs/stick/charts/stick.json' -> 'NombreMod'
    static fileRegistry = new Map();
    static activeMods = [];
    static modMetadata = new Map();

    static async init() {
        if (!window.Genesis) return;

        const modFolders = await window.Genesis.file.list('mods');
        if (!modFolders || modFolders.length === 0) return;

        console.log(`[ModHandler] Mods detectados: ${modFolders.join(", ")}`);

        for (const modName of modFolders) {
            await ModHandler.loadModMetadata(modName);
            // Iniciamos el escaneo recursivo
            await ModHandler.scanModFolder(modName);
            ModHandler.activeMods.push(modName);
        }

        console.log(`[ModHandler] Sistema listo. ${ModHandler.fileRegistry.size} archivos indexados.`);
    }

    static async loadModMetadata(modName) {
        const url = `${ModHandler.MODS_ROOT}${modName}/mod.json`;
        try {
            const response = await fetch(url);
            if (response.ok) ModHandler.modMetadata.set(modName, await response.json());
        } catch (e) { }
    }

    /**
     * Inicia el escaneo de las categorías principales.
     */
    static async scanModFolder(modName) {
        const categories = ['images', 'data', 'songs', 'music', 'sounds', 'videos'];

        for (const cat of categories) {
            // Llamamos a la función recursiva para cada categoría
            await ModHandler.scanRecursive(modName, cat);
        }
    }

    /**
     * [NUEVO] Escanea carpetas infinitamente hasta encontrar archivos.
     * @param {string} modName - Nombre del mod.
     * @param {string} currentPath - Ruta relativa actual (ej: 'songs/stick/charts').
     */
    static async scanRecursive(modName, currentPath) {
        // Pide la lista de archivos en la ruta actual
        // Ruta física real: mods/MiMod/songs/stick/charts
        const fullPathForList = `mods/${modName}/${currentPath}`;
        const items = await window.Genesis.file.list(fullPathForList);

        if (!items || items.length === 0) return;

        for (const item of items) {
            // HEURÍSTICA: Si tiene punto (.), es archivo. Si no, es carpeta.
            if (item.includes('.')) {
                // Es un archivo! Lo registramos.
                // Clave: songs/stick/charts/stick.json
                const virtualPath = `${currentPath}/${item}`;
                ModHandler.fileRegistry.set(virtualPath, modName);
            } else {
                // Es carpeta! Profundizamos más.
                // Nueva ruta: songs/stick/charts
                await ModHandler.scanRecursive(modName, `${currentPath}/${item}`);
            }
        }
    }

    static getPath(category, path) {
        // La clave ahora se construye limpiamente
        const key = `${category}/${path}`;

        if (ModHandler.fileRegistry.has(key)) {
            const modName = ModHandler.fileRegistry.get(key);
            // console.log(`[ModHandler] Override encontrado: ${key} -> ${modName}`);
            return `${ModHandler.MODS_ROOT}${modName}/${category}/${path}`;
        }

        return `${ModHandler.BASE_ROOT}${category}/${path}`;
    }

    static async getCombinedWeekList(sceneCache) {
        let allWeeks = [];
        if (sceneCache && sceneCache.text.exists('weekList')) {
            const baseText = sceneCache.text.get('weekList');
            allWeeks.push(...baseText.trim().split('\n').map(w => w.trim()).filter(w => w.length > 0));
        }

        for (const modName of ModHandler.activeMods) {
            const modWeekUrl = `${ModHandler.MODS_ROOT}${modName}/data/ui/weeks.txt`;
            try {
                const response = await fetch(modWeekUrl);
                if (response.ok) {
                    const text = await response.text();
                    allWeeks.push(...text.trim().split('\n').map(w => w.trim()).filter(w => w.length > 0));
                }
            } catch (e) { }
        }
        return [...new Set(allWeeks)];
    }
}