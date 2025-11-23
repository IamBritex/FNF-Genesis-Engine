// Importaciones para verificar si es Electron
// Constantes para el control de volumen
const VOLUME_SETTINGS = {
    DEFAULT: 0.5,
    MIN: 0.0,
    MAX: 1.0,
    STEP: 0.1
};

// Variables globales para el control de volumen
let globalVolume = (() => {
    const saved = localStorage.getItem('gameVolume');
    return saved !== null ? parseFloat(saved) : VOLUME_SETTINGS.DEFAULT;
})();

let previousVolume = (() => {
    const saved = localStorage.getItem('previousVolume');
    return saved !== null ? parseFloat(saved) : globalVolume;
})();

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

export function saveVolumeState() {
    try {
        localStorage.setItem('gameVolume', roundVolume(globalVolume).toString());
        localStorage.setItem('previousVolume', roundVolume(previousVolume).toString());
    } catch (error) {
        console.warn('Error saving volume state:', error);
    }
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
        }

        if (currentScene.showVolumeUI) {
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

// Obtener la tecla desde localStorage, si no existe usa el valor por defecto
function getVolumeControlKey(setting, fallback) {
    const key = localStorage.getItem(setting);
    return key ? key.toUpperCase() : fallback;
}

// Función para actualizar las keys desde localStorage o usar defaults
export function updateVolumeControlKeys() {
    keyMute = getVolumeControlKey('CONTROLS.VOLUME.MUTE', '0');
    keyVolDown = getVolumeControlKey('CONTROLS.VOLUME.VOLUME DOWN', '-');
    keyVolUp = getVolumeControlKey('CONTROLS.VOLUME.VOLUME UP', '+');
}

// Add these new functions
export function setGlobalVolume(value) {
    globalVolume = roundVolume(value);
}

export function setPreviousVolume(value) {
    previousVolume = roundVolume(value);
}

