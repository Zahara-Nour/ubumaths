/**
 * Tests for getRawSource() helper that extracts a slice of the original
 * source corresponding to a parsed DslExpr.
 *
 * Phase 1 of dsl-mathast-routing plan: required to pass an expression's
 * raw source to parseCustom() in later phases.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { getRawSource } from '../source-utils';
import type { DslAssignment } from '../types';

describe('getRawSource()', () => {
	it('returns the exact substring for a number literal RHS', () => {
		const source = 'r = 42';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		expect(getRawSource(stmt.value, source)).toBe('42');
	});

	it('returns the substring for a binary expression RHS', () => {
		const source = 'r = 2 + 3';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		expect(getRawSource(stmt.value, source)).toBe('2 + 3');
	});

	it('returns the substring for a function call RHS', () => {
		const source = 'r = sqrt(2)';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		expect(getRawSource(stmt.value, source)).toBe('sqrt(2)');
	});

	it('returns the substring for a \\pi identifier', () => {
		const source = 'r = \\pi';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		expect(getRawSource(stmt.value, source)).toBe('\\pi');
	});

	it('returns the substring for a complex math expression', () => {
		const source = 'r = 2 * \\pi + sqrt(3)';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		expect(getRawSource(stmt.value, source)).toBe('2 * \\pi + sqrt(3)');
	});

	it('multi-line: returns the correct substring for the second statement', () => {
		const source = 'a = 1\nb = a + 2';
		const program = parse(source);
		const stmt2 = program.statements[1] as DslAssignment;
		expect(getRawSource(stmt2.value, source)).toBe('a + 2');
	});

	it('returns null when expression has no positions', () => {
		const source = 'unused';
		const fakeExpr = { kind: 'number' as const, value: 1, line: 1 };
		expect(getRawSource(fakeExpr, source)).toBe(null);
	});
});
