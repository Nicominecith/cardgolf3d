const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: "CardGolf 3D",
    fullscreen: false,
    center: true,
    autoHideMenuBar: true,
    // Icon-Pfad für das Anwendungsfenster
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Sicherheits-Empfehlung: falls du später Web-Inhalte lädst
      devTools: true 
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

// IPC-Kommunikation für Spiel-Funktionen
ipcMain.on('quit-game', () => {
  app.quit();
});

ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});

app.whenReady().then(() => {
  // WICHTIG: Die AppUserModelId stellt sicher, dass das Icon 
  // in der Taskleiste korrekt zugeordnet wird.
  if (process.platform === 'win32') {
    app.setAppUserModelId("com.nicominecit.cardgolf3d");
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});