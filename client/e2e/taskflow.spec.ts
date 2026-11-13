// TaskFlow - End-to-end tests (real frontend + real backend + real SQLite)
//
// Runs against the dev servers:
//   backend  http://localhost:5000   (cd server && node index.js)
//   frontend http://localhost:5173   (cd client && npm run dev)
//
// These tests log in through the real UI, exercise every core feature,
// assert against the real API/database, and capture the portfolio
// screenshots into taskflow/screenshots/.

import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(HERE, '../../screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Produce a real, already-expired HS256 JWT (used to prove the API
// rejects expired sessions and the UI redirects to /login).
function makeExpiredJwt(secret: string): string {
    const b64url = (input: string | Buffer) =>
        Buffer.from(input).toString('base64url');
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = b64url(
        JSON.stringify({
            id: 1,
            iat: now - 7200,
            exp: now - 3600, // expired one hour ago
        })
    );
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');
    return `${header}.${payload}.${signature}`;
}

const DEMO_EMAIL = 'demo@taskflow.dev';
const DEMO_PASSWORD = 'demo123';

const E2E_EMAIL = 'e2e-tester@taskflow.dev';
const E2E_PASSWORD = 'e2e-password-123';
const E2E_TASK_TITLE = 'E2E test task';

const shot = (page: Page, name: string) =>
    page.screenshot({
        path: path.join(SCREENSHOTS_DIR, name),
        // Fast-forward CSS animations/transitions to their end state so a
        // capture never lands mid-fade (e.g. the modal entry animation).
        animations: 'disabled',
    });

// Collect console errors / page errors for assertions
function trackErrors(page: Page) {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    return errors;
}

const login = async (page: Page) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(DEMO_EMAIL);
    await page.getByLabel(/^password$/i).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/hey demo/i)).toBeVisible();
};

// Remove leftovers of the E2E task from previous (possibly failed) runs
const cleanupE2ETasks = async (page: Page) => {
    for (let i = 0; i < 10; i++) {
        const card = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
        if ((await card.count()) === 0) break;
        await card.first().getByRole('button', { name: new RegExp(`delete ${E2E_TASK_TITLE}`, 'i') }).click();
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Delete task' }).click();
        await expect(dialog).toBeHidden();
    }
};

// Create the E2E task through the UI when it does not exist yet
const ensureE2ETask = async (page: Page) => {
    const existing = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
    if ((await existing.count()) > 0) return;
    await page.getByRole('button', { name: 'New task' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/title/i).fill(E2E_TASK_TITLE);
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE })).toBeVisible();
};

const assertNoHorizontalOverflow = async (page: Page) => {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
};

// ===============================================================
// 1. Authentication
// ===============================================================
test('login page renders with no console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
    await page.waitForTimeout(400);
    await shot(page, '01-login.png');
    expect(errors).toEqual([]);
});

test('registration creates an account and reaches the dashboard', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await shot(page, '02-register.png');

    await page.getByLabel(/full name/i).fill('E2E Tester');
    await page.getByLabel(/email address/i).fill(E2E_EMAIL);
    await page.getByLabel(/^password$/i).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    // Race the two possible outcomes: 409 (account exists from a previous
    // run) or a successful registration that redirects to the dashboard.
    // (An instant isVisible() check would race the API response.)
    const existsAlert = page.getByRole('alert', { hasText: /already exists/i });
    const dashboardHeading = page.getByRole('heading', { level: 1, name: 'Dashboard' });
    const outcome = await Promise.race([
        existsAlert
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => 'exists' as const),
        dashboardHeading
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => 'registered' as const),
    ]);

    if (outcome === 'exists') {
        // Account already exists from a previous run -> sign in instead
        await page.goto('/login');
        await page.getByLabel(/email address/i).fill(E2E_EMAIL);
        await page.getByLabel(/^password$/i).fill(E2E_PASSWORD);
        await page.getByRole('button', { name: /^sign in$/i }).click();
    }

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/hey e2e/i)).toBeVisible();
});

test('login with the demo account shows the dashboard and statistics', async ({ page }) => {
    const errors = trackErrors(page);
    await login(page);

    // Welcome, stats and tasks are loaded from the real API
    await expect(page.locator('.stat-label')).toHaveText([
        'Total tasks',
        'Completed',
        'In progress',
        'Pending',
        'High priority',
    ]);
    await expect(page.locator('.task-card').first()).toBeVisible();
    // Chip shows just the total when no filters are active, "N of M" when filtered
    await expect(page.locator('.count-chip')).toHaveText(/^\d+( of \d+)?$/);

    await page.waitForTimeout(450); // let entry animations settle
    await assertNoHorizontalOverflow(page);
    await shot(page, '03-dashboard.png');
    expect(errors).toEqual([]);
});

test('shows the login page when authentication is missing or invalid', async ({ page }) => {
    // Invalid/garbage token stored in the browser
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('taskflow_token', 'garbage.invalid.token'));
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('taskflow_token'))).toBeNull();
});

test('an expired JWT is rejected and the user is sent back to login', async ({ page }) => {
    // Build a genuinely expired token in Node, signed with the same
    // secret the dev server uses (JWT_SECRET env is unset -> dev fallback)
    const expiredToken = makeExpiredJwt(
        process.env.JWT_SECRET || 'taskflow_secret_key'
    );

    await page.goto('/login');
    await page.evaluate(
        (token) => localStorage.setItem('taskflow_token', token),
        expiredToken
    );
    await page.goto('/dashboard');

    // Backend responds 401 -> frontend clears the token and redirects
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('taskflow_token'))).toBeNull();
});

test('logout clears the session and protects the dashboard', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /log out/i }).click();

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Direct navigation without a token must bounce back to login
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('taskflow_token'))).toBeNull();
});

// ===============================================================
// 2. Task CRUD (real database writes)
// ===============================================================
test('creates a task through the modal and stores it in SQLite', async ({ page }) => {
    await login(page);
    await cleanupE2ETasks(page);

    await page.getByRole('button', { name: 'New task' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/create new task/i)).toBeVisible();

    await dialog.getByLabel(/title/i).fill(E2E_TASK_TITLE);
    await dialog.getByLabel(/description/i).fill('Created by Playwright against the real API');
    await dialog.getByLabel(/priority/i).selectOption('High');
    await dialog.getByLabel(/status/i).selectOption('In Progress');
    await dialog.getByLabel(/due date/i).fill('2026-12-24');

    await shot(page, '04-create-task-modal.png');

    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Task created')).toBeVisible();

    const card = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
    await expect(card).toBeVisible();
    await expect(card.getByText('High')).toBeVisible();
    await expect(card.getByText('In Progress')).toBeVisible();
    await expect(card.getByText(/dec 24/i)).toBeVisible();

    // Verify it really persisted: reload from the backend
    await page.reload();
    await expect(page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE })).toBeVisible();
});

test('validates the task form without calling the API', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'New task' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Create task' }).click();

    await expect(dialog.getByRole('alert')).toContainText(/enter a task title/i);
    // Modal stays open so the user can correct the input
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
});

test('edits a task and persists the changes', async ({ page }) => {
    await login(page);
    await ensureE2ETask(page);

    const card = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
    await card.getByRole('button', { name: new RegExp(`edit ${E2E_TASK_TITLE}`, 'i') }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/edit task/i)).toBeVisible();
    // Form is prefilled with the stored values
    await expect(dialog.getByLabel(/title/i)).toHaveValue(E2E_TASK_TITLE);

    await dialog.getByLabel(/description/i).fill('Edited by Playwright');
    await dialog.getByLabel(/status/i).selectOption('Done');

    await shot(page, '06-edit-task-modal.png');

    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Task updated')).toBeVisible();

    await expect(card.getByText('Done')).toBeVisible();

    // Persisted across a full reload
    await page.reload();
    const reloaded = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
    await expect(reloaded).toBeVisible();
    await expect(reloaded.getByText('Done')).toBeVisible();
});

test('completes a task with the round checkbox toggle', async ({ page }) => {
    await login(page);
    await ensureE2ETask(page);

    const card = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
    const check = card.locator('.task-check');

    // Reset to not-done first so the test is order-independent
    if ((await check.getAttribute('aria-label'))?.includes('not complete')) {
        await check.click();
        await expect(card.locator('.task-check')).toHaveAttribute(
            'aria-label',
            /as complete/i
        );
    }

    await check.click();
    await expect(card.locator('.task-check')).toHaveAttribute(
        'aria-label',
        /as not complete/i
    );
    await expect(card).toHaveClass(/task-done/);

    // Toggle back
    await card.locator('.task-check').click();
    await expect(card.locator('.task-check')).toHaveAttribute(
        'aria-label',
        /as complete/i
    );
});

// ===============================================================
// 3. Search and filters
// ===============================================================
test('search filters tasks by title and description', async ({ page }) => {
    await login(page);

    const search = page.getByLabel(/search tasks/i);
    await search.fill('portfolio');

    // Both demo tasks containing "portfolio" match
    await expect(page.locator('.task-card').filter({ hasText: 'Complete portfolio website' })).toBeVisible();
    await expect(page.locator('.task-card').filter({ hasText: 'Update portfolio screenshots' })).toBeVisible();
    // Unrelated tasks are hidden
    await expect(page.locator('.task-card').filter({ hasText: 'Pay hosting invoice' })).toBeHidden();
    await expect(page.locator('.count-chip')).toHaveText(/^\d+ of \d+$/);

    await page.waitForTimeout(250);
    await shot(page, '05-search-results.png');

    // Clearing restores the full list (toolbar button is "Clear" while
    // results are shown; "Clear filters" appears only in the empty state)
    await page.getByRole('button', { name: /^clear$/i }).click();
    await expect(
        page.locator('.task-card').filter({ hasText: 'Pay hosting invoice' })
    ).toBeVisible();
});

test('status and priority filters narrow the task list', async ({ page }) => {
    await login(page);

    // Status filter
    await page.getByLabel(/filter by status/i).selectOption('In Progress');
    await expect(
        page.locator('.task-card').filter({ hasText: 'Complete portfolio website' })
    ).toBeVisible();
    await expect(
        page.locator('.task-card').filter({ hasText: 'Pay hosting invoice' })
    ).toBeHidden();

    // Add priority filter on top
    await page.getByLabel(/filter by priority/i).selectOption('High');
    await expect(page.getByRole('button', { name: /^clear$/i })).toBeVisible();

    // Every visible card must satisfy both filters
    const visibleCards = page.locator('.task-card');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
        await expect(visibleCards.nth(i).getByText('In Progress')).toBeVisible();
        await expect(visibleCards.nth(i).getByText('High')).toBeVisible();
    }

    await page.getByRole('button', { name: /^clear$/i }).click();
    await expect(
        page.locator('.task-card').filter({ hasText: 'Pay hosting invoice' })
    ).toBeVisible();
});

test('shows the empty state when nothing matches', async ({ page }) => {
    await login(page);
    await page.getByLabel(/search tasks/i).fill('zzz-nothing-matches-this');

    await expect(page.getByText(/no tasks match your filters/i)).toBeVisible();
    await page.getByRole('button', { name: /clear filters/i }).click();
    await expect(page.locator('.task-card').first()).toBeVisible();
});

// ===============================================================
// 4. Delete confirmation
// ===============================================================
test('deletes a task only after explicit confirmation', async ({ page }) => {
    await login(page);
    await ensureE2ETask(page);

    const card = page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE });
    await card.getByRole('button', { name: new RegExp(`delete ${E2E_TASK_TITLE}`, 'i') }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/will be permanently removed/i);
    await page.waitForTimeout(250);
    await shot(page, '07-delete-confirm.png');

    // Cancel keeps the task
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE })).toBeVisible();

    // Confirm removes it
    await page
        .locator('.task-card')
        .filter({ hasText: E2E_TASK_TITLE })
        .getByRole('button', { name: new RegExp(`delete ${E2E_TASK_TITLE}`, 'i') })
        .click();
    const confirmDialog = page.getByRole('alertdialog');
    await confirmDialog.getByRole('button', { name: 'Delete task' }).click();

    await expect(page.getByText('Task deleted')).toBeVisible();
    await expect(page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE })).toHaveCount(0);

    // It is gone from the database too
    await page.reload();
    await expect(page.locator('.task-card').filter({ hasText: E2E_TASK_TITLE })).toHaveCount(0);
});

// ===============================================================
// 5. Responsive layout (1440 / 768 / 375)
// ===============================================================
test('desktop 1440px: full layout, no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);

    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.hamburger')).toBeHidden();
    await expect(page.locator('.stats-grid')).toBeVisible();
    await assertNoHorizontalOverflow(page);
});

test('tablet 768px: off-canvas sidebar with hamburger navigation', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);

    // Sidebar hidden off-canvas, hamburger available
    await expect(page.locator('.hamburger')).toBeVisible();
    const sidebarClass = await page.locator('.sidebar').getAttribute('class');
    expect(sidebarClass).not.toContain('sidebar-open');
    await assertNoHorizontalOverflow(page);

    // Stats stack into two columns
    await expect(page.locator('.stat-card')).toHaveCount(5);

    // Open the menu
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await expect(page.locator('.sidebar')).toHaveClass(/sidebar-open/);
    await expect(page.locator('.sidebar-overlay')).toBeVisible();

    await page.waitForTimeout(350);
    await shot(page, '10-tablet-dashboard.png');

    // Navigate to About via the drawer
    await page.locator('.sidebar').getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('heading', { name: /about taskflow/i })).toBeVisible();
});

test('mobile 375px: dashboard, navigation menu, and forms fit the screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    await assertNoHorizontalOverflow(page);
    await expect(page.locator('.hamburger')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(5);

    await page.waitForTimeout(350);
    await shot(page, '08-mobile-dashboard.png');

    // Navigation drawer
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await expect(page.locator('.sidebar')).toHaveClass(/sidebar-open/);
    await page.waitForTimeout(350);
    await shot(page, '09-mobile-menu.png');

    // Close via overlay (click the strip to the right of the 250px sidebar,
    // otherwise the drawer itself intercepts the click)
    await page
        .locator('.sidebar-overlay')
        .click({ position: { x: 340, y: 500 } });
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);

    // The create form must be fully usable on a small screen
    await page.getByRole('button', { name: 'New task' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await assertNoHorizontalOverflow(page);
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.width).toBeLessThanOrEqual(375);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
});
