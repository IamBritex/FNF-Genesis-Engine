import { PlayEvents } from "../PlayEvents.js";

/**
 * Camera.js
 * Módulo para gestionar las 4 cámaras principales de PlayScene.
 */
export class CameraManager {

    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        const { width, height } = scene.cameras.main;

        // 1. gameCamera (Principal)
        this.gameCamera = scene.cameras.main;
        this.gameCamera.setName('gameCamera');
        this.gameCamera.setZoom(1);

        // 2. UICamera (Interfaz estática)
        this.UICamera = scene.cameras.add(0, 0, width, height);
        this.UICamera.setName('UICamera');
        this.UICamera.setScroll(0, 0);

        // 3. FXCamera (Efectos visuales)
        this.FXCamera = scene.cameras.add(0, 0, width, height);
        this.FXCamera.setName('FXCamera');
        this.FXCamera.setScroll(0, 0);

        // 4. HUDCamera (Capa superior/Menús)
        this.HUDCamera = scene.cameras.add(0, 0, width, height);
        this.HUDCamera.setName('HUDCamera');
        this.HUDCamera.setScroll(0, 0);

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.scene.events.on(PlayEvents.CAMERA_ZOOM, this.onZoom, this);
        this.scene.events.on(PlayEvents.CAMERA_SHAKE, this.onShake, this);
        this.scene.events.on(PlayEvents.CAMERA_FLASH, this.onFlash, this);
        this.scene.events.on(PlayEvents.CAMERA_FADE, this.onFade, this);
        this.scene.events.on(PlayEvents.CAMERA_PAN, this.onPan, this);
        this.scene.events.on(PlayEvents.CAMERA_FOLLOW, this.onFollow, this);
        this.scene.events.on(PlayEvents.CAMERA_SNAP, this.onSnap, this);
        
        // [NUEVO] Reaccionar al Botplay
        this.scene.events.on(PlayEvents.BOTPLAY_CHANGED, this.onBotPlayChanged, this);
    }

    // --- Manejadores de Eventos ---

    onBotPlayChanged(isBot) {
        // En modo "Showcase" (Botplay), a menudo se oculta la UI para grabar
        const isVisible = !isBot;
        
        if (this.UICamera) this.UICamera.setVisible(isVisible);
        if (this.HUDCamera) this.HUDCamera.setVisible(isVisible);
        
        console.log(`[CameraManager] UI Visibility set to ${isVisible} due to Botplay`);
    }

    onZoom(data) {
        const zoom = data.zoom || 1;
        const duration = data.duration || 1000;
        const ease = data.ease || 'Linear';

        if (duration > 0) {
            this.gameCamera.zoomTo(zoom, duration, ease);
        } else {
            this.gameCamera.setZoom(zoom);
        }
    }

    onShake(data) {
        const intensity = data.intensity || 0.05;
        const duration = data.duration || 500;
        
        this.gameCamera.shake(duration, intensity);
        
        if (intensity > 0.03) {
            this.UICamera.shake(duration, intensity * 0.5);
        }
    }

    onFlash(data) {
        const duration = data.duration || 500;
        const color = data.color !== undefined ? data.color : 0xFFFFFF;
        
        this.gameCamera.flash(duration, (color >> 16 & 0xFF), (color >> 8 & 0xFF), (color & 0xFF));
        this.UICamera.flash(duration, (color >> 16 & 0xFF), (color >> 8 & 0xFF), (color & 0xFF));
    }

    onFade(data) {
        const duration = data.duration || 500;
        const color = data.color !== undefined ? data.color : 0x000000;
        
        this.gameCamera.fade(duration, (color >> 16 & 0xFF), (color >> 8 & 0xFF), (color & 0xFF));
        this.UICamera.fade(duration, (color >> 16 & 0xFF), (color >> 8 & 0xFF), (color & 0xFF));
    }

    onPan(data) {
        if (data.duration && data.duration > 0) {
            this.gameCamera.pan(data.x, data.y, data.duration, 'Sine.easeInOut');
        } else {
            this.gameCamera.centerOn(data.x, data.y);
        }
    }

    onFollow(data) {
        if (data.target) {
            const lx = data.lerpX || 0.04;
            const ly = data.lerpY || 0.04;
            this.gameCamera.startFollow(data.target, false, lx, ly);
        } else {
            this.gameCamera.stopFollow();
        }
    }

    onSnap(data) {
        this.gameCamera.stopFollow();
        this.gameCamera.setScroll(data.x - this.gameCamera.width / 2, data.y - this.gameCamera.height / 2);
    }

    // --- Métodos de Asignación ---

    assignToGame(gameObject) {
        this.UICamera.ignore(gameObject);
        this.FXCamera.ignore(gameObject);
        this.HUDCamera.ignore(gameObject);
    }

    assignToUI(gameObject) {
        this.gameCamera.ignore(gameObject);
        this.FXCamera.ignore(gameObject);
        this.HUDCamera.ignore(gameObject);
    }

    assignToFX(gameObject) {
        this.gameCamera.ignore(gameObject);
        this.UICamera.ignore(gameObject);
        this.HUDCamera.ignore(gameObject);
    }

    assignToHUD(gameObject) {
        this.gameCamera.ignore(gameObject);
        this.UICamera.ignore(gameObject);
        this.FXCamera.ignore(gameObject);
    }

    shutdown(scene) {
        scene.events.off(PlayEvents.CAMERA_ZOOM, this.onZoom, this);
        scene.events.off(PlayEvents.CAMERA_SHAKE, this.onShake, this);
        scene.events.off(PlayEvents.CAMERA_FLASH, this.onFlash, this);
        scene.events.off(PlayEvents.CAMERA_FADE, this.onFade, this);
        scene.events.off(PlayEvents.CAMERA_PAN, this.onPan, this);
        scene.events.off(PlayEvents.CAMERA_FOLLOW, this.onFollow, this);
        scene.events.off(PlayEvents.CAMERA_SNAP, this.onSnap, this);
        scene.events.off(PlayEvents.BOTPLAY_CHANGED, this.onBotPlayChanged, this);

        if (this.UICamera) scene.cameras.remove(this.UICamera);
        if (this.FXCamera) scene.cameras.remove(this.FXCamera);
        if (this.HUDCamera) scene.cameras.remove(this.HUDCamera);

        this.gameCamera = null;
        this.UICamera = null;
        this.FXCamera = null;
        this.HUDCamera = null;
        this.scene = null;
    }
}