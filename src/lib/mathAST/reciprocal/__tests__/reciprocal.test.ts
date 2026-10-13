/**
 * La réciproque calculée (lot 2 du chantier « réciproque »,
 * docs/wip/atelier-reciproque-phase0.md) — testée sans l'atelier.
 *
 * Chaque succès est vérifié NUMÉRIQUEMENT : f(f⁻¹(y)) = y pour trois y de
 * l'ensemble de départ de f⁻¹, et f⁻¹(f(x)) = x pour trois x de I. Les
 * ensembles sont lus dans leur écriture française (`formatInterval`).
 * Toutes les fonctions partent d'une saisie PARSÉE.
 */

import { describe, it, expect } from 'vitest';
import { computeReciprocal } from '..';
import type { ReciprocalResult, ReciprocalSuccess } from '..';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { substitute } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { formatInterval } from '../../domain/format';
import { parseStudentDomain } from '../../domain/validation/parse-student-domain';
import type { Domain } from '../../domain/types';
import type { MathNode } from '../../types';

// =============================================================================
// Outils
// =============================================================================

function intervalOf(text: string): Domain {
	const parsed = parseStudentDomain(text);
	if (!parsed.success) throw new Error(`Intervalle illisible : ${text}`);
	return parsed.domain;
}

function reciprocalOf(latex: string, interval?: string, variable = 'x'): ReciprocalResult {
	return computeReciprocal(parseLatex(latex), {
		variable,
		...(interval !== undefined && { interval: intervalOf(interval) })
	});
}

function valueAt(node: MathNode, variable: string, value: number): number {
	return evaluateNodeToApproximatedNumber(substitute(node, { [variable]: value }));
}

function success(result: ReciprocalResult): ReciprocalSuccess {
	if (!result.ok) throw new Error(`Refus inattendu : ${result.refusal.message}`);
	return result;
}

/** f(f⁻¹(y)) = y et f⁻¹(f(x)) = x, à 1e-9 près. */
function checkRoundTrips(
	latex: string,
	result: ReciprocalSuccess,
	xs: readonly number[],
	ys: readonly number[],
	variable = 'x'
): void {
	const f = parseLatex(latex);
	for (const y of ys) {
		const back = valueAt(f, variable, valueAt(result.expression, variable, y));
		expect(back, `f(f⁻¹(${y}))`).toBeCloseTo(y, 9);
	}
	for (const x of xs) {
		const back = valueAt(result.expression, variable, valueAt(f, variable, x));
		expect(back, `f⁻¹(f(${x}))`).toBeCloseTo(x, 9);
	}
}

// =============================================================================
// Cas nominaux (tableau de la phase 0)
// =============================================================================

interface NominalCase {
	readonly f: string;
	readonly interval?: string;
	readonly inverse: string;
	readonly departure: string;
	readonly arrival: string;
	readonly xs: readonly number[];
	readonly ys: readonly number[];
}

const NOMINAL: readonly NominalCase[] = [
	{
		f: '2x+3',
		inverse: '\\dfrac{x - 3}{2}',
		departure: 'ℝ',
		arrival: 'ℝ',
		xs: [-2, 0.5, 4],
		ys: [-1, 3, 10]
	},
	{
		f: '\\frac{2x+1}{x-3}',
		inverse: '\\dfrac{3 x + 1}{x - 2}',
		departure: 'ℝ \\ {2}',
		arrival: 'ℝ \\ {3}',
		xs: [-1, 2, 5],
		ys: [0, 1, 4]
	},
	{
		f: 'x^3',
		inverse: '\\sqrt[3]{x}',
		departure: 'ℝ',
		arrival: 'ℝ',
		xs: [-2, 0.5, 3],
		ys: [-8, 1, 5]
	},
	{
		f: 'e^{2x+1}',
		inverse: '\\dfrac{\\ln\\left( x \\right) - 1}{2}',
		departure: ']0 ; +∞[',
		arrival: 'ℝ',
		xs: [-1, 0, 2],
		ys: [0.5, 1, 7]
	},
	{
		f: '\\ln(x-1)',
		inverse: '\\exponentialE^x + 1',
		departure: 'ℝ',
		arrival: ']1 ; +∞[',
		xs: [1.5, 2, 6],
		ys: [-2, 0, 3]
	},
	{
		f: 'x^2',
		interval: '[0;+\\infty[',
		inverse: '\\sqrt{x}',
		departure: '[0 ; +∞[',
		arrival: '[0 ; +∞[',
		xs: [0, 1.5, 4],
		ys: [0, 2, 9]
	},
	{
		f: 'x^2',
		interval: ']-\\infty;0]',
		inverse: '-\\sqrt{x}',
		departure: '[0 ; +∞[',
		arrival: ']-∞ ; 0]',
		xs: [-4, -1.5, 0],
		ys: [0, 2, 9]
	},
	{
		f: '\\sqrt{x+2}',
		inverse: 'x^2 - 2',
		departure: '[0 ; +∞[',
		arrival: '[-2 ; +∞[',
		xs: [-2, 0, 7],
		ys: [0, 1.5, 3]
	}
];

describe('computeReciprocal — tableau de la phase 0', () => {
	for (const c of NOMINAL) {
		const label = c.interval ? `${c.f} sur ${c.interval}` : c.f;
		it(`${label} → f⁻¹(x) = ${c.inverse}, ${c.departure} → ${c.arrival}`, () => {
			const result = success(reciprocalOf(c.f, c.interval));
			expect(toLatex(result.expression)).toBe(c.inverse);
			expect(formatInterval(result.departure)).toBe(c.departure);
			expect(formatInterval(result.arrival)).toBe(c.arrival);
			checkRoundTrips(c.f, result, c.xs, c.ys);
		});

		it(`${label} : f(I) lue par les variations ET par le solveur, qui s'accordent`, () => {
			const result = success(reciprocalOf(c.f, c.interval));
			expect(result.departureReadBy).toEqual(['variations', 'solver']);
		});
	}
});

// =============================================================================
// Écriture, branches, lettre choisie
// =============================================================================

describe('computeReciprocal — écriture et branches', () => {
	it('3eˣ − 1 → ln((x + 1)/3), sur ]−1 ; +∞[ (une seule fraction dans le ln)', () => {
		const result = success(reciprocalOf('3e^x-1'));
		expect(toLatex(result.expression)).toBe('\\ln\\left( \\dfrac{x + 1}{3} \\right)');
		expect(formatInterval(result.departure)).toBe(']-1 ; +∞[');
		checkRoundTrips('3e^x-1', result, [-2, 0, 1.5], [-0.5, 2, 20]);
	});

	it('x² − 4x + 1 sur [2 ; +∞[ : garde la branche 2 + √(x + 3), départ [−3 ; +∞[', () => {
		const result = success(reciprocalOf('x^2-4x+1', '[2;+\\infty['));
		expect(formatInterval(result.departure)).toBe('[-3 ; +∞[');
		expect(formatInterval(result.arrival)).toBe('[2 ; +∞[');
		checkRoundTrips('x^2-4x+1', result, [2, 3.5, 10], [-3, 0, 6]);
	});

	it('lettre choisie : f(t) = 2t + 3 → f⁻¹(t) = (t − 3)/2', () => {
		const result = success(reciprocalOf('2t+3', undefined, 't'));
		expect(result.variable).toBe('t');
		expect(toLatex(result.expression)).toBe('\\dfrac{t - 3}{2}');
		checkRoundTrips('2t+3', result, [-1, 0, 2], [0, 1, 5], 't');
	});
});

// =============================================================================
// Étapes (R3)
// =============================================================================

describe('computeReciprocal — étapes', () => {
	it('2x + 3 : y = 2x + 3 ⇔ x = (y − 3)/2, puis f⁻¹(x) = (x − 3)/2, puis les ensembles', () => {
		const { steps } = success(reciprocalOf('2x+3'));
		expect(steps.map((s) => s.rule)).toEqual([
			'reciprocal-solve',
			'reciprocal-rename',
			'reciprocal-sets'
		]);
		expect(steps[0].expressionLatex).toBe('y = 2 x + 3 \\iff x = \\dfrac{y - 3}{2}');
		expect(steps[1].expressionLatex).toBe('f^{-1}\\left( x \\right) = \\dfrac{x - 3}{2}');
		expect(steps[2].expressionLatex).toBe('f^{-1} : \\mathbb{R} \\to \\mathbb{R}');
	});

	it('x² sur [0 ; +∞[ : l’étape de résolution dit quelle solution on garde', () => {
		const { steps } = success(reciprocalOf('x^2', '[0;+\\infty['));
		expect(steps[0].expressionLatex).toBe('y = x^2 \\iff x = \\sqrt{y}');
		expect(steps[0].explanation).toContain('[0 ; +∞[');
		expect(steps[2].expressionLatex).toBe('f^{-1} : [0 ; +\\infty[ \\to [0 ; +\\infty[');
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('computeReciprocal — refus', () => {
	it('x² sur ℝ : non bijective, f(−1) = f(1), suggère [0 ; +∞[', () => {
		const result = reciprocalOf('x^2');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		const { refusal } = result;
		expect(refusal.kind).toBe('not-bijective');
		if (refusal.kind !== 'not-bijective') return;
		expect(refusal.sameImage?.map((n) => toLatex(n))).toEqual(['-1', '1']);
		expect(refusal.suggestion && formatInterval(refusal.suggestion)).toBe('[0 ; +∞[');
		expect(refusal.message).toBe(
			"f n'est pas bijective sur ℝ (f(-1) = f(1)) : choisis un intervalle, par exemple .réciproque f sur [0 ; +∞[."
		);
	});

	it('x² sur [−1 ; 2] : non bijective, f(−1) = f(1), suggère [0 ; 2]', () => {
		const result = reciprocalOf('x^2', '[-1;2]');
		if (result.ok) throw new Error('refus attendu');
		const { refusal } = result;
		expect(refusal.kind).toBe('not-bijective');
		if (refusal.kind !== 'not-bijective') return;
		expect(refusal.sameImage?.map((n) => toLatex(n))).toEqual(['-1', '1']);
		expect(refusal.suggestion && formatInterval(refusal.suggestion)).toBe('[0 ; 2]');
		expect(refusal.message).toContain('sur [-1 ; 2]');
	});

	it('x eˣ : le moteur ne sait pas — jamais de réponse approchée', () => {
		const result = reciprocalOf('xe^x');
		if (result.ok) throw new Error('refus attendu');
		expect(result.refusal.kind).toBe('unsolved');
		expect(result.refusal.message).toBe(
			'Je ne sais pas calculer la réciproque de f algébriquement.'
		);
	});

	it('f = 5 : constante', () => {
		const result = reciprocalOf('5');
		if (result.ok) throw new Error('refus attendu');
		expect(result.refusal.kind).toBe('constant');
		expect(result.refusal.message).toBe("Une fonction constante n'a pas de réciproque.");
	});

	it('f = 3x − 3x + 2 : constante, même si x est écrit', () => {
		const result = reciprocalOf('3x-3x+2');
		if (result.ok) throw new Error('refus attendu');
		expect(result.refusal.kind).toBe('constant');
	});
});

// =============================================================================
// Régressions de la revue de #1304
// =============================================================================

describe('computeReciprocal — injectivité prouvée, jamais devinée', () => {
	it('e^{x²} sur ]−0,001 ; 5] : refus (f(−0,0005) = f(0,0005), invisible aux échantillons)', () => {
		const result = reciprocalOf('e^{x^2}', ']-0.001;5]');
		expect(result.ok).toBe(false);
	});

	it('x² sur ]−0,001 ; 5] et sur [−1 ; 1000] : refus', () => {
		expect(reciprocalOf('x^2', ']-0.001;5]').ok).toBe(false);
		expect(reciprocalOf('x^2', '[-1;1000]').ok).toBe(false);
	});

	it('1/x³ : jamais « non bijective » (le bruit de Cardano n’est pas un contre-exemple)', () => {
		const result = reciprocalOf('\\frac{1}{x^3}');
		if (!result.ok) {
			expect(result.refusal.kind).not.toBe('not-bijective');
			return;
		}
		expect(formatInterval(result.departure)).toBe('ℝ \\ {0}');
		expect(formatInterval(result.arrival)).toBe('ℝ \\ {0}');
		checkRoundTrips('\\frac{1}{x^3}', result, [-2, 0.5, 3], [-8, 0.125, 5]);
	});
});

describe('computeReciprocal — racines n-ièmes du solveur (root)', () => {
	it('x⁴ sur [0 ; +∞[ → racine quatrième, [0 ; +∞[ → [0 ; +∞[', () => {
		const result = success(reciprocalOf('x^4', '[0;+\\infty['));
		expect(formatInterval(result.departure)).toBe('[0 ; +∞[');
		checkRoundTrips('x^4', result, [0, 1.5, 3], [0, 2, 81]);
	});

	it('x⁵ → racine cinquième, ℝ → ℝ', () => {
		const result = success(reciprocalOf('x^5'));
		expect(formatInterval(result.departure)).toBe('ℝ');
		checkRoundTrips('x^5', result, [-2, 0.5, 3], [-32, 1, 7]);
	});
});
