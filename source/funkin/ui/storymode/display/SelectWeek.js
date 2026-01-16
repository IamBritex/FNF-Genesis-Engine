export class SelectWeek {
    constructor(scene) {
        this.scene = scene;
    }

    // vacío para compatibilidad.
    create(_difficulties) {}

    startWeek(data) {
        const fadeDuration = 500;
        this.scene.cameras.main.fadeOut(fadeDuration, 0, 0, 0, (_camera, progress) => {
            if (progress === 1) {
                const transitionScene = this.scene.scene.get("TransitionScene");
                if (transitionScene?.startTransition) {
                    transitionScene.startTransition("PlayScene", data);
                } else {
                    this.scene.scene.start("PlayScene", data);
                }
            }
        });
    }
}