/**
 * @fileoverview API Principal de Genesis Engine (Con Discord RPC Nativo y Sistema de Archivos Completo)
 */

const isNative = !!(window.chrome && window.chrome.webview);
const userAgent = navigator.userAgent.toLowerCase();
const isMobile = /android|iphone|ipad|ipod/.test(userAgent);
const envType = isNative ? "DESKTOP" : (isMobile ? "MOBILE" : "WEB");

const pendingCallbacks = {};

if (isNative) {
    window.chrome.webview.addEventListener('message', event => {
        const msg = event.data;

        if (msg.startsWith("fileSelected:")) {
            const path = msg.substring(13);
            if (pendingCallbacks.openFile) pendingCallbacks.openFile(path || null);
        }
        else if (msg.startsWith("fileLoaded:")) {
            const dataStr = msg.substring(11);
            const pipeIndex = dataStr.indexOf('|');
            const key = dataStr.substring(0, pipeIndex);
            const content = dataStr.substring(pipeIndex + 1);

            if (pendingCallbacks['load_' + key]) {
                pendingCallbacks['load_' + key](content);
                delete pendingCallbacks['load_' + key];
            }
        }
        else if (msg.startsWith("dirListed:")) {
            const dataStr = msg.substring(10);
            const pipeIndex = dataStr.indexOf('|');
            const pathKey = dataStr.substring(0, pipeIndex).replace(/\\/g, '/');
            const filesStr = dataStr.substring(pipeIndex + 1);
            const files = filesStr ? filesStr.split('|') : [];
            if (pendingCallbacks['list_' + pathKey]) {
                pendingCallbacks['list_' + pathKey](files);
                delete pendingCallbacks['list_' + pathKey];
            }
        }
        else if (msg.startsWith("memInfo:")) {
            const mem = parseInt(msg.substring(8));
            if (pendingCallbacks.getMemory) pendingCallbacks.getMemory(mem);
        }
        else if (msg === "dialogClosed") {
            if (pendingCallbacks.msgBox) pendingCallbacks.msgBox();
        }
    });
}

const Genesis = {
    env: envType,
    info: { version: "1.1.0", author: "Britex", id: "com.genesis.engine" },

    path: {
        userData: isNative ? window.__GENESIS_PATHS__?.userData : "localStorage",
        gameDir: isNative ? window.__GENESIS_PATHS__?.gameDir : "/"
    },

    window: {
        resize: (w, h) => isNative && window.chrome.webview.postMessage(`resize:${w},${h}`),
        maximize: () => isNative && window.chrome.webview.postMessage("maximize"),
        minimize: () => isNative && window.chrome.webview.postMessage("minimize"),
        close: () => isNative && window.chrome.webview.postMessage("close"),
        setTitle: (t) => {
            document.title = t;
            if (isNative) window.chrome.webview.postMessage(`setTitle:${t}`);
        }
    },

    dialog: {
        openFile: ({ filters } = {}) => {
            return new Promise((resolve) => {
                if (!isNative) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = e => resolve(e.target.files[0] ? e.target.files[0].name : null);
                    input.click();
                    return;
                }
                let filterStr = filters ? filters.join("|") : "All Files|*.*";
                pendingCallbacks.openFile = resolve;
                window.chrome.webview.postMessage(`openFile:${filterStr}`);
            });
        },
        messageBox: ({ title, message, type = 0 }) => {
            return new Promise((resolve) => {
                if (!isNative) { alert(`${title}\n\n${message}`); resolve(); return; }
                pendingCallbacks.msgBox = resolve;
                window.chrome.webview.postMessage(`msgBox:${title}|${message}|${type}`);
            });
        }
    },

    shell: {
        openExternal: (url) => {
            if (isNative) window.chrome.webview.postMessage(`openExternal:${url}`);
            else window.open(url, '_blank');
        }
    },

    discord: {
        setActivity: (data) => {
            if (isNative) {
                const details = data.details || "";
                const state = data.state || "";
                window.chrome.webview.postMessage(`discord:${state}|${details}`);
            } else {
                console.log("[Discord Mock] Activity:", data);
            }
        }
    },

    system: {
        getMemoryInfo: () => {
            return new Promise((resolve) => {
                if (!isNative) { resolve(0); return; }
                pendingCallbacks.getMemory = resolve;
                window.chrome.webview.postMessage("getMemory");
            });
        }
    },

    // --- NUEVA API DE ARCHIVOS GENÉRICA ---
    file: {
        /**
         * Crea una carpeta en AppData/Roaming/com.genesis.engine/
         * @param {string} path - Ruta relativa (ej: "screenshots" o "levels/custom")
         */
        createDirectory: (path) => {
            if (isNative) {
                window.chrome.webview.postMessage(`createDir:${path}`);
            } else {
                console.log(`[Web] Simulando creación de carpeta: ${path}`);
            }
        },

        /**
         * Guarda un archivo en AppData.
         * Detecta imágenes automáticamente si el contenido es Base64.
         * @param {string} path - Ruta relativa con extensión (ej: "config.json" o "screenshots/img.png")
         * @param {string} content - Contenido del archivo (Texto o Base64)
         */
        save: (path, content) => {
            if (isNative) {
                window.chrome.webview.postMessage(`saveFile:${path}|${content}`);
            } else {
                // En web intentamos descargar si es imagen o guardar en localStorage
                if (typeof content === 'string' && content.startsWith("data:")) {
                    const a = document.createElement("a");
                    a.href = content;
                    a.download = path.split('/').pop();
                    a.click();
                } else {
                    localStorage.setItem(`genesis_${path}`, content);
                }
            }
        },

        list: (path) => {
            return new Promise((resolve) => {
                if (!isNative) {
                    console.warn("[Genesis] file.list no soportado en Web.");
                    resolve([]);
                    return;
                }
                const pathKey = path.replace(/\\/g, '/');
                pendingCallbacks['list_' + pathKey] = resolve;
                window.chrome.webview.postMessage(`listDir:${path}`);
            });
        },

        load: (path) => {
            return new Promise((resolve) => {
                if (!isNative) {
                    const data = localStorage.getItem(`genesis_${path}`);
                    resolve(data);
                    return;
                }
                pendingCallbacks['load_' + path] = resolve;
                window.chrome.webview.postMessage(`loadFile:${path}`);
            });
        }
    },

    storage: {
        save: (key, data) => {
            const content = typeof data === 'object' ? JSON.stringify(data) : data;

            let finalName = key;
            const isImage = typeof content === 'string' && content.startsWith("data:image");

            if (isImage) {
                // Es imagen: Si el nombre no termina en .png/.jpg, le agregamos .png
                if (!/\.(png|jpg|jpeg|webp)$/i.test(finalName)) {
                    finalName += ".png";
                }
            } else {
                // Es JSON/Texto: Mantener comportamiento original (forzar .json)
                if (!finalName.endsWith(".json")) {
                    finalName += ".json";
                }
            }

            // Usamos la nueva API de archivos internamente
            Genesis.file.save(finalName, content);
        },
        load: (key) => {
            return Genesis.file.load(key).then(content => {
                if (!content) return null;
                try { return JSON.parse(content); } catch (e) { return content; }
            });
        }
    }
};

window.Genesis = Genesis;

const genesisStyle = `
    background: #e0f7fa; color: #006064; border: 1px solid #26c6da;
    padding: 6px 12px; border-radius: 20px; font-family: 'Segoe UI', sans-serif;
    font-weight: bold; font-size: 12px;
`;
const iconUrl = '../../../icons/icon.png';
const iconStyle = `
    background-image: url('${iconUrl}'); background-size: contain;
    background-repeat: no-repeat; background-position: center;
    padding: 10px 15px; border-radius: 5px;
`;

console.log(
    `%c   %c GENESIS ENGINE %c Env: ${Genesis.env} `,
    iconStyle, genesisStyle, "color: #888; font-size: 10px;"
);

export default Genesis;