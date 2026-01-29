/**
 * Tests for Student Domain Validation
 *
 * Tests for parsing, comparing, and validating student domain answers.
 */

import { describe, it, expect } from 'vitest';
import {
	parseStudentDomain,
	compareDomains,
	domainsAreEqual,
	calculateDomainSimilarity,
	validateStudentDomain,
	generateDomainHints
} from '../validation';
import {
	intervalDomain,
	universalDomain,
	emptyDomain,
	greaterThan,
	greaterThanOrEqual,
	openInterval,
	fromNumber
} from '../factory';
import type { MathNode } from '../../types';

// =============================================================================
// Parse Student Domain Tests
// =============================================================================

describe('parseStudentDomain - interval notation', () => {
	it('should parse French open interval ]a, b[', () => {
		const result = parseStudentDomain(']0, 5[');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.format).toBe('interval');
			expect(result.domain.kind).toBe('interval_set');
		}
	});

	it('should parse French closed interval [a, b]', () => {
		const result = parseStudentDomain('[0, 5]');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.format).toBe('interval');
		}
	});

	it('should parse mixed interval ]a, b]', () => {
		const result = parseStudentDomain(']0, 5]');
		expect(result.success).toBe(true);
	});

	it('should parse interval with infinity ]0, +∞[', () => {
		const result = parseStudentDomain(']0, +∞[');
		expect(result.success).toBe(true);
	});

	it('should parse interval with negative infinity ]-∞, 0[', () => {
		const result = parseStudentDomain(']-inf, 0[');
		expect(result.success).toBe(true);
	});

	it('should parse union of intervals', () => {
		const result = parseStudentDomain(']-∞, 0[ ∪ ]1, +∞[');
		expect(result.success).toBe(true);
	});

	it('should parse interval with excluded points ]0, +∞[ \\ {1}', () => {
		const result = parseStudentDomain(']0, +∞[ \\ {1}');
		expect(result.success).toBe(true);
	});
});

describe('parseStudentDomain - condition notation', () => {
	it('should parse x > 0', () => {
		const result = parseStudentDomain('x > 0');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.format).toBe('condition');
		}
	});

	it('should parse x >= 0', () => {
		const result = parseStudentDomain('x >= 0');
		expect(result.success).toBe(true);
	});

	it('should parse x <= 5', () => {
		const result = parseStudentDomain('x <= 5');
		expect(result.success).toBe(true);
	});

	it('should parse compound condition with "et"', () => {
		const result = parseStudentDomain('x > 0 et x != 1');
		expect(result.success).toBe(true);
	});

	it('should parse compound condition with "ou"', () => {
		const result = parseStudentDomain('x < 0 ou x > 1');
		expect(result.success).toBe(true);
	});

	it('should parse double inequality 0 < x <= 5', () => {
		const result = parseStudentDomain('0 < x <= 5');
		expect(result.success).toBe(true);
	});

	it('should parse reversed inequality 5 > x', () => {
		const result = parseStudentDomain('5 > x');
		expect(result.success).toBe(true);
	});
});

describe('parseStudentDomain - set notation', () => {
	it('should parse ℝ', () => {
		const result = parseStudentDomain('ℝ');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.domain.kind).toBe('universal');
			expect(result.format).toBe('set_notation');
		}
	});

	it('should parse R (ASCII)', () => {
		const result = parseStudentDomain('R');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.domain.kind).toBe('universal');
		}
	});

	it('should parse ℝ*', () => {
		const result = parseStudentDomain('ℝ*');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.domain.kind).toBe('interval_set');
		}
	});

	it('should parse ℝ₊', () => {
		const result = parseStudentDomain('ℝ₊');
		expect(result.success).toBe(true);
	});

	it('should parse ℝ+', () => {
		const result = parseStudentDomain('ℝ+');
		expect(result.success).toBe(true);
	});

	it('should parse ℝ \\ {0}', () => {
		const result = parseStudentDomain('ℝ \\ {0}');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.format).toBe('set_notation');
		}
	});

	it('should parse ℝ \\ {0, 1}', () => {
		const result = parseStudentDomain('ℝ \\ {0, 1}');
		expect(result.success).toBe(true);
	});

	it('should parse ∅ (empty set)', () => {
		const result = parseStudentDomain('∅');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.domain.kind).toBe('empty');
		}
	});
});

describe('parseStudentDomain - edge cases', () => {
	it('should fail on empty input', () => {
		const result = parseStudentDomain('');
		expect(result.success).toBe(false);
	});

	it('should fail on invalid format', () => {
		const result = parseStudentDomain('not a domain');
		expect(result.success).toBe(false);
	});

	it('should handle Unicode normalization', () => {
		const result = parseStudentDomain('x ≥ 0'); // Unicode ≥
		expect(result.success).toBe(true);
	});
});

// =============================================================================
// Domain Comparison Tests
// =============================================================================

describe('compareDomains', () => {
	it('should detect equal domains', () => {
		const d1 = intervalDomain([greaterThan(fromNumber(0))]);
		const d2 = intervalDomain([greaterThan(fromNumber(0))]);

		const result = compareDomains(d1, d2);
		expect(result.areEqual).toBe(true);
		expect(result.studentIsSubset).toBe(false);
		expect(result.studentIsSuperset).toBe(false);
	});

	it('should detect student subset (too restrictive)', () => {
		const student = intervalDomain([greaterThan(fromNumber(0))]); // ]0, +∞[
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]); // [0, +∞[

		const result = compareDomains(student, correct);
		expect(result.areEqual).toBe(false);
		expect(result.studentIsSubset).toBe(true);
		expect(result.studentIsSuperset).toBe(false);
	});

	it('should detect student superset (too permissive)', () => {
		const student = universalDomain(); // ℝ
		const correct = intervalDomain([greaterThan(fromNumber(0))]); // ]0, +∞[

		const result = compareDomains(student, correct);
		expect(result.areEqual).toBe(false);
		expect(result.studentIsSubset).toBe(false);
		expect(result.studentIsSuperset).toBe(true);
	});

	it('should detect mixed error (missing and extra)', () => {
		const student = intervalDomain([greaterThan(fromNumber(1))]); // ]1, +∞[
		const correct = intervalDomain([openInterval(fromNumber(0), fromNumber(5))]); // ]0, 5[

		const result = compareDomains(student, correct);
		expect(result.areEqual).toBe(false);
		// Not a simple subset/superset relationship
	});
});

describe('domainsAreEqual', () => {
	it('should return true for identical empty domains', () => {
		expect(domainsAreEqual(emptyDomain(), emptyDomain())).toBe(true);
	});

	it('should return true for identical universal domains', () => {
		expect(domainsAreEqual(universalDomain(), universalDomain())).toBe(true);
	});

	it('should return true for equivalent interval domains', () => {
		const d1 = intervalDomain([greaterThan(fromNumber(0))]);
		const d2 = intervalDomain([greaterThan(fromNumber(0))]);
		expect(domainsAreEqual(d1, d2)).toBe(true);
	});

	it('should return false for different domains', () => {
		const d1 = intervalDomain([greaterThan(fromNumber(0))]);
		const d2 = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		expect(domainsAreEqual(d1, d2)).toBe(false);
	});
});

describe('calculateDomainSimilarity', () => {
	it('should return 100 for equal domains', () => {
		const domain = intervalDomain([greaterThan(fromNumber(0))]);
		expect(calculateDomainSimilarity(domain, domain)).toBe(100);
	});

	it('should return 100 for both empty', () => {
		expect(calculateDomainSimilarity(emptyDomain(), emptyDomain())).toBe(100);
	});

	it('should return partial credit for subset', () => {
		const student = intervalDomain([greaterThan(fromNumber(0))]);
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const score = calculateDomainSimilarity(student, correct);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(100);
	});

	it('should return partial credit for superset', () => {
		const student = universalDomain();
		const correct = intervalDomain([greaterThan(fromNumber(0))]);
		const score = calculateDomainSimilarity(student, correct);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(100);
	});
});

// =============================================================================
// Validate Student Domain Tests
// =============================================================================

describe('validateStudentDomain', () => {
	const sqrtExpr: MathNode = {
		type: 'function',
		name: 'sqrt',
		args: [{ type: 'variable', name: 'x' }]
	};

	it('should validate correct answer', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const result = validateStudentDomain('[0, +∞[', correct, sqrtExpr);

		expect(result.isCorrect).toBe(true);
		expect(result.score).toBe(100);
	});

	it('should reject incorrect answer with feedback', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const result = validateStudentDomain(']0, +∞[', correct, sqrtExpr);

		expect(result.isCorrect).toBe(false);
		expect(result.score).toBeGreaterThan(0); // Partial credit
		expect(result.feedback.length).toBeGreaterThan(0);
	});

	it('should handle parse errors', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const result = validateStudentDomain('invalid', correct, sqrtExpr);

		expect(result.isCorrect).toBe(false);
		expect(result.score).toBe(0);
		expect(result.parseError).toBeDefined();
	});

	it('should accept equivalent notations', () => {
		const correct = intervalDomain([greaterThan(fromNumber(0))]);

		const result1 = validateStudentDomain(']0, +∞[', correct, sqrtExpr);
		const result2 = validateStudentDomain('x > 0', correct, sqrtExpr);
		const result3 = validateStudentDomain('ℝ*₊', correct, sqrtExpr);

		expect(result1.isCorrect).toBe(true);
		expect(result2.isCorrect).toBe(true);
		expect(result3.isCorrect).toBe(true);
	});
});

// =============================================================================
// Generate Domain Hints Tests
// =============================================================================

describe('generateDomainHints', () => {
	const sqrtExpr: MathNode = {
		type: 'function',
		name: 'sqrt',
		args: [{ type: 'variable', name: 'x' }]
	};

	const lnExpr: MathNode = {
		type: 'function',
		name: 'ln',
		args: [{ type: 'variable', name: 'x' }]
	};

	it('should generate level 1 hints (vague)', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const hints = generateDomainHints(sqrtExpr, null, correct, { level: 1 });

		expect(hints.length).toBeGreaterThan(0);
		expect(hints[0]).toContain('racine carrée');
	});

	it('should generate level 2 hints (more specific)', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const hints = generateDomainHints(sqrtExpr, null, correct, { level: 2 });

		expect(hints.length).toBeGreaterThan(0);
		expect(hints.some((h) => h.includes('positif') || h.includes('≥ 0'))).toBe(true);
	});

	it('should generate level 3 hints (very specific)', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const hints = generateDomainHints(sqrtExpr, null, correct, { level: 3 });

		expect(hints.length).toBeGreaterThan(0);
	});

	it('should generate hints for logarithm', () => {
		const correct = intervalDomain([greaterThan(fromNumber(0))]);
		const hints = generateDomainHints(lnExpr, null, correct, { level: 1 });

		expect(hints.some((h) => h.includes('logarithme'))).toBe(true);
	});

	it('should generate comparison hints when student answer provided', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const student = intervalDomain([greaterThan(fromNumber(0))]);

		const hints = generateDomainHints(sqrtExpr, student, correct, { level: 2 });
		expect(hints.some((h) => h.includes('exclu') || h.includes('manqu'))).toBe(true);
	});

	it('should respect maxHints option', () => {
		const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
		const hints = generateDomainHints(sqrtExpr, null, correct, { level: 3, maxHints: 1 });

		expect(hints.length).toBeLessThanOrEqual(1);
	});
});
