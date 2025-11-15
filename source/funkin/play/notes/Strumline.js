import { NoteDirection } from './NoteDirection.js'; 

export class Strumline {

    static ATLAS_KEY = 'noteStrumline';
    static DIRECTIONS = [NoteDirection.LEFT, NoteDirection.DOWN, NoteDirection.UP, NoteDirection.RIGHT];

    // --- [NUEVO] ---
    // Define las posiciones base (x, y) para las strumlines.
    // Puedes (y debes) modificar estos valores desde tu PlayState
    // antes de llamar a setupStrumlines.
    static basePositionOffsetEnemy = { x: 30, y: 70 };
    static basePositionOffsetPlayer = { x: 780, y: 70 };
    // --- [FIN DEL CAMBIO] ---

    static OFFSETS = {
        static: { x: 0, y: -48 },
        press: { x: 30, y: -14 }, 
        confirm: { x: -1, y: -48 }
    };

    static preload(scene) {
        const skinName = 'Funkin'; 
        const basePath = `public/images/noteSkins/${skinName}/`;
        const texturePath = `${basePath}noteStrumline.png`;
        const atlasPath = `${basePath}noteStrumline.xml`;

        if (!scene.textures.exists(Strumline.ATLAS_KEY)) {
             scene.load.atlasXML(Strumline.ATLAS_KEY, texturePath, atlasPath);
             scene.load.once('complete', () => Strumline.createAnimations(scene));
        } else {
             Strumline.createAnimations(scene); 
        }
    }

    static createAnimations(scene) {
        if (!scene.textures.exists(Strumline.ATLAS_KEY)) return;
        Strumline.DIRECTIONS.forEach(direction => {
            const dirName = NoteDirection.getName(direction); 
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            const pressAnimKey = `press_${dirName}`;
            if (!scene.anims.exists(pressAnimKey)) {
                const pressFrames = scene.anims.generateFrameNames(Strumline.ATLAS_KEY, { prefix: `press${capDirName}`, start: 1, end: 4, zeroPad: 4 });
                if (pressFrames.length > 0) scene.anims.create({ key: pressAnimKey, frames: pressFrames, frameRate: 24, repeat: 0 });
            }
            const confirmAnimKey = `confirm_${dirName}`;
             if (!scene.anims.exists(confirmAnimKey)) {
                 const confirmFrames = scene.anims.generateFrameNames(Strumline.ATLAS_KEY, { prefix: `confirm${capDirName}`, start: 1, end: 4, zeroPad: 4 });
                 if (confirmFrames.length > 0) scene.anims.create({ key: confirmAnimKey, frames: confirmFrames, frameRate: 24, repeat: 0 }); 
                 const confirmLoopAnimKey = `confirm-loop_${dirName}`;
                 if (confirmFrames.length > 0) scene.anims.create({ key: confirmLoopAnimKey, frames: confirmFrames, frameRate: 24, repeat: -1 }); 
             }
        });
    }

    /**
     * [ACTUALIZADO] setupStrumlines
     * Ahora usa basePositionOffsetEnemy y basePositionOffsetPlayer
     * para las posiciones X e Y.
     */
    static setupStrumlines(scene) {
        const scale = 0.7;          
        const separation = 170 * scale; 
        
        // --- [ELIMINADO] ---
        // const playerY = scene.cameras.main.height * 0.15; 
        // const enemyY = scene.cameras.main.height * 0.15;  
        // const edgeOffset = 0;         
        // --- [FIN DEL CAMBIO] ---
        
        const numArrows = Strumline.DIRECTIONS.length;
        
        // (La lógica para calcular el ancho se mantiene por si la necesitas
        // para tus cálculos en PlayState, pero ya no se usa aquí
        // para la posición del jugador)
        let estimatedArrowWidth = 150 * scale; 
        const firstFrameName = `static${NoteDirection.getNameUpper(Strumline.DIRECTIONS[0])}0001`;
         if (scene.textures.exists(Strumline.ATLAS_KEY) && scene.textures.get(Strumline.ATLAS_KEY).has(firstFrameName)) {
             estimatedArrowWidth = scene.textures.get(Strumline.ATLAS_KEY).get(firstFrameName).width * scale;
         }
         const totalWidthApprox = (numArrows - 1) * separation + estimatedArrowWidth; 
        
        
        // --- [CAMBIO] ---
        // Usar las nuevas propiedades estáticas para X e Y
        const enemyBaseX = Strumline.basePositionOffsetEnemy.x;
        const enemyY = Strumline.basePositionOffsetEnemy.y;
        const playerBaseX = Strumline.basePositionOffsetPlayer.x;
        const playerY = Strumline.basePositionOffsetPlayer.y;
        // --- [FIN DEL CAMBIO] ---

        const enemyContainers = Strumline._createSingleStrumline(scene, enemyBaseX, enemyY, scale, false, separation);
        const playerContainers = Strumline._createSingleStrumline(scene, playerBaseX, playerY, scale, true, separation);
        return { player: playerContainers, enemy: enemyContainers };
    }

    /**
     * [ACTUALIZADO] _createSingleStrumline
     * Se cambia el origin a (0, 0) y se guarda el ancho escalado en el contenedor.
     */
    static _createSingleStrumline(scene, baseX, baseY, scale, isPlayer, separation) {
        const strumContainers = []; 
        Strumline.DIRECTIONS.forEach((direction, index) => {
            const dirName = NoteDirection.getName(direction);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            const frameName = `static${capDirName}0001`; 
            const containerX = baseX + (index * separation); 
            const container = scene.add.container(containerX, baseY);
            container.setDepth(isPlayer ? 90 : 80); 
            container.noteDirection = direction; 
            
            if (scene.textures.exists(Strumline.ATLAS_KEY) && scene.textures.get(Strumline.ATLAS_KEY).has(frameName)) {
                const arrowSprite = scene.add.sprite(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y, Strumline.ATLAS_KEY, frameName);
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
    
     static playConfirmAnimation(strumContainers, direction, loop = false) {
        const container = strumContainers[direction];
        const arrowSprite = container?.getAt(0);
        if (!arrowSprite || !arrowSprite.active) return;
        const dirName = NoteDirection.getName(direction);
        const animKey = loop ? `confirm-loop_${dirName}` : `confirm_${dirName}`;
        const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        const staticFrame = `static${capDirName}0001`;
        arrowSprite.setPosition(Strumline.OFFSETS.confirm.x, Strumline.OFFSETS.confirm.y);
        if (arrowSprite.scene.anims.exists(animKey)) {
            arrowSprite.play(animKey);
            if (!loop) {
                arrowSprite.once('animationcomplete', () => {
                    if (arrowSprite.active) { 
                         if (arrowSprite.scene.textures.get(Strumline.ATLAS_KEY).has(staticFrame)) arrowSprite.setFrame(staticFrame);
                        arrowSprite.setPosition(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y);
                    }
                });
            }
        } else {
             arrowSprite.setFrame(`confirm${capDirName}0001`);
             if (!loop) { 
                 arrowSprite.scene.time.delayedCall(100, () => { 
                     if (arrowSprite.active) {
                         if (arrowSprite.scene.textures.get(Strumline.ATLAS_KEY).has(staticFrame)) arrowSprite.setFrame(staticFrame);
                         arrowSprite.setPosition(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y);
                     }
                 });
             }
        }
    }

     static playPressAnimation(strumContainers, direction) {
         const container = strumContainers[direction]; 
         const arrowSprite = container?.getAt(0); 
         if (arrowSprite && arrowSprite.active) {
              const dirName = NoteDirection.getName(direction);
              const animKey = `press_${dirName}`;
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
             if (arrowSprite.scene.textures.get(Strumline.ATLAS_KEY).has(staticFrame)) arrowSprite.setFrame(staticFrame);
             arrowSprite.setPosition(Strumline.OFFSETS.static.x, Strumline.OFFSETS.static.y); 
         }
     }
}