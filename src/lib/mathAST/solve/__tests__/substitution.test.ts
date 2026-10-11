/**
 * Changement de variable : équations polynomiales EN sin x, cos x, tan x,
 * ln x ou eˣ — et sûreté : un échec de méthode n'est jamais « pas de solution ».
 *
 * Mesuré sur main avant le correctif :
 *   • `sin²x = 1/4` → statut `no-solution` (« transcendante non supporte ») ;
 *   • `x(sin²x − 1/4) = 0` → `x = 0`, SANS erreur : le facteur non résolu
 *     était lu comme un facteur sans solution, la réponse paraissait complète ;
 *   • `(sin x + cos²x)(sin x − cos²x) = 0` → « aucune solution », sans erreur ;
 *   • `e^{sin²x} = 1` → « pas de solution réelle » (x = kπ en sont).
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { isRelation } from '../../guards';
import { toLatex } from '../../latex-generator';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import type { SolveResult, Solution } from '../types';
import { analyzeSign } from '../../sign';
import { parseCustom } from '../../parser/custom';
import { number, multiply, opposite, PI as PI_NODE } from '../../factory';
import { closedInterval } from '$lib/math/intervals/factory';
// L'ensemble d'intervalles du module domain (avec `excludedPoints`), celui
// qu'attend `analyzeSign` : la variante de math/intervals n'est pas un `Domain`.
import { intervalSet } from '../../domain/factory';

// =============================================================================
// Aides
// =============================================================================

function solveLatex(latex: string): SolveResult {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error(`Pas une équation : ${latex}`);
	return solve(node);
}

/** Un échec du solveur : `error` présent et absence NON démontrée. */
function isFailure(result: SolveResult): boolean {
	return result.error !== undefined && result.conclusive !== true;
}

/** Valeurs numériques triées, calculées depuis la valeur EXACTE (pas `approximate`). */
function valuesOf(solutions: readonly Solution[]): number[] {
	return solutions.map((s) => evaluateNodeToApproximatedNumber(s.value)).sort((a, b) => a - b);
}

function expectValues(solutions: readonly Solution[], expected: number[]): void {
	const actual = valuesOf(solutions);
	const sorted = [...expected].sort((a, b) => a - b);
	expect(actual).toHaveLength(sorted.length);
	sorted.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 9));
}

/** Valeurs exactes : drapeau `exact` et aucune écriture décimale. */
function expectExact(solutions: readonly Solution[]): void {
	for (const s of solutions) {
		expect(s.exact).toBe(true);
		expect(toLatex(s.value)).not.toMatch(/\d\.\d/);
	}
}

const PI = Math.PI;

// =============================================================================
// 1. Sûreté : un échec ne devient jamais « pas de solution »
// =============================================================================

describe('sûreté — un facteur ou une sous-équation non résolue', () => {
	it('x(sin x + cos²x) = 0 : pas de « x = 0 » présenté comme complet', () => {
		const r = solveLatex(String.raw`x(\sin(x)+\cos^2(x))=0`);
		expect(isFailure(r)).toBe(true);
	});

	it('(sin x + cos²x)(sin x − cos²x) = 0 : pas de « aucune solution »', () => {
		const r = solveLatex(String.raw`(\sin(x)+\cos^2(x))(\sin(x)-\cos^2(x))=0`);
		expect(isFailure(r)).toBe(true);
	});

	it('sin²x + cos²x = 1 (deux fonctions) : non supporté, pas « aucune solution »', () => {
		const r = solveLatex(String.raw`\sin^2(x)+\cos^2(x)=1`);
		expect(isFailure(r)).toBe(true);
	});

	it('e^{sin²x} = 1 : x = kπ, pas « pas de solution réelle »', () => {
		const r = solveLatex(String.raw`e^{\sin^2(x)}=1`);
		expect(isFailure(r)).toBe(false);
		// La famille ENTIÈRE, pas la seule solution de base x = 0.
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [0]);
	});

	it('√(sin²x) = 1 : x = π/2 + kπ, pas « aucune solution »', () => {
		const r = solveLatex(String.raw`\sqrt{\sin^2(x)}=1`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [PI / 2]);
	});
});

// =============================================================================
// 2. Changement de variable — trigonométrie
// =============================================================================

describe('changement de variable u = sin x, cos x, tan x', () => {
	for (const latex of [String.raw`\sin^2(x)=\frac{1}{4}`, String.raw`\sin(x)^2=\frac{1}{4}`]) {
		it(`${latex} → x = ±π/6 + kπ`, () => {
			const r = solveLatex(latex);
			expect(isFailure(r)).toBe(false);
			const family = r.periodicSolutions;
			expect(family).toBeDefined();
			expect(family!.periodNumeric).toBeCloseTo(PI, 9);
			expect(toLatex(family!.period)).toBe(String.raw`\pi`);
			expectValues(family!.baseSolutions, [PI / 6, -PI / 6]);
			expectExact(family!.baseSolutions);
			expect(family!.baseSolutions.map((s) => toLatex(s.value)).sort()).toEqual(
				[String.raw`-\dfrac{1}{6} \pi`, String.raw`\dfrac{1}{6} \pi`].sort()
			);
			expectValues(r.solutions, [PI / 6, -PI / 6]);
		});
	}

	it('cos²x = 1 → x = kπ', () => {
		const r = solveLatex(String.raw`\cos^2(x)=1`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [0]);
		expectExact(r.periodicSolutions!.baseSolutions);
	});

	it('tan²x = 3 → x = ±π/3 + kπ', () => {
		const r = solveLatex(String.raw`\tan^2(x)=3`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [PI / 3, -PI / 3]);
		expectExact(r.periodicSolutions!.baseSolutions);
	});

	it('2sin²x − sin x = 0 → x = kπ, π/6 + 2kπ, 5π/6 + 2kπ (famille COMPLÈTE)', () => {
		const r = solveLatex(String.raw`2\sin^2(x)-\sin(x)=0`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(2 * PI, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [0, PI, PI / 6, (5 * PI) / 6]);
		expectExact(r.periodicSolutions!.baseSolutions);
	});

	it('2cos²x − 1 = 0 → x = π/4 + kπ/2', () => {
		const r = solveLatex(String.raw`2\cos^2(x)-1=0`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI / 2, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [PI / 4]);
	});

	it('sin²x = 2 → aucune solution, DÉMONTRÉE (|sin x| ≤ 1)', () => {
		const r = solveLatex(String.raw`\sin^2(x)=2`);
		expect(r.solutions).toHaveLength(0);
		expect(isFailure(r)).toBe(false);
		expect(['no-solution', 'no-real-solution']).toContain(r.status);
	});

	it('sin x · cos x = 0 → x = kπ/2 (les deux familles, pas la première seule)', () => {
		const r = solveLatex(String.raw`\sin(x)\cos(x)=0`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI / 2, 9);
		expectValues(r.periodicSolutions!.baseSolutions, [0]);
	});

	it('x(sin²x − 1/4) = 0 → 0 et la famille ±π/6 + kπ', () => {
		const r = solveLatex(String.raw`x(\sin^2(x)-\frac{1}{4})=0`);
		expect(isFailure(r)).toBe(false);
		expect(valuesOf(r.solutions).some((v) => Math.abs(v) < 1e-12)).toBe(true);
		expect(valuesOf(r.solutions).some((v) => Math.abs(v - PI / 6) < 1e-9)).toBe(true);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(PI, 9);
	});
});

// =============================================================================
// 3. Changement de variable — exponentielle et logarithme
// =============================================================================

describe('changement de variable u = eˣ, ln x', () => {
	it('e^{2x} − 3eˣ + 2 = 0 → x = 0, x = ln 2', () => {
		const r = solveLatex(String.raw`e^{2x}-3e^x+2=0`);
		expect(isFailure(r)).toBe(false);
		expectValues(r.solutions, [0, Math.LN2]);
		expectExact(r.solutions);
	});

	it('(x + 1)(e^{2x} − 3eˣ + 2) = 0 → −1, 0, ln 2', () => {
		const r = solveLatex(String.raw`(x+1)(e^{2x}-3e^x+2)=0`);
		expect(isFailure(r)).toBe(false);
		expectValues(r.solutions, [-1, 0, Math.LN2]);
	});

	it('e^{2x} + eˣ − 2 = 0 → x = 0 seul (u = −2 < 0 écarté)', () => {
		const r = solveLatex(String.raw`e^{2x}+e^x-2=0`);
		expect(isFailure(r)).toBe(false);
		expectValues(r.solutions, [0]);
	});

	for (const latex of [String.raw`\ln^2(x)=1`, String.raw`\ln(x)^2=1`]) {
		it(`${latex} → x = e, x = 1/e`, () => {
			const r = solveLatex(latex);
			expect(isFailure(r)).toBe(false);
			expectValues(r.solutions, [Math.E, 1 / Math.E]);
			expectExact(r.solutions);
		});
	}

	it('ln²x − ln x = 0 → x = 1, x = e', () => {
		const r = solveLatex(String.raw`\ln^2(x)-\ln(x)=0`);
		expect(isFailure(r)).toBe(false);
		expectValues(r.solutions, [1, Math.E]);
		expectExact(r.solutions);
	});

	it('(x − 1)(ln²x − 1) = 0 → 1, e, 1/e', () => {
		const r = solveLatex(String.raw`(x-1)(\ln^2(x)-1)=0`);
		expect(isFailure(r)).toBe(false);
		expectValues(r.solutions, [1, Math.E, 1 / Math.E]);
	});
});

// =============================================================================
// 4. Témoins inchangés
// =============================================================================

describe('témoins inchangés', () => {
	it('sin x = 1/2 → π/6, 5π/6 (période 2π)', () => {
		const r = solveLatex(String.raw`\sin(x)=\frac{1}{2}`);
		expect(r.periodicSolutions!.periodNumeric).toBeCloseTo(2 * PI, 9);
		expectValues(r.solutions, [PI / 6, (5 * PI) / 6]);
	});

	it('x² − 4 = 0 → ±2', () => {
		expectValues(solveLatex('x^2-4=0').solutions, [-2, 2]);
	});

	it('eˣ = 2 → ln 2', () => {
		expectValues(solveLatex('e^x=2').solutions, [Math.LN2]);
	});
});

// =============================================================================
// 5. Ce que voit le module de signe (zéros sur un intervalle borné)
// =============================================================================

describe('module de signe — zéros énumérés sur [0, 2π]', () => {
	const domain = intervalSet([
		closedInterval(number('0'), multiply(number('2'), PI_NODE, 'implicit'))
	]);

	function zerosOf(custom: string): number[] {
		const result = analyzeSign(parseCustom(custom), { variable: 'x', domain });
		return result.zeros.map((z) => z.approximate ?? Number.NaN).sort((a, b) => a - b);
	}

	it('sin(x)·cos(x) : 0, π/2, π, 3π/2, 2π (la 2e famille n’est plus perdue)', () => {
		const zeros = zerosOf('sin(x)*cos(x)');
		expect(zeros).toHaveLength(5);
		[0, PI / 2, PI, (3 * PI) / 2, 2 * PI].forEach((v, i) => expect(zeros[i]).toBeCloseTo(v, 6));
	});

	it('sin(x)^2 - 1/4 : π/6, 5π/6, 7π/6, 11π/6', () => {
		const zeros = zerosOf('sin(x)^2-1/4');
		expect(zeros).toHaveLength(4);
		[PI / 6, (5 * PI) / 6, (7 * PI) / 6, (11 * PI) / 6].forEach((v, i) =>
			expect(zeros[i]).toBeCloseTo(v, 6)
		);
	});

	function zerosOn(custom: string, lower: number): number[] {
		const lo = lower < 0 ? opposite(number(String(-lower))) : number(String(lower));
		const d = intervalSet([closedInterval(lo, multiply(number('2'), PI_NODE, 'implicit'))]);
		const result = analyzeSign(parseCustom(custom), { variable: 'x', domain: d });
		return result.zeros.map((z) => z.approximate ?? Number.NaN).sort((a, b) => a - b);
	}

	function expectZeros(actual: number[], expected: number[]): void {
		const sorted = [...expected].sort((a, b) => a - b);
		expect(actual).toHaveLength(sorted.length);
		sorted.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 6));
	}

	it('x(sin²x − 1/4) sur [−1 ; 2π] : la solution isolée x = 0 ET la famille', () => {
		expectZeros(zerosOn('x*(sin(x)^2-1/4)', -1), [
			-PI / 6,
			0,
			PI / 6,
			(5 * PI) / 6,
			(7 * PI) / 6,
			(11 * PI) / 6
		]);
	});

	it('(x − 1)·sin x sur [0 ; 2π] : 0, 1, π, 2π', () => {
		expectZeros(zerosOn('(x-1)*sin(x)', 0), [0, 1, PI, 2 * PI]);
	});

	it('sin(2x)·sin(3x) sur [0 ; 2π] : toutes les racines (périodes π et 2π/3)', () => {
		const expected = new Set<number>();
		for (let k = 0; k <= 4; k++) expected.add(Math.round(((k * PI) / 2) * 1e9) / 1e9);
		for (let k = 0; k <= 6; k++) expected.add(Math.round(((k * PI) / 3) * 1e9) / 1e9);
		expectZeros(zerosOn('sin(2x)*sin(3x)', 0), [...expected]);
	});
});

describe('statut d’une famille périodique', () => {
	it('cos³x − cos x = 0 : une famille → statut multiple, pas unique', () => {
		const r = solveLatex(String.raw`\cos^3(x)-\cos(x)=0`);
		expect(isFailure(r)).toBe(false);
		expect(r.periodicSolutions).toBeDefined();
		expect(r.status).toBe('multiple');
	});
});
