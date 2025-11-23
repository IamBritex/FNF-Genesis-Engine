import { ModularWindow } from '../../utils/window.js';
import { updateStageBackground } from '../../utils/checkboard.js';

export class EditorSettingsWindow {
    constructor(scene, globalConfig) {
        this.scene = scene;
        this.globalConfig = globalConfig;
        
        this.tempConfig = JSON.parse(JSON.stringify(this.globalConfig.get()));
        
        this.windowInstance = null;
        this.domRefs = {};
        
        const config = {
            width: 450,
            height: 550,
            title: 'Configuración del Editor',
            close: true,
            maximize: true,
            minimize: true,
            overlay: true,
            move: true,
            popup: true,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };

        this.windowInstance = new ModularWindow(this.scene, config);
        if (this.scene.setAsHUDElement) {
            this.scene.setAsHUDElement(this.windowInstance.domElement);
        }
        
        this.addListeners();
    }

    createContent() {
        return this.scene.cache.text.get('html_settings');
    }

    createStyles() {
        return this.scene.cache.text.get('css_settings');
    }

    addListeners() {
        const root = this.windowInstance.domElement.node;
        const t = this.tempConfig.theme;
        const l = this.tempConfig.language;
        const m = this.tempConfig.musicMuted;

        // Inicializar estado visual
        const bgBtn = root.querySelector(`.opt-btn[data-bg="${t.backgroundType}"]`);
        if(bgBtn) bgBtn.classList.add('selected');

        const modeBtn = root.querySelector(`.opt-btn[data-mode="${t.mode}"]`);
        if(modeBtn) modeBtn.classList.add('selected');

        const previewDot = root.querySelector('#color-preview-dot');
        previewDot.style.background = t.customColor;

        const musicCheck = root.querySelector('#music-mute-check');
        musicCheck.checked = m;

        const langSelect = root.querySelector('#language-select');
        langSelect.value = l;

        const pickerInput = root.querySelector('#picker-hex-input');
        pickerInput.value = t.customColor;
        
        // Listeners
        const bgBtns = root.querySelectorAll('[data-bg]');
        bgBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                bgBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.tempConfig.theme.backgroundType = btn.dataset.bg;
            });
        });

        const modeBtns = root.querySelectorAll('[data-mode]');
        const dropdown = root.querySelector('#custom-color-dropdown');
        
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                
                if (mode === 'Custom') {
                    dropdown.style.display = 'block';
                    this.initColorWheel(root);
                } else {
                    dropdown.style.display = 'none';
                    modeBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.tempConfig.theme.mode = mode;
                }
            });
        });

        musicCheck.addEventListener('change', (e) => {
            this.tempConfig.musicMuted = e.target.checked;
        });

        langSelect.addEventListener('change', (e) => {
            this.tempConfig.language = e.target.value;
        });

        root.querySelector('#btn-save-settings').addEventListener('click', () => {
            this.globalConfig.save(this.tempConfig);
            this.scene.toastManager.show("Configuración", "Cambios guardados exitosamente.");
            
            updateStageBackground(this.scene, this.tempConfig.theme);
            this.scene.updateMusicState();
            
            this.windowInstance.destroy();
        });

        root.querySelector('#btn-reset-settings').addEventListener('click', () => {
            const def = this.globalConfig.reset();
            this.tempConfig = def;
            this.scene.toastManager.show("Configuración", "Restablecida a valores por defecto.");
            updateStageBackground(this.scene, def.theme);
            this.scene.updateMusicState();
            this.windowInstance.destroy();
        });
    }

    initColorWheel(root) {
        const canvas = root.querySelector('#color-wheel-canvas');
        const ctx = canvas.getContext('2d');
        const hexInput = root.querySelector('#picker-hex-input');
        const previewDot = root.querySelector('#color-preview-dot');
        const confirmBtn = root.querySelector('#picker-confirm');
        const cancelBtn = root.querySelector('#picker-cancel');
        const dropdown = root.querySelector('#custom-color-dropdown');
        const modeBtns = root.querySelectorAll('[data-mode]');
        const customBtn = root.querySelector('#btn-custom-color');

        const img = new Image();
        img.src = 'public/images/ui/editors/colorWheel.webp';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };

        let selectedHex = this.tempConfig.theme.customColor;

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const p = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
            const hex = "#" + ("000000" + this.rgbToHex(p[0], p[1], p[2])).slice(-6);
            
            selectedHex = hex;
            hexInput.value = hex.toUpperCase();
            previewDot.style.backgroundColor = hex;
        });

        hexInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                selectedHex = val;
                previewDot.style.backgroundColor = val;
            }
        });

        confirmBtn.addEventListener('click', () => {
            this.tempConfig.theme.customColor = selectedHex;
            this.tempConfig.theme.mode = 'Custom';
            modeBtns.forEach(b => b.classList.remove('selected'));
            customBtn.classList.add('selected');
            dropdown.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }

    rgbToHex(r, g, b) {
        if (r > 255 || g > 255 || b > 255) throw "Invalid color component";
        return ((r << 16) | (g << 8) | b).toString(16);
    }
}