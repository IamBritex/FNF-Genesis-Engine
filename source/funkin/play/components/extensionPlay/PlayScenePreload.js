/**
 * source/funkin/play/components/extensionPlay/PlayScenePreload.js
 * Módulo dedicado exclusivamente a la precarga de recursos estándar y críticos.
 */

// Imports de Componentes para llamar a sus preloads estáticos
import { HealthBar } from '../../health/healthBar.js';
import { TimeBar } from '../../components/timeBar.js';
import { Countdown } from '../../countDown.js';
import { PopUpManager } from '../../judgments/PopUpManager.js';

export class PlayScenePreload {
    /**
     * @param {Phaser.Scene} scene 
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Carga todos los recursos base necesarios para el PlayState.
     * @param {string} sessionId - ID de la sesión actual (para iconos)
     */
    preloadAll(sessionId) {
        console.log("[PlayScenePreload] Iniciando carga de recursos base...");

        this.loadFonts();
        this.loadUI(sessionId);
        this.loadAudio();
    }

    /**
     * Inyecta la fuente VCR en el DOM.
     */
    loadFonts() {
        const fontPath = "public/fonts/vcr.ttf";
        // Evitamos inyectar el estilo múltiples veces si ya existe
        if (!document.getElementById('font-vcr-osd')) {
            const style = document.createElement("style");
            style.id = 'font-vcr-osd';
            style.innerHTML = `
                @font-face {
                    font-family: 'VCR OSD Mono';
                    src: url('${fontPath}') format('truetype');
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Carga imágenes de interfaz. Incluye fallbacks de seguridad.
     */
    loadUI(sessionId) {
        // 1. Carga Explícita de Seguridad (Fallback)
        // Aseguramos que la imagen de la barra de tiempo exista
        if (!this.scene.textures.exists('timeBar')) {
            this.scene.load.image('timeBar', 'public/images/ui/timeBar.png');
        }
        
        // [ARREGLADO] Eliminada la carga de 'timeBarBG' porque TimeBar usa Graphics (dibujo por código)
        // if (!this.scene.textures.exists('timeBarBG')) ... <- ELIMINADO

        if (!this.scene.textures.exists('healthBar')) {
            this.scene.load.image('healthBar', 'public/images/ui/healthBar.png');
        }

        // 2. Carga Delegada (Métodos estáticos de los componentes)
        this._safePreload(HealthBar, sessionId);
        this._safePreload(TimeBar);
        this._safePreload(Countdown);
        this._safePreload(PopUpManager);
    }

    /**
     * Carga sonidos comunes del juego.
     */
    loadAudio() {
        if (!this.scene.cache.audio.exists('scrollMenu')) {
            this.scene.load.audio('scrollMenu', 'public/sounds/scrollMenu.ogg');
        }
        if (!this.scene.cache.audio.exists('breakfast')) {
            this.scene.load.audio('breakfast', 'public/music/breakfast.ogg');
        }
    }

    /**
     * Helper para llamar preloads estáticos de forma segura.
     */
    _safePreload(ClassRef, ...args) {
        if (ClassRef && typeof ClassRef.preload === 'function') {
            ClassRef.preload(this.scene, ...args);
        } else {
            console.warn(`[PlayScenePreload] ${ClassRef?.name || 'Componente'} no tiene método static preload().`);
        }
    }
}