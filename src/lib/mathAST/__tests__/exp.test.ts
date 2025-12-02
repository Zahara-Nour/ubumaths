/**
 * Tests for Exp fluent wrapper class
 */

import { describe, it, expect } from 'vitest';
import { Exp, isVariable, isNumber, number, variable, MathAST } from '../index';

// =============================================================================
// Output Getters
// =============================================================================

describe('Exp - Output Getters', () => {
	it('returns underlying node via .node', () => {
		const exp = Exp.number('42');
		expect(exp.node).toEqual({ type: 'number', value: '42' });
	});

	it('returns node type via .type', () => {
		expect(Exp.number('5').type).toBe('number');
		expect(Exp.variable('x').type).toBe('variable');
		expect(Exp.add(Exp.number('1'), Exp.number('2')).type).toBe('addition');
	});

	it('generates LaTeX via .latex', () => {
		expect(Exp.number('42').latex).toBe('42');
		expect(Exp.variable('x').latex).toBe('x');
		expect(Exp.add(Exp.number('3'), Exp.number('4')).latex).toBe('3 + 4');
	});

	it('generates LaTeX with options via .toLatex()', () => {
		const exp = Exp.variable('x').withMetadata({ color: 'red' });
		expect(exp.toLatex({ renderMetadata: true })).toContain('textcolor');
	});

	it('generates tree via .tree', () => {
		const exp = Exp.number('42');
		expect(exp.tree).toContain('Number');
		expect(exp.tree).toContain('42');
	});

	it('generates tree with options via .toTree()', () => {
		const exp = Exp.number('42');
		const result = exp.toTree({ colors: false });
		expect(result).toBe('Number: 42');
	});
});

// =============================================================================
// Static Factories - Wrapping
// =============================================================================

describe('Exp - Static Factories (Wrapping)', () => {
	it('wraps existing MathNode via Exp.from()', () => {
		const node = number('5');
		const exp = Exp.from(node);
		expect(exp.node).toBe(node);
	});

	it('parses LaTeX via Exp.parse()', () => {
		const exp = Exp.parse('x^2 + 1');
		expect(exp.type).toBe('addition');
		expect(exp.latex).toBe('x^2 + 1');
	});
});

// =============================================================================
// Static Factories - Literals
// =============================================================================

describe('Exp - Static Factories (Literals)', () => {
	it('creates number', () => {
		const exp = Exp.number('3.14');
		expect(exp.type).toBe('number');
		expect(exp.latex).toBe('3.14');
	});

	it('creates variable', () => {
		const exp = Exp.variable('velocity');
		expect(exp.type).toBe('variable');
		expect(exp.latex).toBe('\\mathit{velocity}');
	});

	it('creates Greek letter', () => {
		const exp = Exp.greek('alpha');
		expect(exp.type).toBe('greek');
		expect(exp.latex).toBe('\\alpha');
	});

	it('creates symbol', () => {
		const exp = Exp.symbol('infinity');
		expect(exp.type).toBe('symbol');
		expect(exp.latex).toBe('\\infty');
	});

	it('supports metadata on literals', () => {
		const exp = Exp.number('42', { color: 'red' });
		expect(exp.node.metadata).toEqual({ color: 'red' });
	});

	it('passes function options correctly', () => {
		const exp = Exp.sin(Exp.variable('x'), { metadata: { color: 'red' } });
		expect(exp.node.metadata?.color).toBe('red');
	});

	it('passes function options on instance method', () => {
		const exp = Exp.variable('x').sin({ metadata: { color: 'blue' } });
		expect(exp.node.metadata?.color).toBe('blue');
	});
});

// =============================================================================
// Static Factories - Binary Operations
// =============================================================================

describe('Exp - Static Factories (Binary Operations)', () => {
	it('creates addition', () => {
		const exp = Exp.add(Exp.number('3'), Exp.number('4'));
		expect(exp.type).toBe('addition');
		expect(exp.latex).toBe('3 + 4');
	});

	it('creates subtraction', () => {
		const exp = Exp.subtract(Exp.number('5'), Exp.number('2'));
		expect(exp.type).toBe('subtraction');
		expect(exp.latex).toBe('5 - 2');
	});

	it('creates multiplication with default implicit style', () => {
		const exp = Exp.multiply(Exp.number('2'), Exp.variable('x'));
		expect(exp.type).toBe('multiplication');
		expect(exp.latex).toBe('2 x');
	});

	it('creates multiplication with explicit style', () => {
		const exp = Exp.multiply(Exp.number('2'), Exp.number('3'), 'cross');
		expect(exp.latex).toBe('2 \\times 3');
	});

	it('creates division with default fraction style', () => {
		const exp = Exp.divide(Exp.variable('a'), Exp.variable('b'));
		expect(exp.type).toBe('division');
		expect(exp.latex).toBe('\\frac{a}{b}');
	});

	it('creates division with inline style', () => {
		const exp = Exp.divide(Exp.variable('a'), Exp.variable('b'), 'inline');
		expect(exp.latex).toBe('a / b');
	});

	it('creates fraction', () => {
		const exp = Exp.fraction(Exp.number('1'), Exp.number('2'));
		expect(exp.latex).toBe('\\frac{1}{2}');
	});

	it('accepts MathNode directly', () => {
		const exp = Exp.add(number('1'), Exp.number('2'));
		expect(exp.latex).toBe('1 + 2');
	});
});

// =============================================================================
// Static Factories - Unary Operations
// =============================================================================

describe('Exp - Static Factories (Unary Operations)', () => {
	it('creates opposite', () => {
		const exp = Exp.opposite(Exp.variable('x'));
		expect(exp.type).toBe('opposite');
		expect(exp.latex).toBe('-x');
	});

	it('creates positive', () => {
		const exp = Exp.positive(Exp.variable('x'));
		expect(exp.type).toBe('positive');
		expect(exp.latex).toBe('+x');
	});
});

// =============================================================================
// Static Factories - Structural
// =============================================================================

describe('Exp - Static Factories (Structural)', () => {
	it('creates power', () => {
		const exp = Exp.power(Exp.variable('x'), Exp.number('2'));
		expect(exp.type).toBe('superscript');
		expect(exp.latex).toBe('x^2');
	});

	it('creates subscript', () => {
		const exp = Exp.subscript(Exp.variable('x'), Exp.number('1'));
		expect(exp.type).toBe('subscript');
		expect(exp.latex).toBe('x_1');
	});

	it('creates parentheses', () => {
		const exp = Exp.parentheses(Exp.add(Exp.variable('a'), Exp.variable('b')));
		expect(exp.type).toBe('delimiter');
		expect(exp.latex).toBe('\\left( a + b \\right)');
	});
});

// =============================================================================
// Static Factories - Functions
// =============================================================================

describe('Exp - Static Factories (Functions)', () => {
	it('creates generic function', () => {
		const exp = Exp.func('f', [Exp.variable('x'), Exp.variable('y')]);
		expect(exp.type).toBe('function');
		expect(exp.latex).toBe('f\\left( x, y \\right)');
	});

	it('creates sin', () => {
		const exp = Exp.sin(Exp.variable('x'));
		expect(exp.latex).toBe('\\sin\\left( x \\right)');
	});

	it('creates cos', () => {
		const exp = Exp.cos(Exp.variable('x'));
		expect(exp.latex).toBe('\\cos\\left( x \\right)');
	});

	it('creates tan', () => {
		const exp = Exp.tan(Exp.variable('x'));
		expect(exp.latex).toBe('\\tan\\left( x \\right)');
	});

	it('creates ln', () => {
		const exp = Exp.ln(Exp.variable('x'));
		expect(exp.latex).toBe('\\ln\\left( x \\right)');
	});

	it('creates log without base', () => {
		const exp = Exp.log(Exp.variable('x'));
		expect(exp.latex).toBe('\\log\\left( x \\right)');
	});

	it('creates log with base', () => {
		const exp = Exp.log(Exp.number('8'), Exp.number('2'));
		expect(exp.latex).toBe('\\log_2\\left( 8 \\right)');
	});

	it('creates exp', () => {
		const exp = Exp.exp(Exp.variable('x'));
		expect(exp.latex).toBe('\\exp\\left( x \\right)');
	});

	it('creates sqrt', () => {
		const exp = Exp.sqrt(Exp.variable('x'));
		expect(exp.latex).toBe('sqrt\\left( x \\right)');
	});

	it('creates abs', () => {
		const exp = Exp.abs(Exp.variable('x'));
		expect(exp.latex).toBe('abs\\left( x \\right)');
	});
});

// =============================================================================
// Static Factories - Relations
// =============================================================================

describe('Exp - Static Factories (Relations)', () => {
	it('creates equals', () => {
		const exp = Exp.equals(Exp.variable('x'), Exp.number('5'));
		expect(exp.type).toBe('relation');
		expect(exp.latex).toBe('x = 5');
	});

	it('creates lessThan', () => {
		const exp = Exp.lessThan(Exp.variable('x'), Exp.number('10'));
		expect(exp.latex).toBe('x < 10');
	});

	it('creates greaterThan', () => {
		const exp = Exp.greaterThan(Exp.variable('x'), Exp.number('0'));
		expect(exp.latex).toBe('x > 0');
	});

	it('creates lessThanOrEqual', () => {
		const exp = Exp.lessThanOrEqual(Exp.variable('x'), Exp.number('5'));
		expect(exp.latex).toBe('x \\leq 5');
	});

	it('creates greaterThanOrEqual', () => {
		const exp = Exp.greaterThanOrEqual(Exp.variable('x'), Exp.number('0'));
		expect(exp.latex).toBe('x \\geq 0');
	});

	it('creates notEquals', () => {
		const exp = Exp.notEquals(Exp.variable('x'), Exp.number('0'));
		expect(exp.latex).toBe('x \\neq 0');
	});

	it('creates approx', () => {
		const exp = Exp.approx(Exp.variable('x'), Exp.number('3.14'));
		expect(exp.latex).toBe('x \\approx 3.14');
	});

	it('creates congruent', () => {
		const exp = Exp.congruent(Exp.variable('a'), Exp.variable('b'));
		expect(exp.latex).toBe('a \\equiv b');
	});
});

// =============================================================================
// Instance Methods - Binary Operations (Fluent)
// =============================================================================

describe('Exp - Instance Methods (Binary Operations)', () => {
	it('chains add', () => {
		const exp = Exp.number('3').add(Exp.number('4'));
		expect(exp.latex).toBe('3 + 4');
	});

	it('chains subtract', () => {
		const exp = Exp.number('5').subtract(Exp.number('2'));
		expect(exp.latex).toBe('5 - 2');
	});

	it('chains multiply with default style', () => {
		const exp = Exp.number('2').multiply(Exp.variable('x'));
		expect(exp.latex).toBe('2 x');
	});

	it('chains multiply with explicit style', () => {
		const exp = Exp.number('2').multiply(Exp.number('3'), 'dot');
		expect(exp.latex).toBe('2 \\cdot 3');
	});

	it('chains divide', () => {
		const exp = Exp.number('6').divide(Exp.number('2'));
		expect(exp.latex).toBe('\\frac{6}{2}');
	});

	it('chains fraction', () => {
		const exp = Exp.variable('a').fraction(Exp.variable('b'));
		expect(exp.latex).toBe('\\frac{a}{b}');
	});

	it('supports complex chaining', () => {
		// (3 + 4) * 2
		const exp = Exp.number('3').add(Exp.number('4')).multiply(Exp.number('2'));
		expect(exp.type).toBe('multiplication');
		// Note: chaining is left-to-right, not mathematical precedence
	});
});

// =============================================================================
// Instance Methods - Unary Operations
// =============================================================================

describe('Exp - Instance Methods (Unary Operations)', () => {
	it('chains negate', () => {
		const exp = Exp.variable('x').negate();
		expect(exp.latex).toBe('-x');
	});

	it('chains positive', () => {
		const exp = Exp.variable('x').positive();
		expect(exp.latex).toBe('+x');
	});
});

// =============================================================================
// Instance Methods - Structural
// =============================================================================

describe('Exp - Instance Methods (Structural)', () => {
	it('chains power', () => {
		const exp = Exp.variable('x').power(Exp.number('2'));
		expect(exp.latex).toBe('x^2');
	});

	it('chains subscript', () => {
		const exp = Exp.variable('x').subscript(Exp.number('1'));
		expect(exp.latex).toBe('x_1');
	});

	it('chains parentheses', () => {
		const exp = Exp.variable('x').add(Exp.variable('y')).parentheses();
		expect(exp.latex).toBe('\\left( x + y \\right)');
	});
});

// =============================================================================
// Instance Methods - Functions (apply to this)
// =============================================================================

describe('Exp - Instance Methods (Functions)', () => {
	it('applies sin to this', () => {
		const exp = Exp.variable('x').sin();
		expect(exp.latex).toBe('\\sin\\left( x \\right)');
	});

	it('applies cos to this', () => {
		const exp = Exp.variable('x').cos();
		expect(exp.latex).toBe('\\cos\\left( x \\right)');
	});

	it('applies tan to this', () => {
		const exp = Exp.variable('x').tan();
		expect(exp.latex).toBe('\\tan\\left( x \\right)');
	});

	it('applies ln to this', () => {
		const exp = Exp.variable('x').ln();
		expect(exp.latex).toBe('\\ln\\left( x \\right)');
	});

	it('applies log to this', () => {
		const exp = Exp.number('8').log(Exp.number('2'));
		expect(exp.latex).toBe('\\log_2\\left( 8 \\right)');
	});

	it('applies exp to this', () => {
		const exp = Exp.variable('x').exp();
		expect(exp.latex).toBe('\\exp\\left( x \\right)');
	});

	it('applies sqrt to this', () => {
		const exp = Exp.variable('x').sqrt();
		expect(exp.latex).toBe('sqrt\\left( x \\right)');
	});

	it('applies abs to this', () => {
		const exp = Exp.variable('x').abs();
		expect(exp.latex).toBe('abs\\left( x \\right)');
	});

	it('Exp.sin(x) equals x.sin()', () => {
		const x = Exp.variable('x');
		expect(Exp.sin(x).latex).toBe(x.sin().latex);
	});
});

// =============================================================================
// Instance Methods - Relations (Fluent)
// =============================================================================

describe('Exp - Instance Methods (Relations)', () => {
	it('chains equals', () => {
		const exp = Exp.variable('x').equals(Exp.number('5'));
		expect(exp.latex).toBe('x = 5');
	});

	it('chains lessThan', () => {
		const exp = Exp.variable('x').lessThan(Exp.number('10'));
		expect(exp.latex).toBe('x < 10');
	});

	it('chains greaterThan', () => {
		const exp = Exp.variable('x').greaterThan(Exp.number('0'));
		expect(exp.latex).toBe('x > 0');
	});

	it('chains lessThanOrEqual', () => {
		const exp = Exp.variable('x').lessThanOrEqual(Exp.number('5'));
		expect(exp.latex).toBe('x \\leq 5');
	});

	it('chains greaterThanOrEqual', () => {
		const exp = Exp.variable('x').greaterThanOrEqual(Exp.number('0'));
		expect(exp.latex).toBe('x \\geq 0');
	});

	it('chains notEquals', () => {
		const exp = Exp.variable('x').notEquals(Exp.number('0'));
		expect(exp.latex).toBe('x \\neq 0');
	});
});

// =============================================================================
// Instance Methods - Transformations
// =============================================================================

describe('Exp - Instance Methods (Transformations)', () => {
	it('adds metadata via withMetadata', () => {
		const exp = Exp.variable('x').withMetadata({ color: 'red' });
		expect(exp.node.metadata).toEqual({ color: 'red' });
	});

	it('merges metadata via withMetadata', () => {
		const exp = Exp.variable('x', { color: 'red' }).withMetadata({ style: 'bold' });
		expect(exp.node.metadata).toEqual({ color: 'red', style: 'bold' });
	});

	it('transforms via map (bottom-up)', () => {
		const expr = Exp.add(Exp.number('1'), Exp.number('2'));
		const doubled = expr.map((node) => {
			if (isNumber(node)) {
				return { ...node, value: String(Number(node.value) * 2) };
			}
			return node;
		});
		expect(doubled.latex).toBe('2 + 4');
	});

	it('transforms via mapTopDown (top-down)', () => {
		const expr = Exp.variable('x');
		const transformed = expr.mapTopDown((node) => {
			if (isVariable(node) && node.name === 'x') {
				return variable('y');
			}
			return node;
		});
		expect(transformed.latex).toBe('y');
	});

	it('finds nodes via find', () => {
		const expr = Exp.add(Exp.variable('x'), Exp.number('1')).multiply(Exp.variable('y'));
		const vars = expr.find(isVariable);
		expect(vars.length).toBe(2);
	});

	it('finds first node via findFirst', () => {
		const expr = Exp.add(Exp.variable('x'), Exp.number('1'));
		const firstVar = expr.findFirst(isVariable);
		expect(firstVar).toBeDefined();
		expect(isVariable(firstVar!)).toBe(true);
	});

	it('replaces nodes via replace', () => {
		const expr = Exp.add(Exp.variable('x'), Exp.variable('x'));
		const replaced = expr.replace((node) => isVariable(node) && node.name === 'x', variable('y'));
		expect(replaced.latex).toBe('y + y');
	});

	it('gets children via children()', () => {
		const expr = Exp.add(Exp.number('1'), Exp.number('2'));
		const children = expr.children();
		expect(children.length).toBe(2);
		expect(isNumber(children[0])).toBe(true);
	});

	it('gets empty children for leaf nodes', () => {
		const leaf = Exp.number('42');
		expect(leaf.children()).toEqual([]);
	});

	it('counts nodes via count()', () => {
		const expr = Exp.add(Exp.number('1'), Exp.number('2'));
		expect(expr.count()).toBe(3); // add + 2 numbers
	});

	it('gets depth via depth()', () => {
		const expr = Exp.number('1');
		expect(expr.depth()).toBe(1);

		const nested = Exp.add(Exp.number('1'), Exp.number('2'));
		expect(nested.depth()).toBe(2);
	});

	it('clones via clone()', () => {
		const expr = Exp.variable('x');
		const cloned = expr.clone();
		expect(cloned.node).toEqual(expr.node);
		expect(cloned.node).not.toBe(expr.node); // Different object
	});
});

// =============================================================================
// Complex Usage Scenarios
// =============================================================================

describe('Exp - Complex Usage Scenarios', () => {
	it('builds x^2 + 3x - 5 = 0', () => {
		const expr = Exp.variable('x')
			.power(Exp.number('2'))
			.add(Exp.number('3').multiply(Exp.variable('x')))
			.subtract(Exp.number('5'))
			.equals(Exp.number('0'));

		expect(expr.type).toBe('relation');
		expect(expr.latex).toContain('x^2');
		expect(expr.latex).toContain('=');
		expect(expr.latex).toContain('0');
	});

	it('builds sin^2(x) + cos^2(x) = 1', () => {
		const x = Exp.variable('x');
		const expr = x
			.sin()
			.power(Exp.number('2'))
			.add(x.cos().power(Exp.number('2')))
			.equals(Exp.number('1'));

		expect(expr.type).toBe('relation');
	});

	it('builds fraction (a+b)/(c+d)', () => {
		const expr = Exp.divide(
			Exp.variable('a').add(Exp.variable('b')).parentheses(),
			Exp.variable('c').add(Exp.variable('d')).parentheses()
		);

		expect(expr.latex).toContain('\\frac');
	});

	it('parses and transforms LaTeX', () => {
		const parsed = Exp.parse('x + 1');
		const doubled = parsed.map((node) => {
			if (isNumber(node)) {
				return { ...node, value: String(Number(node.value) * 2) };
			}
			return node;
		});
		expect(doubled.latex).toBe('x + 2');
	});

	it('interoperates with MathAST namespace', () => {
		const node = MathAST.add(MathAST.number('1'), MathAST.number('2'));
		const exp = Exp.from(node);
		expect(exp.latex).toBe('1 + 2');

		// Mix Exp and MathNode in factory
		const mixed = Exp.add(Exp.number('1'), MathAST.number('2'));
		expect(mixed.latex).toBe('1 + 2');
	});
});
