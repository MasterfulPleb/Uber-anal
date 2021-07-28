const { app, BrowserWindow } = require('electron')

//Opens window on app start
function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true
    })
    win.loadFile('index.html')
}
app.whenReady().then(createWindow)

//Closes app on window close
app.on('window-all-closed', function () {
    app.quit()
})