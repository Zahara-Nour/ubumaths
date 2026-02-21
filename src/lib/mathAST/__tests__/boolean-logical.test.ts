/**
 * Tests for BooleanNode, LogicalNode, LogicalNotNode
 * Covers: factory, guards, generators, parsers
 */

import { describe, it, expect } from 'vitest';
import { boolean, logicalAnd, logicalOr, logicalNot, logical, number } from '../factory';
import { isBoolean, isLogical, isLogicalNot } from '../guards';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { parsePrattSafe as parseLatex } from '../parser/latex';
import { parseCustomSafe as parseCustom } from '../parser/custom';

// =============================================================================
// Factory
// =============================================================================

describe('Factory: boolean/logical', () => {
	it('boolean(true) creates BooleanNode with value true', () => {
		const node = boolean(true);
		expect(node.type).toBe('boolean');
		expect(node.value).toBe(true);
	});

	it('boolean(false) creates BooleanNode with value false', () => {
		const node = boolean(false);
		expect(node.type).toBe('boolean');
		expect(node.value).toBe(false);
	});

	it('logicalAnd creates LogicalNode with operator "and"', () => {
		const a = boolean(true);
		const b = boolean(false);
		const node = logicalAnd(a, b);
		expect(node.type).toBe('logical');
		expect(node.operator).toBe('and');
		expect(node.left).toBe(a);
		expect(node.right).toBe(b);
	});

	it('logicalOr creates LogicalNode with operator "or"', () => {
		const a = boolean(true);
		const b = boolean(false);
		const node = logicalOr(a, b);
		expect(node.type).toBe('logical');
		expect(node.operator).toBe('or');
	});

	it('logicalNot creates LogicalNotNode', () => {
		const a = boolean(true);
		const node = logicalNot(a);
		expect(node.type).toBe('logical-not');
		expect(node.operand).toBe(a);
	});

	it('logical() with operator parameter', () => {
		const a = number('1');
		const b = number('2');
		const andNode = logical('and', a, b);
		expect(andNode.operator).toBe('and');
		const orNode = logical('or', a, b);
		expect(orNode.operator).toBe('or');
	});
});

// =============================================================================
// Guards
// =============================================================================

describe('Guards: boolean/logical', () => {
	it('isBoolean identifies BooleanNode', () => {
		expect(isBoolean(boolean(true))).toBe(true);
		expect(isBoolean(boolean(false))).toBe(true);
		expect(isBoolean(number('1'))).toBe(false);
	});

	it('isLogical identifies LogicalNode', () => {
		expect(isLogical(logicalAnd(boolean(true), boolean(false)))).toBe(true);
		expect(isLogical(logicalOr(boolean(true), boolean(false)))).toBe(true);
		expect(isLogical(number('1'))).toBe(false);
	});

	it('isLogicalNot identifies LogicalNotNode', () => {
		expect(isLogicalNot(logicalNot(boolean(true)))).toBe(true);
		expect(isLogicalNot(number('1'))).toBe(false);
	});
});

// =============================================================================
// LaTeX Generator
// =============================================================================

describe('LaTeX generation: boolean/logical', () => {
	it('BooleanNode(true) generates \\text{vrai}', () => {
		expect(toLatex(boolean(true))).toBe('\\text{vrai}');
	});

	it('BooleanNode(false) generates \\text{faux}', () => {
		expect(toLatex(boolean(false))).toBe('\\text{faux}');
	});

	it('LogicalNode and generates \\land', () => {
		const node = logicalAnd(boolean(true), boolean(false));
		expect(toLatex(node)).toBe('\\text{vrai} \\land \\text{faux}');
	});

	it('LogicalNode or generates \\lor', () => {
		const node = logicalOr(boolean(true), boolean(false));
		expect(toLatex(node)).toBe('\\text{vrai} \\lor \\text{faux}');
	});

	it('LogicalNotNode generates \\lnot', () => {
		const node = logicalNot(boolean(true));
		expect(toLatex(node)).toBe('\\lnot \\text{vrai}');
	});
});

// =============================================================================
// Custom Generator
// =============================================================================

describe('Custom generation: boolean/logical', () => {
	it('BooleanNode(true) generates true', () => {
		expect(toCustom(boolean(true))).toBe('true');
	});

	it('BooleanNode(false) generates false', () => {
		expect(toCustom(boolean(false))).toBe('false');
	});

	it('LogicalNode and generates &&', () => {
		const node = logicalAnd(boolean(true), boolean(false));
		expect(toCustom(node)).toBe('true && false');
	});

	it('LogicalNode or generates ||', () => {
		const node = logicalOr(boolean(true), boolean(false));
		expect(toCustom(node)).toBe('true || false');
	});

	it('LogicalNotNode generates !', () => {
		const node = logicalNot(boolean(true));
		expect(toCustom(node)).toBe('!true');
	});
});

// =============================================================================
// LaTeX Parsing
// =============================================================================

describe('LaTeX parsing: boolean/logical', () => {
	it('\\text{vrai} parses to BooleanNode(true)', () => {
		const result = parseLatex('\\text{vrai}');
		expect(result.ast?.type).toBe('boolean');
		if (result.ast?.type === 'boolean') {
			expect(result.ast.value).toBe(true);
		}
	});

	it('\\text{faux} parses to BooleanNode(false)', () => {
		const result = parseLatex('\\text{faux}');
		expect(result.ast?.type).toBe('boolean');
		if (result.ast?.type === 'boolean') {
			expect(result.ast.value).toBe(false);
		}
	});

	it('\\top parses to BooleanNode(true)', () => {
		const result = parseLatex('\\top');
		expect(result.ast?.type).toBe('boolean');
		if (result.ast?.type === 'boolean') {
			expect(result.ast.value).toBe(true);
		}
	});

	it('\\bot parses to BooleanNode(false)', () => {
		const result = parseLatex('\\bot');
		expect(result.ast?.type).toBe('boolean');
		if (result.ast?.type === 'boolean') {
			expect(result.ast.value).toBe(false);
		}
	});

	it('a \\land b parses to LogicalNode(and)', () => {
		const result = parseLatex('\\text{vrai} \\land \\text{faux}');
		expect(result.ast?.type).toBe('logical');
		if (result.ast?.type === 'logical') {
			expect(result.ast.operator).toBe('and');
		}
	});

	it('a \\lor b parses to LogicalNode(or)', () => {
		const result = parseLatex('\\text{vrai} \\lor \\text{faux}');
		expect(result.ast?.type).toBe('logical');
		if (result.ast?.type === 'logical') {
			expect(result.ast.operator).toBe('or');
		}
	});

	it('\\lnot a parses to LogicalNotNode', () => {
		const result = parseLatex('\\lnot \\text{vrai}');
		expect(result.ast?.type).toBe('logical-not');
	});
});

// =============================================================================
// Custom Parsing
// =============================================================================

describe('Custom parsing: boolean/logical', () => {
	it('true parses to BooleanNode(true)', () => {
		const result = parseCustom('true');
		expect(result.ast?.type).toBe('boolean');
		if (result.ast?.type === 'boolean') {
			expect(result.ast.value).toBe(true);
		}
	});

	it('false parses to BooleanNode(false)', () => {
		const result = parseCustom('false');
		expect(result.ast?.type).toBe('boolean');
		if (result.ast?.type === 'boolean') {
			expect(result.ast.value).toBe(false);
		}
	});

	it('a && b parses to LogicalNode(and)', () => {
		const result = parseCustom('true && false');
		expect(result.ast?.type).toBe('logical');
		if (result.ast?.type === 'logical') {
			expect(result.ast.operator).toBe('and');
		}
	});

	it('a || b parses to LogicalNode(or)', () => {
		const result = parseCustom('true || false');
		expect(result.ast?.type).toBe('logical');
		if (result.ast?.type === 'logical') {
			expect(result.ast.operator).toBe('or');
		}
	});

	it('!a parses to LogicalNotNode', () => {
		const result = parseCustom('!true');
		expect(result.ast?.type).toBe('logical-not');
	});

	it('precedence: || < && < relations < arithmetic', () => {
		// "3 < 5 && 2 = 2 || false" should parse as "((3 < 5) && (2 = 2)) || false"
		const result = parseCustom('3 < 5 && 2 = 2 || false');
		expect(result.ast?.type).toBe('logical');
		if (result.ast?.type === 'logical') {
			expect(result.ast.operator).toBe('or');
			// left should be && node
			expect(result.ast.left.type).toBe('logical');
		}
	});
});
