/**
 * source/funkin/ui/editors/chartEditor/data/ChartDataManager.js
 */
export class ChartDataManager {
    constructor(scene) {
        this.scene = scene;
        
        this.chartData = {
            song: "Test",
            bpm: 100,
            speed: 1.0,
            needsVoices: true,
            player1: "bf",
            player2: "dad",
            notes: [] 
        };

        // Crear sección inicial
        this.createSection();
    }

    createSection(lengthInSteps = 16) {
        this.chartData.notes.push({
            lengthInSteps: lengthInSteps,
            bpm: this.chartData.bpm,
            changeBPM: false,
            mustHitSection: true,
            sectionNotes: [] 
        });
    }

    /**
     * Añade una nota y devuelve su referencia para poder editarla (sustain).
     */
    addNote(time, lane, length = 0) {
        const bpm = this.chartData.bpm;
        // Cálculo de paso (Step) basado en BPM
        const stepTime = (60 / bpm) * 1000 / 4;
        
        // Cada sección tiene por defecto 16 pasos
        // (Esto asume 4/4, si usas time signatures raros habría que ajustar)
        const sectionIndex = Math.floor(time / (stepTime * 16));
        
        // --- [CORRECCIÓN DEL ERROR] ---
        // Rellenar secciones faltantes si hacemos clic muy adelante en la canción
        while (this.chartData.notes.length <= sectionIndex) {
            this.createSection();
        }

        const section = this.chartData.notes[sectionIndex];
        
        // Evitar duplicados exactos en el mismo tick y carril
        const existingNote = section.sectionNotes.find(n => Math.abs(n[0] - time) < 1 && n[1] === lane);
        
        if (existingNote) {
            // Si ya existe, devolvemos esa para editarla en lugar de crear otra
            return existingNote;
        }

        // Crear array de nota: [tiempo, carril, longitud]
        const newNote = [time, lane, length];
        section.sectionNotes.push(newNote);
        
        // Mantener orden cronológico
        section.sectionNotes.sort((a, b) => a[0] - b[0]);
        
        return newNote; // Devolvemos la referencia
    }

    getNotes() {
        return this.chartData.notes;
    }
}