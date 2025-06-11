const sqlite3 = require('sqlite3');
const path = require('path');
const logger = require('../utils/logger');

let db;

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(process.cwd(), 'data', 'browser_history.db');
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                logger.error('Error connecting to database:', err);
                reject(err);
                return;
            }

            logger.info('Connected to SQLite database');
            createTables()
                .then(resolve)
                .catch(reject);
        });
    });
}

async function createTables() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS browser_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            visit_time INTEGER NOT NULL,
            browser TEXT NOT NULL,
            computer_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_user_time ON browser_history(user_id, visit_time)`,
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT,
            email TEXT,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const query of queries) {
        await runQuery(query);
    }
}

function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                logger.error('Database query error:', err);
                reject(err);
                return;
            }
            resolve(this);
        });
    });
}

function getAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                logger.error('Database query error:', err);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function get(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                logger.error('Database query error:', err);
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

async function addHistoryEntry(entry) {
    const query = `
        INSERT INTO browser_history 
        (user_id, url, title, visit_time, browser, computer_name)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    return runQuery(query, [
        entry.userId,
        entry.url,
        entry.title,
        entry.visitTime,
        entry.browser,
        entry.computerName
    ]);
}

async function getHistory(filters = {}) {
    let query = `SELECT * FROM browser_history WHERE 1=1`;
    const params = [];

    if (filters.userId) {
        query += ` AND user_id = ?`;
        params.push(filters.userId);
    }

    if (filters.startDate) {
        query += ` AND visit_time >= ?`;
        params.push(filters.startDate);
    }

    if (filters.endDate) {
        query += ` AND visit_time <= ?`;
        params.push(filters.endDate);
    }

    if (filters.browser) {
        query += ` AND browser = ?`;
        params.push(filters.browser);
    }

    query += ` ORDER BY visit_time DESC`;

    if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
    }

    return getAll(query, params);
}

module.exports = {
    initializeDatabase,
    addHistoryEntry,
    getHistory,
    runQuery,
    getAll,
    get
}; 