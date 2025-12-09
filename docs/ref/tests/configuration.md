# Test Configuration

Detailed configuration reference for Vitest and Playwright.

## Vitest Configuration

### Main Configuration (`vite.config.ts`)

The project uses **Vitest Workspaces** with two test projects:

```typescript
// vite.config.ts
export default defineConfig({
	test: {
		// Require at least one assertion per test
		expect: { requireAssertions: true },

		projects: [
			// Client tests (browser environment)
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			// Server tests (Node.js environment)
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'tests/database/**/*.{test,spec}.{js,ts}',
						'tests/integration/**/*.{test,spec}.{js,ts}'
					]
				}
			}
		]
	}
});
```

### Project Selection

| Project     | Command            | Files                                  |
| ----------- | ------------------ | -------------------------------------- |
| Both        | `pnpm test:unit`   | All test files                         |
| Server only | `pnpm test:server` | `*.test.ts`, `*.spec.ts`               |
| Client only | `pnpm test:client` | `*.svelte.test.ts`, `*.svelte.spec.ts` |

### Client Project

**Environment**: Browser (Playwright Chromium)

**Purpose**: Tests that need real DOM, browser APIs, or Svelte component rendering.

**Configuration**:

```typescript
{
  name: 'client',
  environment: 'browser',
  browser: {
    enabled: true,
    provider: 'playwright',
    instances: [{ browser: 'chromium' }]
  },
  include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
  exclude: ['src/lib/server/**'],
  setupFiles: ['./vitest-setup-client.ts']
}
```

**Setup File** (`vitest-setup-client.ts`):

```typescript
/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />
```

### Server Project

**Environment**: Node.js

**Purpose**: Tests that don't need browser APIs (utilities, stores, API routes).

**Configuration**:

```typescript
{
  name: 'server',
  environment: 'node',
  include: [
    'src/**/*.{test,spec}.{js,ts}',
    'tests/unit/**/*.{test,spec}.{js,ts}'
  ],
  exclude: [
    'src/**/*.svelte.{test,spec}.{js,ts}',
    'tests/database/**/*.{test,spec}.{js,ts}',
    'tests/integration/**/*.{test,spec}.{js,ts}'
  ]
}
```

## Specialized Configurations

### Integration Tests (`vitest.integration.config.ts`)

For tests that require a real database connection:

```typescript
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		name: 'integration',
		environment: 'node',
		include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000,
		hookTimeout: 30000,
		pool: 'forks',
		poolOptions: {
			forks: { singleFork: true }
		}
	}
});
```

**Key Settings**:

- `testTimeout: 30000` - 30s timeout for DB operations
- `pool: 'forks'` - Process isolation for DB connections
- `singleFork: true` - Sequential execution for shared DB state

### Trigger Tests (`vitest.triggers.config.ts`)

For PostgreSQL trigger testing:

```typescript
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		name: 'triggers',
		environment: 'node',
		include: ['tests/database/triggers/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000,
		hookTimeout: 30000,
		pool: 'forks',
		poolOptions: {
			forks: { singleFork: true }
		}
	}
});
```

**Requirements**:

- Local Supabase running: `pnpm db:start`
- Service role key for bypassing RLS

## Playwright E2E Configuration

### Basic Setup (`playwright.config.ts`)

```typescript
export default defineConfig({
	testDir: './e2e',
	timeout: 120 * 1000, // 2 minute test timeout
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],

	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	}
});
```

### Key Settings

| Setting          | Value              | Purpose                 |
| ---------------- | ------------------ | ----------------------- |
| `timeout`        | 120s               | Test timeout            |
| `fullyParallel`  | true               | Parallel test execution |
| `retries`        | 2 (CI) / 0 (local) | Flaky test handling     |
| `webServer.port` | 4173               | Preview server port     |

### Browser Projects

```typescript
projects: [
	{
		name: 'chromium',
		use: { ...devices['Desktop Chrome'] }
	},
	{
		name: 'firefox',
		use: { ...devices['Desktop Firefox'] }
	},
	{
		name: 'webkit',
		use: { ...devices['Desktop Safari'] }
	}
];
```

Run specific browser:

```bash
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=firefox
```

## Environment Variables

### Test Environment

```bash
# Database (trigger/integration tests)
SUPABASE_TEST_URL=http://localhost:54321
SUPABASE_TEST_ANON_KEY=eyJhbGci...
SUPABASE_TEST_SERVICE_ROLE_KEY=eyJhbGci...

# E2E Test Users
TEST_TEACHER_EMAIL=teacher@voltairedoha.com
TEST_TEACHER_PASSWORD=test-password-secure-123
TEST_STUDENT_EMAIL=student@voltairedoha.com
TEST_STUDENT_PASSWORD=test-password-secure-123
TEST_ADMIN_EMAIL=admin@voltairedoha.com
TEST_ADMIN_PASSWORD=test-password-secure-123
```

### Local Supabase Defaults

When using local Supabase (`pnpm db:start`), default keys are used:

```typescript
// tests/database/helpers/trigger-test-helpers.ts
const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const anonKey =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const serviceRoleKey =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
```

## CI Configuration

### GitHub Actions (`.github/workflows/quality.yml`)

```yaml
name: Code Quality

on:
  push:
    branches: [main, dev, feature/**]
  pull_request:
    branches: [main, dev]

jobs:
  lint: # ESLint + Prettier
  typecheck: # svelte-check
  build: # vite build (depends on lint + typecheck)

  test: # Unit tests
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --run

  summary: # Final status check
```

**Note**: E2E and trigger tests are NOT run in CI by default (require Docker).

## Customizing Configuration

### Adding a New Test Project

```typescript
// vite.config.ts
projects: [
	// ... existing projects
	{
		extends: './vite.config.ts',
		test: {
			name: 'my-project',
			environment: 'node', // or 'browser'
			include: ['tests/my-tests/**/*.test.ts'],
			setupFiles: ['./my-setup.ts']
		}
	}
];
```

### Custom Matchers

```typescript
// vitest-setup.ts
import { expect } from 'vitest';

expect.extend({
	toBeWithinRange(received, floor, ceiling) {
		const pass = received >= floor && received <= ceiling;
		return {
			message: () =>
				`expected ${received} ${pass ? 'not ' : ''}to be within range ${floor} - ${ceiling}`,
			pass
		};
	}
});
```

### Global Setup/Teardown

```typescript
// vite.config.ts
test: {
  globalSetup: ['./global-setup.ts'],
  globalTeardown: ['./global-teardown.ts']
}

// global-setup.ts
export default async function setup() {
  // Run once before all tests
  await seedDatabase();
}

// global-teardown.ts
export default async function teardown() {
  // Run once after all tests
  await cleanupDatabase();
}
```

## Performance Tuning

### Parallel Execution

```typescript
// vite.config.ts
test: {
  pool: 'threads',      // Use worker threads
  poolOptions: {
    threads: {
      maxThreads: 4,    // Limit parallel workers
      minThreads: 1
    }
  }
}
```

### Test Isolation

```typescript
// vite.config.ts
test: {
  isolate: true,        // Isolate test files (default)
  sequence: {
    shuffle: true       // Randomize test order
  }
}
```

### Caching

```bash
# Clear Vitest cache
rm -rf node_modules/.vitest

# Run with fresh cache
pnpm test:unit -- --no-cache
```
