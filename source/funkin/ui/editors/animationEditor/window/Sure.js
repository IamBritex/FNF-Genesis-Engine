import { ModularWindow } from '../../utils/window.js';

export class SureWindow {
    /**
     * @param {Phaser.Scene} scene
     * @param {Function} onYes Callback para "Sí!"
     * @param {Function} onSaveAndYes Callback para "Sí, pero guardo..."
     * @param {Function} onNo Callback para "NO"
     */
    constructor(scene, onYes, onSaveAndYes, onNo) {
        this.scene = scene;
        
        const config = {
            width: 500,
            height: 250,
            title: '¡Cuidado!',
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

        this.windowInstance.onDestroy = onNo; 

        this.addListeners(onYes, onSaveAndYes, onNo);
    }

    createContent() {
        return `
            <div class="sure-container">
                <p>¿Estás seguro que quieres abrir un personaje distinto?</p>
                <p class="warning-text">¡Si no has guardado este, se perderá para siempre! (eso es mucho tiempo xd)</p>
                <div class="sure-buttons">
                    <button id="btn-sure-yes" class="btn-danger">¡Si!</button>
                    <button id="btn-sure-save" class="btn-safe">Si, pero guardo...</button>
                    <button id="btn-sure-no" class="btn-cancel">NO</button>
                </div>
            </div>
        `;
    }

    createStyles() {
        return `
            .sure-container { padding: 20px; text-align: center; font-family: 'VCR', sans-serif; color: white; }
            .warning-text { color: #ff6666; font-size: 14px; margin-bottom: 30px; }
            .sure-buttons { display: flex; justify-content: space-around; gap: 10px; }
            .sure-buttons button {
                padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; 
                font-family: 'VCR', sans-serif; font-size: 14px; font-weight: bold; color: white;
            }
            .btn-danger { background-color: #c93a3a; }
            .btn-danger:hover { background-color: #e04f4f; }
            .btn-safe { background-color: #3ac960; }
            .btn-safe:hover { background-color: #4fdb70; }
            .btn-cancel { background-color: #555; }
            .btn-cancel:hover { background-color: #777; }
        `;
    }

    addListeners(onYes, onSaveAndYes, onNo) {
        const node = this.windowInstance.domElement.node;

        node.querySelector('#btn-sure-yes').addEventListener('click', () => {
            this.windowInstance.onDestroy = null;
            this.windowInstance.destroy();
            if (onYes) onYes();
        });

        node.querySelector('#btn-sure-save').addEventListener('click', () => {
            this.windowInstance.onDestroy = null;
            this.windowInstance.destroy();
            if (onSaveAndYes) onSaveAndYes();
        });

        node.querySelector('#btn-sure-no').addEventListener('click', () => {
            this.windowInstance.destroy(); // Dispara onDestroy -> onNo
        });
    }
}