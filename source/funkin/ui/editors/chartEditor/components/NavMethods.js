/**
 * source/funkin/ui/editors/chartEditor/components/NavMethods.js
 */
export class NavMethods {
    constructor(scene) {
        this.scene = scene;
    }

    execute(module, method, value) {
        console.log(`[ChartEditor] Ejecutando: ${module}.${method} ${value ? `(${value})` : ''}`);

        switch (`${module}.${method}`) {
            case 'Navigation.exit':
                this.scene.scene.start('MainMenuScene');
                break;

            case 'Audio.playPause':
                this.scene.togglePlayback();
                break;

            case 'File.save':
                this.saveChart();
                break;
            
            case 'Edit.changeBPM':
                this.changeBPM(value);
                break;
            
            case 'Edit.clear':
                this.clearNotes();
                break;

            // [NUEVO] Acción para el botón del metrónomo
            case 'Editor.toggleMetronome':
                if (this.scene.toggleMetronome) {
                    this.scene.toggleMetronome();
                }
                break;
                
            default:
                console.warn(`Comando no implementado: ${module}.${method}`);
        }
    }

    changeBPM(newBpm) {
        if (!this.scene.dataManager || !this.scene.conductor) return;
        this.scene.dataManager.chartData.bpm = newBpm;
        this.scene.conductor.bpm = newBpm;
        this.scene.conductor.crochet = (60 / newBpm) * 1000;
        this.scene.conductor.stepCrochet = this.scene.conductor.crochet / 4;
        if (this.scene.toastManager) this.scene.toastManager.show("BPM Actualizado", `${newBpm} BPM`);
    }

    clearNotes() {
        this.scene.dataManager.chartData.notes.forEach(section => {
            section.sectionNotes = [];
        });
        this.scene.toastManager.show("Chart", "Notas eliminadas.");
    }

    saveChart() {
        const data = this.scene.dataManager.chartData;
        const jsonString = JSON.stringify({ song: data }, null, 4);
        const fileName = `${data.song.toLowerCase()}-chart.json`;
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if(this.scene.toastManager) this.scene.toastManager.show("Guardado", fileName);
    }
}