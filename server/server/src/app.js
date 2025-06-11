const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const config = require('config');
const path = require('path');

const logger = require('./utils/logger');
const { setupAuth } = require('./auth');
const routes = require('./routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? config.get('allowedOrigins') : '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: path.join(process.cwd(), 'data')
    }),
    secret: config.get('session.secret'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Set up authentication
setupAuth(app);

// API routes
app.use('/api', routes);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Error handling
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app; 