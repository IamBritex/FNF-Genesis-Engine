import { CharacterSelectorWindow } from '../CharacterSelectorWindow.js';

export class CharacterPropertiesWin {
    constructor(scene, element, parentWindow) {
        this.scene = scene;
        this.element = element;
        this.parent = parentWindow;
        this.domRefs = {};
    }

    addListeners(container) {
        this.domRefs = {
            offsetX: container.querySelector('#prop-offsetX'),
            offsetY: container.querySelector('#prop-offsetY'),
            iconBox: container.querySelector('#prop-icon-box'),
            iconImg: container.querySelector('#prop-icon-img'),
            iconName: container.querySelector('#prop-icon-name')
        };

        const update = (prop, value) => this.parent.onPropertyChanged(prop, value);

        this.domRefs.offsetX.addEventListener('input', (e) => update('offsetX', e.target.value));
        this.domRefs.offsetY.addEventListener('input', (e) => update('offsetY', e.target.value));
        
        this.domRefs.iconBox.addEventListener('click', () => this.onIconBoxClick());

        container.querySelectorAll('.wheelable-input').forEach(input => {
            input.addEventListener('wheel', (e) => this.parent.handleWheelEvent(e, input));
        });
    }

    refresh() {
        const el = this.element;
        const charName = el.getData('characterName');
        const charKey = this.parent.getCharKey(charName);
        
        if (charKey && this.parent.stageCharacters) {
            const offsets = this.parent.stageCharacters.getCameraOffsets(charKey);
            this.domRefs.offsetX.value = offsets.x.toFixed(0);
            this.domRefs.offsetY.value = offsets.y.toFixed(0);
        }

        const isPlaceholder = el.getData('isPlaceholder');
        if (isPlaceholder) {
            this.domRefs.iconImg.src = 'public/images/characters/icons/face.png';
            this.domRefs.iconName.textContent = "Placeholder";
        } else {
            const iconName = this.parent.getIconNameFromCharacterName(charName);
            this.domRefs.iconImg.src = `public/images/characters/icons/${iconName}.png`;
            this.domRefs.iconName.textContent = iconName;
        }
    }

    onIconBoxClick() {
        if (this.parent.charSelectorWindow) return;
        
        this.parent.charSelectorWindow = new CharacterSelectorWindow(
            this.scene, 
            (selectedData) => {
                if (this.parent.stageCharacters) {
                    this.parent.stageCharacters.swapTestCharacter(
                        this.element, 
                        selectedData.name,
                        selectedData.iconName
                    );
                }
            },
            () => { this.parent.charSelectorWindow = null; }
        );
        this.scene.setAsHUDElement(this.parent.charSelectorWindow.domElement);
    }
}