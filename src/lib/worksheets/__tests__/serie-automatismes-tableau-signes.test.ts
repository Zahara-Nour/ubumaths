/**
 * Série d'automatismes : tableau de signes à compléter (chantier tableau-signes, PR 4)
 * ==================================================================================
 *
 * Phase 0, point 5 : à l'énoncé, les cellules cachées restent vides (le bloc garde ses
 * `?`, le PDF les dessine vides) ; au corrigé, le même tableau rempli (bloc sans `?`).
 * Chaque cellule cachée compte pour une case.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';
import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';

const TABLEAU = [
	'```variation',
	'variable: x',
	'domain: -inf, ?-{{a}}, 2, +inf',
	'',
	'sign: (x+{{a}})(x-2)',
	'  -inf,-{{a}}: ?+',
	'  -{{a}}: ?z',
	'  -{{a}},2: -',
	'  2: z',
	'  2,+inf: ?+',
	'```'
].join('\n');

const tableau = {
	id: 'tableau',
	title: 't',
	grades: ['2'],
	level: 1,
	status: 'draft',
	variations: [
		{
			statement: `Complète le tableau de signes.\n\n${TABLEAU}`,
			variables: [{ name: 'a', expression: '3' }]
		}
	]
} as unknown as QuestionTemplate;

const avecCase = {
	...tableau,
	id: 'avec-case',
	variations: [
		{
			statement: `Calcule $2+{{a}}=?$.\n\n${TABLEAU}`,
			variables: [{ name: 'a', expression: '3' }],
			blanks: [{ expectedAnswer: '{{eval:2+a}}' }]
		}
	]
} as unknown as QuestionTemplate;

const modeles = new Map([tableau, avecCase].map((t) => [t.id, t]));

/** Le corps du premier bloc ```variation d'un texte */
function corps(texte: string): string[] {
	const m = /```variation\n([\s\S]*?)\n\s*```/.exec(texte);
	if (!m) throw new Error('pas de tableau');
	return m[1].split('\n').map((l) => l.replace(/^ {3}/, ''));
}

describe('buildSerie — tableau de signes à compléter', () => {
	it('énoncé : cellules cachées gardées (vides au PDF) ; corrigé : tableau rempli', () => {
		const serie = buildSerie(modeles, [{ templateId: 'tableau', seed: 1 }]);
		const enonce = parseVariationTableContent(corps(serie.statement)).node;
		expect(enonce?.cases?.map((c) => c.answer)).toEqual(['-3', '+', 'z', '+']);
		expect(serie.statement).not.toContain('case:');

		const corrige = parseVariationTableContent(corps(serie.solution));
		expect(corrige.errors).toEqual([]);
		expect(corrige.node?.cases ?? []).toEqual([]);
		expect(corrige.node?.domain.map((p) => p.expression)).toEqual(['-inf', '-3', '2', '+inf']);
		expect(serie.solution).not.toMatch(/\?|case:/);
	});

	it('avec une autre case : chaque cellule compte, la case de formule remplie au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.statement).toContain('\\text{……}');
		expect(serie.solution).toContain('\\mathbf{5}');
		expect(parseVariationTableContent(corps(serie.solution)).node?.cases ?? []).toEqual([]);
	});
});
