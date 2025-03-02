export class PreloadManager {
    constructor(scene) {
        this.scene = scene;
    }

    preloadCommonAssets() {
        this.scene.load.image('funkay', 'assets/images/funkay.png');
        this.scene.load.audio('intro1', 'assets/sounds/countdown/funkin/intro1.ogg');
        this.scene.load.audio('intro2', 'assets/sounds/countdown/funkin/intro2.ogg');
        this.scene.load.audio('intro3', 'assets/sounds/countdown/funkin/intro3.ogg');
        this.scene.load.audio('introGo', 'assets/sounds/countdown/funkin/introGo.ogg');
        this.scene.load.image('set', 'assets/PlayState/countdown/funkin/set.png');
        this.scene.load.image('ready', 'assets/PlayState/countdown/funkin/ready.png');
        this.scene.load.image('go', 'assets/PlayState/countdown/funkin/go.png');
        this.scene.load.audio('freakyMenu', 'assets/music/FreakyMenu.mp3');
    }

    preloadSongs(songList, weekCharacters) {
        if (!songList || songList.length === 0) {
            console.error("No hay canciones para precargar.");
            return;
        }

        songList.forEach(songName => {
            this.scene.load.audio(`inst_${songName}`, `assets/songs/${songName}/Inst.ogg`);

            const playerCharacter = weekCharacters[1] || 'bf';
            const enemyCharacter = weekCharacters[0] || weekCharacters[2] || 'gf';

            this.scene.load.audio(`player_${songName}`, `assets/songs/${songName}/Voices-${playerCharacter}.ogg`);
            this.scene.load.audio(`enemy_${songName}`, `assets/songs/${songName}/Voices-${enemyCharacter}.ogg`);
        });
    }
}
