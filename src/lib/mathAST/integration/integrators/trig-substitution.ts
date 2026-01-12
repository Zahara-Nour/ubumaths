/**
 * Trigonometric Substitution Integrator
 *
 * Handles integration using trigonometric substitutions for expressions involving:
 * - √(a²-x²): use x = a·sin(θ)
 * - √(a²+x²): use x = a·tan(θ)
 * - √(x²-a²): use x = a·sec(θ)
 *
 * @module mathAST/integration/integrators/trig-substitution
 */

import type { MathNode } from '../../types';
import type {
	Integrator,
	IntegrateResult,
	IntegrateStepRecorder,
	ResolvedIntegrateOptions
} from '../types';
import { isNumber, isVariable } from '../../guards';
import { number } from '../../factory';
import { containsVariable } from '../rules';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Types of trigonometric substitution patterns.
 */
type TrigSubPattern =
	| 'sin' // √(a²-x²) → x = a·sin(θ)
	| 'tan' // √(a²+x²) → x = a·tan(θ)
	| 'sec'; // √(x²-a²) → x = a·sec(θ)

/**
 * Information about a detected trigonometric substitution pattern.
 */
interface TrigSubstitutionInfo {
	/** Type of substitution to use */
	pattern: TrigSubPattern;
	/** Value of coefficient a (for a²) */
	a: MathNode;
	/** The radical expression that matched */
	radical: MathNode;
}

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Detect if an expression contains a trigonometric substitution pattern.
 *
 * Looks for:
 * - √(a²-x²): a² - x² under a square root
 * - √(a²+x²): a² + x² under a square root
 * - √(x²-a²): x² - a² under a square root
 *
 * @param expr - The expression to analyze
 * @param variable - The integration variable
 * @returns Pattern info if detected, null otherwise
 */
export function detectTrigSubPattern(
	expr: MathNode,
	variable: string
): TrigSubstitutionInfo | null {
	// For skeleton implementation: basic pattern detection
	// Full implementation would traverse the expression tree to find radicals

	// Check if expression is a square root (power with exponent 1/2)
	if (expr.type === 'function' && expr.name === 'sqrt' && expr.args.length === 1) {
		const arg = expr.args[0];
		return analyzeRadicalArgument(arg, variable);
	}

	// Check for division with radical in denominator (common case: 1/√(...))
	if (expr.type === 'division') {
		const denom = expr.denominator;
		if (denom.type === 'function' && denom.name === 'sqrt' && denom.args.length === 1) {
			const arg = denom.args[0];
			return analyzeRadicalArgument(arg, variable);
		}
	}

	// No pattern detected
	return null;
}

/**
 * Analyze the argument of a square root to detect substitution patterns.
 *
 * @param arg - The argument under the square root
 * @param variable - The integration variable
 * @returns Pattern info if detected, null otherwise
 */
function analyzeRadicalArgument(arg: MathNode, variable: string): TrigSubstitutionInfo | null {
	// Pattern 1: a² - x² (subtraction)
	if (arg.type === 'subtraction') {
		const left = arg.left;
		const right = arg.right;

		// Check if right is x²
		const isRightVarSquared = isVariableSquared(right, variable);
		// Check if left is a constant
		const isLeftConstant = !containsVariable(left, variable);

		if (isLeftConstant && isRightVarSquared) {
			// Pattern: a² - x²
			// Extract a from a²
			const a = extractSquareRootOfConstant(left);
			if (a) {
				return {
					pattern: 'sin',
					a,
					radical: arg
				};
			}
		}
	}

	// Pattern 2: a² + x² (addition)
	if (arg.type === 'addition') {
		const left = arg.left;
		const right = arg.right;

		// Check if right is x²
		const isRightVarSquared = isVariableSquared(right, variable);
		// Check if left is a constant
		const isLeftConstant = !containsVariable(left, variable);

		if (isLeftConstant && isRightVarSquared) {
			// Pattern: a² + x²
			const a = extractSquareRootOfConstant(left);
			if (a) {
				return {
					pattern: 'tan',
					a,
					radical: arg
				};
			}
		}

		// Also check: x² + a² (reversed order)
		const isLeftVarSquared = isVariableSquared(left, variable);
		const isRightConstant = !containsVariable(right, variable);

		if (isLeftVarSquared && isRightConstant) {
			const a = extractSquareRootOfConstant(right);
			if (a) {
				return {
					pattern: 'tan',
					a,
					radical: arg
				};
			}
		}
	}

	// Pattern 3: x² - a² (subtraction, reversed)
	if (arg.type === 'subtraction') {
		const left = arg.left;
		const right = arg.right;

		// Check if left is x²
		const isLeftVarSquared = isVariableSquared(left, variable);
		// Check if right is a constant
		const isRightConstant = !containsVariable(right, variable);

		if (isLeftVarSquared && isRightConstant) {
			// Pattern: x² - a²
			const a = extractSquareRootOfConstant(right);
			if (a) {
				return {
					pattern: 'sec',
					a,
					radical: arg
				};
			}
		}
	}

	return null;
}

/**
 * Check if an expression is x² (variable squared).
 */
function isVariableSquared(expr: MathNode, variable: string): boolean {
	if (expr.type === 'superscript') {
		// Check if base is the variable
		if (isVariable(expr.base) && expr.base.name === variable) {
			// Check if exponent is 2
			if (isNumber(expr.superscript) && expr.superscript.value === '2') {
				return true;
			}
		}
	}
	return false;
}

/**
 * Extract √n from a constant expression n.
 * If n is a perfect square, returns the integer square root.
 * Otherwise returns the expression √n.
 */
function extractSquareRootOfConstant(expr: MathNode): MathNode | null {
	if (isNumber(expr)) {
		const value = parseFloat(expr.value);
		if (value > 0) {
			const sqrt = Math.sqrt(value);
			// If perfect square, return integer
			if (Number.isInteger(sqrt)) {
				return number(sqrt.toString());
			}
			// Otherwise, could return sqrt node, but for simplicity return the sqrt value
			return number(sqrt.toString());
		}
	}
	return null;
}

// =============================================================================
// Trigonometric Substitution Application
// =============================================================================

/**
 * Apply the trigonometric substitution.
 *
 * Transforms the integral using the appropriate substitution:
 * - sin: x = a·sin(θ), dx = a·cos(θ)dθ
 * - tan: x = a·tan(θ), dx = a·sec²(θ)dθ
 * - sec: x = a·sec(θ), dx = a·sec(θ)·tan(θ)dθ
 *
 * @param expr - The expression to transform
 * @param pattern - The substitution pattern to use
 * @param variable - The integration variable
 * @returns The transformed expression in terms of θ, or null if transformation fails
 */
export function applyTrigSubstitution(
	_expr: MathNode,
	_pattern: TrigSubstitutionInfo,
	_variable: string
): MathNode | null {
	// TODO: Implement full trigonometric substitution
	// This is complex and requires:
	// 1. Substitute x with a·sin(θ) / a·tan(θ) / a·sec(θ)
	// 2. Substitute dx with appropriate differential
	// 3. Simplify using trig identities:
	//    - sin: √(a²-a²sin²(θ)) = a·cos(θ)
	//    - tan: √(a²+a²tan²(θ)) = a·sec(θ)
	//    - sec: √(a²sec²(θ)-a²) = a·tan(θ)
	// 4. Return simplified expression in θ

	// For skeleton: return null (not implemented)
	return null;
}

/**
 * Back-substitute from θ to the original variable using the triangle method.
 *
 * Uses right triangle relationships to express trig functions of θ in terms of x:
 * - sin pattern: sin(θ) = x/a, cos(θ) = √(a²-x²)/a, θ = arcsin(x/a)
 * - tan pattern: tan(θ) = x/a, sec(θ) = √(a²+x²)/a, θ = arctan(x/a)
 * - sec pattern: sec(θ) = x/a, tan(θ) = √(x²-a²)/a, θ = arcsec(x/a)
 *
 * @param result - The result in terms of θ
 * @param pattern - The substitution pattern that was used
 * @param variable - The original integration variable
 * @returns The result in terms of the original variable, or null if back-substitution fails
 */
export function backSubstitute(
	_result: MathNode,
	_pattern: TrigSubstitutionInfo,
	_variable: string
): MathNode | null {
	// TODO: Implement back-substitution
	// This requires:
	// 1. Identify trig functions in the result (sin, cos, tan, sec, etc.)
	// 2. Replace them using triangle relationships
	// 3. Replace θ with appropriate inverse trig function
	// 4. Simplify the result

	// For skeleton: return null (not implemented)
	return null;
}

// =============================================================================
// Trigonometric Substitution Integrator
// =============================================================================

/**
 * Trigonometric substitution integrator for expressions with radicals.
 *
 * Handles:
 * - √(a²-x²): use x = a·sin(θ)
 * - √(a²+x²): use x = a·tan(θ)
 * - √(x²-a²): use x = a·sec(θ)
 *
 * Priority: 40 (after partial fractions, before numeric)
 *
 * NOTE: This is a skeleton implementation. Full implementation requires:
 * - Symbolic substitution engine
 * - Trigonometric identity simplification
 * - Back-substitution using triangle method
 * - Integration of resulting trigonometric expressions
 */
export const trigSubstitutionIntegrator: Integrator = {
	name: 'trig-substitution',
	priority: 40,

	canIntegrate(expr: MathNode, variable: string): boolean {
		// Check if expression contains a trigonometric substitution pattern
		const pattern = detectTrigSubPattern(expr, variable);
		return pattern !== null;
	},

	integrate(
		expr: MathNode,
		variable: string,
		options: ResolvedIntegrateOptions,
		recorder: IntegrateStepRecorder,
		_depth: number
	): IntegrateResult {
		// Step 1: Detect the pattern
		const pattern = detectTrigSubPattern(expr, variable);

		if (!pattern) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: 'radical',
				technique: 'trig-substitution',
				steps: recorder.getSteps(),
				error: 'No trigonometric substitution pattern detected'
			};
		}

		// Step 2: Record pattern identification
		recorder.recordStepByRule('identify-trig-sub', expr, expr, 'detailed', undefined, undefined);

		// Get pattern-specific description
		const patternDesc = getPatternDescription(pattern.pattern, pattern.a, variable);
		recorder.recordCustomStep('trig-sub-pattern', expr, expr, 'detailed', undefined, patternDesc);

		// Step 3: Apply the substitution
		recorder.recordStepByRule('apply-trig-sub', expr, expr, 'detailed', undefined, undefined);

		const transformed = applyTrigSubstitution(expr, pattern, variable);
		if (!transformed) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: 'radical',
				technique: 'trig-substitution',
				steps: recorder.getSteps(),
				error: 'Trigonometric substitution transformation not yet fully implemented'
			};
		}

		// Step 4: Simplify trig expression
		recorder.recordStepByRule('simplify-trig', transformed, transformed, 'detailed');

		// Step 5: Integrate in θ (would require recursive call to integrate)
		// For skeleton: not implemented

		// Step 6: Back-substitute to original variable
		recorder.recordStepByRule(
			'back-substitute-trig',
			transformed,
			transformed,
			'detailed',
			undefined,
			undefined
		);

		// For skeleton: return unsupported
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: 'radical',
			technique: 'trig-substitution',
			steps: recorder.getSteps(),
			error: 'Trigonometric substitution skeleton - full implementation pending',
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a description of the substitution pattern.
 */
function getPatternDescription(pattern: TrigSubPattern, a: MathNode, variable: string): string {
	const aStr = isNumber(a) && a.value === '1' ? '' : `${a.type === 'number' ? a.value : 'a'}`;
	const aSquared = isNumber(a) && a.value === '1' ? '1' : `${aStr}²`;

	switch (pattern) {
		case 'sin':
			return `Pattern détecté: √(${aSquared}-${variable}²). Substitution: ${variable} = ${aStr}sin(θ)`;
		case 'tan':
			return `Pattern détecté: √(${aSquared}+${variable}²). Substitution: ${variable} = ${aStr}tan(θ)`;
		case 'sec':
			return `Pattern détecté: √(${variable}²-${aSquared}). Substitution: ${variable} = ${aStr}sec(θ)`;
	}
}
