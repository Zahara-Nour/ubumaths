/**
 * L31 (docs/wip/ecarts-a-trier.md) : la décomposition en éléments simples
 * fabriquait des nœuds `{ type: 'opposite' }` et `{ type: 'variable' }` à la
 * main (cas 1c, 2, 4, 6, `createCoeffNode`, `exactCoefficient`), hors
 * `factory.ts` (invariant 2 du README mathAST). Aucun cas visible : la forme
 * rendue était déjà la bonne. On garde donc :
 * - la primitive rendue de chaque cas (coefficient ≠ 1) et l'absence de
 *   littéral `number` signé dans l'arbre ;
 * - une garde de source : plus aucun littéral de nœud dans l'intégrateur.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { toLatex } from '../../latex-generator';
import { findNodes } from '../../transforms';
import { isNumber } from '../../guards';

const SOURCE = fileURLToPath(new URL('../integrators/partial-fractions.ts', import.meta.url));

/** Littéral d'objet qui commence par un type de nœud MathNode : `{ type: 'opposite', … }` */
const NODE_LITERAL =
	/\{\s*type:\s*'(number|variable|opposite|positive|addition|subtraction|multiplication|division|superscript|subscript|function|delimiter)'\s*,/g;

describe('éléments simples : nœuds de la fabrique', () => {
	it.each([
		// cas 1c : x + a, dans un produit
		[
			'\\frac{8}{(x+3)(x-1)}',
			'2 \\ln\\left( \\left| x - 1 \\right| \\right) - 2 \\ln\\left( \\left| x + 3 \\right| \\right)'
		],
		// cas 2 : (x + a)^n, dans un produit
		// rendu réduit au même dénominateur, écart d'écriture hors L31 : forme seule
		['\\frac{4}{(x+3)^2(x-1)}', null],
		// cas 4 : x² − a²
		[
			'\\frac{6}{x^2-9}',
			'\\ln\\left( \\left| x - 3 \\right| \\right) - \\ln\\left( \\left| x + 3 \\right| \\right)'
		],
		// cas 6 : x² + bx
		[
			'\\frac{3}{x^2+2x}',
			'\\dfrac{3}{2} \\ln\\left( \\left| x \\right| \\right) - \\dfrac{3}{2} \\ln\\left( \\left| x + 2 \\right| \\right)'
		],
		// coefficients négatifs (createCoeffNode)
		[
			'\\frac{3}{(x-1)(x+2)}',
			'\\ln\\left( \\left| x - 1 \\right| \\right) - \\ln\\left( \\left| x + 2 \\right| \\right)'
		]
	] as const)('%s → %s', (input, expected: string | null) => {
		const result = integrate(parseLatex(input), { variable: 'x' });
		expect(result.technique).toBe('partial-fractions');
		expect(result.antiderivative).not.toBeNull();
		const antiderivative = result.antiderivative!;
		if (expected !== null) expect(toLatex(antiderivative)).toBe(expected);
		expect(findNodes(antiderivative, (n) => isNumber(n) && /^[-+]/.test(n.value))).toEqual([]);
	});

	it('aucun littéral de nœud écrit à la main dans partial-fractions.ts', () => {
		const source = readFileSync(SOURCE, 'utf8');
		expect(source.match(NODE_LITERAL) ?? []).toEqual([]);
	});
});
