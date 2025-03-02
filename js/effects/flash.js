export function createFlash(scene, durationIn = 100, durationOut = 1000) {
    let flash = scene.add.rectangle(640, 360, 1280, 720, 0xffffff).setAlpha(0);

    // Fade in rápido
    scene.tweens.add({
        targets: flash,
        alpha: 1,
        duration: durationIn,
        ease: 'Linear',
        onComplete: () => {
            // Fade out lento
            scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: durationOut,
                ease: 'Linear'
            });
        }
    });
}
