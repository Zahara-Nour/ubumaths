import { parseLatexSafe } from '../index';
import { describe, it, expect } from 'vitest';

describe('parseLatexSafe rejects consecutive signs', () => {
	it('should reject x++y (double plus)', () => {
		const result = parseLatexSafe('x++y');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].code).toBe('CONSECUTIVE_SIGNS');
	});

	it('should reject x--y (double minus)', () => {
		const result = parseLatexSafe('x--y');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].code).toBe('CONSECUTIVE_SIGNS');
	});

	it('should reject x+-y (plus-minus)', () => {
		const result = parseLatexSafe('x+-y');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].code).toBe('CONSECUTIVE_SIGNS');
	});

	it('should reject x-+y (minus-plus)', () => {
		const result = parseLatexSafe('x-+y');
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].code).toBe('CONSECUTIVE_SIGNS');
	});

	it('should accept +x (leading plus is valid)', () => {
		const result = parseLatexSafe('+x');
		expect(result.errors).toHaveLength(0);
		expect(result.ast?.type).toBe('positive');
	});

	it('should accept -x (leading minus is valid)', () => {
		const result = parseLatexSafe('-x');
		expect(result.errors).toHaveLength(0);
		expect(result.ast?.type).toBe('opposite');
	});

	it('should accept x+y (normal addition)', () => {
		const result = parseLatexSafe('x+y');
		expect(result.errors).toHaveLength(0);
		expect(result.ast?.type).toBe('addition');
	});

	it('should accept x-y (normal subtraction)', () => {
		const result = parseLatexSafe('x-y');
		expect(result.errors).toHaveLength(0);
		expect(result.ast?.type).toBe('subtraction');
	});

	it('should accept (-2)*(-3) (parenthesized negatives)', () => {
		const result = parseLatexSafe('(-2)*(-3)');
		expect(result.errors).toHaveLength(0);
		expect(result.ast?.type).toBe('multiplication');
	});
});
