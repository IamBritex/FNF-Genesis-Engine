/**
 * Utilidades para serializar y deserializar elementos del editor.
 * Esto es para el estado interno del editor (Copiar/Pegar, Deshacer/Rehacer),
 * NO para guardar en archivos .json (esa es la lógica de Save.js).
 */

/**
 * Serializa un elemento a un objeto de datos simple.
 * @param {Phaser.GameObjects.GameObject} element 
 * @returns {object} Un objeto con los datos del elemento.
 */
export function serializeElement(element) {
    const data = element.data ? element.data.getAll() : {};
    
    const serialized = {
        type: element.type,
        x: element.x,
        y: element.y,
        depth: element.depth,
        scale: { x: element.scaleX, y: element.scaleY },
        origin: { x: element.originX, y: element.originY },
        visible: element.visible,
        alpha: element.alpha,
        scrollFactor: { x: element.scrollFactorX, y: element.scrollFactorY },
        data: data
    };

    if (element.texture) {
        serialized.textureKey = element.texture.key;
        serialized.flipX = element.flipX;
        serialized.flipY = element.flipY;
        serialized.currentFrame = element.frame?.name;
    }
    
    if (element.type === 'Rectangle') {
        serialized.width = element.width;
        serialized.height = element.height;
        serialized.fillColor = element.fillColor;
        serialized.fillAlpha = element.fillAlpha;
        serialized.flipY = element.flipY;
    }

    return serialized;
}

/**
 * Re-crea un elemento a partir de sus datos serializados.
 * @param {import('../StageEditor.js').StageEditor} scene La escena principal.
 * @param {object} data Los datos serializados por `serializeElement`.
 * @returns {Phaser.GameObjects.GameObject} El nuevo elemento creado.
 */
export function createFromData(scene, data) {
    console.log(`[Serializer] Re-creando elemento: ${data.data.characterName || data.type}`);
    
    let newElement;

    // 1. Crear el objeto
    if (data.type === 'Sprite') {
        const frames = scene.textures.get(data.textureKey).getFrameNames();
        const animGroups = groupFramesByAnimation(frames);
        const firstAnimName = Object.keys(animGroups)[0];
        const firstFrame = firstAnimName ? animGroups[firstAnimName].sort()[0] : data.currentFrame;
        
        newElement = scene.add.sprite(data.x, data.y, data.textureKey, firstFrame);
        
        setupSpriteAnimations(scene, newElement, data.data.animFrameRate || 24);
        
    } else if (data.type === 'Image') {
        newElement = scene.add.image(data.x, data.y, data.textureKey);
    } else if (data.type === 'Rectangle') {
        newElement = scene.add.rectangle(data.x, data.y, data.width, data.height, data.fillColor, data.fillAlpha);
    } else {
        console.warn(`Tipo de elemento desconocido: ${data.type}`);
        return null;
    }

    // 2. Restaurar todas las propiedades
    newElement.setOrigin(data.origin.x, data.origin.y);
    newElement.setScale(data.scale.x, data.scale.y);
    newElement.setVisible(data.visible);
    newElement.setAlpha(data.alpha || 1);
    newElement.setScrollFactor(data.scrollFactor.x, data.scrollFactor.y);
    newElement.setDepth(data.depth);

    if (newElement.setFlipX) {
        newElement.setFlipX(data.flipX);
    }
    if (newElement.setFlipY) {
        newElement.setFlipY(data.flipY);
    }
    
    if (data.type === 'Rectangle') {
        newElement.setFillStyle(data.fillColor, data.fillAlpha);
    }

    // 3. Restaurar todos los datos (como 'characterName', 'animPlayMode', etc.)
    if (data.data) {
        for (const [key, value] of Object.entries(data.data)) {
            newElement.setData(key, value);
        }
    }
    
    // 4. Re-registrarlo en los sistemas del editor
    scene.cameraManager.assignToGame(newElement);
    scene.elementsManager.registerElement(newElement);
    
    // 5. Seleccionarlo
    scene.elementsManager.setSelected(newElement);

    // 6. Refrescar el panel de capas
    if (scene.layersPanel) {
        scene.layersPanel.refreshList();
    }
    
    // 7. Reordenar capas
    if (scene.reassignAllDepths) {
        scene.reassignAllDepths();
    }

    return newElement;
}

/**
 * Agrupa los nombres de los frames por prefijo de animación.
 * @param {string[]} frames - Array con todos los nombres de los frames.
 * @returns {object} - Objeto con las animaciones agrupadas.
 */
function groupFramesByAnimation(frames) {
    const animationGroups = {};
    frames.forEach((frame) => {
        if (frame === '__BASE') return;
        const baseAnimName = frame.replace(/\d+$/, "");
        if (!animationGroups[baseAnimName]) {
            animationGroups[baseAnimName] = [];
        }
        animationGroups[baseAnimName].push(frame);
    });
    return animationGroups;
}

/**
 * Crea las animaciones para un sprite (sin reproducirlas).
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {number} fps
 */
function setupSpriteAnimations(scene, sprite, fps) {
    const textureKey = sprite.texture.key;
    const frames = scene.textures.get(textureKey).getFrameNames();
    const animationGroups = groupFramesByAnimation(frames);

    Object.entries(animationGroups).forEach(([animName, animFrames]) => {
        const animKey = `${textureKey}_${animName}`;
        if (scene.anims.exists(animKey)) return;

        scene.anims.create({
            key: animKey,
            frames: animFrames.sort().map((frame) => ({ key: textureKey, frame })),
            frameRate: fps,
            // --- INICIO DE LA CORRECCIÓN ---
            repeat: 0, // Las animaciones por defecto NO se repiten
            // --- FIN DE LA CORRECCIÓN ---
        });
    });
}