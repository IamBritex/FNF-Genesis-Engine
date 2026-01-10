import ModHandler from "../../../core/ModHandler.js";

export class ScriptHandler {
    constructor(scene) {
        this.scene = scene;
        this.globalScripts = new Map();
        this.events = [];
        this.currentEventIndex = 0;
    }

    /**
     * Carga los scripts necesarios para los eventos definidos.
     * @param {Array} eventsList - Lista de eventos { time, script, type, params }
     */
    async loadEventScripts(eventsList) {
        if (!eventsList || eventsList.length === 0) return;

        this.events = eventsList.sort((a, b) => a.time - b.time);
        this.currentEventIndex = 0;

        const uniqueScripts = [...new Set(this.events.map(e => e.script))].filter(s => s);

        console.log(`[ScriptHandler] Scripts requeridos: ${uniqueScripts.join(', ')}`);

        for (const scriptName of uniqueScripts) {
            if (!scriptName) continue;

            if (!this.globalScripts.has(scriptName)) {
                const path = await ModHandler.getPath('data', `scripts/${scriptName}.js`);

                try {
                    console.log(`[ScriptHandler] Importando: ${path}`);
                    const module = await import(path);
                    this.globalScripts.set(scriptName, module);
                } catch (e) {
                    console.error(`[ScriptHandler] Error cargando '${scriptName}.js':`, e);
                }
            }
        }
    }

    /**
     * Procesa los eventos en tiempo real.
     */
    processEvents(songTime) {
        while (this.currentEventIndex < this.events.length) {
            const event = this.events[this.currentEventIndex];

            if (songTime >= event.time) {
                this.executeEvent(event);
                this.currentEventIndex++;
            } else {
                break;
            }
        }
    }

    executeEvent(event) {
        if (!event.script) return;

        const module = this.globalScripts.get(event.script);

        if (module) {
            const fnName = event.type || "run";

            if (typeof module[fnName] === 'function') {
                try {
                    module[fnName](event.params, this.scene);
                } catch (e) {
                    console.error(`[ScriptHandler] Fallo en ${event.script}:${fnName}`, e);
                }
            }
        }
    }

    /**
     * Llama a funciones en los scripts globales si existen (Hooks opcionales)
     */
    call(functionName, ...args) {
        this.globalScripts.forEach(m => {
            if (typeof m[functionName] === 'function') {
                try { m[functionName](...args); } catch (e) { }
            }
        });
    }

    destroy() {
        this.call('onDestroy');
        this.globalScripts.clear();
        this.events = [];
        this.scene = null;
    }
}