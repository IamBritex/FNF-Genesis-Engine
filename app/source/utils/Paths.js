import { Config } from './Config.js';

// source/utils/Paths.js
export class Paths {
    static getAssetPath(category, file) {
        return Config.getAssetPath(`public/assets/${category}/${file}`);
    }
    
    // Directorios base
    static get ASSETS() { return 'public/assets'; }
    static get IMAGES() { return `${this.ASSETS}/images`; }
    static get AUDIO() { return `${this.ASSETS}/audio`; }
    static get DATA() { return `${this.ASSETS}/data`; }

    // UI
    static get UI() { return `${this.IMAGES}/UI`; }
    static get HEALTH_BAR() { return `${this.UI}/healthBar.png`; }
    static get FUNKAY() { return `${this.UI}/funkay.png`; }
    static get TIME_BAR() { return `${this.UI}/timeBar.png`; }

    // Sonidos
    static get SOUNDS() { return `${this.AUDIO}/sounds`; }
    static get MISS_NOTE_1() { return `${this.SOUNDS}/missnote1.ogg`; }
    static get MISS_NOTE_2() { return `${this.SOUNDS}/missnote2.ogg`; }
    static get MISS_NOTE_3() { return `${this.SOUNDS}/missnote3.ogg`; }
    static get FREAKY_MENU() { return `${this.SOUNDS}/FreakyMenu.mp3`; }

    // Notas y assets del juego
    static get PLAY_STATE() { return `${this.IMAGES}/states/PlayState`; }
    static get NOTES() { 
        return {
            TEXTURE: `${this.PLAY_STATE}/notes.png`,
            ATLAS: `${this.PLAY_STATE}/notes.xml`
        };
    }
    static get NOTE_STRUMLINE() {
        return {
            TEXTURE: `${this.PLAY_STATE}/noteStrumline.png`,
            ATLAS: `${this.PLAY_STATE}/noteStrumline.xml`
        };
    }
    static get NOTE_HOLD_ASSETS() {
        return {
            TEXTURE: `${this.PLAY_STATE}/NOTE_hold_assets.png`,
            ATLAS: `${this.PLAY_STATE}/NOTE_hold_assets.xml`
        };
    }

    // Personajes
    static get CHARACTERS() { return `${this.IMAGES}/characters`; }
    static get CHARACTER_ICONS() { return `${this.CHARACTERS}/icons`; }
    static getCharacterIcon(iconName) {
        return `${this.CHARACTER_ICONS}/icon-${iconName}.png`;
    }

    // Datos de personajes
    static get CHARACTER_DATA() { return `${this.DATA}/characters`; }
    static getCharacterData(characterId, modPath = null) {
        if (modPath) {
            return `${modPath}/data/characters/${characterId}.json`;
        }
        return `public/assets/data/characters/${characterId}.json`;
    }

    // Canciones
    static get SONGS() { return `${this.AUDIO}/songs`; }
    static getSongPath(songName) {
        return `${this.SONGS}/${songName}`;
    }
    static getSongInst(songName) {
        return `${this.getSongPath(songName)}/Inst.ogg`;
    }
    static getSongVoices(songName) {
        return `${this.getSongPath(songName)}/Voices.ogg`;
    }
    static getSongChart(songName, difficulty = 'normal') {
        return `${this.getSongPath(songName)}/charts/${songName}-${difficulty}.json`;
    }
    static getDefaultSongChart(songName) {
        return `${this.getSongPath(songName)}/charts/${songName}.json`;
    }

    // Sprites de personajes
    static getCharacterSprites(characterData, modPath = null) {
        if (!characterData?.image) return null;
        
        const imageName = characterData.image;
        const basePath = modPath ? `${modPath}/images/characters` : 'public/assets/images/characters';
        
        return {
            TEXTURE: `${basePath}/${imageName}.png`,
            ATLAS: `${basePath}/${imageName}.xml`
        };
    }

    // Nuevos métodos para manejar mods
    static getMod(modPath, type, file) {
        return `${modPath}/${type}/${file}`;
    }

    // Character paths
    static getCharacterPath(characterId, modPath = null) {
        if (modPath) {
            return `${modPath}/data/characters/${characterId}.json`;
        }
        return `${this.CHARACTER_DATA}/${characterId}.json`;
    }

    static getCharacterSpritePath(imagePath, modPath = null) {
        // Clean image path - remove any 'characters/' prefix
        const cleanPath = imagePath.replace('characters/', '');
        
        if (modPath) {
            return {
                TEXTURE: `${modPath}/images/characters/${cleanPath}.png`,
                ATLAS: `${modPath}/images/characters/${cleanPath}.xml`
            };
        }
        return {
            TEXTURE: `${this.CHARACTERS}/${cleanPath}.png`,
            ATLAS: `${this.CHARACTERS}/${cleanPath}.xml`
        };
    }

    // Icon paths
    static getIconPath(iconName, modPath = null) {
        if (modPath) {
            return `${modPath}/images/characters/icons/${iconName}.png`;
        }
        return `${this.CHARACTER_ICONS}/${iconName}.png`;
    }

    // Stage paths
    static getStagePath(stageName, modPath = null) {
        if (modPath) {
            return `${modPath}/data/stages/${stageName}.json`;
        }
        return `${this.DATA}/stages/${stageName}.json`;
    }

    // Song paths
    static getSongAssetPath(songName, fileName, modPath = null) {
        if (modPath) {
            return `${modPath}/audio/songs/${songName}/song/${fileName}`;
        }
        return `${this.SONGS}/${songName}/song/${fileName}`;
    }

    static getSongChart(songName, difficulty = null, modPath = null) {
        const chartFileName = difficulty ? `${songName}-${difficulty}.json` : `${songName}.json`;
        if (modPath) {
            return `${modPath}/audio/songs/${songName}/charts/${chartFileName}`;
        }
        return `${this.SONGS}/${songName}/charts/${chartFileName}`;
    }

    // Death character
    static getDeathCharacterPath(characterId = 'bf-dead', modPath = null) {
        if (modPath) {
            return `${modPath}/data/characters/${characterId}.json`;
        }
        return `${this.CHARACTER_DATA}/${characterId}.json`;
    }
}