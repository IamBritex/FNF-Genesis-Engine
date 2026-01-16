export class SMInputKeyboard {
    constructor(handler) {
        this.handler = handler;
        this.scene = handler.scene;
        
        this.onKeyUp = () => this.handler.navigateWeek(-1);
        this.onKeyDown = () => this.handler.navigateWeek(1);
        this.onKeyLeft = () => this.handler.navigateDifficulty(-1);
        this.onKeyRight = () => this.handler.navigateDifficulty(1);
        this.onKeyEnter = () => this.handler.confirm();
        this.onKeyBack = () => this.handler.back();
        
        this.onKeyLeftUp = () => this.handler.releaseDifficulty(-1);
        this.onKeyRightUp = () => this.handler.releaseDifficulty(1);
    }

    setup() {
        const kb = this.scene.input.keyboard;
        kb.on('keydown-UP', this.onKeyUp);
        kb.on('keydown-DOWN', this.onKeyDown);
        kb.on('keydown-LEFT', this.onKeyLeft);
        kb.on('keydown-RIGHT', this.onKeyRight);
        kb.on('keydown-ENTER', this.onKeyEnter);
        kb.on('keydown-ESCAPE', this.onKeyBack);
        kb.on('keydown-BACKSPACE', this.onKeyBack);

        kb.on('keyup-LEFT', this.onKeyLeftUp);
        kb.on('keyup-RIGHT', this.onKeyRightUp);
    }

    destroy() {
        const kb = this.scene.input.keyboard;
        kb.off('keydown-UP', this.onKeyUp);
        kb.off('keydown-DOWN', this.onKeyDown);
        kb.off('keydown-LEFT', this.onKeyLeft);
        kb.off('keydown-RIGHT', this.onKeyRight);
        kb.off('keydown-ENTER', this.onKeyEnter);
        kb.off('keydown-ESCAPE', this.onKeyBack);
        kb.off('keydown-BACKSPACE', this.onKeyBack);

        kb.off('keyup-LEFT', this.onKeyLeftUp);
        kb.off('keyup-RIGHT', this.onKeyRightUp);
    }
}