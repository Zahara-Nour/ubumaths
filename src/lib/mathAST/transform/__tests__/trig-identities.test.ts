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
	applyTrigIdentities,
	contractToDoubleAngle,
	simplifyPythagorean,
	simplifyQuotients
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
