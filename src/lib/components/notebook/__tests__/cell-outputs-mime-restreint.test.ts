/**
 * Garde : chaque type MIME rendu par `CellOutputs` a une branche RESTREINTE
 * (carnet d'élève lu par autrui, décision du 2026-10-04). Ajouter un type sans
 * l'examiner fait échouer ce test : le compléter ici ET dans le composant.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
	fileURLToPath(new URL('../CellOutputs.svelte', import.meta.url)),
	'utf8'
);

/** Types examinés, chacun avec sa branche `isRestricted` dans le gabarit */
const REVIEWED_MIME_TYPES = ['application/json', 'image/png', 'text/html', 'text/plain'];

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

describe('CellOutputs — types MIME rendus', () => {
	it('la liste des types lus est exactement la liste examinée', () => {
		const used = [...source.matchAll(/data\[['"]([a-z]+\/[a-z0-9.+-]+)['"]\]/g)].map((m) => m[1]);
		expect([...new Set(used)].sort()).toEqual(REVIEWED_MIME_TYPES);
	});

	it.each(REVIEWED_MIME_TYPES)('%s a une branche restreinte dans le gabarit', (type) => {
		const branch = new RegExp(
			`\\{[#:](?:else )?if output\\.data\\['${escape(type)}'\\][^}]*isRestricted`
		);
		expect(source).toMatch(branch);
	});
});
