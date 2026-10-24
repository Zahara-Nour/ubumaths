/**
 * Exact Limit Evaluation
 *
 * Bridge to normalizeExtended for exact arithmetic in limit calculations.
 * Pre-analyzes expressions to detect approach factors (x-a) and substitute
 * them with signed zeros (0⁺ or 0⁻) based on the direction of approach.
 *
 * @module mathAST/limits/exact-evaluation
 */

import type { MathNode } from '../types';
import type { ExtendedNormalizeResult, NormalForm } from '../normal/types';
import type { LimitDirection } from './types';
import { normalizeExtended, isConstantPolynomial, rationalToNumber } from '../normal';
import { denormalizeExtended } from '../normal/denormalize';
import { substitute } from '../eval/substitute';
import { zeroPlus, zeroMinus, number, euler, power } from '../factory';
import { findNodes, mapNode } from '../transforms';
import {
	isSubtraction,
	isAddition,
	isVariable,
	isOpposite,
	isInfinity,
	isFunction,
	isNumber
} from '../guards';
import { getNumericValue, numericNode } from '../common/numeric';
import { exactConstantNode } from './generalized-degree';
import { exactValueToShow } from '../eval/exact-value';
import { hasDecimalLiteral } from '../tidy/decimal';

// =============================================================================
// Result Type Predicates
// =============================================================================

/**
 * Checks if an ExtendedNormalizeResult represents zero (including signed zero).
 */
export function isZeroResult(result: ExtendedNormalizeResult): boolean {
	if (result.type === 'signed-zero') return true;
	if (result.type === 'normal') {
		// Check if numerator is zero polynomial
		return (
			result.form.numerator.length === 0 ||
			(result.form.numerator.length === 1 &&
				result.form.numerator[0].coefficient.terms.length === 0)
		);
	}
	return false;
}

/**
 * Checks if an ExtendedNormalizeResult represents infinity (positive or negative).
 */
export function isInfinityResult(
	result: ExtendedNormalizeResult
): result is Extract<ExtendedNormalizeResult, { type: 'infinity' }> {
	return result.type === 'infinity';
}

/**
 * Checks if an ExtendedNormalizeResult is indeterminate.
 */
export function isIndeterminateResult(result: ExtendedNormalizeResult): boolean {
	return result.type === 'indeterminate';
}

/**
 * Gets the sign of an ExtendedNormalizeResult if it represents zero.
 * Returns 'positive', 'negative', or null if not zero or sign unknown.
 */
export function getZeroSign(result: ExtendedNormalizeResult): 'positive' | 'negative' | null {
	if (result.type === 'signed-zero') {
		return result.sign;
	}
	// Regular zero (from normal form) doesn't have a sign
	return null;
}

/**
 * Gets the sign of an ExtendedNormalizeResult if it represents infinity.
 * Returns 'positive', 'negative', or null if not infinity.
 */
export function getInfinitySign(result: ExtendedNormalizeResult): 'positive' | 'negative' | null {
	if (result.type === 'infinity') {
		return result.sign;
	}
	return null;
}

// =============================================================================
// Approach Factor Detection and Substitution
// =============================================================================

/**
 * Result of detecting an approach factor.
 */
interface ApproachFactorInfo {
	/** True if this is (x - a) where x is the variable */
	isVarMinusApproach: boolean;
	/** True if this is (a - x) where x is the variable */
	isApproachMinusVar: boolean;
}

/**
 * Check if a subtraction node represents (x - a) or (a - x).
 */
function analyzeSubtraction(
	node: MathNode,
	varName: string,
	approachValue: number | null
): ApproachFactorInfo {
	if (!isSubtraction(node)) {
		return { isVarMinusApproach: false, isApproachMinusVar: false };
	}

	const { left, right } = node;

	// Check for (x - a) pattern.
	// getNumericValue accepts both number('N') and opposite(number('N')) (canonical for negatives).
	const rightNum = getNumericValue(right);
	const isVarMinusApproach =
		isVariable(left) &&
		left.name === varName &&
		rightNum !== null &&
		approachValue !== null &&
		Math.abs(rightNum - approachValue) < 1e-12;

	// Check for (a - x) pattern.
	const leftNum = getNumericValue(left);
	const isApproachMinusVar =
		leftNum !== null &&
		approachValue !== null &&
		Math.abs(leftNum - approachValue) < 1e-12 &&
		isVariable(right) &&
		right.name === varName;

	return { isVarMinusApproach, isApproachMinusVar };
}

/**
 * Check if an addition node represents an approach factor.
 *
 * Handles several patterns:
 * 1. x + (-a) where approach is a  → equivalent to (x - a)
 * 2. (-a) + x where approach is a  → equivalent to (x - a)
 * 3. x + a where approach is -a    → x + a = x - (-a), so this is (x - approach)
 * 4. a + x where approach is -a    → same as above
 */
function analyzeAdditionAsSubtraction(
	node: MathNode,
	varName: string,
	approachValue: number | null
): ApproachFactorInfo {
	if (!isAddition(node)) {
		return { isVarMinusApproach: false, isApproachMinusVar: false };
	}

	const { left, right } = node;

	// Pattern 1: x + (-a) where -a is the negation of approach
	// Example: x + (-3) when approaching 3
	if (isVariable(left) && left.name === varName && isOpposite(right)) {
		const innerValue = getNumericValue(right.operand);
		if (
			innerValue !== null &&
			approachValue !== null &&
			Math.abs(innerValue - approachValue) < 1e-12
		) {
			return { isVarMinusApproach: true, isApproachMinusVar: false };
		}
	}

	// Pattern 2: (-a) + x where -a is the negation of approach
	if (isOpposite(left) && isVariable(right) && right.name === varName) {
		const innerValue = getNumericValue(left.operand);
		if (
			innerValue !== null &&
			approachValue !== null &&
			Math.abs(innerValue - approachValue) < 1e-12
		) {
			return { isVarMinusApproach: true, isApproachMinusVar: false };
		}
	}

	// Pattern 3: x + a where approach is -a (negative)
	// Example: x + 3 when approaching -3
	// x + 3 = x - (-3), so when x → -3, this is (x - approach) → 0
	if (isVariable(left) && left.name === varName) {
		const addedValue = getNumericValue(right);
		if (
			addedValue !== null &&
			approachValue !== null &&
			approachValue < 0 &&
			Math.abs(addedValue + approachValue) < 1e-12 // addedValue = -approachValue
		) {
			return { isVarMinusApproach: true, isApproachMinusVar: false };
		}
	}

	// Pattern 4: a + x where approach is -a (negative)
	// Example: 3 + x when approaching -3
	if (isVariable(right) && right.name === varName) {
		const addedValue = getNumericValue(left);
		if (
			addedValue !== null &&
			approachValue !== null &&
			approachValue < 0 &&
			Math.abs(addedValue + approachValue) < 1e-12 // addedValue = -approachValue
		) {
			return { isVarMinusApproach: true, isApproachMinusVar: false };
		}
	}

	return { isVarMinusApproach: false, isApproachMinusVar: false };
}

/**
 * Determine the signed zero to substitute based on factor type and direction.
 *
 * For (x - a):
 * - When x → a⁺ (from right), x > a, so (x-a) > 0, meaning (x-a) → 0⁺
 * - When x → a⁻ (from left), x < a, so (x-a) < 0, meaning (x-a) → 0⁻
 *
 * For (a - x):
 * - When x → a⁺ (from right), x > a, so (a-x) < 0, meaning (a-x) → 0⁻
 * - When x → a⁻ (from left), x < a, so (a-x) > 0, meaning (a-x) → 0⁺
 */
function getSignedZeroForFactor(
	factorInfo: ApproachFactorInfo,
	direction: LimitDirection
): MathNode | null {
	if (direction === 'both') {
		// For two-sided limits, we can't determine the sign
		return null;
	}

	if (factorInfo.isVarMinusApproach) {
		// (x - a) pattern
		return direction === 'right' ? zeroPlus() : zeroMinus();
	}

	if (factorInfo.isApproachMinusVar) {
		// (a - x) pattern - opposite signs
		return direction === 'right' ? zeroMinus() : zeroPlus();
	}

	return null;
}

/**
 * Substitute approach factors (x-a) with signed zeros based on direction.
 *
 * This function walks the AST and replaces patterns like (x-a) or (a-x)
 * with 0⁺ or 0⁻ depending on the direction of approach.
 *
 * @param expr - The expression to transform
 * @param varName - The variable name
 * @param approach - The approach point
 * @param direction - The direction of approach
 * @returns The transformed expression with approach factors replaced by signed zeros
 */
export function substituteApproachFactors(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode {
	// Only works for finite approach points
	if (isInfinity(approach)) {
		return expr;
	}

	// Get numeric value of approach point.
	// getNumericValue handles both number('N') and opposite(number('N')) (canonical for negatives).
	const approachValue = getNumericValue(approach);
	if (approachValue === null) {
		return expr;
	}

	// For 'both' direction, we can't substitute signed zeros
	if (direction === 'both') {
		return expr;
	}

	// Walk the AST and substitute approach factors
	return mapNode(expr, (node) => {
		// Check subtraction patterns
		const subInfo = analyzeSubtraction(node, varName, approachValue);
		const signedZero = getSignedZeroForFactor(subInfo, direction);
		if (signedZero) {
			return signedZero;
		}

		// Check addition patterns (x + (-a))
		const addInfo = analyzeAdditionAsSubtraction(node, varName, approachValue);
		const signedZeroFromAdd = getSignedZeroForFactor(addInfo, direction);
		if (signedZeroFromAdd) {
			return signedZeroFromAdd;
		}

		return node;
	});
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Get the MathNode to substitute for the variable based on approach and direction.
 *
 * For one-sided limits approaching 0, we use signed zeros to preserve sign information.
 */
function getSubstitutionValue(approach: MathNode, direction: LimitDirection): MathNode {
	// For one-sided limits approaching 0, use signed zero
	if (direction !== 'both' && getNumericValue(approach) === 0) {
		return direction === 'right' ? zeroPlus() : zeroMinus();
	}
	return approach;
}

/**
 * Evaluate an expression for a limit calculation with exact arithmetic.
 *
 * This function:
 * 1. Detects factors (x-a) and replaces them with 0± based on direction
 * 2. Substitutes remaining occurrences of x with the approach value (using signed zero for one-sided limits at 0)
 * 3. Normalizes the result using normalizeExtended
 *
 * @param expr - The expression to evaluate
 * @param varName - The variable approaching the limit
 * @param approach - The point being approached
 * @param direction - Direction of approach ('left', 'right', or 'both')
 * @returns The ExtendedNormalizeResult
 * @throws Error if normalization fails
 */
export function evaluateLimitExact(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): ExtendedNormalizeResult {
	// Step 1: Pre-process approach factors
	const preprocessed = substituteApproachFactors(expr, varName, approach, direction);

	// Step 2: Substitute remaining variable occurrences
	// Use signed zero for one-sided limits at 0
	const substitutionValue = getSubstitutionValue(approach, direction);
	const substituted = substitute(preprocessed, { [varName]: substitutionValue });

	// Step 3: Normalize with extended arithmetic.
	// skipFastPath is needed for two-sided limits (direction='both'): in that
	// case substituteApproachFactors does NOT inject signed zeros, so after
	// plain substitution an expression like (x-5)/(x-5) becomes (5-5)/(5-5)
	// — all regular numbers, no extended nodes. Without skipFastPath, the
	// fast-path would delegate to normalize which throws "division by zero".
	// With skipFastPath, recursive decomposition detects 0/0 via divExtended.
	// For one-sided limits, signed zeros are injected so the fast-path is
	// naturally skipped (containsExtendedNodes returns true).
	return normalizeExtended(substituted, undefined, { skipFastPath: true });
}

/**
 * Try to evaluate a limit expression exactly, returning null on failure.
 *
 * This is a safe version that catches errors and returns null instead of throwing.
 *
 * @param expr - The expression to evaluate
 * @param varName - The variable approaching the limit
 * @param approach - The point being approached
 * @param direction - Direction of approach
 * @returns The ExtendedNormalizeResult, or null if evaluation fails
 */
export function tryEvaluateLimitExact(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection
): ExtendedNormalizeResult | null {
	try {
		return evaluateLimitExact(expr, varName, approach, direction);
	} catch {
		return null;
	}
}

// =============================================================================
// Result Conversion
// =============================================================================

/**
 * Convert an ExtendedNormalizeResult to a MathNode.
 *
 * Returns null for indeterminate forms since they cannot be represented
 * as a single value.
 *
 * @param result - The result to convert
 * @returns A MathNode, or null for indeterminate forms
 */
export function resultToNode(result: ExtendedNormalizeResult): MathNode | null {
	if (result.type === 'indeterminate') {
		return null;
	}

	try {
		return denormalizeExtended(result);
	} catch {
		return null;
	}
}

/**
 * Écriture d'une valeur de limite RENDUE (à l'élève, à la correction) : mise au
 * propre par `tidy`, qui place le signe devant la fraction et le radical au
 * numérateur — `-\\dfrac{\\sqrt{2}}{2}` et non `\\dfrac{-\\sqrt{2}}{2}` (forme
 * de `denormalize`), `\\dfrac{\\sqrt{3}}{2}` et non `\\dfrac{1}{2}\\sqrt{3}`.
 *
 * Un décimal y reste décimal : `tidy` garde son registre (S1). Ce décimal est
 * posé par `writeLikeInput` d'`evaluate.ts` (énoncé décimal ET limite
 * rationnelle d'écriture décimale finie : `\\frac{0.5x+1}{x}` → `0.5`), ou par
 * un calcul en flottants (défaut V33 : `\\sqrt{\\frac{x^2+1}{4x^2}}` en −∞ rend
 * `0.5`).
 *
 * Réservée aux valeurs rendues : les calculs intermédiaires gardent la forme
 * de `resultToNode`. Passe par la valeur exacte à afficher commune (lot 5c) :
 * `1/2 + √5/2` s'écrit `(1 + √5)/2`, comme au tableau de variations.
 */
export function writeLimitValue(value: MathNode): MathNode {
	if (isInfinity(value)) return value;
	return exactValueToShow(withEulerConstant(value));
}

/**
 * `exp(1)` → e, `exp(k)` → e^k : la constante d'Euler, comme partout dans
 * mathAST (`e` = Euler, toujours), et l'écriture de la classe. Les limites
 * remarquables (`(1 + 1/x)^x` → `exp(1)`) et la substitution dans `exp(x)`
 * rendaient la fonction appliquée à une constante.
 */
function withEulerConstant(value: MathNode): MathNode {
	return mapNode(value, (node) => {
		if (!isFunction(node) || node.name !== 'exp' || node.args.length !== 1) return node;
		const [argument] = node.args;
		return isNumber(argument) && argument.value === '1' ? euler() : power(euler(), argument);
	});
}

/**
 * Nombre de chiffres significatifs à partir duquel un décimal absent de
 * l'énoncé est tenu pour l'arrondi d'un flottant (`toPrecision(10)` en écrit
 * dix ; `0.1 + 0.2` en écrit dix-sept).
 */
const FLOAT_SIGNIFICANT_DIGITS = 10;

/** Chiffres significatifs d'une écriture décimale (`0.0250` → 3, `1.5e-7` → 2). */
function significantDigits(text: string): number {
	const mantissa = text.replace(/^[-+]/, '').split(/e/i)[0];
	return mantissa.replace('.', '').replace(/^0+/, '').length;
}

/**
 * La valeur contient-elle un nombre issu d'un calcul en flottants (repli
 * numérique de la substitution, de L'Hôpital, du terme dominant, des
 * signes…) plutôt que d'un calcul exact ? Une telle valeur n'est jamais une
 * limite `exact` : `evaluateLimit` la rend `approximate`.
 *
 * Critère (lu sur l'écriture, faute de trace du calcul) : un nombre non
 * entier (point décimal ou notation `e`) qui n'est pas écrit dans l'énoncé,
 * et — si l'énoncé contient lui-même des décimaux, d'où viennent des
 * décimaux exacts (`0.5x` en 3 → `1.5`) — qui a au moins dix chiffres
 * significatifs. Les valeurs exactes du moteur sont des entiers, des
 * fractions et des constantes (√2, ln 2, e⁷) : jamais touchées.
 *
 * @param statement - l'expression et le point de l'énoncé
 */
export function containsFloatArtifact(value: MathNode, statement: readonly MathNode[]): boolean {
	const writtenNumbers = new Set(
		statement.flatMap((node) =>
			findNodes(node, isNumber).flatMap((n) => (isNumber(n) ? [n.value] : []))
		)
	);
	const decimalStatement = statement.some(hasDecimalLiteral);
	return findNodes(value, isNumber).some((node) => {
		if (!isNumber(node) || /^\d+$/.test(node.value)) return false;
		if (writtenNumbers.has(node.value)) return false;
		return !decimalStatement || significantDigits(node.value) >= FLOAT_SIGNIFICANT_DIGITS;
	});
}

/**
 * Try to extract a numeric value from a constant NormalForm.
 *
 * Returns the numeric value if the form represents a constant (no variables),
 * or null if it contains variables or radicals.
 */
function tryExtractConstantValue(form: NormalForm): number | null {
	// Check if both numerator and denominator are constant polynomials
	if (!isConstantPolynomial(form.numerator) || !isConstantPolynomial(form.denominator)) {
		return null;
	}

	// Get the constant values
	if (form.numerator.length === 0) {
		return 0; // Zero numerator
	}

	if (form.numerator.length !== 1 || form.denominator.length !== 1) {
		// Multiple terms - fallback to node-based extraction
		return null;
	}

	const numTerm = form.numerator[0];
	const denTerm = form.denominator[0];

	// Check if they have empty monomials (pure constants)
	if (numTerm.monomial.length > 0 || denTerm.monomial.length > 0) {
		return null;
	}

	// Check if coefficients are pure rationals (no radicals)
	if (numTerm.coefficient.terms.length !== 1 || denTerm.coefficient.terms.length !== 1) {
		return null;
	}

	const numAlgTerm = numTerm.coefficient.terms[0];
	const denAlgTerm = denTerm.coefficient.terms[0];

	if (numAlgTerm.radicals.length > 0 || denAlgTerm.radicals.length > 0) {
		return null;
	}

	// Extract the rational values and compute the result
	const numValue = rationalToNumber(numAlgTerm.rational);
	const denValue = rationalToNumber(denAlgTerm.rational);

	if (denValue === 0) {
		return null;
	}

	const result = numValue / denValue;
	return Number.isFinite(result) ? result : null;
}

/**
 * Convert an ExtendedNormalizeResult to a number, if possible.
 *
 * Returns the numeric value for finite results, Infinity/-Infinity for
 * infinite results, and null for indeterminate or symbolic results.
 *
 * @param result - The result to convert
 * @returns The numeric value, or null if not representable as a number
 */
export function resultToNumber(result: ExtendedNormalizeResult): number | null {
	switch (result.type) {
		case 'indeterminate':
			return null;

		case 'infinity':
			return result.sign === 'positive' ? Infinity : -Infinity;

		case 'signed-zero':
			return 0;

		case 'normal': {
			// First, try to extract directly from the NormalForm
			const directValue = tryExtractConstantValue(result.form);
			if (directValue !== null) {
				return directValue;
			}

			// Fallback: try via denormalized node.
			// getNumericValue handles both number('N') and opposite(number('N')).
			const node = resultToNode(result);
			return node ? getNumericValue(node) : null;
		}
	}
}

/**
 * Convert an ExtendedNormalizeResult to a finite MathNode.
 *
 * Converts signed zeros to regular number(0) and returns null for
 * infinity or indeterminate results. For normal forms, tries to
 * simplify to a number if possible.
 *
 * @param result - The result to convert
 * @returns A finite MathNode, or null if not finite
 */
export function resultToFiniteNode(result: ExtendedNormalizeResult): MathNode | null {
	switch (result.type) {
		case 'indeterminate':
		case 'infinity':
			return null;

		case 'signed-zero':
			return number('0');

		case 'normal': {
			// First, try to get a numeric value
			const numValue = resultToNumber(result);
			if (numValue !== null && Number.isFinite(numValue)) {
				// If it's an integer or very close to one, return as integer
				const intValue = Math.round(numValue);
				if (Math.abs(numValue - intValue) < 1e-10) {
					return numericNode(intValue);
				}
				// Rationnel exact (2/3, pas 0.6666666667) lu sur la forme
				// dénormalisée
				const denormalized = resultToNode(result);
				const exact = denormalized === null ? null : exactConstantNode(denormalized);
				if (exact !== null) return exact;
				// Forme exacte non lue en rationnel : la forme dénormalisée, exacte,
				// plutôt qu'un arrondi à 10 chiffres présenté comme exact
				return denormalized;
			}
			// Fallback to denormalized form
			return resultToNode(result);
		}
	}
}
