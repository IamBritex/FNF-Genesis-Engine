import RendererOptions from './userOptions/RendererOptions.js';
import UserOptionsManager from './userOptions/UserOptionsManager.js';

export default class HTMLMenu {
    constructor(scene) {
        this.scene = scene;
    }

    static preloadAssets(scene) {
        scene.load.html('generic_section', 'public/ui/menu/options/mainOptions.html');
        UserOptionsManager.preloadAssets(scene);
    }

    init() {
        const margin = 30;
        
        // Calculamos ancho y alto restando los márgenes de ambos lados (30 + 30 = 60)
        const displayWidth = this.scene.scale.width - (margin * 2);
        const displayHeight = this.scene.scale.height - (margin * 2);

        // Añadimos el elemento en la posición exacta (30, 30) que es donde empieza el margen superior-izquierdo
        const htmlElement = this.scene.add.dom(margin, margin).createFromCache('generic_section');

        // Forzamos el origen a la esquina superior izquierda (0, 0) del propio elemento
        // Esto hace que la posición (margin, margin) corresponda exactamente a esa esquina del HTML
        htmlElement.setOrigin(0, 0);
        htmlElement.setScrollFactor(0);

        // APLICAMOS ESTILOS CRÍTICOS:
        // 1. box-sizing: border-box -> Asegura que el padding y border NO aumenten el tamaño total
        // 2. margin: 0 -> Evita que el navegador aplique márgenes por defecto al div contenedor
        htmlElement.node.style.boxSizing = 'border-box';
        htmlElement.node.style.margin = '0';
        htmlElement.node.style.padding = '0'; // Opcional, resetea padding externo si lo hubiera
        
        // Asignamos las dimensiones calculadas
        htmlElement.node.style.width = `${displayWidth}px`;
        htmlElement.node.style.height = `${displayHeight}px`;

        // Renderizamos el contenido
        const optionsData = UserOptionsManager.getOptionsData(this.scene);
        RendererOptions.render(this.scene, htmlElement, optionsData);
    }
}