export class CameraController {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.defaultZoom = 1;
        this.bopZoom = 1.01; // Reduced zoom intensity (from 1.02 to 1.01)
        this.lastSectionTime = 0;
        this.sectionInterval = 0;
        this.isBopping = false;
        this.zoomTween = null;
        this.isZooming = false;
    }

    initialize(sectionLength = 1600) { // Default section length (16 steps at 100 BPM)
        this.sectionInterval = sectionLength;
        this.camera.setZoom(this.defaultZoom);
    }

    update(songPosition) {
        if (!this.isBopping) return;

        // Check for section change
        if (songPosition > this.lastSectionTime + this.sectionInterval) {
            this.bopToSection();
            this.lastSectionTime = songPosition - (songPosition % this.sectionInterval);
        }
    }

    bopToSection() {
        if (this.isZooming) return;

        // Cancel previous tween if exists
        if (this.zoomTween) {
            this.zoomTween.stop();
        }

        this.isZooming = true;

        // Faster and gentler zoom in/out animation
        this.zoomTween = this.scene.tweens.add({
            targets: this.camera,
            zoom: this.bopZoom,
            duration: 100, // Reduced from 200 to 100
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.zoomTween = this.scene.tweens.add({
                    targets: this.camera,
                    zoom: this.defaultZoom,
                    duration: 150, // Reduced from 300 to 150
                    ease: 'Quad.easeIn', // Changed from easeInOut to easeIn for faster return
                    onComplete: () => {
                        this.isZooming = false;
                    }
                });
            }
        });
    }

    startBoping() {
        this.isBopping = true;
        this.lastSectionTime = 0;
        this.isZooming = false;
    }

    stopBoping() {
        this.isBopping = false;
        this.isZooming = false;
        if (this.zoomTween) {
            this.zoomTween.stop();
        }
        this.camera.setZoom(this.defaultZoom);
    }

    setDefaultZoom(zoom) {
        this.defaultZoom = zoom;
        this.camera.setZoom(zoom);
    }

    setBopIntensity(intensity) {
        // Even more reduced intensity range
        this.bopZoom = 1 + (intensity * 0.003); // Reduced from 0.005 to 0.003
    }

    reset() {
        this.stopBoping();
        this.setDefaultZoom(1);
        this.bopZoom = 1.01; // Updated default bop zoom
        this.lastSectionTime = 0;
        this.isZooming = false;
    }
}