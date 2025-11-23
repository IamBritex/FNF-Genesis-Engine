export class GeneralPropertiesWin {
    constructor(scene, element, parentWindow) {
        this.scene = scene;
        this.element = element;
        this.parent = parentWindow;
        this.domRefs = {};
        this.isScrollLinked = true; 
    }

    addListeners(container) {
        this.domRefs = {
            type: container.querySelector('#prop-type'),
            x: container.querySelector('#prop-x'),
            y: container.querySelector('#prop-y'),
            angle: container.querySelector('#prop-angle'),
            scale: container.querySelector('#prop-scale'),
            depth: container.querySelector('#prop-depth'),
            
            scrollX: container.querySelector('#prop-scroll-x'),
            scrollY: container.querySelector('#prop-scroll-y'),
            linkBtn: container.querySelector('#prop-link-btn'),
            
            opacity: container.querySelector('#prop-opacity'),
            visible: container.querySelector('#prop-visible'),
            flipx: container.querySelector('#prop-flipx'),
            flipxRow: container.querySelector('#prop-flipx-row'),
            flipy: container.querySelector('#prop-flipy'),
            flipyRow: container.querySelector('#prop-flipy-row')
        };

        const update = (prop, value) => this.parent.onPropertyChanged(prop, value);

        this.domRefs.x.addEventListener('input', (e) => update('x', e.target.value));
        this.domRefs.y.addEventListener('input', (e) => update('y', e.target.value));
        this.domRefs.angle.addEventListener('input', (e) => update('angle', e.target.value));
        this.domRefs.scale.addEventListener('input', (e) => update('scale', e.target.value));
        this.domRefs.depth.addEventListener('input', (e) => update('depth', e.target.value));
        
        this.domRefs.linkBtn.addEventListener('click', () => {
            this.isScrollLinked = !this.isScrollLinked;
            const icon = this.isScrollLinked ? 'link.svg' : 'link_off.svg';
            this.domRefs.linkBtn.src = `public/images/ui/editors/${icon}`;
            
            if (this.isScrollLinked) {
                const valX = this.domRefs.scrollX.value;
                this.domRefs.scrollY.value = valX;
                update('scrollY', valX);
            }
        });

        this.domRefs.scrollX.addEventListener('input', (e) => {
            const val = e.target.value;
            update('scrollX', val);
            if (this.isScrollLinked) {
                this.domRefs.scrollY.value = val;
                update('scrollY', val);
            }
        });

        this.domRefs.scrollY.addEventListener('input', (e) => {
            const val = e.target.value;
            update('scrollY', val);
            if (this.isScrollLinked) {
                this.domRefs.scrollX.value = val;
                update('scrollX', val);
            }
        });

        this.domRefs.opacity.addEventListener('input', (e) => update('opacity', e.target.value));
        this.domRefs.visible.addEventListener('change', (e) => update('visible', e.target.checked));
        
        if (this.domRefs.flipx) this.domRefs.flipx.addEventListener('change', (e) => update('flipx', e.target.checked));
        if (this.domRefs.flipy) this.domRefs.flipy.addEventListener('change', (e) => update('flipy', e.target.checked));
        
        container.querySelectorAll('.wheelable-input').forEach(input => {
            input.addEventListener('wheel', (e) => this.parent.handleWheelEvent(e, input));
        });
    }

    refresh() {
        const el = this.element;
        
        if (this.domRefs.type) {
            this.domRefs.type.textContent = this.getElementType(el);
        }

        const displayX = el.x - (el.displayWidth * (el.originX - 0.5));
        const displayY = el.y - (el.displayHeight * (el.originY - 1.0));

        this.domRefs.x.value = displayX.toFixed(2);
        this.domRefs.y.value = displayY.toFixed(2);
        this.domRefs.angle.value = (el.angle || 0).toFixed(0);
        this.domRefs.scale.value = el.scaleX.toFixed(2);
        this.domRefs.depth.value = el.depth;
        
        this.domRefs.scrollX.value = el.scrollFactorX.toFixed(2);
        this.domRefs.scrollY.value = el.scrollFactorY.toFixed(2);
        
        if (el.scrollFactorX !== el.scrollFactorY) {
            this.isScrollLinked = false;
            this.domRefs.linkBtn.src = 'public/images/ui/editors/link_off.svg';
        }

        this.domRefs.opacity.value = el.alpha.toFixed(2);
        this.domRefs.visible.checked = el.visible;
        
        if (this.domRefs.flipxRow) this.domRefs.flipxRow.style.display = el.setFlipX ? 'flex' : 'none';
        if (this.domRefs.flipyRow) this.domRefs.flipyRow.style.display = el.setFlipY ? 'flex' : 'none';

        if (this.domRefs.flipx) this.domRefs.flipx.checked = el.flipX;
        if (this.domRefs.flipy) this.domRefs.flipy.checked = el.flipY;
    }

    getElementType(element) {
        if (element.type === 'Rectangle') return 'BasicObject';
        const charName = element.getData('characterName');
        if (charName && (charName.includes('(BF)') || charName.includes('(Dad)') || charName.includes('(GF)'))) {
            return `TestChar (${charName})`;
        }
        if (element.type === 'Sprite') return 'SpriteSheet';
        return element.type;
    }
}