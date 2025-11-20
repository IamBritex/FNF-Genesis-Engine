// --- Lógica de Electron ---
let isElectron = !!window.process && !!window.process.type;
let shell;

if (isElectron) {
    try {
        // Usamos '@electron/remote' para el shell
        shell = require('@electron/remote').shell;
    } catch (e) {
        console.error("Error al cargar 'shell' de Electron:", e);
        isElectron = false;
    }
}
// --- Fin de la lógica de Electron ---

/**
 * Abre un enlace en el navegador por defecto del usuario (Electron)
 * o en una nueva pestaña (Web).
 * @param {string} url La URL a abrir.
 */
export function openExternalLink(url) {
    if (isElectron && shell) {
        shell.openExternal(url);
    } else {
        window.open(url, '_blank');
    }
}