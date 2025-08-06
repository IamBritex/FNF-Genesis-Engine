
export class ScriptHandler {
    constructor(scene) {
        this.scene = scene;
        this.activeScripts = new Map();
        this.scriptEvents = [];
        this.pendingEvents = [];
        this.scriptsBasePath = '/assets/data/scripts/';
        this.isLoading = false;
        this.basePath = this._getBasePath();
        this.cameraController = scene.cameraController;
    }

    _getBasePath() {
        if (window.location.hostname.includes('github.io')) {
            return '/FNF-Genesis-Engine';
        }
        return '';
    }

    destroy() {
        this.cleanup();
        this.activeScripts = null;
        this.scriptEvents = null;
        this.scene = null;
    }

    _normalizePath(path) {
        path = path.replace(/^\/+/, '');

        if (path.startsWith('public/')) {
            path = path.replace(/^public\//, '');
            return `${this.basePath}/public/${path}`;
        }
        
        if (!path.startsWith('assets/')) {
            path = `assets/${path}`;
        }
        return `${this.basePath}/${path}`;
    }

    async loadScript(scriptName, inputs = null, isMod = false, modPath = null) {
        try {
            await this.cleanupScript(scriptName);

            let scriptPath;
            let baseName = scriptName.replace(/\.js$/i, '');

            if (isMod && modPath) {
                const cleanModPath = modPath
                    .replace(/^public\//, '')
                    .replace(/^\/+/, '')
                    .replace(/^mods\//, '');
                scriptPath = `public/mods/${cleanModPath}/data/scripts/${baseName}.js`;
            } else {
                scriptPath = `public/assets/data/scripts/${baseName}.js`;
            }

            scriptPath = this._normalizePath(scriptPath);
            console.log(`Loading script from: ${scriptPath}`);

            const scriptModule = await import(scriptPath);
            if (!scriptModule.default) {
                throw new Error(`Script ${scriptName} has no default export`);
            }

            const ScriptClass = scriptModule.default;
            const scriptInstance = new ScriptClass(this.scene);

            if (this.cameraController) {
                scriptInstance.cameraController = this.cameraController;
            }

            const proxiedInstance = this.createScriptProxy(scriptInstance);

            if (typeof proxiedInstance.init === 'function') {
                await proxiedInstance.init();
            }

            if (inputs && typeof proxiedInstance.define === 'function') {
                await proxiedInstance.define(...inputs);
            }

            this.activeScripts.set(scriptName, {
                instance: proxiedInstance,
                type: 'continuous',
                isMod: isMod,
                lastUpdate: this.scene.time.now,
                initialized: true
            });

            return proxiedInstance;
        } catch (error) {
            console.error(`Error loading ${scriptName}:`, error);
            return null;
        }
    }

    async cleanup() {
        console.log("Cleaning up all scripts...");
        
        try {
            const scriptsToClean = Array.from(this.activeScripts.entries());
            
            for (const [name, script] of scriptsToClean) {
                try {
                    if (script.instance) {
                        if (typeof script.instance.cleanup === 'function') {
                            await script.instance.cleanup();
                        }
                        if (typeof script.instance.destroy === 'function') {
                            await script.instance.destroy();
                        }
                        script.instance = null;
                    }
                    this.activeScripts.delete(name);
                } catch (error) {
                    console.warn(`Error cleaning up script ${name}:`, error);
                }
            }
            
            this.scriptEvents = [];
            this.pendingEvents = [];
            
            console.log("All scripts cleaned up successfully");
        } catch (error) {
            console.error("Error during script cleanup:", error);
        }
    }

    async cleanupScript(scriptName) {
        const script = this.activeScripts.get(scriptName);
        if (!script) return;

        try {
            if (script.instance?.cleanup) {
                await script.instance.cleanup();
            }
            this.activeScripts.delete(scriptName);
            console.log(`Script ${scriptName} cleaned up`);
        } catch (error) {
            console.warn(`Error cleaning up ${scriptName}:`, error);
        }
    }

    async resetScriptState(scriptName) {
        const script = this.activeScripts.get(scriptName);
        if (!script) return;

        try {
            await this.cleanupScript(scriptName);
            if (script.type === 'continuous') {
                await this.loadScript(scriptName, null, script.isMod);
            }
        } catch (error) {
            console.error(`Error resetting script state for ${scriptName}:`, error);
        }
    }

    update(time, delta) {
        if (this.isLoading) return;

        const songPosition = this.scene.songPosition;

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

            for (const event of eventsToExecute) {
                const isMod = this.scene.songData?.isMod || false;
                const modPath = this.scene.songData?.modPath;
                this.loadScript(event.script, event.params ? Object.values(event.params) : [], isMod, modPath);
            }
        }

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

    createScriptProxy(scriptInstance) {
        return new Proxy(scriptInstance, {
            get: (target, prop) => {
                if (prop === 'scene') {
                    return this.scene;
                }
                if (prop === 'cameraController') {
                    return this.cameraController;
                }
                return target[prop];
            },
            set: (target, prop, value) => {
                if (prop === 'scene' || prop === 'cameraController') {
                    return false;
                }
                target[prop] = value;
                return true;
            }
        });
    }
}