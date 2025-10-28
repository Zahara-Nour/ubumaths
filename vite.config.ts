import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const APP_VERSION = pkg.version;

/**
 * Vite Configuration with Performance Optimizations
 * ==================================================
 *
 * PERFORMANCE IMPROVEMENTS (2025-10-18):
 * - Dev server startup: 10s → 1.7s (83% faster)
 * - Dependency pre-bundling for common libraries
 * - Manual code splitting to reduce bundle sizes
 * - Optimized font loading strategy
 *
 * See PERFORMANCE_OPTIMIZATIONS.md for detailed explanation
 */
export default defineConfig(({ mode }) => {
	/**
	 * Critical: Explicit Environment Variable Loading
	 * ================================================
	 *
	 * WHY THIS IS NECESSARY:
	 * - Vite loads .env files but doesn't automatically expose all vars to process.env
	 * - Server-side code (like Redis client in src/lib/server/cache.ts) needs vars in process.env
	 * - Without explicit loading, Redis client initialization fails with undefined credentials
	 *
	 * WHAT THIS DOES:
	 * 1. loadEnv(mode, cwd, prefix) reads .env files (.env, .env.local, .env.[mode])
	 * 2. Third parameter '' means load ALL vars (not just VITE_ prefixed ones)
	 * 3. Object.assign merges loaded vars into process.env for server-side access
	 *
	 * TIMING:
	 * - Runs BEFORE server starts, BEFORE modules are imported
	 * - Ensures lazy-initialized Redis client (cache.ts) finds env vars on first use
	 *
	 * DO NOT REMOVE: Required for Redis, Supabase, and other server-side libs
	 * See: docs/troubleshooting/env-loading-fix.md for detailed explanation
	 */
	const env = loadEnv(mode, process.cwd(), ''); // mode: 'development' | 'production' | 'test'
	Object.assign(process.env, env); // Make available to all server-side code

	return {
		plugins: [tailwindcss(), sveltekit()],

		/**
		 * Environment Variables
		 * ---------------------
		 * Define app version from package.json to be available in the app
		 */
		define: {
			__APP_VERSION__: JSON.stringify(APP_VERSION)
		},

		/**
		 * Development Server Configuration
		 * ---------------------------------
		 * Allow serving files from parent directories (node_modules) for font files.
		 * This enables efficient serving of @fontsource fonts without bundling.
		 */
		server: {
			fs: {
				allow: ['..']
			}
		},

		/**
		 * Dependency Pre-bundling Optimization
		 * -------------------------------------
		 * Vite pre-bundles these dependencies on first run, creating an optimized
		 * cache in node_modules/.vite/ that speeds up subsequent dev server starts.
		 *
		 * INCLUDE: Frequently used libraries that benefit from pre-bundling
		 * EXCLUDE: Large libraries that are better loaded on-demand (TipTap)
		 */
		optimizeDeps: {
			include: [
				'@supabase/supabase-js', // Authentication client
				'@supabase/ssr', // Server-side auth helpers
				'mathlive', // Math input editor (large library)
				'canvas-confetti', // Celebration effects
				'mode-watcher', // Dark mode management
				'svelte-sonner' // Toast notifications
			],
			// Exclude heavy dependencies that don't need pre-bundling
			// TipTap is only used in specific routes, better to load on-demand
			exclude: ['@tiptap/core', '@tiptap/starter-kit']
		},

		/**
		 * Build Optimizations
		 * -------------------
		 * The Vercel adapter automatically handles code splitting and marks certain
		 * packages as external for SSR (Supabase, TipTap, etc.).
		 *
		 * Manual chunking is disabled to avoid conflicts with the adapter's
		 * automatic optimization. Vite will still perform automatic code splitting
		 * based on dynamic imports and route-based splitting.
		 *
		 * Benefits:
		 * - Adapter-optimized bundle sizes for Vercel platform
		 * - Automatic splitting of routes and dynamic imports
		 * - Better compatibility with serverless functions
		 */
		build: {
			// Increase chunk size warning limit
			chunkSizeWarningLimit: 1000
		},

		test: {
			expect: { requireAssertions: true },
			projects: [
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
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
