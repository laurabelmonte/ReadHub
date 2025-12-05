// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
      
    }
    
  });

  // Carrega o index (ajuste se a sua pasta for diferente)
  win.loadFile(path.join(__dirname, 'frontend', 'index.html'));
}

app.whenReady().then(createWindow);

// Fecha app quando todas as janelas fecham 
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Recria janela no macOS quando o ícone é clicado e não há janelas abertas
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
