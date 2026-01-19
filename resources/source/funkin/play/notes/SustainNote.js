import { NoteDirection } from './NoteDirection.js';

export class SustainNote {

    /**
     * @param {import('../NoteSkin.js').NoteSkin} noteSkin
     */
    static spawnHoldSprites(scene, noteData, noteSkin, noteSprite, scrollSpeedValue) {
        if (!noteData.isHoldNote || noteData.sustainLength <= 0 || !noteSprite) return null;

        const skinData = noteSkin.getSkinData();
        const textureKey = noteSkin.getTextureKey('sustain'); // ej: NOTE_hold_assets_Funkin
        const scale = skinData.scale || 0.7;

        // Leer configuración de sustain del JSON
        const sustainConfig = skinData.sustain || {};
        const baseHeight = sustainConfig.pieceHeight || 44;
        const baseOverlap = sustainConfig.pieceOverlap || -40;

        const direction = noteData.noteDirection;
        const colorName = NoteDirection.getColorName(direction);
        const sustainDurationMs = noteData.sustainLength;

        const visualLength = sustainDurationMs * scrollSpeedValue;
        const pieceHeightScaled = baseHeight * scale;
        const effectivePieceHeight = pieceHeightScaled + (baseOverlap * scale);
        const numPieces = Math.max(1, Math.ceil(visualLength / effectivePieceHeight));

        const holdContainer = scene.add.container(noteSprite.x, noteSprite.y);

        holdContainer.setDepth(noteSprite.depth - 1);
        holdContainer.noteData = noteData;
        holdContainer.holdSprites = [];

        // --- FIX: Vincular contenedor a noteData para poder ocultarlo externamente ---
        noteData.holdContainer = holdContainer;
        // ----------------------------------------------------------------------------

        const downScroll = false;
        const pieceDirection = downScroll ? -1 : 1;
        const originY = downScroll ? 1 : 0;
        const startY = 0;

        const pieceFrame = `${colorName} hold piece0000`;
        const tex = scene.textures.get(textureKey);

        if (tex && tex.has(pieceFrame)) {
            for (let i = 0; i < numPieces; i++) {
                const segmentY = startY + (i * effectivePieceHeight * pieceDirection);
                const holdPiece = scene.add.sprite(0, segmentY, textureKey, pieceFrame);

                holdPiece.setOrigin(0.5, originY);
                holdPiece.setScale(scale);
                holdContainer.add(holdPiece);
                holdContainer.holdSprites.push(holdPiece);
            }
        } else {
            holdContainer.destroy();
            return null;
        }

        const endFrame = `${colorName} hold end0000`;
        if (tex && tex.has(endFrame)) {
            const endY = startY + (numPieces * effectivePieceHeight * pieceDirection);
            const holdEnd = scene.add.sprite(0, endY, textureKey, endFrame);

            holdEnd.setOrigin(0.5, originY);
            holdEnd.setScale(scale);
            if (downScroll) holdEnd.flipY = true;
            holdContainer.add(holdEnd);
            holdContainer.holdSprites.push(holdEnd);
        }

        noteData.holdPieceHeight = pieceHeightScaled;
        noteData.holdPieceCount = holdContainer.holdSprites.length;

        return holdContainer;
    }
}