/**
 * Tests for domain validation functions
 */

import { describe, it, expect } from 'vitest';
import { isInDomain, getDomainViolations } from '../validate';
import { variable, number, add, sqrt, ln, fraction, func } from '../../factory';
import { parseLatex } from '../../parser';

describe('isInDomain()', () => {
	describe('sqrt(x)', () => {
		const expr = sqrt(variable('x'));

		it('returns true for x = 4', () => {
			expect(isInDomain(expr, { x: 4 })).toBe(true);
		});

		it('returns true for x = 0', () => {
			expect(isInDomain(expr, { x: 0 })).toBe(true);
		});

		it('returns false for x = -1', () => {
			expect(isInDomain(expr, { x: -1 })).toBe(false);
		});

		it('returns false for x = -0.001', () => {
			expect(isInDomain(expr, { x: -0.001 })).toBe(false);
		});
	});

	describe('ln(x)', () => {
		const expr = ln(variable('x'));

		it('returns true for x = 1', () => {
			expect(isInDomain(expr, { x: 1 })).toBe(true);
		});

		it('returns true for x = 0.001', () => {
			expect(isInDomain(expr, { x: 0.001 })).toBe(true);
		});

		it('returns false for x = 0', () => {
			expect(isInDomain(expr, { x: 0 })).toBe(false);
		});

		it('returns false for x = -1', () => {
			expect(isInDomain(expr, { x: -1 })).toBe(false);
		});
	});

	describe('1/x', () => {
		const expr = fraction(number('1'), variable('x'));

		it('returns true for x = 1', () => {
			expect(isInDomain(expr, { x: 1 })).toBe(true);
		});

		it('returns true for x = -1', () => {
			expect(isInDomain(expr, { x: -1 })).toBe(true);
		});

		it('returns false for x = 0', () => {
			expect(isInDomain(expr, { x: 0 })).toBe(false);
		});
	});

	describe('arcsin(x)', () => {
		const expr = func('arcsin', [variable('x')]);

		it('returns true for x = 0', () => {
			expect(isInDomain(expr, { x: 0 })).toBe(true);
		});

		it('returns true for x = 1', () => {
			expect(isInDomain(expr, { x: 1 })).toBe(true);
		});

		it('returns true for x = -1', () => {
			expect(isInDomain(expr, { x: -1 })).toBe(true);
		});

		it('returns false for x = 2', () => {
			expect(isInDomain(expr, { x: 2 })).toBe(false);
		});

		it('returns false for x = -1.01', () => {
			expect(isInDomain(expr, { x: -1.01 })).toBe(false);
		});
	});

	describe('composed expressions', () => {
		it('sqrt(x) + ln(x) returns true for x = 1', () => {
			const expr = add(sqrt(variable('x')), ln(variable('x')));
			expect(isInDomain(expr, { x: 1 })).toBe(true);
		});

		it('sqrt(x) + ln(x) returns false for x = 0', () => {
			const expr = add(sqrt(variable('x')), ln(variable('x')));
			expect(isInDomain(expr, { x: 0 })).toBe(false);
		});
	});
});

describe('getDomainViolations()', () => {
	describe('valid inputs', () => {
		it('returns empty array for sqrt(4)', () => {
			const expr = sqrt(variable('x'));
			const violations = getDomainViolations(expr, { x: 4 });
			expect(violations).toHaveLength(0);
		});

		it('returns empty array for ln(1)', () => {
			const expr = ln(variable('x'));
			const violations = getDomainViolations(expr, { x: 1 });
			expect(violations).toHaveLength(0);
		});
	});

	describe('single violation', () => {
		it('returns violation for sqrt(-1)', () => {
			const expr = sqrt(variable('x'));
			const violations = getDomainViolations(expr, { x: -1 });
			expect(violations).toHaveLength(1);
			expect(violations[0].source).toBe('sqrt');
			expect(violations[0].constraint).toBe('x >= 0');
			expect(violations[0].value).toBe(-1);
		});

		it('returns violation for ln(0)', () => {
			const expr = ln(variable('x'));
			const violations = getDomainViolations(expr, { x: 0 });
			expect(violations).toHaveLength(1);
			expect(violations[0].source).toBe('ln');
			expect(violations[0].constraint).toBe('x > 0');
			expect(violations[0].value).toBe(0);
		});

		it('returns violation for 1/0', () => {
			const expr = fraction(number('1'), variable('x'));
			const violations = getDomainViolations(expr, { x: 0 });
			expect(violations).toHaveLength(1);
			expect(violations[0].source).toBe('division');
			expect(violations[0].value).toBe(0);
		});

		it('returns violation for arcsin(2)', () => {
			const expr = func('arcsin', [variable('x')]);
			const violations = getDomainViolations(expr, { x: 2 });
			expect(violations).toHaveLength(1);
			expect(violations[0].source).toBe('arcsin');
		});
	});

	describe('multiple violations', () => {
		it('returns two violations for sqrt(x) + ln(x) with x = -1', () => {
			const expr = add(sqrt(variable('x')), ln(variable('x')));
			const violations = getDomainViolations(expr, { x: -1 });
			// sqrt(-1) and ln(-1) both violate their domains
			expect(violations.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('French messages', () => {
		it('violation has French message', () => {
			const expr = sqrt(variable('x'));
			const violations = getDomainViolations(expr, { x: -1 });
			expect(violations[0].messageFr).toContain('sqrt');
			expect(violations[0].messageFr).toContain('requiert');
		});

		it('violation has English message', () => {
			const expr = sqrt(variable('x'));
			const violations = getDomainViolations(expr, { x: -1 });
			expect(violations[0].messageEn).toContain('sqrt');
			expect(violations[0].messageEn).toContain('requires');
		});
	});
});

// Racine n-ième : l'indice est porté par `base` (`\sqrt[3]{x}`). Indice impair :
// racine définie sur ℝ (∛−8 = −2, décision #925) ; indice pair : radicande ≥ 0.
describe('isInDomain() — racine n-ième (indice dans base)', () => {
	it('∛x est défini en x = −8', () => {
		expect(isInDomain(parseLatex('\\sqrt[3]{x}'), { x: -8 })).toBe(true);
		expect(getDomainViolations(parseLatex('\\sqrt[3]{x}'), { x: -8 })).toEqual([]);
	});

	it('⁴√x n’est pas défini en x = −16', () => {
		expect(isInDomain(parseLatex('\\sqrt[4]{x}'), { x: -16 })).toBe(false);
	});

	it('∛8 vaut 2 (pas √8) : 1/(∛x − 2) n’est pas défini en x = 8', () => {
		expect(isInDomain(parseLatex('\\frac{1}{\\sqrt[3]{x}-2}'), { x: 8 })).toBe(false);
	});

	it('∛−8 vaut −2 : 1/(∛x + 2) n’est pas défini en x = −8', () => {
		expect(isInDomain(parseLatex('\\frac{1}{\\sqrt[3]{x}+2}'), { x: -8 })).toBe(false);
	});

	it('ln(∛x) n’est pas défini en x = −8 (∛−8 < 0)', () => {
		expect(isInDomain(parseLatex('\\ln(\\sqrt[3]{x})'), { x: -8 })).toBe(false);
	});

	it('√x sans indice : inchangé', () => {
		expect(isInDomain(parseLatex('\\sqrt{x}'), { x: -8 })).toBe(false);
		expect(isInDomain(parseLatex('\\frac{1}{\\sqrt{x}-2}'), { x: 4 })).toBe(false);
	});
});
