/**
 * Unit tests for MathAST prettyPrint function
 */

import { describe, it, expect } from 'vitest';
import { prettyPrint } from '../pretty-print';
import {
	number,
	variable,
	greek,
	symbol,
	add,
	subtract,
	multiply,
	implicitMultiply,
	divide,
	fraction,
	opposite,
	positive,
	func,
	sin,
	cos,
	parentheses,
	delimiter,
	subscript,
	superscript,
	power,
	equals,
	lessThan,
	quantity
} from '../factory';

describe('prettyPrint', () => {
	// =============================================================================
	// Literal Nodes
	// =============================================================================

	describe('literals', () => {
		it('prints number node', () => {
			const result = prettyPrint(number('42'), { colors: false });
			expect(result).toBe('Number: 42');
		});

		it('prints variable node', () => {
			const result = prettyPrint(variable('x'), { colors: false });
			expect(result).toBe('Variable: x');
		});

		it('prints greek letter node', () => {
			const result = prettyPrint(greek('alpha'), { colors: false });
			expect(result).toBe('Greek: alpha');
		});

		it('prints symbol node', () => {
			const result = prettyPrint(symbol('infinity'), { colors: false });
			expect(result).toBe('Symbol: infinity');
		});

		it('prints number with metadata suffix', () => {
			const result = prettyPrint(number('42', { color: 'red' }), { colors: false });
			expect(result).toBe('Number: 42 [red]');
		});

		it('prints number with multiple metadata', () => {
			const result = prettyPrint(
				number('42', { color: 'blue', style: 'bold', annotation: 'constant' }),
				{ colors: false }
			);
			expect(result).toBe('Number: 42 [blue, bold, "constant"]');
		});
	});

	// =============================================================================
	// Binary Operations
	// =============================================================================

	describe('binary operations', () => {
		it('prints addition', () => {
			const result = prettyPrint(add(number('3'), number('4')), { colors: false });
			const lines = result.split('\n');
			expect(lines[0]).toBe('Addition');
			expect(lines).toContain('├─ left:');
			expect(lines).toContain('└─ right:');
		});

		it('prints subtraction', () => {
			const result = prettyPrint(subtract(number('5'), number('2')), { colors: false });
			expect(result).toContain('Subtraction');
		});

		it('prints multiplication with display style', () => {
			const result = prettyPrint(multiply(number('2'), variable('x'), 'dot'), {
				colors: false
			});
			expect(result).toContain('Multiplication [dot]');
		});

		it('prints implicit multiplication', () => {
			const result = prettyPrint(implicitMultiply(number('2'), variable('x')), {
				colors: false
			});
			expect(result).toContain('Multiplication [implicit]');
		});

		it('prints division with display style', () => {
			const result = prettyPrint(divide(variable('a'), variable('b'), 'inline'), {
				colors: false
			});
			expect(result).toContain('Division [inline]');
		});

		it('prints fraction', () => {
			const result = prettyPrint(fraction(variable('x'), number('2')), {
				colors: false
			});
			expect(result).toContain('Division [fraction]');
			expect(result).toContain('numerator:');
			expect(result).toContain('denominator:');
		});

		it('prints addition with operator metadata', () => {
			const result = prettyPrint(
				add(number('3'), number('4'), { operatorMetadata: { color: 'red' } }),
				{ colors: false }
			);
			expect(result).toContain('Addition op:[red]');
		});
	});

	// =============================================================================
	// Unary Operations
	// =============================================================================

	describe('unary operations', () => {
		it('prints opposite', () => {
			const result = prettyPrint(opposite(variable('x')), { colors: false });
			expect(result).toContain('Opposite');
		});

		it('prints positive', () => {
			const result = prettyPrint(positive(number('5')), { colors: false });
			expect(result).toContain('Positive');
		});

		it('prints opposite with operator metadata', () => {
			const result = prettyPrint(opposite(variable('x'), { operatorMetadata: { color: 'blue' } }), {
				colors: false
			});
			expect(result).toContain('Opposite op:[blue]');
		});
	});

	// =============================================================================
	// Functions
	// =============================================================================

	describe('functions', () => {
		it('prints function with name', () => {
			const result = prettyPrint(sin(variable('x')), { colors: false });
			expect(result).toContain('Function: sin');
			expect(result).toContain('arg[0]:');
		});

		it('prints function with multiple args', () => {
			const result = prettyPrint(func('f', [variable('x'), variable('y')]), {
				colors: false
			});
			expect(result).toContain('Function: f');
			expect(result).toContain('arg[0]:');
			expect(result).toContain('arg[1]:');
		});

		it('prints function with power', () => {
			const result = prettyPrint(func('sin', [variable('x')], { power: number('2') }), {
				colors: false
			});
			expect(result).toContain('power:');
		});

		it('prints function with base', () => {
			const result = prettyPrint(func('log', [number('8')], { base: number('2') }), {
				colors: false
			});
			expect(result).toContain('base:');
		});

		it('prints function with name metadata', () => {
			const result = prettyPrint(sin(variable('x'), { nameMetadata: { color: 'green' } }), {
				colors: false
			});
			expect(result).toContain('name:[green]');
		});

		it('prints function with delimiter metadata', () => {
			const result = prettyPrint(cos(variable('x'), { delimiterMetadata: { color: 'purple' } }), {
				colors: false
			});
			expect(result).toContain('delim:[purple]');
		});
	});

	// =============================================================================
	// Structural Nodes
	// =============================================================================

	describe('structural nodes', () => {
		it('prints parentheses', () => {
			const result = prettyPrint(parentheses(variable('x')), { colors: false });
			expect(result).toContain('Delimiter [parentheses]');
		});

		it('prints delimiter with semantic', () => {
			const result = prettyPrint(delimiter('parentheses', variable('x'), 'set'), {
				colors: false
			});
			expect(result).toContain('Delimiter [parentheses] (set)');
		});

		it('prints subscript', () => {
			const result = prettyPrint(subscript(variable('x'), number('1')), {
				colors: false
			});
			expect(result).toContain('Subscript');
			expect(result).toContain('base:');
			expect(result).toContain('subscript:');
		});

		it('prints superscript', () => {
			const result = prettyPrint(superscript(variable('x'), number('2')), {
				colors: false
			});
			expect(result).toContain('Superscript');
			expect(result).toContain('base:');
			expect(result).toContain('exponent:');
		});

		it('prints power (alias for superscript)', () => {
			const result = prettyPrint(power(variable('x'), number('3')), {
				colors: false
			});
			expect(result).toContain('Superscript');
		});

		it('prints delimiter with left/right metadata', () => {
			const result = prettyPrint(
				parentheses(variable('x'), {
					leftDelimiterMetadata: { color: 'red' },
					rightDelimiterMetadata: { color: 'blue' }
				}),
				{ colors: false }
			);
			expect(result).toContain('leftDelim:[red]');
			expect(result).toContain('rightDelim:[blue]');
		});
	});

	// =============================================================================
	// Relations
	// =============================================================================

	describe('relations', () => {
		it('prints equals', () => {
			const result = prettyPrint(equals(variable('x'), number('5')), {
				colors: false
			});
			expect(result).toContain('Relation: =');
			expect(result).toContain('left:');
			expect(result).toContain('right:');
		});

		it('prints less than', () => {
			const result = prettyPrint(lessThan(variable('a'), variable('b')), {
				colors: false
			});
			expect(result).toContain('Relation: <');
		});

		it('prints relation with relation metadata', () => {
			const result = prettyPrint(
				equals(variable('x'), number('5'), { relationMetadata: { color: 'green' } }),
				{ colors: false }
			);
			expect(result).toContain('rel:[green]');
		});
	});

	// =============================================================================
	// Units
	// =============================================================================

	describe('units', () => {
		it('prints unit node', () => {
			const result = prettyPrint(quantity('5', 'm'), { colors: false });
			expect(result).toContain('Unit: m');
		});

		it('prints unit with unit metadata', () => {
			const result = prettyPrint(quantity('5', 'm', { unitMetadata: { color: 'red' } }), {
				colors: false
			});
			expect(result).toContain('unit:[red]');
		});
	});

	// =============================================================================
	// Complex Trees
	// =============================================================================

	describe('complex trees', () => {
		it('prints nested expression: x^2 + 2x', () => {
			const expr = add(
				power(variable('x'), number('2')),
				implicitMultiply(number('2'), variable('x'))
			);
			const result = prettyPrint(expr, { colors: false });

			expect(result).toContain('Addition');
			expect(result).toContain('Superscript');
			expect(result).toContain('Multiplication [implicit]');
		});

		it('prints equation: x^2 = 4', () => {
			const expr = equals(power(variable('x'), number('2')), number('4'));
			const result = prettyPrint(expr, { colors: false });

			expect(result).toContain('Relation: =');
			expect(result).toContain('Superscript');
		});

		it('preserves tree structure', () => {
			const expr = add(number('1'), add(number('2'), number('3')));
			const result = prettyPrint(expr, { colors: false });
			const lines = result.split('\n');

			// Should have proper nesting
			expect(lines.length).toBeGreaterThan(5);
		});
	});

	// =============================================================================
	// Color Output
	// =============================================================================

	describe('color output', () => {
		it('includes ANSI codes when colors enabled', () => {
			const result = prettyPrint(number('42', { color: 'red' }), { colors: true });
			// Should contain ANSI escape sequences
			expect(result).toContain('\x1b[');
		});

		it('excludes ANSI codes when colors disabled', () => {
			const result = prettyPrint(number('42', { color: 'red' }), { colors: false });
			// Should NOT contain ANSI escape sequences
			expect(result).not.toContain('\x1b[');
		});

		it('handles hex colors', () => {
			const result = prettyPrint(number('42', { color: '#FF0000' }), {
				colors: true
			});
			// Should contain 24-bit color escape sequence
			expect(result).toContain('\x1b[38;2;');
		});

		it('handles unknown colors gracefully', () => {
			const result = prettyPrint(number('42', { color: 'notacolor' }), {
				colors: true
			});
			// Should still output, just without color
			expect(result).toContain('Number: 42');
		});
	});

	// =============================================================================
	// Options
	// =============================================================================

	describe('options', () => {
		it('defaults to colors enabled', () => {
			const result = prettyPrint(number('42', { color: 'red' }));
			expect(result).toContain('\x1b[');
		});

		it('respects colors: false option', () => {
			const result = prettyPrint(number('42', { color: 'red' }), { colors: false });
			expect(result).not.toContain('\x1b[');
		});
	});
});
