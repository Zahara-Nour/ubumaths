/**
 * Unit tests for MathAST UnitNode feature
 *
 * Tests the UnitNode type and related functionality:
 * - Factory functions (withUnit, quantity, quantityVar)
 * - Type guards (isUnit, hasUnitDescendant, isDimensionlessUnit)
 * - Transforms (getChildren, mapNode, mapNodeTopDown, cloneNode)
 * - LaTeX generation
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
	opposite,
	parentheses,
	superscript,
	withUnit,
	quantity,
	quantityVar
} from '../factory';

// Type guards
import { isUnit, hasUnitDescendant, isDimensionlessUnit, isNumber, hasChildren } from '../guards';

// Transforms
import {
	getChildren,
	mapNode,
	mapNodeTopDown,
	cloneNode,
	countNodes,
	getDepth
} from '../transforms';

// LaTeX generator
import { toLatex } from '../latex-generator';

// Unit parser
import { parse } from '../units/parser';

// Types
import type { UnitNode, NumberNode, VariableNode } from '../types';

describe('UnitNode', () => {
	// =============================================================================
	// Factory Functions
	// =============================================================================

	describe('factories', () => {
		describe('withUnit', () => {
			it('creates UnitNode wrapping a number', () => {
				const unit = parse('m')!;
				const node = withUnit(number('5'), unit);

				expect(node.type).toBe('unit');
				expect(node.expression.type).toBe('number');
				expect((node.expression as NumberNode).value).toBe('5');
				expect(node.unit).toBe(unit);
			});

			it('creates UnitNode wrapping a variable', () => {
				const unit = parse('kg')!;
				const node = withUnit(variable('m'), unit);

				expect(node.type).toBe('unit');
				expect(node.expression.type).toBe('variable');
				expect((node.expression as VariableNode).name).toBe('m');
				expect(node.unit).toBe(unit);
			});

			it('creates UnitNode wrapping an expression', () => {
				const unit = parse('m')!;
				const expr = add(number('3'), number('4'));
				const node = withUnit(expr, unit);

				expect(node.type).toBe('unit');
				expect(node.expression.type).toBe('addition');
			});

			it('preserves metadata when provided', () => {
				const unit = parse('m')!;
				const node = withUnit(number('5'), unit, { color: 'red' });

				expect(node.metadata?.color).toBe('red');
			});

			it('handles compound units', () => {
				const unit = parse('m/s')!;
				const node = withUnit(number('10'), unit);

				expect(node.type).toBe('unit');
				expect(node.unit.components.get('m')).toBe(1);
				expect(node.unit.components.get('s')).toBe(-1);
			});
		});

		describe('quantity', () => {
			it('creates UnitNode from numeric value and unit string', () => {
				const node = quantity('5', 'm');

				expect(node.type).toBe('unit');
				expect(node.expression.type).toBe('number');
				expect((node.expression as NumberNode).value).toBe('5');
				expect(node.unit.original).toBe('m');
			});

			it('creates UnitNode with compound unit', () => {
				const node = quantity('100', 'km/h');

				expect(node.type).toBe('unit');
				expect((node.expression as NumberNode).value).toBe('100');
				expect(node.unit.original).toBe('km/h');
			});

			it('creates UnitNode with exponent in unit', () => {
				const node = quantity('9.81', 'm.s^-2');

				expect(node.type).toBe('unit');
				expect((node.expression as NumberNode).value).toBe('9.81');
				expect(node.unit.components.get('m')).toBe(1);
				expect(node.unit.components.get('s')).toBe(-2);
			});

			it('preserves metadata', () => {
				const node = quantity('5', 'm', { color: 'blue' });

				expect(node.metadata?.color).toBe('blue');
			});

			it('throws for invalid unit string', () => {
				expect(() => quantity('5', 'invalid_unit_xyz')).toThrow();
			});
		});

		describe('quantityVar', () => {
			it('creates UnitNode with variable expression', () => {
				const node = quantityVar('v', 'm/s');

				expect(node.type).toBe('unit');
				expect(node.expression.type).toBe('variable');
				expect((node.expression as VariableNode).name).toBe('v');
				expect(node.unit.original).toBe('m/s');
			});

			it('handles multi-character variable names', () => {
				const node = quantityVar('velocity', 'm/s');

				expect((node.expression as VariableNode).name).toBe('velocity');
			});

			it('preserves metadata', () => {
				const node = quantityVar('m', 'kg', { style: 'italic' });

				expect(node.metadata?.style).toBe('italic');
			});

			it('throws for invalid unit string', () => {
				expect(() => quantityVar('x', 'not_a_unit')).toThrow();
			});
		});
	});

	// =============================================================================
	// Type Guards
	// =============================================================================

	describe('guards', () => {
		describe('isUnit', () => {
			it('returns true for UnitNode', () => {
				const node = quantity('5', 'm');
				expect(isUnit(node)).toBe(true);
			});

			it('returns false for NumberNode', () => {
				expect(isUnit(number('5'))).toBe(false);
			});

			it('returns false for VariableNode', () => {
				expect(isUnit(variable('x'))).toBe(false);
			});

			it('returns false for AdditionNode', () => {
				expect(isUnit(add(number('1'), number('2')))).toBe(false);
			});

			it('returns false for other node types', () => {
				expect(isUnit(multiply(number('2'), number('3'), 'dot'))).toBe(false);
				expect(isUnit(parentheses(variable('x')))).toBe(false);
				expect(isUnit(opposite(number('5')))).toBe(false);
			});
		});

		describe('hasUnitDescendant', () => {
			it('returns true for UnitNode itself', () => {
				const node = quantity('5', 'm');
				expect(hasUnitDescendant(node)).toBe(true);
			});

			it('returns true when UnitNode is nested in addition', () => {
				const unitNode = quantity('5', 'm');
				const nested = add(unitNode, number('3'));
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns true when UnitNode is nested in subtraction', () => {
				const unitNode = quantity('10', 'km');
				const nested = subtract(unitNode, quantity('3', 'km'));
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns true when UnitNode is nested in multiplication', () => {
				const unitNode = quantity('5', 'm');
				const nested = multiply(number('2'), unitNode, 'dot');
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns true when UnitNode is nested in division', () => {
				const unitNode = quantity('100', 'km');
				const nested = divide(unitNode, number('2'), 'fraction');
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns true when UnitNode is nested in opposite', () => {
				const unitNode = quantity('5', 'm');
				const nested = opposite(unitNode);
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns true when UnitNode is nested in parentheses', () => {
				const unitNode = quantity('5', 'm');
				const nested = parentheses(unitNode);
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns true when UnitNode is deeply nested', () => {
				const unitNode = quantity('5', 'm');
				const nested = add(multiply(parentheses(unitNode), number('2'), 'dot'), number('1'));
				expect(hasUnitDescendant(nested)).toBe(true);
			});

			it('returns false for tree without UnitNode', () => {
				const node = add(number('1'), number('2'));
				expect(hasUnitDescendant(node)).toBe(false);
			});

			it('returns false for complex tree without UnitNode', () => {
				const node = multiply(
					add(variable('x'), number('2')),
					subtract(variable('y'), number('3')),
					'dot'
				);
				expect(hasUnitDescendant(node)).toBe(false);
			});

			it('returns false for leaf nodes', () => {
				expect(hasUnitDescendant(number('5'))).toBe(false);
				expect(hasUnitDescendant(variable('x'))).toBe(false);
			});
		});

		describe('isDimensionlessUnit', () => {
			it('returns false for non-UnitNode', () => {
				expect(isDimensionlessUnit(number('5'))).toBe(false);
				expect(isDimensionlessUnit(variable('x'))).toBe(false);
			});

			it('returns false for UnitNode with dimensions', () => {
				const node = quantity('5', 'm');
				expect(isDimensionlessUnit(node)).toBe(false);
			});

			it('returns false for compound unit with dimensions', () => {
				const node = quantity('10', 'm/s');
				expect(isDimensionlessUnit(node)).toBe(false);
			});

			it('returns true for dimensionless unit (empty components)', () => {
				// Create a unit with empty components (dimensionless)
				const unit = {
					components: new Map<string, number>(),
					coefficient: 1
				};
				const node = withUnit(number('1'), unit);
				expect(isDimensionlessUnit(node)).toBe(true);
			});

			it('returns true when all exponents are zero', () => {
				// This is an edge case - a unit where all exponents happen to be 0
				const unit = {
					components: new Map<string, number>([
						['m', 0],
						['s', 0]
					]),
					coefficient: 1
				};
				const node = withUnit(number('1'), unit);
				expect(isDimensionlessUnit(node)).toBe(true);
			});
		});
	});

	// =============================================================================
	// Transforms
	// =============================================================================

	describe('transforms', () => {
		describe('getChildren', () => {
			it('returns expression for UnitNode', () => {
				const node = quantity('5', 'm');
				const children = getChildren(node);

				expect(children).toHaveLength(1);
				expect(children[0].type).toBe('number');
				expect((children[0] as NumberNode).value).toBe('5');
			});

			it('returns complex expression for UnitNode', () => {
				const expr = add(number('3'), number('4'));
				const unit = parse('km')!;
				const node = withUnit(expr, unit);
				const children = getChildren(node);

				expect(children).toHaveLength(1);
				expect(children[0].type).toBe('addition');
			});
		});

		describe('hasChildren', () => {
			it('returns true for UnitNode', () => {
				const node = quantity('5', 'm');
				expect(hasChildren(node)).toBe(true);
			});
		});

		describe('mapNode (bottom-up)', () => {
			it('transforms expression inside UnitNode', () => {
				const node = quantity('5', 'm');
				const result = mapNode(node, (n) => {
					if (n.type === 'number') {
						return number(String(Number(n.value) * 2));
					}
					return n;
				});

				expect(result.type).toBe('unit');
				expect((result as UnitNode).expression.type).toBe('number');
				expect(((result as UnitNode).expression as NumberNode).value).toBe('10');
			});

			it('preserves unit when transforming expression', () => {
				const node = quantity('5', 'm/s');
				const result = mapNode(node, (n) => {
					if (n.type === 'number') {
						return number('10');
					}
					return n;
				}) as UnitNode;

				expect(result.unit.original).toBe('m/s');
			});

			it('preserves metadata during transformation', () => {
				const node = quantity('5', 'm', { color: 'red' });
				const result = mapNode(node, (n) => n);

				expect(result.metadata?.color).toBe('red');
			});

			it('transforms nested expression correctly', () => {
				const unit = parse('m')!;
				const expr = add(number('2'), number('3'));
				const node = withUnit(expr, unit);

				const result = mapNode(node, (n) => {
					if (n.type === 'number') {
						return number(String(Number(n.value) * 10));
					}
					return n;
				}) as UnitNode;

				expect(result.expression.type).toBe('addition');
				const addNode = result.expression as ReturnType<typeof add>;
				expect((addNode.left as NumberNode).value).toBe('20');
				expect((addNode.right as NumberNode).value).toBe('30');
			});

			it('visits nodes in correct order (bottom-up)', () => {
				const node = quantity('5', 'm');
				const visitOrder: string[] = [];

				mapNode(node, (n) => {
					visitOrder.push(n.type);
					return n;
				});

				// Children first (number), then parent (unit)
				expect(visitOrder).toEqual(['number', 'unit']);
			});
		});

		describe('mapNodeTopDown', () => {
			it('transforms expression inside UnitNode', () => {
				const node = quantity('5', 'm');
				const result = mapNodeTopDown(node, (n) => {
					if (n.type === 'number') {
						return number('10');
					}
					return n;
				}) as UnitNode;

				expect(result.expression.type).toBe('number');
				expect((result.expression as NumberNode).value).toBe('10');
			});

			it('visits nodes in correct order (top-down)', () => {
				const node = quantity('5', 'm');
				const visitOrder: string[] = [];

				mapNodeTopDown(node, (n) => {
					visitOrder.push(n.type);
					return n;
				});

				// Parent first (unit), then children (number)
				expect(visitOrder).toEqual(['unit', 'number']);
			});

			it('preserves unit during transformation', () => {
				const node = quantity('10', 'km/h');
				const result = mapNodeTopDown(node, (n) => n) as UnitNode;

				expect(result.unit.original).toBe('km/h');
			});
		});

		describe('cloneNode', () => {
			it('deep clones UnitNode', () => {
				const node = quantity('5', 'm');
				const cloned = cloneNode(node);

				expect(cloned).not.toBe(node);
				expect(cloned.type).toBe('unit');
				expect((cloned as UnitNode).expression).not.toBe(node.expression);
			});

			it('clones expression correctly', () => {
				const node = quantity('5', 'm');
				const cloned = cloneNode(node) as UnitNode;

				expect(cloned.expression.type).toBe('number');
				expect((cloned.expression as NumberNode).value).toBe('5');
			});

			it('preserves unit reference (immutable)', () => {
				const node = quantity('5', 'm');
				const cloned = cloneNode(node) as UnitNode;

				// Unit object should be same reference (it's immutable)
				expect(cloned.unit).toBe(node.unit);
			});

			it('preserves metadata in clone', () => {
				const node = quantity('5', 'm', { color: 'red' });
				const cloned = cloneNode(node);

				expect(cloned.metadata?.color).toBe('red');
			});

			it('deep clones complex expression inside UnitNode', () => {
				const unit = parse('km')!;
				const expr = add(number('10'), number('20'));
				const node = withUnit(expr, unit);
				const cloned = cloneNode(node) as UnitNode;

				expect(cloned).not.toBe(node);
				expect(cloned.expression).not.toBe(node.expression);
				expect((cloned.expression as ReturnType<typeof add>).left).not.toBe(
					(node.expression as ReturnType<typeof add>).left
				);
			});
		});

		describe('countNodes', () => {
			it('counts UnitNode and its expression', () => {
				const node = quantity('5', 'm');
				expect(countNodes(node)).toBe(2); // unit + number
			});

			it('counts complex expression inside UnitNode', () => {
				const unit = parse('m')!;
				const expr = add(number('3'), number('4'));
				const node = withUnit(expr, unit);

				expect(countNodes(node)).toBe(4); // unit + addition + 2 numbers
			});
		});

		describe('getDepth', () => {
			it('returns correct depth for simple UnitNode', () => {
				const node = quantity('5', 'm');
				expect(getDepth(node)).toBe(2); // unit -> number
			});

			it('returns correct depth for UnitNode with nested expression', () => {
				const unit = parse('m')!;
				const expr = add(number('3'), number('4'));
				const node = withUnit(expr, unit);

				expect(getDepth(node)).toBe(3); // unit -> addition -> number
			});
		});
	});

	// =============================================================================
	// LaTeX Generation
	// =============================================================================

	describe('latex generation', () => {
		it('generates correct LaTeX for simple quantity', () => {
			const node = quantity('5', 'm');
			expect(toLatex(node)).toBe('5~\\unit{m}');
		});

		it('generates correct LaTeX for decimal quantity', () => {
			const node = quantity('3.14', 'm');
			expect(toLatex(node)).toBe('3.14~\\unit{m}');
		});

		it('generates correct LaTeX for variable with unit', () => {
			const node = quantityVar('v', 'm/s');
			expect(toLatex(node)).toBe('v~\\unit{m/s}');
		});

		it('handles compound units (velocity)', () => {
			const node = quantity('100', 'km/h');
			expect(toLatex(node)).toBe('100~\\unit{km/h}');
		});

		it('handles compound units (acceleration)', () => {
			const node = quantity('9.81', 'm.s^-2');
			expect(toLatex(node)).toBe('9.81~\\unit{m.s^-2}');
		});

		it('handles squared units', () => {
			const node = quantity('50', 'm^2');
			expect(toLatex(node)).toBe('50~\\unit{m^2}');
		});

		it('handles mass units', () => {
			const node = quantity('75', 'kg');
			expect(toLatex(node)).toBe('75~\\unit{kg}');
		});

		it('handles time units', () => {
			const node = quantity('60', 's');
			expect(toLatex(node)).toBe('60~\\unit{s}');
		});

		it('generates correct LaTeX for expression with unit', () => {
			const unit = parse('m')!;
			const expr = add(number('3'), number('4'));
			const node = withUnit(expr, unit);

			expect(toLatex(node)).toBe('3 + 4~\\unit{m}');
		});

		it('generates correct LaTeX for parenthesized expression with unit', () => {
			const unit = parse('km')!;
			const expr = parentheses(add(number('10'), number('20')));
			const node = withUnit(expr, unit);

			expect(toLatex(node)).toBe('\\left( 10 + 20 \\right)~\\unit{km}');
		});

		it('generates correct LaTeX for multiplication with unit', () => {
			const unit = parse('kg')!;
			const expr = multiply(number('5'), number('10'), 'dot');
			const node = withUnit(expr, unit);

			expect(toLatex(node)).toBe('5 \\cdot 10~\\unit{kg}');
		});

		it('generates correct LaTeX for fraction with unit', () => {
			const unit = parse('m')!;
			const expr = divide(number('1'), number('2'), 'fraction');
			const node = withUnit(expr, unit);

			expect(toLatex(node)).toBe('\\frac{1}{2}~\\unit{m}');
		});

		it('generates correct LaTeX for power expression with unit', () => {
			const unit = parse('kg.m^2.s^-2')!; // Energy unit in SI base units
			const expr = superscript(variable('E'), number('2'));
			const node = withUnit(expr, unit);

			expect(toLatex(node)).toBe('E^2~\\unit{kg.m^2.s^-2}');
		});

		it('handles metadata rendering when enabled', () => {
			const node = quantity('5', 'm', { color: 'red' });
			const latex = toLatex(node, { renderMetadata: true });

			expect(latex).toBe('\\textcolor{red}{5~\\unit{m}}');
		});

		it('ignores metadata when disabled (default)', () => {
			const node = quantity('5', 'm', { color: 'red' });
			const latex = toLatex(node);

			expect(latex).toBe('5~\\unit{m}');
		});
	});

	// =============================================================================
	// Edge Cases and Integration
	// =============================================================================

	describe('edge cases', () => {
		it('handles nested UnitNodes (inner unit takes precedence)', () => {
			const innerUnit = quantity('5', 'm');
			const outerUnit = parse('s')!;
			const node = withUnit(innerUnit, outerUnit);

			// The outer unit wraps the inner UnitNode
			expect(node.type).toBe('unit');
			expect((node.expression as UnitNode).type).toBe('unit');
		});

		it('handles UnitNode in complex expression tree', () => {
			const unitA = quantity('10', 'm');
			const unitB = quantity('5', 's');
			const expr = divide(unitA, unitB, 'fraction');

			expect(hasUnitDescendant(expr)).toBe(true);
		});

		it('correctly identifies type in mixed tree', () => {
			const unitNode = quantity('5', 'm');
			const numNode = number('10');
			const varNode = variable('x');

			expect(isUnit(unitNode)).toBe(true);
			expect(isUnit(numNode)).toBe(false);
			expect(isUnit(varNode)).toBe(false);
			expect(isNumber(unitNode)).toBe(false);
		});

		it('handles units with prefixes correctly', () => {
			const km = quantity('5', 'km');
			const mm = quantity('10', 'mm');
			const kg = quantity('75', 'kg');

			expect(toLatex(km)).toBe('5~\\unit{km}');
			expect(toLatex(mm)).toBe('10~\\unit{mm}');
			expect(toLatex(kg)).toBe('75~\\unit{kg}');
		});

		it('handles complex compound units', () => {
			// Energy: kg.m^2.s^-2
			const energy = quantity('100', 'kg.m^2.s^-2');
			// Acceleration: m.s^-2
			const acceleration = quantity('9.81', 'm.s^-2');
			// Force: kg.m.s^-2
			const force = quantity('50', 'kg.m.s^-2');

			expect(toLatex(energy)).toBe('100~\\unit{kg.m^2.s^-2}');
			expect(toLatex(acceleration)).toBe('9.81~\\unit{m.s^-2}');
			expect(toLatex(force)).toBe('50~\\unit{kg.m.s^-2}');
		});
	});
});
