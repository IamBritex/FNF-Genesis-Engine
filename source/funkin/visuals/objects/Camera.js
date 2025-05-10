export class CameraController {
    constructor(scene) {
        this.scene = scene;
        
        // Crear cámaras
        this.gameCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
        this.uiCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
        
        // Configuración inicial
        this.gameCamera.setName('gameCamera');
        this.uiCamera.setName('uiCamera');
        
        // Configuración de zoom
        this.defaultZoom = 1;
        this.bopZoom = 1.05;
        this.currentZoom = this.defaultZoom;
        
        // Control de ritmo
        this.currentBPM = 100;
        this.beatInterval = 0;
        this.lastBeatTime = 0;
        this.beatCounter = 0;
        this.isBopping = false;
        
        // Desactivar la cámara principal
        scene.cameras.main.visible = false;
    }

    addToGameCamera(object) {
        if (!object) return;
        // Mostrar solo en gameCamera, ocultar en uiCamera
        this.uiCamera.ignore(object);
        this.gameCamera.ignore(object, false);
    }
    
    addToUICamera(object) {
        if (!object) return;
        // Mostrar solo en uiCamera, ocultar en gameCamera
        this.gameCamera.ignore(object);
        this.uiCamera.ignore(object, false);
    }

    // Método para iniciar el efecto de bop
    startBoping() {
        this.isBopping = true;
        this.lastBeatTime = 0;
        this.beatCounter = 0;
        this.currentZoom = this.defaultZoom;
    }

    // Método para detener el efecto de bop
    stopBoping() {
        this.isBopping = false;
        this.gameCamera.setZoom(this.defaultZoom);
        this.uiCamera.setZoom(this.defaultZoom);
    }

    // Actualizar el BPM y recalcular intervalos
    updateBPM(newBPM) {
        this.currentBPM = newBPM;
        this.beatInterval = (60000 / this.currentBPM); // Duración de un beat en ms
    }

    // Método principal de actualización
    update(songPosition, time, delta) {
        // simular el elapsed de flixel lol
        const elapsed = delta / 1000;
        
        if (!this.isBopping) return;

        // Calcular si estamos en un nuevo beat
        if (songPosition >= this.lastBeatTime + this.beatInterval) {
            this.lastBeatTime = songPosition;
            this.beatCounter++;
            
            // Hacer bop cada 4 beats
            if (this.beatCounter % 4 === 0) {
                this.currentZoom = this.bopZoom;
            }
        }

        // Aplicar interpolación suave
        this.currentZoom = Phaser.Math.Linear(this.defaultZoom, this.currentZoom, Math.exp(-elapsed * 3.125));
        
        // Aplicar el zoom a ambas cámaras
        this.gameCamera.setZoom(this.currentZoom);
        this.uiCamera.setZoom(this.currentZoom);
    }

    // Método para forzar un bop manualmente
    triggerBop() {
        this.currentZoom = this.bopZoom;
    }

    // Restablecer configuración
    reset() {
        this.stopBoping();
        this.defaultZoom = 1;
        this.bopZoom = 1.05;
        this.lastBeatTime = 0;
        this.beatCounter = 0;
    }
}