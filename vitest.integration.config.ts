import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { dbTestConfig } from './vitest.base.config';
import {
	adresseDeTestPourLeCodeServeur,
	estUnModuleDEnvironnementGenere,
	forcerLAdressePublique
} from './scripts/pile-de-test/regles';

/**
 * Vitest Configuration for Integration Tests
 *
 * Run with: pnpm test:integration — en local, démarre et met à jour la pile Supabase de TEST
 * (scripts/pile-de-test/), jamais la base de dev ; en CI, la pile du workflow.
 *
 * Integration tests verify race conditions and cross-component interactions
 * using real database connections.
 */
export default defineConfig(({ mode }) => {
	// Load environment variables for Supabase connection
	const env = loadEnv(mode, process.cwd(), '');
	Object.assign(process.env, env);

	return {
		plugins: [
			sveltekit(), // #lib et #tests : imports de sous-chemin (package.json)
			// Le code serveur importé par les tests vise la pile que les tests utilisent, quoi que
			// dise `.svelte-kit/generated` (réécrit par tout vite lancé dans le worktree).
			{
				name: 'adresse-de-la-pile-de-test',
				transform(code: string, id: string) {
					const url = process.env.SUPABASE_TEST_URL;
					if (!url || !estUnModuleDEnvironnementGenere(id)) return null;
					return { code: forcerLAdressePublique(code, url), map: null };
				}
			}
		],
		test: {
			...dbTestConfig,
			name: 'integration',
			env: adresseDeTestPourLeCodeServeur(process.env),
			include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
			// Single-teacher refactor: remove seeded demo teachers before the suite
			// so the enforce_single_teacher trigger doesn't block test teacher creation.
			globalSetup: ['./tests/integration/global-setup.ts']
		}
	};
});
