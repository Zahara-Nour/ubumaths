/**
 * Série d'automatismes : texte à trous (chantier `docs/wip/trous-etiquettes-progress.md`)
 * ======================================================================================
 *
 * Phase 0 validée le 2026-11-14 : à l'énoncé, la réserve et le texte aux trous
 * numérotés (le bloc aux trous vides, sans `case:`) ; au corrigé, « 1 → arithmétique ;
 * 2 → $r$ » à la place du bloc. Une case par trou.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';

function modele(id: string, statement: string, blanks?: unknown[]): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['1_SPE'],
		level: 1,
		status: 'draft',
		variations: [{ statement, ...(blanks ? { blanks } : {}) }]
	} as unknown as QuestionTemplate;
}

const trous = [
	'```trous',
	'$2$ est [pair], $7$ est [impair], $4$ est [pair].',
	'intrus: premier',
	'```'
];

const seul = modele('seul', ['Complète.', '', ...trous].join('\n'));
const avecCase = modele('avec-case', ['Calcule $1+1=?$.', '', ...trous].join('\n'), [
	{ expectedAnswer: '2' }
]);
const modeles = new Map([seul, avecCase].map((t) => [t.id, t]));

describe('buildSerie — texte à trous', () => {
	it('énoncé : le bloc aux trous vides, sans case ; corrigé : « 1 → pair ; 2 → impair ; 3 → pair »', () => {
		const serie = buildSerie(modeles, [{ templateId: 'seul', seed: 1 }]);
		expect(serie.statement).toContain('```trous');
		expect(serie.statement).not.toMatch(/case:/);
		expect(serie.statement).toMatch(/est \[\], \$7\$ est \[\]/);
		expect(serie.statement).toMatch(/étiquettes: /);
		expect(serie.solution).not.toContain('```trous');
		expect(serie.solution).toContain('1 → pair ; 2 → impair ; 3 → pair');
	});

	it('avec une autre case : les cases comptent ensemble', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.solution).toContain('1 → pair ; 2 → impair ; 3 → pair');
		expect(serie.solution).toContain('2');
	});
});
