export class StrumlinesNotes {
    constructor(scene, notesController) {
        this.scene = scene;
        this.notesController = notesController;
        this.playerStrumline = [];
        this.enemyStrumline = [];
        // Valores por defecto para escala
        this.defaultScale = {
            static: 0.68,
            confirm: 0.58,
            press: 0.68
        };
        // Offset para centrar confirm/press respecto a static
        this.confirmOffset = notesController.offsets.confirm;
        this.pressOffset = notesController.offsets.press;
    }

    

    async createPlayerStrumline() {
        this.playerStrumline = [];
        const scale = this.defaultScale;
        for (let i = 0; i < 4; i++) {
            const pos = this.notesController.getStrumlinePositions(true)[i];
            const direction = this.notesController.directions[i];
            const frameName = `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`;
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', frameName);
            arrow.setOrigin(0, 0);
            arrow.setVisible(true);
            arrow.setAlpha(1);
            arrow.setDepth(100);
            arrow.setScale(scale.static); // <-- Aplica la escala correcta
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            arrow.setName(`PlayerStrum_${direction}`);
            if (typeof arrow.setScrollFactor === 'function') arrow.setScrollFactor(0);
            this.scene.children.bringToTop(arrow);

            // Forzar la escala después de añadir a la UI/capa (por si acaso)
            arrow.setScale(scale.static);

            this.playerStrumline[i] = arrow;
        }
        return this.playerStrumline;
    }

    createEnemyStrumline() {
        this.enemyStrumline = [];
        const scale = this.defaultScale;
        // Asegúrate de que enemyStrumlineVisuals esté actualizado ANTES de crear las flechas
        this.notesController.getStrumlinePositions(false);

        const enemyVisuals = this.notesController.enemyStrumlineVisuals;
        for (let i = 0; i < 4; i++) {
            const pos = this.notesController.getStrumlinePositions(false)[i];
            const direction = this.notesController.directions[i];
            const frameName = `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`;
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', frameName).setScale(0.8);
            arrow.setOrigin(0, 0);
            arrow.setVisible(true);
            arrow.setDepth(100);
            // Aplica escala y alpha especial desde el inicio
            if (enemyVisuals) {
                arrow.setScale(scale.static );
                arrow.setAlpha(enemyVisuals.alpha);
            } else {
                arrow.setScale(scale.static);
                arrow.setAlpha(1);
            }
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            arrow.setName(`EnemyStrum_${direction}`);
            if (typeof arrow.setScrollFactor === 'function') arrow.setScrollFactor(0);
            this.scene.children.bringToTop(arrow);
            this.enemyStrumline[i] = arrow;
        }
        return this.enemyStrumline;
    }

    updateStrumlineState(strumline, directionIndex, state, textureKey, scaleOverride) {
        const arrow = strumline[directionIndex];
        if (!arrow) return;
        if (textureKey) arrow.setTexture('noteStrumline', textureKey);

        // Usa SIEMPRE los offsets configurables
        const staticOffset = this.notesController.offsets.static;
        const confirmOffset = this.notesController.offsets.confirm;
        const pressOffset = this.notesController.offsets.press;

        // Detectar si es enemy strumline y hay visuales especiales
        const isEnemy = strumline === this.enemyStrumline;
        const enemyVisuals = this.notesController.enemyStrumlineVisuals;

        // Escala por defecto según tipo
        let scale = this.defaultScale.static;
        if (state === 'confirm') scale = this.defaultScale.confirm;
        else if (state === 'press') scale = this.defaultScale.press;

        // Si es enemy y hay visuales especiales, multiplicar la escala
        if (isEnemy && enemyVisuals) {
            scale = 0.8 * scale; // Ajusta el factor de escala según sea necesario
            arrow.setAlpha(enemyVisuals.alpha);
        } else {
            arrow.setAlpha(1);
        }

        if (state === 'confirm') {
            arrow.setScale(scale);
            arrow.x = arrow.originalX + (confirmOffset.x || 0);
            arrow.y = arrow.originalY + (confirmOffset.y || 0);
            this.scene.tweens.add({
                targets: arrow,
                scale: scale,
                x: arrow.originalX + (staticOffset.x || 0),
                y: arrow.originalY + (staticOffset.y || 0),
                duration: 80,
                ease: 'Quad.easeOut'
            });
        } else if (state === 'press') {
            arrow.setScale(scale);
            arrow.x = arrow.originalX + (pressOffset.x || 0);
            arrow.y = arrow.originalY + (pressOffset.y || 0);
        } else {
            arrow.setScale(scale);
            arrow.x = arrow.originalX + (staticOffset.x || 0);
            arrow.y = arrow.originalY + (staticOffset.y || 0);
        }
        if (scaleOverride) arrow.setScale(scaleOverride);
    }

    destroyStrumlines() {
        this.playerStrumline.forEach(arrow => arrow?.destroy());
        this.enemyStrumline.forEach(arrow => arrow?.destroy());
        this.playerStrumline = [];
        this.enemyStrumline = [];
    }

    setUICameraVisible(visible) {
        if (this.scene.cameraController && this.scene.cameraController.uiCamera) {
            this.scene.cameraController.uiCamera.setVisible(visible);
        }
    }
}