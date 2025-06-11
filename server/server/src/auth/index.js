const ActiveDirectory = require('activedirectory2');
const config = require('config');
const logger = require('../utils/logger');

let ad;

function initializeAD() {
    const adConfig = config.get('activeDirectory');
    ad = new ActiveDirectory({
        url: adConfig.url,
        baseDN: adConfig.baseDN,
        username: adConfig.username,
        password: adConfig.password
    });
    
    return ad;
}

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

async function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const isAdmin = await new Promise((resolve, reject) => {
            ad.isUserMemberOf(req.session.user.username, config.get('activeDirectory.adminGroup'), (err, isMember) => {
                if (err) reject(err);
                resolve(isMember);
            });
        });

        if (isAdmin) {
            next();
        } else {
            res.status(403).json({ error: 'Admin privileges required' });
        }
    } catch (error) {
        logger.error('Error checking admin status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function setupAuth(app) {
    // Initialize AD
    initializeAD();

    // Authentication endpoint
    app.post('/api/auth', async (req, res) => {
        const { username, password } = req.body;
        
        try {
            const auth = await new Promise((resolve, reject) => {
                ad.authenticate(username, password, (err, auth) => {
                    if (err) reject(err);
                    resolve(auth);
                });
            });

            if (auth) {
                // Get user details
                const user = await new Promise((resolve, reject) => {
                    ad.findUser(username, (err, user) => {
                        if (err) reject(err);
                        resolve(user);
                    });
                });

                req.session.user = {
                    username,
                    displayName: user.displayName,
                    email: user.mail
                };

                res.json({
                    success: true,
                    user: req.session.user
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        } catch (error) {
            logger.error('Authentication error:', error);
            res.status(500).json({
                success: false,
                error: 'Authentication failed'
            });
        }
    });

    // Session check endpoint
    app.get('/api/auth/status', (req, res) => {
        if (req.session.user) {
            res.json({
                authenticated: true,
                user: req.session.user
            });
        } else {
            res.status(401).json({
                authenticated: false
            });
        }
    });

    // Logout endpoint
    app.post('/api/auth/logout', (req, res) => {
        req.session.destroy();
        res.json({ success: true });
    });
}

module.exports = {
    setupAuth,
    requireAuth,
    requireAdmin
}; 