/**
 * Tests for tokenizer recognition of backslashed identifiers like \pi.
 *
 * Phase 1 of dsl-mathast-routing plan: \name must be tokenized as a single
 * IDENTIFIER token with value '\name' (backslash included). For V1, only
 * \pi is whitelisted; other \name produce a tokenizer error.
 */

import { describe, it, expect } from 'vitest';
import { tokenize, DslTokenizerError } from '../tokenizer';

describe('tokenizer — backslash identifiers (\\pi)', () => {
	it('\\pi → IDENTIFIER with value "\\pi"', () => {
		const tokens = tokenize('\\pi');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: '\\pi' });
	});

	it('\\pi positions span backslash + name', () => {
		const tokens = tokenize('\\pi');
		expect(tokens[0]).toMatchObject({ start: 0, end: 3 });
	});

	it('\\pi inside expression: 2 * \\pi', () => {
		const tokens = tokenize('2 * \\pi');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '2' });
		expect(tokens[1]).toMatchObject({ type: 'STAR' });
		expect(tokens[2]).toMatchObject({ type: 'IDENTIFIER', value: '\\pi', start: 4, end: 7 });
	});

	it('\\pi in assignment LHS: \\pi = 5', () => {
		const tokens = tokenize('\\pi = 5');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: '\\pi' });
		expect(tokens[1]).toMatchObject({ type: 'EQUALS' });
		expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '5' });
	});

	it('\\theta → tokenizer error (not whitelisted in V1)', () => {
		expect(() => tokenize('\\theta')).toThrow(DslTokenizerError);
		expect(() => tokenize('\\theta')).toThrow(/\\theta.*inconnue/i);
	});

	it('\\alpha → tokenizer error', () => {
		expect(() => tokenize('\\alpha')).toThrow(DslTokenizerError);
	});

	it('\\Pi (capital) → tokenizer error', () => {
		expect(() => tokenize('\\Pi')).toThrow(DslTokenizerError);
	});

	it('\\PI (all caps) → tokenizer error', () => {
		expect(() => tokenize('\\PI')).toThrow(DslTokenizerError);
	});

	it('lone backslash → tokenizer error', () => {
		expect(() => tokenize('\\')).toThrow(DslTokenizerError);
	});

	it('backslash + digit → tokenizer error (not a valid name)', () => {
		expect(() => tokenize('\\3')).toThrow(DslTokenizerError);
	});
});
