import Alphabet from "../../../utils/Alphabet.js";
import { IconSongEnemy } from "./iconSongEnemy.js";

export class FreeUI {
    constructor(scene, songs) {
        this.scene = scene;
        this.songs = songs;

        this.grpSongs = null;
        this.scoreText = null;
        this.diffText = null;

        this.curSelected = 0;
        this.curDifficulty = 1;
        this.targetScrollY = 0;
        this.songSpacing = 160;
        this.selectingSong = false;

        this.scrollSnd = this.scene.sound.add('scrollSound');
        this.confirmSnd = this.scene.sound.add('confirmSound');
    }

    setupUI() {
        const { width, height } = this.scene.cameras.main;

        this.grpSongs = this.scene.add.container(100, height / 2);

        for (let i = 0; i < this.songs.length; i++) {
            const song = this.songs[i];
            const displayName = song && typeof song.displayName === 'string' ? song.displayName : 'MISSING_NAME';
            const iconName = song.icon || 'face';

            const yPos = i * this.songSpacing;

            const songText = new Alphabet(
                this.scene,
                0,
                yPos,
                displayName,
                true,
                1.0
            );
            songText.targetY = i;
            this.grpSongs.add(songText);

            const iconX = songText.width + 50;
            const iconY = yPos + 8;

            const iconEnemy = new IconSongEnemy(this.scene, iconX, iconY, iconName);
            iconEnemy.targetY = i;

            this.grpSongs.add(iconEnemy);

            songText.iconRef = iconEnemy;
        }

        // Textos de UI - Cambio aquí: this.scene.add.text()
        this.scoreText = this.scene.add.text(
            width * 0.95, 20, "Best Score: 0",
            { fontFamily: 'vcr', fontSize: "32px", fill: "#fff", align: "right" }
        ).setOrigin(1, 0);

        this.diffText = this.scene.add.text(
            width * 0.95, 60, "< NORMAL >",
            { fontFamily: 'vcr', fontSize: "24px", fill: "#fff", align: "right" }
        ).setOrigin(1, 0);
    }

    update(time, delta) {
        if (this.grpSongs) {
            this.grpSongs.y = Phaser.Math.Linear(
                this.grpSongs.y,
                this.targetScrollY,
                0.1
            );

            this.grpSongs.each((child) => {
                // Lógica para los ICONOS
                if (child instanceof IconSongEnemy) {
                    const isSelected = child.targetY === this.curSelected;

                    // BOOPING: Solo si está seleccionado
                    if (isSelected) {
                        child.playBeat(time, delta);
                    } else {
                        child.idle();
                    }

                    const targetAlpha = isSelected ? 1.0 : 0.6;
                    child.alpha = Phaser.Math.Linear(child.alpha, targetAlpha, 0.1);
                }

                // Lógica para el TEXTO
                if (child instanceof Alphabet && typeof child.targetY === "number") {
                    const isSelected = child.targetY === this.curSelected;
                    const targetAlpha = isSelected ? 1.0 : 0.6;
                    child.setAlpha(Phaser.Math.Linear(child.alpha, targetAlpha, 0.1));
                }
            });
        }
    }

    changeSelection(change = 0, playSound = true) {
        if (!this.songs || this.songs.length === 0) return;

        if (change !== 0 && playSound && this.scrollSnd) {
            this.scrollSnd.play();
        }

        this.curSelected = Phaser.Math.Wrap(this.curSelected + change, 0, this.songs.length);

        const centerOffset = this.scene.cameras.main.height / 2;
        this.targetScrollY = -this.curSelected * this.songSpacing + centerOffset;

        const currentSong = this.songs[this.curSelected];
        if (currentSong && currentSong.difficulties) {
            if (this.curDifficulty >= currentSong.difficulties.length) {
                this.curDifficulty = Math.min(1, currentSong.difficulties.length - 1);
                if (this.curDifficulty < 0) this.curDifficulty = 0;
            }
        } else {
            this.curDifficulty = 0;
        }

        this.changeDiff(0);
    }

    changeDiff(change = 0) {
        if (!this.songs || this.songs.length === 0) {
            this.diffText.setText("-");
            return;
        }
        const song = this.songs[this.curSelected];
        if (!song || !song.difficulties || song.difficulties.length === 0) {
            this.diffText.setText("-");
            return;
        }

        if (change !== 0 && this.scrollSnd) {
            this.scrollSnd.play();
        }

        this.curDifficulty = Phaser.Math.Wrap(this.curDifficulty + change, 0, song.difficulties.length);

        const diffName = song.difficulties[this.curDifficulty];
        const diffTextDisplay = typeof diffName === 'string' ? diffName.toUpperCase() : '???';
        this.diffText.setText(`< ${diffTextDisplay} >`);

        this.updateScore();
    }

    updateScore() {
        const score = 0;
        this.scoreText.setText(`Best Score: ${score}`);
    }

    selectSong() {
        if (this.selectingSong || !this.songs?.length) return;
        this.selectingSong = true;

        const selectedSongData = this.songs[this.curSelected];
        if (!selectedSongData?.difficulties) {
            console.error("Invalid song data selected.");
            this.selectingSong = false;
            return;
        }

        if (this.confirmSnd) this.confirmSnd.play();

        const currentDifficultyName = selectedSongData.difficulties[this.curDifficulty] || 'normal';
        const playlistSongIds = [selectedSongData.displayName];

        const dataToSend = {
            isStoryMode: false,
            playlistSongIds: playlistSongIds,
            Score: 0,
            storyTitle: selectedSongData.weekName || "Freeplay",
            DifficultyID: currentDifficultyName,
            WeekId: selectedSongData.weekName || "Freeplay",
            targetSongId: selectedSongData.displayName,
            currentSongIndex: 0
        };

        this.scene.time.delayedCall(1200, () => {
            const fadeDuration = 500;
            this.scene.cameras.main.fadeOut(fadeDuration, 0, 0, 0, (camera, progress) => {
                if (progress === 1) {
                    // --- CORRECCIÓN AQUÍ ---
                    this.scene.scene.start('PlayScene', dataToSend);
                }
            });
        });
    }
}