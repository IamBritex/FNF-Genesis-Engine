/**
 * Clase utilitaria para renderizar iconos animados de opciones.
 * Maneja discrepancias de nombres en el XML y fallbacks para iconos faltantes.
 */
export default class RenderizeIcons {
    
    // Configuración precisa de iconos por categoría
    // idle: nombre base en el XML
    // selected: nombre completo del prefijo seleccionado en el XML
    static ICONS_CONFIG = {
        'GENERAL':      { idle: 'internet',   selected: 'selected internet' },
        'GAMEPLAY':     { idle: 'arrows',     selected: 'selected arrows' },
        'CONTROLS':     { idle: 'controller', selected: 'selected controller' },
        'ACCESSIBILITY':{ idle: 'keys',       selected: 'selected keys' }, // "Las llaves son para accesibilidad"
        'AUDIO':        { idle: 'megaphone',  selected: 'selected megaphone' }, // Idle no existe, se usará fallback
        'APPEARANCE':   { idle: 'eyes',       selected: 'selected eyes' },
        'PERFORMANCE':  { idle: 'graphic',    selected: 'selected graphic' },
        'ADVANCED':     { idle: 'wrench',     selected: 'selected wrench' },
        'NETWORK':      { idle: 'internet',   selected: 'selected internet' }, // Repetido (inevitable sin más assets)
        'SYSTEM':       { idle: 'graphic',    selected: 'selected graphic' }, // Usamos graphic para no repetir window en Data
        'DATA':         { idle: 'window',     selected: 'selected windows' }, // "Data el icono tiene que ser el de window" (Nota el plural en selected)
        'DEFAULT':      { idle: 'circle',     selected: 'circle' }
    };

    /**
     * Dibuja el icono compuesto (Círculo Fondo + Icono Frente).
     */
    static drawIcon(scene, canvas, category, isSelected, localFrame) {
        if (!canvas || !scene.textures.exists('optionsIcons')) return;

        const ctx = canvas.getContext('2d');
        const texture = scene.textures.get('optionsIcons');
        const sourceImage = texture.getSourceImage();

        // Limpieza
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // --- CAPA 1: CÍRCULO (FONDO) ---
        // Loop constante 0-8
        const circleFrame = `circle000${localFrame % 9}`;
        this._drawFrame(ctx, texture, sourceImage, circleFrame, canvas, 1.0); 

        // --- CAPA 2: ICONO ESPECIALIZADO ---
        const config = this.ICONS_CONFIG[category.toUpperCase()] || this.ICONS_CONFIG['DEFAULT'];
        
        let frameName = '';

        if (isSelected) {
            // ANIMACIÓN SELECCIONADO
            // Usamos el nombre 'selected' definido en config (maneja plurales irregulares como 'windows')
            const indexStr = localFrame.toString().padStart(4, '0');
            frameName = `${config.selected}${indexStr}`;
            
            // Si el frame no existe (fin de la animación), mantenemos el último frame válido visualmente
            // (La lógica de detención del contador está en RendererOptions, aquí solo aseguramos no fallar)
            if (!texture.has(frameName) && localFrame > 0) {
                 // Intentamos retroceder 1 frame por seguridad
                 const prevIndex = (localFrame - 1).toString().padStart(4, '0');
                 frameName = `${config.selected}${prevIndex}`;
            }
        } else {
            // ANIMACIÓN IDLE
            // Loop 0-8 usando el nombre 'idle'
            const idleIndex = localFrame % 9;
            frameName = `${config.idle}000${idleIndex}`;

            // --- FALLBACK CRÍTICO (Para Audio/Megaphone) ---
            // Si el frame idle no existe (ej: "megaphone0000"), usamos el frame 0 del seleccionado estático
            if (!texture.has(frameName)) {
                frameName = `${config.selected}0000`;
            }
        }

        // Dibujar icono (Escala 0.9 para encajar en el círculo)
        this._drawFrame(ctx, texture, sourceImage, frameName, canvas, 0.9);
    }

    /**
     * Verifica si un frame existe (usado por RendererOptions para detener la animación)
     */
    static checkFrameExists(scene, category, frameIndex, isSelected) {
        if (!scene.textures.exists('optionsIcons')) return false;
        
        const texture = scene.textures.get('optionsIcons');
        const config = this.ICONS_CONFIG[category.toUpperCase()] || this.ICONS_CONFIG['DEFAULT'];
        
        // Solo nos interesa chequear existencia para la animación 'selected'
        if (isSelected) {
            const indexStr = frameIndex.toString().padStart(4, '0');
            return texture.has(`${config.selected}${indexStr}`);
        }
        return true; 
    }

    static _drawFrame(ctx, texture, sourceImage, frameName, canvas, scaleMod) {
        const frameData = texture.get(frameName);
        
        // Si aún así no existe el frame, abortamos silenciosamente para no crashear
        if (!frameData || frameData.missing) return;

        const drawWidth = frameData.cutWidth * scaleMod;
        const drawHeight = frameData.cutHeight * scaleMod;
        const drawX = (canvas.width - drawWidth) / 2;
        const drawY = (canvas.height - drawHeight) / 2;

        ctx.drawImage(
            sourceImage,
            frameData.cutX, frameData.cutY, frameData.cutWidth, frameData.cutHeight,
            drawX, drawY, drawWidth, drawHeight
        );
    }
}