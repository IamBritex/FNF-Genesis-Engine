import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import path from 'path';
import Store from 'electron-store';

// Discord RPC
import './rpc.js';

const store = new Store();
let win = null;

// Configuración
const PORT = 3000;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

  win = new BrowserWindow({
    width,
    height,
    autoHideMenuBar: true,
    icon: path.join(process.cwd(), 'public', 'html', 'icon16.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      backgroundThrottling: false
    }
  });
  
  // Cargar archivos directamente desde el sistema de archivos
  const startPath = path.join('file://', process.cwd(), 'index.html');
  win.loadURL(startPath);

  // Atajos de teclado para pantalla completa y DevTools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && !input.control && !input.alt && !input.meta) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }

    if (input.key === 'F12' && !input.control && !input.alt && !input.meta) {
      toggleDevTools();
      event.preventDefault();
    }
  });
}

function toggleDevTools() {
  if (!win) return;

  const isOpen = win.webContents.isDevToolsOpened();
  if (isOpen) {
    win.webContents.closeDevTools();
  } else {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-store', (_event, key) => store.get(key));
ipcMain.handle('set-store', (_event, key, value) => store.set(key, value));