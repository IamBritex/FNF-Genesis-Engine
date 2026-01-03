export default class ControlsSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
        this.isBinding = false;
        this.currentBindButton = null;
        this._bindHandler = null;
    }

    init() {
        const Genesis = window.Genesis;

        // Manejo Mobile
        const mobileElements = this.domElement.node.querySelectorAll('.mobile-only');
        if (Genesis && Genesis.env === 'MOBILE') {
            mobileElements.forEach(el => el.style.setProperty('display', 'flex', 'important'));
        } else {
            mobileElements.forEach(el => el.style.setProperty('display', 'none', 'important'));
        }

        // Listeners de Teclas
        const keys = this.domElement.node.querySelectorAll('.key-cap');
        keys.forEach(key => {
            if (key.classList.contains('key-disabled') || !key.dataset.bindAction) return;
            key.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.startBinding(key);
            });
        });

        // Chequeo inicial
        this.checkForConflicts();
    }

    startBinding(button) {
        if (this.isBinding) return;
        this.isBinding = true;
        this.currentBindButton = button;
        button.dataset.originalText = button.innerText;
        button.classList.add('binding');
        button.innerText = '...';

        window.focus();
        this._bindHandler = (e) => this.handleKeyDown(e);
        window.addEventListener('keydown', this._bindHandler, { capture: true });
    }

    handleKeyDown(e) {
        if (!this.isBinding || !this.currentBindButton) return;
        e.preventDefault(); e.stopImmediatePropagation();

        const rawCode = e.code;
        if (rawCode === 'Escape') {
            this.cancelBinding();
            return;
        }
        this.finishBinding(rawCode);
    }

    finishBinding(rawCode) {
        const btn = this.currentBindButton;
        const cleanName = this.formatKeyName(rawCode);

        btn.innerText = cleanName;
        btn.dataset.rawCode = rawCode;
        btn.classList.remove('binding');

        if (window.Genesis) {
            const saveKey = `keybind_${btn.dataset.bindAction}_${btn.dataset.bindIdx}`;
            window.Genesis.storage.save(saveKey, rawCode);
        }

        this.cleanupBinding();
        this.checkForConflicts();
    }

    cancelBinding() {
        if (!this.isBinding || !this.currentBindButton) return;
        this.currentBindButton.innerText = this.currentBindButton.dataset.originalText;
        this.currentBindButton.classList.remove('binding');
        this.cleanupBinding();
    }

    cleanupBinding() {
        window.removeEventListener('keydown', this._bindHandler, { capture: true });
        this._bindHandler = null;
        this.currentBindButton = null;
        this.isBinding = false;
    }

    checkForConflicts() {
        const allKeys = this.domElement.node.querySelectorAll('.key-cap');
        const usageMap = {};

        const getCategory = (action) => {
            if (action.startsWith('note_') || action === 'reset' || action === 'pause') return 'GAMEPLAY';
            if (action.startsWith('ui_') || action === 'accept' || action === 'back') return 'UI';
            return 'OTHER';
        };

        allKeys.forEach(key => {
            if (key.classList.contains('key-disabled') || !key.dataset.bindAction) return;
            const code = key.dataset.rawCode || key.innerText;
            const category = getCategory(key.dataset.bindAction);
            if (!usageMap[code]) usageMap[code] = [];
            usageMap[code].push({ el: key, cat: category });
        });

        Object.keys(usageMap).forEach(code => {
            const entries = usageMap[code];
            if (entries.length > 1) {
                const hasConflict = entries.some((itemA, idxA) => entries.some((itemB, idxB) => idxA !== idxB && itemA.cat === itemB.cat));
                if (hasConflict) {
                    entries.forEach(item => {
                        if (entries.some(other => other !== item && other.cat === item.cat)) {
                            item.el.style.backgroundColor = '#ff5252';
                            item.el.style.color = 'white';
                            item.el.style.borderColor = '#d50000';
                        }
                    });
                } else {
                    entries.forEach(item => { item.el.style.backgroundColor = ''; item.el.style.color = ''; item.el.style.borderColor = ''; });
                }
            } else {
                entries.forEach(item => { item.el.style.backgroundColor = ''; item.el.style.color = ''; item.el.style.borderColor = ''; });
            }
        });
    }

    formatKeyName(code) {
        const map = {
            'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
            'Space': 'SPACE', 'Enter': 'ENTER', 'Escape': 'ESC', 'Backspace': 'BACK',
            'ControlLeft': 'LCTRL', 'ControlRight': 'RCTRL', 'ShiftLeft': 'LSHIFT', 'ShiftRight': 'RSHIFT',
            'AltLeft': 'ALT', 'AltRight': 'ALTGR', 'Tab': 'TAB', 'CapsLock': 'CAPS'
        };
        if (map[code]) return map[code];
        if (code.startsWith('Key')) return code.replace('Key', '');
        if (code.startsWith('Digit')) return code.replace('Digit', '');
        return code.toUpperCase().substring(0, 6);
    }

    // Método para limpiar eventos si sales de la sección (opcional pero recomendado)
    destroy() {
        this.cleanupBinding();
    }
}