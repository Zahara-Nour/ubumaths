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

import type { InlineConfig } from 'vitest/node';

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
 * - vitest.integration.config.ts (inclut tests/integration/database/)
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
	// Un seul fork à la fois : séquentiel, pour éviter les courses sur la base.
	// vitest 4 a supprimé `poolOptions.forks.singleFork` ; le guide propose
	// `maxWorkers: 1, isolate: false`, mais on garde l'isolation par défaut
	// (un processus neuf par fichier) pour qu'aucun état de module ne fuie
	// d'un fichier à l'autre.
	maxWorkers: 1
};
