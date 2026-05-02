/**
 * Tests for tokenizer recognition of backslashed identifiers like \pi.
 *
 * \pi keeps its backslash in the token value (math constant, special-cased
 * downstream). All other lowercase Greek letters (\alpha, \beta, …, \omega)
 * are tokenized as IDENTIFIER with value stripped of the backslash, so
 * `\theta = 1` and `theta = 1` produce the same symbol-table entry.
 *
 * Capitals (`\Pi`, `\PI`) and unknown names are rejected.
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

	it('\\theta → IDENTIFIER with value "theta" (backslash stripped)', () => {
		const tokens = tokenize('\\theta');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'theta' });
	});

	it('\\alpha → IDENTIFIER with value "alpha" (backslash stripped)', () => {
		const tokens = tokenize('\\alpha');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'alpha' });
	});

	it('\\phi in assignment LHS: \\phi = 5 → IDENTIFIER "phi"', () => {
		const tokens = tokenize('\\phi = 5');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'phi' });
		expect(tokens[1]).toMatchObject({ type: 'EQUALS' });
	});

	it('\\omega and other lowercase Greek letters all accepted', () => {
		for (const letter of [
			'alpha',
			'beta',
			'gamma',
			'delta',
			'epsilon',
			'zeta',
			'eta',
			'theta',
			'iota',
			'kappa',
			'lambda',
			'mu',
			'nu',
			'xi',
			'rho',
			'sigma',
			'tau',
			'upsilon',
			'phi',
			'chi',
			'psi',
			'omega'
		]) {
			const tokens = tokenize(`\\${letter}`);
			expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: letter });
		}
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
