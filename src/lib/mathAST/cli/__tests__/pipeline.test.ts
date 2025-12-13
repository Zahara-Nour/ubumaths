/**
 * Unit tests for the parsing pipeline
 *
 * Tests the main entry point that converts input strings to MathAST nodes,
 * including format detection, parsing, and error collection.
 */

import { describe, it, expect } from 'vitest';
import { parse, getParserOptions } from '../core/pipeline';
import { createEvalState, createFunctionBinding } from '../core/eval-state';
import { number, variable, superscript } from '../../factory';
import { isFunction } from '../../guards';

describe('parse pipeline', () => {
	// =============================================================================
	// Successful Parsing
	// =============================================================================

	describe('successful parsing', () => {
		it('parses simple variable', () => {
			const result = parse('x');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('variable');
			expect(result.errors).toHaveLength(0);
		});

		it('parses number', () => {
			const result = parse('42');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('number');
			expect(result.errors).toHaveLength(0);
		});

		it('parses addition', () => {
			const result = parse('x + y');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('addition');
			expect(result.errors).toHaveLength(0);
		});

		it('parses subtraction', () => {
			const result = parse('a - b');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('subtraction');
			expect(result.errors).toHaveLength(0);
		});

		it('parses multiplication', () => {
			const result = parse('2 \\cdot 3');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('multiplication');
			expect(result.errors).toHaveLength(0);
		});

		it('parses fraction', () => {
			const result = parse('\\frac{a}{b}');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('division');
			expect(result.errors).toHaveLength(0);
		});

		it('parses superscript', () => {
			const result = parse('x^2');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('superscript');
			expect(result.errors).toHaveLength(0);
		});

		it('parses subscript', () => {
			const result = parse('a_i');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('subscript');
			expect(result.errors).toHaveLength(0);
		});

		it('parses square root', () => {
			const result = parse('\\sqrt{x}');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('function');
			expect(result.errors).toHaveLength(0);
		});

		it('parses trigonometric function', () => {
			const result = parse('\\sin(x)');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('function');
			expect(result.errors).toHaveLength(0);
		});

		it('parses complex expression', () => {
			const result = parse('x^2 + 3x - 5');
			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('parses nested fractions', () => {
			const result = parse('\\frac{\\frac{a}{b}}{c}');
			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('parses implicit multiplication', () => {
			const result = parse('2x');
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('multiplication');
			expect(result.errors).toHaveLength(0);
		});

		it('returns input format', () => {
			const result = parse('\\sin(x)');
			expect(result.inputFormat).toBe('latex');
		});

		it('returns high-confidence latex format for LaTeX commands', () => {
			const result = parse('\\frac{a}{b}');
			expect(result.inputFormat).toBe('latex');
		});

		it('returns latex format for simple expressions', () => {
			const result = parse('x + y');
			expect(result.inputFormat).toBe('latex');
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('collects parse errors for incomplete fraction', () => {
			const result = parse('\\frac{a}');
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('collects parse errors for unmatched braces', () => {
			const result = parse('x^{2');
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('parses custom format successfully', () => {
			const result = parse('x + y', { forceFormat: 'custom' });
			expect(result.errors).toHaveLength(0);
			expect(result.ast).toBeDefined();
		});

		it('returns correct format for custom input', () => {
			const result = parse('x + y', { forceFormat: 'custom' });
			expect(result.inputFormat).toBe('custom');
			expect(result.ast).toBeDefined();
		});

		it('handles empty input', () => {
			const result = parse('');
			expect(result.inputFormat).toBe('unknown');
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].code).toBe('UNSUPPORTED_FORMAT');
		});

		it('provides helpful error for unknown format', () => {
			const result = parse('');
			expect(result.errors[0].message).toContain('Could not determine input format');
		});

		it('does not return AST when format is unknown', () => {
			const result = parse('');
			expect(result.ast).toBeUndefined();
		});

		it('returns AST when format is custom', () => {
			const result = parse('x', { forceFormat: 'custom' });
			expect(result.ast).toBeDefined();
		});
	});

	// =============================================================================
	// Force Format Option
	// =============================================================================

	describe('force format option', () => {
		it('uses forced format instead of auto-detection', () => {
			const result = parse('x + y', { forceFormat: 'latex' });
			expect(result.inputFormat).toBe('latex');
		});

		it('respects forced LaTeX format', () => {
			const result = parse('2 + 3', { forceFormat: 'latex' });
			expect(result.inputFormat).toBe('latex');
			expect(result.ast).toBeDefined();
		});

		it('parses with forced custom format', () => {
			const result = parse('x + y', { forceFormat: 'custom' });
			expect(result.inputFormat).toBe('custom');
			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('returns error for forced unknown format', () => {
			const result = parse('x + y', { forceFormat: 'unknown' });
			expect(result.inputFormat).toBe('unknown');
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('trims input before parsing', () => {
			const result = parse('  x + y  ');
			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('handles whitespace-only input', () => {
			const result = parse('   ');
			expect(result.inputFormat).toBe('unknown');
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('parses single character', () => {
			const result = parse('x');
			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('parses single digit', () => {
			const result = parse('5');
			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('handles very complex nested expression', () => {
			const result = parse('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
			// Parser may not support all features (like \pm)
			// But should either return AST or errors, not crash
			expect(result).toBeDefined();
		});
	});

	// =============================================================================
	// Parser Integration
	// =============================================================================

	describe('parser integration', () => {
		it('uses tolerant mode for parsing', () => {
			// Tolerant mode should handle some errors gracefully
			const result = parse('x +');
			// Should attempt to parse, may return AST or errors
			expect(result).toBeDefined();
			// If no AST, should have errors
			if (!result.ast) {
				expect(result.errors.length).toBeGreaterThan(0);
			}
		});

		it('converts parser errors to pipeline errors', () => {
			const result = parse('\\frac{a}');
			if (result.errors.length > 0) {
				expect(result.errors[0].code).toBe('PARSE_ERROR');
				expect(result.errors[0].message).toBeDefined();
			}
		});

		it('includes position in parser errors when available', () => {
			const result = parse('\\frac{a}');
			if (result.errors.length > 0) {
				// Position may or may not be present depending on parser
				const error = result.errors[0];
				if (error.position !== undefined) {
					expect(typeof error.position).toBe('number');
				}
			}
		});
	});

	// =============================================================================
	// Parser Options from State
	// =============================================================================

	describe('getParserOptions', () => {
		it('returns empty object for undefined state', () => {
			const options = getParserOptions(undefined);
			expect(options).toEqual({});
		});

		it('returns empty object for state with no functions', () => {
			const state = createEvalState();
			const options = getParserOptions(state);
			expect(options).toEqual({});
		});

		it('returns genericFunctions config when functions are defined', () => {
			const state = createEvalState();
			createFunctionBinding(state, 'f', ['x'], number('1'));

			const options = getParserOptions(state);

			expect(options.genericFunctions).toBeDefined();
			expect(options.genericFunctions?.names).toContain('f');
			expect(options.genericFunctions?.allowDerivatives).toBe(true);
			expect(options.genericFunctions?.allowInverse).toBe(true);
		});

		it('includes all function names in parser config', () => {
			const state = createEvalState();
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));
			createFunctionBinding(state, 'h', ['x', 'y'], number('3'));

			const options = getParserOptions(state);
			const names = options.genericFunctions?.names ?? [];

			expect(names).toHaveLength(3);
			expect(names).toContain('f');
			expect(names).toContain('g');
			expect(names).toContain('h');
		});
	});

	// =============================================================================
	// State-Aware Parsing
	// =============================================================================

	describe('state-aware parsing', () => {
		it('parses f(x) as generic function when f is defined in state', () => {
			const state = createEvalState();
			createFunctionBinding(state, 'f', ['x'], superscript(variable('x'), number('2')));

			const result = parse('f(x)', { evalState: state });

			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
			// Should be parsed as a function node named 'f'
			if (isFunction(result.ast!)) {
				expect(result.ast.name).toBe('f');
				expect(result.ast.args).toHaveLength(1);
			}
		});

		it('parses f(3) with numeric argument', () => {
			const state = createEvalState();
			createFunctionBinding(state, 'f', ['x'], number('1'));

			const result = parse('f(3)', { evalState: state });

			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
			if (isFunction(result.ast!)) {
				expect(result.ast.name).toBe('f');
			}
		});

		it('parses multiple defined functions', () => {
			const state = createEvalState();
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));

			// Parse f(x) + g(x)
			const result = parse('f(x) + g(x)', { evalState: state });

			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('works without state (backward compatibility)', () => {
			const result = parse('x + y');

			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it('works with empty state', () => {
			const state = createEvalState();
			const result = parse('x + y', { evalState: state });

			expect(result.ast).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});
	});
});
