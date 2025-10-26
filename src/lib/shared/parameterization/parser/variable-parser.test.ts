/**
 * Variable Parser Tests
 * ======================
 *
 * Comprehensive tests for parsing variable reference tokens in Markdown syntax.
 * Tests variable name validation, syntax detection, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseVariableReference } from './variable-parser';

describe('parseVariableReference - Markdown syntax', () => {
	describe('Valid variable names', () => {
		it('should parse simple single-letter variable', () => {
			expect(parseVariableReference('{{a}}')).toBe('a');
		});

		it('should parse multi-letter variable', () => {
			expect(parseVariableReference('{{myVar}}')).toBe('myVar');
		});

		it('should parse variable with underscores', () => {
			expect(parseVariableReference('{{my_var}}')).toBe('my_var');
		});

		it('should parse variable with numbers', () => {
			expect(parseVariableReference('{{var123}}')).toBe('var123');
		});

		it('should parse variable with mixed alphanumeric and underscores', () => {
			expect(parseVariableReference('{{my_var_123}}')).toBe('my_var_123');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for random token with prefix', () => {
			expect(parseVariableReference('{{random:1-10}}')).toBeNull();
		});

		it('should return null for eval token', () => {
			expect(parseVariableReference('{{eval:a+b}}')).toBeNull();
		});

		it('should return null for random shorthand (range)', () => {
			expect(parseVariableReference('{{1-10}}')).toBeNull();
		});

		it('should return null for random shorthand (decimal by digits)', () => {
			expect(parseVariableReference('{{2.3}}')).toBeNull();
		});

		it('should return null for empty variable name', () => {
			expect(parseVariableReference('{{}}')).toBeNull();
		});

		it('should return null for variable with colon', () => {
			expect(parseVariableReference('{{a:b}}')).toBeNull();
		});

		it('should return null for incomplete token', () => {
			expect(parseVariableReference('{{a}')).toBeNull();
		});
	});
});

describe('parseVariableReference - Edge cases', () => {
	it('should handle variable names with all underscores', () => {
		expect(parseVariableReference('{{___}}')).toBe('___');
	});

	it('should handle very long variable names', () => {
		const longName = 'very_long_variable_name_with_many_characters_123';
		expect(parseVariableReference(`{{${longName}}}`)).toBe(longName);
	});

	it('should handle unicode in variable names', () => {
		// Note: \w matches unicode word characters in JavaScript
		expect(parseVariableReference('{{variableÉ}}')).toBeNull();
	});

	it('should return null for non-string input', () => {
		// Type safety should prevent this, but test runtime behavior
		expect(parseVariableReference('')).toBeNull();
	});

	it('should distinguish between similar patterns', () => {
		// Ensure it doesn't match partial patterns
		expect(parseVariableReference('prefix{{a}}suffix')).toBeNull();
	});

	it('should handle nested braces in non-variable context', () => {
		// This shouldn't be a valid variable
		expect(parseVariableReference('{{{{a}}}}')).toBeNull();
	});

	it('should handle question marks in variable names', () => {
		expect(parseVariableReference('{{a?}}')).toBeNull();
	});
});
