import { ModularWindow } from '../../utils/window.js';

export class SureWindow {
    constructor(scene, stageName, onConfirm, onSaveAndConfirm, onCancel) {
        this.scene = scene;
        this.stageName = stageName || 'escenario sin nombre';

        const config = {
            width: 450,
            height: 'auto',
            title: '¿Estás seguro?',
            close: false,
            overlay: true,
            move: false,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };

        this.windowInstance = new ModularWindow(this.scene, config);
        
        if (this.scene.setAsHUDElement) {
            this.scene.setAsHUDElement(this.windowInstance.domElement);
        }

        this.windowInstance.onDestroy = onCancel; 

        this.addListeners(onConfirm, onSaveAndConfirm, onCancel);
    }

    createContent() {
        const template = this.scene.cache.text.get('html_sure');
        return template.replace('%STAGE_NAME%', this.stageName);
    }

    createStyles() {
        return this.scene.cache.text.get('css_sure');
    }

    addListeners(onConfirm, onSaveAndConfirm, onCancel) {
        const node = this.windowInstance.domElement.node;

        node.querySelector('#sure-yes').addEventListener('click', () => {
            onConfirm();
            this.windowInstance.destroy();
        });

        node.querySelector('#sure-save').addEventListener('click', () => {
            onSaveAndConfirm();
            this.windowInstance.destroy();
        });

        node.querySelector('#sure-cancel').addEventListener('click', () => {
            onCancel();
            this.windowInstance.destroy();
        });
    }
}