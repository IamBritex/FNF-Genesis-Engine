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
            return '/FNF-Genesis-Engine/'; // Your repo name
        }
        // For local development and Electron
        return '/public';
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
                chartPath = `${modPath}/audio/songs/${songName}/charts/Events.json`;
            } else {
                chartPath = `${this.basePath}/assets/audio/songs/${songName}/charts/Events.json`;
            }
            
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
                    await this.loadScript(event.script, event.inputs, isMod, modPath);
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

    async loadScript(scriptName, inputs = null, isMod = false, modPath = null) {
        try {
            // Clean up existing script if it exists
            if (this.activeScripts.has(scriptName)) {
                await this.cleanupScript(scriptName);
            }

            let scriptPath;
            if (isMod && modPath) {
                // Asegurar que la ruta del mod use el base path correcto
                const cleanModPath = modPath.replace('/public/', '');
                scriptPath = `${this.basePath}${cleanModPath}/data/scripts/${scriptName}.js`;
            } else {
                scriptPath = `${this.basePath}${this.scriptsBasePath}${scriptName}.js`;
            }

            console.log(`Loading script from: ${scriptPath}`);
            
            const scriptModule = await import(scriptPath);
            
            if (!scriptModule.default) {
                throw new Error(`Script ${scriptName} has no default export`);
            }

            const ScriptClass = scriptModule.default;
            const scriptInstance = new ScriptClass(this.scene);
            
            // Pasar referencias necesarias
            if (this.cameraController) {
                scriptInstance.cameraController = this.cameraController;
            }

            // Initialize first
            if (typeof scriptInstance.init === 'function') {
                await scriptInstance.init();
            }
            
            // Then define if needed
            if (inputs && typeof scriptInstance.define === 'function') {
                await scriptInstance.define(...inputs);
            }

            // Store script with metadata
            this.activeScripts.set(scriptName, {
                instance: scriptInstance,
                type: 'continuous',
                isMod: isMod,
                lastUpdate: this.scene.time.now
            });

            console.log(`Script ${scriptName} initialized successfully`);
            return scriptInstance;
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
                this.loadScript(event.script, event.inputs, isMod, modPath);
            }
        }

        // Actualizar scripts activos
        this.activeScripts.forEach(({instance}, scriptName) => {
            try {
                // Llamar al update del script si existe
                if (instance?.update) {
                    instance.update(time, delta);
                }
            } catch (error) {
                console.error(`Error updating script ${scriptName}:`, error);
            }
        });
    }
}