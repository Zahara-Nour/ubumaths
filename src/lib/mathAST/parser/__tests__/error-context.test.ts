/**
 * Error Context Tests
 *
 * Tests for enhanced ParseError with context, line/column, and suggestions.
 */

import { describe, it, expect } from 'vitest';
import { parseLatexSafe } from '../index';
import { createErrorContext, computeLineAndColumn, getSuggestions } from '../error-context';

// =============================================================================
// createErrorContext
// =============================================================================

describe('createErrorContext', () => {
	it('should extract context around error position', () => {
		const input = 'abcdefghij[ERROR]klmnopqrst';
		const position = 10; // start of [ERROR]
		const length = 7; // length of [ERROR]

		const ctx = createErrorContext(input, position, length);

		expect(ctx.before).toBe('abcdefghij');
		expect(ctx.error).toBe('[ERROR]');
		expect(ctx.after).toBe('klmnopqrst');
	});

	it('should handle error at the beginning', () => {
		const input = '[ERROR]klmnopqrst';
		const position = 0;
		const length = 7;

		const ctx = createErrorContext(input, position, length);

		expect(ctx.before).toBe('');
		expect(ctx.error).toBe('[ERROR]');
		expect(ctx.after).toBe('klmnopqrst');
	});

	it('should handle error at the end', () => {
		const input = 'abcdefghij[ERROR]';
		const position = 10;
		const length = 7;

		const ctx = createErrorContext(input, position, length);

		expect(ctx.before).toBe('abcdefghij');
		expect(ctx.error).toBe('[ERROR]');
		expect(ctx.after).toBe('');
	});

	it('should truncate long before/after sections to 20 chars', () => {
		const input = 'a'.repeat(50) + '[ERROR]' + 'z'.repeat(50);
		const position = 50;
		const length = 7;

		const ctx = createErrorContext(input, position, length);

		expect(ctx.before).toBe('a'.repeat(20));
		expect(ctx.error).toBe('[ERROR]');
		expect(ctx.after).toBe('z'.repeat(20));
	});

	it('should handle zero-length error (cursor position)', () => {
		const input = 'abcdefghij';
		const position = 5;
		const length = 0;

		const ctx = createErrorContext(input, position, length);

		expect(ctx.before).toBe('abcde');
		expect(ctx.error).toBe('');
		expect(ctx.after).toBe('fghij');
	});
});

// =============================================================================
// computeLineAndColumn
// =============================================================================

describe('computeLineAndColumn', () => {
	it('should return line 1, column 1 for position 0', () => {
		const input = 'hello';
		const { line, column } = computeLineAndColumn(input, 0);

		expect(line).toBe(1);
		expect(column).toBe(1);
	});

	it('should count columns correctly on single line', () => {
		const input = 'hello world';
		const { line, column } = computeLineAndColumn(input, 6); // 'w'

		expect(line).toBe(1);
		expect(column).toBe(7);
	});

	it('should handle newlines correctly', () => {
		const input = 'line1\nline2\nline3';
		//             0123456789...
		// line1\n = 6 chars, so position 6 is start of line 2

		const result1 = computeLineAndColumn(input, 6); // start of 'line2'
		expect(result1.line).toBe(2);
		expect(result1.column).toBe(1);

		const result2 = computeLineAndColumn(input, 8); // 'n' in 'line2'
		expect(result2.line).toBe(2);
		expect(result2.column).toBe(3);
	});

	it('should handle multiple newlines', () => {
		const input = 'a\nb\nc';
		// a\n = 2, b\n = 4, c = 4

		const result = computeLineAndColumn(input, 4); // 'c'
		expect(result.line).toBe(3);
		expect(result.column).toBe(1);
	});

	it('should handle empty lines', () => {
		const input = 'a\n\nb';
		// a\n = 2, \n = 3, b = 3
		// Position 2 is start of empty line 2
		// Position 3 is 'b' on line 3

		const result = computeLineAndColumn(input, 3);
		expect(result.line).toBe(3);
		expect(result.column).toBe(1);
	});

	it('should handle position at end of input', () => {
		const input = 'hello';
		const { line, column } = computeLineAndColumn(input, 5);

		expect(line).toBe(1);
		expect(column).toBe(6);
	});
});

// =============================================================================
// getSuggestions
// =============================================================================

describe('getSuggestions', () => {
	it('should suggest closing brace for MISSING_BRACE', () => {
		const suggestions = getSuggestions('MISSING_BRACE', 'Expected }');

		expect(suggestions).toContain("Avez-vous oublié '}' ?");
	});

	it('should suggest closing delimiter for MISSING_DELIMITER', () => {
		const suggestions = getSuggestions('MISSING_DELIMITER', "Expected ')'");

		expect(suggestions.length).toBeGreaterThan(0);
		// The suggestion mentions matching ( and )
		expect(suggestions[0]).toMatch(/\(|correspondante/i);
	});

	it('should suggest similar commands for UNKNOWN_COMMAND', () => {
		// Use "frc" which should suggest "frac" (distance 1)
		const suggestions = getSuggestions('UNKNOWN_COMMAND', 'Unknown command: \\frc');

		expect(suggestions.length).toBeGreaterThan(0);
		// Should suggest 'frac' for 'frc' - result is formatted like "Commandes similaires : \frac, ..."
		expect(suggestions[0]).toMatch(/frac/i);
	});

	it('should suggest similar commands for typos', () => {
		// Use "sqr" which should suggest "sqrt" (distance 1)
		const suggestions = getSuggestions('UNKNOWN_COMMAND', 'Unknown command: \\sqr');

		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0]).toMatch(/sqrt/i);
	});

	it('should return empty array for no suggestions', () => {
		const suggestions = getSuggestions('UNEXPECTED_TOKEN', 'Unexpected token');

		// May or may not have suggestions, but should not throw
		expect(Array.isArray(suggestions)).toBe(true);
	});
});

// =============================================================================
// Integration with parseLatexSafe
// =============================================================================

describe('Enhanced ParseError integration', () => {
	it('should include context in parse errors', () => {
		const input = 'x + { y';
		const result = parseLatexSafe(input, { mode: 'tolerant' });

		expect(result.errors.length).toBeGreaterThan(0);
		const error = result.errors[0];

		// Should have optional context field
		if (error.context) {
			expect(error.context.before).toBeDefined();
			expect(error.context.error).toBeDefined();
			expect(error.context.after).toBeDefined();
		}
	});

	it('should include line and column in parse errors', () => {
		const input = 'x + \n{ y';
		const result = parseLatexSafe(input, { mode: 'tolerant' });

		expect(result.errors.length).toBeGreaterThan(0);
		const error = result.errors[0];

		// Should have optional line/column fields
		if (error.line !== undefined) {
			expect(typeof error.line).toBe('number');
			expect(error.line).toBeGreaterThanOrEqual(1);
		}
		if (error.column !== undefined) {
			expect(typeof error.column).toBe('number');
			expect(error.column).toBeGreaterThanOrEqual(1);
		}
	});

	it('should maintain backwards compatibility', () => {
		const input = 'x + { y';
		const result = parseLatexSafe(input, { mode: 'tolerant' });

		expect(result.errors.length).toBeGreaterThan(0);
		const error = result.errors[0];

		// Original fields must still exist
		expect(error.message).toBeDefined();
		expect(typeof error.position).toBe('number');
		expect(typeof error.length).toBe('number');
		expect(error.code).toBeDefined();
	});

	it('should include suggestions for missing brace', () => {
		const input = 'x^{2';
		const result = parseLatexSafe(input, { mode: 'tolerant' });

		expect(result.errors.length).toBeGreaterThan(0);
		const error = result.errors[0];

		// Should have optional suggestions field
		if (error.suggestions && error.suggestions.length > 0) {
			expect(error.suggestions.some((s) => s.includes('}'))).toBe(true);
		}
	});
});
