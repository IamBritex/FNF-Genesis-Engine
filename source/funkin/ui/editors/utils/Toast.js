/**
 * Un gestor de notificaciones "Toast" modular para la UI del editor.
 * Muestra mensajes animados en la esquina inferior izquierda.
 */
export class ToastManager {
    /**
     * @param {Phaser.Scene} scene La escena principal (para añadir el DOM).
     */
    constructor(scene) {
        this.scene = scene;
        this.injectCSS();

        /**
         * Almacena una referencia al toast actualmente visible.
         * @type {HTMLElement | null}
         */
        this.currentToast = null;
    }

    /**
     * Inyecta el CSS necesario para los toasts en el <head> del documento.
     */
    injectCSS() {
        const styleId = 'toast-manager-styles';
        if (document.getElementById(styleId)) {
            return; // Los estilos ya están inyectados
        }
        
        const css = `
            .toast-notification {
                background-color: #663399;
                border: 2px solid #7a4fcf;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                position: fixed;
                bottom: 20px;
                left: 180px; /* Movido más a la derecha */
                transform: translateX(-150%); /* Estado inicial (oculto a la izquierda) */
                opacity: 1;
                /* Transiciones para entrada y salida */
                transition: transform 0.4s cubic-bezier(0.21, 1.02, 0.73, 1), 
                            opacity 0.3s ease-out;
                z-index: 10000;
                min-width: 250px;
                max-width: 350px;
            }
            .toast-notification.show {
                transform: translateX(0); /* Estado visible */
                opacity: 1;
            }
            .toast-notification.hide {
                /* Estado de salida: se mueve hacia abajo y se desvanece */
                transform: translateY(60px) translateX(0);
                opacity: 0;
            }
            .toast-notification h4 {
                margin: 0 0 5px 0;
                font-size: 16px;
                font-weight: bold;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .toast-notification p {
                margin: 0;
                font-size: 14px;
                opacity: 0.9;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    /**
     * Muestra una nueva notificación toast.
     * Si ya hay un toast, lo oculta para mostrar el nuevo.
     * @param {string} title El título del toast.
     * @param {string} message El mensaje (subtítulo) del toast.
     * @param {number} [duration=3000] Duración en ms antes de que desaparezca.
     */
    show(title, message, duration = 3000) {
        if (this.currentToast) {
            this.hide(this.currentToast);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-notification';

        const titleEl = document.createElement('h4');
        titleEl.textContent = title;
        
        const messageEl = document.createElement('p');
        messageEl.textContent = message;

        toast.appendChild(titleEl);
        toast.appendChild(messageEl);
        this.scene.add.dom(0, 0, toast);

        this.currentToast = toast;

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        toast.timer = setTimeout(() => {
            this.hide(toast);
        }, duration);
    }

    /**
     * Oculta un toast específico con la animación de salida.
     * @param {HTMLElement} toast El elemento toast a ocultar.
     */
    hide(toast) {
        if (!toast) return;

        // Limpiar el temporizador si existe (para evitar cierres dobles)
        if (toast.timer) {
            clearTimeout(toast.timer);
            toast.timer = null;
        }

        // Si este es el toast "actual", limpiar la referencia
        if (this.currentToast === toast) {
            this.currentToast = null;
        }

        // Aplicar clases de salida
        toast.classList.add('hide');
        toast.classList.remove('show');
        
        // Esperar a que termine la animación de salida para destruir
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast); // Limpiar el DOM
            }
        }, 500); // 0.5s (0.3s opacidad + 0.1s margen)
    }

    /**
     * Limpia los estilos y cualquier toast pendiente al cerrar la escena.
     */
    destroy() {
        // Ocultar el toast actual si existe
        if (this.currentToast) {
            this.hide(this.currentToast);
        }

        // Quitar los estilos del DOM
        const style = document.getElementById('toast-manager-styles');
        if (style) {
            style.parentElement.removeChild(style);
        }
    }
}