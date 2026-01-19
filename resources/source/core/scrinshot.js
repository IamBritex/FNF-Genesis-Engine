import Genesis from '../funkin/API/genesis.js';

/**
 * ScreenshotHandler
 * Maneja la captura de pantalla con Flash, Sonido y Descarga directa.
 */
class ScreenshotHandler {
    constructor() {
        this.initStyles();
        this.addListeners();
        this.isTakingScreenshot = false;
    }

    initStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #screenshot-flash {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: white; opacity: 0; pointer-events: none;
                z-index: 9999; transition: opacity 0.5s ease-out;
            }
            #screenshot-thumb {
                position: fixed; top: 20px; right: 20px; width: 25%; max-width: 320px;
                height: auto; border: 3px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                border-radius: 4px; z-index: 9998; opacity: 0;
                transform: translateY(-20px) scale(0.95);
                transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            }
            #screenshot-thumb.show { opacity: 1; transform: translateY(0) scale(1); }
        `;
        document.head.appendChild(style);

        if (!document.getElementById('screenshot-flash')) {
            const flash = document.createElement('div');
            flash.id = 'screenshot-flash';
            document.body.appendChild(flash);
        }
    }

    addListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F2' && !this.isTakingScreenshot) {
                this.takeScreenshot();
            }
        });
    }

    takeScreenshot() {
        const game = window.game;
        if (!game) return;

        this.isTakingScreenshot = true;
        this.playSound();

        // Efecto Flash
        const flashEl = document.getElementById('screenshot-flash');
        flashEl.style.opacity = '0.8';
        setTimeout(() => { flashEl.style.opacity = '0'; }, 150);

        // Capturar
        game.renderer.snapshot((image) => {
            const base64Data = image.src;
            this.showThumbnail(base64Data);
            this.saveScreenshot(base64Data); // Guardado unificado
            setTimeout(() => { this.isTakingScreenshot = false; }, 1000);
        });
    }

    playSound() {
        const soundPaths = ['public/sounds/screenshot.ogg', 'sounds/screenshot.ogg', '/sounds/screenshot.ogg'];
        const playNext = (index) => {
            if (index >= soundPaths.length) return;
            const audio = new Audio(soundPaths[index]);
            audio.volume = 0.6;
            audio.play().catch(() => playNext(index + 1));
            audio.onerror = () => playNext(index + 1);
        };
        playNext(0);
    }

    showThumbnail(src) {
        let thumb = document.getElementById('screenshot-thumb');
        if (thumb) thumb.remove();
        thumb = document.createElement('img');
        thumb.id = 'screenshot-thumb';
        thumb.src = src;
        document.body.appendChild(thumb);
        thumb.getBoundingClientRect();
        thumb.classList.add('show');
        setTimeout(() => {
            if (thumb) {
                thumb.style.opacity = '0';
                thumb.style.transform = 'translateY(-20px)';
                setTimeout(() => thumb.remove(), 500);
            }
        }, 3000);
    }

    /**
     * Guarda la captura usando el método nativo del navegador (descarga).
     * En Desktop (WebView2), esto abrirá el diálogo de "Guardar como" o irá a Descargas.
     */
    saveScreenshot(base64Data) {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${this.pad(now.getMonth() + 1)}-${this.pad(now.getDate())}_${this.pad(now.getHours())}-${this.pad(now.getMinutes())}-${this.pad(now.getSeconds())}`;
        const fileName = `screenshot-${timestamp}.png`;

        console.log(`[Screenshot] Iniciando descarga: ${fileName}`);

        const link = document.createElement('a');
        link.href = base64Data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click(); // Esto dispara la descarga en Web y WebView2
        document.body.removeChild(link);
    }

    pad(n) { return n < 10 ? '0' + n : n; }
}

const screenshotHandler = new ScreenshotHandler();
export default screenshotHandler;