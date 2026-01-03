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

        // 1. Ordenar eventos por tiempo
        this.events = eventsList.sort((a, b) => a.time - b.time);
        this.currentEventIndex = 0;

        // 2. Identificar scripts únicos (ej: "altAnimation")
        // [CORRECCIÓN] Filtramos (s => s) para eliminar undefined, null o strings vacíos
        const uniqueScripts = [...new Set(this.events.map(e => e.script))].filter(s => s);

        console.log(`[ScriptHandler] Scripts requeridos: ${uniqueScripts.join(', ')}`);

        // 3. Cargar cada script desde public/data/scripts/Nombre.js
        for (const scriptName of uniqueScripts) {
            // [SEGURIDAD EXTRA] Si por alguna razón sigue pasando un inválido, lo saltamos
            if (!scriptName) continue;

            if (!this.globalScripts.has(scriptName)) {
                // ModHandler buscará en mods o en public/data/scripts/
                const path = ModHandler.getPath('data', `scripts/${scriptName}.js`);

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

            // Si ya pasamos el tiempo del evento, ejecutarlo
            if (songTime >= event.time) {
                this.executeEvent(event);
                this.currentEventIndex++;
            } else {
                break; // El siguiente evento es en el futuro
            }
        }
    }

    executeEvent(event) {
        // Si el evento no tiene script (es undefined), salimos sin hacer nada
        if (!event.script) return;

        const module = this.globalScripts.get(event.script);

        if (module) {
            // event.type = "define" (nombre de la función)
            const fnName = event.type || "run";

            if (typeof module[fnName] === 'function') {
                try {
                    // Pasamos params y la escena
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