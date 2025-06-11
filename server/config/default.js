module.exports = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    },
    database: {
        path: process.env.DB_PATH || './data/browser_history.db',
        sessionsPath: './data/sessions.db'
    },
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    activeDirectory: {
        url: process.env.AD_URL,
        baseDN: process.env.AD_BASE_DN,
        username: process.env.AD_USERNAME,
        password: process.env.AD_PASSWORD,
        adminGroup: process.env.AD_ADMIN_GROUP
    },
    security: {
        extensionApiKey: process.env.EXTENSION_API_KEY || 'development-key'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: process.env.LOG_DIR || './logs'
    }
}; 