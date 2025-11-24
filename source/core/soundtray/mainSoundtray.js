// core/soundtray/mainSoundtray.js
// Importaciones para verificar si es Electron
// Constantes para el control de volumen
const VOLUME_SETTINGS = {
    DEFAULT: 0.5,
    MIN: 0.0,
    MAX: 1.0,
    STEP: 0.1
};

// Variables globales para el control de volumen (usan el valor por defecto, no localStorage)
let globalVolume = VOLUME_SETTINGS.DEFAULT;

let previousVolume = VOLUME_SETTINGS.DEFAULT;

let volumeUI = null;
let currentScene = null;
let volumeSounds = null;
let keyMute = null;
let keyVolDown = null;
let keyVolUp = null;

export { globalVolume, previousVolume, VOLUME_SETTINGS, volumeSounds, keyMute, keyVolDown, keyVolUp };


// Funcion para redondear el volumen a un decimal
export function roundVolume(value) {
    return Math.round(value * 10) / 10;
}

// Función vacía: No guarda el estado del volumen
export function saveVolumeState() {
    return;
}

export function updateVolumeUI() {
    if (!volumeUI || !currentScene) return;

    const barLevel = Math.ceil(globalVolume * 10);

    try {
        if (barLevel > 0) {
            volumeUI.bar.setTexture(`volumeBar${barLevel}`);
            volumeUI.bar.setVisible(true);
        } else {
            volumeUI.bar.setVisible(false);
            // Requerimiento: Si el volumen es 0, forzar que la UI se muestre (no se oculte automáticamente)
            if (currentScene.showVolumeUI) {
                currentScene.showVolumeUI(true); // Pasar 'true' para indicar que no queremos que se oculte
            }
        }

        if (currentScene.showVolumeUI && barLevel > 0) {
            currentScene.showVolumeUI();
        }
    } catch (error) {
        console.warn('Error updating volume UI:', error);
    }
}

// Añadir funciones para setear la UI y la escena
export function setVolumeUI(ui) {
    volumeUI = ui;
}

export function setCurrentScene(scene) {
    currentScene = scene;
}

export function setVolumeSounds(sounds) {
    volumeSounds = sounds;
}

// Función para obtener la tecla por defecto (no usa localStorage)
function getVolumeControlKey(fallback) {
    return fallback;
}

// Función para actualizar las keys usando defaults fijos
export function updateVolumeControlKeys() {
    keyMute = getVolumeControlKey('0');
    keyVolDown = getVolumeControlKey('-');
    keyVolUp = getVolumeControlKey('+');
}

// Add these new functions
export function setGlobalVolume(value) {
    globalVolume = roundVolume(value);
}

export function setPreviousVolume(value) {
    previousVolume = roundVolume(value);
}