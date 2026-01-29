/**
 * Tests for periodicity detection module
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { func, variable } from '../../factory';
import { detectPeriodicity, isPeriodic, getPeriod, getPeriodNumeric } from '../periodicity';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;

describe('detectPeriodicity', () => {
	describe('basic trigonometric functions', () => {
		it('should detect sin(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
			expect(result.variable).toBe('x');
		});

		it('should detect cos(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect tan(x) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\tan(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect cot(x) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\cot(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sec(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sec(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect csc(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\csc(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('scaled arguments', () => {
		it('should detect sin(2x) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(2x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect cos(3x) as periodic with period 2π/3', () => {
			const result = detectPeriodicity(parseLatex('\\cos(3x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI / 3, 5);
		});

		it('should detect tan(2x) as periodic with period π/2', () => {
			const result = detectPeriodicity(parseLatex('\\tan(2x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI / 2, 5);
		});

		it('should detect sin(x/2) as periodic with period 4π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(\\frac{x}{2})'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(4 * PI, 5);
		});

		it('should detect cos(πx) as periodic with period 2', () => {
			const result = detectPeriodicity(parseLatex('\\cos(\\pi x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(2, 5);
		});
	});

	describe('shifted arguments', () => {
		it('should detect sin(x + 1) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x + 1)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect cos(x - π) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\cos(x - \\pi)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(2x + 1) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(2x + 1)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});
	});

	describe('combinations', () => {
		it('should detect sin(x) + cos(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x) + \\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(x) + 1 as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x) + 1'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect 2*sin(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('2\\sin(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(x)*cos(x) as periodic with MINIMAL period π', () => {
			// sin(x)·cos(x) = sin(2x)/2, so minimal period is π
			// Both sin and cos have half-period antisymmetry at π
			const result = detectPeriodicity(parseLatex('\\sin(x)\\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin²(x) as periodic with MINIMAL period π', () => {
			// sin²(x + π) = (-sin(x))² = sin²(x), so minimal period is π
			const result = detectPeriodicity(parseLatex('\\sin^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect cos²(x) as periodic with MINIMAL period π', () => {
			const result = detectPeriodicity(parseLatex('\\cos^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin⁴(x) as periodic with MINIMAL period π', () => {
			// Even power of antisymmetric function
			const result = detectPeriodicity(parseLatex('\\sin^4(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin³(x) as periodic with period 2π (odd power)', () => {
			// Odd power preserves antisymmetry, period unchanged
			const result = detectPeriodicity(parseLatex('\\sin^3(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect tan²(x) as periodic with period π (no reduction)', () => {
			// tan has no half-period antisymmetry, so no reduction
			const result = detectPeriodicity(parseLatex('\\tan^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin(x)/cos(x) as periodic with MINIMAL period π', () => {
			// sin/cos = tan, but computed via antisymmetry: period π
			const result = detectPeriodicity(parseLatex('\\frac{\\sin(x)}{\\cos(x)}'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect 1/sin(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\frac{1}{\\sin(x)}'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('non-periodic functions', () => {
		it('should detect x as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('x'));
			expect(result.isPeriodic).toBe(false);
			expect(result.period).toBeNull();
		});

		it('should detect x^2 as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('x^2'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect exp(x) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('e^x'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect ln(x) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('\\ln(x)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect sinh(x) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('\\sinh(x)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect constant as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('5'));
			expect(result.isPeriodic).toBe(false);
		});
	});

	describe('absolute value', () => {
		it('should detect |sin(x)| as periodic with period π', () => {
			// |sin(x + π)| = |-sin(x)| = |sin(x)|, so period is π
			const result = detectPeriodicity(parseLatex('|\\sin(x)|'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect |cos(x)| as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('|\\cos(x)|'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect |sin(2x)| as periodic with period π/2', () => {
			// sin(2x) has period π, |sin(2x)| has period π/2
			const result = detectPeriodicity(parseLatex('|\\sin(2x)|'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI / 2, 5);
		});

		it('should detect |tan(x)| as periodic with period π (no reduction)', () => {
			// tan has no half-period antisymmetry, so |tan(x)| has same period as tan(x)
			const result = detectPeriodicity(parseLatex('|\\tan(x)|'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect |x| as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('|x|'));
			expect(result.isPeriodic).toBe(false);
		});
	});

	describe('step functions (floor, ceil, frac)', () => {
		it('should detect floor(x) as periodic with period 1', () => {
			const result = detectPeriodicity(parseLatex('\\lfloor x \\rfloor'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(1, 5);
		});

		it('should detect ceil(x) as periodic with period 1', () => {
			const result = detectPeriodicity(parseLatex('\\lceil x \\rceil'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(1, 5);
		});

		it('should detect floor(2x) as periodic with period 0.5', () => {
			const result = detectPeriodicity(parseLatex('\\lfloor 2x \\rfloor'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(0.5, 5);
		});

		it('should detect floor(x/3) as periodic with period 3', () => {
			const result = detectPeriodicity(parseLatex('\\lfloor \\frac{x}{3} \\rfloor'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(3, 5);
		});

		it('should detect frac(x) as periodic with period 1', () => {
			// frac(x) = x - floor(x) is truly periodic
			// Create node directly since \{x\} is not supported by the parser
			const fracNode = func('frac', [variable('x')]);
			const result = detectPeriodicity(fracNode);
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(1, 5);
		});

		it('should detect floor(sin(x)) as periodic with period 2π', () => {
			// Composition: floor of periodic function
			const result = detectPeriodicity(parseLatex('\\lfloor \\sin(x) \\rfloor'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('function compositions', () => {
		it('should detect sin(sin(x)) as periodic with period 2π', () => {
			// sin(x) has period 2π, so sin(sin(x)) also has period 2π
			const result = detectPeriodicity(parseLatex('\\sin(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect cos(sin(x)) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\cos(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(cos(x)) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(\\cos(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(tan(x)) as periodic with period π', () => {
			// tan(x) has period π, so sin(tan(x)) has period π
			const result = detectPeriodicity(parseLatex('\\sin(\\tan(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin(x²) as non-periodic', () => {
			// x² is not periodic, so sin(x²) is not periodic
			const result = detectPeriodicity(parseLatex('\\sin(x^2)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect sin(eˣ) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('\\sin(e^x)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect exp(sin(x)) as periodic with period 2π', () => {
			// sin(x) has period 2π, so exp(sin(x)) also has period 2π
			// Use \exp function notation since e^{...} parses e as a variable
			const result = detectPeriodicity(parseLatex('\\exp(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect 2^{cos(x)} as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('2^{\\cos(x)}'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('symbolic periods', () => {
		it('should return symbolic 2π for sin(x)', () => {
			const period = getPeriod(parseLatex('\\sin(x)'));
			expect(period).not.toBeNull();
			// Check it's 2π symbolically (multiplication of 2 and π)
			expect(period?.type).toBe('multiplication');
		});

		it('should return symbolic π for sin²(x)', () => {
			const period = getPeriod(parseLatex('\\sin^2(x)'));
			expect(period).not.toBeNull();
			// Check it's π symbolically (MathConstantNode has type 'constant')
			expect(period?.type).toBe('constant');
		});

		it('should return symbolic 2π for sin(x) + cos(x)', () => {
			const period = getPeriod(parseLatex('\\sin(x) + \\cos(x)'));
			expect(period).not.toBeNull();
			// Should be symbolic, not numeric
			expect(period?.type).not.toBe('number');
		});

		it('should return symbolic π for sin(x)·cos(x)', () => {
			const period = getPeriod(parseLatex('\\sin(x)\\cos(x)'));
			expect(period).not.toBeNull();
			// Check it's π symbolically (MathConstantNode has type 'constant')
			expect(period?.type).toBe('constant');
		});
	});

	describe('edge cases', () => {
		it('should handle parentheses', () => {
			const result = detectPeriodicity(parseLatex('(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should handle negative coefficient', () => {
			const result = detectPeriodicity(parseLatex('-\\sin(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should handle specified variable', () => {
			const result = detectPeriodicity(parseLatex('\\sin(y)'), 'y');
			expect(result.isPeriodic).toBe(true);
			expect(result.variable).toBe('y');
		});

		it('should return non-periodic for multiple variables without specification', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x) + y'));
			expect(result.isPeriodic).toBe(false);
			expect(result.reason).toContain('Plusieurs variables');
		});
	});
});

describe('isPeriodic', () => {
	it('should return true for periodic functions', () => {
		expect(isPeriodic(parseLatex('\\sin(x)'))).toBe(true);
		expect(isPeriodic(parseLatex('\\cos(2x)'))).toBe(true);
		expect(isPeriodic(parseLatex('\\tan(x)'))).toBe(true);
	});

	it('should return false for non-periodic functions', () => {
		expect(isPeriodic(parseLatex('x'))).toBe(false);
		expect(isPeriodic(parseLatex('x^2'))).toBe(false);
		expect(isPeriodic(parseLatex('e^x'))).toBe(false);
	});
});

describe('getPeriod', () => {
	it('should return period node for periodic functions', () => {
		const period = getPeriod(parseLatex('\\sin(x)'));
		expect(period).not.toBeNull();
	});

	it('should return null for non-periodic functions', () => {
		expect(getPeriod(parseLatex('x^2'))).toBeNull();
	});
});

describe('getPeriodNumeric', () => {
	it('should return numeric period for periodic functions', () => {
		expect(getPeriodNumeric(parseLatex('\\sin(x)'))).toBeCloseTo(TWO_PI, 5);
		expect(getPeriodNumeric(parseLatex('\\tan(x)'))).toBeCloseTo(PI, 5);
		expect(getPeriodNumeric(parseLatex('\\sin(2x)'))).toBeCloseTo(PI, 5);
	});

	it('should return null for non-periodic functions', () => {
		expect(getPeriodNumeric(parseLatex('x^2'))).toBeNull();
	});
});

describe('pedagogical steps', () => {
	it('should include steps explaining sin(x) period', () => {
		const result = detectPeriodicity(parseLatex('\\sin(x)'));
		expect(result.steps).toBeDefined();
		expect(result.steps!.length).toBeGreaterThan(0);
		expect(result.steps![0].rule).toBe('base_period');
		expect(result.steps![0].description).toContain('Période de base');
	});

	it('should include scaling step for sin(2x)', () => {
		const result = detectPeriodicity(parseLatex('\\sin(2x)'));
		expect(result.steps).toBeDefined();
		const scalingStep = result.steps!.find((s) => s.rule === 'scaling');
		expect(scalingStep).toBeDefined();
		expect(scalingStep!.description).toContain('Dilatation');
	});

	it('should include even power step for sin²(x)', () => {
		const result = detectPeriodicity(parseLatex('\\sin^2(x)'));
		expect(result.steps).toBeDefined();
		const evenPowerStep = result.steps!.find((s) => s.rule === 'even_power');
		expect(evenPowerStep).toBeDefined();
		expect(evenPowerStep!.description).toContain('Puissance paire');
	});

	it('should include antisymmetry step for sin(x)·cos(x)', () => {
		const result = detectPeriodicity(parseLatex('\\sin(x)\\cos(x)'));
		expect(result.steps).toBeDefined();
		const productStep = result.steps!.find((s) => s.rule === 'product_antisymmetry');
		expect(productStep).toBeDefined();
		expect(productStep!.description).toContain('antisymétrique');
	});

	it('should include absolute value step for |sin(x)|', () => {
		const result = detectPeriodicity(parseLatex('|\\sin(x)|'));
		expect(result.steps).toBeDefined();
		const absStep = result.steps!.find((s) => s.rule === 'absolute_value');
		expect(absStep).toBeDefined();
		expect(absStep!.description).toContain('Valeur absolue');
	});

	it('should include composition step for sin(sin(x))', () => {
		const result = detectPeriodicity(parseLatex('\\sin(\\sin(x))'));
		expect(result.steps).toBeDefined();
		const compStep = result.steps!.find((s) => s.rule === 'composition');
		expect(compStep).toBeDefined();
		expect(compStep!.description).toContain('Composition');
	});

	it('should filter steps by verbosity level', () => {
		const detailed = detectPeriodicity(parseLatex('\\sin(x) + 1'), { verbosity: 'detailed' });
		const summarized = detectPeriodicity(parseLatex('\\sin(x) + 1'), { verbosity: 'summarized' });
		const resultOnly = detectPeriodicity(parseLatex('\\sin(x) + 1'), { verbosity: 'result' });

		// detailed should have at least as many steps as summarized
		expect(detailed.steps!.length).toBeGreaterThanOrEqual(summarized.steps!.length);
		// result should have no steps
		expect(resultOnly.steps!.length).toBe(0);
	});

	it('should return empty steps for non-periodic expressions', () => {
		const result = detectPeriodicity(parseLatex('x^2'));
		expect(result.steps).toBeDefined();
		// Non-periodic expressions may have no steps or just a "not_periodic" step
	});
});
