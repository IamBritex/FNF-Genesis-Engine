/**
 * @fileoverview ModHandler.js - Sistema de Mods adaptado para PWA
 */
export default class ModHandler {
    static MODS_ROOT = "https://mods.genesis/";
    static BASE_ROOT = "/public/";

    static fileRegistry = new Map();
    static activeMods = [];

    /**
     * @returns {Promise<void>}
     */
    static async init() {
        console.log("[ModHandler] Sistema listo. Esperando montaje de carpeta (mountMods).");
    }

    /**
     * @returns {Promise<void>}
     */
    static async mountMods() {
        if (!window.Genesis || !window.Genesis.fs) {
            console.warn("[ModHandler] Genesis FS no está disponible.");
            return;
        }

        try {
            const dirHandle = await window.Genesis.fs.openFolder();
            if (!dirHandle) return;

            console.log(`[ModHandler] Escaneando directorio: ${dirHandle.name}`);

            ModHandler.fileRegistry.clear();
            ModHandler.activeMods = [];

            await ModHandler.scanRecursive(dirHandle, "");

            console.log(`[ModHandler] Indexación completa. ${ModHandler.fileRegistry.size} archivos encontrados.`);
        } catch (e) {
            console.error("[ModHandler] Error montando mods:", e);
        }
    }

    /**
     * @param {FileSystemDirectoryHandle} dirHandle 
     * @param {string} currentPath 
     */
    static async scanRecursive(dirHandle, currentPath) {
        for await (const [name, handle] of dirHandle.entries()) {
            const virtualPath = currentPath ? `${currentPath}/${name}` : name;

            if (handle.kind === 'file') {
                ModHandler.fileRegistry.set(virtualPath, handle);

                if (!currentPath.includes('/')) {
                    if (!ModHandler.activeMods.includes(name)) {
                        ModHandler.activeMods.push(name);
                    }
                }
            } else if (handle.kind === 'directory') {
                await ModHandler.scanRecursive(handle, virtualPath);
            }
        }
    }

    /**
     * @param {string} path
     * @returns {Promise<File|null>}
     */
    static async getModFile(path) {
        if (ModHandler.fileRegistry.has(path)) {
            const handle = ModHandler.fileRegistry.get(path);
            return await handle.getFile();
        }
        return null;
    }

    /**
     * @param {string} category 
     * @param {string} path 
     * @returns {Promise<string>}
     */
    static async getPathURL(category, path) {
        const possibleModKey = `${category}/${path}`;

        for (const [key, handle] of ModHandler.fileRegistry) {
            if (key.endsWith(possibleModKey)) {
                const file = await handle.getFile();
                return URL.createObjectURL(file);
            }
        }

        return `${ModHandler.BASE_ROOT}${category}/${path}`;
    }

    /**
     * @param {string} category 
     * @param {string} path 
     * @returns {Promise<string>}
     */
    static async getPath(category, path) {
        return await ModHandler.getPathURL(category, path);
    }

    /**
     * @param {Phaser.Cache.CacheManager} cache
     * @returns {Promise<string[]>}
     */
    static async getCombinedWeekList(cache) {
        let list = [];

        if (cache.text.exists('weekList')) {
            const content = cache.text.get('weekList');
            list = content.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        }

        for (const [path] of ModHandler.fileRegistry) {
            if (path.includes('data/weeks/') && path.endsWith('.json')) {
                const parts = path.split('/');
                const fileName = parts[parts.length - 1].replace('.json', '');

                if (!list.includes(fileName)) {
                    list.push(fileName);
                }
            }
        }

        return list;
    }
}