/**
 * Vitest Base Configuration
 * =========================
 *
 * Shared configuration for all Vitest test configs.
 * Import and spread these configs in specific test configs.
 *
 * @example
 * ```typescript
 * import { dbTestConfig } from './vitest.base.config';
 *
 * export default defineConfig({
 *   test: {
 *     ...dbTestConfig,
 *     include: ['tests/integration/**\/*.{test,spec}.{js,ts}']
 *   }
 * });
 * ```
 */

import type { InlineConfig } from 'vitest';

/**
 * Base test configuration shared by all test configs
 */
export const baseTestConfig: Partial<InlineConfig> = {
	expect: {
		requireAssertions: true
	}
};

/**
 * Database test configuration for tests requiring Supabase
 *
 * Used by:
 * - vitest.integration.config.ts
 * - vitest.triggers.config.ts
 *
 * Features:
 * - Node environment for database access
 * - Extended timeouts for slow DB operations
 * - Process isolation with forks
 * - Sequential execution to avoid race conditions
 */
export const dbTestConfig: Partial<InlineConfig> = {
	...baseTestConfig,
	environment: 'node',
	testTimeout: 30000, // 30s for database operations
	hookTimeout: 30000,
	pool: 'forks',
	poolOptions: {
		forks: {
			singleFork: true // Sequential to avoid race conditions
		}
	}
};
