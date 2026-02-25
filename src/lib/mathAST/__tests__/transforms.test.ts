/**
 * Unit tests for MathAST transformation helpers
 */

import { describe, it, expect } from 'vitest';
import {
	withMetadata,
	getChildren,
	mapNode,
	mapNodeTopDown,
	findNodes,
	findFirst,
	replaceNode,
	cloneNode,
	countNodes,
	getDepth,
	stripUnnecessaryBrackets
} from '../transforms';
import {
	number,
	variable,
	greek,
	symbol,
	add,
	subtract,
	multiply,
	divide,
	opposite,
	positive,
	func,
	sin,
	log,
	delimiter,
	parentheses,
	subscript,
	superscript,
	equals,
	fraction
} from '../factory';

describe('transforms', () => {
	// =============================================================================
	// Metadata Helpers
	// =============================================================================

	describe('withMetadata', () => {
		it('adds metadata to node without existing metadata', () => {
			const node = number('42');
			const result = withMetadata(node, { color: 'red' });

			expect(result.metadata?.color).toBe('red');
			expect(result.value).toBe('42');
		});

		it('merges with existing metadata', () => {
			const node = number('42', { color: 'red' });
			const result = withMetadata(node, { style: 'bold' });

			expect(result.metadata?.color).toBe('red');
			expect(result.metadata?.style).toBe('bold');
		});

		it('overwrites existing fields', () => {
			const node = number('42', { color: 'red' });
			const result = withMetadata(node, { color: 'blue' });

			expect(result.metadata?.color).toBe('blue');
		});

		it('preserves node properties', () => {
			const node = variable('x');
			const result = withMetadata(node, { color: 'green' });

			expect(result.type).toBe('variable');
			expect(result.name).toBe('x');
		});
	});

	// =============================================================================
	// Node Traversal Helpers
	// =============================================================================

	describe('getChildren', () => {
		it('returns empty array for number node', () => {
			const node = number('42');
			expect(getChildren(node)).toEqual([]);
		});

		it('returns empty array for variable node', () => {
			const node = variable('x');
			expect(getChildren(node)).toEqual([]);
		});

		it('returns empty array for greek letter node', () => {
			const node = greek('alpha');
			expect(getChildren(node)).toEqual([]);
		});

		it('returns empty array for symbol node', () => {
			const node = symbol('infinity');
			expect(getChildren(node)).toEqual([]);
		});

		it('returns left and right for addition', () => {
			const left = number('2');
			const right = number('3');
			const node = add(left, right);

			expect(getChildren(node)).toEqual([left, right]);
		});

		it('returns left and right for subtraction', () => {
			const left = number('5');
			const right = number('2');
			const node = subtract(left, right);

			expect(getChildren(node)).toEqual([left, right]);
		});

		it('returns left and right for multiplication', () => {
			const left = number('2');
			const right = variable('x');
			const node = multiply(left, right, 'dot');

			expect(getChildren(node)).toEqual([left, right]);
		});

		it('returns numerator and denominator for division', () => {
			const num = number('1');
			const den = number('2');
			const node = divide(num, den, 'fraction');

			expect(getChildren(node)).toEqual([num, den]);
		});

		it('returns operand for opposite', () => {
			const operand = number('5');
			const node = opposite(operand);

			expect(getChildren(node)).toEqual([operand]);
		});

		it('returns operand for positive', () => {
			const operand = number('5');
			const node = positive(operand);

			expect(getChildren(node)).toEqual([operand]);
		});

		it('returns args for function without power/base', () => {
			const arg = variable('x');
			const node = sin(arg);

			expect(getChildren(node)).toEqual([arg]);
		});

		it('returns args and power for function with power', () => {
			const arg = variable('x');
			const powerValue = number('2');
			const node = func('f', [arg], { power: powerValue });

			expect(getChildren(node)).toEqual([arg, powerValue]);
		});

		it('returns args and base for function with base', () => {
			const arg = variable('x');
			const baseValue = number('2');
			const node = log(arg, baseValue);

			expect(getChildren(node)).toEqual([arg, baseValue]);
		});

		it('returns multiple args for function', () => {
			const arg1 = variable('x');
			const arg2 = variable('y');
			const node = func('max', [arg1, arg2]);

			expect(getChildren(node)).toEqual([arg1, arg2]);
		});

		it('returns content for delimiter', () => {
			const content = variable('x');
			const node = parentheses(content);

			expect(getChildren(node)).toEqual([content]);
		});

		it('returns base and subscript for subscript node', () => {
			const base = variable('x');
			const sub = number('1');
			const node = subscript(base, sub);

			expect(getChildren(node)).toEqual([base, sub]);
		});

		it('returns base and superscript for superscript node', () => {
			const base = variable('x');
			const sup = number('2');
			const node = superscript(base, sup);

			expect(getChildren(node)).toEqual([base, sup]);
		});

		it('returns left and right for relation', () => {
			const left = variable('x');
			const right = number('5');
			const node = equals(left, right);

			expect(getChildren(node)).toEqual([left, right]);
		});
	});

	// =============================================================================
	// Tree Traversal and Transformation
	// =============================================================================

	describe('mapNode', () => {
		it('transforms leaf node', () => {
			const node = number('42');
			const result = mapNode(node, (n) => {
				if (n.type === 'number') {
					return number(String(Number(n.value) * 2));
				}
				return n;
			});

			expect(result.type).toBe('number');
			expect((result as typeof node).value).toBe('84');
		});

		it('transforms bottom-up (children first, then parent)', () => {
			// 2 + 3
			const node = add(number('2'), number('3'));
			const transformOrder: string[] = [];

			mapNode(node, (n) => {
				transformOrder.push(n.type);
				return n;
			});

			// Children (number, number) should be visited before parent (addition)
			expect(transformOrder).toEqual(['number', 'number', 'addition']);
		});

		it('transforms nested tree correctly', () => {
			// (2 + 3) * 4
			const inner = add(number('2'), number('3'));
			const node = multiply(inner, number('4'), 'dot');

			const result = mapNode(node, (n) => {
				if (n.type === 'number') {
					return number(String(Number(n.value) * 10));
				}
				return n;
			});

			expect(result.type).toBe('multiplication');
			const mult = result as typeof node;
			expect(mult.left.type).toBe('addition');

			const leftAdd = mult.left as ReturnType<typeof add>;
			expect((leftAdd.left as ReturnType<typeof number>).value).toBe('20');
			expect((leftAdd.right as ReturnType<typeof number>).value).toBe('30');
			expect((mult.right as ReturnType<typeof number>).value).toBe('40');
		});

		it('preserves metadata during transformation', () => {
			const node = add(number('2', { color: 'red' }), number('3'), { style: 'bold' });
			const result = mapNode(node, (n) => n);

			expect(result.metadata?.style).toBe('bold');
			const addNode = result as typeof node;
			expect((addNode.left as ReturnType<typeof number>).metadata?.color).toBe('red');
		});

		it('transforms all node types correctly', () => {
			// Test with opposite, function, delimiter
			const node = opposite(sin(parentheses(variable('x'))));
			const result = mapNode(node, (n) => {
				if (n.type === 'variable' && n.name === 'x') {
					return variable('y');
				}
				return n;
			});

			const opp = result as ReturnType<typeof opposite>;
			const funcNode = opp.operand as ReturnType<typeof sin>;
			const delim = funcNode.args[0] as ReturnType<typeof delimiter>;
			const varNode = delim.content as ReturnType<typeof variable>;

			expect(varNode.name).toBe('y');
		});
	});

	describe('mapNodeTopDown', () => {
		it('transforms top-down (parent first, then children)', () => {
			// 2 + 3
			const node = add(number('2'), number('3'));
			const transformOrder: string[] = [];

			mapNodeTopDown(node, (n) => {
				transformOrder.push(n.type);
				return n;
			});

			// Parent (addition) should be visited before children (number, number)
			expect(transformOrder).toEqual(['addition', 'number', 'number']);
		});

		it('transforms leaf node', () => {
			const node = number('42');
			const result = mapNodeTopDown(node, (n) => {
				if (n.type === 'number') {
					return number(String(Number(n.value) * 2));
				}
				return n;
			});

			expect(result.type).toBe('number');
			expect((result as typeof node).value).toBe('84');
		});

		it('transforms nested tree correctly', () => {
			// (2 + 3) * 4
			const inner = add(number('2'), number('3'));
			const node = multiply(inner, number('4'), 'dot');

			const result = mapNodeTopDown(node, (n) => {
				if (n.type === 'number') {
					return number(String(Number(n.value) * 10));
				}
				return n;
			});

			expect(result.type).toBe('multiplication');
			const mult = result as typeof node;
			expect(mult.left.type).toBe('addition');

			const leftAdd = mult.left as ReturnType<typeof add>;
			expect((leftAdd.left as ReturnType<typeof number>).value).toBe('20');
			expect((leftAdd.right as ReturnType<typeof number>).value).toBe('30');
			expect((mult.right as ReturnType<typeof number>).value).toBe('40');
		});
	});

	// =============================================================================
	// Node Search and Query
	// =============================================================================

	describe('findNodes', () => {
		it('finds all matching nodes', () => {
			// 2 + 3 + 4
			const node = add(add(number('2'), number('3')), number('4'));
			const numbers = findNodes(node, (n) => n.type === 'number');

			expect(numbers).toHaveLength(3);
			expect(numbers.every((n) => n.type === 'number')).toBe(true);
		});

		it('returns empty array when no matches', () => {
			const node = add(number('2'), number('3'));
			const vars = findNodes(node, (n) => n.type === 'variable');

			expect(vars).toEqual([]);
		});

		it('returns root node if it matches', () => {
			const node = number('42');
			const numbers = findNodes(node, (n) => n.type === 'number');

			expect(numbers).toEqual([node]);
		});

		it('finds nested matches', () => {
			// sin(x + 2)
			const node = sin(add(variable('x'), number('2')));
			const allNodes = findNodes(node, () => true);

			// function, addition, variable, number
			expect(allNodes).toHaveLength(4);
		});

		it('uses predicate correctly', () => {
			// 2 * x + 3 * y
			const node = add(
				multiply(number('2'), variable('x'), 'dot'),
				multiply(number('3'), variable('y'), 'dot')
			);

			const multiplications = findNodes(node, (n) => n.type === 'multiplication');
			expect(multiplications).toHaveLength(2);
		});
	});

	describe('findFirst', () => {
		it('returns first matching node', () => {
			// 2 + 3 + 4
			const node = add(add(number('2'), number('3')), number('4'));
			const firstNumber = findFirst(node, (n) => n.type === 'number');

			expect(firstNumber?.type).toBe('number');
			expect((firstNumber as ReturnType<typeof number>)?.value).toBe('2');
		});

		it('returns undefined when no match', () => {
			const node = add(number('2'), number('3'));
			const result = findFirst(node, (n) => n.type === 'variable');

			expect(result).toBeUndefined();
		});

		it('returns root node if it matches', () => {
			const node = number('42');
			const result = findFirst(node, (n) => n.type === 'number');

			expect(result).toBe(node);
		});

		it('stops at first match', () => {
			// x + y
			const node = add(variable('x'), variable('y'));
			let visitCount = 0;

			const result = findFirst(node, (n) => {
				if (n.type === 'variable') {
					visitCount++;
					return true;
				}
				return false;
			});

			expect(result?.type).toBe('variable');
			expect((result as ReturnType<typeof variable>)?.name).toBe('x');
			expect(visitCount).toBe(1); // Should stop after finding first
		});
	});

	describe('replaceNode', () => {
		it('replaces matching nodes with fixed replacement', () => {
			// 2 + 3
			const node = add(number('2'), number('3'));
			const result = replaceNode(node, (n) => n.type === 'number' && n.value === '2', number('5'));

			const addNode = result as typeof node;
			expect((addNode.left as ReturnType<typeof number>).value).toBe('5');
			expect((addNode.right as ReturnType<typeof number>).value).toBe('3');
		});

		it('replaces matching nodes with function replacement', () => {
			// 2 + 3
			const node = add(number('2'), number('3'));
			const result = replaceNode(
				node,
				(n) => n.type === 'number',
				(n) => {
					if (n.type === 'number') {
						return number(String(Number(n.value) * 2));
					}
					return n;
				}
			);

			const addNode = result as typeof node;
			expect((addNode.left as ReturnType<typeof number>).value).toBe('4');
			expect((addNode.right as ReturnType<typeof number>).value).toBe('6');
		});

		it('replaces multiple occurrences', () => {
			// x + x + x
			const node = add(add(variable('x'), variable('x')), variable('x'));
			const result = replaceNode(
				node,
				(n) => n.type === 'variable' && n.name === 'x',
				variable('y')
			);

			const allVars = findNodes(result, (n) => n.type === 'variable');
			expect(allVars.every((v) => (v as ReturnType<typeof variable>).name === 'y')).toBe(true);
		});

		it('returns unchanged tree when no matches', () => {
			const node = add(number('2'), number('3'));
			const result = replaceNode(node, (n) => n.type === 'variable', variable('x'));

			expect(result).toEqual(node);
		});
	});

	// =============================================================================
	// Node Cloning
	// =============================================================================

	describe('cloneNode', () => {
		it('clones number node', () => {
			const node = number('42', { color: 'red' });
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node); // Different reference
		});

		it('clones variable node', () => {
			const node = variable('x', { style: 'italic' });
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
		});

		it('clones greek letter node', () => {
			const node = greek('alpha');
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
		});

		it('clones symbol node', () => {
			const node = symbol('infinity');
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
		});

		it('deep clones addition node', () => {
			const node = add(number('2'), number('3'));
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
			expect(clone.left).not.toBe(node.left);
			expect(clone.right).not.toBe(node.right);
		});

		it('deep clones nested tree', () => {
			// (2 + 3) * 4
			const node = multiply(add(number('2'), number('3')), number('4'), 'dot');
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
			expect(clone.left).not.toBe(node.left);
			expect(clone.right).not.toBe(node.right);
		});

		it('clones function with power and base', () => {
			const node = func('log', [variable('x')], { power: number('2'), base: number('10') });
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
			expect(clone.power).not.toBe(node.power);
			expect(clone.base).not.toBe(node.base);
		});

		it('clones delimiter with semantic', () => {
			const node = delimiter('parentheses', variable('x'), 'set');
			const clone = cloneNode(node);

			expect(clone).toEqual(node);
			expect(clone).not.toBe(node);
			expect(clone.content).not.toBe(node.content);
		});

		it('preserves metadata in clone', () => {
			const node = add(number('2', { color: 'red' }), number('3'), { style: 'bold' });
			const clone = cloneNode(node);

			expect(clone.metadata?.style).toBe('bold');
			expect((clone.left as ReturnType<typeof number>).metadata?.color).toBe('red');
		});
	});

	// =============================================================================
	// Tree Statistics
	// =============================================================================

	describe('countNodes', () => {
		it('counts single node', () => {
			const node = number('42');
			expect(countNodes(node)).toBe(1);
		});

		it('counts binary operation and children', () => {
			// 2 + 3
			const node = add(number('2'), number('3'));
			expect(countNodes(node)).toBe(3); // addition + 2 numbers
		});

		it('counts nested tree', () => {
			// (2 + 3) * 4
			const node = multiply(add(number('2'), number('3')), number('4'), 'dot');
			expect(countNodes(node)).toBe(5); // multiplication + addition + 3 numbers
		});

		it('counts function with multiple args', () => {
			// max(x, y)
			const node = func('max', [variable('x'), variable('y')]);
			expect(countNodes(node)).toBe(3); // function + 2 variables
		});

		it('counts complex tree', () => {
			// sin(x + 2) = 0
			const node = equals(sin(add(variable('x'), number('2'))), number('0'));
			expect(countNodes(node)).toBe(6); // relation + function + addition + 3 literals
		});
	});

	describe('getDepth', () => {
		it('returns 1 for leaf node', () => {
			const node = number('42');
			expect(getDepth(node)).toBe(1);
		});

		it('returns 2 for single operation', () => {
			// 2 + 3
			const node = add(number('2'), number('3'));
			expect(getDepth(node)).toBe(2);
		});

		it('returns correct depth for nested tree', () => {
			// (2 + 3) * 4
			const node = multiply(add(number('2'), number('3')), number('4'), 'dot');
			expect(getDepth(node)).toBe(3);
		});

		it('returns correct depth for unbalanced tree', () => {
			// 2 + (3 + (4 + 5))
			const inner = add(number('4'), number('5'));
			const middle = add(number('3'), inner);
			const outer = add(number('2'), middle);

			expect(getDepth(outer)).toBe(4);
		});

		it('handles function depth correctly', () => {
			// sin(x)
			const node = sin(variable('x'));
			expect(getDepth(node)).toBe(2);
		});

		it('handles nested functions', () => {
			// sin(sin(x))
			const inner = sin(variable('x'));
			const outer = sin(inner);
			expect(getDepth(outer)).toBe(3);
		});
	});

	// =============================================================================
	// Bracket Stripping
	// =============================================================================

	describe('stripUnnecessaryBrackets', () => {
		describe('simple elements', () => {
			it('strips parentheses around number: (5) -> 5', () => {
				const node = parentheses(number('5'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('number');
				expect((result as ReturnType<typeof number>).value).toBe('5');
			});

			it('strips parentheses around variable: (x) -> x', () => {
				const node = parentheses(variable('x'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('variable');
				expect((result as ReturnType<typeof variable>).name).toBe('x');
			});

			it('strips parentheses around greek letter: (α) -> α', () => {
				const node = parentheses(greek('alpha'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('greek');
			});

			it('strips parentheses around function: (sin(x)) -> sin(x)', () => {
				const node = parentheses(sin(variable('x')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('function');
				expect((result as ReturnType<typeof sin>).name).toBe('sin');
			});

			it('strips parentheses around fraction: (1/2) -> 1/2', () => {
				const node = parentheses(fraction(number('1'), number('2')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('division');
			});
		});

		describe('double parentheses', () => {
			it('strips double parentheses: ((x)) -> x', () => {
				const node = parentheses(parentheses(variable('x')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('variable');
				expect((result as ReturnType<typeof variable>).name).toBe('x');
			});

			it('strips triple parentheses: (((5))) -> 5', () => {
				const node = parentheses(parentheses(parentheses(number('5'))));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('number');
				expect((result as ReturnType<typeof number>).value).toBe('5');
			});
		});

		describe('inside fractions', () => {
			it('strips parentheses in numerator: (x)/2 -> x/2', () => {
				const node = fraction(parentheses(variable('x')), number('2'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('division');
				const div = result as ReturnType<typeof fraction>;
				expect(div.numerator.type).toBe('variable');
			});

			it('strips parentheses in denominator: x/(2) -> x/2', () => {
				const node = fraction(variable('x'), parentheses(number('2')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('division');
				const div = result as ReturnType<typeof fraction>;
				expect(div.denominator.type).toBe('number');
			});
		});

		describe('inside exponents', () => {
			it('strips parentheses in exponent: x^(2) -> x^2', () => {
				const node = superscript(variable('x'), parentheses(number('2')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('superscript');
				const sup = result as ReturnType<typeof superscript>;
				expect(sup.superscript.type).toBe('number');
			});
		});

		describe('negative terms', () => {
			it('preserves brackets around negative in middle: 2+(-5)', () => {
				// 2 + (-5)
				const node = add(number('2'), parentheses(opposite(number('5'))));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.right.type).toBe('delimiter'); // Brackets preserved
			});

			it('strips brackets around first negative by default: (-5)+3 -> -5+3', () => {
				// (-5) + 3
				const node = add(parentheses(opposite(number('5'))), number('3'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('opposite'); // Brackets stripped
			});

			it('preserves brackets around first negative with allowFirstNegative: (-5)+3', () => {
				// (-5) + 3 with option
				const node = add(parentheses(opposite(number('5'))), number('3'));
				const result = stripUnnecessaryBrackets(node, { allowFirstNegative: true });

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('delimiter'); // Brackets preserved
			});
		});

		describe('subtraction', () => {
			it('preserves brackets around negative in subtraction: 2-(-5)', () => {
				// 2 - (-5)
				const node = subtract(number('2'), parentheses(opposite(number('5'))));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('subtraction');
				const subtraction = result as ReturnType<typeof subtract>;
				expect(subtraction.right.type).toBe('delimiter'); // Brackets preserved
			});
		});

		describe('preserves necessary brackets', () => {
			it('preserves brackets around sum: (a+b)*c', () => {
				const node = multiply(parentheses(add(variable('a'), variable('b'))), variable('c'), 'dot');
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('multiplication');
				const mult = result as ReturnType<typeof multiply>;
				expect(mult.left.type).toBe('delimiter'); // Brackets preserved
			});

			it('preserves brackets for grouping in power base: (x+1)^2', () => {
				// Note: superscript content that is a parenthesized expression
				const node = superscript(parentheses(add(variable('x'), number('1'))), number('2'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('superscript');
				const sup = result as ReturnType<typeof superscript>;
				expect(sup.base.type).toBe('delimiter'); // Brackets preserved
			});
		});

		describe('recursive stripping', () => {
			it('strips nested unnecessary brackets: ((x))+(y)', () => {
				const node = add(parentheses(parentheses(variable('x'))), parentheses(variable('y')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('variable');
				expect(addition.right.type).toBe('variable');
			});

			it('strips brackets in function arguments: sin((x))', () => {
				const node = sin(parentheses(variable('x')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('function');
				const funcNode = result as ReturnType<typeof sin>;
				expect(funcNode.args[0].type).toBe('variable');
			});
		});

		describe('leaf nodes unchanged', () => {
			it('returns number unchanged', () => {
				const node = number('42');
				const result = stripUnnecessaryBrackets(node);
				expect(result).toEqual(node);
			});

			it('returns variable unchanged', () => {
				const node = variable('x');
				const result = stripUnnecessaryBrackets(node);
				expect(result).toEqual(node);
			});
		});

		describe('operator precedence', () => {
			// --- Higher precedence content in lower precedence parent: STRIP ---

			it('strips brackets around product in sum: (a*b)+c -> a*b+c', () => {
				const node = add(parentheses(multiply(variable('a'), variable('b'), 'dot')), variable('c'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('multiplication');
			});

			it('strips brackets around product in right of sum: a+(b*c) -> a+b*c', () => {
				const node = add(variable('a'), parentheses(multiply(variable('b'), variable('c'), 'dot')));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.right.type).toBe('multiplication');
			});

			it('strips brackets around product in subtraction: (a*b)-c -> a*b-c', () => {
				const node = subtract(
					parentheses(multiply(variable('a'), variable('b'), 'dot')),
					variable('c')
				);
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('subtraction');
				const sub = result as ReturnType<typeof subtract>;
				expect(sub.left.type).toBe('multiplication');
			});

			it('strips brackets around product in right of subtraction: a-(b*c) -> a-b*c', () => {
				const node = subtract(
					variable('a'),
					parentheses(multiply(variable('b'), variable('c'), 'dot'))
				);
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('subtraction');
				const sub = result as ReturnType<typeof subtract>;
				expect(sub.right.type).toBe('multiplication');
			});

			it('strips brackets around power in sum: (x^2)+1 -> x^2+1', () => {
				const node = add(parentheses(superscript(variable('x'), number('2'))), number('1'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('superscript');
			});

			it('strips brackets around power in right of sum: 1+(x^2) -> 1+x^2', () => {
				const node = add(number('1'), parentheses(superscript(variable('x'), number('2'))));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('addition');
				const addition = result as ReturnType<typeof add>;
				expect(addition.right.type).toBe('superscript');
			});

			it('strips brackets around power in product: (x^2)*y -> x^2*y', () => {
				const node = multiply(
					parentheses(superscript(variable('x'), number('2'))),
					variable('y'),
					'dot'
				);
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('multiplication');
				const mult = result as ReturnType<typeof multiply>;
				expect(mult.left.type).toBe('superscript');
			});

			it('strips brackets around power in right of product: y*(x^2) -> y*x^2', () => {
				const node = multiply(
					variable('y'),
					parentheses(superscript(variable('x'), number('2'))),
					'dot'
				);
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('multiplication');
				const mult = result as ReturnType<typeof multiply>;
				expect(mult.right.type).toBe('superscript');
			});

			it('strips brackets around power in subtraction: (x^2)-1 -> x^2-1', () => {
				const node = subtract(parentheses(superscript(variable('x'), number('2'))), number('1'));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('subtraction');
				const sub = result as ReturnType<typeof subtract>;
				expect(sub.left.type).toBe('superscript');
			});

			it('strips brackets around power in right of subtraction: 1-(x^2) -> 1-x^2', () => {
				const node = subtract(number('1'), parentheses(superscript(variable('x'), number('2'))));
				const result = stripUnnecessaryBrackets(node);

				expect(result.type).toBe('subtraction');
				const sub = result as ReturnType<typeof subtract>;
				expect(sub.right.type).toBe('superscript');
			});

			// --- Lower precedence content in higher precedence parent: PRESERVE ---

			it('preserves brackets around sum in product: (a+b)*c', () => {
				const node = multiply(parentheses(add(variable('a'), variable('b'))), variable('c'), 'dot');
				const result = stripUnnecessaryBrackets(node);

				const mult = result as ReturnType<typeof multiply>;
				expect(mult.left.type).toBe('delimiter');
			});

			it('preserves brackets around sum in right of product: c*(a+b)', () => {
				const node = multiply(variable('c'), parentheses(add(variable('a'), variable('b'))), 'dot');
				const result = stripUnnecessaryBrackets(node);

				const mult = result as ReturnType<typeof multiply>;
				expect(mult.right.type).toBe('delimiter');
			});

			it('preserves brackets around subtraction in product: (a-b)*c', () => {
				const node = multiply(
					parentheses(subtract(variable('a'), variable('b'))),
					variable('c'),
					'dot'
				);
				const result = stripUnnecessaryBrackets(node);

				const mult = result as ReturnType<typeof multiply>;
				expect(mult.left.type).toBe('delimiter');
			});

			it('preserves brackets around sum in right of subtraction: a-(b+c)', () => {
				const node = subtract(variable('a'), parentheses(add(variable('b'), variable('c'))));
				const result = stripUnnecessaryBrackets(node);

				const sub = result as ReturnType<typeof subtract>;
				expect(sub.right.type).toBe('delimiter');
			});

			it('preserves brackets around subtraction in right of subtraction: a-(b-c)', () => {
				const node = subtract(variable('a'), parentheses(subtract(variable('b'), variable('c'))));
				const result = stripUnnecessaryBrackets(node);

				const sub = result as ReturnType<typeof subtract>;
				expect(sub.right.type).toBe('delimiter');
			});

			it('preserves brackets around sum in power base: (x+1)^2', () => {
				const node = superscript(parentheses(add(variable('x'), number('1'))), number('2'));
				const result = stripUnnecessaryBrackets(node);

				const sup = result as ReturnType<typeof superscript>;
				expect(sup.base.type).toBe('delimiter');
			});

			it('preserves brackets around product in power base: (a*b)^2', () => {
				const node = superscript(
					parentheses(multiply(variable('a'), variable('b'), 'dot')),
					number('2')
				);
				const result = stripUnnecessaryBrackets(node);

				const sup = result as ReturnType<typeof superscript>;
				expect(sup.base.type).toBe('delimiter');
			});

			// --- Same precedence: depends on associativity and position ---

			it('preserves brackets around power in power base (right-associative): (x^2)^3', () => {
				const node = superscript(parentheses(superscript(variable('x'), number('2'))), number('3'));
				const result = stripUnnecessaryBrackets(node);

				const sup = result as ReturnType<typeof superscript>;
				expect(sup.base.type).toBe('delimiter');
			});

			it('strips same-precedence left operand of addition: (a+b)+c -> a+b+c', () => {
				const node = add(parentheses(add(variable('a'), variable('b'))), variable('c'));
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('addition');
			});

			it('strips same-precedence right operand of addition: a+(b+c) -> a+b+c', () => {
				const node = add(variable('a'), parentheses(add(variable('b'), variable('c'))));
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.right.type).toBe('addition');
			});

			it('strips subtraction in left of addition: (a-b)+c -> a-b+c', () => {
				const node = add(parentheses(subtract(variable('a'), variable('b'))), variable('c'));
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('subtraction');
			});

			it('strips subtraction in right of addition: a+(b-c) -> a+b-c', () => {
				const node = add(variable('a'), parentheses(subtract(variable('b'), variable('c'))));
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.right.type).toBe('subtraction');
			});

			it('strips addition in left of subtraction: (a+b)-c -> a+b-c', () => {
				const node = subtract(parentheses(add(variable('a'), variable('b'))), variable('c'));
				const result = stripUnnecessaryBrackets(node);

				const sub = result as ReturnType<typeof subtract>;
				expect(sub.left.type).toBe('addition');
			});

			it('strips same-precedence left of multiplication: (a*b)*c -> a*b*c', () => {
				const node = multiply(
					parentheses(multiply(variable('a'), variable('b'), 'dot')),
					variable('c'),
					'dot'
				);
				const result = stripUnnecessaryBrackets(node);

				const mult = result as ReturnType<typeof multiply>;
				expect(mult.left.type).toBe('multiplication');
			});

			it('strips same-precedence right of multiplication: a*(b*c) -> a*b*c', () => {
				const node = multiply(
					variable('a'),
					parentheses(multiply(variable('b'), variable('c'), 'dot')),
					'dot'
				);
				const result = stripUnnecessaryBrackets(node);

				const mult = result as ReturnType<typeof multiply>;
				expect(mult.right.type).toBe('multiplication');
			});

			// --- Composite / deeply nested cases ---

			it('strips both brackets in (a*b)+(c*d) -> a*b+c*d', () => {
				const node = add(
					parentheses(multiply(variable('a'), variable('b'), 'dot')),
					parentheses(multiply(variable('c'), variable('d'), 'dot'))
				);
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('multiplication');
				expect(addition.right.type).toBe('multiplication');
			});

			it('strips both brackets in (a*b)-(c*d) -> a*b-c*d', () => {
				const node = subtract(
					parentheses(multiply(variable('a'), variable('b'), 'dot')),
					parentheses(multiply(variable('c'), variable('d'), 'dot'))
				);
				const result = stripUnnecessaryBrackets(node);

				const sub = result as ReturnType<typeof subtract>;
				expect(sub.left.type).toBe('multiplication');
				expect(sub.right.type).toBe('multiplication');
			});

			it('strips double brackets with precedence: ((a*b))+c -> a*b+c', () => {
				const node = add(
					parentheses(parentheses(multiply(variable('a'), variable('b'), 'dot'))),
					variable('c')
				);
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('multiplication');
			});

			it('handles the exact user case: (2*100)+(4*10)+2', () => {
				// Parser would produce: add(add(paren(mult(2,100)), paren(mult(4,10))), 2)
				const term1 = parentheses(multiply(number('2'), number('100'), 'star'));
				const term2 = parentheses(multiply(number('4'), number('10'), 'star'));
				const node = add(add(term1, term2), number('2'));
				const result = stripUnnecessaryBrackets(node);

				// Verify no delimiters remain
				const checkNoDelimiters = (n: import('../types').MathNode): boolean => {
					if (n.type === 'delimiter') return false;
					const children =
						n.type === 'addition' || n.type === 'subtraction'
							? [n.left, n.right]
							: n.type === 'multiplication'
								? [n.left, n.right]
								: [];
					return children.every(checkNoDelimiters);
				};
				expect(checkNoDelimiters(result)).toBe(true);
			});

			it('mixed: strips product but preserves sum in ((a*b))+(c+d) -> a*b+(c+d) after double-paren strip', () => {
				// In (a*b)+(c+d), the (a*b) should strip, (c+d) should... also strip!
				// Because c+d has same precedence as parent +, and it's right operand of commutative+associative
				const node = add(
					parentheses(multiply(variable('a'), variable('b'), 'dot')),
					parentheses(add(variable('c'), variable('d')))
				);
				const result = stripUnnecessaryBrackets(node);

				const addition = result as ReturnType<typeof add>;
				expect(addition.left.type).toBe('multiplication');
				expect(addition.right.type).toBe('addition');
			});

			it('preserves necessary brackets in mixed: a*(b+c)^2', () => {
				const inner = superscript(parentheses(add(variable('b'), variable('c'))), number('2'));
				const node = multiply(variable('a'), inner, 'dot');
				const result = stripUnnecessaryBrackets(node);

				const mult = result as ReturnType<typeof multiply>;
				// The superscript should remain
				expect(mult.right.type).toBe('superscript');
				// And the brackets inside the superscript base should remain
				const sup = mult.right as ReturnType<typeof superscript>;
				expect(sup.base.type).toBe('delimiter');
			});
		});
	});
});
