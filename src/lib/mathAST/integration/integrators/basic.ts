/**
 * Basic Integrator
 *
 * Handles basic integration rules: power rule, constants, exp, trig, ln.
 *
 * @module mathAST/integration/integrators/basic
 */

import type { MathNode } from '../../types';
import type {
	Integrator,
	IntegrateResult,
	IntegrateOptions,
	IntegrateStepRecorder
} from '../types';
import { isNumber, isVariable, isEulerConstant } from '../../guards';
import { number, power } from '../../factory';
import {
	powerRule,
	constantRule,
	lnAbsRule,
	expRule,
	sinRule,
	cosRule,
	tanRule,
	arctanRule,
	arcsinRule,
	containsVariable,
	getNumericValue
} from '../rules';
import { classifyIntegrand } from '../classify';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';

// =============================================================================
// Pattern Matching Helpers
// =============================================================================

/**
 * Check if expression is a constant (doesn't contain the variable)
 */
function isConstant(expr: MathNode, variable: string): boolean {
	return !containsVariable(expr, variable);
}

/**
 * Check if expression is x^n where x is the variable
 */
function isPowerOfVariable(expr: MathNode, variable: string): { n: MathNode } | null {
	if (expr.type === 'superscript') {
		if (isVariable(expr.base) && expr.base.name === variable) {
			return { n: expr.superscript };
		}
	}
	return null;
}

/**
 * Check if expression is 1/x
 */
function isOneOverX(expr: MathNode, variable: string): boolean {
	if (expr.type === 'division') {
		// Check if numerator is 1
		if (isNumber(expr.numerator) && expr.numerator.value === '1') {
			// Check if denominator is the variable
			if (isVariable(expr.denominator) && expr.denominator.name === variable) {
				return true;
			}
		}
	}
	// Also check for x^(-1)
	if (expr.type === 'superscript') {
		if (isVariable(expr.base) && expr.base.name === variable) {
			if (expr.superscript.type === 'opposite' && isNumber(expr.superscript.operand)) {
				return expr.superscript.operand.value === '1';
			}
		}
	}
	return false;
}

/**
 * Check if expression is exp(u) or e^u where u contains only the variable.
 *
 * Handles both:
 * - exp(x), exp(ax) - function notation
 * - e^x, e^(ax) - power notation with Euler constant
 */
function isExponential(expr: MathNode, variable: string): { arg: MathNode } | null {
	// Case 1: exp(x) function notation
	if (expr.type === 'function' && expr.name === 'exp') {
		const arg = expr.args[0];
		// Simple case: exp(x) or exp(ax)
		if (isVariable(arg) && arg.name === variable) {
			return { arg };
		}
		if (arg.type === 'multiplication') {
			// exp(a*x)
			if (isNumber(arg.left) && isVariable(arg.right) && arg.right.name === variable) {
				return { arg };
			}
			if (isNumber(arg.right) && isVariable(arg.left) && arg.left.name === variable) {
				return { arg };
			}
		}
		return null;
	}

	// Case 2: e^x power notation with Euler constant as base
	if (expr.type === 'superscript' && isEulerConstant(expr.base)) {
		const arg = expr.superscript;
		// e^x
		if (isVariable(arg) && arg.name === variable) {
			return { arg };
		}
		// e^(ax)
		if (arg.type === 'multiplication') {
			if (isNumber(arg.left) && isVariable(arg.right) && arg.right.name === variable) {
				return { arg };
			}
			if (isNumber(arg.right) && isVariable(arg.left) && arg.left.name === variable) {
				return { arg };
			}
		}
		return null;
	}

	return null;
}

/**
 * Check if expression is sin(x)
 */
function isSine(expr: MathNode, variable: string): { arg: MathNode } | null {
	if (expr.type === 'function' && expr.name === 'sin') {
		const arg = expr.args[0];
		if (isVariable(arg) && arg.name === variable) {
			return { arg };
		}
	}
	return null;
}

/**
 * Check if expression is cos(x)
 */
function isCosine(expr: MathNode, variable: string): { arg: MathNode } | null {
	if (expr.type === 'function' && expr.name === 'cos') {
		const arg = expr.args[0];
		if (isVariable(arg) && arg.name === variable) {
			return { arg };
		}
	}
	return null;
}

/**
 * Check if expression is tan(x)
 */
function isTangent(expr: MathNode, variable: string): { arg: MathNode } | null {
	if (expr.type === 'function' && expr.name === 'tan') {
		const arg = expr.args[0];
		if (isVariable(arg) && arg.name === variable) {
			return { arg };
		}
	}
	return null;
}

/**
 * Check if expression matches 1/(a²+x²) pattern for arctan integration.
 *
 * Matches:
 * - 1/(1+x²) → { a: null } (a=1)
 * - 1/(a²+x²) → { a: MathNode }
 * - 1/(x²+a²) → { a: MathNode }
 */
function isArctanPattern(
	expr: MathNode,
	variable: string
): { a: MathNode | null; varNode: MathNode } | null {
	// Must be a division with numerator = 1
	if (expr.type !== 'division') return null;
	if (!isNumber(expr.numerator) || expr.numerator.value !== '1') return null;

	const denom = expr.denominator;

	// Check for (1 + x²) or (x² + 1)
	if (denom.type === 'addition') {
		const { left, right } = denom;

		// Pattern: 1 + x²
		if (isNumber(left) && left.value === '1') {
			if (right.type === 'superscript') {
				if (isVariable(right.base) && right.base.name === variable) {
					if (isNumber(right.superscript) && right.superscript.value === '2') {
						return { a: null, varNode: right.base };
					}
				}
			}
		}

		// Pattern: x² + 1
		if (isNumber(right) && right.value === '1') {
			if (left.type === 'superscript') {
				if (isVariable(left.base) && left.base.name === variable) {
					if (isNumber(left.superscript) && left.superscript.value === '2') {
						return { a: null, varNode: left.base };
					}
				}
			}
		}

		// Pattern: a² + x² or x² + a²
		// Check if one term is x² and other is constant²
		let xSquared: MathNode | null = null;
		let aSquared: MathNode | null = null;

		for (const term of [left, right]) {
			if (term.type === 'superscript') {
				if (isVariable(term.base) && term.base.name === variable) {
					if (isNumber(term.superscript) && term.superscript.value === '2') {
						xSquared = term;
					}
				} else if (!containsVariable(term.base, variable)) {
					if (isNumber(term.superscript) && term.superscript.value === '2') {
						aSquared = term;
					}
				}
			} else if (!containsVariable(term, variable)) {
				// Could be just a number (like 4 = 2²)
				const val = getNumericValue(term);
				if (val !== null && val > 0) {
					// Treat as a² where a = √val
					aSquared = term;
				}
			}
		}

		if (xSquared && aSquared) {
			// Extract 'a' from a²
			if (aSquared.type === 'superscript') {
				return { a: aSquared.base, varNode: (xSquared as { base: MathNode }).base };
			} else {
				// It's a number, so a = √number
				const val = getNumericValue(aSquared);
				if (val !== null) {
					const sqrtVal = Math.sqrt(val);
					if (Number.isInteger(sqrtVal)) {
						return {
							a: number(sqrtVal.toString()),
							varNode: (xSquared as { base: MathNode }).base
						};
					}
				}
			}
		}
	}

	return null;
}

/**
 * Check if expression matches 1/√(a²-x²) pattern for arcsin integration.
 *
 * Matches:
 * - 1/√(1-x²) → { a: null } (a=1)
 * - 1/√(a²-x²) → { a: MathNode }
 */
function isArcsinPattern(
	expr: MathNode,
	variable: string
): { a: MathNode | null; varNode: MathNode } | null {
	// Must be a division with numerator = 1
	if (expr.type !== 'division') return null;
	if (!isNumber(expr.numerator) || expr.numerator.value !== '1') return null;

	const denom = expr.denominator;

	// Check for sqrt(...) or (...)^(1/2) or (...)^0.5
	let sqrtArg: MathNode | null = null;

	if (denom.type === 'function' && denom.name === 'sqrt') {
		sqrtArg = denom.args[0];
	} else if (denom.type === 'superscript') {
		// Check for (...)^(1/2) or (...)^0.5
		const exp = denom.superscript;
		if (isNumber(exp) && exp.value === '0.5') {
			sqrtArg = denom.base;
		} else if (exp.type === 'division') {
			if (isNumber(exp.numerator) && exp.numerator.value === '1') {
				if (isNumber(exp.denominator) && exp.denominator.value === '2') {
					sqrtArg = denom.base;
				}
			}
		}
	}

	if (!sqrtArg) return null;

	// Now check for (1 - x²) or (a² - x²)
	if (sqrtArg.type === 'subtraction') {
		const { left, right } = sqrtArg;

		// Pattern: 1 - x²
		if (isNumber(left) && left.value === '1') {
			if (right.type === 'superscript') {
				if (isVariable(right.base) && right.base.name === variable) {
					if (isNumber(right.superscript) && right.superscript.value === '2') {
						return { a: null, varNode: right.base };
					}
				}
			}
		}

		// Pattern: a² - x²
		if (left.type === 'superscript' && !containsVariable(left.base, variable)) {
			if (isNumber(left.superscript) && left.superscript.value === '2') {
				if (right.type === 'superscript') {
					if (isVariable(right.base) && right.base.name === variable) {
						if (isNumber(right.superscript) && right.superscript.value === '2') {
							return { a: left.base, varNode: right.base };
						}
					}
				}
			}
		}

		// Pattern: number - x² where number = a²
		if (!containsVariable(left, variable)) {
			const val = getNumericValue(left);
			if (val !== null && val > 0) {
				if (right.type === 'superscript') {
					if (isVariable(right.base) && right.base.name === variable) {
						if (isNumber(right.superscript) && right.superscript.value === '2') {
							const sqrtVal = Math.sqrt(val);
							if (Number.isInteger(sqrtVal)) {
								return { a: number(sqrtVal.toString()), varNode: right.base };
							}
						}
					}
				}
			}
		}
	}

	return null;
}

// =============================================================================
// Basic Integrator
// =============================================================================

/**
 * Basic integrator for simple expressions.
 *
 * Handles:
 * - Constants: ∫ c dx = cx
 * - Power rule: ∫ x^n dx = x^(n+1)/(n+1) for n ≠ -1
 * - Simple variable: ∫ x dx = x^2/2
 * - Logarithm: ∫ 1/x dx = ln|x|
 * - Exponential: ∫ e^x dx = e^x
 * - Trig: ∫ sin(x) dx = -cos(x), ∫ cos(x) dx = sin(x), ∫ tan(x) dx = -ln|cos(x)|
 * - Inverse trig: ∫ 1/(1+x²) dx = arctan(x), ∫ 1/√(1-x²) dx = arcsin(x)
 *
 * Priority: 0 (lowest - used as fallback for basic rules)
 */
export const basicIntegrator: Integrator = {
	name: 'basic',
	priority: 0,

	canIntegrate(expr: MathNode, variable: string): boolean {
		// Constant
		if (isConstant(expr, variable)) {
			return true;
		}

		// Simple variable x
		if (isVariable(expr) && expr.name === variable) {
			return true;
		}

		// x^n
		if (isPowerOfVariable(expr, variable)) {
			return true;
		}

		// 1/x
		if (isOneOverX(expr, variable)) {
			return true;
		}

		// exp(x)
		if (isExponential(expr, variable)) {
			return true;
		}

		// Trig functions
		if (isSine(expr, variable) || isCosine(expr, variable) || isTangent(expr, variable)) {
			return true;
		}

		// Inverse trig patterns
		if (isArctanPattern(expr, variable)) {
			return true;
		}

		if (isArcsinPattern(expr, variable)) {
			return true;
		}

		return false;
	},

	integrate(
		expr: MathNode,
		variable: string,
		options: Required<Omit<IntegrateOptions, 'variable'>>,
		recorder: IntegrateStepRecorder,
		_depth: number
	): IntegrateResult {
		const integrandType = classifyIntegrand(expr, variable);
		let antiderivative: MathNode;

		// Case 1: Constant
		if (isConstant(expr, variable)) {
			recorder.recordStepByRule('constant-rule', expr, expr, 'detailed');
			antiderivative = constantRule(expr, variable);
			recorder.recordStepByRule('constant-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType,
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 2: 1/x
		if (isOneOverX(expr, variable)) {
			recorder.recordStepByRule('ln-rule', expr, expr, 'detailed');
			antiderivative = lnAbsRule(
				expr.type === 'division' ? expr.denominator : power(expr, number('-1'))
			);
			recorder.recordStepByRule('ln-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'rational',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 3: x^n
		const powerMatch = isPowerOfVariable(expr, variable);
		if (powerMatch) {
			const { n } = powerMatch;
			recorder.recordStepByRule('power-rule', expr, expr, 'detailed', n);
			antiderivative = powerRule(expr.type === 'superscript' ? expr.base : expr, n, variable);
			recorder.recordStepByRule('power-rule', expr, antiderivative, 'summarized', n);

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'polynomial',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 4: Simple variable x (treat as x^1)
		if (isVariable(expr) && expr.name === variable) {
			recorder.recordStepByRule('power-rule', expr, expr, 'detailed', number('1'));
			antiderivative = powerRule(expr, number('1'), variable);
			recorder.recordStepByRule('power-rule', expr, antiderivative, 'summarized', number('1'));

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'polynomial',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 5: exp(x)
		const expMatch = isExponential(expr, variable);
		if (expMatch) {
			const { arg } = expMatch;
			recorder.recordStepByRule('exp-rule', expr, expr, 'detailed');
			antiderivative = expRule(arg);
			recorder.recordStepByRule('exp-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'exponential',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 6: sin(x)
		const sinMatch = isSine(expr, variable);
		if (sinMatch) {
			const { arg } = sinMatch;
			recorder.recordStepByRule('sin-rule', expr, expr, 'detailed');
			antiderivative = sinRule(arg);
			recorder.recordStepByRule('sin-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'trigonometric',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 7: cos(x)
		const cosMatch = isCosine(expr, variable);
		if (cosMatch) {
			const { arg } = cosMatch;
			recorder.recordStepByRule('cos-rule', expr, expr, 'detailed');
			antiderivative = cosRule(arg);
			recorder.recordStepByRule('cos-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'trigonometric',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 8: tan(x)
		const tanMatch = isTangent(expr, variable);
		if (tanMatch) {
			const { arg } = tanMatch;
			recorder.recordStepByRule('tan-rule', expr, expr, 'detailed');
			antiderivative = tanRule(arg);
			recorder.recordStepByRule('tan-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'trigonometric',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 9: 1/(a²+x²) → arctan
		const arctanMatch = isArctanPattern(expr, variable);
		if (arctanMatch) {
			const { a, varNode } = arctanMatch;
			recorder.recordStepByRule('arctan-rule', expr, expr, 'detailed');
			antiderivative = arctanRule(varNode, a);
			recorder.recordStepByRule('arctan-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'rational',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// Case 10: 1/√(a²-x²) → arcsin
		const arcsinMatch = isArcsinPattern(expr, variable);
		if (arcsinMatch) {
			const { a, varNode } = arcsinMatch;
			recorder.recordStepByRule('arcsin-rule', expr, expr, 'detailed');
			antiderivative = arcsinRule(varNode, a);
			recorder.recordStepByRule('arcsin-rule', expr, antiderivative, 'summarized');

			return {
				variable,
				status: 'exact',
				antiderivative,
				integrandType: 'irrational',
				technique: 'basic-rule',
				steps: recorder.getSteps(),
				constantNote: CONSTANT_OF_INTEGRATION_NOTE
			};
		}

		// If we get here, canIntegrate returned true but we can't actually integrate
		// This should not happen in normal usage
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType,
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			error: 'Basic integrator cannot handle this expression'
		};
	}
};
