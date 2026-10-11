/**
 * Revue du 2026-10-09, vue Calcul de l'atelier :
 *
 * 1. `.résoudre cos(2x)=cos(x)` refusait (« Je ne sais pas encore résoudre
 *    cette équation. ») : cos a = cos b, sin a = sin b, tan a = tan b, classiques
 *    de 1re / Tle. La famille rendue est vérifiée NUMÉRIQUEMENT (k = −3 … 3) :
 *    ni solution inventée, ni solution perdue (les deux familles du cours y
 *    sont toutes).
 * 2. `P(X > 5 | X > 2)` refusé pour la loi binomiale (et uniforme discrète),
 *    accepté pour la géométrique et la normale : P(A | B) = P(A ∩ B) / P(B).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { solve } from '$lib/mathAST/solve/solve';
import { parseLatex } from '$lib/mathAST/parser';
import { isRelation } from '$lib/mathAST/guards';
import { isSolverFailure } from '$lib/mathAST/solve/types';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function latexOf(input: string): string {
	const result = runInput(session(), input);
	expect(result.kind, JSON.stringify(result)).toBe('commande');
	return result.kind === 'commande' ? (result.latex ?? '').replace(/\s/g, '') : '';
}

const Z = ',\\;k\\in\\mathbb{Z}';
const PI = Math.PI;

// =============================================================================
// 1. f(a) = f(b)
// =============================================================================

interface TrigCase {
	readonly equation: string;
	/** Les deux membres, en JS, pour vérifier une solution */
	readonly lhs: (x: number) => number;
	readonly rhs: (x: number) => number;
	/** Les familles du cours : x₀ + k·T */
	readonly textbook: readonly { x0: number; period: number }[];
	/** Les deux membres sont définis en x (tangente : hors des pôles) */
	readonly defined?: (x: number) => boolean;
}

const tanDefined =
	(...slopes: number[]) =>
	(x: number) =>
		slopes.every((s) => Math.abs(Math.cos(s * x)) > 1e-9);

const CASES: readonly TrigCase[] = [
	{
		equation: 'cos(2x)=cos(x)',
		lhs: (x) => Math.cos(2 * x),
		rhs: (x) => Math.cos(x),
		// 2x = x + 2kπ ; 2x = −x + 2kπ
		textbook: [
			{ x0: 0, period: 2 * PI },
			{ x0: 0, period: (2 * PI) / 3 }
		]
	},
	{
		equation: 'sin(2x)=sin(x)',
		lhs: (x) => Math.sin(2 * x),
		rhs: (x) => Math.sin(x),
		// 2x = x + 2kπ ; 2x = π − x + 2kπ
		textbook: [
			{ x0: 0, period: 2 * PI },
			{ x0: PI / 3, period: (2 * PI) / 3 }
		]
	},
	{
		equation: 'cos(x)=cos(\\pi/3)',
		lhs: (x) => Math.cos(x),
		rhs: () => Math.cos(PI / 3),
		textbook: [
			{ x0: PI / 3, period: 2 * PI },
			{ x0: -PI / 3, period: 2 * PI }
		]
	},
	{
		equation: 'sin(3x)=sin(x+\\pi/4)',
		lhs: (x) => Math.sin(3 * x),
		rhs: (x) => Math.sin(x + PI / 4),
		// 3x = x + π/4 + 2kπ ; 3x = π − x − π/4 + 2kπ
		textbook: [
			{ x0: PI / 8, period: PI },
			{ x0: (3 * PI) / 16, period: PI / 2 }
		]
	},
	{
		equation: 'cos(3x)=cos(x)',
		lhs: (x) => Math.cos(3 * x),
		rhs: (x) => Math.cos(x),
		textbook: [
			{ x0: 0, period: PI },
			{ x0: 0, period: PI / 2 }
		]
	},
	{
		equation: 'tan(2x)=tan(x)',
		lhs: (x) => Math.tan(2 * x),
		rhs: (x) => Math.tan(x),
		textbook: [{ x0: 0, period: PI }],
		defined: tanDefined(2, 1)
	},
	{
		// Tle : sin(2x) = 0 donne kπ/2, privé des pôles π/2 + kπ
		equation: 'tan(3x)=tan(x)',
		lhs: (x) => Math.tan(3 * x),
		rhs: (x) => Math.tan(x),
		textbook: [{ x0: 0, period: PI }],
		defined: tanDefined(3, 1)
	},
	{
		// cos(π/2 − x) = cos 2x : π/2 − x = ±2x + 2kπ
		equation: 'sin(x)=cos(2x)',
		lhs: (x) => Math.sin(x),
		rhs: (x) => Math.cos(2 * x),
		textbook: [
			{ x0: PI / 6, period: (2 * PI) / 3 },
			{ x0: -PI / 2, period: 2 * PI }
		]
	},
	{
		// cos x = cos(π − 2x) : x = ±(π − 2x) + 2kπ
		equation: 'cos(x)=-cos(2x)',
		lhs: (x) => Math.cos(x),
		rhs: (x) => -Math.cos(2 * x),
		textbook: [
			{ x0: PI / 3, period: (2 * PI) / 3 },
			{ x0: PI, period: 2 * PI }
		]
	},
	// Chemin NORMAL, argument b − a·x : main rendait les solutions d'une
	// période SANS « + kπ » (sin(π/4 − x) = 0 → S = {−3π/4 ; π/4})
	{
		equation: 'sin(\\pi/4-x)=0',
		lhs: (x) => Math.sin(PI / 4 - x),
		rhs: () => 0,
		textbook: [{ x0: PI / 4, period: PI }]
	},
	{
		equation: 'sin(1-2x)=0',
		lhs: (x) => Math.sin(1 - 2 * x),
		rhs: () => 0,
		textbook: [{ x0: 0.5, period: PI / 2 }]
	},
	{
		// π/4 − 3x/2 = π/2 + kπ
		equation: 'cos(\\pi/4-3x/2)=0',
		lhs: (x) => Math.cos(PI / 4 - (3 * x) / 2),
		rhs: () => 0,
		textbook: [{ x0: -PI / 6, period: (2 * PI) / 3 }]
	},
	{
		// π/3 − x = π/4 + kπ
		equation: 'tan(\\pi/3-x)=1',
		lhs: (x) => Math.tan(PI / 3 - x),
		rhs: () => 1,
		textbook: [{ x0: PI / 12, period: PI }],
		defined: (x) => Math.abs(Math.cos(PI / 3 - x)) > 1e-9
	},
	{
		// 2 − x = ±π/3 + 2kπ
		equation: 'cos(2-x)=1/2',
		lhs: (x) => Math.cos(2 - x),
		rhs: () => 0.5,
		textbook: [
			{ x0: 2 - PI / 3, period: 2 * PI },
			{ x0: 2 + PI / 3, period: 2 * PI }
		]
	}
];

function congruent(a: number, b: number, period: number): boolean {
	const r = (((a - b) % period) + period) % period;
	return r < 1e-7 || period - r < 1e-7;
}

describe('f(a) = f(b) : la famille rendue est exactement celle du cours', () => {
	it.each(CASES.map((c) => [c.equation, c] as const))('%s', (_, c) => {
		const equation = parseLatex(c.equation.replace(/(sin|cos|tan)/g, '\\$1'));
		if (!isRelation(equation)) throw new Error('pas une relation');
		const result = solve(equation, { variable: 'x' });
		expect(isSolverFailure(result), JSON.stringify(result.error)).toBe(false);
		const family = result.periodicSolutions;
		expect(family).toBeDefined();
		if (!family) return;
		const bases = family.baseSolutions.map((s) => s.approximate ?? NaN);
		const T = family.periodNumeric;

		// Aucune solution inventée
		for (const base of bases) {
			for (let k = -3; k <= 3; k++) {
				const x = base + k * T;
				if (c.defined) expect(c.defined(x), `x = ${x} : pôle`).toBe(true);
				expect(Math.abs(c.lhs(x) - c.rhs(x)), `x = ${x}`).toBeLessThan(1e-9);
			}
		}
		// L'écriture du manuel (une période par famille) : même ensemble
		for (const shown of result.displayFamilies ?? []) {
			for (const base of shown.baseSolutions) {
				for (let k = -3; k <= 3; k++) {
					const x = (base.approximate ?? NaN) + k * shown.periodNumeric;
					expect(Math.abs(c.lhs(x) - c.rhs(x)), `affichée x = ${x}`).toBeLessThan(1e-9);
				}
			}
		}
		for (const { x0, period } of c.textbook) {
			for (let k = -3; k <= 3; k++) {
				const x = x0 + k * period;
				const families = result.displayFamilies ?? [family];
				expect(
					families.some((f) =>
						f.baseSolutions.some((b) => congruent(b.approximate ?? NaN, x, f.periodNumeric))
					),
					`affichée : x = ${x} manque`
				).toBe(true);
			}
		}
		// Aucune solution perdue
		for (const { x0, period } of c.textbook) {
			for (let k = -3; k <= 3; k++) {
				const x = x0 + k * period;
				expect(
					bases.some((b) => congruent(b, x, T)),
					`x = ${x} manque`
				).toBe(true);
			}
		}
	});
});

describe('.résoudre dans Calcul', () => {
	it('cos(2x)=cos(x) → x = 2kπ/3 (2kπ y est déjà)', () => {
		expect(latexOf('.résoudre cos(2x)=cos(x)')).toBe(`x=\\dfrac{2k\\pi}{3}${Z}`);
	});

	it('cos(x)=cos(π/3) → ±π/3 + 2kπ', () => {
		expect(latexOf('.résoudre cos(x)=cos(\\pi/3)')).toBe(
			`x=-\\dfrac{\\pi}{3}+2k\\pi\\text{ou}x=\\dfrac{\\pi}{3}+2k\\pi${Z}`
		);
	});

	it.each([
		['sin(2x)=sin(x)', `x=2k\\pi\\text{ou}x=\\dfrac{\\pi}{3}+\\dfrac{2k\\pi}{3}${Z}`],
		[
			'sin(3x)=sin(x+\\pi/4)',
			`x=\\dfrac{\\pi}{8}+k\\pi\\text{ou}x=\\dfrac{3\\pi}{16}+\\dfrac{k\\pi}{2}${Z}`
		],
		['tan(3x)=tan(x)', `x=k\\pi${Z}`],
		['sin(x)=cos(2x)', `x=\\dfrac{\\pi}{6}+\\dfrac{2k\\pi}{3}${Z}`],
		['cos(x)=-cos(2x)', `x=\\dfrac{\\pi}{3}+\\dfrac{2k\\pi}{3}${Z}`],
		// Écriture de main figée : la division par 3 reste propre à f(a) = f(b)
		[
			'2cos(x)^2-cos(x)-1=0',
			`x=-\\dfrac{2\\pi}{3}+2k\\pi\\text{ou}x=2k\\pi\\text{ou}x=\\dfrac{2\\pi}{3}+2k\\pi${Z}`
		],
		['sin(\\pi/4-x)=0', `x=\\dfrac{\\pi}{4}+k\\pi${Z}`],
		// #988 : inchangés
		['sin(x)=0', `x=k\\pi${Z}`],
		['cos(x/3)=1/2', `x=-\\pi+6k\\pi\\text{ou}x=\\pi+6k\\pi${Z}`]
	])('%s : chaque famille avec SA période (écriture du manuel)', (equation, expected) => {
		expect(latexOf(`.résoudre ${equation}`)).toBe(expected);
	});

	it('le texte aussi : x = 2kπ ou x = π/3 + {2kπ}/3', () => {
		const result = runInput(session(), '.résoudre sin(2x)=sin(x)');
		expect(result.kind === 'commande' && result.output).toContain(
			'x = 2k\\pi ou x = \\pi/3 + {2k\\pi}/3, k ∈ ℤ'
		);
	});

	it.each(['sin(2x)=sin(x)', 'sin(3x)=sin(x+\\pi/4)', 'tan(2x)=tan(x)'])(
		'%s : résolue, avec k ∈ ℤ',
		(equation) => {
			expect(latexOf(`.résoudre ${equation}`)).toContain('k\\in\\mathbb{Z}');
		}
	);

	it('cos(x)=sin(x) inchangé (#988)', () => {
		expect(latexOf('.résoudre cos(x)=sin(x)')).toBe(`x=\\dfrac{\\pi}{4}+k\\pi${Z}`);
	});

	it('cos(2x)=cos(x) dans [0 ; 2π] : 0, 2π/3, 4π/3, 2π', () => {
		expect(latexOf('.résoudre cos(2x)=cos(x) dans [0 ; 2\\pi]')).toBe(
			'S=\\left\\{0\\,;\\,\\dfrac{2}{3}\\pi\\,;\\,\\dfrac{4}{3}\\pi\\,;\\,2\\pi\\right\\}'
		);
	});

	it('sin(π/4 − x)=0 dans [0 ; 2π] : π/4 et 5π/4', () => {
		expect(latexOf('.résoudre sin(\\pi/4-x)=0 dans [0 ; 2\\pi]')).toBe(
			'S=\\left\\{\\dfrac{1}{4}\\pi\\,;\\,\\dfrac{5}{4}\\pi\\right\\}'
		);
	});

	it('sin(2x)=sin(x) dans [0 ; 2π] : 0, π/3, π, 5π/3, 2π', () => {
		expect(latexOf('.résoudre sin(2x)=sin(x) dans [0 ; 2\\pi]')).toBe(
			'S=\\left\\{0\\,;\\,\\dfrac{1}{3}\\pi\\,;\\,\\pi\\,;\\,\\dfrac{5}{3}\\pi\\,;\\,2\\pi\\right\\}'
		);
	});
});

// =============================================================================
// 2. P(A | B) pour les lois discrètes
// =============================================================================

/** B(10 ; 0,3), calculé ici en flottants, indépendamment du module */
function binomialP(contains: (k: number) => boolean): number {
	let total = 0;
	let c = 1;
	for (let k = 0; k <= 10; k++) {
		if (k > 0) c = (c * (10 - k + 1)) / k;
		if (contains(k)) total += c * 0.3 ** k * 0.7 ** (10 - k);
	}
	return total;
}

function shown(value: number): string {
	return value.toFixed(3).replace('.', ',');
}

function outputOf(s: CalcSession, input: string): string {
	const result = runInput(s, input);
	expect(result.kind, JSON.stringify(result)).toBe('commande');
	return result.kind === 'commande' ? result.output : '';
}

const GIVEN_GT_2 = binomialP((k) => k > 5) / binomialP((k) => k > 2);
const LE_3_GIVEN_GE_1 = binomialP((k) => k >= 1 && k <= 3) / binomialP((k) => k >= 1);

describe('P(A | B), loi binomiale B(10 ; 0,3)', () => {
	it('la référence indépendante : P(X > 5 | X > 2) ≈ 0,077', () => {
		expect(shown(GIVEN_GT_2)).toBe('0,077');
	});

	it('P(X > 5 | X > 2) tapé seul après la loi', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		expect(outputOf(s, 'P(X > 5 | X > 2)')).toBe(`P(X > 5 | X > 2) ≈ ${shown(GIVEN_GT_2)}`);
	});

	it('P(X ⩽ 3 | X ⩾ 1), en LaTeX aussi', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		expect(outputOf(s, 'P(X\\leqslant 3\\mid X\\geqslant 1)')).toContain(
			`≈ ${shown(LE_3_GIVEN_GE_1)}`
		);
	});

	it('P(2 ⩽ X ⩽ 4 | X > 1) : intervalles à deux bornes', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		const expected = binomialP((k) => k >= 2 && k <= 4) / binomialP((k) => k > 1);
		expect(outputOf(s, 'P(2 ⩽ X ⩽ 4 | X > 1)')).toContain(`≈ ${shown(expected)}`);
	});

	it('dans la ligne de la loi', () => {
		const s = session();
		expect(JSON.stringify(runInput(s, '.binomiale X 10 0,3 P(X > 5 | X > 2)'))).toContain(
			`P(X > 5 | X > 2) ≈ ${shown(GIVEN_GT_2)}`
		);
	});

	it('dans un bloc ```loi de fiche', () => {
		const node = parseStatChartContent(
			'loi',
			'X ~ B(10 ; 0,3)\nprobabilités: P(X > 5 | X > 2) ; P(X ⩽ 3)'
		);
		expect(node.errors).toEqual([]);
		const scene = buildStatChartScene(node.spec!, { locale: 'fr' });
		expect(scene.indicators).toContain(`P(X > 5 | X > 2) ≈ ${shown(GIVEN_GT_2)}`);
		expect(scene.indicators).toContain('P(X ⩽ 3) ≈ 0,650');
	});

	it('P(B) = 0 : refus en français', () => {
		const s = session();
		runInput(s, '.binomiale X 10 0,3');
		const result = runInput(s, 'P(X > 5 | X > 12)');
		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain(
			'P(X > 12) = 0 : la probabilité sachant cet événement n’est pas définie'
		);
	});
});

describe('P(A | B), loi uniforme discrète U(1 ; 6)', () => {
	it('P(X > 4 | X > 2) = 0,5', () => {
		const s = session();
		runInput(s, '.uniforme X 1 6');
		expect(outputOf(s, 'P(X > 4 | X > 2)')).toBe('P(X > 4 | X > 2) = 0,5');
	});

	it('P(X ⩽ 2 | X ⩾ 7) : P(B) = 0, refus', () => {
		const s = session();
		runInput(s, '.uniforme X 1 6');
		const result = runInput(s, 'P(X ⩽ 2 | X ⩾ 7)');
		expect(result.kind === 'refus' && result.message).toContain(
			'P(X ⩾ 7) = 0 : la probabilité sachant cet événement n’est pas définie'
		);
	});
});

describe('géométrique et normale : inchangées', () => {
	it('G(0,2) : P(X > 5 | X > 2) = 0,8³ = 0,512', () => {
		const s = session();
		runInput(s, '.geometrique X 0,2');
		expect(outputOf(s, 'P(X > 5 | X > 2)')).toContain('0,512');
	});

	it('N(0 ; 1) : P(Y > 1 | Y > 0) ≈ 0,317', () => {
		const s = session();
		runInput(s, '.normale Y 0 1');
		expect(outputOf(s, 'P(Y > 1 | Y > 0)')).toContain('0,317');
	});
});
