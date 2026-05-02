/**
 * Tests for parser propagation of source positions onto DslExpr nodes.
 *
 * Phase 1 of dsl-mathast-routing plan: each DslExpr produced by the parser
 * carries start/end positions (absolute in source) so the interpreter can
 * extract the raw source slice via getRawSource().
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import type { DslAssignment, DslBinaryExpr, DslFunctionCallExpr } from '../types';

describe('parser — DslExpr positions', () => {
	it('program carries the original source string', () => {
		const source = 'r = 42';
		const program = parse(source);
		expect(program.source).toBe(source);
	});

	it('number literal: start/end span the digits', () => {
		const source = 'r = 42';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const value = stmt.value;
		expect(value.kind).toBe('number');
		expect(value.start).toBe(4);
		expect(value.end).toBe(6);
	});

	it('identifier: start/end span the name', () => {
		const source = 'r = foo';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const value = stmt.value;
		expect(value.kind).toBe('identifier');
		expect(value.start).toBe(4);
		expect(value.end).toBe(7);
	});

	it('binary expression: start = leftmost token, end = rightmost token', () => {
		const source = 'r = 2 + 3';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const bin = stmt.value as DslBinaryExpr;
		expect(bin.kind).toBe('binary');
		expect(bin.start).toBe(4);
		expect(bin.end).toBe(9);
	});

	it('nested binary: outer start/end span the whole expression', () => {
		const source = 'r = 2 + 3 * 4';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const bin = stmt.value as DslBinaryExpr;
		expect(bin.start).toBe(4);
		expect(bin.end).toBe(13);
	});

	it('function call: start at name, end after closing paren', () => {
		const source = 'r = sqrt(2)';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const call = stmt.value as DslFunctionCallExpr;
		expect(call.kind).toBe('call');
		expect(call.start).toBe(4);
		expect(call.end).toBe(11);
	});

	it('parenthesized expression: positions span outer parentheses', () => {
		const source = 'r = (2 + 3)';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const value = stmt.value;
		// Outer expression should start at the opening paren and end after closing paren.
		expect(value.start).toBe(4);
		expect(value.end).toBe(11);
	});

	it('\\pi identifier: start/end span backslash + name', () => {
		const source = 'r = \\pi';
		const program = parse(source);
		const stmt = program.statements[0] as DslAssignment;
		const value = stmt.value;
		expect(value.kind).toBe('identifier');
		expect((value as { name: string }).name).toBe('\\pi');
		expect(value.start).toBe(4);
		expect(value.end).toBe(7);
	});

	it('multi-line: positions are absolute in the full source', () => {
		const source = 'a = 1\nb = a + 2';
		const program = parse(source);
		const stmt2 = program.statements[1] as DslAssignment;
		const bin = stmt2.value as DslBinaryExpr;
		// "a + 2" starts at offset 10 (after "a = 1\nb = "), ends at 15.
		expect(bin.start).toBe(10);
		expect(bin.end).toBe(15);
	});
});
