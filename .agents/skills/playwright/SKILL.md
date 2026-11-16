---
name: playwright
description: End-to-End (E2E) browser automation and testing skill using Playwright. Use when writing, debugging, or running automated web tests, UI assertions, and regression testing for the Approval Management System (AMS).
---

# Playwright E2E Testing Skill

This skill provides comprehensive guidelines, patterns, and runbooks for executing automated tests with Playwright across the application.

## 1. QA Workspace Structure

All tests and configs are organized inside `qa-workspace/`:

```text
qa-workspace/
├── playwright.config.ts        # Playwright test configuration
├── package.json                # Dependencies and test runner scripts
├── tsconfig.json               # TypeScript configuration
├── tests/
│   ├── e2e/                    # End-to-End test suites
│   │   ├── auth.spec.ts        # Login, logout, role-based access
│   │   ├── document-paraf-preview.spec.ts # Paraf preview check vs download
│   │   └── approval-flow.spec.ts          # Complete approval lifecycle
│   ├── fixtures/               # Test data & environment fixtures
│   │   └── test-data.ts
│   └── utils/                  # Reusable test utilities and helpers
│       └── auth-helper.ts      # Authentication helpers for roles
├── test-results/               # Generated test artifacts (screenshots, traces)
└── playwright-report/          # HTML test reports
```

## 2. Command Cheatsheet

Always run Playwright commands from the `qa-workspace` directory:

```bash
cd "d:\Magang\Project 2\Approval-Management-System\qa-workspace"

# Run all tests headlessly
npx playwright test

# Run a specific test file
npx playwright test tests/e2e/document-paraf-preview.spec.ts

# Run tests with visible browser (headed)
npx playwright test --headed

# Run tests in UI mode (interactive debugging)
npx playwright test --ui

# Run tests with trace recording enabled
npx playwright test --trace on

# View HTML test report
npx playwright show-report
```

## 3. Best Practices for Inertia.js & React Testing

1. **Auto-Waiting & Locator Strategy**:
   - Prefer user-facing locators:
     ```typescript
     page.getByRole('button', { name: 'Setujui Dokumen' })
     page.getByText('Hal 1/3')
     page.getByLabel('Email')
     ```
   - Avoid hardcoded sleeps (`page.waitForTimeout`). Use condition assertions:
     ```typescript
     await expect(page.getByText('Semua Halaman Terparaf')).toBeVisible();
     ```

2. **Inertia.js Navigation**:
   - Wait for URL changes or specific UI elements when Inertia navigates:
     ```typescript
     await page.getByRole('button', { name: 'Masuk' }).click();
     await expect(page).toHaveURL(/\/dashboard|\/approvals/);
     ```

3. **Verifying Preview Overlays (e.g. Paraf Checkmark `[ ✔ ]`)**:
   - Paraf in AMS is rendered as a preview overlay (`.paraf-preview-overlay`):
     ```typescript
     const parafBadge = page.locator('.paraf-preview-overlay');
     await expect(parafBadge).toBeVisible();
     ```
   - When verifying download: ensure downloaded PDF does not contain burned-in paraf markers.

4. **Handling Dialogs & Modals**:
   - Modals in Radix UI / Shadcn UI render in portals. Ensure you query from `page` or scoped `role="dialog"`.

