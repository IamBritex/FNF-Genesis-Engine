export class TimeBar {
    constructor(scene) {
        this.scene = scene;
        this.timeBar = null;
        this.timeBarBackground = null;
        this.timeBarForeground = null;
        this.timeText = null;
        this.totalSongDuration = 0;
        this.initialWidth = 400;
        this.isCreated = false;
        this.container = null;
        this.recorte = 8;
        this.barHeight = 30;
        this.scaleFactor = 1.1;
    }

    static preload(scene) {
        scene.load.image('timeBar', 'public/images/ui/timeBar.png');
    }

    create() {
        if (this.isCreated) return;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(150);
        
        // [MODIFICADO] Inicialmente invisible
        this.container.alpha = 0; 

        this._createTimeBarImage();
        this._createBackground();
        this._createForeground();
        this._createTimeText();

        this.container.add([
            this.timeBarBackground,
            this.timeBarForeground,
            this.timeBar,
            this.timeText
        ]);

        this._centerElements();
        this.isCreated = true;
    }

    _createBackground() {
        const scaledWidth = this.initialWidth * this.scaleFactor;
        const scaledHeight = this.barHeight * this.scaleFactor;
        const scaledRecorte = this.recorte * this.scaleFactor;

        this.timeBarBackground = this.scene.add.graphics();
        this._drawRecortado(this.timeBarBackground, 0x000000, scaledWidth, scaledHeight, scaledRecorte);
    }

    _createForeground() {
        const scaledHeight = this.barHeight * this.scaleFactor;
        const scaledRecorte = this.recorte * this.scaleFactor;

        this.timeBarForeground = this.scene.add.graphics();
        this._drawRecortado(this.timeBarForeground, 0xFFFFFF, 0, scaledHeight, scaledRecorte);
    }

    _drawRecortado(graphics, color, width, height = this.barHeight * this.scaleFactor, recorte = this.recorte * this.scaleFactor) {
        graphics.clear();
        graphics.fillStyle(color);
        graphics.beginPath();
        graphics.moveTo(0, recorte);
        graphics.lineTo(width, recorte);
        graphics.lineTo(width, height - recorte);
        graphics.lineTo(0, height - recorte);
        graphics.closePath();
        graphics.fillPath();
    }

    _createTimeBarImage() {
        this.timeBar = this.scene.add.image(
            (this.initialWidth * this.scaleFactor) / 2,
            (this.barHeight * this.scaleFactor) / 2,
            'timeBar'
        )
        .setOrigin(0.5, 0.5)
        .setScale(this.scaleFactor);
    }

    _createTimeText() {
        this.timeText = this.scene.add.text(
            (this.initialWidth * this.scaleFactor) / 2,
            (this.barHeight * this.scaleFactor) / 2,
            '0:00',
            {
                fontFamily: 'VCR OSD Mono',
                fontSize: '36px',
                color: '#FFFFFF',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4
            }
        )
        .setOrigin(0.5)
        .setScale(1);
    }

    _centerElements() {
        const centerX = this.scene.cameras.main.width / 2;
        let yPosition = 10;

        this.container.setPosition(
            centerX - (this.initialWidth * this.scaleFactor) / 2,
            yPosition
        );
    }

    setTotalDuration(duration) {
        this.totalSongDuration = duration;

        // [MODIFICADO] Aparecer suavemente cuando se recibe la duración (inicio de canción)
        if (this.container && this.container.alpha === 0) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 1,
                duration: 500, // Medio segundo de fade in
                ease: 'Linear'
            });
        }
    }

    update(currentTime) {
        if (!this.isCreated || !this.totalSongDuration) return;

        const progress = Phaser.Math.Clamp(currentTime / this.totalSongDuration, 0, 1);
        const currentWidth = (this.initialWidth * this.scaleFactor) * progress;
        const scaledHeight = this.barHeight * this.scaleFactor;
        const scaledRecorte = this.recorte * this.scaleFactor;

        this.timeBarForeground.clear();
        this._drawRecortado(this.timeBarForeground, 0xFFFFFF, currentWidth, scaledHeight, scaledRecorte);

        const remainingTime = Math.max(0, this.totalSongDuration - currentTime);
        this._updateTimeText(remainingTime);
    }

    _updateTimeText(remainingTimeMs) {
        const totalSeconds = Math.floor(remainingTimeMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        this.timeText.setText(`${minutes}:${formattedSeconds}`);
    }

    destroy() {
        if (!this.isCreated) return;
        this.container.destroy();
        this.isCreated = false;
    }
}