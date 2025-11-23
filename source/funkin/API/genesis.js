/**
 * @fileoverview API Principal de Genesis Engine (Con Discord RPC Nativo)
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
    info: { version: "1.0.0", author: "ImBritex", id: "com.genesis.engine" },

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
        /**
         * Actualiza la presencia de Discord.
         * @param {object} data
         * @param {string} [data.details] Texto superior (ej: "Editando Nivel").
         * @param {string} [data.state] Texto inferior (ej: "Nivel: Tutorial").
         */
        setActivity: (data) => {
            if (isNative) {
                const details = data.details || "";
                const state = data.state || "";
                // Enviar mensaje al C++: "discord:Estado|Detalles"
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

    file: {
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
        }
    },

    storage: {
        save: (key, data) => {
            const content = typeof data === 'object' ? JSON.stringify(data) : data;
            if (isNative) window.chrome.webview.postMessage(`saveFile:${key}.json|${content}`);
            else localStorage.setItem(`genesis_${key}`, content);
        },
        load: (key) => {
            return new Promise((resolve) => {
                if (!isNative) {
                    const data = localStorage.getItem(`genesis_${key}`);
                    try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
                    return;
                }
                pendingCallbacks['load_' + key] = (content) => {
                    if (!content) resolve(null);
                    else {
                        try { resolve(JSON.parse(content)); } catch(e) { resolve(content); }
                    }
                };
                window.chrome.webview.postMessage(`loadFile:${key}`);
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
const iconUrl = 'https://app.genesis/icons/icon.ico';
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