/**
 * altAnimation.js
 * Script Global: Cambia la animación de un personaje temporalmente.
 */

export function define(params, game) {
    // params = { characterType: "player1", animation: "hey", duration: 2200 }

    console.log(`[Script] Evento altAnimation:`, params);

    let character = null;

    // Seleccionar personaje
    switch (params.characterType) {
        case "player1": character = game.charactersHandler.bf; break;
        case "player2": // Fallback
        case "opponent": character = game.charactersHandler.dad; break;
        case "gf": character = game.charactersHandler.gf; break;
    }

    if (character) {
        // [CORREGIDO] Usar playAnim() en lugar de play()
        // playAnim maneja internamente el nombre real de la animación (ej: char_bf_ID_hey)
        character.playAnim(params.animation, true);

        // Bloquear interrupciones
        character.setData("specialAnim", true);

        // Volver a bailar después del tiempo
        game.time.delayedCall(params.duration, () => {
            character.setData("specialAnim", false);

            // [CORREGIDO] Ahora character.dance() existe gracias a CharacterElements.js
            if (typeof character.dance === 'function') {
                character.dance();
            }
        });
    } else {
        console.warn("[Script] Personaje no encontrado:", params.characterType);
    }
}