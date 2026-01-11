/**
 * Range (image) computation for mathematical expressions.
 *
 * Computes the output range (image) for an expression given an input domain.
 * This is the dual of domain computation: while `computeDomain` finds valid inputs,
 * `computeRange` finds possible outputs.
 *
 * Features:
 * - Composition propagation: f(g(x)) correctly chains ranges
 * - Monotonicity-based restriction: uses function properties for accuracy
 * - Endpoint type preservation: maintains open/closed status
 * - Pattern recognition: handles common forms like a*f(x)+b
 * - Quadratic detection: uses vertex formula for ax² + bx + c
 * - Rational powers: x^(p/q) with proper domain handling
 * - Piecewise functions: algebraic abs, min, max handling
 * - Critical point analysis: derivative-based extrema finding
 * - Periodic optimization: detects full periods for sin/cos/tan
 * - Pedagogical steps: optional step-by-step explanation
 */

import type { MathNode } from '../types';
import type { Domain, RangeResult, RangeStep } from './types';
import { universalDomain, intervalDomain, fromNumber, closedInterval } from './factory';
import { containsValue } from './algebra';
import {
	getBuiltinRange,
	applyFunctionToRange,
	getBoundsFromDomain,
	domainFromBounds
} from './builtins';
import { computeDomain } from './compute';
import { formatInterval } from './format';
import {
	extractQuadratic,
	extractRationalPower,
	computeQuadraticRange,
	computeAbsRange,
	computeMinRange,
	computeMaxRange,
	computeRationalPowerRange,
	computeRangeWithCriticalPoints,
	spansFullPeriod,
	getFunctionPeriod
} from './range-helpers';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for range computation
 */
export interface ComputeRangeOptions {
	/** Restrict input to this domain (default: natural domain Df) */
	domain?: Domain;
	/** Show computation steps for pedagogical display */
	showSteps?: boolean;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Compute the output range (image) for an expression.
 *
 * @param expr - The mathematical expression
 * @param variable - The variable (default: 'x')
 * @param options - Configuration options
 * @returns RangeResult with computed range
 *
 * @example
 * // Simple builtin functions
 * computeRange(parseLatex('\\sqrt{x}'), 'x');  // → [0, +∞[
 * computeRange(parseLatex('\\sin{x}'), 'x');   // → [-1, 1]
 *
 * @example
 * // With restricted input domain
 * computeRange(parseLatex('x^2'), 'x', { domain: positiveReals() });  // → ]0, +∞[
 *
 * @example
 * // Compositions with accurate range propagation
 * computeRange(parseLatex('\\sqrt{x}'), 'x', { domain: closedInterval(4, 9) });  // → [2, 3]
 * computeRange(parseLatex('\\sin{x}'), 'x', { domain: closedInterval(0, π/2) }); // → [0, 1]
 */
export function computeRange(
	expr: MathNode,
	variable: string = 'x',
	options: ComputeRangeOptions = {}
): RangeResult {
	const steps: RangeStep[] = [];

	// Step 1: Determine input domain
	const inputDomain = options.domain ?? computeDomain(expr, variable).domain;

	// If input domain is empty, range is empty
	if (inputDomain.kind === 'empty') {
		if (options.showSteps) {
			steps.push({
				expression: nodeToString(expr),
				rangeDescription: '∅',
				explanation: "Le domaine de définition est vide, donc l'image est vide."
			});
		}
		return {
			range: { kind: 'empty' },
			variable,
			inputDomain,
			...(options.showSteps ? { steps } : {})
		};
	}

	// Step 2: Compute range based on expression type
	const range = computeRangeNode(expr, variable, inputDomain, steps, options);

	return {
		range,
		variable,
		inputDomain,
		...(options.showSteps ? { steps } : {})
	};
}

// =============================================================================
// Range Computation Logic
// =============================================================================

/**
 * Compute range for a single node.
 *
 * Strategy:
 * 1. Try quadratic pattern matching first (for ax² + bx + c)
 * 2. Fall back to type-specific computation
 * 3. For complex expressions with bounded domain, try critical point analysis
 */
function computeRangeNode(
	node: MathNode,
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	// Try quadratic pattern matching first (handles ax² + bx + c more precisely)
	const quadratic = extractQuadratic(node, variable);
	if (quadratic && quadratic.a !== 0) {
		const result = computeQuadraticRange(quadratic, inputDomain);
		if (options.showSteps) {
			const { a, b, c } = quadratic;
			const vertexX = -b / (2 * a);
			const vertexY = c - (b * b) / (4 * a);
			steps.push({
				expression: `${a}${variable}² + ${b}${variable} + ${c}`,
				rangeDescription: formatInterval(result),
				explanation: `Fonction quadratique avec sommet en (${vertexX.toFixed(2)}, ${vertexY.toFixed(2)}).`
			});
		}
		return result;
	}

	// Type-specific computation
	switch (node.type) {
		case 'number':
			return computeConstantRange(node, steps, options);

		case 'variable':
			return computeVariableRange(node, variable, inputDomain, steps, options);

		case 'function':
			return computeFunctionRange(node, variable, inputDomain, steps, options);

		case 'addition':
			return computeAdditionRange(node, variable, inputDomain, steps, options);

		case 'subtraction':
			return computeSubtractionRange(node, variable, inputDomain, steps, options);

		case 'multiplication':
			return computeMultiplicationRange(node, variable, inputDomain, steps, options);

		case 'division':
			return computeDivisionRange(node, variable, inputDomain, steps, options);

		case 'opposite':
			return computeOppositeRange(node, variable, inputDomain, steps, options);

		case 'superscript':
			return computePowerRange(node, variable, inputDomain, steps, options);

		case 'greek':
			// π, e are constants
			return computeGreekConstantRange(node, steps, options);

		case 'delimiter':
			// Parentheses: compute range of content
			return computeRangeNode(node.content, variable, inputDomain, steps, options);

		default: {
			// Unknown node type: try critical point analysis if domain is bounded
			const bounds = getBoundsFromDomain(inputDomain);
			if (bounds && bounds.lower !== null && bounds.upper !== null) {
				const criticalResult = computeRangeWithCriticalPoints(node, variable, inputDomain);
				if (criticalResult && criticalResult.kind !== 'universal') {
					if (options.showSteps) {
						steps.push({
							expression: '...',
							rangeDescription: formatInterval(criticalResult),
							explanation: `Analyse des points critiques.`
						});
					}
					return criticalResult;
				}
			}
			// Safe fallback
			return universalDomain();
		}
	}
}

// =============================================================================
// Constant and Variable Range
// =============================================================================

/**
 * Compute range for a numeric constant: single point.
 */
function computeConstantRange(
	node: MathNode & { type: 'number' },
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const value = parseFloat(node.value);
	const range = singlePoint(value);

	if (options.showSteps) {
		steps.push({
			expression: node.value,
			rangeDescription: `{${node.value}}`,
			explanation: `La constante ${node.value} a pour image le singleton {${node.value}}.`
		});
	}

	return range;
}

/**
 * Compute range for a Greek letter constant (π, e).
 */
function computeGreekConstantRange(
	node: MathNode & { type: 'greek' },
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	let value: number;
	let name: string;
	switch (node.letter) {
		case 'pi':
			value = Math.PI;
			name = 'π';
			break;
		default:
			// Unknown Greek letter: treat as variable → universal
			return universalDomain();
	}

	const range = singlePoint(value);

	if (options.showSteps) {
		steps.push({
			expression: name,
			rangeDescription: `{${name}}`,
			explanation: `La constante ${name} a pour image le singleton {${name}}.`
		});
	}

	return range;
}

/**
 * Compute range for a variable: equals input domain.
 */
function computeVariableRange(
	node: MathNode & { type: 'variable' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	if (node.name === variable) {
		if (options.showSteps) {
			steps.push({
				expression: variable,
				rangeDescription: formatInterval(inputDomain),
				explanation: `La variable ${variable} prend ses valeurs dans son domaine de définition.`
			});
		}
		return inputDomain;
	}

	// Other variable: treated as unknown constant (universal range)
	if (options.showSteps) {
		steps.push({
			expression: node.name,
			rangeDescription: 'ℝ',
			explanation: `La variable ${node.name} est considérée comme un paramètre libre.`
		});
	}
	return universalDomain();
}

// =============================================================================
// Function Range with Composition Propagation
// =============================================================================

/**
 * Compute range for a function call with composition propagation.
 *
 * For f(g(x)):
 * 1. Compute range of g(x) on input domain → R_g
 * 2. Apply f to R_g using monotonicity analysis
 *
 * Special handling for:
 * - abs: algebraic approach (no sampling)
 * - min/max: proper interval min/max computation
 * - Periodic functions: optimization when input spans full period
 */
function computeFunctionRange(
	node: MathNode & { type: 'function' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const funcName = node.name.toLowerCase();

	// No arguments: return builtin range
	if (node.args.length === 0) {
		const range = getBuiltinRange(funcName) ?? universalDomain();
		if (options.showSteps) {
			steps.push({
				expression: `${node.name}()`,
				rangeDescription: formatInterval(range),
				explanation: `La fonction ${node.name} sans argument retourne sa valeur par défaut.`
			});
		}
		return range;
	}

	// Special handling for abs (algebraic, not sampling)
	if (funcName === 'abs') {
		const argRange = computeRangeNode(node.args[0], variable, inputDomain, steps, options);
		if (argRange.kind === 'empty') return { kind: 'empty' };

		const range = computeAbsRange(argRange);

		if (options.showSteps) {
			steps.push({
				expression: `|...|`,
				rangeDescription: formatInterval(range),
				explanation: `Valeur absolue de ${formatInterval(argRange)} = ${formatInterval(range)}.`
			});
		}
		return range;
	}

	// Special handling for min (2 arguments)
	if (funcName === 'min' && node.args.length >= 2) {
		const aRange = computeRangeNode(node.args[0], variable, inputDomain, steps, options);
		const bRange = computeRangeNode(node.args[1], variable, inputDomain, steps, options);

		if (aRange.kind === 'empty' || bRange.kind === 'empty') return { kind: 'empty' };

		const range = computeMinRange(aRange, bRange);

		if (options.showSteps) {
			steps.push({
				expression: `min(...)`,
				rangeDescription: formatInterval(range),
				explanation: `min(${formatInterval(aRange)}, ${formatInterval(bRange)}) = ${formatInterval(range)}.`
			});
		}
		return range;
	}

	// Special handling for max (2 arguments)
	if (funcName === 'max' && node.args.length >= 2) {
		const aRange = computeRangeNode(node.args[0], variable, inputDomain, steps, options);
		const bRange = computeRangeNode(node.args[1], variable, inputDomain, steps, options);

		if (aRange.kind === 'empty' || bRange.kind === 'empty') return { kind: 'empty' };

		const range = computeMaxRange(aRange, bRange);

		if (options.showSteps) {
			steps.push({
				expression: `max(...)`,
				rangeDescription: formatInterval(range),
				explanation: `max(${formatInterval(aRange)}, ${formatInterval(bRange)}) = ${formatInterval(range)}.`
			});
		}
		return range;
	}

	// Step 1: Compute range of the argument
	const argRange = computeRangeNode(node.args[0], variable, inputDomain, steps, options);

	// If argument range is empty, function range is empty
	if (argRange.kind === 'empty') {
		return { kind: 'empty' };
	}

	// Periodic function optimization: if input spans full period, return full range
	const period = getFunctionPeriod(funcName);
	if (period !== null) {
		const argBounds = getBoundsFromDomain(argRange);
		if (argBounds && spansFullPeriod(argBounds, period)) {
			const fullRange = getBuiltinRange(funcName);
			if (fullRange) {
				if (options.showSteps) {
					steps.push({
						expression: `${node.name}(...)`,
						rangeDescription: formatInterval(fullRange),
						explanation: `L'argument couvre une période complète, donc ${node.name} atteint toutes ses valeurs.`
					});
				}
				return fullRange;
			}
		}
	}

	// Step 2: Apply function to argument range using monotonicity
	const range = applyFunctionToRange(funcName, argRange);

	if (options.showSteps) {
		const argRangeStr = formatInterval(argRange);
		const resultRangeStr = formatInterval(range);
		steps.push({
			expression: `${node.name}(...)`,
			rangeDescription: resultRangeStr,
			explanation: `${node.name} appliquée à ${argRangeStr} donne ${resultRangeStr}.`
		});
	}

	return range;
}

// =============================================================================
// Arithmetic Operations Range with Endpoint Preservation
// =============================================================================

/**
 * Compute range for addition: f(x) + g(x)
 * Range is Minkowski sum of individual ranges with endpoint preservation.
 */
function computeAdditionRange(
	node: MathNode & { type: 'addition' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
	const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);

	const result = minkowskiSum(leftRange, rightRange);

	if (options.showSteps) {
		steps.push({
			expression: `(...) + (...)`,
			rangeDescription: formatInterval(result),
			explanation: `Somme de Minkowski: ${formatInterval(leftRange)} + ${formatInterval(rightRange)} = ${formatInterval(result)}.`
		});
	}

	return result;
}

/**
 * Compute range for subtraction: f(x) - g(x)
 * Range is Minkowski difference with endpoint preservation.
 */
function computeSubtractionRange(
	node: MathNode & { type: 'subtraction' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
	const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);

	const result = minkowskiDifference(leftRange, rightRange);

	if (options.showSteps) {
		steps.push({
			expression: `(...) - (...)`,
			rangeDescription: formatInterval(result),
			explanation: `Différence de Minkowski: ${formatInterval(leftRange)} - ${formatInterval(rightRange)} = ${formatInterval(result)}.`
		});
	}

	return result;
}

/**
 * Compute range for multiplication: f(x) * g(x)
 * Handles pattern recognition for a*f(x) form.
 */
function computeMultiplicationRange(
	node: MathNode & { type: 'multiplication' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	// Pattern recognition: constant * expression
	const leftConst = extractConstant(node.left);
	const rightConst = extractConstant(node.right);

	if (leftConst !== null) {
		// a * f(x) → scale the range of f(x)
		const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);
		return scaleRange(rightRange, leftConst, options.showSteps ? steps : undefined, node);
	}

	if (rightConst !== null) {
		// f(x) * a → scale the range of f(x)
		const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
		return scaleRange(leftRange, rightConst, options.showSteps ? steps : undefined, node);
	}

	// General case: interval multiplication
	const leftRange = computeRangeNode(node.left, variable, inputDomain, steps, options);
	const rightRange = computeRangeNode(node.right, variable, inputDomain, steps, options);

	const result = intervalMultiply(leftRange, rightRange);

	if (options.showSteps) {
		steps.push({
			expression: `(...) × (...)`,
			rangeDescription: formatInterval(result),
			explanation: `Produit d'intervalles: ${formatInterval(leftRange)} × ${formatInterval(rightRange)} = ${formatInterval(result)}.`
		});
	}

	return result;
}

/**
 * Compute range for division: f(x) / g(x)
 */
function computeDivisionRange(
	node: MathNode & { type: 'division' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const numRange = computeRangeNode(node.numerator, variable, inputDomain, steps, options);
	const denRange = computeRangeNode(node.denominator, variable, inputDomain, steps, options);

	// Division by a range that includes 0 can give any value
	if (rangeContainsZero(denRange)) {
		if (options.showSteps) {
			steps.push({
				expression: `(...) / (...)`,
				rangeDescription: 'ℝ',
				explanation: `Le dénominateur peut s'annuler, donc l'image est ℝ.`
			});
		}
		return universalDomain();
	}

	const result = intervalDivide(numRange, denRange);

	if (options.showSteps) {
		steps.push({
			expression: `(...) / (...)`,
			rangeDescription: formatInterval(result),
			explanation: `Division d'intervalles: ${formatInterval(numRange)} / ${formatInterval(denRange)} = ${formatInterval(result)}.`
		});
	}

	return result;
}

/**
 * Compute range for opposite: -f(x)
 */
function computeOppositeRange(
	node: MathNode & { type: 'opposite' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const operandRange = computeRangeNode(node.operand, variable, inputDomain, steps, options);
	const result = negateRange(operandRange);

	if (options.showSteps) {
		steps.push({
			expression: `-(...)`,
			rangeDescription: formatInterval(result),
			explanation: `Opposé: -${formatInterval(operandRange)} = ${formatInterval(result)}.`
		});
	}

	return result;
}

/**
 * Compute range for power: base^exponent
 * Handles integer, fractional, negative powers, and rational powers (p/q).
 */
function computePowerRange(
	node: MathNode & { type: 'superscript' },
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const baseRange = computeRangeNode(node.base, variable, inputDomain, steps, options);

	// Try to extract rational power (p/q) from division node or decimal
	const rationalPower = extractRationalPower(node.superscript);

	if (rationalPower !== null) {
		// Use the more accurate rational power computation
		const result = computeRationalPowerRange(baseRange, rationalPower);

		if (options.showSteps) {
			const { numerator: p, denominator: q } = rationalPower;
			const expStr = q === 1 ? `${p}` : `${p}/${q}`;
			steps.push({
				expression: `(...)^(${expStr})`,
				rangeDescription: formatInterval(result),
				explanation: `Puissance ${expStr}: ${formatInterval(baseRange)}^(${expStr}) = ${formatInterval(result)}.`
			});
		}
		return result;
	}

	// Check if exponent is a constant (fallback for non-rational powers)
	const expValue = extractConstant(node.superscript);

	if (expValue !== null) {
		const result = computePowerRangeWithExponent(baseRange, expValue, steps, options);
		return result;
	}

	// Variable exponent: check for special cases
	// For now, return universal as safe fallback
	if (options.showSteps) {
		steps.push({
			expression: `(...)^(...)`,
			rangeDescription: 'ℝ',
			explanation: `L'exposant est variable, l'image est ℝ par défaut.`
		});
	}
	return universalDomain();
}

/**
 * Compute power range with known exponent.
 */
function computePowerRangeWithExponent(
	baseRange: Domain,
	exp: number,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	// x^0 = 1 (constant)
	if (exp === 0) {
		const result = singlePoint(1);
		if (options.showSteps) {
			steps.push({
				expression: `(...)^0`,
				rangeDescription: '{1}',
				explanation: `Toute expression non nulle élevée à la puissance 0 vaut 1.`
			});
		}
		return result;
	}

	// x^1 = x
	if (exp === 1) {
		return baseRange;
	}

	// Integer exponents
	if (Number.isInteger(exp)) {
		if (exp > 0) {
			// Positive integer power
			if (exp % 2 === 0) {
				const result = evenPowerRange(baseRange, exp);
				if (options.showSteps) {
					steps.push({
						expression: `(...)^${exp}`,
						rangeDescription: formatInterval(result),
						explanation: `Puissance paire: ${formatInterval(baseRange)}^${exp} = ${formatInterval(result)}.`
					});
				}
				return result;
			} else {
				const result = oddPowerRange(baseRange, exp);
				if (options.showSteps) {
					steps.push({
						expression: `(...)^${exp}`,
						rangeDescription: formatInterval(result),
						explanation: `Puissance impaire: ${formatInterval(baseRange)}^${exp} = ${formatInterval(result)}.`
					});
				}
				return result;
			}
		} else {
			// Negative integer power: x^(-n) = 1/x^n
			const result = negativePowerRange(baseRange, exp);
			if (options.showSteps) {
				steps.push({
					expression: `(...)^${exp}`,
					rangeDescription: formatInterval(result),
					explanation: `Puissance négative: ${formatInterval(baseRange)}^${exp} = ${formatInterval(result)}.`
				});
			}
			return result;
		}
	}

	// Fractional exponents
	if (exp === 0.5) {
		// x^(1/2) = sqrt(x)
		const result = applyFunctionToRange('sqrt', baseRange);
		if (options.showSteps) {
			steps.push({
				expression: `(...)^(1/2)`,
				rangeDescription: formatInterval(result),
				explanation: `Racine carrée: √${formatInterval(baseRange)} = ${formatInterval(result)}.`
			});
		}
		return result;
	}

	if (exp === 1 / 3) {
		// x^(1/3) = cube root, defined for all reals
		const result = computeCubeRootRange(baseRange);
		if (options.showSteps) {
			steps.push({
				expression: `(...)^(1/3)`,
				rangeDescription: formatInterval(result),
				explanation: `Racine cubique: ∛${formatInterval(baseRange)} = ${formatInterval(result)}.`
			});
		}
		return result;
	}

	// General fractional power
	const result = fractionalPowerRange(baseRange, exp);
	if (options.showSteps) {
		steps.push({
			expression: `(...)^${exp}`,
			rangeDescription: formatInterval(result),
			explanation: `Puissance fractionnaire: ${formatInterval(baseRange)}^${exp} = ${formatInterval(result)}.`
		});
	}
	return result;
}

// =============================================================================
// Interval Arithmetic Helpers with Endpoint Preservation
// =============================================================================

/**
 * Create a single-point domain.
 */
function singlePoint(value: number): Domain {
	return intervalDomain([closedInterval(fromNumber(value), fromNumber(value))]);
}

/**
 * Check if a range contains zero.
 */
function rangeContainsZero(range: Domain): boolean {
	if (range.kind === 'empty') return false;
	if (range.kind === 'universal') return true;
	return containsValue(range, 0);
}

/**
 * Extract a constant value from a node if it's a constant.
 */
function extractConstant(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}
	if (node.type === 'greek') {
		if (node.letter === 'pi') return Math.PI;
	}
	// Handle constant 'e' (Euler's number) - check if it's a symbol or constant type
	if (node.type === 'constant' && 'name' in node && node.name === 'e') {
		return Math.E;
	}
	if (node.type === 'opposite' && node.operand.type === 'number') {
		return -parseFloat(node.operand.value);
	}
	return null;
}

/**
 * Minkowski sum with endpoint preservation: [a, b] + [c, d] = [a+c, b+d]
 */
function minkowskiSum(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBoundsFromDomain(a);
	const boundsB = getBoundsFromDomain(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	const lower =
		boundsA.lower !== null && boundsB.lower !== null ? boundsA.lower + boundsB.lower : null;

	const upper =
		boundsA.upper !== null && boundsB.upper !== null ? boundsA.upper + boundsB.upper : null;

	// Endpoint types: closed + closed = closed, otherwise open
	const lowerInclusive = boundsA.lowerInclusive && boundsB.lowerInclusive;
	const upperInclusive = boundsA.upperInclusive && boundsB.upperInclusive;

	return domainFromBounds({ lower, lowerInclusive, upper, upperInclusive });
}

/**
 * Minkowski difference with endpoint preservation: [a, b] - [c, d] = [a-d, b-c]
 */
function minkowskiDifference(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBoundsFromDomain(a);
	const boundsB = getBoundsFromDomain(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	const lower =
		boundsA.lower !== null && boundsB.upper !== null ? boundsA.lower - boundsB.upper : null;

	const upper =
		boundsA.upper !== null && boundsB.lower !== null ? boundsA.upper - boundsB.lower : null;

	// Endpoint types for subtraction
	const lowerInclusive = boundsA.lowerInclusive && boundsB.upperInclusive;
	const upperInclusive = boundsA.upperInclusive && boundsB.lowerInclusive;

	return domainFromBounds({ lower, lowerInclusive, upper, upperInclusive });
}

/**
 * Negate a range with endpoint preservation: -[a, b] = [-b, -a]
 */
function negateRange(domain: Domain): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };
	if (domain.kind === 'universal') return universalDomain();

	const bounds = getBoundsFromDomain(domain);
	if (!bounds) return universalDomain();

	return domainFromBounds({
		lower: bounds.upper !== null ? -bounds.upper : null,
		lowerInclusive: bounds.upperInclusive,
		upper: bounds.lower !== null ? -bounds.lower : null,
		upperInclusive: bounds.lowerInclusive
	});
}

/**
 * Scale a range by a constant: a * [b, c]
 */
function scaleRange(
	range: Domain,
	scalar: number,
	steps: RangeStep[] | undefined,
	node: MathNode
): Domain {
	if (range.kind === 'empty') return { kind: 'empty' };
	if (range.kind === 'universal') return universalDomain();
	if (scalar === 0) return singlePoint(0);

	const bounds = getBoundsFromDomain(range);
	if (!bounds) return universalDomain();

	let newLower: number | null;
	let newUpper: number | null;
	let newLowerInclusive: boolean;
	let newUpperInclusive: boolean;

	if (scalar > 0) {
		// Positive scalar preserves order
		newLower = bounds.lower !== null ? bounds.lower * scalar : null;
		newUpper = bounds.upper !== null ? bounds.upper * scalar : null;
		newLowerInclusive = bounds.lowerInclusive;
		newUpperInclusive = bounds.upperInclusive;
	} else {
		// Negative scalar reverses order
		newLower = bounds.upper !== null ? bounds.upper * scalar : null;
		newUpper = bounds.lower !== null ? bounds.lower * scalar : null;
		newLowerInclusive = bounds.upperInclusive;
		newUpperInclusive = bounds.lowerInclusive;
	}

	const result = domainFromBounds({
		lower: newLower,
		lowerInclusive: newLowerInclusive,
		upper: newUpper,
		upperInclusive: newUpperInclusive
	});

	if (steps) {
		steps.push({
			expression: nodeToString(node),
			rangeDescription: formatInterval(result),
			explanation: `Multiplication par ${scalar}: ${scalar} × ${formatInterval(range)} = ${formatInterval(result)}.`
		});
	}

	return result;
}

/**
 * Interval multiplication: [a, b] * [c, d]
 * Result is [min(ac, ad, bc, bd), max(ac, ad, bc, bd)]
 */
function intervalMultiply(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBoundsFromDomain(a);
	const boundsB = getBoundsFromDomain(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	// If any bound is infinite, result is likely infinite
	if (
		boundsA.lower === null ||
		boundsA.upper === null ||
		boundsB.lower === null ||
		boundsB.upper === null
	) {
		return universalDomain();
	}

	const products = [
		{
			value: boundsA.lower * boundsB.lower,
			aInc: boundsA.lowerInclusive,
			bInc: boundsB.lowerInclusive
		},
		{
			value: boundsA.lower * boundsB.upper,
			aInc: boundsA.lowerInclusive,
			bInc: boundsB.upperInclusive
		},
		{
			value: boundsA.upper * boundsB.lower,
			aInc: boundsA.upperInclusive,
			bInc: boundsB.lowerInclusive
		},
		{
			value: boundsA.upper * boundsB.upper,
			aInc: boundsA.upperInclusive,
			bInc: boundsB.upperInclusive
		}
	];

	const minProduct = products.reduce((min, p) => (p.value < min.value ? p : min));
	const maxProduct = products.reduce((max, p) => (p.value > max.value ? p : max));

	return domainFromBounds({
		lower: minProduct.value,
		lowerInclusive: minProduct.aInc && minProduct.bInc,
		upper: maxProduct.value,
		upperInclusive: maxProduct.aInc && maxProduct.bInc
	});
}

/**
 * Interval division: [a, b] / [c, d] (assuming 0 not in [c, d])
 */
function intervalDivide(a: Domain, b: Domain): Domain {
	if (a.kind === 'empty' || b.kind === 'empty') {
		return { kind: 'empty' };
	}

	const boundsA = getBoundsFromDomain(a);
	const boundsB = getBoundsFromDomain(b);

	if (!boundsA || !boundsB) {
		return universalDomain();
	}

	// If denominator bounds include infinity or zero, return universal
	if (boundsB.lower === null || boundsB.upper === null) {
		return universalDomain();
	}

	if (boundsB.lower <= 0 && boundsB.upper >= 0) {
		// Division by zero possible
		return universalDomain();
	}

	if (boundsA.lower === null || boundsA.upper === null) {
		return universalDomain();
	}

	const quotients = [
		{
			value: boundsA.lower / boundsB.lower,
			aInc: boundsA.lowerInclusive,
			bInc: boundsB.lowerInclusive
		},
		{
			value: boundsA.lower / boundsB.upper,
			aInc: boundsA.lowerInclusive,
			bInc: boundsB.upperInclusive
		},
		{
			value: boundsA.upper / boundsB.lower,
			aInc: boundsA.upperInclusive,
			bInc: boundsB.lowerInclusive
		},
		{
			value: boundsA.upper / boundsB.upper,
			aInc: boundsA.upperInclusive,
			bInc: boundsB.upperInclusive
		}
	];

	const minQuotient = quotients.reduce((min, q) => (q.value < min.value ? q : min));
	const maxQuotient = quotients.reduce((max, q) => (q.value > max.value ? q : max));

	return domainFromBounds({
		lower: minQuotient.value,
		lowerInclusive: minQuotient.aInc && minQuotient.bInc,
		upper: maxQuotient.value,
		upperInclusive: maxQuotient.aInc && maxQuotient.bInc
	});
}

// =============================================================================
// Power Range Helpers
// =============================================================================

/**
 * Even power range: x^n on [a, b] where n is even
 * If [a, b] contains 0: [0, max(|a|^n, |b|^n)]
 * Otherwise: [min(a^n, b^n), max(a^n, b^n)]
 */
function evenPowerRange(domain: Domain, n: number): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };

	const bounds = getBoundsFromDomain(domain);
	if (!bounds) {
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'closed' },
				upper: { value: { type: 'infinity', sign: 'positive' }, type: 'open' }
			}
		]);
	}

	if (bounds.lower === null || bounds.upper === null) {
		return intervalDomain([
			{
				kind: 'interval',
				lower: { value: fromNumber(0), type: 'closed' },
				upper: { value: { type: 'infinity', sign: 'positive' }, type: 'open' }
			}
		]);
	}

	const a = bounds.lower;
	const b = bounds.upper;

	if (a <= 0 && b >= 0) {
		// Contains 0: minimum is 0
		const maxPow = Math.max(Math.pow(Math.abs(a), n), Math.pow(Math.abs(b), n));
		return domainFromBounds({
			lower: 0,
			lowerInclusive: true,
			upper: maxPow,
			upperInclusive: bounds.lowerInclusive || bounds.upperInclusive
		});
	}

	// Doesn't contain 0: both endpoints have same sign
	const aPow = Math.pow(a, n);
	const bPow = Math.pow(b, n);
	const minPow = Math.min(aPow, bPow);
	const maxPow = Math.max(aPow, bPow);

	// The minimum occurs at the endpoint closer to 0
	const minAtA = aPow === minPow;

	return domainFromBounds({
		lower: minPow,
		lowerInclusive: minAtA ? bounds.lowerInclusive : bounds.upperInclusive,
		upper: maxPow,
		upperInclusive: minAtA ? bounds.upperInclusive : bounds.lowerInclusive
	});
}

/**
 * Odd power range: x^n on [a, b] where n is odd
 * Monotonically increasing, so [a^n, b^n]
 */
function oddPowerRange(domain: Domain, n: number): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };
	if (domain.kind === 'universal') return universalDomain();

	const bounds = getBoundsFromDomain(domain);
	if (!bounds) return universalDomain();

	return domainFromBounds({
		lower: bounds.lower !== null ? Math.pow(bounds.lower, n) : null,
		lowerInclusive: bounds.lowerInclusive,
		upper: bounds.upper !== null ? Math.pow(bounds.upper, n) : null,
		upperInclusive: bounds.upperInclusive
	});
}

/**
 * Negative power range: x^(-n) = 1/x^n
 */
function negativePowerRange(domain: Domain, n: number): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };

	const bounds = getBoundsFromDomain(domain);
	if (!bounds) return universalDomain();

	// If range contains 0, result is unbounded
	if (
		(bounds.lower === null || bounds.lower <= 0) &&
		(bounds.upper === null || bounds.upper >= 0)
	) {
		return universalDomain();
	}

	if (bounds.lower === null || bounds.upper === null) {
		return universalDomain();
	}

	// x^n first, then 1/...
	const absN = Math.abs(n);
	const isEven = absN % 2 === 0;

	if (isEven) {
		// 1/x^2 is always positive, decreasing on (0, +∞), increasing on (-∞, 0)
		if (bounds.lower > 0) {
			// Positive interval: 1/x^n is decreasing
			const lower = 1 / Math.pow(bounds.upper, absN);
			const upper = 1 / Math.pow(bounds.lower, absN);
			return domainFromBounds({
				lower,
				lowerInclusive: bounds.upperInclusive,
				upper,
				upperInclusive: bounds.lowerInclusive
			});
		} else if (bounds.upper < 0) {
			// Negative interval
			const lower = 1 / Math.pow(bounds.lower, absN);
			const upper = 1 / Math.pow(bounds.upper, absN);
			return domainFromBounds({
				lower,
				lowerInclusive: bounds.lowerInclusive,
				upper,
				upperInclusive: bounds.upperInclusive
			});
		}
	} else {
		// Odd negative power: 1/x^n, monotonically decreasing everywhere
		if (bounds.lower > 0 || bounds.upper < 0) {
			const lower = 1 / Math.pow(bounds.upper, absN);
			const upper = 1 / Math.pow(bounds.lower, absN);
			return domainFromBounds({
				lower,
				lowerInclusive: bounds.upperInclusive,
				upper,
				upperInclusive: bounds.lowerInclusive
			});
		}
	}

	return universalDomain();
}

/**
 * Cube root range: x^(1/3) is defined for all reals and monotonically increasing.
 */
function computeCubeRootRange(domain: Domain): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };
	if (domain.kind === 'universal') return universalDomain();

	const bounds = getBoundsFromDomain(domain);
	if (!bounds) return universalDomain();

	return domainFromBounds({
		lower: bounds.lower !== null ? Math.cbrt(bounds.lower) : null,
		lowerInclusive: bounds.lowerInclusive,
		upper: bounds.upper !== null ? Math.cbrt(bounds.upper) : null,
		upperInclusive: bounds.upperInclusive
	});
}

/**
 * General fractional power range.
 */
function fractionalPowerRange(domain: Domain, exp: number): Domain {
	if (domain.kind === 'empty') return { kind: 'empty' };

	const bounds = getBoundsFromDomain(domain);
	if (!bounds) return universalDomain();

	// For positive fractional exponents on positive base
	if (exp > 0) {
		if (bounds.lower !== null && bounds.lower < 0) {
			// Negative values with fractional exponent: complex
			return universalDomain();
		}

		const lower = bounds.lower !== null && bounds.lower >= 0 ? Math.pow(bounds.lower, exp) : null;
		const upper = bounds.upper !== null && bounds.upper >= 0 ? Math.pow(bounds.upper, exp) : null;

		return domainFromBounds({
			lower: lower ?? 0,
			lowerInclusive: bounds.lowerInclusive,
			upper,
			upperInclusive: bounds.upperInclusive
		});
	}

	// Negative fractional exponent: 1/x^|exp|
	if (bounds.lower !== null && bounds.lower <= 0) {
		return universalDomain(); // Includes 0 or negatives
	}

	if (bounds.lower === null || bounds.upper === null) {
		return universalDomain();
	}

	// Both bounds positive, exp < 0
	const lower = Math.pow(bounds.upper, exp);
	const upper = Math.pow(bounds.lower, exp);

	return domainFromBounds({
		lower,
		lowerInclusive: bounds.upperInclusive,
		upper,
		upperInclusive: bounds.lowerInclusive
	});
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Convert a node to a simple string representation.
 */
function nodeToString(node: MathNode): string {
	switch (node.type) {
		case 'number':
			return node.value;
		case 'variable':
			return node.name;
		case 'greek':
			return node.letter === 'pi' ? 'π' : node.letter;
		case 'function':
			return `${node.name}(...)`;
		case 'addition':
			return '(...) + (...)';
		case 'subtraction':
			return '(...) - (...)';
		case 'multiplication':
			return '(...) × (...)';
		case 'division':
			return '(...) / (...)';
		case 'opposite':
			return '-(...)';
		case 'superscript':
			return '(...)^(...)';
		default:
			return '...';
	}
}
