/**
 * Le code serveur importé par les tests parle à la MÊME pile que les tests.
 *
 * `$app/env/public` est un fichier généré (`.svelte-kit/generated`), réécrit
 * par tout démarrage de vite dans le worktree avec l'adresse de la base de dev. Le 2026-11-21, un
 * `pnpm test:server` lancé pendant la suite a envoyé le code serveur des tests suivants sur la
 * base de dev (docs/archive/wip/base-locale-progress.md § 12). vitest.integration.config.ts impose
 * l'adresse : ce test le garde.
 */
import { describe, expect, it } from 'vitest';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';

const ATTENDUE = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';

function port(url: string | undefined): string {
	return new URL(url ?? '').port;
}

describe('adresse Supabase vue par le code serveur dans la suite', () => {
	it('variable statique ($app/env/public)', () => {
		expect(port(PUBLIC_SUPABASE_URL)).toBe(port(ATTENDUE));
	});

	it('process.env (client de service)', () => {
		expect(port(process.env.PUBLIC_SUPABASE_URL)).toBe(port(ATTENDUE));
	});
});
