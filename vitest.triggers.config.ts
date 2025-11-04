import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

/**
 * Vitest Configuration for Database Trigger Tests
 *
 * These tests require:
 * - Local Supabase instance running on port 54321
 * - Start with: pnpm db:start
 * - Run with: pnpm test:triggers
 *
 * Trigger tests verify database triggers fire correctly using real
 * database connections and service role client.
 */
export default defineConfig({
	plugins: [sveltekit()], // Enable $lib alias resolution
	test: {
		name: 'triggers',
		environment: 'node',
		include: ['tests/database/triggers/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000, // 30s timeout for database operations
		hookTimeout: 30000,
		pool: 'forks', // Use forked processes for better isolation
		poolOptions: {
			forks: {
				singleFork: true // Run tests sequentially to avoid interference
			}
		}
	}
});
