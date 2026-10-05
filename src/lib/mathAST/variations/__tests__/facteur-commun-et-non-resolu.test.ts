/**
 * Variations : la dérivée développée, et f'(x) = 0 que le solveur ne sait pas résoudre
 *
 * Mesuré avant le correctif, `.variations x e^x` annonçait « Points critiques :
 * aucun », « f croissante » sur ℝ, « Extrema : aucun » et des limites
 * « indetermine » — tout faux. Deux défauts empilés :
 * 1. le solveur ne mettait pas eˣ en facteur dans f'(x) = eˣ + x eˣ ;
 * 2. un échec de résolution devenait « aucun point critique », et un signe
 *    constant s'en déduisait.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { formatVariationTable } from '../format';
import { parseCustom } from '../../parser/custom';
import { normalize, normalFormsEquivalent } from '../../normal';
import { toCustom } from '../../custom-generator';
import { VariationsCommand } from '../../cli/commands/variations.command';
import type { MathNode } from '../../types';
import type { VariationResult } from '../types';

function study(custom: string): VariationResult {
	return computeVariations(parseCustom(custom), { variable: 'x', includeBoundaryLimits: true });
}

function sameValue(node: MathNode, custom: string): boolean {
	return normalFormsEquivalent(normalize(node), normalize(parseCustom(custom)));
}

/** Le sens de variation, intervalles dégénérés {c} retirés. */
function directions(result: VariationResult): string[] {
	return result.monotonicIntervals
		.filter((mi) => mi.monotonicity !== 'constant')
		.map((mi) => mi.monotonicity);
}

/** La sortie de `.variations`, sans les couleurs du terminal. */
function commandOutput(input: string): string {
	const result = new VariationsCommand().execute({
		input,
		format: 'custom',
		options: {},
		isRepl: false
	});
	// eslint-disable-next-line no-control-regex
	return result.output.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('f(x) = x eˣ', () => {
	it('un point critique, x = −1 exactement', () => {
		const result = study('x e^x');
		expect(result.criticalPoints).toHaveLength(1);
		expect(sameValue(result.criticalPoints[0].x, '-1')).toBe(true);
	});

	it('décroissante puis croissante', () => {
		expect(directions(study('x e^x'))).toEqual(['decreasing', 'increasing']);
	});

	it('minimum en −1, de valeur −1/e exacte', () => {
		const result = study('x e^x');
		const minimum = result.extrema.find((e) => e.type.includes('minimum'));
		expect(minimum).toBeDefined();
		expect(sameValue(minimum!.x, '-1')).toBe(true);
		expect(minimum!.yApproximate ?? NaN).toBeCloseTo(-Math.exp(-1), 10);
		expect(toCustom(minimum!.y)).not.toBe('');
		expect(result.extrema.some((e) => e.type.includes('maximum'))).toBe(false);
	});

	// ⚠️ Hors de portée de ce correctif, mesuré : `evaluateLimit` ne connaît que
	// `exp(…)`, pas `e^…` ; réécrire `e^u` en `exp(u)` rend bien 0 et +∞, mais
	// `classifyGlobalExtrema` promeut alors la limite 0 en −∞ en « Maximum
	// global : f(−∞) » — un extremum non atteint. Les deux vont ensemble.
	it.todo('limites : 0 en −∞ (croissances comparées), +∞ en +∞');
});

describe('f(x) = x² eˣ (coefficients ≠ 1 dans la dérivée)', () => {
	it('points critiques −2 et 0 ; croissante, décroissante, croissante', () => {
		const result = study('x^2 e^x');
		expect(result.criticalPoints.map((c) => c.xApproximate)).toEqual([-2, 0]);
		expect(directions(result)).toEqual(['increasing', 'decreasing', 'increasing']);
	});
});

describe("f'(x) = 0 que le solveur ne sait pas résoudre : eˣ − x²/2 − 2x", () => {
	// f'(x) = eˣ − x − 2 : deux zéros (≈ −1,84 et ≈ 1,15), aucune forme close.
	const expression = 'e^x - x^2/2 - 2x';

	it('le résultat le dit, et ne conclut rien', () => {
		const result = study(expression);
		expect(result.derivativeZerosUnresolved).toBe(true);
		expect(result.criticalPoints).toHaveLength(0);
		expect(result.monotonicIntervals).toHaveLength(0);
		expect(result.extrema).toHaveLength(0);
	});

	it('le tableau formaté ne dit pas « aucun »', () => {
		const text = formatVariationTable(study(expression));
		expect(text).toContain("f'(x) = 0 n'a pas pu être résolue");
		expect(text).not.toContain('Points critiques : aucun');
		expect(text).not.toContain('Extrema : aucun');
		expect(text).not.toMatch(/croissante|decroissante/);
	});

	it('la commande .variations ne dit pas « aucun » non plus', () => {
		const text = commandOutput(expression);
		expect(text).toContain("f'(x) = 0 n'a pas pu être résolue");
		expect(text).not.toMatch(/Points critiques : aucun|Extrema : aucun/);
	});
});

describe('Ce qui ne doit pas bouger', () => {
	it('x³ − 3x : tableau identique', () => {
		expect(formatVariationTable(study('x^3-3x'))).toBe(
			[
				'Expression : x^3-3x',
				"Derivee : f'(x) = 3x^2-3",
				'',
				'Domaine : R (tous les reels)',
				'',
				'Points critiques :',
				"  x = -1 (f'=0)",
				"  x = 1 (f'=0)",
				'',
				"Signe de f'(x) :",
				'  ]-inf ; -1[ : +  (f croissante)',
				'  {-1}        : 0  (f constante)',
				'  ]-1 ; 1[    : -  (f decroissante)',
				'  {1}         : 0  (f constante)',
				'  ]1 ; +inf[  : +  (f croissante)',
				'',
				'Extrema :',
				'  Maximum global : f(-1) = 2',
				'  Minimum global : f(1) = -2',
				'',
				'Limites aux bornes :',
				'  lim_{x -> -∞^+} f(x) = -inf',
				'  lim_{x -> +∞^-} f(x) = +inf'
			].join('\n')
		);
	});

	it.each(['ln(x)', 'e^x + x', 'exp(x)', 'sqrt(x)'])(
		'%s : vraiment aucun point critique, et non « non résolu »',
		(e) => {
			const result = study(e);
			expect(result.derivativeZerosUnresolved).toBeFalsy();
			expect(result.criticalPoints).toHaveLength(0);
			expect(directions(result)).toEqual(['increasing']);
			expect(formatVariationTable(result)).toContain('Points critiques : aucun');
		}
	);
});
