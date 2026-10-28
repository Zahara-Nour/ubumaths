import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import { Features } from 'lightningcss';
import { visualizer } from 'rollup-plugin-visualizer';
import { baseTestConfig } from './vitest.base.config';

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const APP_VERSION = pkg.version;

/** Fichiers de police : jamais inlinés en `data:` (cf. `build.assetsInlineLimit`) */
const FONT_FILE = /\.(woff2?|ttf|otf)$/i;

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
/**
 * MathLive (0.107 à 0.110 au moins) publie `font-display:"swap"` entre guillemets :
 * valeur invalide, le navigateur retombe sur `auto` et masque le texte des maths
 * jusqu'à 3 s le temps que la police arrive. On corrige le CSS du paquet au
 * passage dans Vite (dev comme build : le CSS des dépendances n'est pas
 * pré-empaqueté par esbuild). Sans effet si MathLive corrige un jour.
 */
function mathliveFontDisplay(): Plugin {
	return {
		name: 'mathlive-font-display',
		enforce: 'pre',
		transform(code, id) {
			if (!/[\\/]mathlive[\\/]mathlive-(static|fonts)\.css(\?|$)/.test(id)) return null;
			return { code: code.replaceAll('font-display:"swap"', 'font-display:swap'), map: null };
		}
	};
}

// Retour typé explicitement : sur une fonction `async`, l'inférence ne
// retrouve pas la bonne surcharge de `defineConfig` (TS2769).
export default defineConfig(async ({ mode }): Promise<ViteUserConfig> => {
	// Load environment variables for server-side code
	const env = loadEnv(mode, process.cwd(), '');
	Object.assign(process.env, env);

	// Fournisseur du mode navigateur (projet `client`), chargé seulement sous
	// vitest : son import tire `vitest/node` (~250 ms, ~70 Mo mesurés le
	// 2026-09-24), inutiles à `pnpm dev` et au build. Vitest pose `VITEST`
	// avant de lire cette config.
	const browserProvider = process.env.VITEST
		? (await import('@vitest/browser-playwright')).playwright()
		: undefined;

	return {
		plugins: [
			mathliveFontDisplay(),
			tailwindcss(),
			sveltekit(),
			// Bundle treemap, only when ANALYZE=1 (never in normal/prod builds).
			// emitFile → the report lands in each build's output dir, i.e.
			// .svelte-kit/output/client/stats.html (the user-facing bundle) and the
			// server one. Generated in CI via .github/workflows/bundle-analyze.yml, or
			// locally with `ANALYZE=1 pnpm build` (a full build takes 64 s on the Mac
			// mini, measured 2026-09-29 — the old 8 GB laptop could not run it).
			...(process.env.ANALYZE
				? [visualizer({ emitFile: true, filename: 'stats.html', gzipSize: true, brotliSize: true })]
				: [])
		],

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
			},
			// Dépôts tiers de extern/ : jamais importés, inutile de les surveiller
			watch: {
				ignored: ['**/extern/**']
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
			chunkSizeWarningLimit: 1000,
			// Skip the "computing gzip size" pass over every output chunk. We already
			// get bundle sizes from the ANALYZE=1 visualizer, and the Safari-TDZ chunk
			// guard reads RAW bytes — so the gzip report is dead weight on the prod build.
			reportCompressedSize: false,
			// Jamais de police inlinée en `data:` : la CSP (`font-src` de
			// hooks.server.ts) la bloquerait. KaTeX_Size3 (3,6 Ko, sous le seuil de
			// 4 Ko) l'était depuis `mathlive/static.css`, sur toute page à maths.
			// `undefined` : la règle par défaut de Vite pour les autres fichiers.
			assetsInlineLimit: (filePath) => (FONT_FILE.test(filePath) ? false : undefined)
		},

		// Sous Vite 8, le CSS du build est compressé par Lightning CSS (SvelteKit impose
		// `cssMinify: true`, qui voulait dire esbuild sous Vite 7). Lightning CSS récrit
		// `light-dark()` en `var(--lightningcss-light, …)`, variables qu'il ne pose qu'à côté
		// d'un `color-scheme` du CSS ; le nôtre est posé sur <html> par mode-watcher : la
		// valeur devenait invalide et les jetons de couleur disparaissaient (v0.54.0,
		// 2026-10-28). Tailwind exclut cette récriture de la même façon.
		// Garde : étape « light-dark() intact » de la CI.
		css: {
			lightningcss: { exclude: Features.LightDark }
		},

		test: {
			...baseTestConfig,
			// Logs des seuls tests en échec : les tests de chemins d'erreur écrivent des
			// milliers de console.error attendus, qui noyaient la vraie cause d'un échec
			// (11 301 lignes de log pour un job rouge le 2026-10-08).
			silent: 'passed-only',
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
						// Pas d'`environment: 'browser'` : vitest 4 le refuse, le mode
						// navigateur s'active par `browser.enabled` seul.
						browser: {
							enabled: true,
							provider: browserProvider,
							instances: [{ browser: 'chromium' }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: [
							'src/lib/server/**',
							// Real-Pyodide integration tests download and run Python in
							// headless Chromium: slow and flaky in CI. Excluded on regular
							// CI runs (CI=true on GitHub Actions), still run locally — and
							// re-included by the nightly job which sets RUN_PYODIDE_REAL=1.
							...(process.env.CI && !process.env.RUN_PYODIDE_REAL
								? ['src/**/*-real.svelte.test.ts']
								: [])
						],
						setupFiles: ['./vitest-setup-client.ts']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
						exclude: [
							'src/**/*.svelte.{test,spec}.{js,ts}'
							// tests/integration/** (incl. database/) is never matched by the include
							// globs above; it runs via vitest.integration.config.ts (Supabase local).
						],
						setupFiles: ['./vitest-setup-server.ts']
					}
				}
			]
		}
	};
});
