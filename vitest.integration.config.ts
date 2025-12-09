import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { dbTestConfig } from './vitest.base.config';

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
export default defineConfig(({ mode }) => {
	// Load environment variables for Supabase connection
	const env = loadEnv(mode, process.cwd(), '');
	Object.assign(process.env, env);

	return {
		plugins: [sveltekit()], // Enable $lib alias resolution
		test: {
			...dbTestConfig,
			name: 'integration',
			include: ['tests/integration/**/*.{test,spec}.{js,ts}']
		}
	};
});
