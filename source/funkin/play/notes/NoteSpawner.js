import { NoteDirection } from './NoteDirection.js';

/**
 * NoteSpawner.js
 * Módulo responsable de precargar los assets de notas y crear los sprites individuales.
 */
export class NoteSpawner {

    static ATLAS_KEY = 'notes'; 

    /**
     * Precarga los assets necesarios para las notas.
     */
    static preload(scene) {
        const skinName = 'Funkin'; 
        const basePath = `public/images/noteSkins/${skinName}/`;
        const texturePath = `${basePath}notes.png`;
        const atlasPath = `${basePath}notes.xml`;

        if (!scene.textures.exists(NoteSpawner.ATLAS_KEY)) {
            scene.load.atlasXML(NoteSpawner.ATLAS_KEY, texturePath, atlasPath);
        }
    }

    /**
     * Crea un sprite de nota basado en los datos de la nota parseada.
     */
    static spawnNoteSprite(scene, noteData, scale, strumlineContainers, noteOffsetX = 0) {
        if (!noteData || strumlineContainers.length <= noteData.noteDirection || !strumlineContainers[noteData.noteDirection]) {
            console.error("NoteSpawner.spawnNoteSprite: Datos de nota o strumline inválidos.", noteData);
            return null;
        }

        const dirName = NoteDirection.getName(noteData.noteDirection);
        const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
        const frameName = `note${capDirName}0001`; 

        const targetStrumContainer = strumlineContainers[noteData.noteDirection];
        const targetX = targetStrumContainer.x + noteOffsetX; // Esta X será recalculada en NotesHandler
        
        const initialY = -100; // Posición inicial (antes de calcular)

        if (scene.textures.exists(NoteSpawner.ATLAS_KEY) && scene.textures.get(NoteSpawner.ATLAS_KEY).has(frameName)) {
            const noteSprite = scene.add.sprite(targetX, initialY, NoteSpawner.ATLAS_KEY, frameName);
            noteSprite.setScale(scale);
            noteSprite.setOrigin(0.5, 0.5);
            noteSprite.setDepth(100); 
            noteSprite.setVisible(false); // Inicia invisible, NotesHandler la mostrará

            noteSprite.noteData = noteData; 
            noteSprite.isPlayerNote = noteData.isPlayerNote; 
            noteSprite.noteDirection = noteData.noteDirection;
            noteSprite.strumTime = noteData.strumTime;

            return noteSprite;
        } else {
            console.error(`NoteSpawner.spawnNoteSprite: Frame ${frameName} no encontrado.`);
            return null;
        }
    }
}