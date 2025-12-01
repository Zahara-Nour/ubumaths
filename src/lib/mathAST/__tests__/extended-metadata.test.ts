/**
 * Unit tests for MathAST extended metadata system
 *
 * Tests cover:
 * 1. Factory functions with extended metadata options (BinaryOpOptions, DelimiterOptions, etc.)
 * 2. Transform helpers (withOperatorMetadata, withDelimiterMetadata, etc.)
 * 3. Metadata guards (hasOperatorMetadata, hasDelimiterMetadata, etc.)
 * 4. LaTeX generator coalescence (merging adjacent same-color spans)
 */

import { describe, it, expect } from 'vitest';

// Factory functions
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	divide,
	fraction,
	opposite,
	positive,
	func,
	sin,
	cos,
	delimiter,
	parentheses,
	relation,
	equals,
	quantity,
	withUnit
} from '../factory';

// Transform helpers
import {
	withMetadata,
	withOperatorMetadata,
	withDelimiterMetadata,
	withRelationMetadata,
	withNameMetadata,
	withUnitMetadata
} from '../transforms';

// Guards
import {
	hasMetadata,
	hasOperatorMetadata,
	hasDelimiterMetadata,
	hasNameMetadata,
	hasRelationMetadata,
	hasUnitMetadata,
	hasAnyMetadata
} from '../guards';

// LaTeX generator
import { toLatex } from '../latex-generator';

// Unit parser for unit tests
import { parseOrThrow } from '../units/parser';

describe('Extended Metadata System', () => {
	// =============================================================================
	// 1. Factory Tests with Extended Metadata Options
	// =============================================================================

	describe('Factory Functions with Extended Metadata', () => {
		describe('BinaryOpOptions (add, subtract, multiply, divide)', () => {
			it('should create addition with operatorMetadata', () => {
				const node = add(number('3'), number('4'), {
					operatorMetadata: { color: 'red' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'red' });
				expect(node.metadata).toBeUndefined();
			});

			it('should create addition with both operatorMetadata and metadata', () => {
				const node = add(number('3'), number('4'), {
					operatorMetadata: { color: 'red' },
					metadata: { color: 'blue' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'red' });
				expect(node.metadata).toEqual({ color: 'blue' });
			});

			it('should maintain backward compatibility with plain NodeMetadata', () => {
				const node = add(number('3'), number('4'), { color: 'green' });
				expect(node.metadata).toEqual({ color: 'green' });
				expect(node.operatorMetadata).toBeUndefined();
			});

			it('should create subtraction with operatorMetadata', () => {
				const node = subtract(number('5'), number('2'), {
					operatorMetadata: { color: 'blue', style: 'bold' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'blue', style: 'bold' });
			});

			it('should create multiplication with operatorMetadata', () => {
				const node = multiply(number('2'), number('3'), 'dot', {
					operatorMetadata: { color: 'orange' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'orange' });
			});

			it('should create division with operatorMetadata', () => {
				const node = divide(number('6'), number('2'), 'fraction', {
					operatorMetadata: { color: 'purple' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'purple' });
			});

			it('should create fraction with operatorMetadata', () => {
				const node = fraction(number('1'), number('2'), {
					operatorMetadata: { style: 'italic' }
				});
				expect(node.operatorMetadata).toEqual({ style: 'italic' });
			});
		});

		describe('UnaryOpOptions (opposite, positive)', () => {
			it('should create opposite with operatorMetadata', () => {
				const node = opposite(number('5'), {
					operatorMetadata: { color: 'red' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'red' });
			});

			it('should create positive with operatorMetadata', () => {
				const node = positive(number('5'), {
					operatorMetadata: { color: 'green' }
				});
				expect(node.operatorMetadata).toEqual({ color: 'green' });
			});

			it('should maintain backward compatibility for unary ops', () => {
				const node = opposite(number('5'), { color: 'blue' });
				expect(node.metadata).toEqual({ color: 'blue' });
				expect(node.operatorMetadata).toBeUndefined();
			});
		});

		describe('DelimiterOptions (delimiter, parentheses)', () => {
			it('should create delimiter with delimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: { color: 'red' }
				});
				expect(node.delimiterMetadata).toEqual({ color: 'red' });
			});

			it('should create delimiter with leftDelimiterMetadata only', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					leftDelimiterMetadata: { color: 'red' }
				});
				expect(node.leftDelimiterMetadata).toEqual({ color: 'red' });
				expect(node.rightDelimiterMetadata).toBeUndefined();
			});

			it('should create delimiter with rightDelimiterMetadata only', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					rightDelimiterMetadata: { color: 'blue' }
				});
				expect(node.rightDelimiterMetadata).toEqual({ color: 'blue' });
				expect(node.leftDelimiterMetadata).toBeUndefined();
			});

			it('should create delimiter with different left and right metadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					leftDelimiterMetadata: { color: 'red' },
					rightDelimiterMetadata: { color: 'blue' }
				});
				expect(node.leftDelimiterMetadata).toEqual({ color: 'red' });
				expect(node.rightDelimiterMetadata).toEqual({ color: 'blue' });
			});

			it('should create parentheses with delimiterMetadata', () => {
				const node = parentheses(variable('x'), {
					delimiterMetadata: { color: 'green' }
				});
				expect(node.delimiterMetadata).toEqual({ color: 'green' });
			});

			it('should maintain backward compatibility for delimiter', () => {
				const node = delimiter('parentheses', variable('x'), undefined, { color: 'purple' });
				expect(node.metadata).toEqual({ color: 'purple' });
				expect(node.delimiterMetadata).toBeUndefined();
			});
		});

		describe('FunctionOptions (func, sin, cos, etc.)', () => {
			it('should create function with nameMetadata', () => {
				const node = func('f', [variable('x')], {
					nameMetadata: { color: 'red' }
				});
				expect(node.nameMetadata).toEqual({ color: 'red' });
			});

			it('should create function with delimiterMetadata', () => {
				const node = func('f', [variable('x')], {
					delimiterMetadata: { color: 'blue' }
				});
				expect(node.delimiterMetadata).toEqual({ color: 'blue' });
			});

			it('should create function with left and right delimiter metadata', () => {
				const node = func('f', [variable('x')], {
					leftDelimiterMetadata: { color: 'red' },
					rightDelimiterMetadata: { color: 'blue' }
				});
				expect(node.leftDelimiterMetadata).toEqual({ color: 'red' });
				expect(node.rightDelimiterMetadata).toEqual({ color: 'blue' });
			});

			it('should create sin with nameMetadata', () => {
				const node = sin(variable('x'), { nameMetadata: { color: 'orange' } });
				expect(node.nameMetadata).toEqual({ color: 'orange' });
			});

			it('should create cos with nameMetadata and power', () => {
				const node = cos(variable('x'), {
					power: number('2'),
					nameMetadata: { color: 'green' }
				});
				expect(node.nameMetadata).toEqual({ color: 'green' });
				expect(node.power).toEqual(number('2'));
			});

			it('should maintain backward compatibility for function', () => {
				const node = sin(variable('x'), { color: 'purple' });
				expect(node.metadata).toEqual({ color: 'purple' });
				expect(node.nameMetadata).toBeUndefined();
			});
		});

		describe('RelationOptions (relation, equals, etc.)', () => {
			it('should create relation with relationMetadata', () => {
				const node = relation('=', variable('x'), number('5'), {
					relationMetadata: { color: 'red' }
				});
				expect(node.relationMetadata).toEqual({ color: 'red' });
			});

			it('should create equals with relationMetadata', () => {
				const node = equals(variable('x'), number('5'), {
					relationMetadata: { color: 'blue', style: 'bold' }
				});
				expect(node.relationMetadata).toEqual({ color: 'blue', style: 'bold' });
			});

			it('should create relation with both relationMetadata and metadata', () => {
				const node = relation('<', variable('x'), number('10'), {
					relationMetadata: { color: 'red' },
					metadata: { color: 'green' }
				});
				expect(node.relationMetadata).toEqual({ color: 'red' });
				expect(node.metadata).toEqual({ color: 'green' });
			});

			it('should maintain backward compatibility for relation', () => {
				const node = equals(variable('x'), number('5'), { color: 'orange' });
				expect(node.metadata).toEqual({ color: 'orange' });
				expect(node.relationMetadata).toBeUndefined();
			});
		});

		describe('UnitOptions (withUnit, quantity)', () => {
			it('should create unit node with unitMetadata', () => {
				const unit = parseOrThrow('m');
				const node = withUnit(number('5'), unit, {
					unitMetadata: { color: 'red' }
				});
				expect(node.unitMetadata).toEqual({ color: 'red' });
			});

			it('should create quantity with unitMetadata', () => {
				const node = quantity('100', 'km/h', {
					unitMetadata: { color: 'blue' }
				});
				expect(node.unitMetadata).toEqual({ color: 'blue' });
			});

			it('should create unit node with both unitMetadata and metadata', () => {
				const unit = parseOrThrow('m');
				const node = withUnit(number('5'), unit, {
					unitMetadata: { color: 'red' },
					metadata: { color: 'green' }
				});
				expect(node.unitMetadata).toEqual({ color: 'red' });
				expect(node.metadata).toEqual({ color: 'green' });
			});

			it('should maintain backward compatibility for unit', () => {
				const unit = parseOrThrow('m');
				const node = withUnit(number('5'), unit, { color: 'purple' });
				expect(node.metadata).toEqual({ color: 'purple' });
				expect(node.unitMetadata).toBeUndefined();
			});
		});
	});

	// =============================================================================
	// 2. Transform Helper Tests
	// =============================================================================

	describe('Transform Helpers', () => {
		/**
		 * Note: Transform helpers check if the metadata property exists using 'in' operator.
		 * This means they only work on nodes that already have the property set.
		 * Nodes created without extended metadata options won't have these properties.
		 */
		describe('withOperatorMetadata', () => {
			it('should merge with existing operator metadata', () => {
				const node = add(number('1'), number('2'), { operatorMetadata: { color: 'red' } });
				const result = withOperatorMetadata(node, { style: 'bold' });
				expect(result.operatorMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should override existing operator metadata properties', () => {
				const node = add(number('1'), number('2'), { operatorMetadata: { color: 'red' } });
				const result = withOperatorMetadata(node, { color: 'blue' });
				expect(result.operatorMetadata).toEqual({ color: 'blue' });
			});

			it('should add new properties when operatorMetadata is empty', () => {
				// Node created with empty operatorMetadata - property exists
				const node = add(number('1'), number('2'), { operatorMetadata: {} });
				const result = withOperatorMetadata(node, { color: 'green' });
				expect(result.operatorMetadata).toEqual({ color: 'green' });
			});

			it('should work with subtraction that has operatorMetadata', () => {
				const node = subtract(number('5'), number('3'), { operatorMetadata: { color: 'red' } });
				const result = withOperatorMetadata(node, { style: 'bold' });
				expect(result.operatorMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should work with multiplication that has operatorMetadata', () => {
				const node = multiply(number('2'), number('3'), 'dot', {
					operatorMetadata: { color: 'red' }
				});
				const result = withOperatorMetadata(node, { style: 'bold' });
				expect(result.operatorMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should work with division that has operatorMetadata', () => {
				const node = divide(number('6'), number('2'), 'fraction', {
					operatorMetadata: { color: 'red' }
				});
				const result = withOperatorMetadata(node, { style: 'bold' });
				expect(result.operatorMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should work with opposite that has operatorMetadata', () => {
				const node = opposite(number('5'), { operatorMetadata: { color: 'red' } });
				const result = withOperatorMetadata(node, { style: 'bold' });
				expect(result.operatorMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should work with positive that has operatorMetadata', () => {
				const node = positive(number('5'), { operatorMetadata: { color: 'red' } });
				const result = withOperatorMetadata(node, { style: 'bold' });
				expect(result.operatorMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should return unchanged node for unsupported types', () => {
				const node = number('42');
				const result = withOperatorMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});

			it('should return unchanged node when operatorMetadata property does not exist', () => {
				// Node created without operatorMetadata - property doesn't exist
				const node = add(number('1'), number('2'));
				const result = withOperatorMetadata(node, { color: 'red' });
				// Returns original node unchanged since 'operatorMetadata' in node is false
				expect(result).toBe(node);
			});
		});

		describe('withDelimiterMetadata', () => {
			it('should add delimiter metadata to both sides when delimiterMetadata exists', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: {}
				});
				const result = withDelimiterMetadata(node, { color: 'red' });
				expect(result.leftDelimiterMetadata).toEqual({ color: 'red' });
				expect(result.rightDelimiterMetadata).toEqual({ color: 'red' });
			});

			it('should add delimiter metadata to left side only', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: {}
				});
				const result = withDelimiterMetadata(node, { color: 'red' }, 'left');
				expect(result.leftDelimiterMetadata).toEqual({ color: 'red' });
				expect(result.rightDelimiterMetadata).toBeUndefined();
			});

			it('should add delimiter metadata to right side only', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: {}
				});
				const result = withDelimiterMetadata(node, { color: 'blue' }, 'right');
				expect(result.leftDelimiterMetadata).toBeUndefined();
				expect(result.rightDelimiterMetadata).toEqual({ color: 'blue' });
			});

			it('should merge with existing left delimiter metadata when delimiterMetadata also exists', () => {
				// Note: withDelimiterMetadata only works when delimiterMetadata property exists
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: {}, // Required for the transform to work
					leftDelimiterMetadata: { color: 'red' }
				});
				const result = withDelimiterMetadata(node, { style: 'bold' }, 'left');
				expect(result.leftDelimiterMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should fall back to delimiterMetadata when merging', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: { color: 'red' }
				});
				const result = withDelimiterMetadata(node, { style: 'bold' }, 'left');
				expect(result.leftDelimiterMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should work with function nodes that have delimiterMetadata', () => {
				const node = func('f', [variable('x')], { delimiterMetadata: {} });
				const result = withDelimiterMetadata(node, { color: 'green' }, 'both');
				expect(result.leftDelimiterMetadata).toEqual({ color: 'green' });
				expect(result.rightDelimiterMetadata).toEqual({ color: 'green' });
			});

			it('should return unchanged node for unsupported types', () => {
				const node = number('42');
				const result = withDelimiterMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});

			it('should return unchanged node when delimiterMetadata property does not exist', () => {
				const node = delimiter('parentheses', variable('x'));
				const result = withDelimiterMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});
		});

		describe('withRelationMetadata', () => {
			it('should merge with existing relation metadata', () => {
				const node = equals(variable('x'), number('5'), { relationMetadata: { color: 'red' } });
				const result = withRelationMetadata(node, { style: 'bold' });
				expect(result.relationMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should add new properties when relationMetadata is empty', () => {
				const node = equals(variable('x'), number('5'), { relationMetadata: {} });
				const result = withRelationMetadata(node, { color: 'blue' });
				expect(result.relationMetadata).toEqual({ color: 'blue' });
			});

			it('should return unchanged node for unsupported types', () => {
				const node = add(number('1'), number('2'));
				const result = withRelationMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});

			it('should return unchanged node when relationMetadata property does not exist', () => {
				const node = equals(variable('x'), number('5'));
				const result = withRelationMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});
		});

		describe('withNameMetadata', () => {
			it('should merge with existing name metadata', () => {
				const node = sin(variable('x'), { nameMetadata: { color: 'red' } });
				const result = withNameMetadata(node, { style: 'bold' });
				expect(result.nameMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should add new properties when nameMetadata is empty', () => {
				const node = sin(variable('x'), { nameMetadata: {} });
				const result = withNameMetadata(node, { color: 'blue' });
				expect(result.nameMetadata).toEqual({ color: 'blue' });
			});

			it('should return unchanged node for unsupported types', () => {
				const node = number('42');
				const result = withNameMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});

			it('should return unchanged node when nameMetadata property does not exist', () => {
				const node = sin(variable('x'));
				const result = withNameMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});
		});

		describe('withUnitMetadata', () => {
			it('should merge with existing unit metadata', () => {
				const node = quantity('5', 'm', { unitMetadata: { color: 'red' } });
				const result = withUnitMetadata(node, { style: 'bold' });
				expect(result.unitMetadata).toEqual({ color: 'red', style: 'bold' });
			});

			it('should add new properties when unitMetadata is empty', () => {
				const node = quantity('5', 'm', { unitMetadata: {} });
				const result = withUnitMetadata(node, { color: 'blue' });
				expect(result.unitMetadata).toEqual({ color: 'blue' });
			});

			it('should return unchanged node for unsupported types', () => {
				const node = number('42');
				const result = withUnitMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});

			it('should return unchanged node when unitMetadata property does not exist', () => {
				const node = quantity('5', 'm');
				const result = withUnitMetadata(node, { color: 'red' });
				expect(result).toBe(node);
			});
		});

		describe('withMetadata (for completeness)', () => {
			it('should add standard metadata to any node', () => {
				const node = number('42');
				const result = withMetadata(node, { color: 'red' });
				expect(result.metadata).toEqual({ color: 'red' });
			});

			it('should merge with existing metadata', () => {
				const node = number('42', { color: 'red' });
				const result = withMetadata(node, { style: 'bold' });
				expect(result.metadata).toEqual({ color: 'red', style: 'bold' });
			});
		});
	});

	// =============================================================================
	// 3. Guard Tests
	// =============================================================================

	describe('Metadata Guards', () => {
		describe('hasOperatorMetadata', () => {
			it('should return true for node with operator metadata', () => {
				const node = add(number('1'), number('2'), { operatorMetadata: { color: 'red' } });
				expect(hasOperatorMetadata(node)).toBe(true);
			});

			it('should return false for node without operator metadata', () => {
				const node = add(number('1'), number('2'));
				expect(hasOperatorMetadata(node)).toBe(false);
			});

			it('should return false for node types that do not support operator metadata', () => {
				const node = number('42');
				expect(hasOperatorMetadata(node)).toBe(false);
			});
		});

		describe('hasDelimiterMetadata', () => {
			it('should return true for node with delimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: { color: 'red' }
				});
				expect(hasDelimiterMetadata(node)).toBe(true);
			});

			it('should return true for node with leftDelimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					leftDelimiterMetadata: { color: 'red' }
				});
				expect(hasDelimiterMetadata(node)).toBe(true);
			});

			it('should return true for node with rightDelimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					rightDelimiterMetadata: { color: 'red' }
				});
				expect(hasDelimiterMetadata(node)).toBe(true);
			});

			it('should return false for delimiter node without delimiter metadata', () => {
				const node = delimiter('parentheses', variable('x'));
				expect(hasDelimiterMetadata(node)).toBe(false);
			});

			it('should return false for node types that do not support delimiter metadata', () => {
				const node = number('42');
				expect(hasDelimiterMetadata(node)).toBe(false);
			});
		});

		describe('hasNameMetadata', () => {
			it('should return true for function with name metadata', () => {
				const node = sin(variable('x'), { nameMetadata: { color: 'red' } });
				expect(hasNameMetadata(node)).toBe(true);
			});

			it('should return false for function without name metadata', () => {
				const node = sin(variable('x'));
				expect(hasNameMetadata(node)).toBe(false);
			});

			it('should return false for non-function nodes', () => {
				const node = number('42');
				expect(hasNameMetadata(node)).toBe(false);
			});
		});

		describe('hasRelationMetadata', () => {
			it('should return true for relation with relation metadata', () => {
				const node = equals(variable('x'), number('5'), { relationMetadata: { color: 'red' } });
				expect(hasRelationMetadata(node)).toBe(true);
			});

			it('should return false for relation without relation metadata', () => {
				const node = equals(variable('x'), number('5'));
				expect(hasRelationMetadata(node)).toBe(false);
			});

			it('should return false for non-relation nodes', () => {
				const node = number('42');
				expect(hasRelationMetadata(node)).toBe(false);
			});
		});

		describe('hasUnitMetadata', () => {
			it('should return true for unit node with unit metadata', () => {
				const node = quantity('5', 'm', { unitMetadata: { color: 'red' } });
				expect(hasUnitMetadata(node)).toBe(true);
			});

			it('should return false for unit node without unit metadata', () => {
				const node = quantity('5', 'm');
				expect(hasUnitMetadata(node)).toBe(false);
			});

			it('should return false for non-unit nodes', () => {
				const node = number('42');
				expect(hasUnitMetadata(node)).toBe(false);
			});
		});

		describe('hasAnyMetadata', () => {
			it('should return true for node with standard metadata', () => {
				const node = number('42', { color: 'red' });
				expect(hasAnyMetadata(node)).toBe(true);
			});

			it('should return true for node with operator metadata only', () => {
				const node = add(number('1'), number('2'), { operatorMetadata: { color: 'red' } });
				expect(hasAnyMetadata(node)).toBe(true);
			});

			it('should return true for node with delimiter metadata only', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: { color: 'red' }
				});
				expect(hasAnyMetadata(node)).toBe(true);
			});

			it('should return true for node with name metadata only', () => {
				const node = sin(variable('x'), { nameMetadata: { color: 'red' } });
				expect(hasAnyMetadata(node)).toBe(true);
			});

			it('should return true for node with relation metadata only', () => {
				const node = equals(variable('x'), number('5'), { relationMetadata: { color: 'red' } });
				expect(hasAnyMetadata(node)).toBe(true);
			});

			it('should return true for node with unit metadata only', () => {
				const node = quantity('5', 'm', { unitMetadata: { color: 'red' } });
				expect(hasAnyMetadata(node)).toBe(true);
			});

			it('should return false for node without any metadata', () => {
				const node = number('42');
				expect(hasAnyMetadata(node)).toBe(false);
			});

			it('should return false for complex node without metadata', () => {
				const node = add(number('1'), number('2'));
				expect(hasAnyMetadata(node)).toBe(false);
			});
		});

		describe('hasMetadata (standard metadata)', () => {
			it('should return true for node with standard metadata', () => {
				const node = number('42', { color: 'red' });
				expect(hasMetadata(node)).toBe(true);
			});

			it('should return false for node with only extended metadata', () => {
				const node = add(number('1'), number('2'), { operatorMetadata: { color: 'red' } });
				expect(hasMetadata(node)).toBe(false);
			});
		});
	});

	// =============================================================================
	// 4. LaTeX Generator Coalescence Tests
	// =============================================================================

	describe('LaTeX Generator Coalescence', () => {
		describe('Basic Color Coalescence', () => {
			it('should coalesce adjacent same-color spans (number + operator)', () => {
				// 3 (red) + (red) 4 -> \textcolor{red}{3+}4
				const node = add(number('3', { color: 'red' }), number('4'), {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{3 + }4');
			});

			it('should NOT coalesce spans with different colors', () => {
				// 3 (red) + (blue) 4 -> \textcolor{red}{3}\textcolor{blue}{ + }4
				const node = add(number('3', { color: 'red' }), number('4'), {
					operatorMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{3}\\textcolor{blue}{ + }4');
			});

			it('should coalesce all three parts when same color', () => {
				// 3 (red) + (red) 4 (red) -> \textcolor{red}{3 + 4}
				const node = add(number('3', { color: 'red' }), number('4', { color: 'red' }), {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{3 + 4}');
			});

			it('should handle mixed colored and uncolored segments', () => {
				// 3 (uncolored) + (red) 4 (uncolored) -> 3\textcolor{red}{ + }4
				const node = add(number('3'), number('4'), {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('3\\textcolor{red}{ + }4');
			});

			it('should coalesce in subtraction', () => {
				const node = subtract(number('5', { color: 'blue' }), number('2'), {
					operatorMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{blue}{5 - }2');
			});
		});

		describe('Multiplication Operator Coalescence', () => {
			it('should coalesce with dot multiplication', () => {
				const node = multiply(number('2', { color: 'green' }), number('3'), 'dot', {
					operatorMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{green}{2 \\cdot }3');
			});

			it('should coalesce with cross multiplication', () => {
				const node = multiply(number('2', { color: 'orange' }), number('3'), 'cross', {
					operatorMetadata: { color: 'orange' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{orange}{2 \\times }3');
			});

			it('should handle implicit multiplication (space)', () => {
				const node = multiply(number('2', { color: 'red' }), variable('x'), 'implicit', {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{2 }x');
			});
		});

		describe('Division Operator Coalescence', () => {
			it('should color fraction structure with operatorMetadata', () => {
				// When using operatorMetadata on a fraction, the structure (\frac{}{}) gets colored
				// but the content inside is rendered separately
				const node = divide(number('1'), number('2'), 'fraction', {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				// The \frac{ is colored, then 1 (no color), then }{ colored, etc.
				expect(latex).toBe('\\textcolor{red}{\\frac{}1\\textcolor{red}{}{}2\\textcolor{red}{}}');
			});

			it('should coalesce fraction when all parts have same color', () => {
				// When numerator and denominator also have the same color, they coalesce
				const node = divide(
					number('1', { color: 'red' }),
					number('2', { color: 'red' }),
					'fraction',
					{ operatorMetadata: { color: 'red' } }
				);
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\frac{1}{2}}');
			});

			it('should coalesce with inline division', () => {
				const node = divide(number('6', { color: 'blue' }), number('2'), 'inline', {
					operatorMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{blue}{6 / }2');
			});

			it('should coalesce with ratio division', () => {
				const node = divide(number('3', { color: 'green' }), number('4'), 'ratio', {
					operatorMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{green}{3 : }4');
			});
		});

		describe('Unary Operator Coalescence', () => {
			it('should coalesce opposite sign with operand', () => {
				const node = opposite(number('5', { color: 'red' }), {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{-5}');
			});

			it('should coalesce positive sign with operand', () => {
				const node = positive(number('5', { color: 'green' }), {
					operatorMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{green}{+5}');
			});

			it('should NOT coalesce opposite sign with different color operand', () => {
				const node = opposite(number('5', { color: 'blue' }), {
					operatorMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{-}\\textcolor{blue}{5}');
			});
		});

		describe('Delimiter Metadata', () => {
			it('should color both delimiters with delimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					delimiterMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\left( }x\\textcolor{red}{ \\right)}');
			});

			it('should color left delimiter only with leftDelimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					leftDelimiterMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\left( }x \\right)');
			});

			it('should color right delimiter only with rightDelimiterMetadata', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					rightDelimiterMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\left( x\\textcolor{blue}{ \\right)}');
			});

			it('should color left and right delimiters differently', () => {
				const node = delimiter('parentheses', variable('x'), undefined, {
					leftDelimiterMetadata: { color: 'red' },
					rightDelimiterMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\left( }x\\textcolor{blue}{ \\right)}');
			});

			it('should handle absolute value delimiters', () => {
				const node = delimiter('absolute', variable('x'), undefined, {
					delimiterMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{green}{\\left| }x\\textcolor{green}{ \\right|}');
			});
		});

		describe('Function Name Metadata', () => {
			it('should color function name with nameMetadata', () => {
				const node = sin(variable('x'), { nameMetadata: { color: 'red' } });
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\sin}\\left( x \\right)');
			});

			it('should color function name and delimiters separately', () => {
				const node = sin(variable('x'), {
					nameMetadata: { color: 'red' },
					delimiterMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe(
					'\\textcolor{red}{\\sin}\\textcolor{blue}{\\left( }x\\textcolor{blue}{ \\right)}'
				);
			});

			it('should coalesce function name with same-color delimiters', () => {
				const node = sin(variable('x'), {
					nameMetadata: { color: 'red' },
					delimiterMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\sin\\left( }x\\textcolor{red}{ \\right)}');
			});

			it('should handle custom function names', () => {
				const node = func('f', [variable('x')], { nameMetadata: { color: 'orange' } });
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{orange}{f}\\left( x \\right)');
			});

			it('should handle function with power and name metadata', () => {
				const node = func('sin', [variable('x')], {
					power: number('2'),
					nameMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{green}{\\sin}^{2}\\left( x \\right)');
			});
		});

		describe('Relation Metadata', () => {
			it('should color relation operator with relationMetadata', () => {
				const node = equals(variable('x'), number('5'), { relationMetadata: { color: 'red' } });
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('x\\textcolor{red}{ = }5');
			});

			it('should coalesce left operand with same-color relation', () => {
				const node = equals(variable('x', { color: 'red' }), number('5'), {
					relationMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{x = }5');
			});

			it('should coalesce all parts when same color', () => {
				const node = equals(variable('x', { color: 'blue' }), number('5', { color: 'blue' }), {
					relationMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{blue}{x = 5}');
			});

			it('should handle different relation types', () => {
				const node = relation('<', variable('x'), number('10'), {
					relationMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('x\\textcolor{green}{ < }10');
			});
		});

		describe('Unit Metadata', () => {
			it('should color unit with unitMetadata', () => {
				const node = quantity('5', 'm', { unitMetadata: { color: 'red' } });
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('5~\\textcolor{red}{\\unit{m}}');
			});

			it('should color expression and unit differently', () => {
				const node = quantity('5', 'm', {
					metadata: { color: 'blue' },
					unitMetadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{blue}{5~}\\textcolor{red}{\\unit{m}}');
			});

			it('should coalesce expression tilde and unit when same color', () => {
				const node = quantity('5', 'm', {
					metadata: { color: 'green' },
					unitMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{green}{5~\\unit{m}}');
			});
		});

		describe('Complex Expression Coalescence', () => {
			it('should handle nested expression with multiple colors', () => {
				// (3 + 4) * 5 with different colors on different parts
				const addition = add(number('3', { color: 'red' }), number('4', { color: 'red' }), {
					operatorMetadata: { color: 'red' }
				});
				const wrapped = parentheses(addition);
				const node = multiply(wrapped, number('5', { color: 'blue' }), 'dot', {
					operatorMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\left( \\textcolor{red}{3 + 4} \\right)\\textcolor{blue}{ \\cdot 5}');
			});

			it('should handle expression with same color throughout', () => {
				// 3 + 4 all red
				const node = add(number('3', { color: 'red' }), number('4', { color: 'red' }), {
					operatorMetadata: { color: 'red' },
					metadata: { color: 'red' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{3 + 4}');
			});

			it('should handle fraction with colored numerator and denominator', () => {
				const node = fraction(number('1', { color: 'red' }), number('2', { color: 'blue' }), {
					operatorMetadata: { color: 'green' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				// The \frac{ is colored green, then red 1, then green }{, then blue 2, then green }
				expect(latex).toBe(
					'\\textcolor{green}{\\frac{}\\textcolor{red}{1}\\textcolor{green}{}{}\\textcolor{blue}{2}\\textcolor{green}{}}'
				);
			});
		});

		describe('Style Coalescence', () => {
			it('should coalesce same-style spans', () => {
				const node = add(number('3', { style: 'bold' }), number('4', { style: 'bold' }), {
					operatorMetadata: { style: 'bold' }
				});
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\mathbf{3 + 4}');
			});

			it('should NOT coalesce different styles', () => {
				const node = add(number('3', { style: 'bold' }), number('4', { style: 'italic' }));
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\mathbf{3} + \\mathit{4}');
			});

			it('should handle color and style together', () => {
				const node = number('42', { color: 'red', style: 'bold' });
				const latex = toLatex(node, { renderMetadata: true });
				expect(latex).toBe('\\textcolor{red}{\\mathbf{42}}');
			});
		});

		describe('No Metadata Mode', () => {
			it('should not apply any coloring when renderMetadata is false', () => {
				const node = add(number('3', { color: 'red' }), number('4'), {
					operatorMetadata: { color: 'blue' }
				});
				const latex = toLatex(node, { renderMetadata: false });
				expect(latex).toBe('3 + 4');
			});

			it('should not apply coloring by default', () => {
				const node = add(number('3', { color: 'red' }), number('4'));
				const latex = toLatex(node);
				expect(latex).toBe('3 + 4');
			});
		});
	});
});
