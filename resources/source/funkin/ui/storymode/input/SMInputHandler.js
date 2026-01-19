import { SMInputKeyboard } from './SMInputKeyboard.js';
import { SMInputGamepad } from './SMInputGamepad.js';
import { SMInputMobile } from './SMInputMobile.js';

export class SMInputHandler {
    constructor(menuHandler) {
        this.menuHandler = menuHandler;
        this.scene = menuHandler.scene;
        
        this.keyboard = new SMInputKeyboard(this);
        this.gamepad = new SMInputGamepad(this);
        this.mobile = new SMInputMobile(this);
    }

    setup() {
        this.keyboard.setup();
        this.mobile.setup();
    }

    update(time, delta) {
        this.gamepad.update(time, delta);
    }

    destroy() {
        this.keyboard.destroy();
        this.mobile.destroy();
    }

    async navigateWeek(direction) {
        await this.menuHandler.changeWeek(direction);
        this.scene.sound.play('scrollSound');
    }

    navigateDifficulty(direction) {
        if (direction === -1) {
            this.scene.leftDifficultyArrow.play('leftConfirm');
            this.menuHandler.changeDifficulty(-1);
        } else {
            this.scene.rightDifficultyArrow.play('rightConfirm');
            this.menuHandler.changeDifficulty(1);
        }
        this.scene.sound.play('scrollSound');
    }

    releaseDifficulty(direction) {
        if (direction === -1) {
            this.scene.leftDifficultyArrow.play('leftIdle');
        } else {
            this.scene.rightDifficultyArrow.play('rightIdle');
        }
    }

    confirm() {
        this.menuHandler.handleConfirm();
    }

    back() {
        this.menuHandler.handleBack();
    }
}