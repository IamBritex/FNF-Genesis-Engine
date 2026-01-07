/**
 * @fileoverview API Principal de Genesis Engine - Protocolo JSON Corregido
 */

const isNative = !!(window.chrome && window.chrome.webview);
const envType = isNative ? "DESKTOP" : "WEB";
const pendingCallbacks = {};

// --- SISTEMA DE MENSAJERIA (RECEPCIÓN DESDE C++) ---
if (isNative) {
    window.chrome.webview.addEventListener('message', event => {
        const msg = event.data;
        if (!msg) return;

        // C++ responde: "fsList|ruta|archivos"
        if (msg.startsWith("fsList|")) {
            const parts = msg.split('|');
            // parts[0] es el prefijo, parts[1] es la ruta, parts[2] son los archivos
            const pathKey = parts[1].replace(/\\/g, '/');
            const filesStr = parts[2] || "";
            const files = filesStr ? filesStr.split(';').filter(f => f) : []; // Filtramos vacíos

            if (pendingCallbacks['list_' + pathKey]) {
                pendingCallbacks['list_' + pathKey](files);
                delete pendingCallbacks['list_' + pathKey];
            }
        }
        // C++ responde: "isAdmin|true"
        else if (msg.startsWith("isAdmin|")) {
            const val = msg.split('|')[1] === "true";
            if (pendingCallbacks.isAdmin) {
                pendingCallbacks.isAdmin(val);
                delete pendingCallbacks.isAdmin;
            }
        }
        // Agrega aquí más handlers si tu C++ envía otras respuestas (ej: installer)
    });
}

/**
 * Función auxiliar para enviar comandos al NativeBridge
 * @param {string} group - Grupo en C++ (window, fs, system, utils, discord)
 * @param {string} action - Acción específica
 * @param {object} params - Parámetros adicionales
 */
function sendNative(group, action, params = {}) {
    if (isNative) {
        const payload = { group, action, ...params };
        window.chrome.webview.postMessage(JSON.stringify(payload));
    }
}

const Genesis = {
    env: envType,
    info: { version: "1.1.0", author: "Britex", id: "com.genesis.engine" },

    window: {
        resize: (w, h) => { }, // No implementado en NativeBridge actual, se puede añadir
        maximize: () => sendNative("window", "maximize"),
        minimize: () => sendNative("window", "minimize"),
        close: () => sendNative("window", "close"),
        restore: () => sendNative("window", "restore"),
        center: () => sendNative("window", "center"),
        drag: () => sendNative("window", "drag"),
        setTitle: (t) => {
            document.title = t;
            sendNative("window", "setTitle", { param: t });
        },
        setOpacity: (alpha) => sendNative("window", "setOpacity", { param: parseInt(alpha) }),
        setTransparent: (bool) => sendNative("window", "setTransparent", { param: bool })
    },

    dialog: {
        // NOTA: openFile no está implementado en tu NativeBridge actual, 
        // solo está 'notify' (MessageBox).
        messageBox: ({ title, message }) => {
            return new Promise((resolve) => {
                if (!isNative) { alert(`${title}\n\n${message}`); resolve(); return; }
                // NativeBridge no devuelve callback para notify, se asume inmediato
                sendNative("utils", "notify", { title, msg: message });
                resolve();
            });
        }
    },

    shell: {
        openExternal: (url) => {
            if (isNative) sendNative("utils", "openExternal", { param: url });
            else window.open(url, '_blank');
        }
    },

    discord: {
        setActivity: (data) => {
            if (isNative) {
                sendNative("discord", "setActivity", {
                    details: data.details || "",
                    state: data.state || "",
                    largeImage: data.largeImage || "icon",
                    largeText: data.largeText || "Genesis Engine",
                    smallImage: data.smallImage || "",
                    smallText: data.smallText || "",
                    timer: data.timer || false
                });
            } else {
                console.log("[Discord Mock]", data);
            }
        }
    },

    system: {
        isAdmin: () => {
            return new Promise((resolve) => {
                if (!isNative) { resolve(false); return; }
                pendingCallbacks.isAdmin = resolve;
                sendNative("system", "isAdmin");
            });
        }
    },

    file: {
        list: (path) => {
            return new Promise((resolve) => {
                if (!isNative) {
                    console.warn("[Web] Listado de archivos no soportado.");
                    resolve([]);
                    return;
                }
                const pathKey = path.replace(/\\/g, '/');
                pendingCallbacks['list_' + pathKey] = resolve;

                // Enviamos JSON con group="fs", action="list", path="..."
                sendNative("fs", "list", { path: path });
            });
        },

        // NOTA: Tu C++ NativeBridge actual NO tiene implementado 'save' ni 'load'.
        // HandleFS solo tiene 'list'. Si intentas usarlos, no pasará nada.
        save: (path, content) => {
            console.warn("Save no implementado en NativeBridge C++");
            if (!isNative) localStorage.setItem(`genesis_${path}`, content);
        },

        load: (path) => {
            console.warn("Load no implementado en NativeBridge C++");
            if (!isNative) return Promise.resolve(localStorage.getItem(`genesis_${path}`));
            return Promise.resolve(null);
        }
    }
};

window.Genesis = Genesis;
export default Genesis;