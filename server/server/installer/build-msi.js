const { MSICreator } = require('electron-wix-msi');
const path = require('path');
const { version } = require('./package.json');

// Path configurations
const APP_DIR = path.resolve(__dirname, './dist/win-unpacked');
const OUT_DIR = path.resolve(__dirname, './dist/installer');

// MSI configuration
async function createMSI() {
    const msiCreator = new MSICreator({
        appDirectory: APP_DIR,
        outputDirectory: OUT_DIR,
        description: 'Browser Reporter Server for Enterprise',
        exe: 'Browser Reporter Server',
        name: 'Browser Reporter Server',
        manufacturer: 'Your Company Name',
        version: version,
        appIconPath: path.resolve(__dirname, './assets/icon.ico'),
        programFilesFolderName: 'BrowserReporter',
        ui: {
            chooseDirectory: true,
            enable: true
        },
        features: {
            autoLaunch: false
        },
        beforeInstallation: async function(msi) {
            // Stop existing service if running
            await msi.executeCommand('net stop BrowserReporterService');
            return true;
        },
        afterInstallation: async function(msi) {
            // Start the configuration wizard
            await msi.executeCommand('start "" "%ProgramFiles%\\BrowserReporter\\Browser Reporter Server.exe"');
            return true;
        }
    });

    // Create a database
    await msiCreator.create();

    // Compile the database into the MSI
    await msiCreator.compile();
}

createMSI().catch(err => {
    console.error(err);
    process.exit(1);
}); 