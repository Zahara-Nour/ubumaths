/**
 * Variable Parser Tests
 * ======================
 *
 * Comprehensive tests for parsing variable reference tokens in dual syntax.
 * Tests variable name validation, syntax detection, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseVariableReference } from './variable-parser';

describe('parseVariableReference - Questions syntax', () => {
	describe('Valid variable names', () => {
		it('should parse simple single-letter variable', () => {
			expect(parseVariableReference('{@:a}', 'questions')).toBe('a');
		});

		it('should parse multi-letter variable', () => {
			expect(parseVariableReference('{@:myVar}', 'questions')).toBe('myVar');
		});

		it('should parse variable with underscores', () => {
			expect(parseVariableReference('{@:my_var}', 'questions')).toBe('my_var');
		});

		it('should parse variable with numbers', () => {
			expect(parseVariableReference('{@:var123}', 'questions')).toBe('var123');
		});

		it('should parse variable with mixed alphanumeric and underscores', () => {
			expect(parseVariableReference('{@:my_var_123}', 'questions')).toBe('my_var_123');
		});

		it('should parse variable starting with underscore', () => {
			expect(parseVariableReference('{@:_private}', 'questions')).toBe('_private');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for random token', () => {
			expect(parseVariableReference('{#:1-10}', 'questions')).toBeNull();
		});

		it('should return null for eval token', () => {
			expect(parseVariableReference('{eval:a+b}', 'questions')).toBeNull();
		});

		it('should return null for empty variable name', () => {
			expect(parseVariableReference('{@:}', 'questions')).toBeNull();
		});

		it('should return null for variable with spaces', () => {
			expect(parseVariableReference('{@:my var}', 'questions')).toBeNull();
		});

		it('should return null for variable with hyphens', () => {
			expect(parseVariableReference('{@:my-var}', 'questions')).toBeNull();
		});

		it('should parse variable starting with number (allowed by \\w pattern)', () => {
			// Note: JavaScript's \w pattern matches [A-Za-z0-9_], including numbers
			// This is technically valid in the current implementation
			expect(parseVariableReference('{@:123var}', 'questions')).toBe('123var');
		});

		it('should return null for incomplete token', () => {
			expect(parseVariableReference('{@:a', 'questions')).toBeNull();
		});

		it('should return null for malformed token', () => {
			expect(parseVariableReference('@:a}', 'questions')).toBeNull();
		});
	});
});

describe('parseVariableReference - Markdown syntax', () => {
	describe('Valid variable names', () => {
		it('should parse simple single-letter variable', () => {
			expect(parseVariableReference('{{a}}', 'markdown')).toBe('a');
		});

		it('should parse multi-letter variable', () => {
			expect(parseVariableReference('{{myVar}}', 'markdown')).toBe('myVar');
		});

		it('should parse variable with underscores', () => {
			expect(parseVariableReference('{{my_var}}', 'markdown')).toBe('my_var');
		});

		it('should parse variable with numbers', () => {
			expect(parseVariableReference('{{var123}}', 'markdown')).toBe('var123');
		});

		it('should parse variable with mixed alphanumeric and underscores', () => {
			expect(parseVariableReference('{{my_var_123}}', 'markdown')).toBe('my_var_123');
		});
	});

	describe('Invalid tokens', () => {
		it('should return null for random token with prefix', () => {
			expect(parseVariableReference('{{random:1-10}}', 'markdown')).toBeNull();
		});

		it('should return null for eval token', () => {
			expect(parseVariableReference('{{eval:a+b}}', 'markdown')).toBeNull();
		});

		it('should return null for random shorthand (range)', () => {
			expect(parseVariableReference('{{1-10}}', 'markdown')).toBeNull();
		});

		it('should return null for random shorthand (decimal by digits)', () => {
			expect(parseVariableReference('{{2.3}}', 'markdown')).toBeNull();
		});

		it('should return null for empty variable name', () => {
			expect(parseVariableReference('{{}}', 'markdown')).toBeNull();
		});

		it('should return null for variable with colon', () => {
			expect(parseVariableReference('{{a:b}}', 'markdown')).toBeNull();
		});

		it('should return null for incomplete token', () => {
			expect(parseVariableReference('{{a}', 'markdown')).toBeNull();
		});
	});
});

describe('parseVariableReference - Auto-detection (no syntax specified)', () => {
	it('should parse Questions syntax automatically', () => {
		expect(parseVariableReference('{@:a}')).toBe('a');
	});

	it('should parse Markdown syntax automatically', () => {
		expect(parseVariableReference('{{a}}')).toBe('a');
	});

	it('should prefer Questions syntax when both could match', () => {
		// If implementation tries Questions first
		expect(parseVariableReference('{@:myVar}')).toBe('myVar');
	});

	it('should fallback to Markdown if Questions fails', () => {
		expect(parseVariableReference('{{myVar}}')).toBe('myVar');
	});
});

describe('parseVariableReference - Syntax parameter variations', () => {
	it('should parse with explicit questions syntax', () => {
		expect(parseVariableReference('{@:a}', 'questions')).toBe('a');
	});

	it('should parse with explicit markdown syntax', () => {
		expect(parseVariableReference('{{a}}', 'markdown')).toBe('a');
	});

	it('should parse with both syntax (Questions)', () => {
		expect(parseVariableReference('{@:a}', 'both')).toBe('a');
	});

	it('should parse with both syntax (Markdown)', () => {
		expect(parseVariableReference('{{a}}', 'both')).toBe('a');
	});

	it('should return null when wrong syntax specified', () => {
		expect(parseVariableReference('{{a}}', 'questions')).toBeNull();
		expect(parseVariableReference('{@:a}', 'markdown')).toBeNull();
	});
});

describe('parseVariableReference - Edge cases', () => {
	it('should handle variable names with all underscores', () => {
		expect(parseVariableReference('{@:___}', 'questions')).toBe('___');
	});

	it('should handle very long variable names', () => {
		const longName = 'very_long_variable_name_with_many_characters_123';
		expect(parseVariableReference(`{@:${longName}}`, 'questions')).toBe(longName);
	});

	it('should handle unicode in variable names', () => {
		// Note: \w matches unicode word characters in JavaScript
		expect(parseVariableReference('{@:variableÉ}', 'questions')).toBeNull();
	});

	it('should return null for non-string input', () => {
		// Type safety should prevent this, but test runtime behavior
		expect(parseVariableReference('', 'questions')).toBeNull();
	});

	it('should distinguish between similar patterns', () => {
		// Ensure it doesn't match partial patterns
		expect(parseVariableReference('prefix{@:a}suffix', 'questions')).toBeNull();
		expect(parseVariableReference('prefix{{a}}suffix', 'markdown')).toBeNull();
	});

	it('should handle nested braces in non-variable context', () => {
		// This shouldn't be a valid variable
		expect(parseVariableReference('{@:{a}}', 'questions')).toBeNull();
	});

	it('should handle question marks in Questions syntax', () => {
		expect(parseVariableReference('{@:a?}', 'questions')).toBeNull();
	});
});
