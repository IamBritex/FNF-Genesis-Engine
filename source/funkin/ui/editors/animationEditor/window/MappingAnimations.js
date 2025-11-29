import { ModularWindow } from '../../utils/window.js';

export class MappingAnimations {
    /**
     * @param {import('../animationEditor.js').AnimationEditor} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.domRefs = {};

        const config = {
            title: 'Mapeo de Animaciones',
            width: 320,
            height: 450,
            x: 20,
            y: 70,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this),
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
        this.setupSceneListeners();

        this.windowInstance.onDestroy = () => {
            this.removeSceneListeners();
            if (this.scene.mappingWindow === this) {
                this.scene.mappingWindow = null;
            }
        };

        this.updateUI();
    }

    setupSceneListeners() {
        this.scene.events.on('characterLoaded', this.updateUI, this);
    }

    removeSceneListeners() {
        this.scene.events.off('characterLoaded', this.updateUI, this);
    }

    createContent() {
        return `
            <div class="mapping-container">
                <div class="anim-list" id="anim-list-container"></div>
                
                <div class="add-btn-container" id="btn-add-anim">
                    <img src="public/images/ui/editors/add.svg" alt="Add">
                    <span>Nueva Animación</span>
                </div>
            </div>
        `;
    }

    createStyles() {
        const bgDark = '#2a1836';
        const bgItem = '#3a2250';
        const accent = '#663399';
        const text = '#e8daff';
        const hoverColor = '#7a4fcf';

        return `
            .mapping-container {
                display: flex; flex-direction: column; height: 100%;
                font-family: 'VCR', sans-serif; color: ${text};
                overflow: hidden;
            }
            .anim-list {
                flex: 1; overflow-y: auto; padding: 5px;
                display: flex; flex-direction: column; gap: 5px;
            }
            .anim-item {
                background-color: ${bgItem};
                border: 1px solid ${accent};
                border-radius: 4px;
                padding: 8px;
                display: flex; align-items: center;
                cursor: pointer;
                transition: background 0.2s;
                position: relative;
            }
            .anim-item:hover { background-color: ${hoverColor}; }
            
            .item-actions {
                display: flex; align-items: center; margin-right: 10px;
                opacity: 0; transition: opacity 0.2s ease-in-out;
            }
            .anim-item:hover .item-actions { opacity: 1; }
            
            .action-icon {
                width: 20px; height: 20px; cursor: pointer; margin-right: 5px;
                transition: transform 0.1s;
            }
            .action-icon:hover { transform: scale(1.15); }
            .btn-delete { filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(322deg) brightness(119%) contrast(119%); }
            .btn-edit { filter: invert(88%) sepia(61%) saturate(564%) hue-rotate(356deg) brightness(104%) contrast(103%); }

            .anim-info {
                display: flex; justify-content: space-between; align-items: center;
                width: 100%; overflow: hidden;
            }
            .anim-name {
                font-weight: bold; font-size: 14px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;
            }
            .anim-prefix {
                font-size: 10px; color: #aaa; background: rgba(0,0,0,0.3);
                padding: 2px 4px; border-radius: 3px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;
            }

            .add-btn-container {
                height: 40px; background-color: ${bgDark}; border-top: 2px solid ${accent};
                display: flex; justify-content: center; align-items: center; gap: 10px;
                cursor: pointer; transition: background 0.2s; flex-shrink: 0;
            }
            .add-btn-container:hover { background-color: ${hoverColor}; }
            .add-btn-container img { width: 20px; height: 20px; }
            .add-btn-container span { font-size: 14px; font-weight: bold; }

            /* Modales */
            .modal-input-container {
                padding: 15px; display: flex; flex-direction: column; gap: 15px;
                font-family: 'VCR', sans-serif; color: white; height: 100%;
            }
            .modal-input {
                background: #222; border: 1px solid ${accent}; color: white;
                padding: 8px; font-family: 'VCR', sans-serif; font-size: 16px;
                width: 100%; box-sizing: border-box;
            }
            .modal-btn {
                background: ${accent}; color: white; border: none; padding: 10px;
                font-family: 'VCR', sans-serif; cursor: pointer; border-radius: 4px;
            }
            .modal-btn:hover { background: ${hoverColor}; }
            
            .prefix-list {
                flex: 1; overflow-y: auto; border: 1px solid #444; background: #111;
                display: flex; flex-direction: column;
            }
            .prefix-item {
                padding: 8px; border-bottom: 1px solid #333; cursor: pointer;
            }
            .prefix-item:hover { background: ${accent}; }
        `;
    }

    cacheDomRefs() {
        this.domRefs = {
            listContainer: this.windowInstance.domElement.node.querySelector('#anim-list-container'),
            addBtn: this.windowInstance.domElement.node.querySelector('#btn-add-anim')
        };

        this.domRefs.addBtn.addEventListener('click', () => {
            this._openNameModal();
        });
    }

    updateUI() {
        const container = this.domRefs.listContainer;
        container.innerHTML = '';

        if (!this.scene.currentJsonData || !this.scene.currentJsonData.animations) return;

        this.scene.currentJsonData.animations.forEach((anim, index) => {
            const item = document.createElement('div');
            item.className = 'anim-item';
            
            item.innerHTML = `
                <div class="item-actions">
                    <img src="public/images/ui/editors/edit.svg" class="action-icon btn-edit" title="Editar">
                    <img src="public/images/ui/editors/delete.svg" class="action-icon btn-delete" title="Eliminar">
                </div>
                <div class="anim-info">
                    <span class="anim-name">${anim.anim}</span>
                    <span class="anim-prefix">${anim.name || '???'}</span>
                </div>
            `;

            const editBtn = item.querySelector('.btn-edit');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._openNameModal(index);
            });

            const deleteBtn = item.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._deleteAnimation(index);
            });

            item.addEventListener('click', () => {
                if (this.scene.characterPreview) {
                    this.scene.characterPreview.playAnimation(anim.anim, true);
                }
            });

            container.appendChild(item);
        });
    }

    _deleteAnimation(index) {
        const deleted = this.scene.currentJsonData.animations.splice(index, 1);
        
        if (this.scene.history) {
            this.scene.history.add({
                description: `Eliminar animación ${deleted[0].anim}`,
                undo: () => {
                    this.scene.currentJsonData.animations.splice(index, 0, deleted[0]);
                    this.updateUI();
                    this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                },
                redo: () => {
                    this.scene.currentJsonData.animations.splice(index, 1);
                    this.updateUI();
                    this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                }
            });
        }

        this.updateUI();
        this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
    }

    _openNameModal(editIndex = -1) {
        const isEdit = editIndex !== -1;
        const existingName = isEdit ? this.scene.currentJsonData.animations[editIndex].anim : '';
        const title = isEdit ? 'Editar Animación (1/2)' : 'Nueva Animación (1/2)';

        const content = () => `
            <div class="modal-input-container">
                <h3>${isEdit ? 'Editar Nombre' : 'Nombre de la Animación'}</h3>
                <input type="text" id="new-anim-name" class="modal-input" placeholder="ej. singUP" value="${existingName}" autofocus>
                <button id="btn-next-step" class="modal-btn">Siguiente</button>
            </div>
        `;

        const modal = new ModularWindow(this.scene, {
            title: title, width: 300, height: 200, content: content,
            styleOfContent: () => '', close: true, move: false, overlay: true
        });

        if (this.scene.setAsHUDElement) this.scene.setAsHUDElement(modal.domElement);

        const input = modal.domElement.node.querySelector('#new-anim-name');
        const btn = modal.domElement.node.querySelector('#btn-next-step');

        const goNext = () => {
            const name = input.value.trim();
            if (!name) return;

            const duplicate = this.scene.currentJsonData.animations.find((a, i) => a.anim === name && i !== editIndex);
            if (duplicate) {
                if (this.scene.toastManager) this.scene.toastManager.show("Error", `Ya existe la animación '${name}'`);
                return;
            }

            modal.destroy();
            this._openPrefixSelector(name, editIndex);
        };

        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); 
            if (e.key === 'Enter') goNext();
        });

        btn.addEventListener('click', goNext);
    }

    _openPrefixSelector(animName, editIndex = -1) {
        const isEdit = editIndex !== -1;
        const existingPrefix = isEdit ? this.scene.currentJsonData.animations[editIndex].name : '';
        
        const content = () => `
            <div class="modal-input-container">
                <h3>Seleccionar Prefijo XML</h3>
                <input type="text" id="prefix-search" class="modal-input" placeholder="Buscar..." value="${existingPrefix}">
                <div id="prefix-list" class="prefix-list"></div>
                <button id="btn-cancel-add" class="modal-btn" style="background:#555; margin-top:5px;">Cancelar</button>
            </div>
        `;

        const modal = new ModularWindow(this.scene, {
            title: `Prefijo para "${animName}" (2/2)`,
            width: 350, height: 400, content: content,
            styleOfContent: () => '', close: false, move: false, overlay: true
        });

        if (this.scene.setAsHUDElement) this.scene.setAsHUDElement(modal.domElement);

        const listContainer = modal.domElement.node.querySelector('#prefix-list');
        const searchInput = modal.domElement.node.querySelector('#prefix-search');
        const cancelBtn = modal.domElement.node.querySelector('#btn-cancel-add');

        cancelBtn.addEventListener('click', () => modal.destroy());
        searchInput.addEventListener('keydown', (e) => { e.stopPropagation(); });

        const prefixes = this._getUniquePrefixes();

        const renderList = (filter = '') => {
            listContainer.innerHTML = '';
            const filtered = prefixes.filter(p => p.toLowerCase().includes(filter.toLowerCase()));
            
            if (filtered.length === 0) {
                listContainer.innerHTML = '<div style="padding:10px; color:#777;">No encontrado.</div>';
                return;
            }

            filtered.forEach(prefix => {
                const item = document.createElement('div');
                item.className = 'prefix-item';
                item.textContent = prefix;
                item.addEventListener('click', () => {
                    this._finalizeAnimation(animName, prefix, editIndex);
                    modal.destroy();
                });
                listContainer.appendChild(item);
            });
        };

        renderList(existingPrefix);
        searchInput.addEventListener('input', (e) => renderList(e.target.value));
        searchInput.focus();
        if (existingPrefix) searchInput.select(); 
    }

    _getUniquePrefixes() {
        if (!this.scene.currentCharacter) return [];
        
        const textureKey = this.scene.currentCharacter.texture.key;
        const frames = this.scene.textures.get(textureKey).getFrameNames();
        
        const prefixSet = new Set();
        
        frames.forEach(frame => {
            const prefix = frame.replace(/[0-9]+$/, '').trim();
            prefixSet.add(prefix);
        });

        return Array.from(prefixSet).sort();
    }

    _finalizeAnimation(name, prefix, editIndex = -1) {
        const newAnimData = {
            anim: name,
            name: prefix,
            fps: 24,
            loop: false,
            indices: [],
            offsets: [0, 0]
        };

        if (editIndex === -1) {
            this.scene.currentJsonData.animations.push(newAnimData);
            this._refreshPhaserAnimation(newAnimData);

            if (this.scene.history) {
                this.scene.history.add({
                    description: `Crear animación ${name}`,
                    undo: () => {
                        const idx = this.scene.currentJsonData.animations.indexOf(newAnimData);
                        if (idx > -1) this.scene.currentJsonData.animations.splice(idx, 1);
                        this.updateUI();
                        this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                    },
                    redo: () => {
                        this.scene.currentJsonData.animations.push(newAnimData);
                        this._refreshPhaserAnimation(newAnimData);
                        this.updateUI();
                        this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                    }
                });
            }
        } else {
            const oldAnimData = { ...this.scene.currentJsonData.animations[editIndex] };
            const targetAnim = this.scene.currentJsonData.animations[editIndex];
            targetAnim.anim = name;
            targetAnim.name = prefix;
            if (!targetAnim.offsets) targetAnim.offsets = [0, 0];

            this._refreshPhaserAnimation(targetAnim);

            if (this.scene.history) {
                this.scene.history.add({
                    description: `Editar animación ${name}`,
                    undo: () => {
                        this.scene.currentJsonData.animations[editIndex] = oldAnimData;
                        this._refreshPhaserAnimation(oldAnimData);
                        this.updateUI();
                        this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                    },
                    redo: () => {
                        this.scene.currentJsonData.animations[editIndex] = targetAnim;
                        this._refreshPhaserAnimation(targetAnim);
                        this.updateUI();
                        this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
                    }
                });
            }
        }

        this.updateUI();
        this.scene.events.emit('characterLoaded', this.scene.currentJsonData);
        
        if (this.scene.characterPreview) {
            this.scene.characterPreview.playAnimation(name, true);
        }
    }

    // [FIX CRÍTICO] Filtrado Estricto de Prefijos
    _refreshPhaserAnimation(animData) {
        if (!this.scene.characterPreview || !this.scene.currentCharacter) return;

        const textureKey = this.scene.currentCharacter.texture.key;
        const animKey = `${textureKey}_${animData.anim}`;
        const prefix = animData.name;

        if (this.scene.anims.exists(animKey)) {
            this.scene.anims.remove(animKey);
        }

        const texture = this.scene.textures.get(textureKey);
        if (!texture) return;
        
        const allFrames = texture.getFrameNames();

        // Filtrar frames que:
        // 1. Empiecen con el prefijo
        // 2. Lo que sigue al prefijo sean SOLO números (0-9) o nada (string vacío)
        //    Esto evita que "singDOWN" coincida con "singDOWNmiss"
        const matchedFrames = allFrames.filter(frameName => {
            if (!frameName.startsWith(prefix)) return false;
            
            const suffix = frameName.slice(prefix.length);
            // Regex: ^ inicio, [0-9]* cero o mas digitos, $ fin
            return /^[0-9]*$/.test(suffix);
        }).sort();

        if (matchedFrames.length > 0) {
            this.scene.anims.create({
                key: animKey,
                frames: matchedFrames.map(f => ({ key: textureKey, frame: f })),
                frameRate: animData.fps || 24,
                repeat: animData.loop ? -1 : 0
            });
            console.log(`[Mapping] Animación creada: ${animKey} con ${matchedFrames.length} frames. Prefijo estricto: "${prefix}"`);
        } else {
            console.warn(`[Mapping] No frames found for prefix: "${prefix}"`);
        }
    }
}