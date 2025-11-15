/*
  Este es el proceso main de Electron.
*/

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Deshabilitar autofill antes del ready
app.commandLine.appendSwitch('disable-features', 'Autofill');

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
  });

  const gamePath = path.join(__dirname, '..', '..', 'index.html');
  mainWindow.loadFile(gamePath);

  // [CORRECCIÓN] Comentamos esta línea.
  // Al establecer el menú como 'null', se elimina por completo.
  // Al comentarlo, Electron mostrará el menú por defecto (Archivo, Editar, etc.).
  // Menu.setApplicationMenu(null);

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });
}

app.whenReady().then(() => {
  // 🔹 Inicializar DiscordRPC
  require('../funkin/API/discordRPC');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
