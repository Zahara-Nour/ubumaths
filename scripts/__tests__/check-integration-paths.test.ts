/**
 * La garde du filtre `paths` de nightly-integration.yml
 * =====================================================
 *
 * Le workflow d'intégration ne tourne sur une PR que si un fichier modifié
 * correspond à son filtre `paths`. Deux façons de rater une régression sans
 * rien voir : un fichier atteint par la suite que le filtre ne couvre pas, et
 * un motif qui ne correspond à rien (écrit avec la sémantique d'un glob
 * classique au lieu de celle de GitHub). Les deux sont arrivés : le second
 * dans #515, où 29 motifs `?server.ts` étaient morts.
 *
 * La sémantique testée est celle de la doc GitHub (« Filter pattern cheat
 * sheet ») : `*` sans `/`, `**` avec, `?` = zéro ou une fois le caractère
 * PRÉCÉDENT, `+` = une fois ou plus le précédent, `[]` = un caractère,
 * `!` en tête = négation, `\` = échappement.
 */

import { describe, it, expect } from 'vitest';
import { githubPathPattern, uncoveredFiles, deadPatterns } from '../check-integration-paths';

const matches = (pattern: string, path: string) => githubPathPattern(pattern).test(path);

describe('githubPathPattern — exemples de la doc GitHub', () => {
	it('`*` : zéro ou plusieurs caractères, sans `/`', () => {
		expect(matches('Octo*', 'Octocat')).toBe(true);
		expect(matches('Octo*', 'Octo')).toBe(true);
		expect(matches('src/*', 'src/a/b.ts')).toBe(false);
	});

	it('`**` : tout, `/` compris', () => {
		expect(matches('src/**', 'src/a/b/c.ts')).toBe(true);
		expect(matches('**/README.md', 'docs/x/README.md')).toBe(true);
	});

	it('`?` : zéro ou une fois le caractère PRÉCÉDENT', () => {
		expect(matches('docs?', 'doc')).toBe(true);
		expect(matches('docs?', 'docs')).toBe(true);
		expect(matches('docs?', 'docss')).toBe(false);
	});

	it('`+` : une fois ou plus le caractère précédent', () => {
		expect(matches('a+b', 'aaab')).toBe(true);
		expect(matches('a+b', 'b')).toBe(false);
	});

	it('`[]` : un caractère de la liste ou de la plage', () => {
		expect(matches('[CB]at', 'Cat')).toBe(true);
		expect(matches('[CB]at', 'Bat')).toBe(true);
		expect(matches('[1-2]00', '200')).toBe(true);
		expect(matches('[CB]at', 'Rat')).toBe(false);
	});

	it('`\\` échappe un caractère spécial', () => {
		expect(matches('src/routes/api/x/\\+server.ts', 'src/routes/api/x/+server.ts')).toBe(true);
		expect(matches('a\\[id\\]', 'a[id]')).toBe(true);
	});

	it('le motif couvre le chemin ENTIER, pas un morceau', () => {
		expect(matches('src/lib', 'src/lib/x.ts')).toBe(false);
		expect(matches('lib/x.ts', 'src/lib/x.ts')).toBe(false);
	});
});

describe('githubPathPattern — le bug de #515', () => {
	it('`?server.ts` ne correspond PAS à `+server.ts` (le `?` porte sur le `/`)', () => {
		expect(matches('src/routes/api/x/?server.ts', 'src/routes/api/x/+server.ts')).toBe(false);
	});

	it('`*server.ts` correspond à `+server.ts`, et `*` à un segment `[id]`', () => {
		expect(matches('src/routes/api/x/*/*server.ts', 'src/routes/api/x/[id]/+server.ts')).toBe(true);
		expect(matches('src/routes/*/p/*page.server.ts', 'src/routes/(public)/p/+page.server.ts')).toBe(
			true
		);
	});
});

describe('uncoveredFiles', () => {
	it('rend les fichiers atteints qu’aucun motif ne couvre', () => {
		const files = ['src/lib/server/a.ts', 'src/lib/components/b.svelte'];
		expect(uncoveredFiles(files, ['src/lib/server/**'])).toEqual(['src/lib/components/b.svelte']);
	});

	it('une négation en tête retire ce qu’un motif précédent couvrait', () => {
		const files = ['src/lib/server/a.ts', 'src/lib/server/b.md'];
		expect(uncoveredFiles(files, ['src/lib/server/**', '!src/lib/server/*.md'])).toEqual([
			'src/lib/server/b.md'
		]);
	});

	it('rien à signaler quand tout est couvert', () => {
		expect(uncoveredFiles(['a/b.ts'], ['a/**'])).toEqual([]);
	});
});

describe('deadPatterns', () => {
	it('rend les motifs qui ne correspondent à aucun fichier suivi', () => {
		const tracked = ['src/routes/api/x/+server.ts', 'supabase/config.toml'];
		expect(deadPatterns(['src/routes/api/x/?server.ts', 'supabase/**'], tracked)).toEqual([
			'src/routes/api/x/?server.ts'
		]);
	});

	it('ignore les négations (elles retirent, elles ne couvrent rien)', () => {
		expect(deadPatterns(['a/**', '!a/*.md'], ['a/b.ts'])).toEqual([]);
	});
});
