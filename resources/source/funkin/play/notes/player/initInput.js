import { NoteDirection } from "../NoteDirection.js";

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

            // 1. Cargar configuración de Ghost Tapping
            if (prefs && typeof prefs['opt-ghosttap'] !== 'undefined') {
                this.ghostTapEnabled = prefs['opt-ghosttap'];
            }

            // 2. Cargar configuración de Botplay (opt-botplay)
            if (prefs && typeof prefs['opt-botplay'] !== 'undefined') {
                this.isBotPlay = prefs['opt-botplay'];
                console.log(`[PlayerNotesHandler] Botplay cargado desde preferencias: ${this.isBotPlay}`);
            }

            // 3. Funciones para limpiar nombres de teclas
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

            // 4. Cargar binds personalizados
            const l0 = getBind("keybind_note_left_0");
            const l1 = getBind("keybind_note_left_1");
            if (l0 || l1) binds[NoteDirection.LEFT] = [l0, l1].filter(x => x);

            const d0 = getBind("keybind_note_down_0");
            const d1 = getBind("keybind_note_down_1");
            if (d0 || d1) binds[NoteDirection.DOWN] = [d0, d1].filter(x => x);

            const u0 = getBind("keybind_note_up_0");
            const u1 = getBind("keybind_note_up_1");
            if (u0 || u1) binds[NoteDirection.UP] = [u0, u1].filter(x => x);

            const r0 = getBind("keybind_note_right_0");
            const r1 = getBind("keybind_note_right_1");
            if (r0 || r1) binds[NoteDirection.RIGHT] = [r0, r1].filter(x => x);
        }
    } catch (e) {
        console.warn("PlayerNotesHandler: Error cargando preferencias/keybinds, usando defaults.", e);
    }

    // Aplicar estado visual inicial del Botplay (ocultar UI si es necesario)
    this.updateBotPlayState();

    // Construir mapa plano de teclas
    const keyMap = {};
    Object.keys(binds).forEach(dir => {
        const keys = binds[dir];
        keys.forEach(k => {
            if (k) keyMap[k] = parseInt(dir);
        });
    });

    // Registrar listeners en Phaser (TECLADO)
    Object.keys(keyMap).forEach((keyName) => {
        const direction = keyMap[keyName];
        let keyObj;
        try {
            keyObj = this.scene.input.keyboard.addKey(keyName);
        } catch (e) {
            console.warn(`PlayerNotesHandler: Tecla inválida '${keyName}'`);
            return;
        }

        const onDown = () => {
            if (this.scene.pauseHandler?.isPaused) return;
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

    // Toggle Botplay Manual (Tecla B)
    const bKey = this.scene.input.keyboard.addKey("B");
    const onBotKey = () => {
        if (this.scene.pauseHandler?.isPaused) return;
        this.toggleBotMode();
    };
    bKey.on("down", onBotKey);
    this.gameplayInputListeners.push({ keyObj: bKey, downHandler: onBotKey, upHandler: () => { } });

    // [NUEVO] Conexión con el Gamepad via PlayInputHandler
    if (this.scene.inputHandler) {
        // Función auxiliar para Gamepad Down
        const onGamepadDown = (direction) => {
            if (this.scene.pauseHandler?.isPaused) return;
            if (this.isBotPlay) return;

            if (!this.activeInput[direction]) {
                this.activeInput[direction] = true;
                this.onStrumPressed(direction);
            }
        };

        // Función auxiliar para Gamepad Up
        const onGamepadUp = (direction) => {
            if (this.scene.pauseHandler?.isPaused) return;
            if (this.isBotPlay) return;

            if (this.activeInput[direction]) {
                this.activeInput[direction] = false;
                this.onStrumReleased(direction);
            }
        };

        // Suscribirse a los eventos
        this.scene.inputHandler.on('noteDown', onGamepadDown);
        this.scene.inputHandler.on('noteUp', onGamepadUp);

        // Guardar referencia para limpiar listeners al destruir
        this.gameplayInputListeners.push({
            destroy: () => {
                if (this.scene && this.scene.inputHandler) {
                    this.scene.inputHandler.off('noteDown', onGamepadDown);
                    this.scene.inputHandler.off('noteUp', onGamepadUp);
                }
            }
        });
    }
}