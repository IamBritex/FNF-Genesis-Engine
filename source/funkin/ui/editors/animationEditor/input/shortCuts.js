/**
 * editors/animationEditor/input/shortCuts.js
 * Maneja la entrada de teclado global basada en las preferencias.
 */

let keyActionMap = new Map();
let sceneInstance = null;

function buildKeyActionMap(keymap) {
    keyActionMap.clear();
    for (const [action, binding] of Object.entries(keymap)) {
        const keyString = formatKeyString(binding);
        keyActionMap.set(keyString, action);
    }
}

function formatKeyString(binding) {
    let parts = [];
    if (binding.ctrl) parts.push('ctrl');
    if (binding.alt) parts.push('alt');
    if (binding.shift) parts.push('shift');
    // Normalizar teclas especiales
    let key = binding.key.toLowerCase();
    if (key === 'control') key = 'ctrl'; 
    parts.push(key);
    return parts.sort().join('+');
}

export function initKeyInputs(scene) {
    sceneInstance = scene;
    
    // 1. Construir mapa inicial
    if (scene.preferencesManager) {
        buildKeyActionMap(scene.preferencesManager.getKeymap());
    }

    // 2. Escuchar cambios en la configuración
    scene.events.on('keybindingsUpdated', () => {
        if (scene.preferencesManager) {
            buildKeyActionMap(scene.preferencesManager.getKeymap());
        }
    }, this);
    
    // 3. Listener Global
    scene.input.keyboard.on('keydown', (event) => {
        // Ignorar si escribimos en un input HTML
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

        const pressedKeyString = formatKeyString({
            key: event.key,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey
        });

        const action = keyActionMap.get(pressedKeyString);
        
        // Bloquear guardado del navegador
        if (event.ctrlKey && event.key.toLowerCase() === 's') event.preventDefault();

        if (action) {
            event.preventDefault(); // Evitar scroll o acciones del navegador
            executeAction(action);
        }
    });
}

function executeAction(action) {
    const scene = sceneInstance;
    if (!scene) return;

    // Delegamos acciones a los módulos correspondientes
    switch (action) {
        case 'UNDO':
            if (scene.history) scene.history.undo();
            break;
        case 'REDO':
            if (scene.history) scene.history.redo();
            break;
        case 'SAVE':
            if (scene.saveModule) scene.saveModule.save();
            break;
        case 'SAVE_ZIP':
            if (scene.saveZipModule) scene.saveZipModule.save();
            break;
        case 'EXIT':
            scene.scene.start('MainMenuState');
            break;
            
        // --- Acciones de CharacterPreview ---
        case 'PLAY_ANIM':
            if (scene.characterPreview) scene.characterPreview.replayCurrentAnim();
            break;
        case 'PREV_ANIM':
            // Lógica para anterior (Implementar en CharacterPreview o aquí)
            cycleAnimation(scene, -1);
            break;
        case 'NEXT_ANIM':
            cycleAnimation(scene, 1);
            break;
            
        // --- Sing Test ---
        case 'SING_UP': playSing(scene, 'singUP'); break;
        case 'SING_DOWN': playSing(scene, 'singDOWN'); break;
        case 'SING_LEFT': playSing(scene, 'singLEFT'); break;
        case 'SING_RIGHT': playSing(scene, 'singRIGHT'); break;
    }
}

function playSing(scene, anim) {
    if (scene.characterPreview) scene.characterPreview.playAnimation(anim);
}

function cycleAnimation(scene, dir) {
    if (!scene.currentJsonData || !scene.currentJsonData.animations) return;
    const anims = scene.currentJsonData.animations;
    if (anims.length === 0) return;
    
    let currentIdx = 0;
    if (scene.currentCharacter && scene.currentCharacter.anims.currentAnim) {
        const key = scene.currentCharacter.anims.currentAnim.key;
        currentIdx = anims.findIndex(a => key.endsWith(`_${a.anim}`));
        if (currentIdx === -1) currentIdx = 0;
    }
    
    let nextIdx = (currentIdx + dir + anims.length) % anims.length;
    if (scene.characterPreview) {
        scene.characterPreview.playAnimation(anims[nextIdx].anim);
    }
}