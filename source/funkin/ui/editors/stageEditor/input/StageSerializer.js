import { IMAGE_ORIGIN } from "../../../../play/stage/StageElements.js";

/**
 * Recopila y formatea los datos de todos los elementos registrados.
 * Si se proporciona el panel de capas, respeta la jerarquía de carpetas.
 * @param {import('../objects/Elements.js').ElementSelector} elementsManager
 * @param {import('../objects/StageCharacters.js').StageCharacters} stageCharacters
 * @param {import('../EditorStageManager.js').EditorStageManager} stageManager
 * @param {import('../components/Layers.js').LayersPanel} [layersPanel] Referencia opcional al panel de capas
 * @returns {Array<object>}
 */
export function serializeStage(elementsManager, stageCharacters, stageManager, layersPanel) {
    // 1. Si tenemos el panel de capas, usamos la serialización recursiva (Carpetas/Grupos)
    if (layersPanel && layersPanel.rootNodes) {
        return serializeNodesRecursive(layersPanel.rootNodes, stageCharacters, stageManager);
    }

    // 2. FALLBACK: Serialización plana antigua
    const elements = elementsManager.registeredElements;
    const serializedElements = [];

    for (const el of elements) {
        const data = processSingleElement(el, stageCharacters, stageManager);
        if (data) {
            serializedElements.push(data);
        }
    }
    
    // Ordenar por capa (depth) en modo plano
    serializedElements.sort((a, b) => {
        const objA = a[Object.keys(a)[0]] || a;
        const objB = b[Object.keys(b)[0]] || b;
        return objA.layer - objB.layer;
    });

    return serializedElements;
}

/**
 * Recorre recursivamente los nodos del panel de capas para construir la estructura JSON.
 */
function serializeNodesRecursive(nodes, stageCharacters, stageManager) {
    const result = [];

    for (const node of nodes) {
        if (node.type === 'folder') {
            const groupChildren = serializeNodesRecursive(node.children, stageCharacters, stageManager);
            
            const groupData = {
                type: 'group',
                visible: true,
                children: groupChildren
            };

            result.push({
                [node.name]: groupData
            });

        } else {
            if (node.phaserElement && node.phaserElement.active) {
                const data = processSingleElement(node.phaserElement, stageCharacters, stageManager);
                if (data) {
                    result.push(data);
                }
            }
        }
    }

    return result;
}

/**
 * Procesa un único elemento de Phaser y devuelve su objeto serializado.
 */
function processSingleElement(el, stageCharacters, stageManager) {
    if (!el || !el.active) return null;

    // Validación de Seguridad
    if ((el.type === 'Sprite' || el.type === 'Image') && (!el.texture || el.texture.key === '__MISSING' || !el.frame)) {
        console.warn(`[Serializer] Omitiendo elemento corrupto:`, el);
        return null;
    }

    const charName = el.getData('characterName');
    
    // 1. Personajes de Prueba
    if (isTestCharacter(charName)) {
        const charKey = getCharKey(charName);
        if (charKey) {
            return serializeCharacter(el, charKey, stageCharacters);
        }
        return null;
    }

    // 2. Objetos Básicos
    if (el.type === 'Rectangle' || charName === 'BasicObject') {
        return serializeObject(el);
    }

    // 3. Imágenes
    if (el.type === 'Image') {
        return serializeImage(el, stageManager);
    }

    // 4. Spritesheets
    if (el.type === 'Sprite') {
        return serializeSpritesheet(el, stageManager);
    }
    
    console.warn("Elemento no reconocido durante el guardado:", el);
    return null;
}

/**
 * [NUEVO] Helper para asignar propiedades comunes (Scroll y Rotación).
 */
function applyCommonProperties(target, el) {
    const sx = parseFloat(el.scrollFactorX.toFixed(2));
    const sy = parseFloat(el.scrollFactorY.toFixed(2));
    
    // Scroll X/Y Split logic
    if (sx === sy) {
        target.scrollFactor = sx;
    } else {
        target.scroll_x = sx;
        target.scroll_y = sy;
    }
    
    // Rotación
    const angle = parseFloat((el.angle || 0).toFixed(2));
    if (angle !== 0) {
        target.angle = angle;
    }
}

/**
 * Serializa un personaje de prueba.
 */
function serializeCharacter(el, charKey, stageCharacters) {
    const offsets = stageCharacters.getCameraOffsets(charKey);
    const finalKey = (charKey === 'gfVersion') ? 'playergf' : charKey;
    const pos = getRelativePosition(el, { x: 0.5, y: 1.0 });

    const data = {
        type: "character",
        layer: el.depth,
        scale: parseFloat(el.scale.toFixed(2)),
        visible: el.visible,
        opacity: parseFloat(el.alpha.toFixed(2)),
        position: [pos.x, pos.y],
        camera_Offset: [offsets.x, offsets.y],
        flip_x: el.flipX,
        flip_y: el.flipY
    };
    
    applyCommonProperties(data, el);

    return { [finalKey]: data };
}

/**
 * Serializa un objeto (Rectángulo).
 */
function serializeObject(el) {
    const hexColor = '#' + ('000000' + el.fillColor.toString(16)).substr(-6).toUpperCase();
    const pos = getRelativePosition(el, { x: 0.5, y: 1.0 });

    const data = {
        type: "object",
        layer: el.depth,
        scale: parseFloat(el.scaleX.toFixed(2)),
        color: hexColor,
        visible: el.visible,
        opacity: parseFloat(el.fillAlpha.toFixed(2)),
        size: [Math.round(el.width), Math.round(el.height)],
        position: [pos.x, pos.y],
        flip_x: false, 
        flip_y: false
    };
    
    applyCommonProperties(data, el);
    
    return data;
}

/**
 * Serializa una imagen.
 */
function serializeImage(el, stageManager) {
    const namePath = getElementNamePath(el.texture.key, stageManager);
    const pos = getRelativePosition(el, IMAGE_ORIGIN); 
    
    const data = {
        type: "image",
        layer: el.depth,
        scale: parseFloat(el.scaleX.toFixed(2)),
        namePath: namePath,
        visible: el.visible,
        opacity: parseFloat(el.alpha.toFixed(2)),
        position: [pos.x, pos.y],
        flip_x: el.flipX,
        flip_y: el.flipY
    };
    
    applyCommonProperties(data, el);

    return data;
}

/**
 * Serializa un spritesheet.
 */
function serializeSpritesheet(el, stageManager) {
    const namePath = getElementNamePath(el.texture.key, stageManager);
    // Usamos el origen actual para calcular la posición visual correcta,
    // pero guardaremos 0,0 como origen en el JSON.
    const pos = getRelativePosition(el, { x: el.originX, y: el.originY });

    const anims = el.getData('animOffsets') || {};
    let playList = el.getData('animPlayList') || {}; 
    if (Array.isArray(playList)) {
        playList = Object.assign({}, playList);
    }
    
    const playMode = el.getData('animPlayMode') || 'None';
    const frameRate = el.getData('animFrameRate') || 24;
    const beat = el.getData('animBeat') || [1]; 
    
    const data = {
        type: "spritesheet",
        layer: el.depth,
        scale: parseFloat(el.scaleX.toFixed(2)),
        namePath: namePath,
        visible: el.visible,
        opacity: parseFloat(el.alpha.toFixed(2)),
        position: [pos.x, pos.y],
        origin: [0, 0], // [CAMBIO] Forzar origen 0,0 en el guardado
        flip_x: el.flipX,
        flip_y: el.flipY,
        animation: {
            play_list: playList,
            play_mode: playMode,
            frameRate: frameRate,
            offsets: anims,
            beat: beat 
        }
    };
    
    applyCommonProperties(data, el);

    return data;
}

/**
 * Limpia los prefijos de la clave de textura para obtener el 'namePath'.
 */
export function getElementNamePath(textureKey, stageManager) {
    if (textureKey.startsWith('custom_asset_')) {
        return textureKey.replace('custom_asset_', '');
    }
    if (textureKey.startsWith('custom_atlas_')) {
        return textureKey.replace('custom_atlas_', '');
    }
    if (stageManager?.currentStageName && textureKey.startsWith(`stage_${stageManager.currentStageName}_`)) {
        return textureKey.replace(`stage_${stageManager.currentStageName}_`, '');
    }
    
    if (textureKey.startsWith('stage_')) {
        const parts = textureKey.split('_');
        if (parts.length >= 3) {
            return parts.slice(2).join('_');
        }
    }
    
    return textureKey;
}

/** Helpers para identificar personajes */
export function isTestCharacter(characterName) {
    if (!characterName) return false;
    return characterName === 'Player (BF)' || 
           characterName === 'Opponent (Dad)' || 
           characterName === 'Girlfriend (GF)';
}

export function getCharKey(characterName) {
    if (!characterName) return null;
    if (characterName.includes('(BF)')) return 'player';
    if (characterName.includes('(Dad)')) return 'enemy';
    if (characterName.includes('(GF)')) return 'gfVersion';
    return null;
}

/** Calcula la posición relativa */
export function getRelativePosition(el, targetOrigin) {
    let dWidth = 0;
    let dHeight = 0;

    try {
        dWidth = el.displayWidth;
        dHeight = el.displayHeight;
    } catch (e) {
        console.warn("[Serializer] Error al leer dimensiones del elemento, usando fallback:", e);
        dWidth = el.width * el.scaleX;
        dHeight = el.height * el.scaleY;
    }

    const x = el.x - (dWidth * (el.originX - targetOrigin.x));
    const y = el.y - (dHeight * (el.originY - targetOrigin.y));
    return { x: Math.round(x), y: Math.round(y) };
}