/**
 * loader.js
 * Carga secuencial de módulos para actualizar la UI de carga.
 */

// Lista de módulos a cargar con su nombre visible
const modulesToLoad = [
    { name: "Genesis API", path: "../funkin/API/genesis.js" },
    { name: "Phaser Core", path: "../core/phaser/game.js" },
    { name: "Transitions", path: "../funkin/effects/TransitionScene.js" },
    { name: "Play Scene", path: "../funkin/play/PlayScene.js" },
    { name: "Story Mode", path: "../funkin/ui/storymode/StoryModeScene.js" },
    { name: "Freeplay", path: "../funkin/ui/freeplay/FreeplayScene.js" },
    { name: "Effects", path: "../funkin/effects/flash.js" },
    { name: "Intro Text", path: "../funkin/ui/intro/introText.js" },
    { name: "Intro Dance", path: "../funkin/ui/intro/introDance.js" },
    { name: "Main Menu", path: "../funkin/ui/mainmenu/MainMenuScene.js" },
    { name: "Editors", path: "../funkin/ui/editors/menu.js" },
    { name: "Stage Editor", path: "../funkin/ui/editors/stageEditor/StageEditor.js" },
    { name: "Chart Editor", path: "../funkin/ui/editors/chartEditor/ChartEditor.js" },
    { name: "Anime uwu", path: "../funkin/ui/editors/animationEditor/animationEditor.js" },
    { name: "Credits", path: "../funkin/ui/credits/CreditsScene.js" },
    { name: "Multiplayer", path: "../funkin/ui/multiplayer/rooms.js" }
];

async function loadGameModules() {
    const textElement = document.getElementById('loader-text');
    
    try {
        // Recorremos la lista y cargamos uno por uno
        for (const mod of modulesToLoad) {
            if (textElement) {
                textElement.innerText = `Loading ${mod.name}...`;
            }

            await import(mod.path);
            
        }

        console.log("Todos los módulos cargados.");
        
        // 3. Finalizar carga
        const loader = document.getElementById('app-loader');
        if (loader) {
            if (textElement) textElement.innerText = "Ready!";
            
            // Transición de salida
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.remove();
            }, 500);
        }

    } catch (error) {
        console.error("Error cargando módulos:", error);
        if (textElement) {
            textElement.innerText = "Error Loading Game Assets";
            textElement.style.color = "red";
        }
    }
}

// Iniciar el proceso
loadGameModules();