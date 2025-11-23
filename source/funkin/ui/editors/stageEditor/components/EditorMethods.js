import { WelcomeWindow } from '../window/WelcomeWindow.js';
import { SureWindow } from '../window/Sure.js';
import { FindWindow } from '../window/FindWindow.js';
import { KeybindingsWindow } from '../window/KeybindingsWindow.js'; 
import { openExternalLink } from '../../utils/System.js'; 

/**
 * Agrupa métodos de utilidad que actúan directamente sobre la escena del editor,
 * gestionando la UI, los elementos y el estado.
 */
export class EditorMethods {

    /**
     * @param {import('../StageEditor.js').StageEditor} scene La instancia de la escena StageEditor.
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Inicia el flujo para crear una nueva escena.
     */
    requestNewScene() {
        const scene = this.scene;
        
        if (scene.actionHistory && scene.actionHistory.undoStack.length > 0) {
            new SureWindow(
                scene,
                scene.stageManager.currentStageName,
                () => { // "SI!"
                    this.createNewScene();
                    this.openWelcomeWindow();
                },
                () => { // "Guardar y crear"
                    scene.saveManager.save();
                    this.createNewScene();
                    this.openWelcomeWindow();
                },
                () => { // "Olvidalo..."
                }
            );
        } else {
            this.createNewScene();
            this.openWelcomeWindow();
        }
    }
    
    /**
     * Inicia el flujo para cargar un escenario reciente.
     * @param {string} stageName El nombre del escenario a cargar.
     */
    requestLoadRecent(stageName) {
        const scene = this.scene;
        
        if (scene.actionHistory && scene.actionHistory.undoStack.length > 0) {
            new SureWindow(
                scene,
                scene.stageManager.currentStageName,
                () => { // "SI!"
                    this.createNewScene();
                    scene.loadStageMethod(stageName);
                },
                () => { // "Guardar y crear"
                    scene.saveManager.save();
                    this.createNewScene();
                    scene.loadStageMethod(stageName);
                },
                () => { // "Olvidalo..."
                }
            );
        } else {
            this.createNewScene();
            scene.loadStageMethod(stageName);
        }
    }

    /**
     * Limpia la escena actual (elementos, historial, stage).
     */
    createNewScene() {
        console.log("Limpiando escena actual...");
        const scene = this.scene;

        if (scene.elementsManager) {
            scene.elementsManager.clearSelection();
        }
        if (scene.actionHistory) {
            scene.actionHistory.clear();
        }
        if (scene.stageManager) {
            scene.stageManager.cleanupStage();
        }

        if (scene.elementsManager && scene.elementsManager.registeredElements) {
            const elementsToDestroy = [...scene.elementsManager.registeredElements];
            
            for (const el of elementsToDestroy) {
                if (el && el.active) {
                    const charName = el.getData('characterName');
                    if (charName !== 'Player (BF)' && 
                        charName !== 'Opponent (Dad)' && 
                        charName !== 'Girlfriend (GF)') 
                    {
                        el.destroy();
                    }
                }
            }
        }
        
        if (scene.layersPanel) {
            scene.layersPanel.refreshList();
        }
    }

    /**
     * Abre la ventana de bienvenida y MUESTRA LA UI del editor.
     */
    openWelcomeWindow() {
        // Mostrar la UI del editor que estaba oculta durante la carga
        if (this.scene.navBar && this.scene.navBar.domElement) {
            this.scene.navBar.domElement.node.classList.remove('hidden-ui');
        }
        if (this.scene.layersPanel && this.scene.layersPanel.domElement) {
            this.scene.layersPanel.domElement.node.classList.remove('hidden-ui');
        }
        
        if (this.scene.welcomeWindow) return;
        
        this.scene.welcomeWindow = new WelcomeWindow(this.scene);
        this.scene.setAsHUDElement(this.scene.welcomeWindow.domElement);
    }
    
    /**
     * Abre la ventana de búsqueda de elementos.
     */
    openFindWindow() {
        if (this.scene.findWindow) {
            this.scene.findWindow.windowInstance.destroy();
        }
        
        this.scene.findWindow = new FindWindow(
            this.scene, 
            this.scene.elementsManager, 
            this.scene.cameraEditor
        );
        
        this.scene.findWindow.onDestroy = () => {
            this.scene.findWindow = null;
        };
    }
    
    /**
     * Abre la ventana de atajos de teclado.
     */
    openKeybindingsWindow() {
        if (this.scene.keybindingsWindow) {
            this.scene.keybindingsWindow.windowInstance.destroy();
        }
        
        this.scene.keybindingsWindow = new KeybindingsWindow(this.scene);
        
        this.scene.keybindingsWindow.onDestroy = () => {
            this.scene.keybindingsWindow = null;
        };
    }
    
    /**
     * Abre la URL de la documentación.
     */
    openDocumentation() {
        openExternalLink('https://iambritex.github.io/FNF-Genesis-Engine-Wiki/');
    }
    
    /**
     * Abre la URL de YouTube.
     */
    openYoutube() {
        openExternalLink('https://www.youtube.com/@ImBritex');
    }

    /**
     * Muestra u oculta las líneas del piso en el editor.
     */
    toggleFloor() {
        this.scene.isFloorVisible = !this.scene.isFloorVisible;
        if (!this.scene.isFloorVisible) {
            this.scene.floorLines.clear();
        }
    }

    /**
     * Dibuja (o borra) las líneas de piso para los personajes base.
     */
    drawFloorLines() {
        if (!this.scene.isFloorVisible || !this.scene.floorLines) return;
        this.scene.floorLines.clear();
        
        const sprites = this.scene.stageCharacters?.characterHandler?.characterElements || {};
        const { bf, dad, gf } = sprites;
        const lineWidth = 8000;
        const lineThickness = 2 / this.scene.gameCam.zoom;

        const drawLineFor = (sprite, color) => {
            if (sprite && sprite.active) {
                const bottomY = sprite.y + sprite.displayHeight;
                const centerX = sprite.x + (sprite.displayWidth / 2);
                this.scene.floorLines.lineStyle(lineThickness, color, 1);
                this.scene.floorLines.strokeLineShape(
                    new Phaser.Geom.Line(centerX - (lineWidth / 2), bottomY, centerX + (lineWidth / 2), bottomY)
                );
            }
        };
        drawLineFor(bf, 0xff0000);
        drawLineFor(dad, 0x00ff00);
        drawLineFor(gf, 0x0000ff);
    }
}