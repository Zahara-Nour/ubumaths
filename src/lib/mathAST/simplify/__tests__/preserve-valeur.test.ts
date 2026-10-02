/**
 * `simplify` ne doit JAMAIS changer la valeur d'une expression.
 *
 * Garde-fou né du défaut du 2026-10-02 : `simplify((4x+1)^{1/2})` affichait
 * `4x+1` et `simplify(2^{1/2})` affichait `2`. La forme opaque fabriquée par
 * `normalizeSymbolicPower` portait un nombre `"1/2"` que la reconversion
 * lisait comme `1` — la puissance disparaissait sans bruit.
 *
 * Pour chaque expression, on compare numériquement l'entrée et le résultat
 * en plusieurs points, et on vérifie que le LaTeX produit se relit avec la
 * même valeur (un affichage illisible ou ambigu est aussi une faute).
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';

const POINTS = [0.3, 1.7, 4];

// Puissances fractionnaires, rationnelles, négatives — bases simples et composées
const EXPRESSIONS = [
	'(4x+1)^{\\frac12}',
	'(4x+1)^{0.5}',
	'2^{\\frac12}',
	'3^{\\frac12}',
	'8^{\\frac13}',
	'2^{\\frac32}',
	'5^{\\frac23}',
	'2^{-\\frac12}',
	'x^{\\frac12}',
	'x^{\\frac32}',
	'x^{-\\frac12}',
	'x^{\\frac23}',
	'x^{-2}',
	'x^{-1}',
	'(x+1)^{\\frac12}',
	'(x+1)^{\\frac32}',
	'(x+1)^{\\frac13}',
	'(x+1)^{-\\frac12}',
	'(x+1)^{-\\frac32}',
	'(x+1)^{-2}',
	'(x+1)^{-1}',
	'(x^2+1)^{\\frac12}',
	'(x^2+1)^{-\\frac12}',
	'(2x+3)^{\\frac52}',
	'(3x)^{\\frac12}',
	'(2x)^{-\\frac12}',
	'2(x+1)^{\\frac12}+(x+1)^{\\frac12}',
	'(x+1)^{\\frac12}\\cdot(x+1)^{\\frac12}',
	'(x+1)^{\\frac12}\\cdot(x+1)',
	'\\frac{1}{(x+1)^{\\frac12}}',
	'x(x+1)^{\\frac12}',
	'(4x+1)^{\\frac12}+1',
	'\\frac{x}{(x^2+1)^{\\frac32}}',
	'(x+2)^{0.25}',
	'\\sqrt{x+1}^{3}',
	'\\sqrt{2}\\cdot\\sqrt{8}'
];

function valuesAt(latex: string): number[] {
	const fn = compile(parseLatex(latex));
	return POINTS.map((x) => fn({ x }));
}

describe('simplify préserve la valeur numérique', () => {
	it('le panel compte au moins 30 expressions', () => {
		expect(EXPRESSIONS.length).toBeGreaterThanOrEqual(30);
	});

	it.each(EXPRESSIONS)('%s', (expr) => {
		const before = valuesAt(expr);
		const result = simplify(parseLatex(expr)).result;
		const afterTree = POINTS.map((x) => compile(result)({ x }));
		// Relire le LaTeX affiché : c'est lui que voit l'élève
		const shown = toLatex(result);
		const afterShown = valuesAt(shown);
		for (let i = 0; i < POINTS.length; i++) {
			expect(afterTree[i], `arbre, x=${POINTS[i]}, affiché ${shown}`).toBeCloseTo(before[i], 9);
			expect(afterShown[i], `LaTeX ${shown}, x=${POINTS[i]}`).toBeCloseTo(before[i], 9);
		}
	});
});

describe('puissances demi-entières : affichage en racine', () => {
	const latex = (s: string) => toLatex(simplify(parseLatex(s)).result);

	it('(4x+1)^{1/2} → √(4x+1)', () => {
		expect(latex('(4x+1)^{\\frac12}')).toBe('\\sqrt{4 x + 1}');
	});

	it('(4x+1)^{0.5} → √(4x+1)', () => {
		expect(latex('(4x+1)^{0.5}')).toBe('\\sqrt{4 x + 1}');
	});

	it('2^{1/2} → √2', () => {
		expect(latex('2^{\\frac12}')).toBe('\\sqrt{2}');
	});

	it('2^{3/2} → 2√2', () => {
		expect(latex('2^{\\frac32}')).toBe('2 \\sqrt{2}');
	});

	it('(x+1)^{3/2} garde un exposant fraction, plus de « 3/2 » en ligne', () => {
		expect(latex('(x+1)^{\\frac32}')).not.toContain('3/2');
	});
});
