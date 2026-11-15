# CareCircle Integration Testing Guide

This directory contains integration test suites designed to validate end-to-end interactions between the CareCircle application logic, Supabase database, Row-Level Security (RLS) policies, and Supabase Edge Functions.

## Overview & Requirements

Integration tests run against a real Supabase backend instance (either a local Docker-based Supabase instance or a dedicated cloud testing project). Because CareCircle enforces strict Row-Level Security and database-level invariants, running with a real instance ensures:
1. RLS policies accurately restrict data access based on authenticated user IDs and roles (`elderly`, `family`, `caretaker`).
2. Foreign key constraints, unique constraints, and check constraints (such as expiration checks and dose status values) execute faithfully.
3. Database triggers, audit logging, and automated status transitions function as intended.

---

## 1. Running Against Local Supabase

To start a local Supabase environment using the Supabase CLI:

```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Start Supabase containers (requires Docker Desktop running)
supabase start

# 3. Apply all database migrations
supabase db reset
```

This will spin up PostgreSQL, GoTrue (Auth), PostgREST, Storage, and Realtime on `http://127.0.0.1:54321`.

---

## 2. Required Environment Variables

Set the following variables in `.env.test` or your shell environment before running integration tests:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

For testing against a remote staging project:
```bash
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<remote-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<remote-service-role-key>
```

---

## 3. How to Run Integration Tests

Run the integration suite via Vitest:

```bash
# Run all integration tests
npx vitest run tests/integration/

# Run with watch mode during active development
npx vitest tests/integration/

# Run with verbose output and coverage
npx vitest run tests/integration/ --coverage
```

---

## 4. Test Structure & Guidelines

1. **User Scaffolding**: Use test helpers to generate distinct test users for `elderly`, `family`, and `caretaker` personas.
2. **Database Cleanliness**: Each test suite should clean up test fixtures in `afterAll` or run within an isolated test tenant.
3. **RLS Verification**: Always test both positive cases (user has permission to select/insert/update) and negative cases (unauthorized users receive empty result sets or permission violations).
4. **Grace Period & Escalation**: Validate that medication events respect the 15-minute warning grace period, 30-minute caregiver notification, and 60-minute intervention window without prematurely labeling unconfirmed doses as missed.
