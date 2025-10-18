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
	 * Manual code splitting separates large vendor libraries into independent
	 * chunks that can be cached separately and loaded in parallel.
	 *
	 * This improves both build and production performance by:
	 * - Reducing initial bundle size
	 * - Enabling better browser caching (vendors change less often)
	 * - Allowing parallel downloads of chunks
	 */
	build: {
		// Increase chunk size warning limit (we intentionally create larger vendor chunks)
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					// Supabase authentication (~150KB) - Used on every page
					'vendor-supabase': ['@supabase/supabase-js', '@supabase/ssr'],

					// TipTap rich text editor (~200KB) - Only used in specific routes
					'vendor-tiptap': [
						'@tiptap/core',
						'@tiptap/starter-kit',
						'@tiptap/extension-color',
						'@tiptap/extension-highlight',
						'@tiptap/extension-link',
						'@tiptap/extension-subscript',
						'@tiptap/extension-superscript',
						'@tiptap/extension-task-item',
						'@tiptap/extension-task-list',
						'@tiptap/extension-text-align',
						'@tiptap/extension-text-style',
						'@tiptap/extension-underline'
					],

					// UI components (~100KB) - Used frequently across dashboard
					'vendor-ui': ['bits-ui', 'lucide-svelte', 'mode-watcher', 'svelte-sonner']
				}
			}
		}
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
