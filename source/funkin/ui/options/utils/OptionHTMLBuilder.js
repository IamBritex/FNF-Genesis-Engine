export default class OptionHTMLBuilder {

    /**
     * Recibe el array de datos de una sección (JSON) y devuelve todo el HTML concatenado.
     * @param {Array} sectionData - Array de objetos del JSON
     * @returns {string} - HTML completo de la sección
     */
    static buildSection(sectionData) {
        if (!sectionData || !Array.isArray(sectionData)) return "";

        let htmlBuffer = "";
        sectionData.forEach(item => {
            htmlBuffer += this.buildOption(item);
        });
        return htmlBuffer;
    }

    /**
     * Construye el HTML de un solo item basado en su tipo.
     * @param {Object} item - Objeto individual del JSON
     * @returns {string} - HTML del item
     */
    static buildOption(item) {
        const scaleAttr = "100";
        const widthVal = "1000"; // Ancho estándar para los canvas

        switch (item.type) {
            case "header":
                return `
                    <div class="section-title-row" style="height: 50px;">
                        <canvas class="subtitle-canvas" data-text="${item.label}" width="${widthVal}" height="50" data-scale="0.6" data-align="center"></canvas>
                    </div>`;

            case "spacer":
                return `<div class="spacer"></div>`;

            case "checkbox":
                const checked = item.default ? "checked" : "";
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="${item.id}" ${checked}>
                                <canvas class="checkbox-canvas" width="200" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                    ${item.hasSubOptions ? `<div id="${item.id}-subs" style="display: ${item.default ? 'block' : 'none'};">` : ''}
                `;

            case "sub_group":
                // Recursividad para items anidados
                let subHtml = "<div id='judge-sub-options' style='display:none'>";
                if (item.items) {
                    item.items.forEach(subItem => subHtml += this.buildOption(subItem));
                }
                return subHtml + `</div>`;

            case "select":
                let optionsHtml = item.options.map(opt =>
                    `<option value="${opt.val}" ${item.default === opt.val ? 'selected' : ''}>${opt.text}</option>`
                ).join('');
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <select class="unified-style opt-select" id="${item.id}">${optionsHtml}</select>
                        </div>
                    </div>`;

            case "slider":
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <span class="val-display" id="disp-${item.id}">${item.default}${item.suffix || ''}</span>
                            <input type="range" class="genesis-slider" id="${item.id}" 
                                min="${item.min}" max="${item.max}" step="${item.step}" value="${item.default}" 
                                data-suffix="${item.suffix || ''}" data-sound="${item.sound || ''}">
                        </div>
                    </div>`;

            case "number":
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <input type="number" class="unified-style" id="${item.id}" value="${item.default}" min="${item.min}" placeholder="${item.placeholder || ''}">
                        </div>
                    </div>`;

            case "action":
                const btnClass = item.style === 'danger' ? 'danger-btn' : 'unified-btn';
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <button class="${btnClass}" id="${item.id}">${item.btnText}</button>
                        </div>
                    </div>`;

            case "keybind":
                const key1 = item.keys[0] || "---";
                const key2 = item.keys[1] || "---";
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <div class="key-cap" id="bind-${item.id}-0" data-bind-action="${item.id}" data-bind-idx="0">${key1}</div>
                            <div class="key-cap" id="bind-${item.id}-1" data-bind-action="${item.id}" data-bind-idx="1">${key2}</div>
                        </div>
                    </div>`;

            default: return "";
        }
    }
}