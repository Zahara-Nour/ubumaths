/**
 * L'Hôpital's Rule Implementation
 *
 * Applies L'Hôpital's rule for indeterminate forms 0/0 and ∞/∞.
 *
 * @module mathAST/limits/lhopital
 */

import type { MathNode, DivisionNode } from '../types';
import type { ExtendedNormalizeResult } from '../normal/types';
import type { LimitDirection, LimitOptions, IndeterminateForm } from './types';
import { isDivision, isInfinity } from '../guards';
import { compile } from '../eval/compile';
import { differentiate } from '../differentiation';
import { detectIndeterminateForm, classifyLimitValue } from './indeterminate';
import type { LimitStepRecorder } from './step-recorder';
import { numericNode } from '../common/numeric';
import {
	tryEvaluateLimitExact,
	isZeroResult,
	isInfinityResult,
	isIndeterminateResult,
	resultToNode,
	resultToNumber
} from './exact-evaluation';
import { exactConstantNode } from './generalized-degree';
import { divide } from '../factory';
import { normalize, denormalize } from '../normal';
import { nodesEqual } from '../pattern/match';

// =============================================================================
// L'Hôpital's Rule
// =============================================================================

/**
 * Result of applying L'Hôpital's rule.
 */
export interface LhopitalResult {
	/** Whether L'Hôpital was applicable */
	readonly applicable: boolean;

	/** The resulting limit value (if found) */
	readonly value: MathNode | null;

	/** The transformed expression (f'/g') */
	readonly transformedExpr?: MathNode;

	/** Number of iterations used */
	readonly iterations: number;

	/** Indeterminate form that was resolved */
	readonly resolvedForm?: IndeterminateForm;

	/** Error message if not applicable */
	readonly error?: string;

	/**
	 * Valeur tirée du repli NUMÉRIQUE (évaluation en un point proche, pas un
	 * calcul exact) : x/√x en +∞ donnait « 200000 ». L'appelant ne doit pas la
	 * présenter comme une limite exacte.
	 */
	readonly approximate?: boolean;
}

/**
 * Apply L'Hôpital's rule to a division expression.
 *
 * L'Hôpital's rule states that for indeterminate forms 0/0 or ∞/∞:
 * lim(f/g) = lim(f'/g') if the latter limit exists.
 *
 * @param expr - The expression (must be a division)
 * @param varName - The variable approaching the limit
 * @param approach - The point being approached
 * @param direction - Direction of approach
 * @param recorder - Step recorder for pedagogical output
 * @param options - Limit evaluation options
 * @returns Result of applying L'Hôpital's rule
 */
export function applyLhopital(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder,
	options: Required<LimitOptions>
): LhopitalResult {
	// Must be a division
	if (!isDivision(expr)) {
		return {
			applicable: false,
			value: null,
			iterations: 0,
			error: "L'Hôpital's rule requires a quotient (division)"
		};
	}

	// Detect indeterminate form
	const form = detectIndeterminateForm(expr, varName, approach, direction);

	if (form !== '0/0' && form !== '∞/∞') {
		return {
			applicable: false,
			value: null,
			iterations: 0,
			error: `L'Hôpital's rule only applies to 0/0 or ∞/∞ forms, got ${form}`
		};
	}

	// Apply L'Hôpital iteratively
	let currentExpr: DivisionNode = expr;
	let iterations = 0;
	const maxIterations = options.maxLhopitalIterations;

	while (iterations < maxIterations) {
		iterations++;

		// Differentiate numerator and denominator
		let numDerivative: MathNode;
		let denDerivative: MathNode;

		try {
			numDerivative = differentiate(currentExpr.numerator, { variable: varName });
			denDerivative = differentiate(currentExpr.denominator, { variable: varName });
		} catch {
			return {
				applicable: true,
				value: null,
				iterations,
				resolvedForm: form,
				error: 'Could not differentiate expression'
			};
		}

		// Create the new quotient f'/g'
		const newExpr: DivisionNode = {
			type: 'division',
			numerator: numDerivative,
			denominator: denDerivative,
			displayStyle: 'fraction'
		};

		// Record step
		recorder.recordStep(
			'lhopital',
			`Application de la règle de L'Hôpital (forme ${form})`,
			currentExpr,
			newExpr,
			'detailed',
			undefined,
			`Dérivation: f' = d/d${varName}(f), g' = d/d${varName}(g)`
		);

		// Check if the new form is still indeterminate
		const newForm = detectIndeterminateForm(newExpr, varName, approach, direction);

		// Valeur approchée (repli numérique) : rendue en dernier recours, après
		// la forme réduite de f'/g'.
		let approximateEvaluation: MathNode | null = null;
		if (newForm === 'none') {
			// We can try direct evaluation
			const evaluation = tryDirectEvaluation(newExpr, varName, approach, direction);
			if (evaluation !== null && !evaluation.approximate) {
				recorder.recordStep(
					'lhopital',
					"Limite trouvée après application de la règle de L'Hôpital",
					newExpr,
					evaluation.value,
					'summarized'
				);
				return {
					applicable: true,
					value: evaluation.value,
					transformedExpr: newExpr,
					iterations,
					resolvedForm: form
				};
			}
			approximateEvaluation = evaluation?.value ?? null;
		}

		// f'/g' non conclu exactement : sa forme réduite (module normal/) peut
		// l'être. (1/x)/(2x/(x²+1)) = (x²+1)/(2x²) en +∞, 12x²/(4x³/√(x⁴)) = 3x
		// en 0 — sans elle, ln x / ln(x²+1) restait sans limite exacte.
		const reduced = reduceQuotient(newExpr);
		if (reduced !== null) {
			const reducedLimit = exactLimitOfReduced(reduced, varName, approach, direction);
			if (reducedLimit !== null) {
				recorder.recordStep(
					'lhopital',
					"Limite trouvée après application de la règle de L'Hôpital",
					reduced,
					reducedLimit,
					'summarized'
				);
				return {
					applicable: true,
					value: reducedLimit,
					transformedExpr: reduced,
					iterations,
					resolvedForm: form
				};
			}
			if (isDivision(reduced) && newForm !== 'none') {
				const reducedForm = detectIndeterminateForm(reduced, varName, approach, direction);
				if (reducedForm === '0/0' || reducedForm === '∞/∞') {
					currentExpr = reduced;
					continue;
				}
			}
		}

		// Garde-fou : la valeur approchée doit être confirmée par f elle-même
		// près de la borne. Sinon refus honnête (x^{1/5}/x^{1/3} en 0 rendait
		// « ≈ 60 », pour +∞ : f′/g′ mal classée « non indéterminée »).
		if (
			approximateEvaluation !== null &&
			!confirmedNumerically(expr, varName, approach, direction, approximateEvaluation)
		) {
			approximateEvaluation = null;
		}
		if (approximateEvaluation !== null) {
			recorder.recordStep(
				'lhopital',
				"Valeur approchée après application de la règle de L'Hôpital",
				newExpr,
				approximateEvaluation,
				'summarized'
			);
			return {
				applicable: true,
				value: approximateEvaluation,
				transformedExpr: newExpr,
				iterations,
				resolvedForm: form,
				approximate: true
			};
		}

		if (newForm === '0/0' || newForm === '∞/∞') {
			// Still indeterminate, continue iterating
			currentExpr = newExpr;
			continue;
		}

		// Different indeterminate form or unknown - stop
		return {
			applicable: true,
			value: null,
			transformedExpr: newExpr,
			iterations,
			resolvedForm: form,
			error: `L'Hôpital led to form ${newForm}`
		};
	}

	// Max iterations reached
	return {
		applicable: true,
		value: null,
		iterations,
		resolvedForm: form,
		error: `Max L'Hôpital iterations (${maxIterations}) reached`
	};
}

/** Forme normale réduite d'un quotient, ou null si inchangée ou impossible. */
function reduceQuotient(expr: DivisionNode): MathNode | null {
	try {
		const reduced = denormalize(normalize(expr));
		return nodesEqual(reduced, expr) ? null : reduced;
	} catch {
		return null;
	}
}

/**
 * Limite EXACTE de la forme réduite de f'/g' : évaluation exacte directe si
 * elle n'est plus un quotient (3x en 0), sinon quotient déterminé évalué
 * exactement. Null si rien ne conclut exactement.
 */
function exactLimitOfReduced(
	reduced: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	if (isDivision(reduced)) {
		if (detectIndeterminateForm(reduced, varName, approach, direction) !== 'none') return null;
		return tryDirectEvaluationExact(reduced, varName, approach, direction);
	}
	const result = tryEvaluateLimitExact(reduced, varName, approach, direction);
	if (result === null || isIndeterminateResult(result)) return null;
	// 0⁺ / 0⁻ : la limite est 0 (le signe ne sert qu'aux quotients)
	if (isZeroResult(result)) return { type: 'number', value: '0' };
	const node = resultToNode(result);
	if (node === null) return null;
	// Constante rationnelle sous forme canonique : −2/3, pas (−2)/3
	return isInfinityResult(result) ? node : (exactConstantNode(node) ?? node);
}

/**
 * Check if L'Hôpital's rule is applicable to an expression.
 */
export function isLhopitalApplicable(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): boolean {
	if (!isDivision(expr)) {
		return false;
	}

	const form = detectIndeterminateForm(expr, varName, approach, direction);
	return form === '0/0' || form === '∞/∞';
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Try to evaluate a division directly at the limit point.
 * Uses exact evaluation first, with fallback to numeric heuristics.
 *
 * Le repli numérique est marqué `approximate` : il évalue en un point
 * proche, et 1/(1/(2√x)) en +∞ y vaut « 200000 », pas +∞.
 */
function tryDirectEvaluation(
	expr: DivisionNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): { value: MathNode; approximate: boolean } | null {
	// Try exact evaluation first
	const exactResult = tryDirectEvaluationExact(expr, varName, approach, direction);
	if (exactResult !== null) {
		return { value: exactResult, approximate: false };
	}

	// Fallback to numeric heuristics
	const numericResult = tryDirectEvaluationNumeric(expr, varName, approach, direction);
	return numericResult === null ? null : { value: numericResult, approximate: true };
}

/**
 * Try to evaluate a division using exact arithmetic.
 */
function tryDirectEvaluationExact(
	expr: DivisionNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const numResult = tryEvaluateLimitExact(expr.numerator, varName, approach, direction);
	const denResult = tryEvaluateLimitExact(expr.denominator, varName, approach, direction);

	// Need both results. Un opérande « indéterminé » n'est pas un fini non nul :
	// (1/x)/(2x/(x²+1)) en +∞ concluait 0 (« 0/fini »), au lieu de laisser le
	// moteur lever la forme.
	if (!numResult || !denResult) {
		return null;
	}
	if (isIndeterminateResult(numResult) || isIndeterminateResult(denResult)) {
		return null;
	}

	// Handle infinity/finite case → infinity
	if (isInfinityResult(numResult) && !isInfinityResult(denResult) && !isZeroResult(denResult)) {
		// Get denominator sign to determine final sign
		// Valeur négative = nœud `opposite` (jamais de littéral négatif)
		// Lu sur la forme normale : une fraction exacte (−1/2) n'est pas un
		// littéral que getNumericValue saurait lire
		const denValue = resultToNumber(denResult);
		const denNegative = denValue !== null && denValue < 0;

		const numSign = numResult.sign;
		let finalSign: 'positive' | 'negative';
		if (numSign === 'positive') {
			finalSign = denNegative ? 'negative' : 'positive';
		} else {
			finalSign = denNegative ? 'positive' : 'negative';
		}
		return { type: 'infinity', sign: finalSign };
	}

	// Handle finite/infinity case → 0
	if (!isInfinityResult(numResult) && !isZeroResult(numResult) && isInfinityResult(denResult)) {
		return { type: 'number', value: '0' };
	}

	// Handle zero/finite case → 0
	if (isZeroResult(numResult) && !isZeroResult(denResult)) {
		return { type: 'number', value: '0' };
	}

	// Handle finite/finite case
	if (!isInfinityResult(numResult) && !isInfinityResult(denResult)) {
		// Valeurs lues sur la forme normale (−2 comme 2/3) : sinon x → −1 de
		// 2x/1 retombait sur le repli numérique
		const numVal = resultToNumber(numResult);
		const denVal = resultToNumber(denResult);

		if (numVal !== null && denVal !== null && denVal !== 0) {
			// Quotient EXACT lu sur les formes dénormalisées (jamais sur les
			// chaînes déjà arrondies) : 3/2, pas 1.5
			const exact = exactQuotient(numResult, denResult);
			if (exact !== null) return exact;
			const result = numVal / denVal;
			if (Number.isFinite(result)) {
				return numericNode(cleanNumberString(result));
			}
		}
	}

	return null;
}

/** Quotient exact de deux limites finies à valeurs rationnelles, sinon null. */
function exactQuotient(
	numResult: ExtendedNormalizeResult,
	denResult: ExtendedNormalizeResult
): MathNode | null {
	const numNode = resultToNode(numResult);
	const denNode = resultToNode(denResult);
	if (numNode === null || denNode === null) return null;
	return exactConstantNode(divide(numNode, denNode, 'fraction'));
}

/**
 * Try to evaluate a division using numeric heuristics (fallback).
 */
function tryDirectEvaluationNumeric(
	expr: DivisionNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const numClass = classifyLimitValue(expr.numerator, varName, approach, direction);
	const denClass = classifyLimitValue(expr.denominator, varName, approach, direction);

	// Both have finite values — classes FINIES exigées : une valeur échantillonnée
	// près d'un infini (x^{-4/5} / x^{-2/3} en 0) donnait « ≈ 60 » pour +∞
	if (
		isFiniteClass(numClass.class) &&
		isFiniteClass(denClass.class) &&
		numClass.numericValue !== undefined &&
		denClass.numericValue !== undefined &&
		denClass.numericValue !== 0
	) {
		const result = numClass.numericValue / denClass.numericValue;
		if (Number.isFinite(result)) {
			return numericNode(cleanNumberString(result));
		}
	}

	// Numerator finite, denominator goes to infinity -> 0
	if (
		numClass.class === 'finite-nonzero' &&
		(denClass.class === 'positive-infinity' || denClass.class === 'negative-infinity')
	) {
		return { type: 'number', value: '0' };
	}

	// Handle zero numerator with finite non-zero denominator
	if (numClass.class === 'zero' && denClass.class === 'finite-nonzero') {
		return { type: 'number', value: '0' };
	}

	// Handle infinity numerator with finite non-zero denominator → infinity
	if (numClass.class === 'positive-infinity' && isFiniteClass(denClass.class)) {
		const sign =
			denClass.numericValue !== undefined && denClass.numericValue < 0 ? 'negative' : 'positive';
		return { type: 'infinity', sign };
	}
	if (numClass.class === 'negative-infinity' && isFiniteClass(denClass.class)) {
		const sign =
			denClass.numericValue !== undefined && denClass.numericValue < 0 ? 'positive' : 'negative';
		return { type: 'infinity', sign };
	}

	return null;
}

/**
 * Check if a limit value class represents a finite value.
 */
function isFiniteClass(cls: import('./indeterminate').LimitValueClass): boolean {
	return cls === 'zero' || cls === 'one' || cls === 'finite-nonzero';
}

/**
 * Clean a number string to avoid floating point artifacts.
 */
function cleanNumberString(value: number): string {
	// Check if it's close to a nice integer
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}

	// Check for common fractions
	const commonDenoms = [2, 3, 4, 5, 6, 8, 10];
	for (const d of commonDenoms) {
		const n = value * d;
		if (Math.abs(n - Math.round(n)) < 1e-10) {
			// Could return as fraction, but for simplicity return decimal
			return String(Math.round(n) / d);
		}
	}

	// Return with reasonable precision
	return value.toPrecision(10).replace(/\.?0+$/, '');
}

/**
 * Convert other indeterminate forms to 0/0 or ∞/∞ for L'Hôpital application.
 *
 * - 0 * ∞: Rewrite as f/g where g = 1/original_multiplier
 * - ∞ - ∞: Rewrite as single fraction
 * - 0^0, ∞^0, 1^∞: Take ln, apply L'Hôpital to exponent
 */
export function convertToLhopitalForm(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const form = detectIndeterminateForm(expr, varName, approach, direction);

	if (form === '0*∞' && expr.type === 'multiplication') {
		// Convert f * g (where f → 0, g → ∞) to f / (1/g)
		const leftClass = classifyLimitValue(expr.left, varName, approach, direction);

		if (leftClass.class === 'zero') {
			// f → 0, g → ∞: rewrite as f / (1/g)
			return {
				type: 'division',
				numerator: expr.left,
				denominator: {
					type: 'division',
					numerator: { type: 'number', value: '1' },
					denominator: expr.right,
					displayStyle: 'fraction'
				},
				displayStyle: 'fraction'
			};
		} else {
			// g → 0, f → ∞: rewrite as g / (1/f)
			return {
				type: 'division',
				numerator: expr.right,
				denominator: {
					type: 'division',
					numerator: { type: 'number', value: '1' },
					denominator: expr.left,
					displayStyle: 'fraction'
				},
				displayStyle: 'fraction'
			};
		}
	}

	// For other forms, return null (not yet implemented)
	return null;
}

/**
 * La valeur `value` est-elle confirmée par f près de la borne ? Échantillons
 * à h = 10⁻⁴, 10⁻⁶, 10⁻⁸ (ou ±10⁴, 10⁶, 10⁸ à l'infini), côté(s) demandé(s) :
 * valeur finie → les trois proches de value (écart relatif ≤ 10⁻³) ; ±∞ → |f|
 * croissante, du bon signe. Non calculable : non confirmée.
 */
function confirmedNumerically(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	value: MathNode
): boolean {
	let f: (scope: Record<string, number>) => unknown;
	let target: number;
	let point: number;
	try {
		f = compile(expr);
		target = isInfinity(value)
			? value.sign === 'positive'
				? Infinity
				: -Infinity
			: Number(compile(value)({}));
		point = isInfinity(approach)
			? approach.sign === 'positive'
				? Infinity
				: -Infinity
			: Number(compile(approach)({}));
	} catch {
		return false;
	}
	const steps = [1e-4, 1e-6, 1e-8];
	const sides: number[] = direction === 'left' ? [-1] : direction === 'right' ? [1] : [-1, 1];
	for (const side of sides) {
		const xs = Number.isFinite(point)
			? steps.map((h) => point + side * h)
			: steps.map((h) => Math.sign(point) / h);
		const ys = xs.map((x) => {
			const y = f({ [varName]: x });
			return typeof y === 'number' ? y : Number.NaN;
		});
		if (ys.some((y) => Number.isNaN(y))) return false;
		if (Number.isFinite(target)) {
			const tolerance = 1e-3 * Math.max(1, Math.abs(target));
			if (ys.some((y) => !(Math.abs(y - target) <= tolerance))) return false;
		} else {
			const last = ys[ys.length - 1];
			if (Math.sign(last) !== Math.sign(target)) return false;
			if (!(Math.abs(last) > Math.abs(ys[0]))) return false;
		}
		if (!Number.isFinite(point)) break;
	}
	return true;
}
