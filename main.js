const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(createWindow);
app.on('window-all-closed', app.quit);

var win;

//Opens window on app start
function createWindow () {
    win = new BrowserWindow({
        width: 1200,
        height: 1000,
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
            //nodeIntegration: true,
            //contextIsolation: false,
          }
    });
    win.loadFile('index.html');
}

ipcMain.on('toMain', )
