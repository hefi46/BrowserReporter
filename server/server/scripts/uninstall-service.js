const Service = require('node-windows').Service;
const path = require('path');
const logger = require('../src/utils/logger');

// Create a new service object
const svc = new Service({
    name: 'BrowserReporterService',
    script: path.join(process.cwd(), 'src', 'index.js')
});

// Listen for uninstall events
svc.on('uninstall', () => {
    logger.info('Service uninstalled successfully');
});

svc.on('error', (err) => {
    logger.error('Service error:', err);
});

// Uninstall the service
logger.info('Uninstalling service...');
svc.uninstall(); 