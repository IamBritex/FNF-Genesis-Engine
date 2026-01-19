import { NoteDirection } from './NoteDirection.js';

export class Strumline {

    static DIRECTIONS = [NoteDirection.LEFT, NoteDirection.DOWN, NoteDirection.UP, NoteDirection.RIGHT];

    // Offsets por defecto (solo como fallback)
    static basePositionOffsetEnemy = { x: 30, y: 70 };
    static basePositionOffsetPlayer = { x: 780, y: 70 };

    /**
     * Crea las animaciones.
     * @param {Phaser.Scene} scene 
     * @param {string} textureKey - La clave dinámica (ej: noteStrumline_Funkin)
     */
    static createAnimations(scene, textureKey) {
        if (!scene.textures.exists(textureKey)) return;

        // Sufijo único basado en la textura para no mezclar animaciones de distintos skins
        const suffix = `_${textureKey}`; 

        Strumline.DIRECTIONS.forEach(direction => {
            const dirName = NoteDirection.getName(direction);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            
            // Intentamos generar frames. Si no existen con el nombre standard, Phaser devolverá array vacío.
            const pressAnimKey = `press_${dirName}${suffix}`;
            if (!scene.anims.exists(pressAnimKey)) {
                let pressFrames = scene.anims.generateFrameNames(textureKey, { prefix: `press${capDirName}`, start: 1, end: 4, zeroPad: 4 });
                // Fallback: intentar sin 'press' o con mayúsculas si es necesario, o simplemente no crear anim
                if (pressFrames.length > 0) {
                    scene.anims.create({ key: pressAnimKey, frames: pressFrames, frameRate: 24, repeat: 0 });
                }
            }
            
            const confirmAnimKey = `confirm_${dirName}${suffix}`;
            const confirmLoopAnimKey = `confirm-loop_${dirName}${suffix}`;

            if (!scene.anims.exists(confirmAnimKey)) {
                 let confirmFrames = scene.anims.generateFrameNames(textureKey, { prefix: `confirm${capDirName}`, start: 1, end: 4, zeroPad: 4 });
                 if (confirmFrames.length > 0) {
                     scene.anims.create({ key: confirmAnimKey, frames: confirmFrames, frameRate: 24, repeat: 0 }); 
                     scene.anims.create({ key: confirmLoopAnimKey, frames: confirmFrames, frameRate: 24, repeat: -1 }); 
                 }
            }
        });
    }

    /**
     * Crea una línea de strums.
     * @param {import('../NoteSkin.js').NoteSkin} noteSkin - Instancia de NoteSkin
     */
    static setupStrumlines(scene, noteSkin, isPlayer) {
        const skinData = noteSkin.getSkinData();
        const textureKey = noteSkin.getTextureKey('strumline');
        
        // Crear animaciones para este skin si no existen
        Strumline.createAnimations(scene, textureKey);

        const scale = skinData.scale || 0.7;          
        const separation = 170 * scale; 
        
        const baseX = isPlayer ? Strumline.basePositionOffsetPlayer.x : Strumline.basePositionOffsetEnemy.x;
        const baseY = isPlayer ? Strumline.basePositionOffsetPlayer.y : Strumline.basePositionOffsetEnemy.y;

        // Pasamos el noteSkin completo para leer offsets dentro de _createSingleStrumline
        return Strumline._createSingleStrumline(scene, baseX, baseY, scale, isPlayer, separation, noteSkin, textureKey);
    }

    static _createSingleStrumline(scene, baseX, baseY, scale, isPlayer, separation, noteSkin, textureKey) {
        const strumContainers = [];
        const offsets = noteSkin.getStrumOffsets(); // Leer del JSON
        const staticOffset = offsets.static || { x: 0, y: 0 };

        Strumline.DIRECTIONS.forEach((direction, index) => {
            const dirName = NoteDirection.getName(direction);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            
            // --- [CORRECCIÓN] Fallback de nombres de frames ---
            // Intenta buscar varios nombres comunes para la flecha estática
            const possibleFrames = [
                `static${capDirName}0001`,   // Standard Code
                `arrow${NoteDirection.getNameUpper(direction)}`, // Psych Engine / V-Slice
                `${dirName}0000`, // A veces solo la dirección
                `static arrow ${dirName}0000` // Kade Engine a veces
            ];

            let foundFrame = null;
            if (scene.textures.exists(textureKey)) {
                const tex = scene.textures.get(textureKey);
                foundFrame = possibleFrames.find(f => tex.has(f));
            }

            if (!foundFrame) {
                console.warn(`Strumline: No se encontró frame estático para ${dirName} en ${textureKey}. (Probados: ${possibleFrames.join(', ')})`);
                // Empujamos null para mantener el índice, pero NotesHandler debe filtrarlo
                strumContainers.push(null); 
                return;
            }

            const containerX = baseX + (index * separation); 
            const container = scene.add.container(containerX, baseY);
            container.setDepth(isPlayer ? 90 : 80); 
            container.noteDirection = direction; 
            
            // Guardar referencias en el contenedor para usarlas al animar
            container.skinTextureKey = textureKey; 
            container.skinOffsets = offsets; 

            // Aplicar offset estático del JSON
            const arrowSprite = scene.add.sprite(staticOffset.x, staticOffset.y, textureKey, foundFrame);
            arrowSprite.setScale(scale); 
            arrowSprite.setOrigin(0, 0); 
            
            container.add(arrowSprite); 
            strumContainers.push(container);
        });
        return strumContainers;
    }
    
    static playConfirmAnimation(strumContainers, direction, loop = false) {
        if (!strumContainers) return;
        const container = strumContainers[direction];
        if (!container) return; // Validación extra

        const arrowSprite = container.getAt(0);
        if (!arrowSprite || !arrowSprite.active) return;
        
        const textureKey = container.skinTextureKey;
        const offsets = container.skinOffsets;
        const confirmOffset = offsets.confirm || { x: -1, y: -48 };
        const staticOffset = offsets.static || { x: 0, y: -48 };

        const suffix = `_${textureKey}`;
        const dirName = NoteDirection.getName(direction);
        const animKey = loop ? `confirm-loop_${dirName}${suffix}` : `confirm_${dirName}${suffix}`;
        
        // Mover al offset de confirmación
        arrowSprite.setPosition(confirmOffset.x, confirmOffset.y);
        
        if (arrowSprite.scene.anims.exists(animKey)) {
            arrowSprite.play(animKey);
            if (!loop) {
                arrowSprite.once('animationcomplete', () => {
                    if (arrowSprite.active) { 
                        // Regresar al frame estático (usar el frame actual del sprite como referencia o buscar de nuevo)
                        // Para simplificar, asumimos que el primer frame de la textura es seguro o buscamos el static original
                        const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                        const staticFrame = `static${capDirName}0001`;
                         if (arrowSprite.scene.textures.get(textureKey).has(staticFrame)) {
                             arrowSprite.setFrame(staticFrame);
                         } else {
                             // Fallback: detener animación (vuelve al primer frame de la anim a veces, o se queda quieto)
                             arrowSprite.stop();
                         }
                        // Volver al offset estático
                        arrowSprite.setPosition(staticOffset.x, staticOffset.y);
                    }
                });
            }
        }
    }

    static playPressAnimation(strumContainers, direction) {
         if (!strumContainers) return;
         const container = strumContainers[direction]; 
         if (!container) return;

         const arrowSprite = container.getAt(0); 
         if (arrowSprite && arrowSprite.active) {
            const textureKey = container.skinTextureKey;
            const offsets = container.skinOffsets;
            const pressOffset = offsets.press || { x: 30, y: -18 };

            const suffix = `_${textureKey}`;
            const dirName = NoteDirection.getName(direction);
            const animKey = `press_${dirName}${suffix}`;

            // Mover al offset de presión
            arrowSprite.setPosition(pressOffset.x, pressOffset.y); 
            
            if (arrowSprite.scene.anims.exists(animKey)) {
                arrowSprite.play(animKey);
            } else {
                const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                // Fallback frame si no hay anim
                const pressFrame = `press${capDirName}0001`;
                if (arrowSprite.scene.textures.get(textureKey).has(pressFrame)) {
                    arrowSprite.setFrame(pressFrame); 
                }
            }
         }
    }

    static setStaticFrame(strumContainers, direction) {
         if (!strumContainers) return;
         const container = strumContainers[direction];
         if (!container) return;

         const arrowSprite = container.getAt(0);
         if (arrowSprite && arrowSprite.active) {
             const textureKey = container.skinTextureKey;
             const offsets = container.skinOffsets;
             const staticOffset = offsets.static || { x: 0, y: -48 };

             const dirName = NoteDirection.getName(direction);
             const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
             const staticFrame = `static${capDirName}0001`;
             
             arrowSprite.stop(); 
             if (arrowSprite.scene.textures.get(textureKey).has(staticFrame)) {
                 arrowSprite.setFrame(staticFrame);
             }
             
             // Volver al offset estático
             arrowSprite.setPosition(staticOffset.x, staticOffset.y); 
         }
    }
}