const app = require('./app');
const { config, validateConfig } = require('./config');
const logger = require('./utils/logger');
const { initializeDatabase } = require('./database');

const port = config.get('port') || 3000;

async function startServer() {
    try {
        // Validate configuration
        validateConfig();
        logger.info('Configuration validated successfully');

        // Initialize database
        await initializeDatabase();
        
        // Start the server
        app.listen(port, () => {
            logger.info(`Server running at http://localhost:${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer(); 