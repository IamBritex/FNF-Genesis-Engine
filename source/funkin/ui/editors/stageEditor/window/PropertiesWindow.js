import { ModularWindow } from '../../utils/window.js';
import { GeneralPropertiesWin } from './properties/GeneralPropertiesWin.js';
import { ObjectPropertiesWin } from './properties/ObjectPropertiesWin.js';
import { CharacterPropertiesWin } from './properties/CharacterPropertiesWin.js';
import { SpriteSheetsPropertiesWin } from './properties/SpriteSheetsPropertiesWin.js';

export class PropertiesWindow {
    constructor(scene, elementsManager, stageCharacters) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        this.stageCharacters = stageCharacters;
        
        this.currentTarget = null;
        this.windowInstance = null;
        this.onDestroy = null;
        
        this.generalModule = null;
        this.specificModule = null;
        
        this.charSelectorWindow = null;
        this.isUpdatingFromInput = false;

        const config = {
            width: 300,
            height: 500,
            x: this.scene.scale.width - 300 - 310, 
            y: 30, 
            title: 'PROPIEDADES',
            close: true,
            popup: true, 
            minimize: true,
            move: true, 
            content: this.getContent.bind(this),
            styleOfContent: this.getStyle.bind(this)
        };
        
        this.windowInstance = new ModularWindow(this.scene, config);
        this.windowInstance.onDestroy = () => this.destroy(true);
        
        this.boundSetTarget = this.setTarget.bind(this);
        this.boundRefreshValues = this.refreshValues.bind(this);
        
        if (this.elementsManager) {
            this.elementsManager.onSelectionChanged = this.boundSetTarget;
            this.elementsManager.onElementUpdated = this.boundRefreshValues;
        }
        
        this.setTarget(this.elementsManager.selectedElement || null);
    }

    get domElement() {
        return this.windowInstance.domElement;
    }

    getContent() {
        return this.scene.cache.text.get('html_properties');
    }

    getStyle() {
        return this.scene.cache.text.get('css_properties');
    }

    getContentContainer() {
        if (this.windowInstance && this.windowInstance.popupWindow && !this.windowInstance.popupWindow.closed) {
            return this.windowInstance.popupWindow.document.body;
        }
        return this.domElement ? this.domElement.node : null;
    }

    setTarget(element) {
        this.currentTarget = element;
        
        const container = this.getContentContainer();
        if (!container) return;

        const root = container.querySelector('#properties-root');
        if (!root) return;
        
        this.generalModule = null;
        this.specificModule = null;
        
        if (!element) {
            root.innerHTML = `<div class="properties-empty"><span>SELECCIONA UN ELEMENTO.</span></div>`;
            return;
        }

        const type = this.identifyType(element);

        this.generalModule = new GeneralPropertiesWin(this.scene, element, this);
        
        if (type === 'Character') {
            this.specificModule = new CharacterPropertiesWin(this.scene, element, this);
        } else if (type === 'SpriteSheet') {
            this.specificModule = new SpriteSheetsPropertiesWin(this.scene, element, this);
        } else if (type === 'Object') {
            this.specificModule = new ObjectPropertiesWin(this.scene, element, this);
        }

        let finalHTML = this.scene.cache.text.get('html_prop_general');
        if (this.specificModule) {
            finalHTML += `<div class="prop-separator"></div>`;
            let specificHTML = '';
            if (type === 'Character') specificHTML = this.scene.cache.text.get('html_prop_char');
            else if (type === 'SpriteSheet') specificHTML = this.scene.cache.text.get('html_prop_sprite');
            else if (type === 'Object') specificHTML = this.scene.cache.text.get('html_prop_object');
            finalHTML += specificHTML;
        }

        root.innerHTML = finalHTML;

        this.generalModule.addListeners(root);
        if (this.specificModule) {
            this.specificModule.addListeners(root);
        }
        
        this.setupInputNavigation(root);
        this.refreshValues();
    }
    
    setupInputNavigation(root) {
        const inputs = Array.from(root.querySelectorAll('input, select'));
        
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();

                if (e.key === 'Enter' || e.key === 'Escape') {
                    input.blur();
                    return;
                }

                if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

                const isUp = e.key === 'ArrowUp';
                const isNumber = input.type === 'number' || input.classList.contains('wheelable-input');
                
                const hasModifier = e.ctrlKey || e.shiftKey;

                if (isNumber && hasModifier) {
                    e.preventDefault();
                    let step = input.step ? parseFloat(input.step) : 1;
                    if (isNaN(step)) step = 1;
                    
                    let multiplier = 1;
                    if (e.shiftKey && !e.ctrlKey) multiplier = 10;
                    if (e.ctrlKey && !e.shiftKey) multiplier = 0.1;
                    if (e.ctrlKey && e.shiftKey) multiplier = 0.01;

                    const dir = isUp ? 1 : -1;
                    let currentVal = parseFloat(input.value) || 0;
                    let newVal = currentVal + (step * multiplier * dir);

                    if (input.id.includes('opacity')) newVal = Math.max(0, Math.min(1, newVal));
                    if (input.id.includes('depth')) newVal = Math.max(1, newVal);
                    
                    const decimals = (step.toString().split('.')[1] || '').length + (multiplier < 1 ? 2 : 0);
                    input.value = parseFloat(newVal.toFixed(decimals));
                    
                    input.dispatchEvent(new Event('input'));
                    return;
                }

                e.preventDefault();
                const dir = isUp ? -1 : 1;
                const nextIndex = index + dir;

                if (nextIndex >= 0 && nextIndex < inputs.length) {
                    inputs[nextIndex].focus();
                    if (inputs[nextIndex].select) {
                        inputs[nextIndex].select();
                    }
                }
            });
        });
    }

    refreshValues() {
        if (!this.currentTarget || this.isUpdatingFromInput) return;
        
        if (this.generalModule && this.areDomRefsReady(this.generalModule)) {
            this.generalModule.refresh();
        }
        if (this.specificModule && this.areDomRefsReady(this.specificModule)) {
            this.specificModule.refresh();
        }
    }

    areDomRefsReady(module) {
        return module.domRefs && Object.keys(module.domRefs).length > 0;
    }

    identifyType(el) {
        const charName = el.getData('characterName');
        if (this.isTestCharacter(charName)) return 'Character';
        if (el.type === 'Rectangle') return 'Object';
        if (el.type === 'Sprite') return 'SpriteSheet';
        return 'Image'; 
    }

    isTestCharacter(name) {
        return name === 'Player (BF)' || name === 'Opponent (Dad)' || name === 'Girlfriend (GF)';
    }

    getCharKey(name) {
        if (!name) return null;
        if (name.includes('(BF)')) return 'player';
        if (name.includes('(Dad)')) return 'enemy';
        if (name.includes('(GF)')) return 'gfVersion';
        return null;
    }

    getIconNameFromCharacterName(name) {
        if (!name) return 'face';
        const iconData = this.currentTarget?.getData('healthicon');
        if (iconData) return iconData;
        if (name.includes('(BF)')) return 'bf';
        if (name.includes('(Dad)')) return 'dad';
        if (name.includes('(GF)')) return 'gf';
        return name;
    }
    
    onPropertyChanged(propName, value) {
        if (!this.currentTarget) return;
        this.isUpdatingFromInput = true;
        
        const el = this.currentTarget;
        const floatVal = parseFloat(value);
        const intVal = parseInt(value);

        switch(propName) {
            case 'x': el.x = floatVal + (el.displayWidth * (el.originX - 0.5)); break;
            case 'y': el.y = floatVal + (el.displayHeight * (el.originY - 1.0)); break;
            case 'angle': el.setAngle(floatVal); break;
            case 'scale': el.setScale(floatVal); this.refreshValues(); break;
            case 'depth': el.setDepth(Math.max(1, intVal)); if(this.scene.reassignAllDepths) this.scene.reassignAllDepths(); break;
            
            case 'scrollX': el.setScrollFactor(floatVal, el.scrollFactorY); break;
            case 'scrollY': el.setScrollFactor(el.scrollFactorX, floatVal); break;
            
            case 'opacity': el.setAlpha(floatVal); break;
            case 'visible': el.visible = value; break;
            case 'flipx': if(el.setFlipX) el.setFlipX(value); break;
            case 'flipy': if(el.setFlipY) el.setFlipY(value); break;
            
            case 'color': if(el.setFillStyle) el.setFillStyle(parseInt(value.substring(1), 16), el.fillAlpha); break;
            case 'width': if(el.setSize) el.setSize(floatVal, el.height); this.refreshValues(); break;
            case 'height': if(el.setSize) el.setSize(el.width, floatVal); this.refreshValues(); break;

            case 'offsetX': this.stageCharacters.setCameraOffset(this.getCharKey(el.getData('characterName')), 'x', intVal); break;
            case 'offsetY': this.stageCharacters.setCameraOffset(this.getCharKey(el.getData('characterName')), 'y', intVal); break;

            case 'animFps': el.setData('animFrameRate', intVal); break;
            case 'animPlayMode': el.setData('animPlayMode', value); break;
            case 'animBeat': el.setData('animBeat', [intVal]); break;
        }

        setTimeout(() => { this.isUpdatingFromInput = false; }, 0);
    }

    handleWheelEvent(event, input) {
        event.preventDefault();
        event.stopPropagation();
        if (!input || input.disabled) return;

        const delta = -Math.sign(event.deltaY);
        const isSmallStep = input.step && parseFloat(input.step) < 1;
        const step = isSmallStep ? 0.1 : 1;
        
        let newVal = parseFloat(input.value) + (delta * step);
        
        if (input.id.includes('opacity')) newVal = Math.max(0, Math.min(1, newVal));
        if (input.id.includes('depth')) newVal = Math.max(1, newVal);

        input.value = isSmallStep ? newVal.toFixed(1) : Math.round(newVal);
        input.dispatchEvent(new Event('input'));
    }
    
    groupFramesByAnimation(frames) {
        const animationGroups = new Map();
        frames.forEach((frame) => {
            if (frame === '__BASE') return;
            const match = frame.match(/^(.*?)(\d+)$/);
            if (match) {
                const prefix = match[1];
                const index = match[2];
                if (!animationGroups.has(prefix)) animationGroups.set(prefix, []);
                animationGroups.get(prefix).push(index);
            }
        });
        for (const [prefix, indices] of animationGroups.entries()) {
            indices.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        }
        return animationGroups;
    }

    destroy(fromWindow = false) {
        if (this.elementsManager) {
            this.elementsManager.onSelectionChanged = null;
            this.elementsManager.onElementUpdated = null;
        }
        if (this.charSelectorWindow) this.charSelectorWindow.windowInstance.destroy();
        if (this.windowInstance && !fromWindow) this.windowInstance.destroy();
        
        if (this.onDestroy) {
            this.onDestroy();
            this.onDestroy = null;
        }
    }
}