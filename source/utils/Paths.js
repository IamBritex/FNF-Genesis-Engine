// source/utils/Paths.js
export class Paths {
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
    static getCharacterData(characterId) {
        return `${this.CHARACTER_DATA}/${characterId}.json`;
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
    static getCharacterSprites(characterData) {
        return {
            TEXTURE: `${this.IMAGES}/${characterData.image}.png`,
            ATLAS: `${this.IMAGES}/${characterData.image}.xml`
        };
    }
}