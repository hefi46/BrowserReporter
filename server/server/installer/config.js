const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'config.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('save-config', (event, config) => {
    const configPath = path.join(process.env.PROGRAMDATA, 'BrowserReporter', 'config', 'production.js');
    
    try {
        fs.mkdirSync(path.join(process.env.PROGRAMDATA, 'BrowserReporter', 'config'), { recursive: true });
        
        const configContent = `module.exports = ${JSON.stringify(config, null, 4)};`;
        fs.writeFileSync(configPath, configContent);
        
        event.reply('config-saved', { success: true });
        
        // Close the app after successful save
        setTimeout(() => app.quit(), 2000);
    } catch (error) {
        event.reply('config-saved', { success: false, error: error.message });
    }
}); 