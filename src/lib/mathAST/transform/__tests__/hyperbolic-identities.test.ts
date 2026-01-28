/**
 * Tests for hyperbolic identity transformations
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import {
	TRANSFORM_SINH_COSH_PRODUCT,
	TRANSFORM_DOUBLE_ANGLE_SINH,
	TRANSFORM_SINH_SQUARED,
	TRANSFORM_COSH_SQUARED,
	TRANSFORM_HYPERBOLIC_PYTHAGOREAN,
	TRANSFORM_ONE_PLUS_SINH_SQUARED,
	TRANSFORM_COSH_SQUARED_MINUS_ONE,
	TRANSFORM_SINH_OVER_COSH,
	TRANSFORM_COSH_OVER_SINH,
	TRANSFORM_ONE_OVER_COSH,
	TRANSFORM_ONE_OVER_SINH,
	TRANSFORM_COSH_COSH_PRODUCT,
	TRANSFORM_SINH_SINH_PRODUCT,
	TRANSFORM_SINH_COSH_DIFFERENT,
	TRANSFORM_COSH_SUM,
	TRANSFORM_COSH_DIFFERENCE,
	TRANSFORM_SINH_SUM,
	TRANSFORM_SINH_DIFFERENCE,
	TRANSFORM_TANH_SUM,
	TRANSFORM_TANH_DIFFERENCE,
	TRANSFORM_EXPAND_DOUBLE_SINH,
	TRANSFORM_EXPAND_DOUBLE_COSH,
	TRANSFORM_EXPAND_DOUBLE_TANH,
	TRANSFORM_SINH_NEGATIVE,
	TRANSFORM_COSH_NEGATIVE,
	TRANSFORM_TANH_NEGATIVE,
	TRANSFORM_SINH_PLUS_SINH,
	TRANSFORM_SINH_MINUS_SINH,
	TRANSFORM_COSH_PLUS_COSH,
	TRANSFORM_COSH_MINUS_COSH,
	TRANSFORM_SINH_HALF_ANGLE,
	TRANSFORM_COSH_HALF_ANGLE,
	TRANSFORM_TANH_HALF_ANGLE,
	TRANSFORM_ONE_MINUS_TANH_SQUARED,
	TRANSFORM_SECH_TANH_PYTHAGOREAN,
	TRANSFORM_COTH_SQUARED_MINUS_ONE,
	TRANSFORM_COTH_CSCH_PYTHAGOREAN,
	TRANSFORM_ONE_PLUS_CSCH_SQUARED,
	TRANSFORM_SINH_CUBED,
	TRANSFORM_COSH_CUBED,
	TRANSFORM_SINH_FOURTH,
	TRANSFORM_COSH_FOURTH,
	applyHyperbolicIdentities,
	contractToDoubleAngleH,
	simplifyHyperbolicPythagorean,
	simplifyHyperbolicQuotients,
	linearizeH,
	expandAdditionH,
	expandDoubleAngleH,
	simplifyNegativeArgumentH,
	factorizeH,
	expandHalfAngleH,
	reduceHigherPowersH
} from '../hyperbolic-identities';

describe('Double Angle Contraction', () => {
	describe('TRANSFORM_SINH_COSH_PRODUCT', () => {
		it('should transform sinh(x)*cosh(x) to sinh(2x)/2', () => {
			const expr = parseLatex('\\sinh(x)\\cosh(x)');
			const result = TRANSFORM_SINH_COSH_PRODUCT(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sinh');
		});

		it('should transform cosh(x)*sinh(x) to sinh(2x)/2', () => {
			const expr = parseLatex('\\cosh(x)\\sinh(x)');
			const result = TRANSFORM_SINH_COSH_PRODUCT(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform if arguments differ', () => {
			const expr = parseLatex('\\sinh(x)\\cosh(y)');
			const result = TRANSFORM_SINH_COSH_PRODUCT(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_DOUBLE_ANGLE_SINH', () => {
		it('should transform 2*sinh(x)*cosh(x) to sinh(2x)', () => {
			const expr = parseLatex('2\\sinh(x)\\cosh(x)');
			const result = TRANSFORM_DOUBLE_ANGLE_SINH(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform without factor 2', () => {
			const expr = parseLatex('\\sinh(x)\\cosh(x)');
			const result = TRANSFORM_DOUBLE_ANGLE_SINH(expr);
			expect(result).toBeNull();
		});
	});
});

describe('Power Reduction', () => {
	describe('TRANSFORM_SINH_SQUARED', () => {
		it('should transform sinh²(x) to (cosh(2x) - 1)/2', () => {
			const expr = parseLatex('\\sinh^2(x)');
			const result = TRANSFORM_SINH_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cosh');
		});

		it('should not transform sinh without power', () => {
			const expr = parseLatex('\\sinh(x)');
			const result = TRANSFORM_SINH_SQUARED(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COSH_SQUARED', () => {
		it('should transform cosh²(x) to (cosh(2x) + 1)/2', () => {
			const expr = parseLatex('\\cosh^2(x)');
			const result = TRANSFORM_COSH_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cosh');
		});
	});
});

describe('Hyperbolic Pythagorean Identities', () => {
	describe('TRANSFORM_HYPERBOLIC_PYTHAGOREAN', () => {
		it('should transform cosh²(x) - sinh²(x) to 1', () => {
			const expr = parseLatex('\\cosh^2(x) - \\sinh^2(x)');
			const result = TRANSFORM_HYPERBOLIC_PYTHAGOREAN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('1');
		});

		it('should require same argument', () => {
			const expr = parseLatex('\\cosh^2(x) - \\sinh^2(y)');
			const result = TRANSFORM_HYPERBOLIC_PYTHAGOREAN(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_ONE_PLUS_SINH_SQUARED', () => {
		it('should transform 1 + sinh²(x) to cosh²(x)', () => {
			const expr = parseLatex('1 + \\sinh^2(x)');
			const result = TRANSFORM_ONE_PLUS_SINH_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cosh');
		});

		it('should also handle sinh²(x) + 1', () => {
			const expr = parseLatex('\\sinh^2(x) + 1');
			const result = TRANSFORM_ONE_PLUS_SINH_SQUARED(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COSH_SQUARED_MINUS_ONE', () => {
		it('should transform cosh²(x) - 1 to sinh²(x)', () => {
			const expr = parseLatex('\\cosh^2(x) - 1');
			const result = TRANSFORM_COSH_SQUARED_MINUS_ONE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sinh');
		});
	});
});

describe('Quotient Identities', () => {
	describe('TRANSFORM_SINH_OVER_COSH', () => {
		it('should transform sinh(x)/cosh(x) to tanh(x)', () => {
			const expr = parseLatex('\\frac{\\sinh(x)}{\\cosh(x)}');
			const result = TRANSFORM_SINH_OVER_COSH(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('tanh');
		});

		it('should require same argument', () => {
			const expr = parseLatex('\\frac{\\sinh(x)}{\\cosh(y)}');
			const result = TRANSFORM_SINH_OVER_COSH(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COSH_OVER_SINH', () => {
		it('should transform cosh(x)/sinh(x) to coth(x)', () => {
			const expr = parseLatex('\\frac{\\cosh(x)}{\\sinh(x)}');
			const result = TRANSFORM_COSH_OVER_SINH(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('coth');
		});
	});

	describe('TRANSFORM_ONE_OVER_COSH', () => {
		it('should transform 1/cosh(x) to sech(x)', () => {
			const expr = parseLatex('\\frac{1}{\\cosh(x)}');
			const result = TRANSFORM_ONE_OVER_COSH(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('sech');
		});
	});

	describe('TRANSFORM_ONE_OVER_SINH', () => {
		it('should transform 1/sinh(x) to csch(x)', () => {
			const expr = parseLatex('\\frac{1}{\\sinh(x)}');
			const result = TRANSFORM_ONE_OVER_SINH(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('csch');
		});
	});
});

describe('Linearization (Product to Sum)', () => {
	describe('TRANSFORM_COSH_COSH_PRODUCT', () => {
		it('should transform cosh(a)*cosh(b) to (cosh(a+b) + cosh(a-b))/2', () => {
			const expr = parseLatex('\\cosh(x)\\cosh(y)');
			const result = TRANSFORM_COSH_COSH_PRODUCT(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform cosh(x)*cosh(x) (same argument)', () => {
			const expr = parseLatex('\\cosh(x)\\cosh(x)');
			const result = TRANSFORM_COSH_COSH_PRODUCT(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_SINH_SINH_PRODUCT', () => {
		it('should transform sinh(a)*sinh(b) to (cosh(a+b) - cosh(a-b))/2', () => {
			const expr = parseLatex('\\sinh(x)\\sinh(y)');
			const result = TRANSFORM_SINH_SINH_PRODUCT(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SINH_COSH_DIFFERENT', () => {
		it('should transform sinh(a)*cosh(b) with different arguments', () => {
			const expr = parseLatex('\\sinh(x)\\cosh(y)');
			const result = TRANSFORM_SINH_COSH_DIFFERENT(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sinh(x)*cosh(x) (same argument)', () => {
			const expr = parseLatex('\\sinh(x)\\cosh(x)');
			const result = TRANSFORM_SINH_COSH_DIFFERENT(expr);
			expect(result).toBeNull();
		});
	});
});

describe('Addition Formulas', () => {
	describe('TRANSFORM_COSH_SUM', () => {
		it('should transform cosh(a+b)', () => {
			const expr = parseLatex('\\cosh(x+y)');
			const result = TRANSFORM_COSH_SUM(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('cosh');
			expect(latex).toContain('sinh');
		});

		it('should not transform cosh(x)', () => {
			const expr = parseLatex('\\cosh(x)');
			const result = TRANSFORM_COSH_SUM(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COSH_DIFFERENCE', () => {
		it('should transform cosh(a-b)', () => {
			const expr = parseLatex('\\cosh(x-y)');
			const result = TRANSFORM_COSH_DIFFERENCE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SINH_SUM', () => {
		it('should transform sinh(a+b)', () => {
			const expr = parseLatex('\\sinh(x+y)');
			const result = TRANSFORM_SINH_SUM(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SINH_DIFFERENCE', () => {
		it('should transform sinh(a-b)', () => {
			const expr = parseLatex('\\sinh(x-y)');
			const result = TRANSFORM_SINH_DIFFERENCE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_TANH_SUM', () => {
		it('should transform tanh(a+b)', () => {
			const expr = parseLatex('\\tanh(x+y)');
			const result = TRANSFORM_TANH_SUM(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_TANH_DIFFERENCE', () => {
		it('should transform tanh(a-b)', () => {
			const expr = parseLatex('\\tanh(x-y)');
			const result = TRANSFORM_TANH_DIFFERENCE(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Double Angle Expansion', () => {
	describe('TRANSFORM_EXPAND_DOUBLE_SINH', () => {
		it('should expand sinh(2x) to 2sinh(x)cosh(x)', () => {
			const expr = parseLatex('\\sinh(2x)');
			const result = TRANSFORM_EXPAND_DOUBLE_SINH(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sinh(x)', () => {
			const expr = parseLatex('\\sinh(x)');
			const result = TRANSFORM_EXPAND_DOUBLE_SINH(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_EXPAND_DOUBLE_COSH', () => {
		it('should expand cosh(2x)', () => {
			const expr = parseLatex('\\cosh(2x)');
			const result = TRANSFORM_EXPAND_DOUBLE_COSH(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_EXPAND_DOUBLE_TANH', () => {
		it('should expand tanh(2x)', () => {
			const expr = parseLatex('\\tanh(2x)');
			const result = TRANSFORM_EXPAND_DOUBLE_TANH(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Negative Argument Identities', () => {
	describe('TRANSFORM_SINH_NEGATIVE', () => {
		it('should transform sinh(-x) to -sinh(x)', () => {
			const expr = parseLatex('\\sinh(-x)');
			const result = TRANSFORM_SINH_NEGATIVE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COSH_NEGATIVE', () => {
		it('should transform cosh(-x) to cosh(x)', () => {
			const expr = parseLatex('\\cosh(-x)');
			const result = TRANSFORM_COSH_NEGATIVE(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_TANH_NEGATIVE', () => {
		it('should transform tanh(-x) to -tanh(x)', () => {
			const expr = parseLatex('\\tanh(-x)');
			const result = TRANSFORM_TANH_NEGATIVE(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Factorization (Sum to Product)', () => {
	describe('TRANSFORM_SINH_PLUS_SINH', () => {
		it('should factorize sinh(a) + sinh(b)', () => {
			const expr = parseLatex('\\sinh(x) + \\sinh(y)');
			const result = TRANSFORM_SINH_PLUS_SINH(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SINH_MINUS_SINH', () => {
		it('should factorize sinh(a) - sinh(b)', () => {
			const expr = parseLatex('\\sinh(x) - \\sinh(y)');
			const result = TRANSFORM_SINH_MINUS_SINH(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COSH_PLUS_COSH', () => {
		it('should factorize cosh(a) + cosh(b)', () => {
			const expr = parseLatex('\\cosh(x) + \\cosh(y)');
			const result = TRANSFORM_COSH_PLUS_COSH(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COSH_MINUS_COSH', () => {
		it('should factorize cosh(a) - cosh(b)', () => {
			const expr = parseLatex('\\cosh(x) - \\cosh(y)');
			const result = TRANSFORM_COSH_MINUS_COSH(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Half Angle Formulas', () => {
	describe('TRANSFORM_SINH_HALF_ANGLE', () => {
		it('should expand sinh(x/2)', () => {
			const expr = parseLatex('\\sinh(\\frac{x}{2})');
			const result = TRANSFORM_SINH_HALF_ANGLE(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sinh(x)', () => {
			const expr = parseLatex('\\sinh(x)');
			const result = TRANSFORM_SINH_HALF_ANGLE(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COSH_HALF_ANGLE', () => {
		it('should expand cosh(x/2)', () => {
			const expr = parseLatex('\\cosh(\\frac{x}{2})');
			const result = TRANSFORM_COSH_HALF_ANGLE(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Higher Power Formulas', () => {
	describe('TRANSFORM_SINH_CUBED', () => {
		it('should reduce sinh³(x)', () => {
			const expr = parseLatex('\\sinh^3(x)');
			const result = TRANSFORM_SINH_CUBED(expr);
			expect(result).not.toBeNull();
		});

		it('should not transform sinh²(x)', () => {
			const expr = parseLatex('\\sinh^2(x)');
			const result = TRANSFORM_SINH_CUBED(expr);
			expect(result).toBeNull();
		});
	});

	describe('TRANSFORM_COSH_CUBED', () => {
		it('should reduce cosh³(x)', () => {
			const expr = parseLatex('\\cosh^3(x)');
			const result = TRANSFORM_COSH_CUBED(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_SINH_FOURTH', () => {
		it('should reduce sinh⁴(x)', () => {
			const expr = parseLatex('\\sinh^4(x)');
			const result = TRANSFORM_SINH_FOURTH(expr);
			expect(result).not.toBeNull();
		});
	});

	describe('TRANSFORM_COSH_FOURTH', () => {
		it('should reduce cosh⁴(x)', () => {
			const expr = parseLatex('\\cosh^4(x)');
			const result = TRANSFORM_COSH_FOURTH(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Application Functions', () => {
	describe('contractToDoubleAngleH', () => {
		it('should contract sinh(x)*cosh(x)', () => {
			const expr = parseLatex('\\sinh(x)\\cosh(x)');
			const result = contractToDoubleAngleH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sinh-cosh-product');
		});

		it('should contract sinh²(x)', () => {
			const expr = parseLatex('\\sinh^2(x)');
			const result = contractToDoubleAngleH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sinh-squared');
		});
	});

	describe('simplifyHyperbolicPythagorean', () => {
		it('should simplify cosh² - sinh² = 1', () => {
			const expr = parseLatex('\\cosh^2(x) - \\sinh^2(x)');
			const result = simplifyHyperbolicPythagorean(expr);
			expect(result.changed).toBe(true);
			expect(toLatex(result.result)).toBe('1');
		});

		it('should simplify 1 + sinh² = cosh²', () => {
			const expr = parseLatex('1 + \\sinh^2(x)');
			const result = simplifyHyperbolicPythagorean(expr);
			expect(result.changed).toBe(true);
		});
	});

	describe('simplifyHyperbolicQuotients', () => {
		it('should simplify sinh/cosh = tanh', () => {
			const expr = parseLatex('\\frac{\\sinh(x)}{\\cosh(x)}');
			const result = simplifyHyperbolicQuotients(expr);
			expect(result.changed).toBe(true);
			expect(toLatex(result.result)).toContain('tanh');
		});
	});

	describe('linearizeH', () => {
		it('should linearize cosh(a)*cosh(b)', () => {
			const expr = parseLatex('\\cosh(2x)\\cosh(3x)');
			const result = linearizeH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cosh-cosh-product');
		});
	});

	describe('expandAdditionH', () => {
		it('should expand cosh(a+b)', () => {
			const expr = parseLatex('\\cosh(x+y)');
			const result = expandAdditionH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cosh-sum');
		});
	});

	describe('expandDoubleAngleH', () => {
		it('should expand sinh(2x)', () => {
			const expr = parseLatex('\\sinh(2x)');
			const result = expandDoubleAngleH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('expand-double-sinh');
		});
	});

	describe('simplifyNegativeArgumentH', () => {
		it('should simplify sinh(-x)', () => {
			const expr = parseLatex('\\sinh(-x)');
			const result = simplifyNegativeArgumentH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sinh-negative');
		});

		it('should simplify cosh(-x)', () => {
			const expr = parseLatex('\\cosh(-x)');
			const result = simplifyNegativeArgumentH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cosh-negative');
		});
	});

	describe('factorizeH', () => {
		it('should factorize sinh(x) + sinh(y)', () => {
			const expr = parseLatex('\\sinh(x) + \\sinh(y)');
			const result = factorizeH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sinh-plus-sinh');
		});
	});

	describe('expandHalfAngleH', () => {
		it('should expand sinh(x/2)', () => {
			const expr = parseLatex('\\sinh(\\frac{x}{2})');
			const result = expandHalfAngleH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sinh-half-angle');
		});
	});

	describe('reduceHigherPowersH', () => {
		it('should reduce sinh³(x)', () => {
			const expr = parseLatex('\\sinh^3(x)');
			const result = reduceHigherPowersH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('sinh-cubed');
		});

		it('should reduce cosh³(x)', () => {
			const expr = parseLatex('\\cosh^3(x)');
			const result = reduceHigherPowersH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('cosh-cubed');
		});

		it('should not change sinh²(x)', () => {
			const expr = parseLatex('\\sinh^2(x)');
			const result = reduceHigherPowersH(expr);
			expect(result.changed).toBe(false);
		});
	});

	describe('applyHyperbolicIdentities', () => {
		it('should apply multiple rules', () => {
			const expr = parseLatex('\\frac{\\sinh(x)}{\\cosh(x)}');
			const result = applyHyperbolicIdentities(expr);
			expect(result.changed).toBe(true);
		});

		it('should return unchanged for non-hyperbolic expressions', () => {
			const expr = parseLatex('x^2 + 1');
			const result = applyHyperbolicIdentities(expr);
			expect(result.changed).toBe(false);
			expect(result.appliedRules).toHaveLength(0);
		});

		it('should work on nested expressions', () => {
			const expr = parseLatex('2(\\cosh^2(x) - \\sinh^2(x))');
			const result = applyHyperbolicIdentities(expr);
			expect(result.changed).toBe(true);
		});
	});
});

describe('Tanh/Coth Pythagorean Identities', () => {
	describe('TRANSFORM_ONE_MINUS_TANH_SQUARED', () => {
		it('should transform 1 - tanh²(x) to sech²(x)', () => {
			const expr = parseLatex('1 - \\tanh^2(x)');
			const result = TRANSFORM_ONE_MINUS_TANH_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sech');
		});
	});

	describe('TRANSFORM_SECH_TANH_PYTHAGOREAN', () => {
		it('should transform sech²(x) + tanh²(x) to 1', () => {
			const expr = parseLatex('\\sech^2(x) + \\tanh^2(x)');
			const result = TRANSFORM_SECH_TANH_PYTHAGOREAN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('1');
		});

		it('should transform tanh²(x) + sech²(x) to 1', () => {
			const expr = parseLatex('\\tanh^2(x) + \\sech^2(x)');
			const result = TRANSFORM_SECH_TANH_PYTHAGOREAN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('1');
		});
	});

	describe('TRANSFORM_COTH_SQUARED_MINUS_ONE', () => {
		it('should transform coth²(x) - 1 to csch²(x)', () => {
			const expr = parseLatex('\\coth^2(x) - 1');
			const result = TRANSFORM_COTH_SQUARED_MINUS_ONE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('csch');
		});
	});

	describe('TRANSFORM_COTH_CSCH_PYTHAGOREAN', () => {
		it('should transform coth²(x) - csch²(x) to 1', () => {
			const expr = parseLatex('\\coth^2(x) - \\csch^2(x)');
			const result = TRANSFORM_COTH_CSCH_PYTHAGOREAN(expr);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('1');
		});
	});

	describe('TRANSFORM_ONE_PLUS_CSCH_SQUARED', () => {
		it('should transform 1 + csch²(x) to coth²(x)', () => {
			const expr = parseLatex('1 + \\csch^2(x)');
			const result = TRANSFORM_ONE_PLUS_CSCH_SQUARED(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('coth');
		});

		it('should transform csch²(x) + 1 to coth²(x)', () => {
			const expr = parseLatex('\\csch^2(x) + 1');
			const result = TRANSFORM_ONE_PLUS_CSCH_SQUARED(expr);
			expect(result).not.toBeNull();
		});
	});
});

describe('Tanh Half-Angle', () => {
	describe('TRANSFORM_TANH_HALF_ANGLE', () => {
		it('should transform tanh(x/2) to sinh(x)/(1+cosh(x))', () => {
			const expr = parseLatex('\\tanh(\\frac{x}{2})');
			const result = TRANSFORM_TANH_HALF_ANGLE(expr);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sinh');
			expect(latex).toContain('cosh');
		});

		it('should not transform tanh(x)', () => {
			const expr = parseLatex('\\tanh(x)');
			const result = TRANSFORM_TANH_HALF_ANGLE(expr);
			expect(result).toBeNull();
		});
	});

	describe('expandHalfAngleH with tanh', () => {
		it('should expand tanh(x/2)', () => {
			const expr = parseLatex('\\tanh(\\frac{x}{2})');
			const result = expandHalfAngleH(expr);
			expect(result.changed).toBe(true);
			expect(result.appliedRules).toContain('tanh-half-angle');
		});
	});
});
