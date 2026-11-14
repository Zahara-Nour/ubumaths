/**
 * Série d'automatismes : éléments à associer (chantier `docs/wip/associer-progress.md`)
 * ====================================================================================
 *
 * Phase 0 validée le 2026-11-14 : à l'énoncé, deux colonnes à relier au crayon (le bloc
 * sans liens, sans `case:`) ; au corrigé, la bonne étiquette en face de chaque élément
 * (liste « élément → étiquette »). Une case par élément.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';

function modele(id: string, statement: string, blanks?: unknown[]): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['1SPE'],
		level: 1,
		status: 'draft',
		variations: [{ statement, ...(blanks ? { blanks } : {}) }]
	} as unknown as QuestionTemplate;
}

const associer = [
	'```associer',
	'- a -> pair',
	'- b -> impair',
	'- c -> pair',
	'- -> premier',
	'```'
];

const seul = modele('seul', ['Associe.', '', ...associer].join('\n'));
const avecCase = modele('avec-case', ['Calcule $1+1=?$.', '', ...associer].join('\n'), [
	{ expectedAnswer: '2' }
]);
const modeles = new Map([seul, avecCase].map((t) => [t.id, t]));

describe('buildSerie — éléments à associer', () => {
	it('énoncé : le bloc sans liens ni case ; corrigé : la bonne étiquette en face de chaque élément', () => {
		const serie = buildSerie(modeles, [{ templateId: 'seul', seed: 1 }]);
		expect(serie.statement).toContain('```associer');
		expect(serie.statement).not.toMatch(/case:/);
		expect(serie.statement).not.toMatch(/- [abc] -> \S/);
		expect(serie.solution).not.toContain('```associer');
		expect(serie.solution).toMatch(/- a → pair/);
		expect(serie.solution).toMatch(/- b → impair/);
		expect(serie.solution).toMatch(/- c → pair/);
	});

	it('avec une autre case : les cases comptent ensemble', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.solution).toMatch(/- b → impair/);
		expect(serie.solution).toContain('2');
	});
});
