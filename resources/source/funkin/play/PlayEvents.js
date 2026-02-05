/**
 * PlayEvents.js
 * Fuente de verdad centralizada para el sistema de eventos de PlayScene.
 * Define las claves de eventos y documenta la estructura de datos (payload) que transportan.
 * * @global Ahora accesible globalmente como window.PlayEvents
 */
export class PlayEvents {
    // ===========================================================================
    // CÁMARA
    // ===========================================================================

    /**
     * Cambia el zoom de la cámara principal.
     * @example this.scene.events.emit(PlayEvents.CAMERA_ZOOM, { zoom: 1.5, duration: 500, ease: 'Sine.out' });
     * @payload { zoom: number, duration: number, ease: string }
     */
    static get CAMERA_ZOOM() { return 'camera_zoom'; }

    /**
     * Sacude la cámara (impacto).
     * @example this.scene.events.emit(PlayEvents.CAMERA_SHAKE, { intensity: 0.05, duration: 200 });
     * @payload { intensity: number, duration: number, direction: string }
     */
    static get CAMERA_SHAKE() { return 'camera_shake'; }

    /**
     * Destello blanco en pantalla (Flash).
     * @example this.scene.events.emit(PlayEvents.CAMERA_FLASH, { color: 0xFFFFFF, duration: 500 });
     * @payload { duration: number, color: number }
     */
    static get CAMERA_FLASH() { return 'camera_flash'; }

    /**
     * Fundido a un color (Fade).
     * @example this.scene.events.emit(PlayEvents.CAMERA_FADE, { color: 0x000000, duration: 1000 });
     * @payload { duration: number, color: number, force: boolean }
     */
    static get CAMERA_FADE() { return 'camera_fade'; }

    /**
     * Mueve la cámara a una posición específica (Pan).
     * @example this.scene.events.emit(PlayEvents.CAMERA_PAN, { x: 500, y: 500, duration: 1000 });
     * @payload { x: number, y: number, duration: number }
     */
    static get CAMERA_PAN() { return 'camera_pan'; }

    /**
     * Hace que la cámara siga a un objeto (ej. Personaje).
     * @example this.scene.events.emit(PlayEvents.CAMERA_FOLLOW, { target: spriteBf, lerpX: 0.04 });
     * @payload { target: GameObject, lerpX: number, lerpY: number }
     */
    static get CAMERA_FOLLOW() { return 'camera_follow'; }

    /**
     * Teletransporta la cámara inmediatamente a una posición.
     * @payload { x: number, y: number }
     */
    static get CAMERA_SNAP() { return 'camera_snap'; }


    // ===========================================================================
    // INPUT Y CONTROLES
    // ===========================================================================

    /**
     * Se emite cuando el usuario presiona una tecla de nota o botón de mando.
     * @payload number (0=Izquierda, 1=Abajo, 2=Arriba, 3=Derecha)
     */
    static get INPUT_NOTE_DOWN() { return 'input_note_down'; }

    /**
     * Se emite cuando el usuario suelta una tecla de nota.
     * @payload number (0=Izquierda, 1=Abajo, 2=Arriba, 3=Derecha)
     */
    static get INPUT_NOTE_UP() { return 'input_note_up'; }

    /** Se solicita pausar el juego (desde InputHandler o pérdida de foco). @payload null */
    static get PAUSE_CALL() { return 'pause_call'; }

    /** Se solicita reiniciar la canción (R key o Menú). @payload null */
    static get RESET_CALL() { return 'reset_call'; }

    /** Movimiento manual de cámara para debug. @payload { x: number, y: number } */
    static get DEBUG_CAMERA_MOVE() { return 'debug_camera_move'; }

    /** Indica que se activó/desactivó el modo Botplay. @payload boolean */
    static get BOTPLAY_CHANGED() { return 'botplay_changed'; }


    // ===========================================================================
    // GAMEPLAY (Notas y Juicio)
    // ===========================================================================

    /**
     * Se emite cuando una nota es golpeada exitosamente (Jugador o Enemigo).
     * @payload { note: object, rating: string, timeDiff: number, isPlayer: boolean, direction: number }
     */
    static get NOTE_HIT() { return 'note_hit'; }

    /**
     * Se emite cuando el jugador falla una nota o presiona sin haber notas (Ghost tapping off).
     * @payload { note: object, isPlayer: boolean, direction: number, muteVocals: boolean }
     */
    static get NOTE_MISS() { return 'note_miss'; }

    /**
     * Se emite cuando el valor de salud cambia (por hit, miss, o script).
     * Escuchado por HealthBar y GameReferee.
     * @payload { value: number, max: number }
     */
    static get HEALTH_CHANGED() { return 'health_changed'; }

    /**
     * Se emite cuando cambia la puntuación, misses o precisión.
     * Escuchado por RatingText.
     * @payload { score: number, misses: number, accuracy: number }
     */
    static get SCORE_CHANGED() { return 'score_changed'; }


    // ===========================================================================
    // ESTADO DEL JUEGO
    // ===========================================================================

    /** El jugador perdió toda la vida. Iniciar secuencia de muerte. @payload null */
    static get GAME_OVER() { return 'game_over'; }

    /** Salir de PlayScene hacia el menú principal o Freeplay. @payload null */
    static get EXIT_TO_MENU() { return 'exit_to_menu'; }

    /** Reiniciar la canción actual. @payload { newData: object } (Opcional) */
    static get RESTART_SONG() { return 'restart_song'; }


    // ===========================================================================
    // CICLO DE CANCIÓN Y SINCRONIZACIÓN
    // ===========================================================================

    /** La canción (audio) ha comenzado a sonar. @payload { duration: number } */
    static get SONG_START() { return 'song_start'; }

    /** El audio de la canción terminó. @payload null */
    static get SONG_COMPLETE() { return 'song_complete'; }

    /** Todos los assets y datos están cargados, la pantalla de carga puede irse. @payload { healthBar: HealthBar, ratingText: RatingText } */
    static get SONG_LOADING_COMPLETE() { return 'song_loading_complete'; }

    /** Se emite en cada golpe de ritmo (negra). @payload number (número de beat) */
    static get BEAT_HIT() { return 'beat_hit'; }

    /** Se emite en cada paso (semicorchea). @payload number (número de step) */
    static get STEP_HIT() { return 'step_hit'; }
}

// [IMPORTANTE] Asignación global para acceso sin importaciones en mods
window.PlayEvents = PlayEvents;