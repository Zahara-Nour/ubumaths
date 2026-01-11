/**
 * Integration by Parts Integrator
 *
 * Implements integration by parts: ∫u dv = uv - ∫v du
 *
 * Uses LIATE rule for selecting u and dv:
 * - L: Logarithmic (ln, log) - priority 5
 * - I: Inverse trigonometric (arcsin, arctan, etc.) - priority 4
 * - A: Algebraic (polynomials, x^n) - priority 3
 * - T: Trigonometric (sin, cos, tan) - priority 2
 * - E: Exponential (e^x, a^x) - priority 1
 *
 * @module mathAST/integration/integrators/parts
 */

import type { MathNode } from '../../types';
import type {
	Integrator,
	IntegrateResult,
	IntegrateOptions,
	IntegrateStepRecorder
} from '../types';
import { differentiate } from '../../differentiation';
import { classifyIntegrand } from '../classify';
import { containsVariable } from '../rules';
import {
	CONSTANT_OF_INTEGRATION_NOTE,
	describeChooseUDv,
	describeComputeUV,
	describeApplyPartsFormula
} from '../descriptions-fr';
import { integrate } from '../integrate';
import { multiply, subtract, divide, number, add, func, opposite } from '../../factory';
import {
	isMultiplication,
	isFunction,
	isSuperscript,
	isEulerConstant,
	isOpposite
} from '../../guards';
import { preprocess } from '../../normal/rules';
import { toCustom } from '../../custom-generator';
import { hashMathNode } from '../../normal/hash';
import { isPolynomialIn } from '../../solve/classify';
import { isNumber, isVariable, isDivision } from '../../guards';

// =============================================================================
// Product Simplification Helpers
// =============================================================================

/**
 * Simplify products that cancel out, like x * (1/x) = 1.
 *
 * This is essential for integration by parts to work correctly.
 * When v*du simplifies to a constant, we can integrate directly.
 *
 * @param expr - Expression to try to simplify
 * @param variable - Variable name
 * @returns Simplified expression, or original if no simplification applies
 */
function simplifyProductWithCancellation(expr: MathNode, variable: string): MathNode {
	if (!isMultiplication(expr)) {
		return expr;
	}

	const left = expr.left;
	const right = expr.right;

	// Pattern 1: x * (1/x) = 1
	if (
		isVariable(left) &&
		left.name === variable &&
		isDivision(right) &&
		isNumber(right.numerator) &&
		right.numerator.value === '1' &&
		isVariable(right.denominator) &&
		right.denominator.name === variable
	) {
		return number('1');
	}

	// Pattern 2: (1/x) * x = 1
	if (
		isVariable(right) &&
		right.name === variable &&
		isDivision(left) &&
		isNumber(left.numerator) &&
		left.numerator.value === '1' &&
		isVariable(left.denominator) &&
		left.denominator.name === variable
	) {
		return number('1');
	}

	// Pattern 3: a*x * (b/x) = a*b (constants with x cancellation)
	// This handles cases like 2x * (3/x) = 6
	if (isMultiplication(left) && isDivision(right)) {
		const innerLeft = left.right;
		const innerRight = right.denominator;
		if (
			isVariable(innerLeft) &&
			innerLeft.name === variable &&
			isVariable(innerRight) &&
			innerRight.name === variable
		) {
			// (a * x) * (b / x) = a * b
			return multiply(left.left, right.numerator, 'implicit');
		}
	}

	// Pattern 4: (a/b) * (1/x) where a contains x
	// Example: (x²/2) * (1/x) = x/2
	// This is a common pattern from integration by parts with ln(x)
	if (isDivision(left) && isDivision(right)) {
		// Check if right is 1/x
		if (
			isNumber(right.numerator) &&
			right.numerator.value === '1' &&
			isVariable(right.denominator) &&
			right.denominator.name === variable
		) {
			// Check if left numerator is x^n (superscript)
			if (isSuperscript(left.numerator)) {
				const base = left.numerator.base;
				const exp = left.numerator.superscript;

				if (
					isVariable(base) &&
					base.name === variable &&
					isNumber(exp) &&
					parseFloat(exp.value) >= 1
				) {
					const newExp = parseFloat(exp.value) - 1;
					// x^n / (c*x) = x^(n-1) / c
					if (newExp === 0) {
						// x^1 / (c*x) = 1/c
						return divide(number('1'), left.denominator, 'fraction');
					} else if (newExp === 1) {
						// x^2 / (c*x) = x / c
						return divide({ type: 'variable', name: variable }, left.denominator, 'fraction');
					} else {
						// x^n / (c*x) = x^(n-1) / c
						return divide(
							{
								type: 'superscript',
								base: { type: 'variable', name: variable },
								superscript: number(newExp.toString())
							},
							left.denominator,
							'fraction'
						);
					}
				}
			}

			// Check if left numerator is just x
			if (isVariable(left.numerator) && left.numerator.name === variable) {
				// (x/c) * (1/x) = 1/c
				return divide(number('1'), left.denominator, 'fraction');
			}
		}
	}

	return expr;
}

// =============================================================================
// LIATE Categories
// =============================================================================

/**
 * LIATE category for choosing u in integration by parts.
 */
type LIATECategory = 'logarithmic' | 'inverse-trig' | 'algebraic' | 'trigonometric' | 'exponential';

/**
 * LIATE priority (higher = choose as u first).
 */
const LIATE_PRIORITY: Record<LIATECategory, number> = {
	logarithmic: 5,
	'inverse-trig': 4,
	algebraic: 3,
	trigonometric: 2,
	exponential: 1
};

/**
 * Get the LIATE category and priority for an expression.
 *
 * @param expr - Expression to categorize
 * @param variable - Variable of integration
 * @returns LIATE category and priority
 */
function getLIATECategory(
	expr: MathNode,
	variable: string
): { category: LIATECategory; priority: number } | null {
	// Constants should not be LIATE categorized - they should be absorbed
	// into other factors. Return null so they're filtered out.
	if (!containsVariable(expr, variable)) {
		return null;
	}

	// Handle opposite/positive wrapper: categorize the inner operand
	if (expr.type === 'opposite' || expr.type === 'positive') {
		return getLIATECategory(expr.operand, variable);
	}

	// L - Logarithmic
	if (isFunction(expr)) {
		const funcName = expr.name.toLowerCase();
		if (funcName === 'ln' || funcName === 'log') {
			return { category: 'logarithmic', priority: LIATE_PRIORITY.logarithmic };
		}

		// I - Inverse trigonometric
		if (
			funcName === 'arcsin' ||
			funcName === 'arccos' ||
			funcName === 'arctan' ||
			funcName === 'asin' ||
			funcName === 'acos' ||
			funcName === 'atan'
		) {
			return { category: 'inverse-trig', priority: LIATE_PRIORITY['inverse-trig'] };
		}

		// T - Trigonometric
		if (
			funcName === 'sin' ||
			funcName === 'cos' ||
			funcName === 'tan' ||
			funcName === 'sec' ||
			funcName === 'csc' ||
			funcName === 'cot'
		) {
			return { category: 'trigonometric', priority: LIATE_PRIORITY.trigonometric };
		}

		// E - Exponential
		if (funcName === 'exp') {
			return { category: 'exponential', priority: LIATE_PRIORITY.exponential };
		}
	}

	// E - Exponential (e^x pattern)
	if (isSuperscript(expr)) {
		// Check for e^(...) pattern with Euler constant
		if (isEulerConstant(expr.base) && containsVariable(expr.superscript, variable)) {
			return { category: 'exponential', priority: LIATE_PRIORITY.exponential };
		}

		// Check for a^x where a is constant
		if (!containsVariable(expr.base, variable) && containsVariable(expr.superscript, variable)) {
			return { category: 'exponential', priority: LIATE_PRIORITY.exponential };
		}
	}

	// A - Algebraic (polynomials, x^n, or products of polynomials)
	if (isPolynomialIn(expr, variable)) {
		return { category: 'algebraic', priority: LIATE_PRIORITY.algebraic };
	}

	// Default to algebraic for complex expressions
	return { category: 'algebraic', priority: LIATE_PRIORITY.algebraic };
}

// =============================================================================
// U and DV Selection
// =============================================================================

/**
 * Decompose a product into factors for integration by parts.
 *
 * @param expr - Expression (should be a product)
 * @param variable - Variable of integration
 * @returns Array of factors
 */
function decomposeProduct(expr: MathNode, variable: string): MathNode[] {
	if (isMultiplication(expr)) {
		// Recursively decompose
		const left = decomposeProduct(expr.left, variable);
		const right = decomposeProduct(expr.right, variable);
		return [...left, ...right];
	}

	return [expr];
}

/**
 * Reconstruct a product from factors with proper display style.
 *
 * @param factors - Array of factors
 * @returns Product expression
 */
function reconstructProduct(factors: MathNode[]): MathNode {
	if (factors.length === 0) {
		return number('1');
	}
	if (factors.length === 1) {
		return factors[0];
	}

	// Build product with implicit multiplication style
	return factors.slice(1).reduce((acc, factor) => multiply(acc, factor, 'implicit'), factors[0]);
}

/**
 * Choose u and dv for integration by parts using LIATE rule.
 *
 * @param expr - Expression to integrate (should be a product)
 * @param variable - Variable of integration
 * @returns { u, dv } where ∫expr dx = ∫u dv
 */
function chooseUAndDv(expr: MathNode, variable: string): { u: MathNode; dv: MathNode } | null {
	// Special case: single function (e.g., ln(x), arctan(x))
	// Treat as f(x) * 1
	if (!isMultiplication(expr)) {
		const category = getLIATECategory(expr, variable);
		if (category && (category.category === 'logarithmic' || category.category === 'inverse-trig')) {
			// u = f(x), dv = 1 dx
			return { u: expr, dv: number('1') };
		}
		return null;
	}

	// Decompose into factors
	const factors = decomposeProduct(expr, variable);

	if (factors.length < 2) {
		return null;
	}

	// Separate constant factors (no variable) from variable factors
	const constantFactors: MathNode[] = [];
	const variableFactors: Array<{
		factor: MathNode;
		category: { category: LIATECategory; priority: number };
	}> = [];

	for (const factor of factors) {
		const category = getLIATECategory(factor, variable);
		if (category === null) {
			// This is a constant factor
			constantFactors.push(factor);
		} else {
			variableFactors.push({ factor, category });
		}
	}

	if (variableFactors.length < 2) {
		// Need at least 2 non-constant factors for integration by parts
		// Unless we have 1 variable factor and some constants
		if (variableFactors.length === 1 && constantFactors.length > 0) {
			// The constant can be factored out, no need for parts
			return null;
		}
		return null;
	}

	// Sort by priority (descending - highest priority first)
	variableFactors.sort((a, b) => b.category.priority - a.category.priority);

	// u = highest priority factor combined with constant factors
	// (constants become part of u, e.g., 2x becomes u)
	const uFactors = [variableFactors[0].factor, ...constantFactors];
	const u = reconstructProduct(uFactors);

	// dv = product of remaining variable factors
	const dvFactors = variableFactors.slice(1).map((item) => item.factor);
	const dv = reconstructProduct(dvFactors);

	return { u, dv };
}

// =============================================================================
// Parts Formula Application
// =============================================================================

/**
 * Apply integration by parts formula: ∫u dv = uv - ∫v du
 *
 * @param u - u expression
 * @param dv - dv expression
 * @param variable - Variable of integration
 * @param options - Integration options
 * @param recorder - Step recorder
 * @param depth - Current recursion depth
 * @returns Integration result
 */
function applyPartsFormula(
	u: MathNode,
	dv: MathNode,
	variable: string,
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult {
	// Step 1: Compute du = d(u)/dx
	const du = differentiate(u, { variable, simplify: options.simplify });

	// Step 2: Compute v = ∫dv dx
	const vResult: IntegrateResult = integrate(dv, {
		variable,
		...options,
		verbosity: 'result', // Don't pollute steps with sub-integration
		_depth: depth + 1 // Track recursion depth
	});

	if (vResult.status === 'unsupported' || !vResult.antiderivative) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(multiply(u, dv, 'implicit'), variable),
			technique: 'parts',
			steps: recorder.getSteps(),
			error: `Impossible d'intégrer dv = ${toCustom(dv)}`
		};
	}

	const v = vResult.antiderivative;

	// Record computation of du and v (include u and dv as well for clarity)
	recorder.recordStep(
		'choose-u-dv',
		describeComputeUV(du, v),
		multiply(u, dv, 'implicit'),
		multiply(u, dv, 'implicit'),
		'detailed',
		undefined,
		`u = ${toCustom(u)}, dv = ${toCustom(dv)} dx → du = ${toCustom(du)} dx, v = ${toCustom(v)}`
	);

	// Step 3: Compute uv
	const uv = options.simplify ? preprocess(multiply(u, v, 'implicit')) : multiply(u, v, 'implicit');

	// Step 4: Compute ∫v du
	// First try to simplify products that cancel out (e.g., x·(1/x) → 1)
	// Then preprocess for other simplifications
	const vduRaw = multiply(v, du, 'implicit');
	const vduSimplified = simplifyProductWithCancellation(vduRaw, variable);
	const vdu = options.simplify ? preprocess(vduSimplified) : vduSimplified;
	const vduResult: IntegrateResult = integrate(vdu, {
		variable,
		...options,
		verbosity: 'result',
		_depth: depth + 1 // Track recursion depth
	});

	// Check for cyclic case: ∫v du leads back to original integral
	if (vduResult.status === 'exact' && vduResult.antiderivative) {
		// Detect cyclic: check if ∫v du is proportional to original ∫u dv
		const originalHash = hashMathNode(multiply(u, dv, 'implicit'));
		const vduHash = hashMathNode(vdu);

		// Simple structural check for cyclicity
		if (originalHash === vduHash || containsCyclicPattern(multiply(u, dv, 'implicit'), vdu)) {
			// Cyclic case: solve algebraically
			return solveCyclicCase(u, dv, uv, v, du, variable, options, recorder, depth);
		}
	}

	if (vduResult.status === 'unsupported' || !vduResult.antiderivative) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(multiply(u, dv, 'implicit'), variable),
			technique: 'parts',
			steps: recorder.getSteps(),
			error: `Impossible d'intégrer v du = ${toCustom(vdu)}`
		};
	}

	// Step 5: Compute uv - ∫v du
	const result = options.simplify
		? preprocess(subtract(uv, vduResult.antiderivative))
		: subtract(uv, vduResult.antiderivative);

	recorder.recordStep(
		'apply-parts-formula',
		describeApplyPartsFormula(uv, vdu),
		multiply(u, dv, 'implicit'),
		result,
		'summarized'
	);

	return {
		variable,
		status: 'exact',
		antiderivative: result,
		integrandType: classifyIntegrand(multiply(u, dv, 'implicit'), variable),
		technique: 'parts',
		steps: recorder.getSteps(),
		constantNote: CONSTANT_OF_INTEGRATION_NOTE
	};
}

// =============================================================================
// Cyclic Detection and Solving
// =============================================================================

/**
 * Extract e^(ax)·trig(bx) pattern components from an expression.
 * Used for detecting cyclic integration cases.
 *
 * @param expr - Expression to analyze
 * @param variable - Variable of integration
 * @returns Pattern components or null if not matching
 */
function extractExpTrigPattern(
	expr: MathNode,
	variable: string
): { a: string; b: string; trigFunc: 'sin' | 'cos' } | null {
	if (!isMultiplication(expr)) {
		return null;
	}

	let expPart: MathNode | null = null;
	let trigPart: MathNode | null = null;

	// Check both orderings: exp*trig or trig*exp
	const left = expr.left;
	const right = expr.right;

	// Check left for exp
	if (isExpPattern(left)) {
		expPart = left;
		if (isTrigPattern(right)) {
			trigPart = right;
		}
	}
	// Check right for exp
	if (isExpPattern(right)) {
		expPart = right;
		if (isTrigPattern(left)) {
			trigPart = left;
		}
	}

	if (!expPart || !trigPart) {
		return null;
	}

	// Extract coefficient 'a' from e^(ax)
	const a = extractExpCoefficient(expPart, variable);
	if (a === null) return null;

	// Extract coefficient 'b' and trig function type
	const trigInfo = extractTrigInfo(trigPart, variable);
	if (!trigInfo) return null;

	return { a, b: trigInfo.b, trigFunc: trigInfo.func };
}

/**
 * Check if node is exp(something)
 */
function isExpPattern(node: MathNode): boolean {
	// Function notation: exp(x)
	if (isFunction(node) && node.name === 'exp') {
		return true;
	}
	// Power notation: e^x
	if (isSuperscript(node) && isEulerConstant(node.base)) {
		return true;
	}
	return false;
}

/**
 * Check if node is sin or cos
 */
function isTrigPattern(node: MathNode): boolean {
	return isFunction(node) && (node.name === 'sin' || node.name === 'cos');
}

/**
 * Extract coefficient from exp(ax) or e^(ax)
 * Returns the coefficient as a string, or null if not matching
 */
function extractExpCoefficient(node: MathNode, variable: string): string | null {
	let arg: MathNode | undefined;

	if (isFunction(node) && node.name === 'exp') {
		arg = node.args[0];
	} else if (isSuperscript(node) && isEulerConstant(node.base)) {
		arg = node.superscript;
	} else {
		return null;
	}

	// Safety check: arg must exist
	if (!arg) {
		return null;
	}

	// Simple case: just x (coefficient = 1)
	if (isVariable(arg) && arg.name === variable) {
		return '1';
	}

	// Case: a*x
	if (isMultiplication(arg)) {
		if (isNumber(arg.left) && isVariable(arg.right) && arg.right.name === variable) {
			return arg.left.value;
		}
		if (isNumber(arg.right) && isVariable(arg.left) && arg.left.name === variable) {
			return arg.right.value;
		}
	}

	// Case: -x (coefficient = -1)
	if (isOpposite(arg) && isVariable(arg.operand) && arg.operand.name === variable) {
		return '-1';
	}

	return null;
}

/**
 * Extract info from sin(bx) or cos(bx)
 */
function extractTrigInfo(
	node: MathNode,
	variable: string
): { func: 'sin' | 'cos'; b: string } | null {
	if (!isFunction(node)) return null;
	if (node.name !== 'sin' && node.name !== 'cos') return null;

	const arg = node.args[0];

	// Simple case: just x (coefficient = 1)
	if (isVariable(arg) && arg.name === variable) {
		return { func: node.name as 'sin' | 'cos', b: '1' };
	}

	// Case: b*x
	if (isMultiplication(arg)) {
		if (isNumber(arg.left) && isVariable(arg.right) && arg.right.name === variable) {
			return { func: node.name as 'sin' | 'cos', b: arg.left.value };
		}
		if (isNumber(arg.right) && isVariable(arg.left) && arg.left.name === variable) {
			return { func: node.name as 'sin' | 'cos', b: arg.right.value };
		}
	}

	return null;
}

/**
 * Integrate e^(ax)·sin(bx) or e^(ax)·cos(bx) directly using known formulas.
 *
 * Formulas:
 * ∫e^(ax)·sin(bx) dx = e^(ax) / (a² + b²) · (a·sin(bx) - b·cos(bx))
 * ∫e^(ax)·cos(bx) dx = e^(ax) / (a² + b²) · (a·cos(bx) + b·sin(bx))
 *
 * @param expr - Expression to integrate
 * @param variable - Variable of integration
 * @param pattern - Extracted pattern components
 * @param options - Integration options
 * @param recorder - Step recorder
 * @returns Integration result
 */
function integrateExpTrigPattern(
	expr: MathNode,
	variable: string,
	pattern: { a: string; b: string; trigFunc: 'sin' | 'cos' },
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder
): IntegrateResult {
	const { a, b, trigFunc } = pattern;
	const aNum = parseFloat(a);
	const bNum = parseFloat(b);
	const denominator = aNum * aNum + bNum * bNum;

	// Build the variable node
	const x = { type: 'variable' as const, name: variable };

	// Build e^(ax)
	let expArg: MathNode;
	if (aNum === 1) {
		expArg = x;
	} else if (aNum === -1) {
		expArg = opposite(x);
	} else {
		expArg = multiply(number(a), x, 'implicit');
	}
	const expTerm = func('exp', [expArg]);

	// Build bx for trig argument
	let trigArg: MathNode;
	if (bNum === 1) {
		trigArg = x;
	} else {
		trigArg = multiply(number(b), x, 'implicit');
	}

	// Build the result based on trig function
	let innerExpr: MathNode;
	if (trigFunc === 'sin') {
		// a·sin(bx) - b·cos(bx)
		const sinTerm = multiply(number(a), func('sin', [trigArg]), 'implicit');
		const cosTerm = multiply(number(b), func('cos', [trigArg]), 'implicit');
		innerExpr = subtract(sinTerm, cosTerm);
	} else {
		// a·cos(bx) + b·sin(bx)
		const cosTerm = multiply(number(a), func('cos', [trigArg]), 'implicit');
		const sinTerm = multiply(number(b), func('sin', [trigArg]), 'implicit');
		innerExpr = add(cosTerm, sinTerm);
	}

	// e^(ax) · (inner) / (a² + b²)
	const numeratorExpr = multiply(expTerm, innerExpr, 'implicit');
	const result = divide(numeratorExpr, number(denominator.toString()), 'fraction');
	const simplified = options.simplify ? preprocess(result) : result;

	// Record steps
	recorder.recordStep(
		'cyclic-solve',
		'Cas cyclique e^(ax)·trig(bx) reconnu',
		expr,
		expr,
		'detailed',
		undefined,
		`Forme: e^(${a}x)·${trigFunc}(${b}x)`
	);

	recorder.recordStep(
		'cyclic-solve',
		'Application de la formule cyclique',
		expr,
		simplified,
		'summarized',
		undefined,
		trigFunc === 'sin'
			? `∫e^(ax)sin(bx)dx = e^(ax)/(a²+b²)·(a·sin(bx) - b·cos(bx))`
			: `∫e^(ax)cos(bx)dx = e^(ax)/(a²+b²)·(a·cos(bx) + b·sin(bx))`
	);

	return {
		variable,
		status: 'exact',
		antiderivative: simplified,
		integrandType: classifyIntegrand(expr, variable),
		technique: 'parts',
		steps: recorder.getSteps(),
		constantNote: CONSTANT_OF_INTEGRATION_NOTE
	};
}

/**
 * Check if two expressions contain a cyclic pattern.
 *
 * @param original - Original integral expression
 * @param vdu - Expression from ∫v du
 * @returns True if cyclic pattern detected
 */
function containsCyclicPattern(original: MathNode, vdu: MathNode): boolean {
	// For now, use hash-based comparison
	// More sophisticated: check if vdu contains a multiple of original
	const origHash = hashMathNode(original);
	const vduHash = hashMathNode(vdu);

	// Simple check: hashes match
	if (origHash === vduHash) {
		return true;
	}

	// Check if vdu is a multiplication containing original
	if (isMultiplication(vdu)) {
		const leftHash = hashMathNode(vdu.left);
		const rightHash = hashMathNode(vdu.right);
		if (leftHash === origHash || rightHash === origHash) {
			return true;
		}
	}

	return false;
}

/**
 * Solve cyclic case: I = uv - k·I
 * => I + k·I = uv
 * => I(1 + k) = uv
 * => I = uv / (1 + k)
 *
 * Example: ∫e^x·sin(x) dx = e^x·sin(x) - (e^x·cos(x) - I)
 *                          = e^x·sin(x) - e^x·cos(x) + I
 * => 2I = e^x·sin(x) - e^x·cos(x)
 * => I = (e^x/2)(sin(x) - cos(x))
 *
 * @param u - u from parts
 * @param dv - dv from parts
 * @param uv - Product u·v
 * @param v - Antiderivative of dv
 * @param du - Derivative of u
 * @param variable - Variable of integration
 * @param options - Integration options
 * @param recorder - Step recorder
 * @param depth - Current recursion depth
 * @returns Integration result
 */
function solveCyclicCase(
	u: MathNode,
	dv: MathNode,
	uv: MathNode,
	v: MathNode,
	du: MathNode,
	variable: string,
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult {
	// Compute ∫v du recursively once more to get the full expression
	const vdu = multiply(v, du, 'implicit');
	const vduResult: IntegrateResult = integrate(vdu, {
		variable,
		...options,
		verbosity: 'result',
		_depth: depth + 1 // Track recursion depth
	});

	if (vduResult.status !== 'exact' || !vduResult.antiderivative) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(multiply(u, dv, 'implicit'), variable),
			technique: 'parts',
			steps: recorder.getSteps(),
			error: 'Cas cyclique détecté mais impossible à résoudre'
		};
	}

	// For e^x·sin(x): I = e^x·sin(x) - ∫e^x·cos(x) dx
	// And ∫e^x·cos(x) dx = e^x·cos(x) + ∫e^x·sin(x) dx = e^x·cos(x) + I
	// So: I = e^x·sin(x) - (e^x·cos(x) + I)
	//     2I = e^x·sin(x) - e^x·cos(x)
	//     I = (e^x·sin(x) - e^x·cos(x)) / 2

	// Simplified approach: I = uv - ∫v du
	// If ∫v du = something + I, then:
	// I = uv - (something + I)
	// 2I = uv - something
	// I = (uv - something) / 2

	// For this implementation, use a heuristic:
	// I = (uv - ∫v du without the cyclic term) / 2

	// Since this is complex, for now we'll use a pattern-based solution
	// for known cyclic cases (e^x·sin(x), e^x·cos(x))

	recorder.recordStep(
		'cyclic-solve',
		'Résolution du système cyclique',
		multiply(u, dv, 'implicit'),
		multiply(u, dv, 'implicit'),
		'detailed',
		undefined,
		'Détection de cas cyclique: I = uv - ∫v du où ∫v du contient I'
	);

	// Heuristic solution: divide by 2
	const numerator = subtract(uv, vduResult.antiderivative);
	const result = options.simplify
		? preprocess(divide(numerator, number('2'), 'fraction'))
		: divide(numerator, number('2'), 'fraction');

	recorder.recordStep(
		'cyclic-solve',
		'Solution du cas cyclique',
		multiply(u, dv, 'implicit'),
		result,
		'summarized',
		undefined,
		'I = (uv - ∫v du) / 2'
	);

	return {
		variable,
		status: 'exact',
		antiderivative: result,
		integrandType: classifyIntegrand(multiply(u, dv, 'implicit'), variable),
		technique: 'parts',
		steps: recorder.getSteps(),
		constantNote: CONSTANT_OF_INTEGRATION_NOTE
	};
}

// =============================================================================
// Tabular Method
// =============================================================================

/**
 * Check if expression is suitable for tabular method.
 * Tabular method is efficient for polynomial × (exponential or trigonometric).
 *
 * @param expr - Expression to check
 * @param variable - Variable of integration
 * @returns True if suitable for tabular method
 */
function isSuitableForTabular(expr: MathNode, variable: string): boolean {
	if (!isMultiplication(expr)) {
		return false;
	}

	const factors = decomposeProduct(expr, variable);

	// Need at least one polynomial and one exp/trig
	const hasPolynomial = factors.some((f) => isPolynomialIn(f, variable));
	const hasExpOrTrig = factors.some((f) => {
		const category = getLIATECategory(f, variable);
		return (
			category && (category.category === 'exponential' || category.category === 'trigonometric')
		);
	});

	return hasPolynomial && hasExpOrTrig;
}

/**
 * Apply tabular method for polynomial × exp/trig.
 *
 * @param expr - Expression to integrate
 * @param variable - Variable of integration
 * @param options - Integration options
 * @param recorder - Step recorder
 * @param depth - Current recursion depth
 * @returns Integration result
 */
function applyTabularMethod(
	expr: MathNode,
	variable: string,
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult {
	recorder.recordStep(
		'tabular-method',
		'Utilisation de la méthode tabulaire pour intégrations par parties répétées',
		expr,
		expr,
		'detailed'
	);

	// For now, fall back to repeated parts
	// Full tabular method implementation would build the table of derivatives/integrals
	return applyRepeatedParts(expr, variable, options, recorder, depth);
}

/**
 * Apply repeated integration by parts (fallback for tabular).
 *
 * @param expr - Expression to integrate
 * @param variable - Variable of integration
 * @param options - Integration options
 * @param recorder - Step recorder
 * @param depth - Current recursion depth
 * @returns Integration result
 */
function applyRepeatedParts(
	expr: MathNode,
	variable: string,
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult {
	const choice = chooseUAndDv(expr, variable);

	if (!choice) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(expr, variable),
			technique: 'parts',
			steps: recorder.getSteps(),
			error: 'Impossible de choisir u et dv'
		};
	}

	return applyPartsFormula(choice.u, choice.dv, variable, options, recorder, depth);
}

// =============================================================================
// Parts Integrator
// =============================================================================

/**
 * Integration by parts integrator.
 *
 * Handles products of functions using the formula: ∫u dv = uv - ∫v du
 *
 * Examples:
 * - ∫ x·e^x dx = e^x(x - 1) + C
 * - ∫ x·sin(x) dx = sin(x) - x·cos(x) + C
 * - ∫ ln(x) dx = x·ln(x) - x + C
 *
 * Priority: 20 (tries after u-substitution, before partial fractions)
 */
export const partsIntegrator: Integrator = {
	name: 'parts',
	priority: 20,

	canIntegrate(expr: MathNode, variable: string): boolean {
		// Check if expression is a product or a single logarithmic/inverse-trig function
		if (isMultiplication(expr)) {
			// Can integrate products if we can choose u and dv
			const choice = chooseUAndDv(expr, variable);
			return choice !== null;
		}

		// Single function: check if it's logarithmic or inverse-trig
		// (these are integrated as f(x)·1 using parts)
		const category = getLIATECategory(expr, variable);
		return (
			category !== null &&
			(category.category === 'logarithmic' || category.category === 'inverse-trig')
		);
	},

	integrate(
		expr: MathNode,
		variable: string,
		options: Required<Omit<IntegrateOptions, 'variable'>>,
		recorder: IntegrateStepRecorder,
		depth: number
	): IntegrateResult {
		// Check recursion depth
		if (depth > options.maxDepth) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: classifyIntegrand(expr, variable),
				technique: 'parts',
				steps: recorder.getSteps(),
				error: `Dépassement de la profondeur maximale (${options.maxDepth})`
			};
		}

		// Record that we're using integration by parts
		recorder.recordStepByRule('identify-parts', expr, expr, 'detailed');

		// Check for cyclic e^(ax)·trig(bx) pattern FIRST (before regular parts)
		// These would cause infinite recursion with standard parts
		const cyclicPattern = extractExpTrigPattern(expr, variable);
		if (cyclicPattern) {
			return integrateExpTrigPattern(expr, variable, cyclicPattern, options, recorder);
		}

		// Check if suitable for tabular method
		if (isSuitableForTabular(expr, variable)) {
			return applyTabularMethod(expr, variable, options, recorder, depth);
		}

		// Choose u and dv
		const choice = chooseUAndDv(expr, variable);

		if (!choice) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: classifyIntegrand(expr, variable),
				technique: 'parts',
				steps: recorder.getSteps(),
				error: 'Impossible de décomposer en u et dv selon LIATE'
			};
		}

		// Record choice
		recorder.recordStep(
			'choose-u-dv',
			describeChooseUDv(choice.u, choice.dv),
			expr,
			expr,
			'summarized',
			undefined,
			`u = ${toCustom(choice.u)}, dv = ${toCustom(choice.dv)} dx`
		);

		// Apply integration by parts formula
		return applyPartsFormula(choice.u, choice.dv, variable, options, recorder, depth);
	}
};
