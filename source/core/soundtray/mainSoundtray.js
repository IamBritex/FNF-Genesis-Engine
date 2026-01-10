// core/soundtray/mainSoundtray.js

const VOLUME_SETTINGS = {
    DEFAULT: 0.5,
    MIN: 0.0,
    MAX: 1.0,
    STEP: 0.1
};

// Función auxiliar para cargar el volumen inicial desde localStorage
function getInitialVolume() {
    try {
        const prefsStr = localStorage.getItem('genesis_preferences');
        if (prefsStr) {
            const prefs = JSON.parse(prefsStr);
            if (prefs && typeof prefs['opt-vol-master'] === 'number') {
                let vol = Math.max(0, Math.min(100, prefs['opt-vol-master']));
                return vol / 100;
            }
        }
    } catch (e) {
        console.warn("Error leyendo genesis_preferences:", e);
    }
    return 0.6; // Valor por defecto 60%
}

let globalVolume = getInitialVolume();
let previousVolume = globalVolume;

let volumeUI = null;
let currentScene = null;
let volumeSounds = null;
let keyMute = null;
let keyVolDown = null;
let keyVolUp = null;
let fadeInterval = null;

export { globalVolume, previousVolume, VOLUME_SETTINGS, volumeSounds, keyMute, keyVolDown, keyVolUp };

export function roundVolume(value) {
    return Math.round(value * 10) / 10;
}

export function saveVolumeState() {
    try {
        const prefsStr = localStorage.getItem('genesis_preferences');
        let prefs = {};
        
        if (prefsStr) {
            try {
                prefs = JSON.parse(prefsStr);
            } catch (e) {
                console.warn("Error parseando preferencias existentes, se creará un objeto nuevo.");
            }
        }

        prefs['opt-vol-master'] = Math.round(globalVolume * 100);
        localStorage.setItem('genesis_preferences', JSON.stringify(prefs));
    } catch (e) {
        console.warn('Error guardando el estado del volumen:', e);
    }
}

export function updateVolumeUI() {
    if (!volumeUI || !currentScene) return;
    // Verificamos que los sprites existan y tengan escena (no destruidos)
    if (!volumeUI.bar || !volumeUI.bar.scene) return;

    const barLevel = Math.ceil(globalVolume * 10);

    try {
        if (barLevel > 0) {
            volumeUI.bar.setTexture(`volumeBar${barLevel}`);
            volumeUI.bar.setVisible(true);
        } else {
            volumeUI.bar.setVisible(false);
            if (currentScene.showVolumeUI) {
                currentScene.showVolumeUI(true);
            }
        }

        if (currentScene.showVolumeUI && barLevel > 0) {
            currentScene.showVolumeUI();
        }
    } catch (error) {
        console.warn('Error updating volume UI:', error);
    }
}

export function setVolumeUI(ui) {
    volumeUI = ui;
}

export function setCurrentScene(scene) {
    currentScene = scene;
}

export function setVolumeSounds(sounds) {
    volumeSounds = sounds;
}

export function cleanupVolumeControl() {
    volumeUI = null;
    currentScene = null;
    volumeSounds = null;
    if (fadeInterval) clearInterval(fadeInterval);
}

function getVolumeControlKey(fallback) {
    return fallback;
}

export function updateVolumeControlKeys() {
    keyMute = getVolumeControlKey('0');
    keyVolDown = getVolumeControlKey('-');
    keyVolUp = getVolumeControlKey('+');
}

export function setGlobalVolume(value) {
    globalVolume = roundVolume(value);
}

export function setPreviousVolume(value) {
    previousVolume = roundVolume(value);
}

/**
 * Detiene cualquier Fade en proceso.
 * Útil cuando el usuario controla el volumen manualmente.
 */
export function stopFade() {
    if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
    }
}

export function startFadeOut() {
    stopFade(); // Limpiar anterior si existe
    if (!game || !game.sound) return;

    const startVol = game.sound.volume;
    const duration = 500; 
    const stepTime = 50;  
    const steps = duration / stepTime;
    const volStep = startVol / steps;

    fadeInterval = setInterval(() => {
        if (!game || !game.sound) {
            stopFade();
            return;
        }

        const newVol = Math.max(0, game.sound.volume - volStep);
        game.sound.volume = newVol;

        if (newVol <= 0) {
            game.sound.volume = 0;
            stopFade();
        }
    }, stepTime);
}

export function startFadeIn() {
    stopFade(); // Limpiar anterior si existe
    if (!game || !game.sound) return;

    const targetVol = globalVolume;
    const duration = 500;
    const stepTime = 50;
    const steps = duration / stepTime;
    const volStep = (targetVol > 0 ? targetVol : 0.5) / steps; 

    fadeInterval = setInterval(() => {
        if (!game || !game.sound) {
            stopFade();
            return;
        }

        if (targetVol === 0) {
             game.sound.volume = 0;
             stopFade();
             return;
        }

        const newVol = Math.min(targetVol, game.sound.volume + volStep);
        game.sound.volume = newVol;

        if (newVol >= targetVol) {
            game.sound.volume = targetVol;
            stopFade();
        }
    }, stepTime);
}