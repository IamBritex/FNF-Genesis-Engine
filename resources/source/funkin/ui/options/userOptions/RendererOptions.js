import RenderizeAlphabet from '../utils/RenderizeAlphabet.js';
import RenderizeIcons from '../utils/RenderizeIcons.js';
import RendererCategories from './RendererCategories.js'; // Importamos el nuevo módulo

export default class RendererOptions {

    /**
     * Punto de entrada principal para renderizar el menú de opciones.
     */
    // Dentro de RendererOptions.js
    static render(scene, htmlElement, optionsData) {
        this.renderSectionSelector(scene, htmlElement, optionsData);

        if (optionsData['GENERAL']) {
            RendererCategories.render(scene, htmlElement, optionsData['GENERAL']);
        }
    }

    /**
     * Genera la barra de pestañas con iconos animados y scroll.
     */
    static renderSectionSelector(scene, htmlElement, optionsData) {
        const selectorDiv = htmlElement.node.querySelector('.section-selector');
        const btnLeft = htmlElement.node.querySelector('#btn-scroll-left');
        const btnRight = htmlElement.node.querySelector('#btn-scroll-right');

        if (!selectorDiv) return;

        // --- LÓGICA DE SCROLL ---
        const SCROLL_AMOUNT = 150;
        if (btnLeft) btnLeft.onclick = () => selectorDiv.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
        if (btnRight) btnRight.onclick = () => selectorDiv.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });

        selectorDiv.innerHTML = '';

        const activeItems = [];
        const sections = Object.keys(optionsData);

        sections.forEach((sectionName) => {
            const isSelected = sectionName === 'GENERAL';

            // 1. Botón Contenedor
            const button = document.createElement('button');
            button.className = 'section-tab';
            button.style.position = 'relative';
            button.style.overflow = 'visible';
            button.style.marginLeft = '50px';

            if (isSelected) button.classList.add('active');

            // 2. Icono Flotante
            const iconCanvas = document.createElement('canvas');
            iconCanvas.className = 'tab-icon';
            iconCanvas.width = 130;
            iconCanvas.height = 130;

            iconCanvas.style.position = 'absolute';
            iconCanvas.style.left = '-70px';
            iconCanvas.style.top = '50%';
            iconCanvas.style.transform = isSelected ? 'translateY(-50%) scale(0.9)' : 'translateY(-50%) scale(0.65)';
            iconCanvas.style.pointerEvents = 'none';
            iconCanvas.style.zIndex = '100';

            // 3. Texto Pestaña
            const textCanvas = document.createElement('canvas');
            textCanvas.height = 45;
            textCanvas.style.height = '65%';
            textCanvas.style.width = 'auto';
            textCanvas.style.pointerEvents = 'none';
            textCanvas.style.marginLeft = '10px';

            RenderizeAlphabet.drawText(scene, textCanvas, sectionName.toUpperCase());

            button.appendChild(iconCanvas);
            button.appendChild(textCanvas);

            const itemState = {
                iconCanvas: iconCanvas,
                category: sectionName,
                button: button,
                localFrameCounter: 0,
                finishedAnimation: false
            };
            activeItems.push(itemState);

            // 4. Click Handler
            button.onclick = () => {
                if (button.classList.contains('active')) return;

                scene.sound.play('scrollMenu');

                const allTabs = selectorDiv.querySelectorAll('.section-tab');
                allTabs.forEach(t => t.classList.remove('active'));

                activeItems.forEach(item => {
                    if (item.button !== button) {
                        const icon = item.button.querySelector('.tab-icon');
                        if (icon) icon.style.transform = 'translateY(-50%) scale(0.65)';
                    }
                });

                button.classList.add('active');
                iconCanvas.style.transform = 'translateY(-50%) scale(0.9)';

                itemState.localFrameCounter = 0;
                itemState.finishedAnimation = false;

                // --- DELEGAMOS LA RENDERIZACIÓN AL MÓDULO DE CATEGORÍAS ---
                RendererCategories.render(scene, htmlElement, optionsData[sectionName]);

                button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            };

            selectorDiv.appendChild(button);
        });

        this.startAnimationLoop(scene, activeItems);
    }

    static startAnimationLoop(scene, items) {
        let frameTimer = 0;
        const msPerFrame = 1000 / 24;

        const updateListener = (time, delta) => {
            frameTimer += delta;

            if (frameTimer > msPerFrame) {
                frameTimer -= msPerFrame;

                items.forEach(item => {
                    if (!item.iconCanvas.isConnected) return;

                    const isSelected = item.button.classList.contains('active');
                    let visualState = isSelected;

                    if (!isSelected) {
                        item.localFrameCounter++;
                        if (item.localFrameCounter > 1000) item.localFrameCounter = 0;
                        item.finishedAnimation = false;
                    }
                    else {
                        if (item.finishedAnimation) {
                            visualState = false;
                            item.localFrameCounter++;
                        } else {
                            const nextFrameExists = RenderizeIcons.checkFrameExists(
                                scene,
                                item.category,
                                item.localFrameCounter + 1,
                                true
                            );

                            if (nextFrameExists) {
                                item.localFrameCounter++;
                            } else {
                                item.finishedAnimation = true;
                                item.localFrameCounter = 0;
                            }
                        }
                    }

                    RenderizeIcons.drawIcon(
                        scene,
                        item.iconCanvas,
                        item.category,
                        visualState,
                        item.localFrameCounter
                    );
                });
            }
        };

        scene.events.on('update', updateListener);
        scene.events.once('shutdown', () => scene.events.off('update', updateListener));
    }
}