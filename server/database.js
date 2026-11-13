// TaskFlow - SQLite Database using better-sqlite3
// Synchronous SQLite database for Node.js
// Perfect for development and portfolio demonstration
//
// To run: node server/index.js
// Database: ./taskflow.db (created automatically)

const sqlite3 = require('better-sqlite3');
require('dotenv').config();

// Database instance - created when server starts
let database = null;

// Initialize database when module is loaded
const initDb = () => {
    const dbPath = process.env.DB_PATH || './taskflow.db';
    try {
        database = new sqlite3(dbPath);
        initializeSchema(database);
        console.log('SQLite database initialized: ' + dbPath);
    } catch (err) {
        console.error('SQLite initialization error:', err);
        process.exit(1);
    }
};

// Get database instance
const getDb = () => database;

// Execute SQL and return result (synchronous)
const runSql = (sql, params = []) => {
    if (!database) {
        throw new Error('Database not initialized');
    }
    const stmt = database.prepare(sql);
    const result = stmt.run(params);
    return result;
};

// Execute SQL and return all rows (synchronous)
const allSql = (sql, params = []) => {
    if (!database) {
        throw new Error('Database not initialized');
    }
    const stmt = database.prepare(sql);
    const rows = stmt.all(params);
    return rows;
};

// Execute SQL and get first row (synchronous)
const getSql = (sql, params = []) => {
    if (!database) {
        throw new Error('Database not initialized');
    }
    const stmt = database.prepare(sql);
    const row = stmt.get(params);
    return row;
};

// Initialize database schema - compatible with better-sqlite3
const initializeSchema = (db) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'Medium',
            status TEXT DEFAULT 'To Do',
            due_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_task_title ON tasks(title)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_task_status_priority ON tasks(status, priority)');
};

// Export database functions
module.exports = {
    initDb,
    getDb,
    runSql,
    allSql,
    getSql,
    initializeSchema
};