/**
 * Variations en Terminale : limites en `e^…` et valeurs d'extremum réduites
 *
 * Mesuré avant le correctif (`.variations`, atelier) :
 * 1. `evaluateLimit` ne connaissait que `exp(…)`, pas la puissance `e^u` :
 *    `x e^x` rendait des limites « indetermine », `e^{−x²}` un maximum
 *    seulement « local », et `variationTableNode` repliait (pas de tableau).
 * 2. La valeur de l'extremum était exacte mais non réduite :
 *    `-1/2e^{(2*(-1/2))}` pour x e^{2x}, `ln(e^{−1/2})(e^{−1/2})²` pour
 *    x² ln x, `-exp(-1)` pour x eˣ.
 *
 * Les valeurs attendues sont EXACTES et la forme affichée est vérifiée en
 * LaTeX, telle que l'atelier la montre.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { formatVariationTable } from '../format';
import { parseCustom } from '../../parser/custom';
import { normalize, normalFormsEquivalent } from '../../normal';
import { toLatex } from '../../latex-generator';
import { divide, euler, number, opposite, superscript } from '../../factory';
import type { MathNode } from '../../types';
import type { BoundaryLimit, LimitValue, VariationResult } from '../types';

function study(custom: string): VariationResult {
	return computeVariations(parseCustom(custom), { variable: 'x', includeBoundaryLimits: true });
}

function sameValue(node: MathNode, expected: string | MathNode): boolean {
	const other = typeof expected === 'string' ? parseCustom(expected) : expected;
	return normalFormsEquivalent(normalize(node), normalize(other));
}

/** La limite en une borne, repérée par son LaTeX (`-\infty`, `0`, …) et son côté. */
function limitAt(result: VariationResult, point: string, direction?: string): LimitValue {
	const found = (result.boundaryLimits ?? []).find(
		(bl: BoundaryLimit) =>
			toLatex(bl.point) === point && (direction === undefined || bl.direction === direction)
	);
	if (found === undefined) throw new Error(`pas de limite en ${point}`);
	return found.limit;
}

/** Une limite finie, en LaTeX ; les infinis sous leur étiquette. */
function limitLatex(limit: LimitValue): string {
	return typeof limit === 'string' ? limit : toLatex(limit);
}

/** e^{−1/2} : `parseCustom` ne lit pas la constante d'Euler en puissance. */
const E_MINUS_HALF = superscript(euler(), opposite(divide(number('1'), number('2'), 'fraction')));

describe('Limites aux bornes en e^u', () => {
	it.each([
		// f, limite en −∞, limite en +∞
		['x e^x', '0', 'infinity'],
		['x e^(-x)', 'negative_infinity', '0'],
		['x e^(2x)', '0', 'infinity'],
		['e^(-x^2)', '0', '0']
	] as const)('%s : limites exactes en −∞ et +∞', (f, minusInf, plusInf) => {
		const result = study(f);
		expect(limitLatex(limitAt(result, '-\\infty'))).toBe(minusInf);
		expect(limitLatex(limitAt(result, '+\\infty'))).toBe(plusInf);
	});

	it('e^x/x : 0 en −∞, −∞ en 0⁻, +∞ en 0⁺, +∞ en +∞', () => {
		const result = study('e^x/x');
		expect(limitLatex(limitAt(result, '-\\infty'))).toBe('0');
		expect(limitLatex(limitAt(result, '0', 'left'))).toBe('negative_infinity');
		expect(limitLatex(limitAt(result, '0', 'right'))).toBe('infinity');
		expect(limitLatex(limitAt(result, '+\\infty'))).toBe('infinity');
	});

	it('le tableau texte ne dit plus « indetermine »', () => {
		for (const f of ['x e^x', 'x e^(-x)', 'x e^(2x)', 'e^(-x^2)', 'e^x/x']) {
			expect(formatVariationTable(study(f))).not.toContain('indetermine');
		}
	});
});

describe("Valeur de l'extremum : exacte ET réduite", () => {
	it.each([
		// f, type, abscisse, valeur exacte, LaTeX affiché
		['x e^x', 'global_minimum', '-1', '-1/e', '-\\dfrac{1}{\\exponentialE}'],
		['x e^(-x)', 'global_maximum', '1', '1/e', '\\dfrac{1}{\\exponentialE}'],
		['x e^(2x)', 'global_minimum', '-1/2', '-1/(2e)', '-\\dfrac{1}{2 \\exponentialE}'],
		['e^(-x^2)', 'global_maximum', '0', '1', '1']
	] as const)('%s : %s en %s', (f, type, x, _value, latex) => {
		const result = study(f);
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toBe(type);
		expect(sameValue(extremum.x, x)).toBe(true);
		expect(toLatex(extremum.y)).toBe(latex);
	});

	it('x e^x : les valeurs exactes sont justes à 10⁻¹²', () => {
		const result = study('x e^x');
		expect(result.extrema[0].yApproximate ?? NaN).toBeCloseTo(-1 / Math.E, 12);
	});

	it('e^x/x : minimum LOCAL e en 1 (f → −∞ à gauche de 0)', () => {
		const result = study('e^x/x');
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toBe('local_minimum');
		expect(sameValue(extremum.x, '1')).toBe(true);
		expect(toLatex(extremum.y)).toBe('\\exponentialE');
	});

	it('x² ln x : minimum global −1/(2e) en e^{−1/2}, valeur exacte', () => {
		const result = study('x^2 ln(x)');
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toBe('global_minimum');
		expect(sameValue(extremum.x, E_MINUS_HALF)).toBe(true);
		expect(extremum.yApproximate ?? NaN).toBeCloseTo(-1 / (2 * Math.E), 12);
	});

	// Option A (David, 2026-10-05) : `tidy` n'applique aucune identité ;
	// `normalize` réduit ln(e^{−1/2}) et (e^{−1/2})², puis `tidy` met au propre.
	// Mesuré avant : `ln(e^{−1/2})(e^{−1/2})²`.
	it('x² ln x : minimum affiché −1/(2e), sous la même forme que x e^{2x}', () => {
		const extremum = study('x^2 ln(x)').extrema[0];
		expect(sameValue(extremum.y, '-1/(2e)')).toBe(true);
		expect(toLatex(extremum.y)).toBe('-\\dfrac{1}{2 \\exponentialE}');
	});

	// Mesuré avant : point critique et valeur affichés `exp(-1)`.
	it('x ln x : minimum −1/e en 1/e, sans `exp(`', () => {
		const result = study('x ln(x)');
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toBe('global_minimum');
		expect(toLatex(extremum.x)).toBe('\\dfrac{1}{\\exponentialE}');
		expect(toLatex(extremum.y)).toBe('-\\dfrac{1}{\\exponentialE}');
		expect(extremum.yApproximate ?? NaN).toBeCloseTo(-1 / Math.E, 12);
	});

	it('ln(x)/x : maximum 1/e en e, sans `exp(`', () => {
		const result = study('ln(x)/x');
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toBe('global_maximum');
		expect(toLatex(extremum.x)).toBe('\\exponentialE');
		expect(toLatex(extremum.y)).toBe('\\dfrac{1}{\\exponentialE}');
		expect(formatVariationTable(result)).not.toContain('exp(');
	});

	it('x² ln x : pas d’extremum en 0 (limite 0 non atteinte)', () => {
		const result = study('x^2 ln(x)');
		expect(limitLatex(limitAt(result, '0'))).toBe('0');
		expect(formatVariationTable(result)).not.toContain('f(0)');
	});

	it('.variations x e^x : la ligne affichée', () => {
		const text = formatVariationTable(study('x e^x'));
		expect(text).toContain('Minimum global : f(-1) =');
		expect(text).not.toContain('exp(');
	});
});

describe('Témoins inchangés', () => {
	it.each([
		[
			'x^2',
			[
				'Expression : x^2',
				"Derivee : f'(x) = 2x",
				'',
				'Domaine : R (tous les reels)',
				'',
				'Points critiques :',
				"  x = 0 (f'=0)",
				'',
				"Signe de f'(x) :",
				'  ]-inf ; 0[ : -  (f decroissante)',
				'  {0}        : 0  (f constante)',
				'  ]0 ; +inf[ : +  (f croissante)',
				'',
				'Extrema :',
				'  Minimum global : f(0) = 0',
				'',
				'Limites aux bornes :',
				'  lim_{x -> -∞^+} f(x) = +inf',
				'  lim_{x -> +∞^-} f(x) = +inf'
			]
		],
		[
			'sqrt(x) - x',
			[
				'Expression : sqrt(x)-x',
				"Derivee : f'(x) = 1/{2sqrt(x)}-1",
				'',
				'Domaine : [0 ; +∞[',
				'',
				'Points critiques :',
				"  x = 1/4 (f'=0)",
				'',
				"Signe de f'(x) :",
				'  [0 ; 1/4[    : +  (f croissante)',
				'  {1/4}        : 0  (f constante)',
				'  ]1/4 ; +inf[ : -  (f decroissante)',
				'',
				'Extrema :',
				'  Maximum global : f(1/4) = 1/4',
				'',
				'Limites aux bornes :',
				'  lim_{x -> 0^+} f(x) = 0',
				'  lim_{x -> +∞^-} f(x) = -inf'
			]
		],
		[
			'ln(x)',
			[
				'Expression : ln(x)',
				"Derivee : f'(x) = 1/x",
				'',
				'Domaine : ]0 ; +∞[',
				'',
				'Points critiques : aucun',
				'',
				"Signe de f'(x) :",
				'  ]0 ; +inf[ : +  (f croissante)',
				'',
				'Extrema : aucun',
				'',
				'Limites aux bornes :',
				'  lim_{x -> 0^+} f(x) = -inf',
				'  lim_{x -> +∞^-} f(x) = +inf'
			]
		],
		// Seul témoin qui bouge, voulu (option A, 2026-10-05) : `exp(-1)` partout
		// avant, 1/e désormais — même valeur, écriture du lycée.
		[
			'x ln(x)',
			[
				'Expression : xln(x)',
				"Derivee : f'(x) = ln(x)+x*1/x",
				'',
				'Domaine : ]0 ; +∞[',
				'',
				'Points critiques :',
				"  x = 1/e (f'=0)",
				'',
				"Signe de f'(x) :",
				'  ]0 ; 1/e[    : -  (f decroissante)',
				'  {1/e}        : 0  (f constante)',
				'  ]1/e ; +inf[ : +  (f croissante)',
				'',
				'Extrema :',
				'  Minimum global : f(1/e) = -1/e',
				'',
				'Limites aux bornes :',
				'  lim_{x -> 0^+} f(x) = 0',
				'  lim_{x -> +∞^-} f(x) = +inf'
			]
		]
	] as const)('%s : tableau identique', (f, lines) => {
		expect(formatVariationTable(study(f))).toBe(lines.join('\n'));
	});
});
