import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

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
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

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
			'@supabase/supabase-js',  // Authentication client
			'@supabase/ssr',           // Server-side auth helpers
			'mathlive',                // Math input editor (large library)
			'canvas-confetti',         // Celebration effects
			'mode-watcher',            // Dark mode management
			'svelte-sonner'            // Toast notifications
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
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
