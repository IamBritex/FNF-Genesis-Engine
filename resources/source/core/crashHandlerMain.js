// source/electron/crashHandlerMain.js
// Este es el "backend" del crash handler para el proceso Main de Electron

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs'); // <--- 1. AÑADIR 'fs'

/**
 * Crea la ventana de reporte de errores.
 */
function createCrashWindow(errorData) {
  const crashWindow = new BrowserWindow({
    width: 600,
    height: 700,
    backgroundColor: '#222222',
    title: 'FNF: Genesis Engine - Reporte de Error',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // --- Obtener la ruta de la imagen ---
  const gamePath = path.join(__dirname, '..', '..', 'index.html');
  const gameDir = path.dirname(gamePath);
  const imgPath = path.join(gameDir, 'public', 'images', 'ui', 'uh-oh.png');

  // --- [CORRECCIÓN] ---
  // Convertir la imagen a un Data URL (Base64)
  // para que pueda ser mostrada en la ventana 'data:text/html'
  let imgUrl = ""; // Variable por defecto
  try {
    // 2. Leer el archivo de imagen desde el disco
    const imageBuffer = fs.readFileSync(imgPath);
    // 3. Convertir el buffer de la imagen a un string Base64
    const imageBase64 = imageBuffer.toString('base64');
    // 4. Crear el string 'src' completo para el <img>
    imgUrl = `data:image/png;base64,${imageBase64}`;
  } catch (e) {
    console.error(`Error: No se pudo cargar la imagen del crash handler en: ${imgPath}`);
    console.error(e.message);
  }
  // --- FIN DE LA CORRECCIÓN ---


  // --- Crear contenido HTML ---
  const errorStackHtml = errorData.stack.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-TABLE-8">
        <title>Reporte de Error</title>
        <style>
            body { background-color: #222; color: white; font-family: Arial, sans-serif;
                   padding: 20px; overflow: hidden; display: flex; flex-direction: column;
                   height: 100vh; box-sizing: border-box; margin: 0; }
            img { display: block; margin: 0 auto 15px auto; max-width: 400px; width: 100%; }
            pre { background-color: #111; padding: 10px; border: 1px solid #555;
                  white-space: pre-wrap; word-break: break-all; overflow: auto;
                  flex-grow: 1; min-height: 100px; }
            .button-container { text-align: right; margin-top: 15px; flex-shrink: 0; }
            button { padding: 8px 15px; border: none; border-radius: 5px;
                     background-color: #f44336; color: white; cursor: pointer; font-size: 14px;
                     margin-left: 10px; }
            button:hover { opacity: 0.8; }
            button#acceptBtn { background-color: #555; }
        </style>
    </head>
    <body>
        <img src="${imgUrl}" alt="Uh-oh!">
        
        <pre id="error-stack">${errorStackHtml}</pre>

        <div class="button-container">
            <button id="copyBtn">Copiar Error</button>
            <button id="acceptBtn">Aceptar</button>
        </div>

        <script>
            document.getElementById('copyBtn').addEventListener('click', () => {
                const errorText = document.getElementById('error-stack').textContent;
                navigator.clipboard.writeText(errorText).then(() => {
                    document.getElementById('copyBtn').textContent = '¡Copiado!';
                }, (err) => {
                    document.getElementById('copyBtn').textContent = '¡Falló!';
                });
            });

            document.getElementById('acceptBtn').addEventListener('click', () => {
                window.close();
            });
        </script>
    </body>
    </html>
  `;

  crashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(htmlContent)}`);
}

/**
 * Inicializa el listener de IPC para recibir eventos de crash
 * desde el proceso renderer (el juego).
 */
function initCrashHandlerMain() {
  ipcMain.on('show-crash-report', (event, errorData) => {
    createCrashWindow(errorData);
  });
}

// Exportamos la función de inicialización
module.exports = { initCrashHandlerMain };