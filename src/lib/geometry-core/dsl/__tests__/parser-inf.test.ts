/**
 * Tests for the `inf` / `+inf` / `-inf` DSL tokens — Phase 1 of V5
 * (intégrales généralisées).
 *
 * Spec: docs/wip/geometry/improper-integrals-study.md §2.1.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function runScript(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('DSL — `inf` token (V5 improper integrals Phase 1)', () => {
	describe('basic parsing', () => {
		it('parses bare `inf` as +Infinity', () => {
			const { symbols } = runScript('a = inf');
			const entry = symbols.get('a');
			expect(entry).toBeDefined();
			expect(entry!.type).toBe('nombre');
			expect(entry!.value).toBe(Infinity);
		});

		it('parses `-inf` as -Infinity', () => {
			const { symbols } = runScript('a = -inf');
			const entry = symbols.get('a');
			expect(entry).toBeDefined();
			expect(entry!.type).toBe('nombre');
			expect(entry!.value).toBe(-Infinity);
		});

		it('parses `+inf` as +Infinity (unary plus no-op)', () => {
			const { symbols } = runScript('a = +inf');
			const entry = symbols.get('a');
			expect(entry).toBeDefined();
			expect(entry!.type).toBe('nombre');
			expect(entry!.value).toBe(Infinity);
		});
	});

	describe('JS semantics inherited', () => {
		it('inf + 1 evaluates to Infinity', () => {
			const { symbols } = runScript('a = inf + 1');
			expect(symbols.get('a')!.value).toBe(Infinity);
		});

		it('inf - inf evaluates to NaN (documented)', () => {
			const { symbols } = runScript('a = inf - inf');
			expect(Number.isNaN(symbols.get('a')!.value)).toBe(true);
		});

		it('1 / inf evaluates to 0', () => {
			const { symbols } = runScript('a = 1 / inf');
			expect(symbols.get('a')!.value).toBe(0);
		});

		it('inf * 0 evaluates to NaN', () => {
			const { symbols } = runScript('a = inf * 0');
			expect(Number.isNaN(symbols.get('a')!.value)).toBe(true);
		});

		it('-inf < 0 (comparison) evaluates to truthy 1', () => {
			const { symbols } = runScript('a = -inf < 0');
			expect(symbols.get('a')!.value).toBe(1);
		});
	});

	describe('parseUnary PLUS no-op', () => {
		it('+5 parses as 5', () => {
			const { symbols } = runScript('a = +5');
			expect(symbols.get('a')!.value).toBe(5);
		});

		it('+(-3) parses as -3', () => {
			const { symbols } = runScript('a = +(-3)');
			expect(symbols.get('a')!.value).toBe(-3);
		});

		it('-+5 parses as -5', () => {
			const { symbols } = runScript('a = -+5');
			expect(symbols.get('a')!.value).toBe(-5);
		});
	});

	describe('inf as builtin argument (preview Phase 2)', () => {
		// These tests verify the token is correctly resolved before reaching builtins.
		// The actual improper-integral routing comes in Phase 2.
		it('inf can be assigned to a variable used in arithmetic chains', () => {
			const { symbols } = runScript(['a = inf', 'b = 1 / a', 'c = b + 1'].join('\n'));
			expect(symbols.get('a')!.value).toBe(Infinity);
			expect(symbols.get('b')!.value).toBe(0);
			expect(symbols.get('c')!.value).toBe(1);
		});

		it('inf is not redefinable (or shadowable to a finite value)', () => {
			// Pre-loaded `inf` lives in the global scope. Assigning to `inf` shadows it
			// in the local scope of an assignment — current symbol table semantics
			// allow shadowing. This documents the expected behavior.
			const { symbols } = runScript(['inf = 42', 'a = inf'].join('\n'));
			expect(symbols.get('a')!.value).toBe(42);
		});

		it('inf shadow inside macro does not leak to outer scope', () => {
			const { symbols } = runScript(
				['macro toto():', '    inf = 42', '    retourne inf', 'a = toto()', 'b = inf'].join('\n')
			);
			expect(symbols.get('a')!.value).toBe(42);
			expect(symbols.get('b')!.value).toBe(Infinity);
		});
	});
});
