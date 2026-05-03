/**
 * Range (image) computation for mathematical expressions.
 *
 * Computes the output range (image) for an expression given an input domain.
 * This is the dual of domain computation: while `computeDomain` finds valid inputs,
 * `computeRange` finds possible outputs.
 *
 * Strategy: exact methods only (quadratic detection, critical points + limits).
 * If the range cannot be computed exactly, returns null — no overestimation.
 */

import type { MathNode } from '../types';
import type { Domain, RangeResult, RangeStep } from './types';
import { intervalDomain, closedInterval } from './factory';
import { numericNode } from '../common/numeric';
import { computeDomain } from './compute';
import { formatInterval } from './format';
import {
	extractQuadratic,
	computeQuadraticRange,
	computeRangeWithCriticalPoints,
	isConstant,
	evaluateConstant
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
 * @returns RangeResult with computed range (null if exact range cannot be determined)
 *
 * @example
 * // Simple builtin functions
 * computeRange(parseLatex('\\sqrt{x}'), 'x');  // → [0, +∞[
 * computeRange(parseLatex('\\sin{x}'), 'x');   // → null (unbounded, no exact range)
 *
 * @example
 * // With restricted input domain
 * computeRange(parseLatex('x^2'), 'x', { domain: positiveReals() });  // → [0, +∞)
 *
 * @example
 * // Compositions with accurate range propagation
 * computeRange(parseLatex('\\sqrt{x}'), 'x', { domain: closedInterval(4, 9) });  // → [2, 3]
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
 * Strategy (exact only — no overestimation):
 * 1. Trivial cases: constants, variables, delimiters
 * 2. Quadratic pattern matching (ax² + bx + c — works for unbounded domains too)
 * 3. Exact closed-interval method (critical points + limits at ±∞)
 * 4. If none succeeds → null
 */
function computeRangeNode(
	node: MathNode,
	variable: string,
	inputDomain: Domain,
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain | null {
	// 1. Trivial cases (always exact)
	switch (node.type) {
		case 'number':
			return computeConstantRange(node, steps, options);
		case 'variable':
			return computeVariableRange(node, variable, inputDomain, steps, options);
		case 'greek':
			return computeGreekConstantRange(node, steps, options);
		case 'constant':
			return computeConstantNodeRange(node, steps, options);
		case 'delimiter':
			return computeRangeNode(node.content, variable, inputDomain, steps, options);
	}

	// 2. Constant expression (doesn't contain the variable)
	if (isConstant(node, variable)) {
		const value = evaluateConstant(node);
		if (value !== null) {
			return singlePoint(value);
		}
	}

	// 3. Quadratic pattern (handles ax² + bx + c, works for unbounded domains)
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

	// 4. Exact critical point method (with limits for unbounded domains)
	const result = computeRangeWithCriticalPoints(node, variable, inputDomain);
	if (result) {
		if (options.showSteps) {
			steps.push({
				expression: nodeToString(node),
				rangeDescription: formatInterval(result),
				explanation: `Méthode exacte (points critiques + limites).`
			});
		}
		return result;
	}

	// 5. Cannot compute exact range → null
	return null;
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
			// Unknown Greek letter: can't determine range
			return singlePoint(0); // Fallback — shouldn't normally happen
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
 * Compute range for a constant node (e, pi via 'constant' type).
 */
function computeConstantNodeRange(
	node: MathNode & { type: 'constant' },
	steps: RangeStep[],
	options: ComputeRangeOptions
): Domain {
	const value = node.constant === 'pi' ? Math.PI : Math.E;
	const name = node.constant === 'pi' ? 'π' : 'e';
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

	// Other variable: treated as unknown constant — can't determine range exactly
	// Return universal as this is a parameter
	return { kind: 'universal' };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Create a single-point domain.
 */
function singlePoint(value: number): Domain {
	return intervalDomain([closedInterval(numericNode(value), numericNode(value))]);
}

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
			return node.letter;
		case 'constant':
			return node.constant === 'pi' ? 'π' : 'e';
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
