import SaveUserPreferences from "../SaveUserPreferences.js";

export default class OptionInput {
    constructor(scene, categoriesUI, centralUI) {
        this.scene = scene;
        this.categories = categoriesUI;
        this.central = centralUI;

        // ESTADOS: 'CATEGORIES', 'OPTIONS', 'FOCUS', 'BINDING'
        this.currentPanel = 'CATEGORIES';
        this.focusedElement = null; // Elemento editando (Slider, Input, o KeyCap)
        this.activeBindIdx = 0; // 0 o 1 (Para navegar entre las 2 teclas de un control)

        this.keys = this.scene.input.keyboard.createCursorKeys();
        this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.backKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESCAPE);

        // Listener global para Mouse
        this.clickListener = this.handleGlobalClick.bind(this);
        document.addEventListener('mousedown', this.clickListener);

        // Listener para Bindeo
        this.bindListener = null;
    }

    destroy() {
        // Limpieza vital para evitar errores al cambiar de escena
        document.removeEventListener('mousedown', this.clickListener);
        if (this.bindListener) window.removeEventListener('keydown', this.bindListener);
    }

    handleGlobalClick(e) {
        // Si la escena o los elementos UI ya no existen, no hacer nada
        if (!this.scene || !this.categories || !this.central) return;

        if (this.currentPanel === 'BINDING') return;

        const target = e.target;

        // 1. Clic en Categorías (CON PROTECCIÓN CONTRA NULL)
        // El error ocurría aquí porque .node puede ser null si la escena se está destruyendo
        const catNode = this.categories.domElement?.node;

        if (catNode && catNode.contains(target)) {
            if (this.currentPanel === 'FOCUS') this.exitFocusMode();

            this.currentPanel = 'CATEGORIES';
            this.categories.setFocus(true);
            this.central.clearSelection();
            return;
        }

        // 2. Clic en Lista de Opciones
        if (this.central.selectableItems && this.central.selectableItems.length > 0) {

            // Check especial: Clic directo en un KeyCap
            if (target.classList.contains('key-cap') && !target.classList.contains('key-disabled')) {
                const rowDiv = target.closest('.option-row');
                // Verificar que el rowDiv siga existiendo en el DOM
                if (rowDiv && document.body.contains(rowDiv)) {
                    const rowIndex = this.central.selectableItems.findIndex(i => i.rowDiv === rowDiv);

                    if (rowIndex !== -1) {
                        this.central.highlightSelection(rowIndex, false);
                        this.bindingElement = target;
                        this.currentPanel = 'OPTIONS';
                        this.categories.setFocus(false);
                        this.startBinding(target);
                    }
                }
                return;
            }

            // Clic en la fila general
            const clickedIndex = this.central.selectableItems.findIndex(item =>
                item.rowDiv && item.rowDiv.contains(target) // Protección extra
            );

            if (clickedIndex !== -1) {
                const item = this.central.selectableItems[clickedIndex];

                if (this.currentPanel === 'FOCUS' && this.focusedElement && document.body.contains(this.focusedElement)) {
                    if (!this.focusedElement.contains(target)) {
                        this.exitFocusMode();
                    }
                }

                this.currentPanel = 'OPTIONS';
                this.categories.setFocus(false);
                this.central.highlightSelection(clickedIndex, false);

                // Entrar en foco si es interactivo
                const isInput = (target.tagName === 'INPUT' || target.tagName === 'SELECT');
                const isInteractive = (item.type === 'slider' || item.type === 'text' || item.type === 'number' || item.type === 'select');

                if (isInput && isInteractive) {
                    this.enterFocusMode(item, false);
                }
                return;
            }
        }

        // 3. Clic fuera (Fondo)
        if (this.currentPanel === 'FOCUS') {
            // Verificar que el elemento enfocado aún exista antes de comprobar contains
            if (this.focusedElement && document.body.contains(this.focusedElement)) {
                if (!this.focusedElement.contains(target)) {
                    this.exitFocusMode();
                }
            } else {
                // Si el elemento enfocado ya no existe en el DOM, salir del modo foco por seguridad
                this.exitFocusMode();
            }
        }
    }

    update() {
        if (!this.scene.sys.settings.active) return; // No actualizar si la escena no está activa

        if (this.currentPanel === 'CATEGORIES') this.handleCategoriesInput();
        else if (this.currentPanel === 'OPTIONS') this.handleOptionsInput();
        else if (this.currentPanel === 'FOCUS') this.handleFocusInput();
    }

    handleCategoriesInput() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
            this.categories.changeSelection(1);
            this.scene.sound.play('scrollSound');
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
            this.categories.changeSelection(-1);
            this.scene.sound.play('scrollSound');
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.currentPanel = 'OPTIONS';
            this.categories.setFocus(false);
            this.central.highlightSelection(0, true);
            this.scene.sound.play('scrollSound');
        }
        if (Phaser.Input.Keyboard.JustDown(this.backKey) || Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.scene.sound.play('cancelSound');
            this.scene.scene.start('MainMenuScene');
        }
    }

    handleOptionsInput() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.central.changeSelection(1);
        if (Phaser.Input.Keyboard.JustDown(this.keys.up)) this.central.changeSelection(-1);

        if (Phaser.Input.Keyboard.JustDown(this.keys.left) ||
            Phaser.Input.Keyboard.JustDown(this.backKey) ||
            Phaser.Input.Keyboard.JustDown(this.escKey)) {

            this.currentPanel = 'CATEGORIES';
            this.central.clearSelection();
            this.categories.setFocus(true);
            this.scene.sound.play('cancelSound');
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            const item = this.central.getCurrentItem();
            if (!item) return;

            if (item.type === 'checkbox') {
                item.element.click();
                this.scene.sound.play('scrollSound');
            } else if (item.type === 'action') {
                item.element.click();
                this.scene.sound.play('confirmSound');
            } else {
                this.enterFocusMode(item, true);
            }
        }
    }

    handleFocusInput() {
        const el = this.focusedElement;
        // Si el elemento desapareció, salir
        if (!el || !document.body.contains(el)) {
            this.exitFocusMode();
            return;
        }

        const isKeybind = el.classList.contains('key-bind-container');
        const isText = (el.type === 'text' || el.type === 'number');

        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            if (isKeybind) {
                const caps = el.querySelectorAll('.key-cap');
                if (caps[this.activeBindIdx]) this.startBinding(caps[this.activeBindIdx]);
                return;
            } else {
                this.exitFocusMode();
                return;
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.exitFocusMode();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
            if (!isText) {
                this.exitFocusMode();
                return;
            }
        }

        if (isKeybind) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.right)) {
                this.activeBindIdx = this.activeBindIdx === 0 ? 1 : 0;
                this.central.highlightKeybindCap(el, this.activeBindIdx);
                this.scene.sound.play('scrollSound');
            }
        }
        else if (el.tagName === 'INPUT' && el.type === 'range') {
            let val = parseFloat(el.value);
            const step = parseFloat(el.step) || 1;
            const min = parseFloat(el.min);
            const max = parseFloat(el.max);

            let changed = false;
            if (this.keys.left.isDown) { val = Math.max(min, val - step); changed = true; }
            if (this.keys.right.isDown) { val = Math.min(max, val + step); changed = true; }

            if (changed) {
                el.value = val;
                el.dispatchEvent(new Event('input'));
            }
            if (Phaser.Input.Keyboard.JustUp(this.keys.left) || Phaser.Input.Keyboard.JustUp(this.keys.right)) {
                el.dispatchEvent(new Event('change'));
            }
        }
        else if (el.tagName === 'SELECT') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
                if (el.selectedIndex > 0) { el.selectedIndex--; el.dispatchEvent(new Event('change')); }
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
                if (el.selectedIndex < el.options.length - 1) { el.selectedIndex++; el.dispatchEvent(new Event('change')); }
            }
        }
    }

    enterFocusMode(item, fromKeyboard = true) {
        this.currentPanel = 'FOCUS';

        if (item.type === 'keybind') {
            this.focusedElement = item.element;
            this.activeBindIdx = 0;
            if (fromKeyboard) {
                this.central.setVisualFocus(true, true);
                this.central.highlightKeybindCap(this.focusedElement, 0);
            }
        } else {
            this.focusedElement = item.element;
            this.focusedElement.focus();
            this.central.setVisualFocus(true, fromKeyboard);
        }

        if (fromKeyboard) this.scene.sound.play('scrollSound');
    }

    exitFocusMode() {
        if (this.focusedElement) {
            try { this.focusedElement.blur(); } catch (e) { }
        }

        const caps = document.querySelectorAll('.key-cap.active-cap');
        caps.forEach(c => c.classList.remove('active-cap'));

        this.currentPanel = 'OPTIONS';
        this.focusedElement = null;
        this.central.setVisualFocus(false, false);
        this.scene.sound.play('scrollSound');
    }

    startBinding(capElement) {
        if (!capElement) return;

        this.currentPanel = 'BINDING';
        this.bindingElement = capElement;

        capElement.classList.add('binding');
        const originalText = capElement.innerText;
        capElement.innerText = "...";

        this.bindListener = (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const rawCode = e.code;
            if (rawCode === 'Escape') this.endBinding(originalText, true);
            else this.confirmBind(rawCode);
        };

        window.addEventListener('keydown', this.bindListener, { once: true, capture: true });
    }

    confirmBind(code) {
        const action = this.bindingElement.dataset.bindAction;
        const index = this.bindingElement.dataset.bindIdx;
        const saveKey = `keybind_${action}_${index}`;

        SaveUserPreferences.set(saveKey, code);
        console.log(`[Controls] Rebound ${action} [${index}] to ${code}`);

        const displayText = this.central.formatKeyName(code);
        this.endBinding(displayText, false);
    }

    endBinding(finalText, cancelled) {
        if (this.bindingElement) {
            this.bindingElement.innerText = finalText;
            this.bindingElement.classList.remove('binding');
            this.bindingElement = null;
        }

        if (this.bindListener) {
            window.removeEventListener('keydown', this.bindListener);
            this.bindListener = null;
        }

        if (!cancelled) this.scene.sound.play('confirmSound');
        else this.scene.sound.play('cancelSound');

        this.exitFocusMode();
    }
}