export class SpriteSheetsPropertiesWin {
    constructor(scene, element, parentWindow) {
        this.scene = scene;
        this.element = element;
        this.parent = parentWindow;
        this.domRefs = {};
        
        this.currentPlayList = element.getData('animPlayList') || {};
        this.selectedAnimKey = '__NEW__';
    }

    addListeners(container) {
        const update = (prop, value) => this.parent.onPropertyChanged(prop, value);

        this.domRefs = {
            animFps: container.querySelector('#prop-anim-fps'),
            playMode: container.querySelector('#prop-anim-playmode'),
            animBeat: container.querySelector('#prop-anim-beat'),
            beatRow: container.querySelector('#prop-anim-beat-row'),
            
            animSelect: container.querySelector('#prop-anim-select'),
            animName: container.querySelector('#prop-anim-name'),
            animPrefix: container.querySelector('#prop-anim-prefix'),
            animIndices: container.querySelector('#prop-anim-indices'),
            btnSave: container.querySelector('#btn-anim-save'),
            btnRemove: container.querySelector('#btn-anim-remove'),
            browser: container.querySelector('#prop-anim-browser')
        };

        this.domRefs.animFps.addEventListener('input', (e) => update('animFps', e.target.value));
        this.domRefs.playMode.addEventListener('change', (e) => {
            update('animPlayMode', e.target.value);
            this.domRefs.beatRow.style.display = (e.target.value === 'Beat') ? 'flex' : 'none';
        });
        this.domRefs.animBeat.addEventListener('input', (e) => update('animBeat', e.target.value));

        this.domRefs.animSelect.addEventListener('change', (e) => this.onAnimSelected(e.target.value));
        this.domRefs.btnSave.addEventListener('click', () => this.saveAnim());
        this.domRefs.btnRemove.addEventListener('click', () => this.removeAnim());
        
        container.querySelectorAll('.wheelable-input').forEach(input => {
            input.addEventListener('wheel', (e) => this.parent.handleWheelEvent(e, input));
        });

        this.populateAnimBrowser();
        this.populatePlayListDropdown();
    }

    refresh() {
        const el = this.element;
        
        this.domRefs.animFps.value = el.getData('animFrameRate') || 24;
        this.domRefs.playMode.value = el.getData('animPlayMode') || 'None';
        
        const beat = el.getData('animBeat');
        this.domRefs.animBeat.value = (beat && beat.length) ? beat[0] : 1;
        this.domRefs.beatRow.style.display = (this.domRefs.playMode.value === 'Beat') ? 'flex' : 'none';

        this.currentPlayList = el.getData('animPlayList') || {};
    }

    populatePlayListDropdown() {
        const select = this.domRefs.animSelect;
        select.innerHTML = '';
        const optionNew = document.createElement('option');
        optionNew.value = '__NEW__';
        optionNew.textContent = '➕ Nueva Animación';
        select.appendChild(optionNew);

        Object.keys(this.currentPlayList).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
        
        select.value = this.selectedAnimKey;
        this.onAnimSelected(this.selectedAnimKey);
    }

    onAnimSelected(key) {
        this.selectedAnimKey = key;
        if (key === '__NEW__') {
            this.domRefs.animName.value = '';
            this.domRefs.animPrefix.value = '';
            this.domRefs.animIndices.value = '';
            this.domRefs.btnRemove.disabled = true;
        } else {
            const data = this.currentPlayList[key];
            if (data) {
                this.domRefs.animName.value = key;
                this.domRefs.animPrefix.value = data.prefix || '';
                this.domRefs.animIndices.value = (data.indices || []).join(',');
                this.domRefs.btnRemove.disabled = false;
            }
        }
    }

    saveAnim() {
        const name = this.domRefs.animName.value.trim();
        const prefix = this.domRefs.animPrefix.value.trim();
        const indices = this.domRefs.animIndices.value.split(',').map(s => s.trim()).filter(s => s);

        if (!name || !prefix) return;

        this.currentPlayList[name] = { prefix, indices };
        this.element.setData('animPlayList', this.currentPlayList);
        
        this.selectedAnimKey = name;
        this.populatePlayListDropdown();
    }

    removeAnim() {
        if (this.selectedAnimKey === '__NEW__') return;
        delete this.currentPlayList[this.selectedAnimKey];
        this.element.setData('animPlayList', this.currentPlayList);
        this.selectedAnimKey = '__NEW__';
        this.populatePlayListDropdown();
    }

    populateAnimBrowser() {
        const container = this.domRefs.browser;
        container.innerHTML = '';
        const frames = this.element.texture.getFrameNames();
        const groups = this.parent.groupFramesByAnimation(frames);

        if (groups.size === 0) {
            container.innerHTML = '<span class="anim-browser-empty">No XML data</span>';
            return;
        }

        groups.forEach((indices, prefix) => {
            const div = document.createElement('div');
            div.className = 'anim-browser-item';
            div.textContent = prefix;
            
            div.addEventListener('click', () => {
                let finalPrefix = prefix;
                let finalIndices = indices;

                const allFourDigits = indices.every(idx => idx.length === 4 && !isNaN(idx));
                
                if (allFourDigits && indices.length > 0) {
                    const firstTwo = indices[0].substring(0, 2);
                    const sharePrefix = indices.every(idx => idx.substring(0, 2) === firstTwo);
                    
                    if (sharePrefix) {
                        finalPrefix = prefix + firstTwo; 
                        finalIndices = indices.map(idx => idx.substring(2)); 
                    }
                }

                this.domRefs.animPrefix.value = finalPrefix;
                this.domRefs.animIndices.value = finalIndices.join(',');

                if (this.selectedAnimKey === '__NEW__' && !this.domRefs.animName.value) {
                     this.domRefs.animName.value = finalPrefix.replace(/[^a-zA-Z0-9]/g, '');
                }
            });
            container.appendChild(div);
        });
    }
}