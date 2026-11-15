# CareCircle Comprehensive Testing Documentation

This document describes the testing architecture, testing strategies, coverage targets, test suite organization, and execution procedures for the **CareCircle** healthcare management platform.

---

## 1. Test Architecture Overview

CareCircle employs a multi-tiered testing strategy spanning unit, integration, and end-to-end (E2E) testing to ensure high reliability, patient safety, accessibility, and security compliance.

```
+-------------------------------------------------------------+
|                        E2E Tests                            |
|             Playwright (Desktop + Mobile Safari)            |
|       - Auth flows, accessibility, navigation, responsive   |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|                     Integration Tests                       |
|           Vitest + Local / Cloud Supabase Instance          |
|    - RLS validation, Edge Functions, database triggers     |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|                        Unit Tests                           |
|           Vitest + React Testing Library + JSDOM            |
|    - Schedule parsing, escalation engine, utils, security   |
+-------------------------------------------------------------+
```

### Core Technologies
- **Unit / Integration Runner:** [Vitest](https://vitest.dev/)
- **DOM / Component Testing:** [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) & `@testing-library/jest-dom`
- **End-to-End (E2E) Automation:** [Playwright](https://playwright.dev/)
- **Code Coverage Engine:** `@vitest/coverage-v8`

---

## 2. Directory Structure

```
carecircle/
├── tests/
│   ├── unit/
│   │   ├── scheduleParser.test.ts  # Natural language schedule parsing logic
│   │   ├── escalation.test.ts      # Multi-tier escalation engine & grace periods
│   │   ├── utils.test.ts           # Class merging, date/time formatting, dose badges
│   │   ├── validation.test.ts      # Role-based permissions & relationship defaults
│   │   ├── adherence.test.ts       # Adherence computation and dose state labeling
│   │   └── security.test.ts        # Invitation hash invariants, roles, status separation
│   ├── integration/
│   │   └── README.md               # Setup and execution guide for real Supabase testing
│   └── e2e/
│       ├── auth.spec.ts            # Authentication, registration, and form validation
│       ├── accessibility.spec.ts   # Screen reader ARIA, form labels, keyboard navigation
│       └── invitation.spec.ts      # Invitation acceptance workflows and security gates
├── docs/
│   └── testing.md                  # Comprehensive testing manual (this file)
└── playwright.config.ts            # Playwright multi-browser test harness configuration
```

---

## 3. Test Suites & File Coverage

### Unit Test Suites (`tests/unit/`)

| File | Purpose | Key Assertions Covered |
| :--- | :--- | :--- |
| `scheduleParser.test.ts` | Tests natural language parsing for medication regimens | Daily, twice daily, three times daily, weekly, PRN ("as needed"), AM/PM, noon/midnight handling, and parsing confidence scoring. |
| `escalation.test.ts` | Validates overdue dose escalation tiers and timers | Future doses (`none`), >15m past due (`warning`), >30m past due (`notify_caregiver`), >60m past due (`intervention`), terminal state suppression (`taken`, `skipped`), and strict non-escalation of unconfirmed doses during the initial grace window. |
| `utils.test.ts` | General helpers and formatting functions | Tailwind class merging (`cn`), 12-hour AM/PM time formatting (`formatTime`), human-readable dose labels (`getDoseStatusLabel`). |
| `validation.test.ts` | Security permissions and role boundary tests | Default permission sets for family members vs. professional caretakers, ensuring family cannot manage prescriptions without explicit delegation. |
| `adherence.test.ts` | Adherence metrics and summaries | Verification that taken, skipped, and missed counts are properly compiled, and that unconfirmed doses are NEVER prematurely categorized as missed. |
| `security.test.ts` | Cryptographic and integrity checks | SHA-256 invitation token format verification (64 hex characters), rejection of truncated codes, valid role boundaries, and explicit separation of `unconfirmed` vs `missed` dose states. |

### End-to-End Test Suites (`tests/e2e/`)

| File | Browser Targets | Key Scenarios Covered |
| :--- | :--- | :--- |
| `auth.spec.ts` | Chromium, Mobile Safari | Redirect on unauthenticated landing, empty form submission validation, credential failure alert messages, registration form field rendering and email format checks, forgot-password view. |
| `accessibility.spec.ts` | Chromium, Mobile Safari | Form input label associations (`<label for="...">`), keyboard Tab index order navigation, screen reader `aria-live` alert regions, DOM inspection ensuring dose badges convey text and not solely color. |
| `invitation.spec.ts` | Chromium, Mobile Safari | Unauthenticated route guards on invitation acceptance, code entry input validation. |

---

## 4. How to Run Tests

### Running Unit Tests

```bash
# Run all unit tests once
npx vitest run tests/unit/

# Run unit tests in interactive watch mode
npx vitest tests/unit/

# Run a specific unit test file
npx vitest run tests/unit/escalation.test.ts
```

### Running with Code Coverage

```bash
# Run all unit tests with v8 coverage analysis
npx vitest run --coverage
```

Coverage reports are output to the terminal and generated in HTML format inside the `coverage/` directory.

### Running End-to-End (E2E) Tests

Ensure dependencies and Playwright browsers are installed:

```bash
# Install Playwright browser binaries (one-time setup)
npx playwright install --with-deps

# Run all E2E tests across Chromium and Mobile Safari
npx playwright test

# Run E2E tests in interactive UI mode
npx playwright test --ui

# Run a specific E2E test file
npx playwright test tests/e2e/auth.spec.ts

# View HTML test execution report
npx playwright show-report
```

---

## 5. Security & Safety Testing Focus Areas

Because CareCircle manages critical medical schedules for vulnerable elderly patients, the test suite emphasizes several safety-critical invariants:

1. **Unconfirmed vs. Missed Dose Separation:**
   - A dose that has not been confirmed is classified as `unconfirmed`, NEVER as `missed` while within the grace period.
   - Premature "missed" designations cause unwarranted distress and inaccurate clinical records.

2. **Graduated Escalation Timers:**
   - 0–15 minutes: Grace period (`none`).
   - 15–30 minutes: Patient reminder (`warning`).
   - 30–60 minutes: Caregiver alerted (`notify_caregiver`).
   - >60 minutes: Escalated intervention permitted (`intervention`).

3. **Secure Invitation Handshake:**
   - Invitation tokens are generated as 32 cryptographically secure random bytes and stored as SHA-256 hashes (64 hexadecimal characters).
   - Rate limiting and maximum attempt counts (default: 5) prevent brute-force association with elderly patient profiles.

4. **Role Permission Segregation:**
   - Family members cannot modify medications or dosage parameters by default.
   - Caretakers are granted `record_doses` but are restricted according to assigned relationships.

---

## 6. Continuous Integration (CI/CD) Pipeline

CareCircle integrates automated test execution into GitHub Actions workflows:

```yaml
name: Test Suite & Quality Gates

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-and-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx oxlint
      - run: npx vitest run --coverage

  e2e-and-accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```
