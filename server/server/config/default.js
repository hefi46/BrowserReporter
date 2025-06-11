module.exports = {
    port: 3000,
    session: {
        secret: 'change-this-in-production'
    },
    activeDirectory: {
        url: 'ldap://your-domain-controller',
        baseDN: 'dc=yourdomain,dc=com',
        username: 'service-account@yourdomain.com',
        password: 'change-this-in-production',
        adminGroup: 'BrowserReporterAdmins'
    },
    allowedOrigins: [
        'http://localhost:3000',
        'https://your-domain.com'
    ],
    database: {
        path: 'data/browser_history.db'
    },
    logging: {
        level: 'info',
        directory: 'logs'
    }
}; 