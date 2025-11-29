/**
 * Gestiona todos los atajos de teclado y entradas de ratón (paneo, zoom) del editor.
 */

/**
 * Almacena el mapa de atajos cargado.
 * @type {Map<string, string>}
 */
let keyActionMap = new Map();
let sceneInstance = null; // Guardamos la instancia de la escena

/**
 * Construye el mapa de atajos (ej. "Ctrl+z" -> "UNDO")
 */
function buildKeyActionMap(keymap) {
    keyActionMap.clear();
    for (const [action, binding] of Object.entries(keymap)) {
        const keyString = formatKeyString(binding);
        keyActionMap.set(keyString, action);
    }
    console.log("Mapa de atajos construido:", keyActionMap);
}

/**
 * Formatea un atajo a un string identificador único.
 */
function formatKeyString(binding) {
    let parts = [];
    if (binding.ctrl) parts.push('ctrl');
    if (binding.alt) parts.push('alt');
    if (binding.shift) parts.push('shift');
    parts.push(binding.key.toLowerCase());
    return parts.sort().join('+');
}

/**
 * Inicializa los listeners de entrada del ratón (paneo y zoom con rueda).
 */
export function initMouseInputs(scene) {
    // Lógica de Paneo (Click central)
    scene.input.on('pointerdown', (pointer) => {
        if (pointer.middleButtonDown()) {
            scene.panStart.set(pointer.x, pointer.y);
        }
    });
    
    scene.input.on('pointermove', (pointer) => {
        if (scene.isTestMode) return;
        
        if (pointer.middleButtonDown() && !scene.elementsManager.isDragging) {
            const dx = pointer.x - scene.panStart.x;
            const dy = pointer.y - scene.panStart.y;
            scene.baseScrollX -= dx / scene.gameCam.zoom;
            scene.baseScrollY -= dy / scene.gameCam.zoom;
            scene.panStart.set(pointer.x, pointer.y);
        }
    });
    
    // Lógica de Zoom (Rueda del ratón - Alternativa a Q/E)
    scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (scene.isTestMode) return;
        pointer.event.preventDefault(); 
        const zoomAmount = deltaY < 0 ? 0.05 : -0.05;
        scene.baseZoom = Phaser.Math.Clamp(scene.baseZoom + zoomAmount, 0.1, 4.0);
    });
}

/**
 * Inicializa los listeners de entrada del teclado (atajos).
 */
export function initKeyInputs(scene) {
    sceneInstance = scene;
    
    // Cargar el mapa de atajos inicial
    buildKeyActionMap(scene.preferencesManager.getKeymap());

    // Escuchar el evento para recargar los atajos si cambian
    scene.events.on('keybindingsUpdated', () => {
        console.log("Recargando atajos de teclado...");
        buildKeyActionMap(scene.preferencesManager.getKeymap());
    }, this);
    
    // Listener principal de atajos
    scene.input.keyboard.on('keydown', (event) => {
        // No ejecutar atajos si estamos escribiendo en un input
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
            return; 
        }

        // Crear el string del atajo presionado
        const pressedKeyString = formatKeyString({
            key: event.key,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey
        });

        // Buscar la acción en el mapa
        const action = keyActionMap.get(pressedKeyString);
        
        // Bloquear guardado del navegador por defecto (Ctrl+S) si está asignado
        if (event.ctrlKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
        }

        if (action) {
            // Prevenir comportamientos por defecto del navegador para nuestros atajos
            event.preventDefault();
            event.stopPropagation();
            executeAction(action);
        }
    });
}

/**
 * Ejecuta una acción basada en el atajo presionado.
 */
function executeAction(action) {
    if (!sceneInstance) return;
    const scene = sceneInstance;

    switch (action) {
        // --- Edición ---
        case 'UNDO':
            if (scene.actionHistory) scene.actionHistory.undo();
            break;
        case 'REDO':
            if (scene.actionHistory) scene.actionHistory.redo();
            break;
        case 'COPY':
            if (scene.clipboard) scene.clipboard.copySelectedElement();
            break;
        case 'PASTE':
            if (scene.clipboard) scene.clipboard.pasteFromClipboard();
            break;
        case 'DUPLICATE':
            if (scene.clipboard) scene.clipboard.duplicateSelectedElement();
            break;
        case 'DELETE':
        case 'DELETE_ALT':
            if (scene.elementsManager) scene.elementsManager.deleteSelectedElement();
            break;
        case 'FIND':
            if (scene.editorMethods) scene.editorMethods.openFindWindow();
            break;
            
        // --- Modos ---
        case 'TEST_MODE':
            // Corrección: Usar testManager
            if (scene.testManager) scene.testManager.toggle();
            break;
            
        // --- Sistema ---
        case 'SAVE':
            if (scene.saveManager) scene.saveManager.save();
            break;
        case 'EXIT':
            if (scene.elementsManager && scene.elementsManager.selectedElement) {
                scene.elementsManager.clearSelection();
            } else {
                exitEditor(scene);
            }
            break;
            
        // --- Zoom (Delegado a CameraEditor en update, pero aquí podemos hacer steps) ---
        // Nota: El zoom fluido Q/E se maneja mejor en CameraEditor.update() leyendo las teclas.
        // Aquí solo manejamos acciones "discretas" (one-shot). 
        // Si prefieres zoom por pasos, descomenta esto:
        /*
        case 'ZOOM_IN':
            scene.baseZoom = Phaser.Math.Clamp(scene.baseZoom + 0.1, 0.1, 4.0);
            break;
        case 'ZOOM_OUT':
            scene.baseZoom = Phaser.Math.Clamp(scene.baseZoom - 0.1, 0.1, 4.0);
            break;
        */
    }
}

/**
 * Cierra la escena del editor.
 */
export function exitEditor(scene) {
    // Aquí puedes agregar un cuadro de confirmación si hay cambios sin guardar
    scene.scene.start('MainMenuScene');
}