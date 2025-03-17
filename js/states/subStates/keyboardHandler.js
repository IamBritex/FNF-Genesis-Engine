export function setupKeyboardControls(scene) {
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    scene.backKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);

    scene.input.keyboard.on('keydown', (event) => {
        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.UP) {
            scene.moveSelection(-1);
            scene.sound.play('scrollSound');
        } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.DOWN) {
            scene.moveSelection(1);
            scene.sound.play('scrollSound');
        } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER) {
            scene.selectOption();
            scene.sound.play('selectSound');
        } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.BACKSPACE) {
            scene.sound.play('cancelSound');
            scene.exitOptionsMenu();
        }
    });
}