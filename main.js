const { app, BrowserWindow } = require('electron')

app.whenReady().then(createWindow)
app.on('window-all-closed', app.quit)

//Opens window on app start
function createWindow () {
    const win = new BrowserWindow({
        width: 1200,
        height: 1000,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
          }
    })
    win.loadFile('index.html')
}