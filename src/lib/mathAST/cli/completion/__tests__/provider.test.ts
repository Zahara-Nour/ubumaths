/**
 * Completion Provider Tests
 *
 * Tests for auto-completion API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompletionProvider } from '../provider';

describe('CompletionProvider', () => {
	let provider: CompletionProvider;

	beforeEach(() => {
		provider = new CompletionProvider();
	});

	// =========================================================================
	// Function Completions
	// =========================================================================

	describe('function completions', () => {
		it('should suggest functions matching prefix', () => {
			const completions = provider.getCompletions('si');

			expect(completions.some((c) => c.label === 'sin' && c.kind === 'function')).toBe(true);
			expect(completions.some((c) => c.label === 'sinh' && c.kind === 'function')).toBe(true);
		});

		it('should suggest all functions for empty prefix', () => {
			const completions = provider.getCompletions('');

			const functions = completions.filter((c) => c.kind === 'function');
			expect(functions.length).toBeGreaterThan(0);
		});

		it('should include signature for functions', () => {
			const completions = provider.getCompletions('sin');
			const sinCompletion = completions.find((c) => c.label === 'sin');

			expect(sinCompletion).toBeDefined();
			expect(sinCompletion?.signature).toBeDefined();
		});

		it('should suggest log with optional base', () => {
			const completions = provider.getCompletions('log');
			const logCompletion = completions.find((c) => c.label === 'log');

			expect(logCompletion).toBeDefined();
			expect(logCompletion?.signature).toContain('base');
		});

		it('should suggest sqrt with optional index', () => {
			const completions = provider.getCompletions('sqrt');
			const sqrtCompletion = completions.find((c) => c.label === 'sqrt');

			expect(sqrtCompletion).toBeDefined();
			expect(sqrtCompletion?.signature).toBeDefined();
		});
	});

	// =========================================================================
	// Constant Completions
	// =========================================================================

	describe('constant completions', () => {
		it('should suggest pi', () => {
			const completions = provider.getCompletions('pi');

			expect(completions.some((c) => c.label === 'pi' && c.kind === 'constant')).toBe(true);
		});

		it('should suggest infinity', () => {
			const completions = provider.getCompletions('inf');

			expect(completions.some((c) => c.label === 'infty' && c.kind === 'constant')).toBe(true);
		});
	});

	// =========================================================================
	// Greek Letter Completions
	// =========================================================================

	describe('greek letter completions', () => {
		it('should suggest greek letters', () => {
			const completions = provider.getCompletions('alp');

			expect(completions.some((c) => c.label === 'alpha' && c.kind === 'greek')).toBe(true);
		});

		it('should suggest theta', () => {
			const completions = provider.getCompletions('the');

			expect(completions.some((c) => c.label === 'theta' && c.kind === 'greek')).toBe(true);
		});
	});

	// =========================================================================
	// Variable Completions with Context
	// =========================================================================

	describe('variable completions with context', () => {
		it('should suggest variables from context', () => {
			const context = {
				variables: ['x', 'y', 'myVar']
			};
			// Use higher maxResults to include all variables (default 20 may cut off due to built-ins)
			const completions = provider.getCompletions('', context, { maxResults: 50 });

			expect(completions.some((c) => c.label === 'x' && c.kind === 'variable')).toBe(true);
			expect(completions.some((c) => c.label === 'y' && c.kind === 'variable')).toBe(true);
			expect(completions.some((c) => c.label === 'myVar' && c.kind === 'variable')).toBe(true);
		});

		it('should filter variables by prefix', () => {
			const context = {
				variables: ['x', 'y', 'myVar']
			};
			const completions = provider.getCompletions('my', context);

			const variables = completions.filter((c) => c.kind === 'variable');
			expect(variables.length).toBe(1);
			expect(variables[0].label).toBe('myVar');
		});
	});

	// =========================================================================
	// Filtering and Sorting
	// =========================================================================

	describe('filtering and sorting', () => {
		it('should be case-insensitive', () => {
			const completions1 = provider.getCompletions('SIN');
			const completions2 = provider.getCompletions('sin');

			expect(completions1.some((c) => c.label === 'sin')).toBe(true);
			expect(completions2.some((c) => c.label === 'sin')).toBe(true);
		});

		it('should sort by relevance (exact prefix matches first)', () => {
			const completions = provider.getCompletions('sin');

			const sinIndex = completions.findIndex((c) => c.label === 'sin');
			const sinhIndex = completions.findIndex((c) => c.label === 'sinh');

			// Exact match should come before partial match
			expect(sinIndex).toBeLessThan(sinhIndex);
		});

		it('should limit results', () => {
			const completions = provider.getCompletions('', undefined, { maxResults: 5 });

			expect(completions.length).toBeLessThanOrEqual(5);
		});
	});

	// =========================================================================
	// Completion Properties
	// =========================================================================

	describe('completion properties', () => {
		it('should have all required fields', () => {
			const completions = provider.getCompletions('sin');
			const completion = completions[0];

			expect(completion.label).toBeDefined();
			expect(completion.kind).toBeDefined();
			expect(completion.insertText).toBeDefined();
		});

		it('should have description for functions', () => {
			const completions = provider.getCompletions('sin');
			const sinCompletion = completions.find((c) => c.label === 'sin');

			expect(sinCompletion?.description).toBeDefined();
		});
	});
});
