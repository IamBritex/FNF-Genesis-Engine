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

        // Determinar si es un mod
        const isModSong = this.scene.songData?.isMod;
        const basePath = isModSong 
            ? `${this.scene.songData.modPath}/audio/songs/${currentSong}/song`
            : `public/assets/audio/songs/${currentSong}/song`;

        // Cargar Inst.ogg
        const instUrl = `${basePath}/Inst.ogg`;
        const instExists = await this.checkAudioFileExists(instUrl);
        
        if (!instExists) {
            throw new Error(`No se encontró Inst.ogg para ${currentSong} en ${instUrl}`);
        }

        this.scene.load.audio(`inst_${currentSong}`, instUrl);
        console.log(`Cargando Inst.ogg para ${currentSong} desde ${instUrl}`);

        // Verificar y cargar Voices.ogg si existe
        const voicesUrl = `${basePath}/Voices.ogg`;
        const voicesExists = await this.checkAudioFileExists(voicesUrl);

        if (voicesExists) {
            this.scene.load.audio(`voices_${currentSong}`, voicesUrl);
            console.log(`Cargando Voices.ogg para ${currentSong} desde ${voicesUrl}`);
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
        // Crear instancia del instrumental
        const inst = this.scene.sound.add(`inst_${currentSong}`, {
            loop: false,
            volume: 1
        });
        
        // Intentar crear instancia de las voces si existen
        let voices = null;
        if (this.scene.cache.audio.exists(`voices_${currentSong}`)) {
            voices = this.scene.sound.add(`voices_${currentSong}`, {
                loop: false,
                volume: 1
            });
        }
        
        // Reproducir ambas pistas sincronizadas
        inst.play({ seek: 0 });
        if (voices) {
            voices.play({ seek: 0 });
        }
        
        // Retornar ambas instancias
        return {
            inst,
            voices
        };
    }

    stopSongAudio(audioInstances) {
        if (audioInstances.inst) {
            audioInstances.inst.stop();
        }
        if (audioInstances.voices) {
            audioInstances.voices.stop();
        }
    }

    // Obtener datos de audio (si es necesario)
    getAudioData(currentSong) {
        return {
            inst: this.scene.cache.audio.get(`inst_${currentSong}`),
            voices: this.scene.cache.audio.get(`voices_${currentSong}`),
        };
    }
}