/**
 * Symmetry Detection
 *
 * Detects whether mathematical expressions are even, odd, or neither.
 * - Even function: f(-x) = f(x) for all x
 * - Odd function: f(-x) = -f(x) for all x
 *
 * Uses normalization for algebraic comparison.
 *
 * @module mathAST/analysis/symmetry
 */

import type { MathNode } from '../types';
import { isFunction, isNumber } from '../guards';
import { opposite } from '../factory';
import { substitute, getVariables } from '../eval/substitute';
import { normalize, normalFormsEquivalent } from '../normal';
import { mapNode } from '../transforms';

// =============================================================================
// Types
// =============================================================================

/**
 * Type of symmetry detected
 */
export type SymmetryType = 'even' | 'odd' | 'none' | 'unknown';

/**
 * Result of symmetry detection
 */
export interface SymmetryResult {
	/** The type of symmetry detected */
	readonly symmetry: SymmetryType;

	/** The variable analyzed for symmetry */
	readonly variable: string;

	/** Confidence level of the result */
	readonly confidence: 'proven' | 'heuristic';

	/** Reason for the classification (for debugging/explanation) */
	readonly reason?: string;
}

// =============================================================================
// Known Function Symmetries
// =============================================================================

/**
 * Functions known to be even: f(-x) = f(x)
 */
const EVEN_FUNCTIONS = new Set(['cos', 'cosh', 'abs', 'sec', 'sech']);

/**
 * Functions known to be odd: f(-x) = -f(x)
 */
const ODD_FUNCTIONS = new Set([
	'sin',
	'sinh',
	'tan',
	'tanh',
	'cot',
	'coth',
	'csc',
	'csch',
	'arcsin',
	'arctan',
	'arcsinh',
	'arctanh'
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a number is an even integer.
 */
function isEvenInteger(value: string): boolean {
	const num = parseFloat(value);
	return Number.isInteger(num) && num % 2 === 0;
}

/**
 * Check if a number is an odd integer.
 */
function isOddInteger(value: string): boolean {
	const num = parseFloat(value);
	return Number.isInteger(num) && num % 2 !== 0;
}

/**
 * Get symmetry type of a known function.
 */
function getFunctionSymmetry(name: string): SymmetryType {
	if (EVEN_FUNCTIONS.has(name)) return 'even';
	if (ODD_FUNCTIONS.has(name)) return 'odd';
	return 'unknown';
}

/**
 * Combine symmetries according to multiplication rules.
 * - even × even = even
 * - odd × odd = even
 * - even × odd = odd
 * - any × none = none
 * - any × unknown = unknown
 */
function multiplySymmetries(a: SymmetryType, b: SymmetryType): SymmetryType {
	if (a === 'none' || b === 'none') return 'none';
	if (a === 'unknown' || b === 'unknown') return 'unknown';
	if (a === 'even' && b === 'even') return 'even';
	if (a === 'odd' && b === 'odd') return 'even';
	if ((a === 'even' && b === 'odd') || (a === 'odd' && b === 'even')) return 'odd';
	return 'unknown';
}

/**
 * Combine symmetries according to addition rules.
 * - even + even = even
 * - odd + odd = odd
 * - even + odd = none (in general)
 * - any + none = none
 */
function addSymmetries(a: SymmetryType, b: SymmetryType): SymmetryType {
	if (a === 'none' || b === 'none') return 'none';
	if (a === 'unknown' || b === 'unknown') return 'unknown';
	if (a === b) return a; // even + even = even, odd + odd = odd
	return 'none'; // even + odd = none
}

/**
 * Symmetry of f(-x) when we know symmetry of f.
 * - If f is even: f(-x) has same symmetry as f(x)
 * - If f is odd: f(-x) has opposite sign, so same parity
 */
function composeWithNegation(innerSym: SymmetryType, funcSym: SymmetryType): SymmetryType {
	if (innerSym === 'none' || funcSym === 'none') return 'none';
	if (innerSym === 'unknown' || funcSym === 'unknown') return 'unknown';

	// f(g(x)) where we know symmetry of g
	// If g is even: g(-x) = g(x), so f(g(-x)) = f(g(x)) - even behavior
	// If g is odd: g(-x) = -g(x), so f(g(-x)) = f(-g(x))
	//   - If f is even: f(-g(x)) = f(g(x)) - even
	//   - If f is odd: f(-g(x)) = -f(g(x)) - odd

	if (innerSym === 'even') return 'even';
	if (innerSym === 'odd') return funcSym;

	return 'unknown';
}

// =============================================================================
// Heuristic Symmetry Detection (Fast Path)
// =============================================================================

/**
 * Detect symmetry using structural heuristics.
 * Fast but may return 'unknown' for complex expressions.
 */
function detectSymmetryHeuristic(node: MathNode, variable: string): SymmetryType {
	// Constants are even
	const vars = getVariables(node);
	if (!vars.has(variable)) {
		return 'even';
	}

	switch (node.type) {
		case 'number':
			return 'even'; // Constants are even

		case 'variable':
			// x is odd
			return node.name === variable ? 'odd' : 'even';

		case 'greek':
			// Greek letter used as variable
			return node.letter === variable ? 'odd' : 'even';

		case 'opposite':
			// -f(x) has same symmetry as f(x)
			return detectSymmetryHeuristic(node.operand, variable);

		case 'positive':
			return detectSymmetryHeuristic(node.operand, variable);

		case 'addition':
		case 'subtraction': {
			const leftSym = detectSymmetryHeuristic(node.left, variable);
			const rightSym = detectSymmetryHeuristic(node.right, variable);
			return addSymmetries(leftSym, rightSym);
		}

		case 'multiplication': {
			const leftSym = detectSymmetryHeuristic(node.left, variable);
			const rightSym = detectSymmetryHeuristic(node.right, variable);
			return multiplySymmetries(leftSym, rightSym);
		}

		case 'division': {
			const numSym = detectSymmetryHeuristic(node.numerator, variable);
			const denSym = detectSymmetryHeuristic(node.denominator, variable);
			return multiplySymmetries(numSym, denSym);
		}

		case 'superscript': {
			// x^n: even if n is even, odd if n is odd
			const baseSym = detectSymmetryHeuristic(node.base, variable);

			// Check if exponent is a constant integer
			if (isNumber(node.superscript)) {
				if (isEvenInteger(node.superscript.value)) {
					// x^(even) is even, (-x)^(even) = x^(even)
					if (baseSym === 'odd' || baseSym === 'even') return 'even';
				}
				if (isOddInteger(node.superscript.value)) {
					// x^(odd) keeps parity: even^odd=even, odd^odd=odd
					return baseSym;
				}
			}

			// Non-integer or variable exponent - check if base contains variable
			if (!getVariables(node.base).has(variable)) {
				// a^x where a is constant - neither even nor odd in general
				return 'none';
			}

			return 'unknown';
		}

		case 'delimiter':
			return detectSymmetryHeuristic(node.content, variable);

		case 'function': {
			// Check if argument contains the variable
			if (node.args.length === 0) return 'even';

			const arg = node.args[0];
			const argSym = detectSymmetryHeuristic(arg, variable);
			const funcSym = getFunctionSymmetry(node.name);

			// sqrt, cbrt: preserve parity if argument is even, complex otherwise
			if (node.name === 'sqrt' || node.name === 'cbrt') {
				if (argSym === 'even') return 'even';
				return 'unknown'; // sqrt(odd) is not well-defined for negative values
			}

			return composeWithNegation(argSym, funcSym);
		}

		default:
			return 'unknown';
	}
}

// =============================================================================
// Algebraic Symmetry Detection (Slow Path - Proven)
// =============================================================================

/**
 * Detect symmetry by algebraic comparison.
 * Substitutes -x for x and compares normalized forms.
 */
function detectSymmetryAlgebraic(node: MathNode, variable: string): SymmetryResult {
	try {
		// Create f(-x) by substituting -x for x
		// Use maxIterations: 1 to prevent recursive substitution
		const negX = opposite({ type: 'variable', name: variable });
		const fNegX = substitute(node, { [variable]: negX }, { maxIterations: 1 });

		// Create -f(x)
		const negFX = opposite(node);

		// Normalize all three: f(x), f(-x), -f(x)
		const normFX = normalize(node);
		const normFNegX = normalize(fNegX);
		const normNegFX = normalize(negFX);

		// Compare f(-x) with f(x) for even
		if (normalFormsEquivalent(normFNegX, normFX)) {
			return {
				symmetry: 'even',
				variable,
				confidence: 'proven',
				reason: 'f(-x) = f(x) verified algebraically'
			};
		}

		// Compare f(-x) with -f(x) for odd
		if (normalFormsEquivalent(normFNegX, normNegFX)) {
			return {
				symmetry: 'odd',
				variable,
				confidence: 'proven',
				reason: 'f(-x) = -f(x) verified algebraically'
			};
		}

		// Neither even nor odd
		return {
			symmetry: 'none',
			variable,
			confidence: 'proven',
			reason: 'f(-x) ≠ f(x) and f(-x) ≠ -f(x)'
		};
	} catch {
		// Normalization failed - fall back to heuristic
		return {
			symmetry: 'unknown',
			variable,
			confidence: 'heuristic',
			reason: 'Algebraic comparison failed'
		};
	}
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Check if expression contains transcendental functions.
 * Algebraic normalization cannot simplify transcendental identities,
 * so we trust heuristics for these.
 */
function containsTranscendentalFunctions(node: MathNode): boolean {
	let found = false;
	mapNode(node, (n) => {
		if (found) return n;
		if (isFunction(n)) {
			if (
				EVEN_FUNCTIONS.has(n.name) ||
				ODD_FUNCTIONS.has(n.name) ||
				n.name === 'ln' ||
				n.name === 'log' ||
				n.name === 'exp'
			) {
				found = true;
			}
		}
		return n;
	});
	return found;
}

/**
 * Detect whether an expression has even, odd, or no symmetry.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check symmetry in (auto-detected if single variable)
 * @returns SymmetryResult with symmetry type and confidence
 *
 * @example
 * detectSymmetry(parseLatex('x^2'))  // { symmetry: 'even', ... }
 * detectSymmetry(parseLatex('x^3'))  // { symmetry: 'odd', ... }
 * detectSymmetry(parseLatex('x^2 + x'))  // { symmetry: 'none', ... }
 * detectSymmetry(parseLatex('\\cos(x)'))  // { symmetry: 'even', ... }
 * detectSymmetry(parseLatex('\\sin(x)'))  // { symmetry: 'odd', ... }
 */
export function detectSymmetry(node: MathNode, variable?: string): SymmetryResult {
	// Auto-detect variable if not provided
	const vars = getVariables(node);

	if (vars.size === 0) {
		// Constant - always even
		return {
			symmetry: 'even',
			variable: variable ?? 'x',
			confidence: 'proven',
			reason: 'Constant expression'
		};
	}

	const targetVar = variable ?? (vars.size === 1 ? Array.from(vars)[0] : undefined);

	if (!targetVar) {
		return {
			symmetry: 'unknown',
			variable: '',
			confidence: 'heuristic',
			reason: 'Multiple variables, none specified'
		};
	}

	if (!vars.has(targetVar)) {
		// Expression doesn't contain the target variable - constant in that variable
		return {
			symmetry: 'even',
			variable: targetVar,
			confidence: 'proven',
			reason: `Expression is constant in ${targetVar}`
		};
	}

	// Try heuristic first (fast)
	const heuristicResult = detectSymmetryHeuristic(node, targetVar);

	// For expressions with transcendental functions, trust the heuristic
	// because algebraic normalization can't simplify trig/exp identities
	if (heuristicResult !== 'unknown' && containsTranscendentalFunctions(node)) {
		return {
			symmetry: heuristicResult,
			variable: targetVar,
			confidence: 'heuristic',
			reason: 'Structural analysis (transcendental functions)'
		};
	}

	if (heuristicResult !== 'unknown') {
		// Verify with algebraic method for proven confidence
		const algebraicResult = detectSymmetryAlgebraic(node, targetVar);

		// If algebraic confirms heuristic, return proven result
		if (algebraicResult.symmetry === heuristicResult) {
			return algebraicResult;
		}

		// If algebraic disagrees but heuristic is definite, trust heuristic
		// (algebraic might fail due to complex expressions)
		if (heuristicResult === 'even' || heuristicResult === 'odd') {
			return {
				symmetry: heuristicResult,
				variable: targetVar,
				confidence: 'heuristic',
				reason: 'Structural analysis'
			};
		}

		// For 'none', trust algebraic if proven
		if (algebraicResult.confidence === 'proven') {
			return algebraicResult;
		}

		return {
			symmetry: heuristicResult,
			variable: targetVar,
			confidence: 'heuristic',
			reason: 'Structural analysis'
		};
	}

	// Heuristic returned unknown - try algebraic
	return detectSymmetryAlgebraic(node, targetVar);
}

/**
 * Check if an expression is an even function.
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression is even
 *
 * @example
 * isEven(parseLatex('x^2'))  // true
 * isEven(parseLatex('\\cos(x)'))  // true
 * isEven(parseLatex('x'))  // false
 */
export function isEven(node: MathNode, variable?: string): boolean {
	return detectSymmetry(node, variable).symmetry === 'even';
}

/**
 * Check if an expression is an odd function.
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression is odd
 *
 * @example
 * isOdd(parseLatex('x^3'))  // true
 * isOdd(parseLatex('\\sin(x)'))  // true
 * isOdd(parseLatex('x^2'))  // false
 */
export function isOdd(node: MathNode, variable?: string): boolean {
	return detectSymmetry(node, variable).symmetry === 'odd';
}

/**
 * Check if an expression has no symmetry (neither even nor odd).
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression has no symmetry
 *
 * @example
 * hasNoSymmetry(parseLatex('x^2 + x'))  // true
 * hasNoSymmetry(parseLatex('x + 1'))  // true
 * hasNoSymmetry(parseLatex('x^2'))  // false
 */
export function hasNoSymmetry(node: MathNode, variable?: string): boolean {
	return detectSymmetry(node, variable).symmetry === 'none';
}
