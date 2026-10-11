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
import { divide, euler, number, opposite, superscript } from '../../factory';
import type { MathNode } from '../../types';
import type { VariationResult } from '../types';

function study(custom: string): VariationResult {
	return computeVariations(parseCustom(custom), { variable: 'x', includeBoundaryLimits: true });
}

function sameValue(node: MathNode, expected: string | MathNode): boolean {
	const other = typeof expected === 'string' ? parseCustom(expected) : expected;
	return normalFormsEquivalent(normalize(node), normalize(other));
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

	// Mesuré avant le correctif : « indetermine » des deux côtés, `evaluateLimit`
	// ne connaissant que `exp(…)`, pas `e^…`.
	it('limites : 0 en −∞ (croissances comparées), +∞ en +∞', () => {
		const text = commandOutput('x e^x');
		expect(text).toContain('lim (x → -∞) f(x) = 0');
		expect(text).toContain('lim (x → +∞) f(x) = +∞');
		// Un extremum non atteint ne s'annonce pas : la limite 0 en −∞ n'est
		// pas un « Maximum global : f(−∞) ».
		expect(text).not.toMatch(/Maximum/);
		expect(text).toContain('Minimum global : f(-1)');
	});
});

describe('f(x) = x² eˣ (coefficients ≠ 1 dans la dérivée)', () => {
	it('points critiques −2 et 0 ; croissante, décroissante, croissante', () => {
		const result = study('x^2 e^x');
		expect(result.criticalPoints.map((c) => c.xApproximate)).toEqual([-2, 0]);
		expect(directions(result)).toEqual(['increasing', 'decreasing', 'increasing']);
	});
});

/** e^{−1/2} : `parseCustom` ne lit pas la constante d'Euler en puissance. */
const E_MINUS_HALF = superscript(euler(), opposite(divide(number('1'), number('2'), 'fraction')));

describe('Facteur commun enfoui dans la dérivée (Terminale)', () => {
	// Mesuré avant le correctif : « Points critiques : non déterminés » pour les
	// trois, la dérivée arrivant sous une forme que la mise en facteur ne lisait pas.
	it.each([
		// f, point critique, sens, extremum (type, valeur exacte)
		['x e^(2x)', '-1/2', ['decreasing', 'increasing'], 'minimum', -1 / (2 * Math.E)],
		['x e^(-x)', '1', ['increasing', 'decreasing'], 'maximum', 1 / Math.E],
		['x^2 ln(x)', E_MINUS_HALF, ['decreasing', 'increasing'], 'minimum', -1 / (2 * Math.E)]
	] as const)('%s : point critique, sens, extremum exact', (f, critical, sens, kind, value) => {
		const result = study(f);
		expect(result.derivativeZerosUnresolved).toBeFalsy();
		expect(result.criticalPoints).toHaveLength(1);
		expect(sameValue(result.criticalPoints[0].x, critical)).toBe(true);
		expect(directions(result)).toEqual(sens);
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toContain(kind);
		expect(sameValue(extremum.x, critical)).toBe(true);
		// ⚠️ La valeur est EXACTE mais pas toujours réduite : `normalize` laisse
		// opaque une puissance de e d'exposant non littéral (e^{2·(−1/2)},
		// ln(e^{−1/2})) — hors de portée ici. On vérifie l'exactitude (aucun
		// décimal dans y) et la valeur à 10⁻¹².
		expect(extremum.exact).toBe(true);
		expect(toCustom(extremum.y)).not.toMatch(/\d\.\d/);
		expect(extremum.yApproximate ?? NaN).toBeCloseTo(value, 12);
	});

	it("x^2 ln(x) : 0 n'est pas un point critique (hors du domaine)", () => {
		const result = study('x^2 ln(x)');
		expect(result.criticalPoints.every((c) => (c.xApproximate ?? 1) > 0)).toBe(true);
	});

	it("x² + x ln x : f'(x) = 2x + ln x + 1 n'a pas de forme close, « non déterminés » reste juste", () => {
		const result = study('x^2 + x ln(x)');
		expect(result.derivativeZerosUnresolved).toBe(true);
		expect(result.criticalPoints).toHaveLength(0);
	});
});

describe('Deux défauts que la mise en facteur a rendus visibles', () => {
	// 1. Le signe par échantillonnage : sur ]−∞ ; c[, les points tirés jusqu'à
	//    −100 donnent des valeurs comme e^{−34}·(−33) ≈ 10⁻¹³, sous la
	//    tolérance : le signe sortait « 0 », et f « constante ». Mesuré avant :
	//    e^{−x²} « constante » sur ℝ entier.
	it('e^{−x²} : croissante puis décroissante, maximum 1 en 0', () => {
		const result = study('e^(-x^2)');
		expect(directions(result)).toEqual(['increasing', 'decreasing']);
		const maximum = result.extrema.find((e) => e.type.includes('maximum'));
		expect(maximum).toBeDefined();
		expect(sameValue(maximum!.x, '0')).toBe(true);
		expect(maximum!.yApproximate).toBe(1);
	});

	// 2. Une limite finie en une borne OUVERTE n'est pas une valeur atteinte :
	//    mesuré avant, `.variations x ln(x)` annonçait « Maximum global :
	//    f(0) = 0 » (0 hors du domaine), et `ln(x)/x` « Minimum global :
	//    f(+∞) = ln(+∞)/+∞ ».
	it.each(['x ln(x)', 'x^2 ln(x)'])('%s : pas d’extremum en 0, hors du domaine', (f) => {
		const result = study(f);
		expect(result.extrema).toHaveLength(1);
		expect(result.extrema[0].type).toBe('global_minimum');
		expect(formatVariationTable(result)).not.toContain('f(0)');
	});

	it('ln(x)/x : un maximum en e, aucun minimum (f(+∞) n’existe pas)', () => {
		const result = study('ln(x)/x');
		expect(result.extrema).toHaveLength(1);
		expect(result.extrema[0].type).toContain('maximum');
		expect(formatVariationTable(result)).not.toContain('+∞)');
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
	it('x eˣ : un seul point critique −1 (témoin)', () => {
		const result = study('x e^x');
		expect(result.criticalPoints).toHaveLength(1);
		expect(sameValue(result.criticalPoints[0].x, '-1')).toBe(true);
	});

	it('eˣ = x + 2 (via eˣ − x − 2) : toujours non déterminée', () => {
		expect(study('e^x - x^2/2 - 2x').derivativeZerosUnresolved).toBe(true);
	});

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
				// LOCAUX : f → ±∞ (ce test enregistrait « global », revue de #857)
				'  Maximum local : f(-1) = 2',
				'  Minimum local : f(1) = -2',
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
