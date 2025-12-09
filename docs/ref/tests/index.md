# Test Infrastructure Reference

Technical reference for UbuMaths test infrastructure.

## Overview

UbuMaths uses a multi-tier testing strategy:

| Layer       | Tool           | Environment             | Purpose                  |
| ----------- | -------------- | ----------------------- | ------------------------ |
| Unit        | Vitest         | Node.js                 | Logic, utilities, stores |
| Component   | Vitest Browser | Chromium                | Svelte 5 components      |
| Integration | Vitest         | Node.js                 | API + Database           |
| Triggers    | Vitest         | Node.js + Docker        | PostgreSQL triggers      |
| E2E         | Playwright     | Chromium/Firefox/WebKit | Full user flows          |

**Test Statistics**: 2,430/2,454 tests passing (99.0%)

## Quick Reference

### Test Commands

```bash
# Unit Tests (both client + server)
pnpm test:unit              # Watch mode
pnpm test:unit -- --run     # Single run

# Project-specific
pnpm test:server <path>     # Server tests only (Node.js)
pnpm test:client <path>     # Client tests only (*.svelte.test.ts)

# Database Tests (requires Docker)
pnpm test:triggers          # Trigger tests
pnpm test:triggers:watch    # Watch mode
pnpm test:integration       # Integration tests

# E2E Tests
pnpm test:e2e               # All browsers
pnpm test:e2e -- --headed   # Visible browser

# Coverage
pnpm test:unit -- --coverage
```

### File Naming Conventions

| Pattern            | Project | Environment          |
| ------------------ | ------- | -------------------- |
| `*.test.ts`        | server  | Node.js              |
| `*.spec.ts`        | server  | Node.js              |
| `*.svelte.test.ts` | client  | Browser (Playwright) |
| `*.svelte.spec.ts` | client  | Browser (Playwright) |

### Directory Structure

```
tests/
├── helpers/                   # Unified test helpers (use $tests/helpers)
│   ├── index.ts               # Main barrel export
│   ├── supabase/              # Supabase mock utilities
│   │   ├── mock-client.ts     # createMockSupabase (unified)
│   │   ├── mock-locals.ts     # createMockLocals
│   │   ├── mock-request.ts    # createMockRequest
│   │   └── mock-helpers.ts    # mockSuccess, mockError, mockSequence
│   └── fixtures/              # Test data fixtures
│       └── profiles.ts        # mockIds, mockProfiles, factories
├── database/
│   ├── helpers/               # Database test utilities
│   │   ├── postgres-client.ts
│   │   ├── test-data-factory.ts
│   │   └── trigger-test-helpers.ts
│   └── triggers/              # PostgreSQL trigger tests
├── integration/               # API + DB integration tests
└── unit/                      # Unit tests by feature
    └── api/

src/
├── lib/
│   ├── stores/*.test.ts       # Store unit tests
│   ├── stores/*.svelte.test.ts # Store browser tests
│   └── mathAST/**/*.test.ts   # Math library tests
└── routes/
    └── **/*.test.ts           # Route API tests

e2e/
├── auth/                      # Authentication flows
├── helpers/
│   ├── auth-helpers.ts
│   └── image-helpers.ts
├── student/                   # Student user flows
└── teacher/                   # Teacher user flows
```

## Configuration Files

| File                           | Purpose                           |
| ------------------------------ | --------------------------------- |
| `vite.config.ts`               | Main Vitest config with projects  |
| `vitest.base.config.ts`        | Shared base config (dbTestConfig) |
| `vitest.integration.config.ts` | Integration tests config          |
| `vitest.triggers.config.ts`    | Database trigger tests config     |
| `vitest-setup-client.ts`       | Browser test setup                |
| `vitest-setup-server.ts`       | Server test setup (clears mocks)  |
| `playwright.config.ts`         | E2E test configuration            |

## Related Documentation

- [TDD](./tdd.md) - **TDD collaboratif (OBLIGATOIRE pour tout nouveau code)**
- [Configuration](./configuration.md) - Detailed Vitest/Playwright configuration
- [Mocking](./mocking.md) - Mock strategies and Supabase mocking
- [Patterns](./patterns.md) - Testing patterns and best practices
- [Component Testing](./component-testing.md) - Svelte 5 component testing
- [Database Testing](./database-testing.md) - Trigger and integration tests
- [E2E Testing](./e2e-testing.md) - Playwright E2E patterns
- [Utilities](./utilities.md) - Test helpers and factories

## Key Principles

### 1. Assertion Requirements

All tests require at least one assertion:

```typescript
// vite.config.ts
test: {
	expect: {
		requireAssertions: true;
	}
}
```

### 2. Test Isolation

- Each test should be independent
- Use `beforeEach` / `afterEach` for setup/teardown
- Clear mocks between tests with `vi.clearAllMocks()`

### 3. Mock Boundaries

- Unit tests: Mock all external dependencies
- Integration tests: Real database, mocked auth
- E2E tests: Full stack, seeded test data

### 4. Deterministic Tests

- Use seeded random for RNG-dependent tests
- Avoid time-dependent assertions where possible
- Clean up test data after each test

## Getting Started

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers (E2E)
npx playwright install --with-deps

# Start local Supabase (trigger/integration tests)
pnpm db:start
```

### Running Your First Test

```bash
# Run all unit tests
pnpm test:unit -- --run

# Run specific test file
pnpm test:unit -- src/lib/utils/math.test.ts

# Run tests matching pattern
pnpm test:unit -- --grep "should calculate"
```

### Writing Your First Test

```typescript
// src/lib/utils/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './example';

describe('myFunction', () => {
	it('should return expected result', () => {
		const result = myFunction('input');
		expect(result).toBe('expected');
	});
});
```

### Using Test Helpers

```typescript
// Import from unified helpers
import { createMockSupabase, createMockLocals, mockSuccess, mockError } from '$tests/helpers';

describe('API route', () => {
	it('should handle request', async () => {
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: '123', name: 'Test' });

		const locals = createMockLocals('user-id', supabase);
		// ... test implementation
	});
});
```

## Troubleshooting

### Common Issues

| Issue               | Solution                                 |
| ------------------- | ---------------------------------------- |
| "No tests found"    | Check file naming convention             |
| Test timeout        | Increase timeout or check async handling |
| Mock not working    | Verify mock path matches import          |
| Database connection | Ensure `pnpm db:start` is running        |

### Debug Mode

```bash
# Vitest UI
pnpm test:unit -- --ui

# Playwright debug
pnpm test:e2e -- --debug

# Single test file with verbose output
pnpm test:unit -- --reporter=verbose src/lib/example.test.ts
```
