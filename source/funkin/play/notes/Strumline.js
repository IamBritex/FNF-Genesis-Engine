import { NoteDirection } from './NoteDirection.js'; 

export class Strumline {

    static ATLAS_KEY = 'noteStrumline';
    static DIRECTIONS = [NoteDirection.LEFT, NoteDirection.DOWN, NoteDirection.UP, NoteDirection.RIGHT];

    static basePositionOffsetEnemy = { x: 30, y: 70 };
    static basePositionOffsetPlayer = { x: 780, y: 70 };

    static OFFSETS = {
        static: { x: 0, y: -48 },
        press: { x: 30, y: -18 }, 
        confirm: { x: -1, y: -48 }
    };

    // [MODIFICADO] Usa sessionId
    static preload(scene, sessionId) {
        const skinName = 'Funkin'; 
        const basePath = `public/images/noteSkins/${skinName}/`;
        const texturePath = `${basePath}noteStrumline.png`;
        const atlasPath = `${basePath}noteStrumline.xml`;

        const key = sessionId ? `${Strumline.ATLAS_KEY}_${sessionId}` : Strumline.ATLAS_KEY;

        if (!scene.textures.exists(key)) {
             scene.load.atlasXML(key, texturePath, atlasPath);
             // Pasar sessionId a createAnimations también
             scene.load.once('complete', () => Strumline.createAnimations(scene, sessionId));
        } else {
             Strumline.createAnimations(scene, sessionId); 
        }
    }

    // [MODIFICADO] Usa sessionId para crear animaciones únicas
    static createAnimations(scene, sessionId) {
        const key = sessionId ? `${Strumline.ATLAS_KEY}_${sessionId}` : Strumline.ATLAS_KEY;

        if (!scene.textures.exists(key)) return;

        Strumline.DIRECTIONS.forEach(direction => {
            const dirName = NoteDirection.getName(direction); 
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            
            // Claves de animación únicas también
            const suffix = sessionId ? `_${sessionId}` : '';
            const pressAnimKey = `press_${dirName}${suffix}`;
            
            if (!scene.anims.exists(pressAnimKey)) {
                const pressFrames = scene.anims.generateFrameNames(key, { prefix: `press${capDirName}`, start: 1, end: 4, zeroPad: 4 });
                if (pressFrames.length > 0) scene.anims.create({ key: pressAnimKey, frames: pressFrames, frameRate: 24, repeat: 0 });
            }
            
            const confirmAnimKey = `confirm_${dirName}${suffix}`;
            const confirmLoopAnimKey = `confirm-loop_${dirName}${suffix}`;

             if (!scene.anims.exists(confirmAnimKey)) {
                 const confirmFrames = scene.anims.generateFrameNames(key, { prefix: `confirm${capDirName}`, start: 1, end: 4, zeroPad: 4 });
                 if (confirmFrames.length > 0) {
                     scene.anims.create({ key: confirmAnimKey, frames: confirmFrames, frameRate: 24, repeat: 0 }); 
                     scene.anims.create({ key: confirmLoopAnimKey, frames: confirmFrames, frameRate: 24, repeat: -1 }); 
                 }
             }
        });
    }

    // [MODIFICADO] setupStrumlines recibe sessionId para pasarlo a _createSingleStrumline
    static setupStrumlines(scene, sessionId) {
        const scale = 0.7;          
        const separation = 170 * scale; 
        
        const numArrows = Strumline.DIRECTIONS.length;
        
        const enemyBaseX = Strumline.basePositionOffsetEnemy.x;
        const enemyY = Strumline.basePositionOffsetEnemy.y;
        const playerBaseX = Strumline.basePositionOffsetPlayer.x;
        const playerY = Strumline.basePositionOffsetPlayer.y;

        const enemyContainers = Strumline._createSingleStrumline(scene, enemyBaseX, enemyY, scale, false, separation, sessionId);
        const playerContainers = Strumline._createSingleStrumline(scene, playerBaseX, playerY, scale, true, separation, sessionId);
        return { player: playerContainers, enemy: enemyContainers };
    }

    // [MODIFICADO] _createSingleStrumline usa la clave única
    static _createSingleStrumline(scene, baseX, baseY, scale, isPlayer, separation, sessionId) {
        const strumContainers = []; 
        const key = sessionId ? `${Strumline.ATLAS_KEY}_${sessionId}` : Strumline.ATLAS_KEY;

        Strumline.DIRECTIONS.forEach((direction, index) => {
            const dirName = NoteDirection.getName(direction);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            const frameName = `static${capDirName}0001`; 
            const containerX = baseX + (index * separation); 
            const container = scene.add.container(containerX, baseY);
            container.setDepth(isPlayer ? 90 : 80); 
            container.noteDirection = direction; 
            
            // Guardar el sessionId en el contenedor para que las animaciones sepan qué sufijo usar
            container.sessionId = sessionId;

            if (scene.textures.exists(key) && scene.textures.get(key).has(frameName)) {
                const arrowSprite = scene.add.sprite(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y, key, frameName);
                arrowSprite.setScale(scale); 
                
                arrowSprite.setOrigin(0, 0); 
                
                container.width = arrowSprite.displayWidth; 
                
                container.add(arrowSprite); 
                strumContainers.push(container);
            } else {
                container.destroy(); 
                strumContainers.push(null); 
            }
        });
        return strumContainers;
    }
    
     // [MODIFICADO] Usa sessionId del contenedor para la anim key
     static playConfirmAnimation(strumContainers, direction, loop = false) {
        const container = strumContainers[direction];
        const arrowSprite = container?.getAt(0);
        if (!arrowSprite || !arrowSprite.active) return;
        
        const sessionId = container.sessionId; // Recuperar ID
        const suffix = sessionId ? `_${sessionId}` : '';

        const dirName = NoteDirection.getName(direction);
        const animKey = loop ? `confirm-loop_${dirName}${suffix}` : `confirm_${dirName}${suffix}`;
        const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        const staticFrame = `static${capDirName}0001`;
        
        arrowSprite.setPosition(Strumline.OFFSETS.confirm.x, Strumline.OFFSETS.confirm.y);
        if (arrowSprite.scene.anims.exists(animKey)) {
            arrowSprite.play(animKey);
            if (!loop) {
                arrowSprite.once('animationcomplete', () => {
                    if (arrowSprite.active) { 
                         // Usa textura del sprite actual (ya tiene el ID correcto)
                         if (arrowSprite.scene.textures.get(arrowSprite.texture.key).has(staticFrame)) arrowSprite.setFrame(staticFrame);
                        arrowSprite.setPosition(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y);
                    }
                });
            }
        } else {
             arrowSprite.setFrame(`confirm${capDirName}0001`);
             if (!loop) { 
                 arrowSprite.scene.time.delayedCall(100, () => { 
                     if (arrowSprite.active) {
                         if (arrowSprite.scene.textures.get(arrowSprite.texture.key).has(staticFrame)) arrowSprite.setFrame(staticFrame);
                         arrowSprite.setPosition(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y);
                     }
                 });
             }
        }
    }

     // [MODIFICADO] Usa sessionId del contenedor
     static playPressAnimation(strumContainers, direction) {
         const container = strumContainers[direction]; 
         const arrowSprite = container?.getAt(0); 
         if (arrowSprite && arrowSprite.active) {
              const sessionId = container.sessionId;
              const suffix = sessionId ? `_${sessionId}` : '';

              const dirName = NoteDirection.getName(direction);
              const animKey = `press_${dirName}${suffix}`;
              arrowSprite.setPosition(Strumline.OFFSETS.press.x, Strumline.OFFSETS.press.y); 
              if (arrowSprite.scene.anims.exists(animKey)) {
                  arrowSprite.play(animKey);
              } else {
                   const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                   arrowSprite.setFrame(`press${capDirName}0001`); 
              }
         }
     }

     static setStaticFrame(strumContainers, direction) {
         const container = strumContainers[direction];
         const arrowSprite = container?.getAt(0);
         if (arrowSprite && arrowSprite.active) {
             const dirName = NoteDirection.getName(direction);
             const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
             const staticFrame = `static${capDirName}0001`;
             arrowSprite.stop(); 
             if (arrowSprite.scene.textures.get(arrowSprite.texture.key).has(staticFrame)) arrowSprite.setFrame(staticFrame);
             arrowSprite.setPosition(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y); 
         }
     }
}