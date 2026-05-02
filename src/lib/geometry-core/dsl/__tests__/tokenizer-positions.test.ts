/**
 * Tests for tokenizer source positions (start/end offsets).
 *
 * Phase 1 of dsl-mathast-routing plan: tokens must carry absolute start/end
 * positions in the original source so the interpreter can extract the raw
 * source slice of any expression for routing to parseCustom().
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokenizer';

describe('tokenizer — source positions (start/end)', () => {
	it('single number: start at 0, end after digits', () => {
		const tokens = tokenize('42');
		const num = tokens[0];
		expect(num.type).toBe('NUMBER');
		expect(num.start).toBe(0);
		expect(num.end).toBe(2);
	});

	it('decimal number: end after decimal part', () => {
		const tokens = tokenize('3.14');
		const num = tokens[0];
		expect(num.start).toBe(0);
		expect(num.end).toBe(4);
	});

	it('identifier: end after last char', () => {
		const tokens = tokenize('MonPoint');
		const id = tokens[0];
		expect(id.type).toBe('IDENTIFIER');
		expect(id.start).toBe(0);
		expect(id.end).toBe(8);
	});

	it('two tokens separated by space: positions reflect source layout', () => {
		const tokens = tokenize('a + b');
		// a at 0..1, + at 2..3, b at 4..5
		expect(tokens[0]).toMatchObject({ value: 'a', start: 0, end: 1 });
		expect(tokens[1]).toMatchObject({ value: '+', start: 2, end: 3 });
		expect(tokens[2]).toMatchObject({ value: 'b', start: 4, end: 5 });
	});

	it('two-char operator: end is start + 2', () => {
		const tokens = tokenize('a == b');
		expect(tokens[1]).toMatchObject({ type: 'DOUBLE_EQUALS', start: 2, end: 4 });
	});

	it('multi-line source: positions are absolute in full source', () => {
		const source = 'a = 1\nb = 2';
		const tokens = tokenize(source);
		// a at 0..1, = at 2..3, 1 at 4..5, NEWLINE, b at 6..7, = at 8..9, 2 at 10..11
		const a = tokens.find((t) => t.value === 'a');
		const b = tokens.find((t) => t.value === 'b');
		const one = tokens.find((t) => t.value === '1');
		const two = tokens.find((t) => t.value === '2');
		expect(a).toMatchObject({ start: 0, end: 1 });
		expect(one).toMatchObject({ start: 4, end: 5 });
		expect(b).toMatchObject({ start: 6, end: 7 });
		expect(two).toMatchObject({ start: 10, end: 11 });
	});

	it('string literal: start before opening quote, end after closing quote', () => {
		const tokens = tokenize('"hello"');
		expect(tokens[0]).toMatchObject({ type: 'STRING', value: 'hello', start: 0, end: 7 });
	});

	it('parenthesized call: each token has correct positions', () => {
		const tokens = tokenize('f(2)');
		// f at 0..1, ( at 1..2, 2 at 2..3, ) at 3..4
		expect(tokens[0]).toMatchObject({ value: 'f', start: 0, end: 1 });
		expect(tokens[1]).toMatchObject({ value: '(', start: 1, end: 2 });
		expect(tokens[2]).toMatchObject({ value: '2', start: 2, end: 3 });
		expect(tokens[3]).toMatchObject({ value: ')', start: 3, end: 4 });
	});

	it('indented line: positions account for leading spaces', () => {
		const source = 'macro f():\n    a = 1';
		const tokens = tokenize(source);
		// a is on line 2, after 4 spaces of indentation. Source offset:
		//   "macro f():\n    a = 1"
		//   0123456789 0123 4 5
		// 'a' should be at offset 15 (10 newline + 4 spaces + 0 for a)
		const a = tokens.find((t) => t.value === 'a');
		expect(a?.start).toBe(15);
		expect(a?.end).toBe(16);
	});
});
