import "../funkin/API/genesis.js";
import "../core/phaser/game.js";

// 2. CARGAR ESCENAS (En orden, ahora window.game ya existe)
// Nota: Phaser cargará estos scripts y ellos se auto-registrarán con game.scene.add
import "../funkin/effects/TransitionScene.js";
import "../funkin/play/PlayState.js";
import "../funkin/ui/storymode/StoryModeState.js";
import "../funkin/ui/freeplay/FreeplayState.js";
import "../funkin/effects/flash.js";
import "../funkin/ui/intro/introText.js";
import "../funkin/ui/intro/introDance.js";
import "../funkin/ui/mainmenu/MainMenuState.js";
import "../funkin/ui/editors/menu.js";
import "../funkin/ui/editors/stageEditor/StageEditor.js";
import "../funkin/ui/editors/character/CharacterEditor.js";
import "../funkin/ui/credits/CreditsState.js";
import "../funkin/ui/multiplayer/rooms.js";

console.log("Sistema de módulos cargado en orden correcto.");