export class ScriptHandler {
    constructor(scene) {
        this.scene = scene;
        this.activeScripts = new Map();
        this.scriptEvents = [];
        this.scriptsBasePath = '/public/assets/data/scripts/';
        this.isLoading = false;
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
            // Force cleanup before loading new scripts
            await this.cleanup();

            if (!songData?.song?.events) {
                console.log(`No events found for song: ${songData?.song?.song || 'Unknown'}`);
                this.isLoading = false;
                return;
            }

            const chartPath = `/public/assets/audio/songs/${songData.song.song}/charts/Events.json`;
            
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

            this.scriptEvents = eventsData.events;

            // Load initial scripts one by one
            for (const event of this.scriptEvents.filter(e => e.time === 0)) {
                try {
                    await this.loadScript(event.script);
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

    async loadScript(scriptName) {
        if (this.activeScripts.has(scriptName)) {
            console.log(`Cleaning up existing script: ${scriptName}`);
            await this.cleanupScript(scriptName);
        }

        try {
            const scriptPath = `${this.scriptsBasePath}${scriptName}.js`;
            const scriptModule = await import(scriptPath);
            
            if (!scriptModule.default) throw new Error('No default export');

            const ScriptClass = scriptModule.default;
            const scriptInstance = new ScriptClass(this.scene);
            
            if (typeof scriptInstance.init === 'function') {
                await scriptInstance.init();
            }

            this.activeScripts.set(scriptName, {
                instance: scriptInstance,
                type: 'continuous'
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
            // Limpiar cada script individualmente
            for (const [name, {instance}] of this.activeScripts) {
                if (instance?.cleanup) {
                    await instance.cleanup();
                }
                // Asegurarse de que el script se destruya completamente
                if (instance?.destroy) {
                    instance.destroy();
                }
            }
            
            // Limpiar colecciones
            this.activeScripts.clear();
            this.scriptEvents = [];
            
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

        this.activeScripts.forEach(({instance}) => {
            if (instance?.update) {
                try {
                    instance.update(time, delta);
                } catch (error) {
                    console.error(`Error updating script:`, error);
                }
            }
        });
    }
}