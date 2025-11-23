// source/core/CrashHandler.js

// Necesitamos ipcRenderer para el modo Electron, pero solo si estamos en Electron
let ipcRenderer;
const isElectron = !!window.process && !!window.process.type;

if (isElectron) {
  // 'require' es la forma de importar en el proceso renderer de Electron
  // cuando nodeIntegration: true
  ipcRenderer = require('electron').ipcRenderer;
}

export class CrashHandler {
  constructor(scene) {
    // Coincidimos con la llamada en game.js
    this.scene = scene;
    this.isElectron = isElectron;
    console.log("CrashHandler inicializado.");
  }

  /**
   * Punto de entrada principal para mostrar un error.
   * @param {Error} error El objeto de error capturado.
   */
  showError(error) {
    console.error("--- GAME CRASH DETECTADO ---");
    console.error(error);

    const errorData = {
      message: error.message || 'Error desconocido',
      stack: error.stack || 'No hay stack trace disponible'
    };

    if (this.isElectron && ipcRenderer) {
      this._showElectronCrashWindow(errorData);
    } else {
      // Si no es Electron, o ipcRenderer falló, muestra el modal del navegador
      this._showBrowserModal(errorData);
    }
  }

  /**
   * (Privado) Envía un mensaje al proceso Main de Electron para abrir la ventana de crash.
   */
  _showElectronCrashWindow(errorData) {
    ipcRenderer.send('show-crash-report', errorData);
  }

  /**
   * (Privado) Crea y muestra un modal HTML dentro del body.
   */
  _showBrowserModal(errorData) {
    // 1. Crear Overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '9998';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    // 2. Crear Modal
    const modal = document.createElement('div');
    modal.style.backgroundColor = '#222';
    modal.style.border = '2px solid #ff0000';
    modal.style.borderRadius = '10px';
    modal.style.padding = '20px';
    modal.style.maxWidth = '80vw';
    modal.style.maxHeight = '90vh';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.fontFamily = 'Arial, sans-serif';
    modal.style.color = 'white';
    modal.style.zIndex = '9999';

    // 3. Imagen
    const img = document.createElement('img');
    img.src = 'public/images/ui/uh-oh.png'; // Ruta relativa al index.html
    img.style.width = '100%';
    img.style.maxWidth = '400px';
    img.style.margin = '0 auto 15px auto';
    img.style.display = 'block';

    // 4. Texto del Error
    const errorContainer = document.createElement('pre');
    errorContainer.textContent = errorData.stack;
    errorContainer.style.backgroundColor = '#111';
    errorContainer.style.padding = '10px';
    errorContainer.style.overflow = 'auto'; // Scroll para errores largos
    errorContainer.style.maxHeight = '40vh';
    errorContainer.style.border = '1px solid #555';
    errorContainer.style.whiteSpace = 'pre-wrap'; // Ajuste de línea
    errorContainer.style.wordBreak = 'break-all';

    // 5. Contenedor de Botones
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '15px';
    buttonContainer.style.textAlign = 'right';

    // 6. Botón de Copiar
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar Error';
    copyBtn.style.padding = '8px 15px';
    copyBtn.style.border = 'none';
    copyBtn.style.borderRadius = '5px';
    copyBtn.style.backgroundColor = '#f44336';
    copyBtn.style.color = 'white';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.marginLeft = '10px';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(errorData.stack).then(() => {
        copyBtn.textContent = '¡Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar Error'; }, 2000);
      }, (err) => {
        copyBtn.textContent = '¡Falló!';
        console.error('Falló al copiar: ', err);
      });
    };

    // 7. Botón de Aceptar
    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Aceptar';
    acceptBtn.style.padding = '8px 15px';
    acceptBtn.style.border = 'none';
    acceptBtn.style.borderRadius = '5px';
    acceptBtn.style.backgroundColor = '#555';
    acceptBtn.style.color = 'white';
    acceptBtn.style.cursor = 'pointer';
    acceptBtn.style.marginLeft = '10px';
    acceptBtn.onclick = () => {
      document.body.removeChild(overlay); // Cierra el modal
    };

    // 8. Ensamblar (Orden cambiado para que Aceptar esté al final)
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(acceptBtn);
    modal.appendChild(img);
    modal.appendChild(errorContainer);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);

    // 9. Añadir al DOM
    document.body.appendChild(overlay);
  }
}