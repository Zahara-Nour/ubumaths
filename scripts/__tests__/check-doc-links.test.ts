/**
 * Les gardes de la documentation
 * ==============================
 *
 * `check-doc-links` : un lien markdown interne mène à un fichier qui existe.
 * `check-doc-refs` : un chemin du dépôt ou un `pnpm <script>` cité dans la doc
 * de référence existe encore — c'est ce qui oblige une PR qui renomme un
 * fichier cité à mettre la doc à jour dans la même PR.
 *
 * Ce qui est gardé ici : chaque garde voit ce qu'elle doit voir, et n'accuse
 * pas ce qui n'est pas un lien (code inline, bloc de code, gabarit).
 */

import { describe, it, expect } from 'vitest';
import { extractLinks } from '../check-doc-links';
import { extractRefs } from '../check-doc-refs';

describe('extractLinks — ce qui est un lien', () => {
	it('voit un lien relatif et son numéro de ligne', () => {
		expect(extractLinks('titre\nvoir [la doc](../a/b.md) ici')).toEqual([
			{ line: 2, text: 'la doc', target: '../a/b.md' }
		]);
	});

	it("retire l'ancre", () => {
		expect(extractLinks('[x](b.md#section)')[0].target).toBe('b.md');
	});

	it('accepte une cible entre chevrons contenant des parenthèses', () => {
		const md = '[politique](<../../src/routes/(public)/legal/confidentialite>)';
		expect(extractLinks(md)[0].target).toBe('../../src/routes/(public)/legal/confidentialite');
	});

	it('voit un lien dont le texte est du code', () => {
		expect(extractLinks('[`aire.md`](./aire.md)')[0].target).toBe('./aire.md');
	});
});

describe("extractLinks — ce qui n'est pas un lien", () => {
	it('ignore les liens externes et les ancres seules', () => {
		expect(extractLinks('[a](https://x.fr) [b](mailto:a@b.c) [c](#ici)')).toEqual([]);
	});

	it('ignore un faux lien dans du code inline', () => {
		expect(extractLinks('la regex `[A-Za-z](?:_\\d+)` et `U[m^1:1:0](N(1))`')).toEqual([]);
	});

	it('ignore un lien dans un bloc de code', () => {
		expect(extractLinks('```md\n![alt](url)\n```\n[vrai](v.md)')).toEqual([
			{ line: 4, text: 'vrai', target: 'v.md' }
		]);
	});

	it('ignore une cible gabarit {{…}}', () => {
		expect(extractLinks('![droite]({{imageBase}}/a.webp)')).toEqual([]);
	});
});

describe('extractRefs — chemins du dépôt et scripts pnpm cités', () => {
	it('voit un chemin entre backticks, sans numéro de ligne ni ancre', () => {
		expect(extractRefs('voir `src/lib/a.ts:12` et `scripts/b.sh`').paths).toEqual([
			'src/lib/a.ts',
			'scripts/b.sh'
		]);
	});

	it("voit la cible d'un lien vers le dépôt", () => {
		expect(extractRefs('[x](src/lib/c.ts)').paths).toEqual(['src/lib/c.ts']);
	});

	it('ignore un motif glob ou un gabarit', () => {
		expect(extractRefs('`src/**/*.ts` `src/lib/<module>/` `tests/x-*.test.ts`').paths).toEqual([]);
	});

	it('ignore un joker de scripts', () => {
		expect(extractRefs('tous les `pnpm db:*` locaux').scripts).toEqual([]);
	});

	it('voit les scripts pnpm, pas les commandes pnpm natives', () => {
		expect(
			extractRefs('`pnpm check:incremental` puis `pnpm install` et `pnpm db:reset`').scripts
		).toEqual(['check:incremental', 'db:reset']);
	});
});
