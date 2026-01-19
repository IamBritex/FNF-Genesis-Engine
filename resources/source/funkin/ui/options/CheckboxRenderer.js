export default class CheckboxRenderer {

    // CONFIGURACIÓN
    static ANIM_FPS = 24;
    static UNSELECTED_SCALE = 0.5;
    static SELECTED_SCALE = 0.8;

    // OFFSET VISUAL (Píxeles)
    // Negativo X = Más a la izquierda
    // Negativo Y = Más arriba
    static OFFSET_X = -70;
    static OFFSET_Y = -15;

    static renderStatic(scene, canvas, isChecked) {
        this.stopAnimation(canvas);
        const frameName = isChecked ? 'Check Box Selected Static0000' : 'Check Box unselected0000';
        const scale = isChecked ? this.SELECTED_SCALE : this.UNSELECTED_SCALE;
        this.drawFrame(scene, canvas, frameName, scale);
    }

    static playAnimation(scene, canvas) {
        this.stopAnimation(canvas);
        const totalFrames = 11;
        let currentFrame = 0;

        canvas._animEvent = scene.time.addEvent({
            delay: 1000 / this.ANIM_FPS,
            loop: true,
            callback: () => {
                const frameName = `Check Box selecting animation00${currentFrame < 10 ? '0' + currentFrame : currentFrame}`;
                this.drawFrame(scene, canvas, frameName, this.SELECTED_SCALE);
                currentFrame++;
                if (currentFrame >= totalFrames) {
                    this.stopAnimation(canvas);
                    this.drawFrame(scene, canvas, 'Check Box Selected Static0000', this.SELECTED_SCALE);
                }
            }
        });
    }

    static playReverseAnimation(scene, canvas) {
        this.stopAnimation(canvas);
        let currentFrame = 10;

        canvas._animEvent = scene.time.addEvent({
            delay: 1000 / this.ANIM_FPS,
            loop: true,
            callback: () => {
                const frameName = `Check Box selecting animation00${currentFrame < 10 ? '0' + currentFrame : currentFrame}`;
                this.drawFrame(scene, canvas, frameName, this.SELECTED_SCALE);
                currentFrame--;
                if (currentFrame < 0) {
                    this.stopAnimation(canvas);
                    this.drawFrame(scene, canvas, 'Check Box unselected0000', this.UNSELECTED_SCALE);
                }
            }
        });
    }

    static stopAnimation(canvas) {
        if (canvas._animEvent) {
            canvas._animEvent.remove();
            canvas._animEvent = null;
        }
    }

    static drawFrame(scene, canvas, frameName, scalePercent) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const texture = scene.textures.get('checkboxAnim');
        if (!texture || texture.key === '__MISSING') return;

        const frame = texture.get(frameName);
        if (!frame || frame.name === '__MISSING') return;

        const sourceImage = texture.getSourceImage();

        const originalH = frame.realHeight || frame.height;
        let baseScale = (canvas.height * 0.90) / originalH;
        let finalScale = baseScale * scalePercent;

        const drawWidth = frame.cutWidth * finalScale;
        const drawHeight = frame.cutHeight * finalScale;

        // --- POSICIÓN: Bottom-Right + OFFSETS ---
        // 1. Pegado a la derecha (Width - Dibujo) + Offset X
        const drawX = (canvas.width - drawWidth) + this.OFFSET_X;

        // 2. Pegado al fondo (Height - Dibujo) + Offset Y
        const drawY = (canvas.height - drawHeight) + this.OFFSET_Y;

        ctx.drawImage(
            sourceImage,
            frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
            drawX, drawY, drawWidth, drawHeight
        );
    }
}