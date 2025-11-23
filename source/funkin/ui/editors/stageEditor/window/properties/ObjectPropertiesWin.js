export class ObjectPropertiesWin {
    constructor(scene, element, parentWindow) {
        this.scene = scene;
        this.element = element;
        this.parent = parentWindow;
        this.domRefs = {};
    }

    addListeners(container) {
        this.domRefs = {
            color: container.querySelector('#prop-color'),
            width: container.querySelector('#prop-width'),
            height: container.querySelector('#prop-height')
        };

        const update = (prop, value) => this.parent.onPropertyChanged(prop, value);

        this.domRefs.color.addEventListener('input', (e) => update('color', e.target.value));
        this.domRefs.width.addEventListener('input', (e) => update('width', e.target.value));
        this.domRefs.height.addEventListener('input', (e) => update('height', e.target.value));

        container.querySelectorAll('.wheelable-input').forEach(input => {
            input.addEventListener('wheel', (e) => this.parent.handleWheelEvent(e, input));
        });
    }

    refresh() {
        const el = this.element;
        this.domRefs.width.value = el.width.toFixed(0);
        this.domRefs.height.value = el.height.toFixed(0);
        const hexColor = '#' + ('000000' + el.fillColor.toString(16)).substr(-6).toUpperCase();
        this.domRefs.color.value = hexColor;
    }
}