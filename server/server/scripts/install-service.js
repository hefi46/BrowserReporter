const Service = require('node-windows').Service;
const path = require('path');
const config = require('config');
const logger = require('../src/utils/logger');

// Create a new service object
const svc = new Service({
    name: 'BrowserReporterService',
    description: 'Browser History Reporting Service for Enterprise',
    script: path.join(process.cwd(), 'src', 'index.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: [
        {
            name: "NODE_ENV",
            value: process.env.NODE_ENV || "production"
        }
    ]
});

// Listen for service install events
svc.on('install', () => {
    logger.info('Service installed successfully');
    svc.start();
});

svc.on('alreadyinstalled', () => {
    logger.warn('Service is already installed');
});

svc.on('start', () => {
    logger.info('Service started successfully');
});

svc.on('error', (err) => {
    logger.error('Service error:', err);
});

// Install the service
logger.info('Installing service...');
svc.install(); 