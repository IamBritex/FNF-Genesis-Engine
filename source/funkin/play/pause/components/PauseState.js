import { PauseConfig } from "../options.js";

export class PauseState {
    constructor() {
        this.menuItems = [];
        this.currentSelection = 0;
        
        // Datos de la partida
        this.songName = "Unknown";
        this.difficulty = "Normal";
        this.deathCounter = 0;
    }

    init(data) {
        this.songName = data.songName || "Unknown";
        this.difficulty = data.difficulty || "Normal";
        this.deathCounter = data.deaths || 0;

        // Cargar opciones desde config o default
        const rawOptions = (PauseConfig && PauseConfig.options) ? PauseConfig.options : [
            { name: "Resume", action: "resume" },
            { name: "Restart", action: "restart" },
            { name: "Exit", action: "exit" }
        ];

        this.menuItems = rawOptions;
        this.currentSelection = 0;
    }

    changeSelection(change) {
        this.currentSelection += change;
        
        // Wrap around (bucle)
        if (this.currentSelection >= this.menuItems.length) this.currentSelection = 0;
        if (this.currentSelection < 0) this.currentSelection = this.menuItems.length - 1;
        
        return this.currentSelection;
    }

    getCurrentAction() {
        return this.menuItems[this.currentSelection].action;
    }
}