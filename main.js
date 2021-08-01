const { app, BrowserWindow } = require('electron')
const path = require('path')
const { contextIsolated } = require('process')

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
app.whenReady().then(createWindow)

//Closes app on window close
app.on('window-all-closed', function () {
    app.quit()
})