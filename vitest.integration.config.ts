import { defineConfig } from 'vitest/config';

/**
 * Vitest Configuration for Integration Tests
 *
 * These tests require:
 * - Local Supabase instance running on port 54321
 * - Start with: pnpm db:start
 * - Run with: pnpm test:integration
 *
 * Integration tests verify race conditions and cross-component interactions
 * using real database connections.
 */
export default defineConfig({
	test: {
		name: 'integration',
		environment: 'node',
		include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000, // 30s timeout for database operations
		hookTimeout: 30000,
		pool: 'forks', // Use forked processes for better isolation
		poolOptions: {
			forks: {
				singleFork: true // Run tests sequentially to avoid race conditions
			}
		}
	}
});
