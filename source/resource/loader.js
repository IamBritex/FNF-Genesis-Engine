/**
 * loader.js
 * Carga secuencial con cálculo de progreso real (0.0 a 1.0).
 */
import ModHandler from "../core/ModHandler.js";

// Variables globales para el progreso
window.isGameLoaded = false;
window.loadProgress = 0; // Va de 0.0 a 1.0

const modulesToLoad = [
    { name: "Phaser Core", path: "../core/phaser/game.js" },
    { name: "Screen Shoot", path: "../core/scrinshot.js" },
    { name: "Transitions", path: "../funkin/effects/TransitionScene.js" },
    { name: "Play Scene", path: "../funkin/play/PlayScene.js" },
    { name: "Pause Menu", path: "../funkin/play/pause/Pause.js" },
    { name: "Story Mode", path: "../funkin/ui/storymode/StoryModeScene.js" },
    { name: "Freeplay", path: "../funkin/ui/freeplay/FreeplayScene.js" },
    { name: "Effects", path: "../funkin/effects/flash.js" },
    { name: "Intro Text", path: "../funkin/ui/intro/introText.js" },
    { name: "Intro Dance", path: "../funkin/ui/intro/introDance.js" },
    { name: "Main Menu", path: "../funkin/ui/mainmenu/MainMenuScene.js" },
    { name: "Editors", path: "../funkin/ui/editors/Editor.js" },
    { name: "Credits", path: "../funkin/ui/credits/CreditsScene.js" },
    { name: "Multiplayer", path: "../funkin/ui/multiplayer/rooms.js" },
    { name: "Options", path: "../funkin/ui/options/OptionsScene.js" }
];

async function loadGameModules() {
    try {
        // Calculamos el total de pasos:
        // 1 (Genesis) + 1 (ModHandler) + N (Módulos)
        const totalSteps = 2 + modulesToLoad.length;
        let currentStep = 0;

        // Función auxiliar para actualizar progreso
        const updateProgress = () => {
            currentStep++;
            window.loadProgress = currentStep / totalSteps;
            // console.log(`Carga: ${(window.loadProgress * 100).toFixed(0)}%`);
        };

        // --- PASO 1: CARGAR GENESIS ---
        const genesisModule = await import("../funkin/API/genesis.js");
        if (!window.Genesis && genesisModule.default) {
            window.Genesis = genesisModule.default;
        }
        updateProgress(); // Progreso ++

        // --- PASO 2: INICIALIZAR MODS ---
        if (ModHandler && ModHandler.init) {
            await ModHandler.init();
        }
        updateProgress(); // Progreso ++

        // --- PASO 3: CARGAR EL RESTO ---
        for (const mod of modulesToLoad) {
            await import(mod.path);
            updateProgress(); // Progreso ++ por cada módulo
        }

        console.log("Carga completada al 100%");
        window.isGameLoaded = true;
        window.loadProgress = 1; // Aseguramos el final

    } catch (error) {
        console.error("Error crítico cargando el juego:", error);
    }
}

loadGameModules();