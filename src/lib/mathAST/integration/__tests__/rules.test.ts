/**
 * Integration Rules Tests
 *
 * Tests for basic integration rules, classification, and basicIntegrator.
 *
 * @module mathAST/integration/__tests__/rules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	number,
	variable,
	add,
	multiply,
	divide,
	power,
	func,
	sin,
	cos,
	ln,
	opposite
} from '../../factory';
// MathNode type imported but not directly used in tests (used via factory functions)

// Import rules helpers
import {
	zero,
	one,
	isZero,
	isOne,
	simplifiedAdd,
	simplifiedMultiply,
	simplifiedDivide,
	powerRule,
	constantRule,
	lnAbsRule,
	expRule,
	sinRule,
	cosRule,
	tanRule
} from '../rules';

// Import classification functions
import { classifyIntegrand, detectVariable } from '../classify';

// Import integrator
import { basicIntegrator } from '../integrators/basic';
import { createStepRecorder } from '../step-recorder';
import { DEFAULT_INTEGRATE_OPTIONS } from '../types';

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('Integration Helper Functions', () => {
	describe('zero() and one()', () => {
		it('should create zero constant', () => {
			const z = zero();
			expect(z.type).toBe('number');
			if (z.type === 'number') {
				expect(z.value).toBe('0');
			}
		});

		it('should create one constant', () => {
			const o = one();
			expect(o.type).toBe('number');
			if (o.type === 'number') {
				expect(o.value).toBe('1');
			}
		});
	});

	describe('isZero()', () => {
		it('should return true for numeric zero', () => {
			expect(isZero(number('0'))).toBe(true);
			expect(isZero(number('0.0'))).toBe(true);
		});

		it('should return false for non-zero numbers', () => {
			expect(isZero(number('1'))).toBe(false);
			expect(isZero(number('0.5'))).toBe(false);
			expect(isZero(number('-1'))).toBe(false);
		});

		it('should return false for non-numeric nodes', () => {
			expect(isZero(variable('x'))).toBe(false);
			expect(isZero(add(number('1'), number('2')))).toBe(false);
		});
	});

	describe('isOne()', () => {
		it('should return true for numeric one', () => {
			expect(isOne(number('1'))).toBe(true);
			expect(isOne(number('1.0'))).toBe(true);
		});

		it('should return false for non-one numbers', () => {
			expect(isOne(number('0'))).toBe(false);
			expect(isOne(number('2'))).toBe(false);
			expect(isOne(number('-1'))).toBe(false);
		});

		it('should return false for non-numeric nodes', () => {
			expect(isOne(variable('x'))).toBe(false);
		});
	});
});

// =============================================================================
// Simplified Constructors Tests
// =============================================================================

describe('Simplified Constructors', () => {
	describe('simplifiedAdd()', () => {
		it('should simplify 0 + b = b', () => {
			const result = simplifiedAdd(zero(), variable('x'));
			expect(result.type).toBe('variable');
		});

		it('should simplify a + 0 = a', () => {
			const result = simplifiedAdd(variable('x'), zero());
			expect(result.type).toBe('variable');
		});

		it('should not simplify a + b when neither is zero', () => {
			const result = simplifiedAdd(variable('x'), number('1'));
			expect(result.type).toBe('addition');
		});
	});

	describe('simplifiedMultiply()', () => {
		it('should simplify 0 * b = 0', () => {
			const result = simplifiedMultiply(zero(), variable('x'));
			expect(isZero(result)).toBe(true);
		});

		it('should simplify a * 0 = 0', () => {
			const result = simplifiedMultiply(variable('x'), zero());
			expect(isZero(result)).toBe(true);
		});

		it('should simplify 1 * b = b', () => {
			const result = simplifiedMultiply(one(), variable('x'));
			expect(result.type).toBe('variable');
		});

		it('should simplify a * 1 = a', () => {
			const result = simplifiedMultiply(variable('x'), one());
			expect(result.type).toBe('variable');
		});

		it('should not simplify a * b when neither is 0 or 1', () => {
			const result = simplifiedMultiply(variable('x'), number('2'));
			expect(result.type).toBe('multiplication');
		});
	});

	describe('simplifiedDivide()', () => {
		it('should simplify 0 / b = 0', () => {
			const result = simplifiedDivide(zero(), variable('x'));
			expect(isZero(result)).toBe(true);
		});

		it('should simplify a / 1 = a', () => {
			const result = simplifiedDivide(variable('x'), one());
			expect(result.type).toBe('variable');
		});

		it('should not simplify a / b when denominator is not 1', () => {
			const result = simplifiedDivide(variable('x'), number('2'));
			expect(result.type).toBe('division');
		});
	});
});

// =============================================================================
// Basic Integration Rules Tests
// =============================================================================

describe('Basic Integration Rules', () => {
	describe('powerRule()', () => {
		it('should integrate x^n for n != -1', () => {
			// ∫ x^2 dx = x^3/3
			const result = powerRule(variable('x'), number('2'), 'x');
			expect(result.type).toBe('division');
			if (result.type === 'division') {
				expect(result.numerator.type).toBe('superscript');
				expect(result.denominator.type).toBe('number');
				if (result.denominator.type === 'number') {
					expect(result.denominator.value).toBe('3');
				}
			}
		});

		it('should integrate x^0 = 1 as x', () => {
			// ∫ 1 dx = x
			const result = powerRule(variable('x'), number('0'), 'x');
			expect(result.type).toBe('variable');
			if (result.type === 'variable') {
				expect(result.name).toBe('x');
			}
		});

		it('should integrate x^1 as x^2/2', () => {
			// ∫ x dx = x^2/2
			const result = powerRule(variable('x'), number('1'), 'x');
			expect(result.type).toBe('division');
			if (result.type === 'division') {
				expect(result.numerator.type).toBe('superscript');
				if (result.denominator.type === 'number') {
					expect(result.denominator.value).toBe('2');
				}
			}
		});

		it('should integrate x^(-2) as -1/x', () => {
			// ∫ x^(-2) dx = x^(-1)/(-1) = -1/x
			const result = powerRule(variable('x'), opposite(number('2')), 'x');
			expect(result.type).toBe('division');
		});

		it('should integrate x^(1/2) as (2/3)x^(3/2)', () => {
			// ∫ sqrt(x) dx = ∫ x^(1/2) dx = x^(3/2) / (3/2)
			const halfPower = divide(number('1'), number('2'), 'fraction');
			const result = powerRule(variable('x'), halfPower, 'x');
			expect(result.type).toBe('division');
		});
	});

	describe('constantRule()', () => {
		it('should integrate constant c as c*x', () => {
			// ∫ 5 dx = 5x
			const result = constantRule(number('5'), 'x');
			expect(result.type).toBe('multiplication');
			if (result.type === 'multiplication') {
				expect(result.left.type).toBe('number');
				if (result.left.type === 'number') {
					expect(result.left.value).toBe('5');
				}
				expect(result.right.type).toBe('variable');
			}
		});

		it('should integrate constant 1 as x', () => {
			// ∫ 1 dx = x
			const result = constantRule(number('1'), 'x');
			expect(result.type).toBe('variable');
		});

		it('should integrate constant 0 as 0', () => {
			// ∫ 0 dx = 0
			const result = constantRule(number('0'), 'x');
			expect(isZero(result)).toBe(true);
		});
	});

	describe('lnAbsRule()', () => {
		it('should integrate 1/x as ln|x|', () => {
			// ∫ 1/x dx = ln|x|
			const result = lnAbsRule(variable('x'));
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.name).toBe('ln');
				// Check for absolute value wrapper
				expect(result.args[0].type).toBe('function');
				if (result.args[0].type === 'function') {
					expect(result.args[0].name).toBe('abs');
				}
			}
		});
	});

	describe('expRule()', () => {
		it('should integrate e^x as e^x', () => {
			// ∫ e^x dx = e^x
			const result = expRule(variable('x'));
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.name).toBe('exp');
				expect(result.args[0].type).toBe('variable');
			}
		});

		it('should integrate e^(2x) as e^(2x)/2', () => {
			// ∫ e^(2x) dx = e^(2x)/2
			const expr = multiply(number('2'), variable('x'), 'implicit');
			const result = expRule(expr);
			expect(result.type).toBe('division');
			if (result.type === 'division') {
				expect(result.numerator.type).toBe('function');
				if (result.denominator.type === 'number') {
					expect(result.denominator.value).toBe('2');
				}
			}
		});
	});

	describe('sinRule()', () => {
		it('should integrate sin(x) as -cos(x)', () => {
			// ∫ sin(x) dx = -cos(x)
			const result = sinRule(variable('x'));
			expect(result.type).toBe('opposite');
			if (result.type === 'opposite') {
				expect(result.operand.type).toBe('function');
				if (result.operand.type === 'function') {
					expect(result.operand.name).toBe('cos');
				}
			}
		});
	});

	describe('cosRule()', () => {
		it('should integrate cos(x) as sin(x)', () => {
			// ∫ cos(x) dx = sin(x)
			const result = cosRule(variable('x'));
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.name).toBe('sin');
				expect(result.args[0].type).toBe('variable');
			}
		});
	});

	describe('tanRule()', () => {
		it('should integrate tan(x) as -ln|cos(x)|', () => {
			// ∫ tan(x) dx = -ln|cos(x)|
			const result = tanRule(variable('x'));
			expect(result.type).toBe('opposite');
			if (result.type === 'opposite') {
				expect(result.operand.type).toBe('function');
				if (result.operand.type === 'function') {
					expect(result.operand.name).toBe('ln');
				}
			}
		});
	});
});

// =============================================================================
// Classification Tests
// =============================================================================

describe('Integrand Classification', () => {
	describe('detectVariable()', () => {
		it('should detect single variable x', () => {
			const expr = variable('x');
			expect(detectVariable(expr)).toBe('x');
		});

		it('should detect variable in expression', () => {
			const expr = power(variable('x'), number('2'));
			expect(detectVariable(expr)).toBe('x');
		});

		it('should detect variable in complex expression', () => {
			const expr = add(multiply(number('2'), variable('t'), 'implicit'), number('1'));
			expect(detectVariable(expr)).toBe('t');
		});

		it('should return null for constant expression', () => {
			const expr = number('5');
			expect(detectVariable(expr)).toBeNull();
		});

		it('should throw error for multiple variables', () => {
			const expr = add(variable('x'), variable('y'));
			expect(() => detectVariable(expr)).toThrow();
		});
	});

	describe('classifyIntegrand()', () => {
		it('should classify polynomial', () => {
			const expr = power(variable('x'), number('3'));
			expect(classifyIntegrand(expr, 'x')).toBe('polynomial');
		});

		it('should classify constant as polynomial', () => {
			const expr = number('5');
			expect(classifyIntegrand(expr, 'x')).toBe('polynomial');
		});

		it('should classify rational function', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			expect(classifyIntegrand(expr, 'x')).toBe('rational');
		});

		it('should classify trigonometric', () => {
			const expr = sin(variable('x'));
			expect(classifyIntegrand(expr, 'x')).toBe('trigonometric');
		});

		it('should classify exponential', () => {
			const expr = func('exp', [variable('x')]);
			expect(classifyIntegrand(expr, 'x')).toBe('exponential');
		});

		it('should classify logarithmic', () => {
			const expr = ln(variable('x'));
			expect(classifyIntegrand(expr, 'x')).toBe('logarithmic');
		});

		it('should classify product', () => {
			const expr = multiply(variable('x'), sin(variable('x')), 'implicit');
			expect(classifyIntegrand(expr, 'x')).toBe('product');
		});

		it('should classify radical', () => {
			const expr = func('sqrt', [variable('x')]);
			expect(classifyIntegrand(expr, 'x')).toBe('radical');
		});
	});
});

// =============================================================================
// Basic Integrator Tests
// =============================================================================

describe('basicIntegrator', () => {
	const recorder = createStepRecorder();
	const options = DEFAULT_INTEGRATE_OPTIONS;

	beforeEach(() => {
		recorder.clear();
	});

	it('should have correct name and priority', () => {
		expect(basicIntegrator.name).toBe('basic');
		expect(basicIntegrator.priority).toBe(0);
	});

	describe('canIntegrate()', () => {
		it('should handle constant', () => {
			expect(basicIntegrator.canIntegrate(number('5'), 'x')).toBe(true);
		});

		it('should handle power of x', () => {
			expect(basicIntegrator.canIntegrate(power(variable('x'), number('2')), 'x')).toBe(true);
		});

		it('should handle simple variable', () => {
			expect(basicIntegrator.canIntegrate(variable('x'), 'x')).toBe(true);
		});

		it('should handle 1/x', () => {
			expect(
				basicIntegrator.canIntegrate(divide(number('1'), variable('x'), 'fraction'), 'x')
			).toBe(true);
		});

		it('should handle exp(x)', () => {
			expect(basicIntegrator.canIntegrate(func('exp', [variable('x')]), 'x')).toBe(true);
		});

		it('should handle sin(x)', () => {
			expect(basicIntegrator.canIntegrate(sin(variable('x')), 'x')).toBe(true);
		});

		it('should handle cos(x)', () => {
			expect(basicIntegrator.canIntegrate(cos(variable('x')), 'x')).toBe(true);
		});

		it('should handle tan(x)', () => {
			expect(basicIntegrator.canIntegrate(func('tan', [variable('x')]), 'x')).toBe(true);
		});

		it('should not handle complex expressions', () => {
			const expr = multiply(variable('x'), sin(variable('x')), 'implicit');
			expect(basicIntegrator.canIntegrate(expr, 'x')).toBe(false);
		});
	});

	describe('integrate() - polynomial cases', () => {
		it('should integrate constant', () => {
			const result = basicIntegrator.integrate(number('5'), 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('basic-rule');
			expect(result.antiderivative).not.toBeNull();
			expect(result.antiderivative?.type).toBe('multiplication');
		});

		it('should integrate x^2', () => {
			const expr = power(variable('x'), number('2'));
			const result = basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('division');
		});

		it('should integrate x', () => {
			const result = basicIntegrator.integrate(variable('x'), 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('division');
		});
	});

	describe('integrate() - rational cases', () => {
		it('should integrate 1/x', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('function');
			if (result.antiderivative?.type === 'function') {
				expect(result.antiderivative.name).toBe('ln');
			}
		});
	});

	describe('integrate() - exponential cases', () => {
		it('should integrate exp(x)', () => {
			const expr = func('exp', [variable('x')]);
			const result = basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('function');
			if (result.antiderivative?.type === 'function') {
				expect(result.antiderivative.name).toBe('exp');
			}
		});
	});

	describe('integrate() - trigonometric cases', () => {
		it('should integrate sin(x)', () => {
			const expr = sin(variable('x'));
			const result = basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('opposite');
		});

		it('should integrate cos(x)', () => {
			const expr = cos(variable('x'));
			const result = basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('function');
		});

		it('should integrate tan(x)', () => {
			const expr = func('tan', [variable('x')]);
			const result = basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			expect(result.status).toBe('exact');
			expect(result.antiderivative?.type).toBe('opposite');
		});
	});

	describe('integrate() - step recording', () => {
		it('should record steps for power rule', () => {
			const expr = power(variable('x'), number('2'));
			basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			const steps = recorder.getSteps();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should record steps with correct verbosity', () => {
			const expr = variable('x');
			basicIntegrator.integrate(expr, 'x', options, recorder, 0);
			const steps = recorder.getStepsFiltered('summarized');
			expect(steps.length).toBeGreaterThan(0);
		});
	});
});
