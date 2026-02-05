/**
 * GENESIS ENGINE - DEVICE MANAGER
 * Versión "Monkey Patch": Sobrescribe las APIs nativas para que funcionen igual en todas partes.
 */

const isNativePC = typeof window.NL_PORT !== "undefined";
const isMobile = typeof window.Capacitor !== "undefined";

export async function initNativeEngine() {
    
    // 1. APLICAMOS EL PARCHE DE VIBRACIÓN (Lo primero de todo)
    _polyfillVibration();

    // ==========================================
    //  MODO PC (Neutralino)
    // ==========================================
    if (isNativePC) {
        try {
            Neutralino.init();
            Neutralino.events.on("windowClose", () => Neutralino.app.exit());
            _setupPCWindowEvents();
            console.log("PC Mode (Neutralino) Active");
        } catch (err) { console.warn(err); }
    } 
    // ==========================================
    //  MODO MÓVIL (Capacitor)
    // ==========================================
    else if (isMobile) {
        console.log("Mobile Mode (Capacitor) Active");
        const Plugins = window.Capacitor.Plugins;

        // Configuración de pantalla y Segundo Plano
        try {
            if (Plugins.StatusBar) {
                await Plugins.StatusBar.hide();
                await Plugins.StatusBar.setOverlaysWebView({ overlay: true });
            }
            if (Plugins.App) {
                Plugins.App.addListener('appStateChange', ({ isActive }) => {
                    if (!window.game || !window.game.sound) return;
                    window.game.sound.mute = !isActive;
                    console.log(isActive ? "▶️ App activa" : "⏸️ App minimizada");
                });
            }
        } catch (e) { console.warn(e); }
    } 
}

/**
 * Ahora tu código antiguo usará esta función automáticamente.
 */
function _polyfillVibration() {
    // Guardamos la original por si acaso estamos en web normal
    const originalVibrate = window.navigator.vibrate;

    // Sobrescribimos la función nativa
    // NOTA: Usamos 'function' en vez de '=>' para mantener el contexto
    Object.defineProperty(navigator, 'vibrate', {
        value: function(pattern) {
            // Normalizamos: A veces envían [200] y a veces 200. Nos quedamos con el número.
            const ms = Array.isArray(pattern) ? pattern[0] : pattern;

            if (isNativePC) {
                // EN PC: Solo logueamos
                console.log(`Vibrate Hook ${ms}ms`);
                return true;
            } 
            else if (isMobile) {
                // EN ANDROID: Llamamos al plugin de Capacitor
                const Haptics = window.Capacitor?.Plugins?.Haptics;
                if (Haptics) {
                    // Haptics.vibrate suele ser asíncrono, pero navigator.vibrate no espera.
                    // Lo lanzamos y nos olvidamos (Fire and forget).
                    Haptics.vibrate({ duration: ms || 200 });
                } else if (originalVibrate) {
                    // Fallback si falla el plugin
                    originalVibrate.call(navigator, pattern);
                }
                return true;
            }
            
            // Si es web normal, usamos la original
            if (originalVibrate) return originalVibrate.call(navigator, pattern);
            return false;
        },
        writable: true,
        configurable: true
    });

    console.log("API de Vibración Nativa parcheada con éxito.");
}


export async function readFile(path) {
    if (isNativePC) {
        try { return await Neutralino.filesystem.readFile('./' + path); } catch (e) { return null; }
    } else {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error("404");
            return await response.text();
        } catch (e) { return null; }
    }
}

function _setupPCWindowEvents() {
    let isFullScreen = false;
    document.addEventListener('keydown', async (event) => {
        if (event.key === 'F11') {
            event.preventDefault();
            if (isFullScreen) await Neutralino.window.exitFullScreen();
            else await Neutralino.window.setFullScreen();
            isFullScreen = !isFullScreen;
        }
    });
}