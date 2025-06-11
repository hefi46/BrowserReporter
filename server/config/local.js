module.exports = {
    server: {
        port: 3000,
        host: 'localhost'
    },
    activeDirectory: {
        // Mock AD settings for local development
        enabled: false,
        mockUsers: {
            'admin': {
                password: 'admin123',
                isAdmin: true,
                displayName: 'Administrator',
                department: 'IT Department',
                email: 'admin@company.com'
            },
            'user': {
                password: 'user123',
                isAdmin: false,
                displayName: 'Test User',
                department: 'Sales Department',
                email: 'user@company.com'
            },
            'jsmith': {
                password: 'pass123',
                isAdmin: false,
                displayName: 'John Smith',
                department: 'Marketing Department',
                email: 'jsmith@company.com'
            },
            'mjohnson': {
                password: 'pass123',
                isAdmin: false,
                displayName: 'Mary Johnson',
                department: 'HR Department',
                email: 'mjohnson@company.com'
            }
        }
    },
    security: {
        extensionApiKey: 'local-dev-key'
    },
    cors: {
        origin: '*'
    },
    logging: {
        level: 'debug',
        console: true
    }
}; 