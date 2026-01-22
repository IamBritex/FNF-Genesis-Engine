import { Stage } from "../../play/stage/Stage.js";

export default class bgParallax {
    constructor(scene) {
        this.scene = scene;
        this.stage = null;

        this.targetMouseX = 0;
        this.targetMouseY = 0;
        this.currentMouseX = 0;
        this.currentMouseY = 0;

        this.lerpFactor = 0.05;

        window.addEventListener('mousemove', (e) => {
            this.targetMouseX = (e.clientX / window.innerWidth) - 0.5;
            this.targetMouseY = (e.clientY / window.innerHeight) - 0.5;
        });
    }

    static preloadAssets(scene) {
        scene.load.json('StageJSON_backstage', 'public/data/stages/backstage.json');

        const stagePath = 'public/images/stages/backstage/';

        const images = ['back', 'front', 'lights', 'server', 'bg', 'brightLightSmall', 'orangeLight 1'];
        images.forEach(img => {
            const cleanName = img.includes(' ') ? img.split(' ')[0] : img;
            scene.load.image(`stage_backstage_${img}`, `${stagePath}${img}.png`);
        });

        scene.load.atlasXML('stage_backstage_crowd', `${stagePath}crowd.png`, `${stagePath}crowd.xml`);
    }

    init() {
        this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x330404)
            .setOrigin(0).setScrollFactor(0);

        this.orangeLight = this.scene.add.image(this.scene.scale.width / 2, this.scene.scale.height / 2, 'stage_backstage_orangeLight 1');
        this.orangeLight.setDisplaySize(this.scene.scale.width, this.scene.scale.height);
        this.orangeLight.setAlpha(0.5);
        this.orangeLight.originalX = this.orangeLight.x;
        this.orangeLight.originalY = this.orangeLight.y;
        this.orangeLight.parallaxFactor = 0.03;

        const mockCameraManager = { assignToGame: (sprite) => { } };
        const mockChartData = { stage: 'backstage' };

        this.stage = new Stage(this.scene, mockChartData, mockCameraManager, null);
        this.stage.stageContent = this.scene.cache.json.get('StageJSON_backstage');

        if (this.stage.createStageElements) {
            this.stage.createStageElements();
        }

        this._setupPositions();
    }

    _setupPositions() {
        const isMobile = typeof window.Capacitor !== "undefined" || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const mobileShiftX = isMobile ? 300 : 0;

        if (this.stage && this.stage.stageElements && this.stage.stageElements.stageElements) {
            this.stage.stageElements.stageElements.forEach((sprite) => {
                sprite.x += mobileShiftX;
                sprite.originalX = sprite.x;
                sprite.originalY = sprite.y;
            });
        }
    }

    update() {
        this.currentMouseX += (this.targetMouseX - this.currentMouseX) * this.lerpFactor;
        this.currentMouseY += (this.targetMouseY - this.currentMouseY) * this.lerpFactor;

        const moveAmount = 90;

        if (this.orangeLight) {
            this.orangeLight.x = this.orangeLight.originalX + (this.currentMouseX * moveAmount * this.orangeLight.parallaxFactor);
            this.orangeLight.y = this.orangeLight.originalY + (this.currentMouseY * moveAmount * this.orangeLight.parallaxFactor);
        }

        if (this.stage && this.stage.stageElements) {
            this.stage.stageElements.stageElements.forEach((sprite) => {
                if (sprite.originalX !== undefined) {
                    const fX = sprite.scrollFactorX || 0.1;
                    const fY = sprite.scrollFactorY || 0.1;

                    sprite.x = sprite.originalX + (this.currentMouseX * moveAmount * fX);
                    sprite.y = sprite.originalY + (this.currentMouseY * moveAmount * fY);
                }
            });
        }
    }
}