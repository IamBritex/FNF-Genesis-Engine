// source/utils/CrashHandler.js
export class CrashHandler {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.errors = [];
        this.setupDOMElement();
        this.setupErrorHandlers();
    }

    setupDOMElement() {
        // Contenedor principal fullscreen con alto contraste
        this.container = document.createElement('div');
        this.container.id = 'crash-handler';
        this.container.style = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #000000;
            color: #ffffff;
            display: none;
            z-index: 2147483647;
            overflow: hidden;
            font-family: 'Arial', sans-serif;
        `;

        // Contenedor de contenido principal
        this.content = document.createElement('div');
        this.content.style = `
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        `;

        // Encabezado con "Uh oh" centrado y rotado
        this.header = document.createElement('div');
        this.header.style = `
            width: 100%;
            padding: 40px 0;
            text-align: center;
        `;

        this.uhohImg = document.createElement('img');
        this.uhohImg.src = 'public/assets/images/UI/crashHandler/uh-oh.png';
        this.uhohImg.alt = 'Uh Oh Text';
        this.uhohImg.style = `
            width: 400px;
            height: auto;
            transform: rotate(-5deg);
            margin-top: -30px;
            margin-bottom: -50px;
        `;
        this.header.appendChild(this.uhohImg);

        // Cuerpo principal (flexible para errores e imagen)
        this.body = document.createElement('div');
        this.body.style = `
            display: flex;
            flex: 1;
            width: 100%;
            overflow: hidden;
        `;

        // Panel izquierdo para errores (70% del ancho)
        this.errorsPanel = document.createElement('div');
        this.errorsPanel.style = `
            width: 70%;
            height: 100%;
            padding: 20px;
            box-sizing: border-box;
            overflow-y: auto;
        `;

        // Panel derecho para imagen BF (30% del ancho)
        this.imagePanel = document.createElement('div');
        this.imagePanel.style = `
            width: 30%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-end;
            padding-bottom: 30px;
            box-sizing: border-box;
        `;

        // Imagen BF escalada
        this.bfImg = document.createElement('img');
        this.bfImg.src = 'public/assets/images/UI/crashHandler/UcAAguE.png';
        this.bfImg.alt = 'BF Character';
        this.bfImg.style = `
            width: 100%;
            max-width: none;
            height: auto;
            transform: scale(1) translateX(-50px);
            filter: brightness(0.9);
        `;
        this.imagePanel.appendChild(this.bfImg);

        // Contenedor de errores
        this.errorsContainer = document.createElement('div');
        this.errorsContainer.style = `
            height: 100%;
            overflow-y: auto;
            padding-right: 15px;
        `;

        // Estilo de scrollbar minimalista
        this.errorsContainer.style += `
            scrollbar-width: thin;
            scrollbar-color: #ff0000 #222222;
        `;

        // Botón de cierre minimalista
        this.closeButton = document.createElement('button');
        this.closeButton.textContent = '✕';
        this.closeButton.style = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: transparent;
            color: #ff0000;
            font-size: 24px;
            border: none;
            cursor: pointer;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.2s;
        `;
        this.closeButton.addEventListener('mouseover', () => {
            this.closeButton.style.background = 'rgba(255, 0, 0, 0.2)';
        });
        this.closeButton.addEventListener('mouseout', () => {
            this.closeButton.style.background = 'transparent';
        });
        this.closeButton.addEventListener('click', () => this.hide());

        // Ensamblar elementos
        this.errorsPanel.appendChild(this.errorsContainer);
        this.body.appendChild(this.errorsPanel);
        this.body.appendChild(this.imagePanel);
        this.content.appendChild(this.header);
        this.content.appendChild(this.body);
        this.content.appendChild(this.closeButton);
        this.container.appendChild(this.content);
        document.body.appendChild(this.container);

        // Manejar errores de carga de imágenes
        this.uhohImg.onerror = () => {
            console.error('Error loading uh-oh image');
            this.header.innerHTML = '<h1 style="color: #ff0000; font-size: 48px; transform: rotate(0deg);">UH OH!</h1>';
        };
        this.bfImg.onerror = () => {
            console.error('Error loading BF image');
            this.bfImg.style.display = 'none';
        };
    }

    setupErrorHandlers() {
        // Capturar errores no controlados
        window.addEventListener('error', (event) => {
            this.handleError({
                message: event.message,
                file: event.filename,
                line: event.lineno,
                col: event.colno,
                error: event.error
            });
            return true;
        });

        // Capturar promesas rechazadas no controladas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                message: event.reason.message || String(event.reason),
                file: 'Promise',
                line: 'N/A',
                col: 'N/A',
                error: event.reason
            });
        });

        // Sobrescribir console.error
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError.apply(console, args);
            this.handleError({
                message: args.join(' '),
                file: 'Console',
                line: 'N/A',
                col: 'N/A',
                error: args[0]
            });
        };
    }

    handleError(error) {
        try {
            // Pausar el juego si es posible
            if (this.game && this.game.loop) {
                this.game.loop.sleep();
            }

            // Añadir error y mostrar
            this.errors.push(error);
            this.updateErrorsDisplay();
            this.show();
        } catch (e) {
            console.error('Error en el manejador de errores:', e);
        }
    }

    updateErrorsDisplay() {
        this.errorsContainer.innerHTML = '';
        
        this.errors.forEach((error, index) => {
            const errorElement = document.createElement('div');
            errorElement.style = `
                margin-bottom: 15px;
                padding: 15px;
                background-color: rgba(30, 30, 30, 0.7);
                border-left: 4px solid #ff0000;
                border-radius: 0 4px 4px 0;
            `;

            const location = error.file !== 'Console' 
                ? `${error.line} | ${this.formatFilePath(error.file)}`
                : 'Console';

            const stackTrace = error.error?.stack ? `
                <div style="color: #aaaaaa; font-size: 14px; margin-top: 10px; white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.4;">
                    ${this.escapeHtml(error.error.stack)}
                </div>
            ` : '';

            errorElement.innerHTML = `
                <div style="color: #ff5555; font-weight: bold; font-size: 16px; margin-bottom: 8px; font-family: 'Courier New', monospace;">
                    ${location}
                </div>
                <div style="color: #ffffff; font-size: 15px; line-height: 1.4;">
                    ${this.escapeHtml(error.message)}
                </div>
                ${stackTrace}
            `;

            this.errorsContainer.appendChild(errorElement);
        });

        // Auto-scroll al final
        this.errorsContainer.scrollTop = this.errorsContainer.scrollHeight;
    }

    formatFilePath(path) {
        if (!path) return 'Unknown';
        const parts = path.split(/[\\/]/);
        return parts[parts.length - 1];
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    show() {
        if (!this.isVisible) {
            this.container.style.display = 'flex';
            this.isVisible = true;
        }
    }

    hide() {
        if (this.isVisible) {
            this.container.style.display = 'none';
            this.isVisible = false;
            
            if (this.game && this.game.loop) {
                this.game.loop.wake();
            }
        }
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}