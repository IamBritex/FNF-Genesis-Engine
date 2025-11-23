import { NoteDirection } from './NoteDirection.js';

/**
 * NoteSpawner.js
 * Módulo responsable de precargar los assets de notas y crear los sprites individuales.
 */
export class NoteSpawner {

    static ATLAS_KEY = 'notes'; 

    /**
     * Precarga los assets necesarios para las notas.
     * [MODIFICADO] Usa sessionId para clave única.
     */
    static preload(scene, sessionId) {
        const skinName = 'Funkin'; 
        const basePath = `public/images/noteSkins/${skinName}/`;
        const texturePath = `${basePath}notes.png`;
        const atlasPath = `${basePath}notes.xml`;

        // Clave única por sesión
        const key = sessionId ? `${NoteSpawner.ATLAS_KEY}_${sessionId}` : NoteSpawner.ATLAS_KEY;

        if (!scene.textures.exists(key)) {
            scene.load.atlasXML(key, texturePath, atlasPath);
        }
    }

    /**
     * Crea un sprite de nota basado en los datos de la nota parseada.
     */
    static spawnNoteSprite(scene, noteData, scale, strumlineContainers, noteOffsetX = 0, sessionId) {
        if (!noteData || strumlineContainers.length <= noteData.noteDirection || !strumlineContainers[noteData.noteDirection]) {
            console.error("NoteSpawner.spawnNoteSprite: Datos de nota o strumline inválidos.", noteData);
            return null;
        }

        const dirName = NoteDirection.getName(noteData.noteDirection);
        const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        const frameName = `note${capDirName}0001`; 

        const targetStrumContainer = strumlineContainers[noteData.noteDirection];
        const targetX = targetStrumContainer.x + noteOffsetX; 
        
        const initialY = -100; 

        // Usar clave única
        const key = sessionId ? `${NoteSpawner.ATLAS_KEY}_${sessionId}` : NoteSpawner.ATLAS_KEY;

        if (scene.textures.exists(key) && scene.textures.get(key).has(frameName)) {
            const noteSprite = scene.add.sprite(targetX, initialY, key, frameName);
            noteSprite.setScale(scale);
            noteSprite.setOrigin(0.5, 0.5);
            noteSprite.setDepth(100); 
            noteSprite.setVisible(false); 

            noteSprite.noteData = noteData; 
            noteSprite.isPlayerNote = noteData.isPlayerNote; 
            noteSprite.noteDirection = noteData.noteDirection;
            noteSprite.strumTime = noteData.strumTime;

            return noteSprite;
        } else {
            console.error(`NoteSpawner.spawnNoteSprite: Frame ${frameName} no encontrado en ${key}.`);
            return null;
        }
    }
}