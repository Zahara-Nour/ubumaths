/**
 * Tests for trigonometric identity transformations
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import {
	TRANSFORM_SIN_COS_PRODUCT,
	TRANSFORM_DOUBLE_ANGLE_SIN,
	TRANSFORM_SIN_SQUARED,
	TRANSFORM_COS_SQUARED,
	TRANSFORM_PYTHAGOREAN,
	TRANSFORM_ONE_MINUS_SIN_SQUARED,
	TRANSFORM_ONE_MINUS_COS_SQUARED,
	TRANSFORM_SIN_OVER_COS,
	TRANSFORM_COS_COS_PRODUCT,
	TRANSFORM_SIN_SIN_PRODUCT,
	TRANSFORM_SIN_COS_DIFFERENT,
	TRANSFORM_COS_SUM,
	TRANSFORM_COS_DIFFERENCE,
	TRANSFORM_SIN_SUM,
	TRANSFORM_SIN_DIFFERENCE,
	TRANSFORM_EXPAND_DOUBLE_SIN,
	TRANSFORM_EXPAND_DOUBLE_COS,
	TRANSFORM_COS_OVER_SIN,
	TRANSFORM_ONE_OVER_COS,
	TRANSFORM_ONE_OVER_SIN,
	TRANSFORM_TAN_SUM,
	TRANSFORM_TAN_DIFFERENCE,
	TRANSFORM_SIN_NEGATIVE,
	TRANSFORM_COS_NEGATIVE,
	TRANSFORM_TAN_NEGATIVE,
	TRANSFORM_SIN_PLUS_SIN,
	TRANSFORM_SIN_MINUS_SIN,
	TRANSFORM_COS_PLUS_COS,
	TRANSFORM_COS_MINUS_COS,
	TRANSFORM_SIN_PERIOD_2PI,
	TRANSFORM_COS_PERIOD_2PI,
	TRANSFORM_SIN_HALF_ANGLE,
	TRANSFORM_COS_HALF_ANGLE,
	TRANSFORM_TAN_HALF_ANGLE,
	TRANSFORM_TAN_SQUARED_PLUS_ONE,
	TRANSFORM_SEC_SQUARED_MINUS_ONE,
	TRANSFORM_COT_SQUARED_PLUS_ONE,
	TRANSFORM_CSC_SQUARED_MINUS_ONE,
	TRANSFORM_SIN_CUBED,
	TRANSFORM_COS_CUBED,
	TRANSFORM_SIN_SUPPLEMENTARY,
	TRANSFORM_COS_SUPPLEMENTARY,
	TRANSFORM_TAN_SUPPLEMENTARY,
	TRANSFORM_SIN_PLUS_PI_OVER_2,
	TRANSFORM_COS_PLUS_PI_OVER_2,
	TRANSFORM_TAN_PLUS_PI_OVER_2,
	applyTrigIdentities,
	contractToDoubleAngle,
	simplifyPythagorean,
	simplifyQuotients,
	linearize,
	expandAddition,
	expandDoubleAngle,
	simplifyNegativeAngle,
	factorize,
	reducePeriodic,
	expandHalfAngle,
	reduceHigherPowers,
	simplifySupplementary,
	simplifyShiftPiOver2
} from '../trig-identities';

describe('Double Angle Contraction', () => {
	describe('TRANSFORM_SIN_COS_PRODUCT', () => {
		it('should transform sin(x)*cos(x) to sin(2x)/2', () => {
			const expr = parseLatex('\\sin(x)\\cos(x)');
			const result = TRANSFORM_SIN_COS_PRODUCT(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
			expect(latex).toContain('2');
		});

		it('should transform cos(x)*sin(x) to sin(2x)/2', () => {
			const expr = parseLatex('\\cos(x)\\sin(x)');
			const result = TRANSFORM_SIN_COS_PRODUCT(expr);
			expect(result).not.toBeNull();
		});

		it('should work with complex arguments', () => {
			const expr = parseLatex('\\sin(2t)\\cos(2t)');
			const result = TRANSFORM_SIN_COS_PRODUCT(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform if arguments differ', () => {
			const expr = parseLatex('\\sin(x)\\cos(y)');
			const result = TRANSFORM_SIN_COS_PRODUCT(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_DOUBLE_ANGLE_SIN', () => {
		it('should transform 2*sin(x)*cos(x) to sin(2x)', () => {
			const expr = parseLatex('2\\sin(x)\\cos(x)');
			const result = TRANSFORM_DOUBLE_ANGLE_SIN(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
		});

		it('should not transform without factor 2', () => {
			const expr = parseLatex('\\sin(x)\\cos(x)');
			const result = TRANSFORM_DOUBLE_ANGLE_SIN(expr);
			expect(result).toBeNull();
		});
	});
});

describe('Power Reduction', () => {
	describe('TRANSFORM_SIN_SQUARED', () => {
		it('should transform sin²(x) to (1 - cos(2x))/2', () => {
			const expr = parseLatex('\\sin^2(x)');
			const result = TRANSFORM_SIN_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
			expect(latex).toContain('2');
		});

		it('should work with complex arguments', () => {
			const expr = parseLatex('\\sin^2(2x+1)');
			const result = TRANSFORM_SIN_SQUARED(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sin without power', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_SIN_SQUARED(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COS_SQUARED', () => {
		it('should transform cos²(x) to (1 + cos(2x))/2', () => {
			const expr = parseLatex('\\cos^2(x)');
			const result = TRANSFORM_COS_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
		});
	});
});

describe('Pythagorean Identities', () => {
	describe('TRANSFORM_PYTHAGOREAN', () => {
		it('should transform sin²(x) + cos²(x) to 1', () => {
			const expr = parseLatex('\\sin^2(x) + \\cos^2(x)');
			const result = TRANSFORM_PYTHAGOREAN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('1');
		});

		it('should transform cos²(x) + sin²(x) to 1', () => {
			const expr = parseLatex('\\cos^2(x) + \\sin^2(x)');
			const result = TRANSFORM_PYTHAGOREAN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('1');
		});

		it('should require same argument', () => {
			const expr = parseLatex('\\sin^2(x) + \\cos^2(y)');
			const result = TRANSFORM_PYTHAGOREAN(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_ONE_MINUS_SIN_SQUARED', () => {
		it('should transform 1 - sin²(x) to cos²(x)', () => {
			const expr = parseLatex('1 - \\sin^2(x)');
			const result = TRANSFORM_ONE_MINUS_SIN_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
		});
	});

	describe('TRANSFORM_ONE_MINUS_COS_SQUARED', () => {
		it('should transform 1 - cos²(x) to sin²(x)', () => {
			const expr = parseLatex('1 - \\cos^2(x)');
			const result = TRANSFORM_ONE_MINUS_COS_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
		});
	});
});

describe('Quotient Identities', () => {
	describe('TRANSFORM_SIN_OVER_COS', () => {
		it('should transform sin(x)/cos(x) to tan(x)', () => {
			const expr = parseLatex('\\frac{\\sin(x)}{\\cos(x)}');
			const result = TRANSFORM_SIN_OVER_COS(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('tan');
		});

		it('should require same argument', () => {
			const expr = parseLatex('\\frac{\\sin(x)}{\\cos(y)}');
			const result = TRANSFORM_SIN_OVER_COS(expr);
			expect(result).toBeNull();
		});
	});
});

describe('Application Functions', () => {
	describe('contractToDoubleAngle', () => {
		it('should contract sin(x)*cos(x)', () => {
			const expr = parseLatex('\\sin(x)\\cos(x)');
			const result = contractToDoubleAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-cos-product');
		});

		it('should contract sin²(x)', () => {
			const expr = parseLatex('\\sin^2(x)');
			const result = contractToDoubleAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-squared');
		});
	});

	describe('simplifyPythagorean', () => {
		it('should simplify sin² + cos² = 1', () => {
			const expr = parseLatex('\\sin^2(x) + \\cos^2(x)');
			const result = simplifyPythagorean(expr);
			expect(result.changed).toBe(true);
			expect(toLatex(result.result)).toBe('1');
		});

		it('should simplify 1 - sin² = cos²', () => {
			const expr = parseLatex('1 - \\sin^2(x)');
			const result = simplifyPythagorean(expr);
			expect(result.changed).toBe(true);
		});
	});

	describe('simplifyQuotients', () => {
		it('should simplify sin/cos = tan', () => {
			const expr = parseLatex('\\frac{\\sin(x)}{\\cos(x)}');
			const result = simplifyQuotients(expr);
			expect(result.changed).toBe(true);
			expect(toLatex(result.result)).toContain('tan');
		});
	});

	describe('applyTrigIdentities', () => {
		it('should apply multiple rules', () => {
			const expr = parseLatex('\\frac{\\sin(x)}{\\cos(x)}');
			const result = applyTrigIdentities(expr);
			expect(result.changed).toBe(true);
		});

		it('should return unchanged for non-trig expressions', () => {
			const expr = parseLatex('x^2 + 1');
			const result = applyTrigIdentities(expr);
			expect(result.changed).toBe(false);
			expect(result.appliedRules).toHaveLength(0);
		});

		it('should work on nested expressions', () => {
			const expr = parseLatex('2(\\sin^2(x) + \\cos^2(x))');
			const result = applyTrigIdentities(expr);
			expect(result.changed).toBe(true);
			// Should simplify to 2*1 = 2
		});
	});
});

describe('Linearization (Product to Sum)', () => {
	describe('TRANSFORM_COS_COS_PRODUCT', () => {
		it('should transform cos(a)*cos(b) to (cos(a-b) + cos(a+b))/2', () => {
			const expr = parseLatex('\\cos(x)\\cos(y)');
			const result = TRANSFORM_COS_COS_PRODUCT(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
		});

		it('should not transform cos(x)*cos(x) (same argument)', () => {
			const expr = parseLatex('\\cos(x)\\cos(x)');
			const result = TRANSFORM_COS_COS_PRODUCT(expr);
			expect(result).toBeNull();
		});

		it('should work with complex arguments', () => {
			const expr = parseLatex('\\cos(2x)\\cos(3x)');
			const result = TRANSFORM_COS_COS_PRODUCT(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SIN_SIN_PRODUCT', () => {
		it('should transform sin(a)*sin(b) to (cos(a-b) - cos(a+b))/2', () => {
			const expr = parseLatex('\\sin(x)\\sin(y)');
			const result = TRANSFORM_SIN_SIN_PRODUCT(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
		});

		it('should not transform sin(x)*sin(x) (same argument)', () => {
			const expr = parseLatex('\\sin(x)\\sin(x)');
			const result = TRANSFORM_SIN_SIN_PRODUCT(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_SIN_COS_DIFFERENT', () => {
		it('should transform sin(a)*cos(b) to (sin(a+b) + sin(a-b))/2', () => {
			const expr = parseLatex('\\sin(x)\\cos(y)');
			const result = TRANSFORM_SIN_COS_DIFFERENT(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
		});

		it('should transform cos(a)*sin(b) to (sin(a+b) - sin(a-b))/2', () => {
			const expr = parseLatex('\\cos(x)\\sin(y)');
			const result = TRANSFORM_SIN_COS_DIFFERENT(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
		});

		it('should not transform sin(x)*cos(x) (same argument)', () => {
			const expr = parseLatex('\\sin(x)\\cos(x)');
			const result = TRANSFORM_SIN_COS_DIFFERENT(expr);
			expect(result).toBeNull();
		});
	});

	describe('linearize', () => {
		it('should linearize cos(a)*cos(b)', () => {
			const expr = parseLatex('\\cos(2x)\\cos(3x)');
			const result = linearize(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-cos-product');
		});

		it('should linearize sin(a)*sin(b)', () => {
			const expr = parseLatex('\\sin(2x)\\sin(3x)');
			const result = linearize(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-sin-product');
		});

		it('should linearize sin(a)*cos(b)', () => {
			const expr = parseLatex('\\sin(2x)\\cos(3x)');
			const result = linearize(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-cos-different');
		});

		it('should not change non-product expressions', () => {
			const expr = parseLatex('\\sin(x) + \\cos(x)');
			const result = linearize(expr);
			expect(result.changed).toBe(false);
		});

		it('should work on nested products', () => {
			const expr = parseLatex('\\cos(x)\\cos(y) + \\sin(x)\\sin(y)');
			const result = linearize(expr);
			expect(result.changed).toBe(true);
		});
	});
});

describe('Addition Formulas (Angle Sum/Difference)', () => {
	describe('TRANSFORM_COS_SUM', () => {
		it('should transform cos(a+b) to cos(a)cos(b) - sin(a)sin(b)', () => {
			const expr = parseLatex('\\cos(x+y)');
			const result = TRANSFORM_COS_SUM(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
			expect(latex).toContain('sin');
		});

		it('should not transform cos(x) without sum', () => {
			const expr = parseLatex('\\cos(x)');
			const result = TRANSFORM_COS_SUM(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COS_DIFFERENCE', () => {
		it('should transform cos(a-b) to cos(a)cos(b) + sin(a)sin(b)', () => {
			const expr = parseLatex('\\cos(x-y)');
			const result = TRANSFORM_COS_DIFFERENCE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
			expect(latex).toContain('sin');
		});

		it('should not transform cos(x) without difference', () => {
			const expr = parseLatex('\\cos(x)');
			const result = TRANSFORM_COS_DIFFERENCE(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_SIN_SUM', () => {
		it('should transform sin(a+b) to sin(a)cos(b) + cos(a)sin(b)', () => {
			const expr = parseLatex('\\sin(x+y)');
			const result = TRANSFORM_SIN_SUM(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
			expect(latex).toContain('cos');
		});

		it('should not transform sin(x) without sum', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_SIN_SUM(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_SIN_DIFFERENCE', () => {
		it('should transform sin(a-b) to sin(a)cos(b) - cos(a)sin(b)', () => {
			const expr = parseLatex('\\sin(x-y)');
			const result = TRANSFORM_SIN_DIFFERENCE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
			expect(latex).toContain('cos');
		});

		it('should not transform sin(x) without difference', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_SIN_DIFFERENCE(expr);
			expect(result).toBeNull();
		});
	});

	describe('expandAddition', () => {
		it('should expand cos(a+b)', () => {
			const expr = parseLatex('\\cos(x+y)');
			const result = expandAddition(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-sum');
		});

		it('should expand sin(a-b)', () => {
			const expr = parseLatex('\\sin(x-y)');
			const result = expandAddition(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-difference');
		});

		it('should expand nested expressions', () => {
			const expr = parseLatex('\\cos(x+y) + \\sin(x-y)');
			const result = expandAddition(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-sum');
			expect(result.appliedRules).toContain('sin-difference');
		});

		it('should not change expressions without sum/difference', () => {
			const expr = parseLatex('\\cos(x) + \\sin(y)');
			const result = expandAddition(expr);
			expect(result.changed).toBe(false);
		});

		it('should work with complex arguments', () => {
			const expr = parseLatex('\\cos(2x+3y)');
			const result = expandAddition(expr);
			expect(result.changed).toBe(true);
		});
	});
});

describe('Double Angle Expansion', () => {
	describe('TRANSFORM_EXPAND_DOUBLE_SIN', () => {
		it('should expand sin(2x) to 2sin(x)cos(x)', () => {
			const expr = parseLatex('\\sin(2x)');
			const result = TRANSFORM_EXPAND_DOUBLE_SIN(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
			expect(latex).toContain('cos');
		});

		it('should not transform sin(x)', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_EXPAND_DOUBLE_SIN(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_EXPAND_DOUBLE_COS', () => {
		it('should expand cos(2x) to cos²(x) - sin²(x)', () => {
			const expr = parseLatex('\\cos(2x)');
			const result = TRANSFORM_EXPAND_DOUBLE_COS(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('expandDoubleAngle', () => {
		it('should expand sin(2x)', () => {
			const expr = parseLatex('\\sin(2x)');
			const result = expandDoubleAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('expand-double-sin');
		});

		it('should expand cos(2x)', () => {
			const expr = parseLatex('\\cos(2x)');
			const result = expandDoubleAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('expand-double-cos');
		});
	});
});

describe('Additional Quotient Identities', () => {
	describe('TRANSFORM_COS_OVER_SIN', () => {
		it('should transform cos(x)/sin(x) to cot(x)', () => {
			const expr = parseLatex('\\frac{\\cos(x)}{\\sin(x)}');
			const result = TRANSFORM_COS_OVER_SIN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('cot');
		});
	});

	describe('TRANSFORM_ONE_OVER_COS', () => {
		it('should transform 1/cos(x) to sec(x)', () => {
			const expr = parseLatex('\\frac{1}{\\cos(x)}');
			const result = TRANSFORM_ONE_OVER_COS(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('sec');
		});
	});

	describe('TRANSFORM_ONE_OVER_SIN', () => {
		it('should transform 1/sin(x) to csc(x)', () => {
			const expr = parseLatex('\\frac{1}{\\sin(x)}');
			const result = TRANSFORM_ONE_OVER_SIN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('csc');
		});
	});
});

describe('Tangent Addition Formulas', () => {
	describe('TRANSFORM_TAN_SUM', () => {
		it('should expand tan(a+b)', () => {
			const expr = parseLatex('\\tan(x+y)');
			const result = TRANSFORM_TAN_SUM(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('tan');
		});

		it('should not transform tan(x)', () => {
			const expr = parseLatex('\\tan(x)');
			const result = TRANSFORM_TAN_SUM(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_TAN_DIFFERENCE', () => {
		it('should expand tan(a-b)', () => {
			const expr = parseLatex('\\tan(x-y)');
			const result = TRANSFORM_TAN_DIFFERENCE(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Negative Angle Identities', () => {
	describe('TRANSFORM_SIN_NEGATIVE', () => {
		it('should transform sin(-x) to -sin(x)', () => {
			const expr = parseLatex('\\sin(-x)');
			const result = TRANSFORM_SIN_NEGATIVE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COS_NEGATIVE', () => {
		it('should transform cos(-x) to cos(x)', () => {
			const expr = parseLatex('\\cos(-x)');
			const result = TRANSFORM_COS_NEGATIVE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_TAN_NEGATIVE', () => {
		it('should transform tan(-x) to -tan(x)', () => {
			const expr = parseLatex('\\tan(-x)');
			const result = TRANSFORM_TAN_NEGATIVE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('simplifyNegativeAngle', () => {
		it('should simplify sin(-x)', () => {
			const expr = parseLatex('\\sin(-x)');
			const result = simplifyNegativeAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-negative');
		});

		it('should simplify cos(-x)', () => {
			const expr = parseLatex('\\cos(-x)');
			const result = simplifyNegativeAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-negative');
		});
	});
});

describe('Factorization (Sum to Product)', () => {
	describe('TRANSFORM_SIN_PLUS_SIN', () => {
		it('should factorize sin(a) + sin(b)', () => {
			const expr = parseLatex('\\sin(x) + \\sin(y)');
			const result = TRANSFORM_SIN_PLUS_SIN(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SIN_MINUS_SIN', () => {
		it('should factorize sin(a) - sin(b)', () => {
			const expr = parseLatex('\\sin(x) - \\sin(y)');
			const result = TRANSFORM_SIN_MINUS_SIN(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COS_PLUS_COS', () => {
		it('should factorize cos(a) + cos(b)', () => {
			const expr = parseLatex('\\cos(x) + \\cos(y)');
			const result = TRANSFORM_COS_PLUS_COS(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COS_MINUS_COS', () => {
		it('should factorize cos(a) - cos(b)', () => {
			const expr = parseLatex('\\cos(x) - \\cos(y)');
			const result = TRANSFORM_COS_MINUS_COS(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('factorize', () => {
		it('should factorize sin(x) + sin(y)', () => {
			const expr = parseLatex('\\sin(x) + \\sin(y)');
			const result = factorize(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-plus-sin');
		});

		it('should not factorize sin(x) + cos(x)', () => {
			const expr = parseLatex('\\sin(x) + \\cos(x)');
			const result = factorize(expr);
			expect(result.changed).toBe(false);
		});
	});
});

describe('Periodic Reduction', () => {
	describe('TRANSFORM_SIN_PERIOD_2PI', () => {
		it('should reduce sin(x + 2π) to sin(x)', () => {
			const expr = parseLatex('\\sin(x + 2\\pi)');
			const result = TRANSFORM_SIN_PERIOD_2PI(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COS_PERIOD_2PI', () => {
		it('should reduce cos(x + 2π) to cos(x)', () => {
			const expr = parseLatex('\\cos(x + 2\\pi)');
			const result = TRANSFORM_COS_PERIOD_2PI(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('reducePeriodic', () => {
		it('should reduce sin(x + 2π)', () => {
			const expr = parseLatex('\\sin(x + 2\\pi)');
			const result = reducePeriodic(expr);
			expect(result.changed).toBe(true);
		});

		it('should not change sin(x)', () => {
			const expr = parseLatex('\\sin(x)');
			const result = reducePeriodic(expr);
			expect(result.changed).toBe(false);
		});
	});
});

describe('Half Angle Formulas', () => {
	describe('TRANSFORM_SIN_HALF_ANGLE', () => {
		it('should expand sin(x/2)', () => {
			const expr = parseLatex('\\sin(\\frac{x}{2})');
			const result = TRANSFORM_SIN_HALF_ANGLE(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sin(x)', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_SIN_HALF_ANGLE(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COS_HALF_ANGLE', () => {
		it('should expand cos(x/2)', () => {
			const expr = parseLatex('\\cos(\\frac{x}{2})');
			const result = TRANSFORM_COS_HALF_ANGLE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('expandHalfAngle', () => {
		it('should expand sin(x/2)', () => {
			const expr = parseLatex('\\sin(\\frac{x}{2})');
			const result = expandHalfAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-half-angle');
		});
	});
});

describe('Higher Power Formulas', () => {
	describe('TRANSFORM_SIN_CUBED', () => {
		it('should reduce sin³(x)', () => {
			const expr = parseLatex('\\sin^3(x)');
			const result = TRANSFORM_SIN_CUBED(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sin²(x)', () => {
			const expr = parseLatex('\\sin^2(x)');
			const result = TRANSFORM_SIN_CUBED(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COS_CUBED', () => {
		it('should reduce cos³(x)', () => {
			const expr = parseLatex('\\cos^3(x)');
			const result = TRANSFORM_COS_CUBED(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('reduceHigherPowers', () => {
		it('should reduce sin³(x)', () => {
			const expr = parseLatex('\\sin^3(x)');
			const result = reduceHigherPowers(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-cubed');
		});

		it('should reduce cos³(x)', () => {
			const expr = parseLatex('\\cos^3(x)');
			const result = reduceHigherPowers(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-cubed');
		});

		it('should not change sin²(x)', () => {
			const expr = parseLatex('\\sin^2(x)');
			const result = reduceHigherPowers(expr);
			expect(result.changed).toBe(false);
		});
	});
});

describe('Supplementary Angle Identities (π - x)', () => {
	describe('TRANSFORM_SIN_SUPPLEMENTARY', () => {
		it('should transform sin(π - x) to sin(x)', () => {
			const expr = parseLatex('\\sin(\\pi - x)');
			const result = TRANSFORM_SIN_SUPPLEMENTARY(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
		});

		it('should not transform sin(x)', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_SIN_SUPPLEMENTARY(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COS_SUPPLEMENTARY', () => {
		it('should transform cos(π - x) to -cos(x)', () => {
			const expr = parseLatex('\\cos(\\pi - x)');
			const result = TRANSFORM_COS_SUPPLEMENTARY(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
		});

		it('should not transform cos(x)', () => {
			const expr = parseLatex('\\cos(x)');
			const result = TRANSFORM_COS_SUPPLEMENTARY(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_TAN_SUPPLEMENTARY', () => {
		it('should transform tan(π - x) to -tan(x)', () => {
			const expr = parseLatex('\\tan(\\pi - x)');
			const result = TRANSFORM_TAN_SUPPLEMENTARY(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('tan');
		});
	});

	describe('simplifySupplementary', () => {
		it('should simplify sin(π - x)', () => {
			const expr = parseLatex('\\sin(\\pi - x)');
			const result = simplifySupplementary(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-supplementary');
		});

		it('should simplify cos(π - x)', () => {
			const expr = parseLatex('\\cos(\\pi - x)');
			const result = simplifySupplementary(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-supplementary');
		});

		it('should simplify tan(π - x)', () => {
			const expr = parseLatex('\\tan(\\pi - x)');
			const result = simplifySupplementary(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('tan-supplementary');
		});

		it('should not change expressions without π - x pattern', () => {
			const expr = parseLatex('\\sin(x)');
			const result = simplifySupplementary(expr);
			expect(result.changed).toBe(false);
		});
	});
});

describe('Shift by π/2 Identities (x + π/2)', () => {
	describe('TRANSFORM_SIN_PLUS_PI_OVER_2', () => {
		it('should transform sin(x + π/2) to cos(x)', () => {
			const expr = parseLatex('\\sin(x + \\frac{\\pi}{2})');
			const result = TRANSFORM_SIN_PLUS_PI_OVER_2(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cos');
		});

		it('should handle π/2 + x order', () => {
			const expr = parseLatex('\\sin(\\frac{\\pi}{2} + x)');
			const result = TRANSFORM_SIN_PLUS_PI_OVER_2(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sin(x)', () => {
			const expr = parseLatex('\\sin(x)');
			const result = TRANSFORM_SIN_PLUS_PI_OVER_2(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COS_PLUS_PI_OVER_2', () => {
		it('should transform cos(x + π/2) to -sin(x)', () => {
			const expr = parseLatex('\\cos(x + \\frac{\\pi}{2})');
			const result = TRANSFORM_COS_PLUS_PI_OVER_2(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
		});
	});

	describe('TRANSFORM_TAN_PLUS_PI_OVER_2', () => {
		it('should transform tan(x + π/2) to -cot(x)', () => {
			const expr = parseLatex('\\tan(x + \\frac{\\pi}{2})');
			const result = TRANSFORM_TAN_PLUS_PI_OVER_2(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cot');
		});
	});

	describe('simplifyShiftPiOver2', () => {
		it('should simplify sin(x + π/2)', () => {
			const expr = parseLatex('\\sin(x + \\frac{\\pi}{2})');
			const result = simplifyShiftPiOver2(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sin-plus-pi-over-2');
		});

		it('should simplify cos(x + π/2)', () => {
			const expr = parseLatex('\\cos(x + \\frac{\\pi}{2})');
			const result = simplifyShiftPiOver2(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cos-plus-pi-over-2');
		});

		it('should simplify tan(x + π/2)', () => {
			const expr = parseLatex('\\tan(x + \\frac{\\pi}{2})');
			const result = simplifyShiftPiOver2(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('tan-plus-pi-over-2');
		});

		it('should not change expressions without x + π/2 pattern', () => {
			const expr = parseLatex('\\sin(x)');
			const result = simplifyShiftPiOver2(expr);
			expect(result.changed).toBe(false);
		});
	});
});

describe('Tan/Cot Pythagorean Identities', () => {
	describe('TRANSFORM_TAN_SQUARED_PLUS_ONE', () => {
		it('should transform tan²(x) + 1 to sec²(x)', () => {
			const expr = parseLatex('\\tan^2(x) + 1');
			const result = TRANSFORM_TAN_SQUARED_PLUS_ONE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sec');
		});

		it('should transform 1 + tan²(x) to sec²(x)', () => {
			const expr = parseLatex('1 + \\tan^2(x)');
			const result = TRANSFORM_TAN_SQUARED_PLUS_ONE(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform tan(x) + 1', () => {
			const expr = parseLatex('\\tan(x) + 1');
			const result = TRANSFORM_TAN_SQUARED_PLUS_ONE(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_SEC_SQUARED_MINUS_ONE', () => {
		it('should transform sec²(x) - 1 to tan²(x)', () => {
			const expr = parseLatex('\\sec^2(x) - 1');
			const result = TRANSFORM_SEC_SQUARED_MINUS_ONE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('tan');
		});
	});

	describe('TRANSFORM_COT_SQUARED_PLUS_ONE', () => {
		it('should transform cot²(x) + 1 to csc²(x)', () => {
			const expr = parseLatex('\\cot^2(x) + 1');
			const result = TRANSFORM_COT_SQUARED_PLUS_ONE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('csc');
		});

		it('should transform 1 + cot²(x) to csc²(x)', () => {
			const expr = parseLatex('1 + \\cot^2(x)');
			const result = TRANSFORM_COT_SQUARED_PLUS_ONE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_CSC_SQUARED_MINUS_ONE', () => {
		it('should transform csc²(x) - 1 to cot²(x)', () => {
			const expr = parseLatex('\\csc^2(x) - 1');
			const result = TRANSFORM_CSC_SQUARED_MINUS_ONE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cot');
		});
	});
});

describe('Tan Half-Angle', () => {
	describe('TRANSFORM_TAN_HALF_ANGLE', () => {
		it('should transform tan(x/2) to sin(x)/(1+cos(x))', () => {
			const expr = parseLatex('\\tan(\\frac{x}{2})');
			const result = TRANSFORM_TAN_HALF_ANGLE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sin');
			expect(latex).toContain('cos');
		});

		it('should not transform tan(x)', () => {
			const expr = parseLatex('\\tan(x)');
			const result = TRANSFORM_TAN_HALF_ANGLE(expr);
			expect(result).toBeNull();
		});
	});

	describe('expandHalfAngle with tan', () => {
		it('should expand tan(x/2)', () => {
			const expr = parseLatex('\\tan(\\frac{x}{2})');
			const result = expandHalfAngle(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('tan-half-angle');
		});
	});
});
