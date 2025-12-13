import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import { baseTestConfig } from './vitest.base.config';

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
	// Load environment variables for server-side code
	const env = loadEnv(mode, process.cwd(), '');
	Object.assign(process.env, env);

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
		 * IMPORTANT: ProseMirror packages MUST be included to prevent
		 * "Adding different instances of a keyed plugin" errors when
		 * multiple TipTap editors exist on the same page.
		 * @see https://discuss.prosemirror.net/t/rangeerror-adding-different-instances-of-a-keyed-plugin-plugin/4242
		 */
		optimizeDeps: {
			include: [
				'@supabase/supabase-js', // Authentication client
				'@supabase/ssr', // Server-side auth helpers
				'mathlive', // Math input editor (large library)
				'canvas-confetti', // Celebration effects
				'mode-watcher', // Dark mode management
				'svelte-sonner', // Toast notifications
				// TipTap and ProseMirror - MUST be included to prevent duplicate plugin errors
				'@tiptap/core',
				'@tiptap/starter-kit',
				// @tiptap/pm subpath exports (prosemirror packages are re-exported through these)
				'@tiptap/pm/state',
				'@tiptap/pm/view',
				'@tiptap/pm/model',
				'@tiptap/pm/transform',
				'@tiptap/pm/commands',
				'@tiptap/pm/keymap',
				'@tiptap/pm/inputrules',
				'@tiptap/pm/gapcursor',
				'@tiptap/pm/dropcursor',
				'@tiptap/pm/history'
			]
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
			...baseTestConfig,
			coverage: {
				provider: 'v8',
				reporter: ['text', 'html', 'lcov'],
				reportsDirectory: './coverage',
				include: ['src/**/*.{ts,svelte}'],
				exclude: [
					'src/**/*.test.ts',
					'src/**/*.spec.ts',
					'src/**/*.svelte.test.ts',
					'src/**/*.svelte.spec.ts',
					'src/lib/types/**',
					'src/app.d.ts',
					'src/hooks.server.ts'
				]
			},
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
						include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
						exclude: [
							'src/**/*.svelte.{test,spec}.{js,ts}',
							'tests/database/**/*.{test,spec}.{js,ts}', // Exclude database trigger tests (require Supabase)
							'tests/integration/**/*.{test,spec}.{js,ts}' // Exclude integration tests (require Supabase)
						],
						setupFiles: ['./vitest-setup-server.ts']
					}
				}
			]
		}
	};
});
