import { ModularWindow } from '../../utils/window.js';

export class AnimationProperties {
    /**
     * @param {import('../animationEditor.js').AnimationEditor} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.domRefs = {};
        this.blockUpdate = false; 
        
        this.iconDebounceTimer = null;
        this.nameDebounceTimer = null;
        
        // [FIX] Rastrear el blob del icono actual para limpiarlo
        this.currentIconBlob = null;

        const config = {
            title: 'Propiedades',
            width: 340,
            height: 550,
            x: 20,
            y: 70,
            content: this.getTemplate.bind(this),
            styleOfContent: this.getStyles.bind(this),
            close: true,
            move: true,
            minimize: true,
            overlay: false
        };

        this.windowInstance = new ModularWindow(scene, config);
        
        if (this.scene.setAsHUDElement) {
            this.scene.setAsHUDElement(this.windowInstance.domElement);
        }

        this.cacheDomRefs();
        this.bindEvents();
        this.setupSceneListeners();

        this.windowInstance.onDestroy = () => {
            this.removeSceneListeners();
            if (this.iconDebounceTimer) clearTimeout(this.iconDebounceTimer);
            if (this.nameDebounceTimer) clearTimeout(this.nameDebounceTimer);
            
            // [FIX] Limpiar blob del icono al cerrar ventana
            if (this.currentIconBlob) {
                URL.revokeObjectURL(this.currentIconBlob);
                this.currentIconBlob = null;
            }
            
            if (this.scene.propertiesWindow === this) {
                this.scene.propertiesWindow = null;
            }
        };

        this.updateUI();
    }

    setupSceneListeners() {
        this.scene.events.on('animOffsetChanged', this.onAnimOffsetChanged, this);
        this.scene.events.on('animSelected', this.onAnimSelected, this);
        this.scene.events.on('characterLoaded', this.updateUI, this);
        this.scene.events.on('animFrameUpdate', this.updateFrameDisplay, this);
    }

    removeSceneListeners() {
        this.scene.events.off('animOffsetChanged', this.onAnimOffsetChanged, this);
        this.scene.events.off('animSelected', this.onAnimSelected, this);
        this.scene.events.off('characterLoaded', this.updateUI, this);
        this.scene.events.off('animFrameUpdate', this.updateFrameDisplay, this);
    }

    onAnimOffsetChanged(animName) {
        if (!this.scene.currentJsonData) return;
        const anim = this.scene.currentJsonData.animations.find(a => a.anim === animName);
        if (anim && anim.offsets) {
            if (document.activeElement !== this.domRefs.offX) this.domRefs.offX.value = anim.offsets[0];
            if (document.activeElement !== this.domRefs.offY) this.domRefs.offY.value = anim.offsets[1];
        }
    }

    onAnimSelected(animName) {
        this.domRefs.animSelect.value = animName;
        this.refreshAnimInputs(animName);
    }

    updateFrameDisplay(frameName) {
        if (this.domRefs.frameDisplay && typeof frameName === 'string') {
            const match = frameName.match(/(\d+)$/);
            this.domRefs.frameDisplay.textContent = match ? match[1] : frameName;
        }
    }

    getTemplate() {
        return `
            <div class="props-container">
                <div class="props-section">
                    <div class="props-header">PERSONAJE</div>
                    
                    <div class="prop-row">
                        <label>Atlas:</label> <input type="text" id="char-image">
                    </div>

                    <div class="prop-row">
                        <label>Icono:</label>
                        <div class="icon-wrapper">
                            <input type="file" id="char-icon-input" accept=".png" style="display: none;">
                            <span id="char-icon-name" class="prop-value-text">face</span>
                            <div class="icon-preview-box clickable" id="char-icon-box" title="Click para cambiar icono">
                                <img id="char-icon-preview" src="" alt="Icon">
                            </div>
                        </div>
                    </div>

                    <div class="prop-row">
                        <label>Barra de Salud:</label>
                        <div class="color-wrapper">
                            <input type="color" id="char-color" value="#FF0000">
                            <span id="char-color-val">#FF0000</span>
                        </div>
                    </div>

                    <div class="prop-row split">
                        <div>
                            <label>Sing Dur:</label>
                            <input type="number" id="char-sing-dur" step="0.1">
                        </div>
                        <div class="check-wrapper">
                            <label>Flip X:</label>
                            <input type="checkbox" id="char-flipx">
                        </div>
                    </div>

                    <div class="prop-row">
                        <div class="check-wrapper">
                            <label>No Antialiasing (Pixel):</label>
                            <input type="checkbox" id="char-no-aa">
                        </div>
                    </div>
                </div>

                <div class="props-section">
                    <div class="props-header">ANIMACIÓN ACTUAL</div>
                    
                    <div class="prop-row frame-display-row">
                        <label>Fotograma:</label>
                        <span id="anim-frame-display" class="frame-value">--</span>
                    </div>

                    <div class="prop-row">
                        <label>Seleccionar:</label>
                        <select id="anim-select">
                            <option value="">Ninguna</option>
                        </select>
                    </div>

                    <div class="prop-row">
                        <div class="check-wrapper" style="justify-content: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 4px;">
                            <input type="checkbox" id="anim-ghost">
                            <label for="anim-ghost" style="font-weight: bold; color: #fff;">Guía Fantasma</label>
                        </div>
                    </div>

                    <div class="prop-row">
                        <label>Nombre (Anim):</label>
                        <input type="text" id="anim-key">
                    </div>

                    <div class="prop-row split">
                        <div>
                            <label>FPS:</label>
                            <input type="number" id="anim-fps" step="1">
                        </div>
                        <div class="check-wrapper">
                            <label>Loop:</label>
                            <input type="checkbox" id="anim-loop">
                        </div>
                    </div>

                    <div class="prop-row">
                        <label>Offsets (X, Y):</label>
                        <div class="coords-wrapper">
                            <input type="number" id="anim-off-x" placeholder="X">
                            <input type="number" id="anim-off-y" placeholder="Y">
                        </div>
                    </div>

                    <div class="prop-row">
                        <label>Índices (ej: 0,1,2):</label>
                        <input type="text" id="anim-indices">
                    </div>
                </div>
            </div>
        `;
    }

    getStyles() {
        const bgDark = '#2a1836';
        const bgLight = '#4a2c66';
        const accent = '#663399';
        const text = '#e8daff';
        const disabled = '#333333';

        return `
            .props-container { display: flex; flex-direction: column; gap: 15px; color: ${text}; font-family: 'VCR', sans-serif; padding: 5px; }
            .props-section { background-color: ${bgLight}; border: 1px solid ${accent}; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
            .props-header { font-weight: bold; border-bottom: 1px solid ${accent}; margin-bottom: 5px; padding-bottom: 2px; color: #fff; text-align: center; }
            .prop-row { display: flex; flex-direction: column; gap: 2px; }
            .prop-row.split { flex-direction: row; gap: 10px; }
            .prop-row.split > div { flex: 1; }
            .frame-display-row { flex-direction: row; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 4px; margin-bottom: 5px; }
            .frame-value { font-weight: bold; color: #fff; font-size: 12px; }
            label { font-size: 12px; color: #bbb; }
            input[type="text"], input[type="number"], select { background: ${bgDark}; border: 1px solid ${accent}; color: white; padding: 4px; border-radius: 4px; font-family: 'VCR', sans-serif; width: 100%; box-sizing: border-box; text-transform: none !important; }
            input:disabled { background-color: ${disabled}; color: #777; cursor: not-allowed; }
            input[type="checkbox"] { width: auto; cursor: pointer; }
            .check-wrapper { display: flex; align-items: center; gap: 5px; height: 100%; }
            .check-wrapper label { margin-top: 2px; cursor: pointer; }
            .icon-wrapper { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
            .icon-preview-box { width: 50px; height: 50px; background: ${bgDark}; border: 1px solid ${accent}; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; transition: border-color 0.2s; }
            .icon-preview-box.clickable { cursor: pointer; }
            .icon-preview-box.clickable:hover { border-color: #fff; }
            .icon-preview-box img { max-width: 100%; max-height: 100%; }
            .prop-value-text { font-family: 'VCR', sans-serif; color: white; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .color-wrapper { display: flex; align-items: center; gap: 5px; }
            input[type="color"] { background: none; border: none; width: 40px; height: 30px; cursor: pointer; }
            .coords-wrapper { display: flex; gap: 5px; }
        `;
    }

    cacheDomRefs() {
        const root = this.windowInstance.domElement.node;
        const q = (sel) => root.querySelector(sel);

        this.domRefs = {
            image: q('#char-image'),
            iconName: q('#char-icon-name'),
            iconInput: q('#char-icon-input'),
            iconBox: q('#char-icon-box'),
            iconPreview: q('#char-icon-preview'),
            
            color: q('#char-color'),
            colorVal: q('#char-color-val'),
            singDur: q('#char-sing-dur'),
            flipX: q('#char-flipx'),
            noAA: q('#char-no-aa'),
            
            animSelect: q('#anim-select'),
            frameDisplay: q('#anim-frame-display'),
            animGhost: q('#anim-ghost'),
            animKey: q('#anim-key'),
            animFps: q('#anim-fps'),
            animLoop: q('#anim-loop'),
            offX: q('#anim-off-x'),
            offY: q('#anim-off-y'),
            animIndices: q('#anim-indices')
        };
    }

    bindEvents() {
        const refs = this.domRefs;

        const addEnterListener = (input) => {
            input.addEventListener('keydown', (e) => {
                e.stopPropagation(); 
                if (e.key === 'Enter') e.target.blur(); 
            });
        };

        Object.values(refs).forEach(el => {
            if (el && (el.tagName === 'INPUT') && (el.type === 'text' || el.type === 'number')) {
                addEnterListener(el);
            }
        });

        refs.image.addEventListener('input', (e) => this.updateJsonData('image', e.target.value));
        
        refs.iconBox.addEventListener('click', () => {
            refs.iconInput.value = ''; 
            refs.iconInput.click();
        });

        refs.iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // [FIX] Revocar blob anterior si existe para evitar fugas y errores
            if (this.currentIconBlob) {
                URL.revokeObjectURL(this.currentIconBlob);
            }

            const fullName = file.name;
            const nameWithoutExt = fullName.replace(/\.[^/.]+$/, "");
            
            // Crear nuevo blob y guardarlo
            const blobUrl = URL.createObjectURL(file);
            this.currentIconBlob = blobUrl;
            
            const uniqueId = Date.now();
            const iconKey = `icon-${nameWithoutExt}_${this.scene.sessionId}_${uniqueId}`;
            
            this.scene.iconCacheIds = this.scene.iconCacheIds || {};
            this.scene.iconCacheIds[nameWithoutExt] = uniqueId;

            if (this.scene.textures.exists(iconKey)) {
                this.scene.textures.remove(iconKey);
            }

            this.scene.load.image(iconKey, blobUrl);
            this.scene.load.once(`filecomplete-image-${iconKey}`, () => {
                this.updateJsonData('healthicon', nameWithoutExt);
                refs.iconName.textContent = nameWithoutExt;
                refs.iconPreview.src = blobUrl;
                this.scene.events.emit('healthIconChanged', { name: nameWithoutExt, id: uniqueId });
                this.extractDominantColor(blobUrl);
            });
            this.scene.load.start();
        });

        refs.color.addEventListener('input', (e) => {
            const rgb = this.hexToRgb(e.target.value);
            refs.colorVal.textContent = e.target.value.toUpperCase();
            this.updateJsonData('healthbar_colors', rgb);
            const hex = Phaser.Display.Color.GetColor(rgb[0], rgb[1], rgb[2]);
            this.scene.events.emit('healthColorsChanged', hex);
        });

        refs.singDur.addEventListener('input', (e) => this.updateJsonData('sing_duration', parseFloat(e.target.value)));
        
        refs.flipX.addEventListener('change', (e) => {
            this.updateJsonData('flip_x', e.target.checked);
            e.target.blur(); 
        });
        
        refs.noAA.addEventListener('change', (e) => {
            this.updateJsonData('no_antialiasing', e.target.checked);
            e.target.blur(); 
        });

        refs.animSelect.addEventListener('change', (e) => {
            const selectedAnim = e.target.value;
            this.refreshAnimInputs(selectedAnim);
            
            if (this.scene.characterPreview) {
                this.scene.characterPreview.playAnimation(selectedAnim, true);
            }
            e.target.blur();
        });

        refs.animGhost.addEventListener('change', (e) => {
            if (this.scene.toggleGhost) {
                this.scene.toggleGhost(e.target.checked);
            }
            e.target.blur();
        });

        const updateAnim = (field, value) => this.updateAnimData(field, value);

        refs.animKey.addEventListener('input', (e) => updateAnim('anim', e.target.value));
        refs.animFps.addEventListener('input', (e) => updateAnim('fps', parseInt(e.target.value)));
        
        refs.animLoop.addEventListener('change', (e) => {
            updateAnim('loop', e.target.checked);
            this.scene.events.emit('animLoopChanged', e.target.checked);
            e.target.blur(); 
        });
        
        refs.offX.addEventListener('input', (e) => this.updateOffsets(parseInt(e.target.value), null));
        refs.offY.addEventListener('input', (e) => this.updateOffsets(null, parseInt(e.target.value)));

        refs.animIndices.addEventListener('input', (e) => {
            const str = e.target.value;
            const arr = str.length > 0 ? str.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : [];
            updateAnim('indices', arr);
        });
    }

    extractDominantColor(imageUrl) {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);
            
            const imageData = ctx.getImageData(0, 0, 50, 50).data;
            const colorCounts = {};
            let maxCount = 0;
            let dominantColor = null;

            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];

                if (a < 128) continue;
                if (r < 30 && g < 30 && b < 30) continue;

                const key = `${Math.floor(r/10)*10},${Math.floor(g/10)*10},${Math.floor(b/10)*10}`;
                if (!colorCounts[key]) colorCounts[key] = { r, g, b, count: 0 };
                colorCounts[key].count++;

                if (colorCounts[key].count > maxCount) {
                    maxCount = colorCounts[key].count;
                    dominantColor = colorCounts[key];
                }
            }

            if (dominantColor) {
                const { r, g, b } = dominantColor;
                const hex = this.rgbToHex(r, g, b);
                this.updateJsonData('healthbar_colors', [r, g, b]);
                this.domRefs.color.value = hex;
                this.domRefs.colorVal.textContent = hex;
                const phaserColor = Phaser.Display.Color.GetColor(r, g, b);
                this.scene.events.emit('healthColorsChanged', phaserColor);
            } else {
                const r=0, g=255, b=0;
                const hex = this.rgbToHex(r, g, b);
                this.updateJsonData('healthbar_colors', [r, g, b]);
                this.domRefs.color.value = hex;
                this.domRefs.colorVal.textContent = hex;
                const phaserColor = Phaser.Display.Color.GetColor(r, g, b);
                this.scene.events.emit('healthColorsChanged', phaserColor);
            }
        };
    }

    updateUI() {
        const refs = this.domRefs;

        if (!this.scene.currentJsonData) {
            refs.image.value = '';
            refs.iconName.textContent = '';
            refs.iconPreview.src = ''; 
            refs.color.value = '#FF0000';
            refs.colorVal.textContent = '#FF0000';
            refs.singDur.value = '';
            refs.flipX.checked = false;
            refs.noAA.checked = false;
            refs.animGhost.checked = false;
            refs.animSelect.innerHTML = '<option value="">Crea una animación</option>';
            refs.animKey.value = '';
            refs.animFps.value = '';
            refs.animLoop.checked = false;
            refs.offX.value = '';
            refs.offY.value = '';
            refs.animIndices.value = '';
            if (refs.frameDisplay) refs.frameDisplay.textContent = '--';

            const inputsToBlock = [refs.animKey, refs.animFps, refs.animLoop, refs.offX, refs.offY, refs.animIndices];
            inputsToBlock.forEach(input => input.disabled = true);
            return;
        }

        const data = this.scene.currentJsonData;
        const isActive = (el) => document.activeElement === el;

        if (!isActive(refs.image)) refs.image.value = data.image || '';
        
        const iconName = data.healthicon || 'face';
        refs.iconName.textContent = iconName;
        this.updateIconPreview(iconName);
        
        if (!isActive(refs.singDur)) refs.singDur.value = data.sing_duration || 4;
        refs.flipX.checked = !!data.flip_x;
        refs.noAA.checked = !!data.no_antialiasing;
        refs.animGhost.checked = !!this.scene.isGhostActive;

        if (data.healthbar_colors) {
            const hex = this.rgbToHex(data.healthbar_colors[0], data.healthbar_colors[1], data.healthbar_colors[2]);
            refs.color.value = hex;
            refs.colorVal.textContent = hex;
        } else {
            refs.color.value = "#FF0000";
            refs.colorVal.textContent = "#FF0000";
        }

        this.updateAnimDropdown(data.animations);
        this.syncAnimInputs(data.animations);

        const hasSelection = refs.animSelect.value !== "";
        const inputsToBlock = [refs.animKey, refs.animFps, refs.animLoop, refs.offX, refs.offY, refs.animIndices];
        inputsToBlock.forEach(input => input.disabled = !hasSelection);
    }

    updateAnimDropdown(animations) {
        const select = this.domRefs.animSelect;
        const currentVal = select.value;
        
        let animCount = animations ? animations.length : 0;
        let currentOpts = select.options.length;
        
        if (animCount === 0) {
            if (select.options[0]?.textContent !== "Crea una animación") {
                select.innerHTML = '<option value="">Crea una animación</option>';
            }
            return;
        }

        if (currentOpts - 1 !== animCount || select.options[0].textContent === "Crea una animación") {
            select.innerHTML = '<option value="">(Seleccionar)</option>';
            animations.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.anim;
                opt.textContent = a.anim;
                select.appendChild(opt);
            });
            if (currentVal) select.value = currentVal;
        }
    }

    syncAnimInputs(animations) {
        if (!animations) return;
        let targetAnimName = this.domRefs.animSelect.value;
        if (!targetAnimName && this.scene.currentCharacter) {
            const sprite = this.scene.currentCharacter;
            if (sprite.anims && sprite.anims.currentAnim) {
                const fullKey = sprite.anims.currentAnim.key;
                const match = animations.find(a => fullKey.endsWith(`_${a.anim}`));
                if (match) {
                    targetAnimName = match.anim;
                    this.domRefs.animSelect.value = targetAnimName;
                }
            }
        }
        if (targetAnimName) {
            const animData = animations.find(a => a.anim === targetAnimName);
            if (animData) this.populateAnimFields(animData);
        }
    }

    populateAnimFields(anim) {
        const refs = this.domRefs;
        const isActive = (el) => document.activeElement === el;
        if (!isActive(refs.animKey)) refs.animKey.value = anim.anim || '';
        if (!isActive(refs.animFps)) refs.animFps.value = anim.fps || 24;
        refs.animLoop.checked = !!anim.loop;
        if (!isActive(refs.offX) && anim.offsets) refs.offX.value = anim.offsets[0] || 0;
        if (!isActive(refs.offY) && anim.offsets) refs.offY.value = anim.offsets[1] || 0;
        if (!isActive(refs.animIndices)) refs.animIndices.value = (anim.indices || []).join(', ');
    }

    refreshAnimInputs(animKey) {
        if (!this.scene.currentJsonData) return;
        const anim = this.scene.currentJsonData.animations.find(a => a.anim === animKey);
        if (anim) this.populateAnimFields(anim);
    }

    updateJsonData(field, value) {
        if (!this.scene.currentJsonData) return;
        this.scene.currentJsonData[field] = value;
        if (field === 'flip_x' && this.scene.currentCharacter) this.scene.currentCharacter.setFlipX(value);
        if (field === 'no_antialiasing' && this.scene.currentCharacter) {
            const filter = value ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR;
            this.scene.currentCharacter.texture.setFilter(filter);
        }
    }

    updateAnimData(field, value) {
        const currentSelectValue = this.domRefs.animSelect.value;
        if (!currentSelectValue || !this.scene.currentJsonData) return;
        const anim = this.scene.currentJsonData.animations.find(a => a.anim === currentSelectValue);
        
        if (anim) {
            anim[field] = value;
            if (field === 'anim') {
                const option = this.domRefs.animSelect.querySelector(`option[value="${currentSelectValue}"]`);
                if (option) {
                    option.value = value;
                    option.textContent = value;
                }
                if (this.nameDebounceTimer) clearTimeout(this.nameDebounceTimer);
                this.nameDebounceTimer = setTimeout(() => {
                     this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                }, 300);
            }
        }
    }

    updateOffsets(x, y) {
        const animKey = this.domRefs.animSelect.value;
        if (!animKey || !this.scene.currentJsonData) return;
        const anim = this.scene.currentJsonData.animations.find(a => a.anim === animKey);
        if (anim) {
            if (!anim.offsets) anim.offsets = [0, 0];
            if (x !== null && !isNaN(x)) anim.offsets[0] = x;
            if (y !== null && !isNaN(y)) anim.offsets[1] = y;
            
            this.scene.events.emit('animOffsetChanged', anim.anim);
            if (this.scene.characterPreview) {
                this.scene.characterPreview.applyOffset(anim.anim);
            }
        }
    }

    updateIconPreview(iconName) {
        if (!iconName) iconName = 'face';
        const cacheId = this.scene.iconCacheIds && this.scene.iconCacheIds[iconName];
        const localKey = `icon-${iconName}_${this.scene.sessionId}${cacheId ? '_' + cacheId : ''}`;
        
        if (this.scene.textures.exists(localKey)) {
            this.domRefs.iconPreview.src = this.scene.textures.get(localKey).getSourceImage().src;
        } else {
            this.domRefs.iconPreview.src = `public/images/characters/icons/${iconName}.png`;
        }
        this.domRefs.iconPreview.onerror = () => {
            this.domRefs.iconPreview.src = `public/images/characters/icons/face.png`;
        };
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    }
}