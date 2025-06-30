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
                this.isMod = false;
                return;
            }

            const content = await response.text();
            const mods = content.split('\n')
                              .map(mod => mod.trim())
                              .filter(mod => mod.length > 0);

            if (mods.length === 0) {
                console.log('No hay ningún mod instalado');
                this.isMod = false;
                return;
            }

            let modsLoaded = 0;

            for (const mod of mods) {
                try {
                    const modPath = `public/mods/${mod}`;
                    const weekListResponse = await fetch(`${modPath}/data/weekList.txt`);
                    
                    if (weekListResponse.ok) {
                        const weekList = await weekListResponse.text();
                        const weeks = weekList.trim().split('\n')
                            .map(week => week.trim())
                            .filter(week => week.length > 0);
                        
                        if (weeks.length > 0) {
                            this.modList.set(mod, {
                                name: mod,
                                path: modPath,
                                weekList: weeks,
                                data: {},
                                active: true
                            });
                            
                            modsLoaded++;
                            console.log(`Mod cargado exitosamente: ${mod} con ${weeks.length} semanas`);
                        }
                    }
                } catch (error) {
                    console.warn(`Error cargando el mod ${mod}:`, error);
                }
            }

            // Establecer el primer mod como actual si no hay ninguno establecido
            if (modsLoaded > 0 && !this.currentMod) {
                this.setCurrentMod(Array.from(this.modList.keys())[0]);
            }

            // Actualizar isMod basado en los mods cargados
            this.isMod = modsLoaded > 0;

            if (this.isMod) {
                console.log(`Total de mods cargados: ${modsLoaded}`);
                console.log('Lista de mods activos:', Array.from(this.modList.keys()));
            } else {
                console.log('No se pudo cargar ningún mod correctamente');
            }

        } catch (error) {
            console.warn('Error leyendo ModList.txt:', error);
            this.isMod = false;
        }
    }

    setCurrentMod(modName) {
        if (this.modList.has(modName)) {
            this.currentMod = this.modList.get(modName);
            // No cambiar isMod aquí, debe mantenerse true si hay mods cargados
            return true;
        }
        this.currentMod = null;
        return false;
    }

    getCurrentMod() {
        return this.currentMod;
    }

    getModList() {
        return Array.from(this.modList.values());
    }

    isModActive() {
        return this.isMod && this.modList.size > 0;
    }

    getModWeekList() {
        // Devolver todas las semanas de todos los mods activos
        const allWeeks = [];
        
        // Primero, añadir las semanas base si existen
        if (this.baseWeeks) {
            allWeeks.push(...this.baseWeeks.map(week => ({
                week,
                modName: null,
                modPath: null,
                isMod: false
            })));
        }

        // Luego, añadir las semanas de los mods
        for (const [modName, mod] of this.modList.entries()) {
            console.log(`Procesando semanas del mod ${modName}:`, mod.weekList);
            if (mod.weekList && mod.weekList.length > 0) {
                allWeeks.push(...mod.weekList.map(week => ({
                    week,
                    modName: mod.name,
                    modPath: mod.path,
                    isMod: true
                })));
            }
        }

        console.log('Total de semanas encontradas:', allWeeks.length);
        return allWeeks;
    }

    getAllModWeeks() {
        // Nuevo método para obtener todas las semanas de todos los mods
        const allWeeks = new Map();
        for (const mod of this.modList.values()) {
            if (mod.active) {
                for (const week of mod.weekList) {
                    allWeeks.set(week, {
                        modName: mod.name,
                        modPath: mod.path
                    });
                }
            }
        }
        return allWeeks;
    }

    isWeekFromMod(weekName) {
        // Nuevo método para verificar si una semana pertenece a algún mod
        for (const mod of this.modList.values()) {
            if (mod.active && mod.weekList.includes(weekName)) {
                return {
                    isMod: true,
                    modName: mod.name,
                    modPath: mod.path
                };
            }
        }
        return { isMod: false };
    }
}

export const ModManager = new ModDetect();