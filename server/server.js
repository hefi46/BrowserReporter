const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const ActiveDirectory = require('activedirectory2');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const winston = require('winston');
const yargs = require('yargs');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const toobusy = require('toobusy-js');

// Parse command line arguments
const argv = yargs
    .option('mode', {
        alias: 'm',
        description: 'Running mode',
        type: 'string',
        choices: ['local', 'service'],
        default: 'local'
    })
    .help()
    .argv;

// Load configuration
const config = require('./config/default');
if (argv.mode === 'local') {
    Object.assign(config, require('./config/local'));
}

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize logger
const logDir = path.join(__dirname, config.logging.directory || 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log')
        })
    ]
});

if (config.logging.console) {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "cdn.jsdelivr.net"],
        },
    },
}));
app.use(cors(config.cors));
app.use(bodyParser.json({ limit: '10kb' })); // Limit payload size

// Session configuration - MUST come before auto-login middleware
app.use(session({
    store: new SQLiteStore({
        db: path.basename(config.database.sessionsPath),
        dir: path.dirname(config.database.sessionsPath)
    }),
    secret: config.session.secret,
    resave: false,
    saveUninitialized: true, // Changed to true to support auto-login
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.session.maxAge
    }
}));

// Auto-login middleware for development
app.use((req, res, next) => {
    if (argv.mode === 'local' && !req.session.user) {
        req.session.user = { 
            username: 'admin',
            isAdmin: true 
        };
    }
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Active Directory configuration
let ad = null;
if (config.activeDirectory.enabled !== false) {
    ad = new ActiveDirectory(config.activeDirectory);
}

// Database setup
const db = new sqlite3.Database(config.database.path, (err) => {
    if (err) {
        logger.error('Error connecting to database:', err);
    } else {
        logger.info('Connected to SQLite database');
        createTables();
    }
});

function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS browser_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        url TEXT,
        title TEXT,
        visit_time INTEGER,
        computer_name TEXT
    )`);

    // Add favorites table
    db.run(`CREATE TABLE IF NOT EXISTS admin_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_username TEXT NOT NULL,
        favorite_username TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        UNIQUE(admin_username, favorite_username)
    )`);

    // Add user information table for AD details
    db.run(`CREATE TABLE IF NOT EXISTS user_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT,
        department TEXT,
        email TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Function to fetch and store user information from AD
async function fetchAndStoreUserInfo(username) {
    if (config.activeDirectory.enabled === false) {
        // For local development, use mock data
        const mockUser = config.activeDirectory.mockUsers[username];
        if (mockUser) {
            const displayName = mockUser.displayName || username;
            const department = mockUser.department || 'IT Department';
            const email = mockUser.email || `${username}@example.com`;
            
            db.run(
                `INSERT OR REPLACE INTO user_info (username, display_name, department, email, last_updated) 
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [username, displayName, department, email]
            );
        }
        return;
    }

    if (!ad) return;

    try {
        const user = await new Promise((resolve, reject) => {
            ad.findUser(username, (err, user) => {
                if (err) reject(err);
                resolve(user);
            });
        });

        if (user) {
            const displayName = user.displayName || user.cn || username;
            const department = user.department || 'Unknown Department';
            const email = user.mail || user.userPrincipalName || '';

            db.run(
                `INSERT OR REPLACE INTO user_info (username, display_name, department, email, last_updated) 
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [username, displayName, department, email],
                (err) => {
                    if (err) {
                        logger.error('Error storing user info:', err);
                    } else {
                        logger.info(`Updated user info for ${username}`);
                    }
                }
            );
        }
    } catch (error) {
        logger.error(`Error fetching AD info for ${username}:`, error);
    }
}

// Authentication middleware
const requireAuth = async (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // In local mode, admin is always authorized
    if (argv.mode === 'local') {
        return next();
    }

    try {
        let isAdmin = false;
        
        if (config.activeDirectory.enabled === false) {
            // Local development mode - check mock users
            const mockUser = config.activeDirectory.mockUsers[req.session.user.username];
            isAdmin = mockUser && mockUser.isAdmin;
        } else {
            // Production mode - check AD
            isAdmin = await new Promise((resolve, reject) => {
                ad.isUserMemberOf(req.session.user.username, config.activeDirectory.adminGroup, (err, isMember) => {
                    if (err) reject(err);
                    resolve(isMember);
                });
            });
        }

        if (isAdmin) {
            next();
        } else {
            res.status(403).json({ error: 'Requires admin privileges' });
        }
    } catch (error) {
        logger.error('Error checking admin status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API Routes
app.post('/api/auth', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        let authenticated = false;
        
        if (config.activeDirectory.enabled === false) {
            // Local development mode
            const mockUser = config.activeDirectory.mockUsers[username];
            authenticated = mockUser && mockUser.password === password;
        } else {
            // Production mode
            authenticated = await new Promise((resolve, reject) => {
                ad.authenticate(username, password, (err, auth) => {
                    if (err) reject(err);
                    resolve(auth);
                });
            });
        }

        if (authenticated) {
            req.session.user = { username };
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Extension data reporting endpoint
app.post('/api/report', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== config.security.extensionApiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    const { username, visits } = req.body;
    
    // Fetch and store user info from AD
    await fetchAndStoreUserInfo(username);
    
    const stmt = db.prepare(`
        INSERT INTO browser_data (username, url, title, visit_time, computer_name)
        VALUES (?, ?, ?, ?, ?)
    `);

    try {
        visits.forEach(visit => {
            stmt.run(
                username,
                visit.url,
                visit.title,
                visit.visitTime,
                visit.computerName
            );
        });
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report' });
    } finally {
        stmt.finalize();
    }
});

// Get all reports (grouped by user)
app.get('/api/reports/all', requireAuth, (req, res) => {
    const { username, computerName, activityDays, favorites } = req.query;
    const adminUsername = req.session.user.username;

    let query = `
        WITH user_summary AS (
            SELECT 
                username,
                COUNT(*) as total_visits,
                COUNT(DISTINCT url) as unique_urls,
                MAX(visit_time) as last_activity,
                GROUP_CONCAT(DISTINCT computer_name) as computers
            FROM browser_data
            GROUP BY username
        )
        SELECT 
            us.*,
            ui.display_name,
            ui.department,
            ui.email,
            CASE WHEN af.favorite_username IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM user_summary us
        LEFT JOIN user_info ui ON us.username = ui.username
        LEFT JOIN admin_favorites af 
            ON us.username = af.favorite_username 
            AND af.admin_username = ?
        WHERE 1=1
    `;
    
    const params = [adminUsername];

    if (username) {
        query += ' AND us.username LIKE ?';
        params.push(`%${username}%`);
    }

    if (computerName) {
        query += ' AND us.computers LIKE ?';
        params.push(`%${computerName}%`);
    }

    if (activityDays) {
        query += ' AND us.last_activity >= ?';
        const cutoffTime = Date.now() - (parseInt(activityDays) * 24 * 60 * 60 * 1000);
        params.push(cutoffTime);
    }

    if (favorites === 'true') {
        query += ' AND af.favorite_username IS NOT NULL';
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            logger.error('Error fetching reports:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const users = rows.map(row => ({
            username: row.username,
            displayName: row.display_name || row.username,
            department: row.department || 'Unknown Department',
            email: row.email || '',
            totalVisits: row.total_visits,
            uniqueUrls: row.unique_urls,
            lastActivity: new Date(row.last_activity).toISOString(),
            computerName: row.computers.split(',')[0],
            isFavorite: row.is_favorite === 1
        }));

        res.json(users);
    });
});

// Get user details and history
app.get('/api/reports/user/:username', requireAuth, (req, res) => {
    const { username } = req.params;
    const { url, startDate, endDate } = req.query;

    // First get the summary
    let summaryQuery = `
        SELECT 
            COUNT(*) as total_visits,
            COUNT(DISTINCT url) as unique_urls,
            MIN(visit_time) as first_activity,
            MAX(visit_time) as last_activity,
            COUNT(DISTINCT computer_name) as computer_count,
            GROUP_CONCAT(DISTINCT computer_name) as computers
        FROM browser_data
        WHERE username = ?
    `;

    // Then get the history with proper filtering
    let historyQuery = `
        SELECT 
            url,
            title,
            MAX(visit_time) as last_visit_time,
            COUNT(*) as visit_count,
            computer_name
        FROM browser_data
        WHERE username = ?
    `;

    const params = [username];
    const historyParams = [username];

    if (url) {
        historyQuery += ' AND url LIKE ?';
        historyParams.push(`%${url}%`);
    }

    if (startDate) {
        const startTimestamp = new Date(startDate).getTime();
        historyQuery += ' AND visit_time >= ?';
        historyParams.push(startTimestamp);
    }

    if (endDate) {
        const endTimestamp = new Date(endDate + ' 23:59:59').getTime();
        historyQuery += ' AND visit_time <= ?';
        historyParams.push(endTimestamp);
    }

    historyQuery += `
        GROUP BY url
        ORDER BY last_visit_time DESC
        LIMIT 1000
    `;

    db.get(summaryQuery, params, (err, summary) => {
        if (err) {
            logger.error('Error fetching user summary:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!summary) {
            return res.json({
                summary: {
                    totalVisits: 0,
                    uniqueUrls: 0,
                    firstActivity: null,
                    lastActivity: null,
                    computerCount: 0,
                    computers: []
                },
                history: []
            });
        }

        db.all(historyQuery, historyParams, (err, history) => {
            if (err) {
                logger.error('Error fetching user history:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                summary: {
                    totalVisits: summary.total_visits || 0,
                    uniqueUrls: summary.unique_urls || 0,
                    firstActivity: summary.first_activity ? new Date(summary.first_activity).toISOString() : null,
                    lastActivity: summary.last_activity ? new Date(summary.last_activity).toISOString() : null,
                    computerCount: summary.computer_count || 0,
                    computers: summary.computers ? summary.computers.split(',') : []
                },
                history: (history || []).map(item => ({
                    url: item.url,
                    title: item.title,
                    lastVisitTime: new Date(item.last_visit_time).toISOString(),
                    visitCount: item.visit_count,
                    computerName: item.computer_name
                }))
            });
        });
    });
});

// Refresh user information from AD
app.post('/api/refresh-user-info/:username', requireAuth, async (req, res) => {
    const { username } = req.params;
    
    try {
        await fetchAndStoreUserInfo(username);
        res.json({ success: true, message: 'User information refreshed' });
    } catch (error) {
        logger.error('Error refreshing user info:', error);
        res.status(500).json({ error: 'Failed to refresh user information' });
    }
});

// Favorites management
app.get('/api/favorites', requireAuth, (req, res) => {
    const adminUsername = req.session.user.username;
    
    db.all(
        'SELECT favorite_username, added_at, notes FROM admin_favorites WHERE admin_username = ?',
        [adminUsername],
        (err, rows) => {
            if (err) {
                logger.error('Error fetching favorites:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(rows);
        }
    );
});

app.post('/api/favorites/add', requireAuth, (req, res) => {
    const { favoriteUsername, notes } = req.body;
    const adminUsername = req.session.user.username;
    
    db.run(
        'INSERT OR REPLACE INTO admin_favorites (admin_username, favorite_username, notes) VALUES (?, ?, ?)',
        [adminUsername, favoriteUsername, notes],
        (err) => {
            if (err) {
                logger.error('Error adding favorite:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        }
    );
});

app.delete('/api/favorites/remove', requireAuth, (req, res) => {
    const { favoriteUsername } = req.body;
    const adminUsername = req.session.user.username;
    
    db.run(
        'DELETE FROM admin_favorites WHERE admin_username = ? AND favorite_username = ?',
        [adminUsername, favoriteUsername],
        (err) => {
            if (err) {
                logger.error('Error removing favorite:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        }
    );
});

// Export functionality
function formatExportData(data, format) {
    switch (format) {
        case 'json':
            return JSON.stringify(data, null, 2);
        
        case 'csv':
            const csvRows = [];
            // Add headers
            if (data.length > 0) {
                csvRows.push(Object.keys(data[0]).join(','));
            }
            // Add data rows
            data.forEach(item => {
                csvRows.push(Object.values(item).map(val => {
                    if (typeof val === 'string' && val.includes(',')) {
                        return `"${val}"`;
                    }
                    return val;
                }).join(','));
            });
            return csvRows.join('\n');
        
        case 'xlsx':
            // For XLSX, we'll return JSON and let the client handle the conversion
            return JSON.stringify(data);
        
        default:
            throw new Error('Unsupported format');
    }
}

app.get('/api/export/all', requireAuth, (req, res) => {
    const { format = 'json' } = req.query;
    
    const query = `
        SELECT 
            username,
            url,
            title,
            timestamp,
            computer_name
        FROM browser_data
        ORDER BY timestamp DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            logger.error('Error exporting data:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        try {
            const formattedData = formatExportData(rows, format);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename=browser-history.${format}`);
            res.send(formattedData);
        } catch (error) {
            logger.error('Error formatting export data:', error);
            res.status(400).json({ error: 'Invalid export format' });
        }
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    res.json({
        authenticated: !!req.session.user,
        user: req.session.user || null
    });
});

// Legacy endpoint for compatibility (used by extension)
app.get('/api/data', requireAuth, (req, res) => {
    const query = `
        SELECT 
            username,
            url,
            title,
            timestamp,
            computer_name
        FROM browser_data
        ORDER BY timestamp DESC
        LIMIT 100
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            logger.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Start server
const port = config.server.port || 3000;
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal. Shutting down gracefully...');
    server.close(() => {
        db.close();
        process.exit(0);
    });
}); 