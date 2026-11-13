// TaskFlow - Backend Server
// Node.js + Express + better-sqlite3
// Synchronous SQLite database - no separate server required
// Perfect for development, testing, and portfolio demonstration
//
// Features:
// - User registration and login (secure authentication)
// - Current user profile endpoint (GET /api/auth/me)
// - Task CRUD operations (Create, Read, Update, Delete)
// - Task priorities and status management
// - Search and filters
// - Input validation and consistent error handling
// - Error handling and security protections
//
// To run: node index.js
// Database: ./taskflow.db (created automatically)

require('dotenv').config();

const express = require('express');
const { initDb, runSql, allSql, getSql } = require('./database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed values (single source of truth for validation)
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['To Do', 'In Progress', 'Done'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// JWT secret: environment variable preferred, dev fallback with a loud warning
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key';
if (!process.env.JWT_SECRET) {
    console.warn(
        '[security] JWT_SECRET is not set - using an insecure development fallback. ' +
        'Create server/.env from .env.example before any real deployment.'
    );
}

// CORS: same-origin through the Vite dev proxy, but allow direct dev origins too
const CLIENT_ORIGINS = (
    process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:4173'
).split(',').map((o) => o.trim()).filter(Boolean);

// Middleware
app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json({ limit: '100kb' }));

// Initialize database
initDb();

// JWT helpers
const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });
};

// Sanitize a user row - never leak the password hash
const publicUser = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at
});

// Validate a task payload. Returns an error message or null when valid.
// `partial` = true is used for PUT (only validate provided fields).
const validateTaskPayload = (body, { partial = false } = {}) => {
    const { title, description, priority, status, due_date } = body;

    if (!partial || title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
            return 'Task title is required';
        }
        if (title.trim().length > 200) {
            return 'Task title must be 200 characters or fewer';
        }
    }

    if (description !== undefined && description !== null) {
        if (typeof description !== 'string') {
            return 'Task description must be text';
        }
        if (description.length > 2000) {
            return 'Task description must be 2000 characters or fewer';
        }
    }

    if (priority !== undefined && priority !== null && !PRIORITIES.includes(priority)) {
        return 'Priority must be one of: ' + PRIORITIES.join(', ');
    }

    if (status !== undefined && status !== null && !STATUSES.includes(status)) {
        return 'Status must be one of: ' + STATUSES.join(', ');
    }

    if (due_date !== undefined && due_date !== null && due_date !== '') {
        if (typeof due_date !== 'string' || !DATE_REGEX.test(due_date)) {
            return 'Due date must be in YYYY-MM-DD format';
        }
        const parsed = new Date(due_date + 'T00:00:00Z');
        if (Number.isNaN(parsed.getTime())) {
            return 'Due date is not a valid calendar date';
        }
    }

    return null;
};

// ============================================================
// PUBLIC ROUTES - defined BEFORE authentication middleware
// ============================================================

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
app.post('/api/auth/register', (req, res) => {
    try {
        const body = req.body || {};
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        if (password.length > 128) {
            return res.status(400).json({ message: 'Password must be 128 characters or fewer' });
        }

        // Check if user already exists
        const existingUsers = allSql(
            'SELECT id FROM users WHERE email = ?', [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'User already exists with this email' });
        }

        // Hash password - synchronous (matches better-sqlite3 synchronous API)
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert user
        const result = runSql(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        const token = generateToken(result.lastInsertRowid);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.lastInsertRowid, name, email }
        });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
app.post('/api/auth/login', (req, res) => {
    try {
        const body = req.body || {};
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user
        const users = allSql('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Compare password
        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
            message: 'Logged in successfully',
            token,
            user: publicUser(user)
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const authenticate = (req, res, next) => {
    const header = req.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
        try {
            const token = header.slice(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = { id: decoded.id };
            return next();
        } catch (error) {
            const expired = error && error.name === 'TokenExpiredError';
            return res.status(401).json({
                message: expired
                    ? 'Session expired, please log in again'
                    : 'Not authorized, token failed'
            });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

// Apply auth middleware to all protected routes (after this line)
app.use('/api/', authenticate);

// ============================================================
// PROTECTED ROUTES - require authentication
// ============================================================

// @route   GET /api/auth/me
// @desc    Get the currently authenticated user's profile
// @access  Private
app.get('/api/auth/me', (req, res) => {
    try {
        const user = getSql(
            'SELECT id, name, email, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/tasks
// @desc    Get all tasks for logged-in user
// @access  Private
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = allSql(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC',
            [req.user.id]
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
app.post('/api/tasks', (req, res) => {
    try {
        const body = req.body || {};

        const validationError = validateTaskPayload(body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const title = body.title.trim();
        const description = typeof body.description === 'string' ? body.description.trim() : '';
        const priority = body.priority || 'Medium';
        const status = body.status || 'To Do';
        const due_date = body.due_date === '' ? null : (body.due_date || null);

        const result = runSql(
            'INSERT INTO tasks (user_id, title, description, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, title, description, priority, status, due_date]
        );

        const task = getSql(
            'SELECT * FROM tasks WHERE id = ?',
            [result.lastInsertRowid]
        );

        res.status(201).json(task);
    } catch (err) {
        console.error('Create task error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task (partial update)
// @access  Private
app.put('/api/tasks/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ message: 'Task id must be a number' });
        }

        const body = req.body || {};

        // Check if task exists and belongs to user
        const existingTasks = allSql(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingTasks.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const validationError = validateTaskPayload(body, { partial: true });
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        // Build update query dynamically (partial update)
        const updates = [];
        const values = [];

        if (body.title !== undefined) {
            updates.push('title = ?');
            values.push(typeof body.title === 'string' ? body.title.trim() : body.title);
        }
        if (body.description !== undefined) {
            updates.push('description = ?');
            values.push(body.description === null ? null : String(body.description).trim());
        }
        if (body.priority !== undefined) {
            updates.push('priority = ?');
            values.push(body.priority);
        }
        if (body.status !== undefined) {
            updates.push('status = ?');
            values.push(body.status);
        }
        if (body.due_date !== undefined) {
            updates.push('due_date = ?');
            values.push(body.due_date === '' ? null : body.due_date);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);

        runSql(
            'UPDATE tasks SET ' + updates.join(', ') + ' WHERE id = ? AND user_id = ?',
            values.concat(req.user.id)
        );

        const task = getSql(
            'SELECT * FROM tasks WHERE id = ?',
            [id]
        );

        res.json(task);
    } catch (err) {
        console.error('Update task error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
app.delete('/api/tasks/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ message: 'Task id must be a number' });
        }

        const result = runSql(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ message: 'Task removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/tasks/search
// @desc    Search tasks by title/description, optionally filter by status/priority
// @access  Private
app.get('/api/tasks/search', (req, res) => {
    try {
        const { query, status, priority } = req.query;
        const userId = req.user.id;

        let sql = 'SELECT * FROM tasks WHERE user_id = ?';
        const values = [userId];

        if (query) {
            sql += ' AND (title LIKE ? OR description LIKE ?)';
            const like = '%' + String(query) + '%';
            values.push(like, like);
        }

        if (status) {
            if (!STATUSES.includes(status)) {
                return res.status(400).json({
                    message: 'Status must be one of: ' + STATUSES.join(', ')
                });
            }
            sql += ' AND status = ?';
            values.push(status);
        }

        if (priority) {
            if (!PRIORITIES.includes(priority)) {
                return res.status(400).json({
                    message: 'Priority must be one of: ' + PRIORITIES.join(', ')
                });
            }
            sql += ' AND priority = ?';
            values.push(priority);
        }

        sql += ' ORDER BY created_at DESC, id DESC';

        const tasks = allSql(sql, values);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/tasks/status/:status
// @desc    Get tasks by status
// @access  Private
app.get('/api/tasks/status/:status', (req, res) => {
    try {
        const { status } = req.params;
        if (!STATUSES.includes(status)) {
            return res.status(400).json({
                message: 'Status must be one of: ' + STATUSES.join(', ')
            });
        }
        const tasks = allSql(
            'SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY created_at DESC, id DESC',
            [req.user.id, status]
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/tasks/priority/:priority
// @desc    Get tasks by priority
// @access  Private
app.get('/api/tasks/priority/:priority', (req, res) => {
    try {
        const { priority } = req.params;
        if (!PRIORITIES.includes(priority)) {
            return res.status(400).json({
                message: 'Priority must be one of: ' + PRIORITIES.join(', ')
            });
        }
        const tasks = allSql(
            'SELECT * FROM tasks WHERE user_id = ? AND priority = ? ORDER BY created_at DESC, id DESC',
            [req.user.id, priority]
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics for the logged-in user
// @access  Private
app.get('/api/dashboard/stats', (req, res) => {
    try {
        // COALESCE: SQLite returns NULL from SUM() when a user has no tasks
        const stats = getSql(
            'SELECT COUNT(*) as total_tasks, '
            + "COALESCE(SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END), 0) as todo_count, "
            + "COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) as in_progress_count, "
            + "COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0) as done_count, "
            + "COALESCE(SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END), 0) as high_priority_count "
            + 'FROM tasks WHERE user_id = ?',
            [req.user.id]
        );
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Handle undefined routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handler (malformed JSON, unexpected errors)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    console.error('Error:', err && err.message);
    res.status(500).json({ message: 'Server error' });
});

// Start server only when executed directly (not when imported by tests)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log('Server running on port ' + PORT);
    });
}

module.exports = app;
