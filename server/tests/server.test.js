// TaskFlow - Backend Tests
// Jest + Supertest integration tests for the Express server
//
// Tests cover:
// - User registration and login (validation, errors)
// - Current user profile (GET /api/auth/me)
// - Authentication middleware (missing/invalid/expired tokens)
// - Task CRUD operations and ownership isolation
// - Input validation (priority, status, due date, title)
// - Search and filters
// - Dashboard statistics
// - Error handling and HTTP status codes
//
// To run: npm test
//
// IMPORTANT: tests run against an isolated database file so they can
// never touch development/demo data in taskflow.db.

// Must be set BEFORE ../index.js is required (it calls initDb() on load)
process.env.DB_PATH = process.env.TEST_DB_PATH || './taskflow_test.db';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { initDb, runSql } = require('../database.js');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key';

// Test user credentials
const testUser = {
    name: 'Test User',
    email: 'test@taskflow.dev',
    password: 'password123'
};

let authToken = '';

beforeAll(() => {
    // Initialize database with clean state (isolated test file)
    initDb();
});

beforeEach(async () => {
    // Clean tables before each test
    runSql('DELETE FROM tasks');
    runSql('DELETE FROM users');

    // Register and login a test user
    await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .set('Accept', 'application/json');

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .set('Accept', 'application/json');

    authToken = loginRes.body.token;
});

// Helper: create a task and return its id
const createTask = async (payload, token = authToken) => {
    const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer ' + token)
        .send(payload)
        .set('Accept', 'application/json');
    return res.body;
};

describe('Authentication - Registration', () => {
    test('should register a new user with valid data', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New User', email: 'newuser@taskflow.dev', password: 'password123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toBe('newuser@taskflow.dev');
        expect(res.body.user).not.toHaveProperty('password');
    });

    test('should reject registration with missing fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Incomplete' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject registration with short password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Test', email: 'short@test.com', password: '123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject duplicate email registration', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser)
            .set('Accept', 'application/json');

        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject registration with invalid email format', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Bad Email', email: 'not-an-email', password: 'password123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/valid email/i);
    });

    test('should trim whitespace and normalize email on register', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: '  Trimmed User  ', email: '  TRIMMED@TaskFlow.Dev  ', password: 'password123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(201);
        expect(res.body.user.name).toBe('Trimmed User');
        expect(res.body.user.email).toBe('trimmed@taskflow.dev');
    });

    test('should reject registration with a name shorter than 2 characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: ' A ', email: 'a@b.co', password: 'password123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/name/i);
    });
});

describe('Authentication - Login', () => {
    test('should login with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password })
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body.user).not.toHaveProperty('password');
    });

    test('should reject login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: 'wrongpassword' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject login with non-existent email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nonexistent@taskflow.dev', password: 'password123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message');
    });

    test('should return 400 when login fields are missing (regression: was 500)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({})
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    test('should return 400 for malformed JSON body', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"email": broken');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });
});

describe('Authentication - Current User Profile', () => {
    test('should return the authenticated user profile', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.email).toBe(testUser.email);
        expect(res.body.name).toBe(testUser.name);
        expect(res.body).toHaveProperty('id');
        expect(res.body).not.toHaveProperty('password');
    });

    test('should reject profile request without a token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Accept', 'application/json');

        expect(res.status).toBe(401);
    });

    test('should reject profile request with an expired token', async () => {
        const expiredToken = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '-10s' });
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer ' + expiredToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/expired/i);
    });
});

describe('Tasks - CRUD Operations', () => {
    test('should create a new task', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({
                title: 'Test Task',
                description: 'A test task description',
                priority: 'High',
                status: 'To Do',
                due_date: '2026-12-31'
            })
            .set('Accept', 'application/json');

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('title', 'Test Task');
        expect(res.body).toHaveProperty('priority', 'High');
        expect(res.body).toHaveProperty('status', 'To Do');
        expect(res.body).toHaveProperty('due_date', '2026-12-31');
        expect(res.body).toHaveProperty('user_id');
    });

    test('should reject task creation without title', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ description: 'No title' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject task creation with whitespace-only title', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ title: '   ' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
    });

    test('should reject task creation with invalid priority', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ title: 'Bad priority', priority: 'Urgent' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/priority/i);
    });

    test('should reject task creation with invalid status', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ title: 'Bad status', status: 'Finished' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/status/i);
    });

    test('should reject task creation with malformed due date', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ title: 'Bad date', due_date: 'tomorrow-ish' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/due date/i);
    });

    test('should reject task creation with title longer than 200 characters', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ title: 'x'.repeat(201) })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/200 characters/i);
    });

    test('should get all tasks for authenticated user', async () => {
        await createTask({ title: 'Task 1', priority: 'Medium', status: 'To Do' });

        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('should update a task', async () => {
        const created = await createTask({ title: 'Update Test', priority: 'Medium', status: 'To Do' });

        const res = await request(app)
            .put('/api/tasks/' + created.id)
            .set('Authorization', 'Bearer ' + authToken)
            .send({ status: 'Done' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'Done');
        expect(res.body).toHaveProperty('title', 'Update Test');
    });

    test('should reject update with invalid priority value', async () => {
        const created = await createTask({ title: 'Validation Test' });

        const res = await request(app)
            .put('/api/tasks/' + created.id)
            .set('Authorization', 'Bearer ' + authToken)
            .send({ priority: 'Critical' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/priority/i);
    });

    test('should reject update with no fields', async () => {
        const created = await createTask({ title: 'Empty Update' });

        const res = await request(app)
            .put('/api/tasks/' + created.id)
            .set('Authorization', 'Bearer ' + authToken)
            .send({})
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no fields/i);
    });

    test('should reject update of non-existent task', async () => {
        const res = await request(app)
            .put('/api/tasks/99999')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ status: 'Done' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject non-numeric task id', async () => {
        const res = await request(app)
            .put('/api/tasks/abc')
            .set('Authorization', 'Bearer ' + authToken)
            .send({ status: 'Done' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
    });

    test('should delete a task', async () => {
        const created = await createTask({ title: 'Delete Test', priority: 'Low', status: 'To Do' });

        const res = await request(app)
            .delete('/api/tasks/' + created.id)
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Task removed');

        // Verify it is really gone
        const list = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken);
        expect(list.body.find((t) => t.id === created.id)).toBeUndefined();
    });

    test('should reject deletion of non-existent task', async () => {
        const res = await request(app)
            .delete('/api/tasks/99999')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
    });
});

describe('Tasks - Ownership Isolation', () => {
    test('a second user cannot read, update, or delete another user\'s task', async () => {
        // Register + login a second user
        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Other User', email: 'other@taskflow.dev', password: 'password123' });

        const otherLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'other@taskflow.dev', password: 'password123' });
        const otherToken = otherLogin.body.token;

        const task = await createTask({ title: 'Private task of user A' });

        // User B cannot update it
        const putRes = await request(app)
            .put('/api/tasks/' + task.id)
            .set('Authorization', 'Bearer ' + otherToken)
            .send({ title: 'Hijacked' });
        expect(putRes.status).toBe(404);

        // User B cannot delete it
        const delRes = await request(app)
            .delete('/api/tasks/' + task.id)
            .set('Authorization', 'Bearer ' + otherToken);
        expect(delRes.status).toBe(404);

        // User B does not see it in their list
        const listRes = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer ' + otherToken);
        expect(listRes.body.find((t) => t.id === task.id)).toBeUndefined();

        // User A still owns the original title
        const ownRes = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer ' + authToken);
        expect(ownRes.body.find((t) => t.id === task.id).title).toBe('Private task of user A');
    });
});

describe('Tasks - Search and Filters', () => {
    beforeEach(async () => {
        await createTask({ title: 'High Priority Bug Fix', priority: 'High', status: 'To Do' });
        await createTask({ title: 'Medium Priority Feature', description: 'involves the checkout flow', priority: 'Medium', status: 'In Progress' });
        await createTask({ title: 'Low Priority Chore', priority: 'Low', status: 'Done' });
    });

    test('should search tasks by title', async () => {
        const res = await request(app)
            .get('/api/tasks/search?query=Bug')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        expect(res.body[0].title).toBe('High Priority Bug Fix');
    });

    test('should search tasks by description', async () => {
        const res = await request(app)
            .get('/api/tasks/search?query=checkout')
            .set('Authorization', 'Bearer ' + authToken);

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].title).toBe('Medium Priority Feature');
    });

    test('should combine search with status filter', async () => {
        const res = await request(app)
            .get('/api/tasks/search?query=Priority&status=Done')
            .set('Authorization', 'Bearer ' + authToken);

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].status).toBe('Done');
    });

    test('should reject search with invalid status value', async () => {
        const res = await request(app)
            .get('/api/tasks/search?status=Bogus')
            .set('Authorization', 'Bearer ' + authToken);

        expect(res.status).toBe(400);
    });

    test('should filter tasks by status', async () => {
        const res = await request(app)
            .get('/api/tasks/status/To%20Do')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        res.body.forEach((task) => {
            expect(task.status).toBe('To Do');
        });
    });

    test('should filter tasks by priority', async () => {
        const res = await request(app)
            .get('/api/tasks/priority/High')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        res.body.forEach((task) => {
            expect(task.priority).toBe('High');
        });
    });

    test('should reject invalid status in status route', async () => {
        const res = await request(app)
            .get('/api/tasks/status/Bogus')
            .set('Authorization', 'Bearer ' + authToken);

        expect(res.status).toBe(400);
    });
});

describe('Dashboard - Statistics', () => {
    test('should return dashboard statistics', async () => {
        await createTask({ title: 'Task 1', priority: 'High', status: 'To Do' });
        await createTask({ title: 'Task 2', priority: 'Medium', status: 'Done' });

        const res = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total_tasks');
        expect(res.body).toHaveProperty('todo_count');
        expect(res.body).toHaveProperty('in_progress_count');
        expect(res.body).toHaveProperty('done_count');
        expect(res.body).toHaveProperty('high_priority_count');
        expect(res.body.total_tasks).toBe(2);
        expect(res.body.todo_count).toBe(1);
        expect(res.body.done_count).toBe(1);
        expect(res.body.high_priority_count).toBe(1);
    });

    test('should return zeroed statistics for a user with no tasks', async () => {
        const res = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', 'Bearer ' + authToken);

        expect(res.status).toBe(200);
        expect(res.body.total_tasks).toBe(0);
        expect(res.body.done_count).toBe(0);
    });
});

describe('Authentication Middleware', () => {
    test('should reject requests without token', async () => {
        const res = await request(app)
            .get('/api/tasks')
            .set('Accept', 'application/json');

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject requests with invalid token', async () => {
        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer invalid-token-12345')
            .set('Accept', 'application/json');

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message');
    });

    test('should reject requests with a token signed by a different secret', async () => {
        const forged = jwt.sign({ id: 1 }, 'some-other-secret');
        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Bearer ' + forged);

        expect(res.status).toBe(401);
    });

    test('should reject a malformed Authorization header', async () => {
        const res = await request(app)
            .get('/api/tasks')
            .set('Authorization', 'Basic dXNlcjpwYXNz');

        expect(res.status).toBe(401);
    });
});

describe('Route Handling', () => {
    test('should return 404 for undefined routes', async () => {
        const res = await request(app)
            .get('/api/undefined-route')
            .set('Authorization', 'Bearer ' + authToken)
            .set('Accept', 'application/json');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
    });

    test('should return 404 for unknown task route', async () => {
        const res = await request(app)
            .get('/api/nope')
            .set('Authorization', 'Bearer ' + authToken);

        expect(res.status).toBe(404);
    });
});
