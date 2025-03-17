export class AudioManager {
    constructor(scene) {
        this.scene = scene;
    }

    // Verificar si un archivo de audio existe
    async checkAudioFileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.warn(`Error al verificar el archivo de audio: ${url}`, error);
            return false;
        }
    }

    // Cargar los archivos de audio de una canción
    async loadSongAudio(currentSong) {
        console.log("Cargando datos de la canción:", currentSong);

        // Cargar Inst.ogg
        this.scene.load.audio(`inst_${currentSong}`, `assets/songs/${currentSong}/Inst.ogg`);
        console.log(`Cargando Inst.ogg para ${currentSong}`);

        // Verificar y cargar Voices.ogg si existe
        const voicesUrl = `assets/songs/${currentSong}/Voices.ogg`;
        const voicesExists = await this.checkAudioFileExists(voicesUrl);

        if (voicesExists) {
            this.scene.load.audio(`voices_${currentSong}`, voicesUrl);
            console.log(`Cargando Voices.ogg para ${currentSong}`);
        } else {
            console.warn(`No se encontró Voices.ogg para ${currentSong}, solo se usará Inst.ogg.`);
        }

        // Esperar a que la carga termine
        return new Promise((resolve) => {
            this.scene.load.once('complete', () => {
                resolve();
            });
            this.scene.load.start();
        });
    }

    // Reproducir los archivos de audio de una canción
    playSongAudio(currentSong) {
        // Crear instancia de Inst.ogg
        const inst = this.scene.sound.add(`inst_${currentSong}`);
        inst.play();

        // Verificar si Voices.ogg existe antes de intentar reproducirlo
        if (this.scene.cache.audio.exists(`voices_${currentSong}`)) {
            const voices = this.scene.sound.add(`voices_${currentSong}`);
            voices.play();
            console.log(`Reproduciendo Voices.ogg para ${currentSong}`);
        } else {
            console.warn(`No se encontró Voices.ogg para ${currentSong}, solo se reproducirá Inst.ogg.`);
        }

        return inst;
    }

    // Obtener datos de audio (si es necesario)
    getAudioData(currentSong) {
        return {
            inst: this.scene.cache.audio.get(`inst_${currentSong}`),
            voices: this.scene.cache.audio.get(`voices_${currentSong}`),
        };
    }
}