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
import { isNumber, isVariable } from '../../guards';
import { number, power } from '../../factory';
import {
	powerRule,
	constantRule,
	lnAbsRule,
	expRule,
	sinRule,
	cosRule,
	tanRule,
	containsVariable
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
 * Check if expression is exp(u) where u contains only the variable
 */
function isExponential(expr: MathNode, variable: string): { arg: MathNode } | null {
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
