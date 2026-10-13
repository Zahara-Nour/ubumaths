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
import type { ReciprocalRefusal, ReciprocalResult, ReciprocalSuccess } from '..';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { substitute } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { formatInterval } from '../../domain/format';
import { parseStudentDomain } from '../../domain/validation/parse-student-domain';
import type { Domain } from '../../domain/types';
import type { MathNode } from '../../types';
import { isInfinity } from '../../guards';

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

type NotBijective = Extract<ReciprocalRefusal, { kind: 'not-bijective' }>;

function notBijectiveOf(latex: string, interval?: string): NotBijective {
	const result = reciprocalOf(latex, interval);
	if (result.ok) throw new Error('refus attendu');
	if (result.refusal.kind !== 'not-bijective') {
		throw new Error(`refus « non bijective » attendu : ${result.refusal.message}`);
	}
	return result.refusal;
}

/** Trois points de la première composante d'un ensemble (bornes exclues). */
function pointsIn(domain: Domain): number[] {
	if (domain.kind !== 'interval_set') return [-2, 0.5, 3];
	const [first] = domain.intervals;
	const bound = (node: MathNode): number =>
		isInfinity(node)
			? node.sign === 'positive'
				? Infinity
				: -Infinity
			: evaluateNodeToApproximatedNumber(node);
	const low = bound(first.lower.value);
	const high = bound(first.upper.value);
	if (Number.isFinite(low) && Number.isFinite(high)) {
		return [0.2, 0.5, 0.8].map((t) => low + (high - low) * t);
	}
	if (Number.isFinite(low)) return [0.5, 2, 7].map((d) => low + d);
	if (Number.isFinite(high)) return [0.5, 2, 7].map((d) => high - d);
	return [-2, 0.5, 3];
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
		const refusal = notBijectiveOf('x^2');
		expect(refusal.sameImage?.map((n) => toLatex(n))).toEqual(['-1', '1']);
		expect(refusal.suggestion && formatInterval(refusal.suggestion)).toBe('[0 ; +∞[');
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

	it('x eˣ sur ℝ : non bijective par les variations, même sans formule du solveur', () => {
		const refusal = notBijectiveOf('xe^x');
		expect(refusal.pieces?.map((p) => formatInterval(p.interval))).toEqual([
			']-∞ ; -1]',
			'[-1 ; +∞['
		]);
		expect(refusal.pieces?.every((p) => p.expression === null)).toBe(true);
	});

	it('x eˣ sur [−1 ; +∞[ : le moteur ne sait pas — jamais de réponse approchée', () => {
		const result = reciprocalOf('xe^x', '[-1;+\\infty[');
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

// =============================================================================
// Écriture du manuel (décisions de David, 2026-10-13)
// =============================================================================

interface WritingCase {
	readonly f: string;
	readonly interval?: string;
	/** L'écriture d'avant (#1304), mesurée le 2026-10-13. */
	readonly before: string;
	readonly after: string;
}

const WRITINGS: readonly WritingCase[] = [
	{
		f: 'x^2-4x+1',
		interval: '[2;+\\infty[',
		before: '\\dfrac{\\sqrt{4 x + 12}}{2} + 2',
		after: '\\sqrt{x + 3} + 2'
	},
	{
		f: 'x^2-4x+1',
		interval: ']-\\infty;2]',
		before: '2 - \\dfrac{\\sqrt{4 x + 12}}{2}',
		after: '2 - \\sqrt{x + 3}'
	},
	{
		f: '2x^2+4x-1',
		interval: '[-1;+\\infty[',
		before: '\\dfrac{\\sqrt{8 x + 24}}{4} - 1',
		after: '\\dfrac{\\sqrt{2 x + 6}}{2} - 1'
	},
	{
		f: '(x-1)^2+3',
		interval: '[1;+\\infty[',
		before: '\\dfrac{\\sqrt{4 x - 12}}{2} + 1',
		after: '\\sqrt{x - 3} + 1'
	},
	{
		f: '\\frac{x^3}{8}+2',
		before: '\\sqrt[3]{8 x - 16}',
		after: '2 \\sqrt[3]{x - 2}'
	},
	{
		f: '8x^3-16',
		before: '\\sqrt[3]{\\dfrac{x}{8} + 2}',
		after: '\\dfrac{\\sqrt[3]{x + 16}}{2}'
	},
	{
		f: '\\frac{x^4}{16}',
		interval: '[0;+\\infty[',
		before: '\\sqrt[4]{16 x}',
		after: '2 \\sqrt[4]{x}'
	},
	{
		f: '\\frac{e^x}{e^x+1}',
		before: '\\ln\\left( -\\dfrac{x}{x - 1} \\right)',
		after: '\\ln\\left( \\dfrac{x}{1 - x} \\right)'
	}
];

describe('computeReciprocal — écriture du manuel', () => {
	for (const c of WRITINGS) {
		const label = c.interval ? `${c.f} sur ${c.interval}` : c.f;
		it(`${label} : ${c.before} → ${c.after}, même valeur`, () => {
			const result = success(reciprocalOf(c.f, c.interval));
			expect(toLatex(result.expression)).toBe(c.after);
			const before = parseLatex(c.before);
			for (const y of pointsIn(result.departure)) {
				expect(valueAt(result.expression, 'x', y), `en ${y}`).toBeCloseTo(
					valueAt(before, 'x', y),
					9
				);
				const back = valueAt(parseLatex(c.f), 'x', valueAt(result.expression, 'x', y));
				expect(back, `f(f⁻¹(${y}))`).toBeCloseTo(y, 9);
			}
		});
	}

	it('x² + x sur [0 ; +∞[ : rien à sortir de √(4x + 1), écriture inchangée', () => {
		const result = success(reciprocalOf('x^2+x', '[0;+\\infty['));
		expect(toLatex(result.expression)).toBe('\\dfrac{\\sqrt{4 x + 1} - 1}{2}');
	});

	it('l’étape de résolution montre la même écriture', () => {
		const { steps } = success(reciprocalOf('x^2-4x+1', '[2;+\\infty['));
		expect(steps[0].expressionLatex).toBe('y = x^2 - 4 x + 1 \\iff x = \\sqrt{y + 3} + 2');
	});
});

// =============================================================================
// Refus « non bijective » : expliquer, puis lister les morceaux
// =============================================================================

/** Chaque réciproque listée vérifie f(f⁻¹(y)) = y sur trois points de son départ. */
function checkPieces(latex: string, refusal: NotBijective): void {
	const f = parseLatex(latex);
	for (const piece of refusal.pieces ?? []) {
		if (piece.expression === null || piece.departure === null) continue;
		for (const y of pointsIn(piece.departure)) {
			const x = valueAt(piece.expression, 'x', y);
			expect(valueAt(f, 'x', x), `f(f⁻¹(${y})) sur ${formatInterval(piece.interval)}`).toBeCloseTo(
				y,
				9
			);
			const inside = pointsIn(piece.interval);
			expect(inside.length).toBe(3);
		}
	}
}

describe('computeReciprocal — non bijective : explication et réciproques par morceau', () => {
	it('x² sur ℝ : explique les deux antécédents, liste −√x et √x, propose [0 ; +∞[', () => {
		const refusal = notBijectiveOf('x^2');
		expect(refusal.message).toBe(
			"f n'est pas bijective sur ℝ : f(-1) = f(1) = 1, donc 1 aurait deux antécédents et " +
				'f⁻¹(1) ne saurait pas lequel choisir. Mais f est bijective sur chacun de ces intervalles, ' +
				'avec une réciproque différente : sur ]-∞ ; 0] : $f^{-1}\\left( x \\right) = -\\sqrt{x}$ ; ' +
				'sur [0 ; +∞[ : $f^{-1}\\left( x \\right) = \\sqrt{x}$. ' +
				'Choisis un intervalle, par exemple .réciproque f sur [0 ; +∞[.'
		);
		expect(refusal.pieces?.map((p) => formatInterval(p.interval))).toEqual([
			']-∞ ; 0]',
			'[0 ; +∞['
		]);
		expect(refusal.pieces?.map((p) => p.expression && toLatex(p.expression))).toEqual([
			'-\\sqrt{x}',
			'\\sqrt{x}'
		]);
		checkPieces('x^2', refusal);
	});

	it('x⁴ sur ℝ : −∜x sur ]−∞ ; 0], ∜x sur [0 ; +∞[', () => {
		const refusal = notBijectiveOf('x^4');
		expect(refusal.pieces?.map((p) => p.expression && toLatex(p.expression))).toEqual([
			'-\\sqrt[4]{x}',
			'\\sqrt[4]{x}'
		]);
		checkPieces('x^4', refusal);
	});

	it('x³ − 3x sur ℝ : trois morceaux cités, f(-2) = f(1) = -2', () => {
		const refusal = notBijectiveOf('x^3-3x');
		expect(refusal.message).toContain('f(-2) = f(1) = -2, donc -2 aurait deux antécédents');
		expect(refusal.pieces?.map((p) => formatInterval(p.interval))).toEqual([
			']-∞ ; -1]',
			'[-1 ; 1]',
			'[1 ; +∞['
		]);
		for (const piece of refusal.pieces ?? []) {
			const where = formatInterval(piece.interval);
			expect(refusal.message).toContain(`sur ${where}`);
			// sans formule : cité sans formule, jamais une formule fausse
			if (piece.expression === null) expect(piece.departure).toBeNull();
		}
		checkPieces('x^3-3x', refusal);
	});

	it('x⁴ − 2x² : quatre morceaux, tous listés avec leur réciproque', () => {
		const refusal = notBijectiveOf('x^4-2x^2');
		expect(refusal.pieces).toHaveLength(4);
		checkPieces('x^4-2x^2', refusal);
	});

	it('x/(x² + 1) : sans paire entière, explication générale sans valeurs', () => {
		const refusal = notBijectiveOf('\\frac{x}{x^2+1}');
		expect(refusal.sameImage).toBeUndefined();
		expect(refusal.message).toContain(
			'deux nombres différents ont la même image, et f⁻¹ ne saurait pas lequel choisir'
		);
		checkPieces('\\frac{x}{x^2+1}', refusal);
	});

	it('x⁵ − 5x³ + 4x : trop de morceaux pour les lister, on les compte', () => {
		const refusal = notBijectiveOf('x^5-5x^3+4x');
		expect(refusal.pieces).toBeUndefined();
		expect(refusal.message).toContain(
			'f est bijective sur chacun de ses 5 intervalles de stricte monotonie'
		);
		// bornes approchées par les variations : pas proposées telles quelles
		expect(refusal.message).not.toMatch(/\d{7,}/);
		expect(refusal.message).toContain('Choisis un intervalle où f est strictement monotone.');
	});

	it('x⁵ − 5x³ : bornes ±√3 approchées par les variations, morceaux comptés et pas listés', () => {
		const refusal = notBijectiveOf('x^5-5x^3');
		expect(refusal.pieces).toBeUndefined();
		expect(refusal.message).not.toMatch(/\d{7,}/);
		expect(refusal.message).toContain('chacun de ses 3 intervalles de stricte monotonie');
	});

	it('sin sur ℝ : une infinité de morceaux, pas de liste, un intervalle proposé', () => {
		const refusal = notBijectiveOf('\\sin(x)');
		expect(refusal.infinitelyManyPieces).toBe(true);
		expect(refusal.pieces).toBeUndefined();
		expect(refusal.message).toContain("une infinité d'intervalles");
		expect(refusal.suggestion && formatInterval(refusal.suggestion)).toBe('[-π/2 ; π/2]');
	});

	it('cos sur ℝ : périodique aussi, [0 ; π] proposé', () => {
		const refusal = notBijectiveOf('\\cos(x)');
		expect(refusal.infinitelyManyPieces).toBe(true);
		expect(refusal.suggestion && formatInterval(refusal.suggestion)).toBe('[0 ; π]');
	});

	// Décision (5) de David (2026-10-13) : la vérité, sans proposer une commande
	// qui échouerait — `.réciproque f sur [−π/2 ; π/2]` ne sait pas écrire arcsin
	it.each([
		[
			'\\sin(x)',
			"f n'est pas bijective sur ℝ : f(0) = f(π) = 0, donc 0 aurait plusieurs antécédents. Elle l'est sur une infinité d'intervalles, par exemple [−π/2 ; π/2]. Sa réciproque y est la fonction arcsin, que Chiphre ne sait pas encore calculer."
		],
		[
			'\\cos(x)',
			"f n'est pas bijective sur ℝ : f(0) = f(2π) = 1, donc 1 aurait plusieurs antécédents. Elle l'est sur une infinité d'intervalles, par exemple [0 ; π]. Sa réciproque y est la fonction arccos, que Chiphre ne sait pas encore calculer."
		],
		[
			'2\\sin(x)+1',
			"f n'est pas bijective sur ℝ : f(0) = f(π) = 1, donc 1 aurait plusieurs antécédents. Elle l'est sur une infinité d'intervalles, par exemple [−π/2 ; π/2]. Sa réciproque y s'écrit avec la fonction arcsin, que Chiphre ne sait pas encore calculer."
		]
	])('%s : le refus dit arcsin / arccos, sans commande', (f, message) => {
		const refusal = notBijectiveOf(f);
		expect(refusal.message).toBe(message);
		expect(refusal.message).not.toContain('.réciproque');
	});

	// Les paires CITÉES par le refus sont vraies : lues dans le message,
	// recalculées sur f (à 1e-9 près)
	it.each(['\\sin(x)', '\\cos(x)', '\\tan(x)', '2\\sin(x)+1'])(
		'%s : la paire citée a bien la même image',
		(latex) => {
			const cited = /f\(0\) = f\((π|2π)\) = (-?\d+)/.exec(notBijectiveOf(latex).message);
			expect(cited).not.toBeNull();
			const [, b, y] = cited!;
			const f = parseLatex(latex);
			for (const at of [0, b === 'π' ? Math.PI : 2 * Math.PI]) {
				const image = evaluateNodeToApproximatedNumber(substitute(f, { x: at }));
				expect(image).toBeCloseTo(Number(y), 9);
			}
		}
	);

	it('tan sur son domaine : ]−π/2 ; π/2[ et arctan', () => {
		const refusal = notBijectiveOf('\\tan(x)');
		// L'explication d'abord, comme pour x² (décision de David, 2026-10-13)
		expect(refusal.message).toMatch(
			/^f n'est pas bijective sur .+ : f\(0\) = f\(π\) = 0, donc 0 aurait plusieurs antécédents\. Elle l'est sur une infinité d'intervalles, par exemple \]−π\/2 ; π\/2\[\. Sa réciproque y est la fonction arctan, que Chiphre ne sait pas encore calculer\.$/
		);
		expect(refusal.message).not.toContain('.réciproque');
	});

	// Revue de #1342 : la fenêtre fermée [−π/2 ; π/2] gardait π/2, où tan n'existe pas
	it('tan sur ]−1 ; 4[ : l’intervalle proposé est ouvert en π/2', () => {
		const refusal = notBijectiveOf('\\tan(x)', ']-1;4[');
		expect(refusal.suggestion && formatInterval(refusal.suggestion)).toBe(']-1 ; π/2[');
	});

	it('sin sur [0 ; 1] (pas une période entière) : reste un refus honnête, jamais « non bijective »', () => {
		const result = reciprocalOf('\\sin(x)', '[0;1]');
		if (result.ok) return;
		expect(result.refusal.kind).not.toBe('not-bijective');
	});
});
