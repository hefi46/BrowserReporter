const path = require('path');
const fs = require('fs');
const config = require('config');
const logger = require('../utils/logger');

// Add ProgramData config directory to NODE_CONFIG_DIR
const programDataConfig = path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'BrowserReporter', 'config');

// Create the config directory if it doesn't exist
if (!fs.existsSync(programDataConfig)) {
    try {
        fs.mkdirSync(programDataConfig, { recursive: true });
    } catch (error) {
        logger.error('Failed to create config directory:', error);
    }
}

// Set NODE_CONFIG_DIR to include both default and ProgramData locations
process.env.NODE_CONFIG_DIR = `${programDataConfig},${path.join(__dirname, '../../config')}`;

// Load and validate configuration
function validateConfig() {
    const requiredFields = [
        'port',
        'session.secret',
        'activeDirectory.url',
        'activeDirectory.baseDN',
        'activeDirectory.username',
        'activeDirectory.password',
        'activeDirectory.adminGroup'
    ];

    for (const field of requiredFields) {
        try {
            const value = config.get(field);
            if (!value) {
                throw new Error(`${field} is empty`);
            }
        } catch (error) {
            throw new Error(`Missing required configuration: ${field}`);
        }
    }

    // Validate port number
    const port = config.get('port');
    if (port < 1 || port > 65535) {
        throw new Error('Invalid port number');
    }

    return true;
}

// Export configuration with validation
module.exports = {
    validateConfig,
    config
}; 