import { NoteDirection } from './NoteDirection.js';

export class NoteSpawner {

    /**
     * @param {import('../NoteSkin.js').NoteSkin} noteSkin 
     */
    static spawnNoteSprite(scene, noteData, noteSkin, strumlineContainers, noteOffsetX = 0) {
        if (!noteData || strumlineContainers.length <= noteData.noteDirection) return null;

        const skinData = noteSkin.getSkinData();
        const textureKey = noteSkin.getTextureKey('notes'); // ej: notes_Funkin
        const scale = skinData.scale || 0.7;

        const dirName = NoteDirection.getName(noteData.noteDirection);
        const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        const frameName = `note${capDirName}0001`; 

        const targetStrumContainer = strumlineContainers[noteData.noteDirection];
        const targetX = targetStrumContainer.x + noteOffsetX; 
        const initialY = -200; 

        // Leer offsets de nota del JSON
        const offsets = skinData.notes?.offsets || { x: 0, y: 0 };

        if (scene.textures.exists(textureKey) && scene.textures.get(textureKey).has(frameName)) {
            const noteSprite = scene.add.sprite(targetX + offsets.x, initialY + offsets.y, textureKey, frameName);
            
            noteSprite.setScale(scale);
            noteSprite.setOrigin(0.5, 0.5);
            noteSprite.setDepth(100); 
            noteSprite.setVisible(false); 

            // Pasar datos útiles
            noteSprite.noteData = noteData; 
            noteSprite.isPlayerNote = noteData.isPlayerNote; 
            noteSprite.noteDirection = noteData.noteDirection;
            noteSprite.strumTime = noteData.strumTime;
            noteSprite.skinOffsets = offsets; // Guardar offsets por si se necesitan reajustar

            return noteSprite;
        } else {
            console.error(`NoteSpawner: Frame ${frameName} no encontrado en ${textureKey}.`);
            return null;
        }
    }
}