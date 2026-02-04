export default class RendererPreview {
    /**
     * Renderiza la vista previa visual (Imagen/Video) en el contenedor.
     * @param {HTMLElement} htmlElement - El elemento raíz del menú.
     * @param {Object} optionData - Datos completos de la opción seleccionada.
     */
    static render(htmlElement, optionData) {
        const container = htmlElement.node.querySelector('.preview-box');
        if (!container) return;

        // Limpiar contenido previo
        container.innerHTML = '';

        if (!optionData || !optionData.meta || !optionData.meta.preview) {
            // Placeholder si no hay preview
            container.innerHTML = '<div style="opacity:0.3; font-style:italic;">No preview available</div>';
            return;
        }

        const previewMeta = optionData.meta.preview;
        let activePreview = null;

        // Lógica de selección de recurso:
        // Algunos previews dependen del valor (ej: "up" vs "down"), otros son estáticos.
        // Como estamos navegando opciones, usamos el valor por defecto ('default') 
        // para determinar qué mostrar si es un objeto mapeado.
        
        // Caso 1: Preview es directo (tiene 'type' y 'src' en la raíz)
        if (previewMeta.type && previewMeta.src) {
            activePreview = previewMeta;
        } 
        // Caso 2: Preview es un mapa de valores (ej: { "en": {...}, "es": {...} })
        else {
            // Intentamos obtener la clave basada en el valor por defecto de la opción
            let val = optionData.default;
            
            // Conversión rápida a string porque las keys del json son strings ("true", "false")
            if (typeof val === 'boolean') val = val.toString();
            if (typeof val === 'number') val = val.toString();

            if (previewMeta[val]) {
                activePreview = previewMeta[val];
            } else {
                // Si no encontramos el valor exacto, tomamos el primero disponible
                const keys = Object.keys(previewMeta);
                if (keys.length > 0) activePreview = previewMeta[keys[0]];
            }
        }

        if (!activePreview) return;

        // Renderizado según tipo
        if (activePreview.type === 'image') {
            const img = document.createElement('img');
            img.src = activePreview.src;
            img.alt = "Preview";
            // Animación de entrada suave
            img.style.opacity = '0';
            img.onload = () => { img.style.transition = 'opacity 0.3s'; img.style.opacity = '1'; };
            container.appendChild(img);
        } 
        else if (activePreview.type === 'video') {
            const video = document.createElement('video');
            video.src = activePreview.src;
            video.autoplay = true;
            video.loop = activePreview.loop !== undefined ? activePreview.loop : true;
            video.muted = true; // Importante para autoplay
            video.playsInline = true;
            container.appendChild(video);
        }
        else if (activePreview.type === 'numbers' || activePreview.type === 'audio_meter') {
             // Placeholders para tipos especiales no gráficos
             container.innerHTML = `<div style="font-size:40px; color:#00FFFF; font-weight:bold;">${optionData.label}</div>`;
        }
    }
}