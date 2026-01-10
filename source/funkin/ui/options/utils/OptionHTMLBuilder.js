import SaveUserPreferences from "../SaveUserPreferences.js";

// Helper simple para formatear teclas al inicio
function formatKey(code) {
    if (!code || code === '---') return '---';
    if (code.startsWith('Key')) return code.replace('Key', '');
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    return code.replace('Arrow', '').toUpperCase().substring(0, 6);
}

export default class OptionHTMLBuilder {

    static buildSection(sectionData) {
        if (!sectionData || !Array.isArray(sectionData)) return "";
        let htmlBuffer = "";
        sectionData.forEach(item => {
            htmlBuffer += this.buildOption(item);
        });
        return htmlBuffer;
    }

    static buildOption(item) {
        const widthVal = "1000";
        const scaleAttr = "100";
        const savedValue = SaveUserPreferences.get(item.id, item.default);

        switch (item.type) {
            case "header":
                return `
                    <div class="section-title-row" style="height: 50px;">
                        <canvas class="subtitle-canvas" data-text="${item.label}" width="${widthVal}" height="50" data-scale="0.6" data-align="center"></canvas>
                    </div>`;

            case "spacer":
                return `<div class="spacer"></div>`;

            case "checkbox":
                const isChecked = savedValue === true ? "checked" : "";
                const subDisplay = savedValue === true ? "block" : "none";
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="${item.id}" ${isChecked}>
                                <canvas class="checkbox-canvas" width="200" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                    ${item.hasSubOptions ? `<div id="${item.id}-subs" style="display: ${subDisplay};">` : ''}
                `;

            case "sub_group":
                let subHtml = "<div id='judge-sub-options' style='display:none'>";
                if (item.items) {
                    item.items.forEach(subItem => subHtml += this.buildOption(subItem));
                }
                return subHtml + `</div>`;

            case "select":
                let optionsHtml = item.options.map(opt =>
                    `<option value="${opt.val}" ${savedValue === opt.val ? 'selected' : ''}>${opt.text}</option>`
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
                            <span class="val-display" id="disp-${item.id}">${savedValue}${item.suffix || ''}</span>
                            <input type="range" class="genesis-slider" id="${item.id}" 
                                min="${item.min}" max="${item.max}" step="${item.step}" value="${savedValue}" 
                                data-suffix="${item.suffix || ''}" data-sound="${item.sound || ''}">
                        </div>
                    </div>`;

            case "number":
                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container">
                            <input type="number" class="unified-style" id="${item.id}" value="${savedValue}" min="${item.min}" placeholder="${item.placeholder || ''}">
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
                // Cargar binds reales y formatearlos
                const rawKey1 = SaveUserPreferences.get(`keybind_${item.id}_0`, item.keys[0] || "---");
                const rawKey2 = SaveUserPreferences.get(`keybind_${item.id}_1`, item.keys[1] || "---");

                return `
                    <div class="option-row">
                        <canvas class="opt-label-canvas" data-text="${item.label}" width="${widthVal}" ${scaleAttr}></canvas>
                        <div class="opt-input-container key-bind-container">
                            <div class="key-cap" id="bind-${item.id}-0" data-bind-action="${item.id}" data-bind-idx="0">${formatKey(rawKey1)}</div>
                            <div class="key-cap" id="bind-${item.id}-1" data-bind-action="${item.id}" data-bind-idx="1">${formatKey(rawKey2)}</div>
                        </div>
                    </div>`;

            default: return "";
        }
    }
}