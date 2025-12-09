import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { dbTestConfig } from './vitest.base.config';

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
export default defineConfig(({ mode }) => {
	// Load environment variables for Supabase connection
	const env = loadEnv(mode, process.cwd(), '');
	Object.assign(process.env, env);

	return {
		plugins: [sveltekit()], // Enable $lib alias resolution
		test: {
			...dbTestConfig,
			name: 'triggers',
			include: ['tests/database/triggers/**/*.{test,spec}.{js,ts}']
		}
	};
});
