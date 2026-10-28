import { defineConfig } from 'vitest/config';
import { dbTestConfig } from './vitest.base.config';

/**
 * Garde-fou SECURITY DEFINER, seul (décision de David, Q162 b)
 * =============================================================
 *
 * Ne lance QUE `tests/integration/garde-fonctions-security-definer.test.ts`,
 * pour le job CI bloquant « Garde SECURITY DEFINER » (quality.yml).
 *
 * Il lit le catalogue Postgres (pg_proc, has_function_privilege) par une
 * connexion directe au port 54322 (SUPABASE_DB_*) : il lui faut une base
 * migrée (`supabase db start`), ni GoTrue, ni PostgREST, ni clés d'API.
 *
 * Pas de plugin sveltekit (le test n'importe aucun `$lib`) ni de
 * `global-setup` de la suite d'intégration : celui-ci supprime les comptes
 * prof, ce dont ce test n'a aucun besoin.
 *
 * Vite 8 transforme le TypeScript avec oxc, qui lit `tsconfig.json` — lequel
 * étend `.svelte-kit/tsconfig.json`, absent tant que `svelte-kit sync` n'a pas
 * tourné (job CI sans build) : `pnpm test:definer-guard` lance donc
 * `svelte-kit sync` d'abord. (L'ancien `esbuild.tsconfigRaw` ne sert plus.)
 */
export default defineConfig({
	test: {
		...dbTestConfig,
		name: 'definer-guard',
		include: ['tests/integration/garde-fonctions-security-definer.test.ts']
	}
});
