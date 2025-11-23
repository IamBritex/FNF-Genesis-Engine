import { NoteDirection } from './NoteDirection.js';

export class SustainNote {

    static ATLAS_KEY = 'NOTE_hold_assets';
    static PIECE_HEIGHT = 44; 
    static PIECE_OVERLAP = -40; 

    static preload(scene) {
        const skinName = 'Funkin'; 
        const basePath = `public/images/noteSkins/${skinName}/`;
        const texturePath = `${basePath}NOTE_hold_assets.png`;
        const atlasPath = `${basePath}NOTE_hold_assets.xml`;

        if (!scene.textures.exists(SustainNote.ATLAS_KEY)) {
            scene.load.atlasXML(SustainNote.ATLAS_KEY, texturePath, atlasPath);
        }
    }

    static spawnHoldSprites(scene, noteData, noteScale, noteSprite, scrollSpeedValue) {
        if (!noteData.isHoldNote || noteData.sustainLength <= 0 || !noteSprite) {
            return null;
        }

        const direction = noteData.noteDirection;
        const colorName = NoteDirection.getColorName(direction); 
        const sustainDurationMs = noteData.sustainLength;
        
        const visualLength = sustainDurationMs * scrollSpeedValue;
        const pieceHeightScaled = SustainNote.PIECE_HEIGHT * noteScale;
        const effectivePieceHeight = pieceHeightScaled + (SustainNote.PIECE_OVERLAP * noteScale);
        const numPieces = Math.max(1, Math.ceil(visualLength / effectivePieceHeight));

        // [CAMBIO] 1. Crear un contenedor
        const holdContainer = scene.add.container(noteSprite.x, noteSprite.y);
        if (!holdContainer) return null;

        holdContainer.setActive(true).setVisible(true);
        holdContainer.setDepth(noteSprite.depth - 1); 
        holdContainer.noteData = noteData; 
        holdContainer.holdSprites = []; // Reiniciar array de sprites

        const downScroll = false;
        const pieceDirection = downScroll ? -1 : 1;
        const originY = downScroll ? 1 : 0; 
        const startY = 0; 

        const pieceFrame = `${colorName} hold piece0000`;
        if (scene.textures.get(SustainNote.ATLAS_KEY).has(pieceFrame)) {
            for (let i = 0; i < numPieces; i++) {
                const segmentY = startY + (i * effectivePieceHeight * pieceDirection);
                
                // [CAMBIO] 3. Crear una pieza
                const holdPiece = scene.add.sprite(0, segmentY, SustainNote.ATLAS_KEY, pieceFrame);
                
                // Configurar la pieza creada
                holdPiece.setOrigin(0.5, originY); 
                holdPiece.setScale(noteScale);
                holdContainer.add(holdPiece);
                holdContainer.holdSprites.push(holdPiece);
                
            }
        } else {
            console.error(`SustainNote: Frame de pieza no encontrado: ${pieceFrame}`);
            // [CAMBIO] Usar destroy()
            holdContainer.destroy();
            return null;
        }

        const endFrame = `${colorName} hold end0000`;
        if (scene.textures.get(SustainNote.ATLAS_KEY).has(endFrame)) {
            const endY = startY + (numPieces * effectivePieceHeight * pieceDirection);

            // [CAMBIO] 4. Crear la pieza final
            const holdEnd = scene.add.sprite(0, endY, SustainNote.ATLAS_KEY, endFrame);

            // Configurar la pieza final
            holdEnd.setOrigin(0.5, originY);
            holdEnd.setScale(noteScale);
            if (downScroll) holdEnd.flipY = true;
            holdContainer.add(holdEnd);
            holdContainer.holdSprites.push(holdEnd); 
            
        } else {
            console.error(`SustainNote: Frame final no encontrado: ${endFrame}`);
        }
        
        noteData.holdPieceHeight = pieceHeightScaled; 
        noteData.holdPieceCount = holdContainer.holdSprites.length; 
        
        return holdContainer;
    }
}