import { NoteDirection } from "../NoteDirection.js";
import { PlayEvents } from "../../PlayEvents.js"; 

/**
 * Inicializa los inputs, keybinds y preferencias del jugador.
 * @this {import('./PlayerNotesHandler.js').PlayerNotesHandler}
 */
export function _initInput() {
    // Configuración por defecto (WASD y Flechas)
    let binds = {
        [NoteDirection.LEFT]: ["A", "LEFT"],
        [NoteDirection.DOWN]: ["S", "DOWN"],
        [NoteDirection.UP]: ["W", "UP"],
        [NoteDirection.RIGHT]: ["D", "RIGHT"]
    };

    // Intentar cargar preferencias desde localStorage
    try {
        const stored = localStorage.getItem('genesis_preferences');
        if (stored) {
            const prefs = JSON.parse(stored);

            if (prefs && typeof prefs['opt-ghosttap'] !== 'undefined') {
                this.ghostTapEnabled = prefs['opt-ghosttap'];
            }

            if (prefs && typeof prefs['opt-botplay'] !== 'undefined') {
                this.isBotPlay = prefs['opt-botplay'];
            }

            // Helpers para limpiar teclas
            const cleanKey = (k) => {
                if (!k) return null;
                if (k.startsWith("Key")) return k.replace("Key", "").toUpperCase();
                if (k.startsWith("Arrow")) return k.replace("Arrow", "").toUpperCase();
                return k.toUpperCase();
            };
            const getBind = (name) => {
                if (prefs[name]) return cleanKey(prefs[name]);
                return null;
            };

            // Cargar binds custom
            const l0 = getBind("keybind_note_left_0"); const l1 = getBind("keybind_note_left_1");
            if (l0 || l1) binds[NoteDirection.LEFT] = [l0, l1].filter(x => x);

            const d0 = getBind("keybind_note_down_0"); const d1 = getBind("keybind_note_down_1");
            if (d0 || d1) binds[NoteDirection.DOWN] = [d0, d1].filter(x => x);

            const u0 = getBind("keybind_note_up_0"); const u1 = getBind("keybind_note_up_1");
            if (u0 || u1) binds[NoteDirection.UP] = [u0, u1].filter(x => x);

            const r0 = getBind("keybind_note_right_0"); const r1 = getBind("keybind_note_right_1");
            if (r0 || r1) binds[NoteDirection.RIGHT] = [r0, r1].filter(x => x);
        }
    } catch (e) {
        console.warn("PlayerNotesHandler: Error cargando preferencias, usando defaults.", e);
    }

    // [CORRECCIÓN CRÍTICA]
    // No llamamos a updateBotPlayState() aquí porque emite eventos a la UI
    // antes de que la escena haya terminado de construirse, causando el crash 'drawImage'.
    // La variable this.isBotPlay ya está seteada correctamente arriba.
    // this.updateBotPlayState(); 

    // --- TECLADO (Legacy Direct Input) ---
    const keyMap = {};
    Object.keys(binds).forEach(dir => {
        const keys = binds[dir];
        keys.forEach(k => { if (k) keyMap[k] = parseInt(dir); });
    });

    Object.keys(keyMap).forEach((keyName) => {
        const direction = keyMap[keyName];
        let keyObj;
        try { keyObj = this.scene.input.keyboard.addKey(keyName); } catch (e) { return; }

        const onDown = () => {
            if (this.scene.pauseHandler?.isPaused) return; // Compatibilidad legacy
            if (this.isBotPlay) return;

            if (!this.activeInput[direction]) {
                this.activeInput[direction] = true;
                this.onStrumPressed(direction);
            }
        };

        const onUp = () => {
            if (this.scene.pauseHandler?.isPaused) return;
            if (this.isBotPlay) return;

            if (this.activeInput[direction]) {
                this.activeInput[direction] = false;
                this.onStrumReleased(direction);
            }
        };

        keyObj.on("down", onDown);
        keyObj.on("up", onUp);
        this.gameplayInputListeners.push({ keyObj, downHandler: onDown, upHandler: onUp });
    });

    // Toggle Botplay (B)
    const bKey = this.scene.input.keyboard.addKey("B");
    const onBotKey = () => { if (!this.scene.pauseHandler?.isPaused) this.toggleBotMode(); };
    bKey.on("down", onBotKey);
    this.gameplayInputListeners.push({ keyObj: bKey, downHandler: onBotKey, upHandler: () => { } });

    // --- GAMEPAD / INPUT CENTRALIZADO ---
    // Escuchamos los eventos globales emitidos por PlayInputHandler
    
    const onInputDown = (direction) => {
        if (this.isBotPlay) return;
        
        // Evitar duplicados si el teclado ya activó este input
        if (!this.activeInput[direction]) {
            this.activeInput[direction] = true;
            this.onStrumPressed(direction);
        }
    };

    const onInputUp = (direction) => {
        if (this.isBotPlay) return;

        if (this.activeInput[direction]) {
            this.activeInput[direction] = false;
            this.onStrumReleased(direction);
        }
    };

    // Usamos scene.events en lugar de scene.inputHandler.on
    this.scene.events.on(PlayEvents.INPUT_NOTE_DOWN, onInputDown, this);
    this.scene.events.on(PlayEvents.INPUT_NOTE_UP, onInputUp, this);

    // Guardar referencia para limpieza
    this.gameplayInputListeners.push({
        destroy: () => {
            if (this.scene && this.scene.events) {
                this.scene.events.off(PlayEvents.INPUT_NOTE_DOWN, onInputDown, this);
                this.scene.events.off(PlayEvents.INPUT_NOTE_UP, onInputUp, this);
            }
        }
    });
}