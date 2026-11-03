/**
 * Tableau de signes à compléter, révélé pour le corrigé imprimé (série d'automatismes)
 * ==================================================================================
 *
 * `revealVariationBody` rend le texte du MÊME tableau sans ses `?` ni `case:` : le PDF
 * le dessine rempli, comme un tableau ordinaire (chantier tableau-signes, PR 4).
 */
import { describe, it, expect } from 'vitest';
import {
	parseVariationTableContent,
	revealVariationBody
} from '../../parser/variation-table-parser';
import type { VariationTableNode } from '../../types/variation-table';

function parseOk(lines: string[]): VariationTableNode {
	const { node, errors } = parseVariationTableContent(lines);
	expect(errors).toEqual([]);
	if (!node) throw new Error('nœud attendu');
	return node;
}

/** Ce que le tableau DIT (domaine, lignes), sans ce qui le rend « à compléter » */
const content = (node: VariationTableNode) => ({
	variable: node.variable,
	domain: node.domain.map(({ expression, open }) => ({ expression, open })),
	rows: node.rows.map((row) => ({ ...row, values: [...row.values.entries()] }))
});

const PRODUIT = [
	'case: 3',
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: (x+3)(x-2)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,2: -',
	'  2: z',
	'  2,+inf: ?+'
];

describe('revealVariationBody', () => {
	it('retire les ? et la ligne case: ; le tableau dit la même chose, sans case', () => {
		const revealed = revealVariationBody(PRODUIT);
		expect(revealed.join('\n')).not.toMatch(/\?|case:/);
		const node = parseOk(revealed);
		expect(node.cases ?? []).toEqual([]);
		expect(content(node)).toEqual(content(parseOk(PRODUIT)));
	});

	it('marque « rien » cachée : la ligne disparaît (aucune marque à ce point)', () => {
		const body = [
			'variable: x',
			'domain: -inf, ?0, +inf',
			'',
			'sign: x^2+1',
			'  -inf,0: ?+',
			'  0: ?rien',
			'  0,+inf: +'
		];
		const revealed = revealVariationBody(body);
		expect(revealed.join('\n')).not.toMatch(/\?|rien/);
		expect(content(parseOk(revealed))).toEqual(content(parseOk(body)));
	});

	it('valeur cachée en fraction, double barre cachée', () => {
		const body = [
			'variable: x',
			'domain: -inf, ?\\frac{3}{2}, +inf',
			'',
			'sign: \\frac{1}{2x-3}',
			'  -inf,\\frac{3}{2}: ?-',
			'  \\frac{3}{2}: ?||',
			'  \\frac{3}{2},+inf: ?+'
		];
		const revealed = revealVariationBody(body);
		expect(revealed.join('\n')).not.toContain('?');
		expect(content(parseOk(revealed))).toEqual(content(parseOk(body)));
	});

	it('borne ouverte écrite avec une parenthèse : (?-3 révélé', () => {
		const body = [
			'variable: x',
			'domain: (-inf, (?-3, +inf)',
			'',
			'sign: x+3',
			'  -inf,-3: -',
			'  -3: z',
			'  -3,+inf: ?+'
		];
		const revealed = revealVariationBody(body);
		expect(revealed.join('\n')).not.toContain('?');
		expect(parseOk(revealed).cases ?? []).toEqual([]);
		expect(content(parseOk(revealed))).toEqual(content(parseOk(body)));
	});

	it('tableau sans ? : inchangé', () => {
		const body = ['variable: x', 'domain: -inf, 2, +inf', '', 'sign: x-2', '  2: z'];
		expect(revealVariationBody(body)).toEqual(body);
	});
});
