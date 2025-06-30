import { getGenesisLuaAPI } from './GenesisLuaAPI.js';

export class ScriptHandler {
    constructor(scene) {
        this.scene = scene;
        this.activeScripts = new Map();
        this.scriptEvents = [];
        this.pendingEvents = [];
        this.scriptsBasePath = '/assets/data/scripts/';
        this.isLoading = false;
        this.basePath = this._getBasePath();
        this.cameraController = scene.cameraController; // Añadir referencia a la cámara
    }

    _getBasePath() {
        // Check if we're in GitHub Pages
        if (window.location.hostname.includes('github.io')) {
            return '/FNF-Genesis-Engine'; // Remove trailing slash
        }
        return ''; // Return empty string for local development
    }

    destroy() {
        this.cleanup();
        this.activeScripts = null;
        this.scriptEvents = null;
        this.scene = null;
    }

    async loadEventsFromChart(songData) {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            await this.cleanup();

            if (!songData?.song?.events) {
                console.log(`No events found for song: ${songData?.song?.song || 'Unknown'}`);
                this.isLoading = false;
                return;
            }

            // Determinar si la canción es de un mod
            const isMod = songData.isMod;
            const modPath = songData.modPath;
            const songName = songData.song.song;

            // Construir la ruta del chart de eventos
            let chartPath;
            if (isMod) {
                const cleanModPath = modPath
                    .replace(/^public\//, '')
                    .replace(/^\/+/, '')
                    .replace(/^mods\//, '');
                chartPath = `public/mods/${cleanModPath}/audio/songs/${songName}/charts/Events.json`;
            } else {
                chartPath = `public/assets/audio/songs/${songName}/charts/Events.json`;
            }

            chartPath = this._normalizePath(chartPath);

            console.log(`Attempting to load events from: ${chartPath} (${isMod ? 'MOD' : 'BASE GAME'})`);

            const response = await fetch(chartPath);
            if (!response.ok) {
                console.log(`No events file found at: ${chartPath}`);
                this.isLoading = false;
                return;
            }

            const eventsData = await response.json();
            if (!eventsData?.events) {
                console.log(`No valid events data in: ${chartPath}`);
                this.isLoading = false;
                return;
            }

            // Ordenar eventos por tiempo
            this.scriptEvents = eventsData.events.sort((a, b) => a.time - b.time);

            // Separar eventos inmediatos y pendientes
            const immediateEvents = this.scriptEvents.filter(e => e.time === 0);
            this.pendingEvents = this.scriptEvents.filter(e => e.time > 0);

            // Cargar eventos inmediatos
            for (const event of immediateEvents) {
                try {
                    // Cambia: ahora usa params y pasa los valores como ...Object.values(event.params)
                    await this.loadScript(event.script, event.params ? Object.values(event.params) : [], isMod, modPath);
                } catch (error) {
                    console.warn(`Could not load script ${event.script}:`, error);
                }
            }

        } catch (error) {
            console.warn('Could not load events chart:', error);
        } finally {
            this.isLoading = false;
        }
    }

    _normalizePath(path) {
        // Remove any leading slashes
        path = path.replace(/^\/+/, '');

        // Handle mod paths (starting with public/)
        if (path.startsWith('public/')) {
            path = path.replace(/^public\//, '');
            return `${this.basePath}/public/${path}`;
        }
        
        // Handle base game assets
        if (!path.startsWith('assets/')) {
            path = `assets/${path}`;
        }
        return `${this.basePath}/${path}`;
    }

    async loadScript(scriptName, inputs = null, isMod = false, modPath = null) {
        try {
            if (this.activeScripts.has(scriptName)) {
                await this.cleanupScript(scriptName);
            }

            let scriptPath;
            let isLua = scriptName.endsWith('.lua');
            let baseName = scriptName.replace(/\.js$|\.lua$/i, '');

            if (isMod && modPath) {
                const cleanModPath = modPath
                    .replace(/^public\//, '')
                    .replace(/^\/+/, '')
                    .replace(/^mods\//, '');
                scriptPath = isLua
                    ? `public/mods/${cleanModPath}/data/scripts/${baseName}.lua`
                    : `public/mods/${cleanModPath}/data/scripts/${baseName}.js`;
            } else {
                scriptPath = isLua
                    ? `public/assets/data/scripts/${baseName}.lua`
                    : `public/assets/data/scripts/${baseName}.js`;
            }

            scriptPath = this._normalizePath(scriptPath);
            console.log(`Loading script from: ${scriptPath}`);

            if (isLua) {
                // Cargar y ejecutar script LUA usando Fengari
                const response = await fetch(scriptPath);
                if (!response.ok) throw new Error(`Lua script not found: ${scriptPath}`);
                const luaCode = await response.text();

                // Exponer la API del engine a Lua
                const luaAPI = getGenesisLuaAPI(this.scene);
                const L = fengari.lauxlib.luaL_newstate();
                fengari.lualib.luaL_openlibs(L);

                // Cargar la librería JS en el estado de Lua
                fengari.lua.lua_getglobal(L, fengari.to_luastring("_G"));
                fengari.lauxlib.luaL_requiref(
                    L,
                    fengari.to_luastring("js"),
                    fengari.interop.luaopen_js,
                    1
                );
                fengari.lua.lua_pop(L, 1);

                // Exponer la API JS a Lua como 'engine'
                fengari.interop.push(L, luaAPI);
                fengari.lua.lua_setglobal(L, fengari.to_luastring('engine'));

                // Ejecutar el script
                try {
                    fengari.lauxlib.luaL_dostring(L, fengari.to_luastring(luaCode));
                } catch (err) {
                    console.error(`Error running Lua script ${scriptName}:`, err);
                }

                // Guarda la instancia para limpieza si es necesario
                this.activeScripts.set(scriptName, {
                    instance: L,
                    type: 'lua',
                    isMod: isMod,
                    lastUpdate: this.scene.time.now
                });

                console.log(`Lua script ${scriptName} executed successfully`);
                return L;
            } else {
                const scriptModule = await import(scriptPath);
                if (!scriptModule.default) {
                    throw new Error(`Script ${scriptName} has no default export`);
                }

                const ScriptClass = scriptModule.default;
                const scriptInstance = new ScriptClass(this.scene);

                // Crear un proxy para interceptar accesos a propiedades
                const proxiedInstance = new Proxy(scriptInstance, {
                    get: (target, prop, receiver) => {
                        const value = Reflect.get(target, prop, receiver);

                        // Si es una función, verificar si usa rutas
                        if (typeof value === 'function') {
                            return (...args) => {
                                // Procesar argumentos para normalizar rutas
                                const processedArgs = args.map(arg => {
                                    if (typeof arg === 'string' && (
                                        arg.startsWith('public/') || 
                                        arg.startsWith('assets/') ||
                                        arg.startsWith('mods/')
                                    )) {
                                        return this._normalizePath(arg);
                                    }
                                    return arg;
                                });
                                return value.apply(target, processedArgs);
                            };
                        }

                        // Si es una string que parece una ruta, normalizarla
                        if (typeof value === 'string' && (
                            value.startsWith('public/') || 
                            value.startsWith('assets/') ||
                            value.startsWith('mods/')
                        )) {
                            return this._normalizePath(value);
                        }

                        return value;
                    }
                });

                // Pasar referencias necesarias
                if (this.cameraController) {
                    proxiedInstance.cameraController = this.cameraController;
                }

                // Initialize first
                if (typeof proxiedInstance.init === 'function') {
                    await proxiedInstance.init();
                }
                
                // Then define if needed
                if (inputs && typeof proxiedInstance.define === 'function') {
                    await proxiedInstance.define(...inputs);
                }

                // Store proxied instance
                this.activeScripts.set(scriptName, {
                    instance: proxiedInstance,
                    type: 'continuous',
                    isMod: isMod,
                    lastUpdate: this.scene.time.now
                });

                console.log(`Script ${scriptName} initialized successfully`);
                return proxiedInstance;
            }
        } catch (error) {
            console.error(`Error loading ${scriptName}:`, error);
            return null;
        }
    }

    async cleanup() {
        console.log("Cleaning up all scripts...");
        
        try {
            // Crear una copia del Map para evitar modificaciones durante la iteración
            const scriptsToClean = new Map(this.activeScripts);
            
            // Limpiar cada script individualmente
            for (const [name, {instance}] of scriptsToClean) {
                try {
                    if (instance?.cleanup) {
                        await instance.cleanup();
                    }
                    // Asegurarse de que el script se destruya completamente
                    if (instance?.destroy) {
                        await instance.destroy();
                    }
                } catch (error) {
                    console.warn(`Error cleaning up script ${name}:`, error);
                }
            }
            
            // Limpiar colecciones
            this.activeScripts.clear();
            this.scriptEvents = [];
            this.pendingEvents = [];
            
            console.log("All scripts cleaned up successfully");
        } catch (error) {
            console.error("Error during script cleanup:", error);
        }
    }

    async cleanupScript(scriptName) {
        const script = this.activeScripts.get(scriptName);
        if (!script?.instance) return;

        try {
            if (script.instance.cleanup) {
                await script.instance.cleanup();
            }
            this.activeScripts.delete(scriptName);
            console.log(`Script ${scriptName} cleaned up`);
        } catch (error) {
            console.warn(`Error cleaning up ${scriptName}:`, error);
        }
    }

    update(time, delta) {
        if (this.isLoading) return;

        // Actualizar la posición de la canción
        const songPosition = this.scene.songPosition;

        // Verificar eventos pendientes
        if (this.pendingEvents.length > 0) {
            const eventsToExecute = [];
            const remainingEvents = [];

            for (const event of this.pendingEvents) {
                if (songPosition >= event.time) {
                    eventsToExecute.push(event);
                } else {
                    remainingEvents.push(event);
                }
            }

            this.pendingEvents = remainingEvents;

            // Ejecutar eventos usando la información de mod si está disponible
            for (const event of eventsToExecute) {
                const isMod = this.scene.songData?.isMod || false;
                const modPath = this.scene.songData?.modPath;
                // Cambia: ahora usa params y pasa los valores como ...Object.values(event.params)
                this.loadScript(event.script, event.params ? Object.values(event.params) : [], isMod, modPath);
            }
        }

        // Actualizar scripts activos
        this.activeScripts.forEach(({instance}, scriptName) => {
            try {
                if (instance?.update) {
                    instance.update(time, delta);
                }
            } catch (error) {
                console.error(`Error updating script ${scriptName}:`, error);
            }
        });
    }
}