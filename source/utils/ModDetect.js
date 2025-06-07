export class ModDetect {
    constructor() {
        this.modList = new Map();
        this.currentMod = null;
        this.isMod = false;
        this.init();
    }

    async init() {
        try {
            const response = await fetch('public/ModList.txt');
            
            if (!response.ok) {
                console.log('No hay ningún mod instalado');
                return;
            }

            const content = await response.text();
            const mods = content.split('\n')
                              .map(mod => mod.trim())
                              .filter(mod => mod.length > 0);

            if (mods.length === 0) {
                console.log('No hay ningún mod instalado');
                return;
            }

            for (const mod of mods) {
                try {
                    const modPath = `public/mods/${mod}`;
                    // Primero verificamos si existe weekList.txt
                    const weekListResponse = await fetch(`${modPath}/data/weekList.txt`);
                    
                    if (weekListResponse.ok) {
                        const weekList = await weekListResponse.text();
                        this.modList.set(mod, {
                            name: mod,
                            path: modPath,
                            weekList: weekList.trim().split('\n').map(week => week.trim()),
                            data: {}
                        });
                        
                        // Establecer el primer mod como activo por defecto
                        if (!this.currentMod) {
                            this.setCurrentMod(mod);
                        }
                    }
                } catch (error) {
                    console.warn(`Error cargando el mod ${mod}:`, error);
                }
            }
        } catch (error) {
            console.warn('Error leyendo ModList.txt:', error);
        }
    }

    setCurrentMod(modName) {
        if (this.modList.has(modName)) {
            this.currentMod = this.modList.get(modName);
            this.isMod = true;
            return true;
        }
        this.currentMod = null;
        this.isMod = false;
        return false;
    }

    getCurrentMod() {
        return this.currentMod;
    }

    getModList() {
        return Array.from(this.modList.keys());
    }

    isModActive() {
        return this.isMod;
    }

    getModWeekList() {
        return this.currentMod ? this.currentMod.weekList : [];
    }
}

export const ModManager = new ModDetect();