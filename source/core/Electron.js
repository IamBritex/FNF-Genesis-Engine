/*
  Este es el proceso main de Electron.
*/

// 'url' ya no es necesario aquí, 'createCrashWindow' se ha movido
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// --- NUEVO ---
// Importamos el inicializador de nuestro manejador de errores
const { initCrashHandlerMain } = require('./crashHandlerMain');
// --- FIN NUEVO ---

// Deshabilitar autofill antes del ready
app.commandLine.appendSwitch('disable-features', 'Autofill');


// --- LA FUNCIÓN createCrashWindow() SE HA MOVIDO A crashHandlerMain.js ---


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 720,
    backgroundColor: '#000000',
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: "icons_desktop_env/icon.webp"
  });

  const gamePath = path.join(__dirname, '..', '..', 'index.html');
  mainWindow.loadFile(gamePath);
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });
}

app.whenReady().then(() => {
  // 🔹 Inicializar DiscordRPC
  require('../funkin/API/discordRPC');

  // --- NUEVO ---
  // Inicializamos el listener del crash handler
  initCrashHandlerMain();
  // --- FIN NUEVO ---

  createWindow();

  // --- EL LISTENER ipcMain.on('show-crash-report', ...) SE HA MOVIDO ---

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});