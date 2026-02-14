import { describe, it, expect } from 'vitest';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { toCustom } from '$lib/mathAST/custom-generator';
import { substitute } from '../substitute';

describe('substitute - implicit multiplication fix', () => {
	it('2k with k=5 → 2*5 (not 25)', () => {
		const ast = parseCustom('2k');
		const sub = substitute(ast, { k: 5 });
		expect(toCustom(sub)).toBe('2*5');
	});

	it('3a+2b with a=4, b=5 → 3*4+2*5', () => {
		const ast = parseCustom('3a+2b');
		const sub = substitute(ast, { a: 4, b: 5 });
		expect(toCustom(sub)).toBe('3*4+2*5');
	});

	it('x^2+3x+1 with x=2 → 2^2+3*2+1', () => {
		const ast = parseCustom('x^2+3x+1');
		const sub = substitute(ast, { x: 2 });
		expect(toCustom(sub)).toBe('2^2+3*2+1');
	});

	it('ab with a=3, b=4 → 3*4', () => {
		const ast = parseCustom('ab');
		const sub = substitute(ast, { a: 3, b: 4 });
		expect(toCustom(sub)).toBe('3*4');
	});

	it('a^b*a^c with a=3, b=2, c=4 preserves structure', () => {
		const ast = parseCustom('a^b*a^c');
		const sub = substitute(ast, { a: 3, b: 2, c: 4 });
		expect(toCustom(sub)).toBe('3^2*3^4');
	});

	it('xk with k=5 → x*5 (not x5)', () => {
		const ast = parseCustom('xk');
		const sub = substitute(ast, { k: 5 });
		expect(toCustom(sub)).toBe('x*5');
	});

	it('2x with x staying as variable → still implicit', () => {
		const ast = parseCustom('2x');
		const sub = substitute(ast, { y: 5 }); // x not substituted
		expect(toCustom(sub)).toBe('2x');
	});

	it('a/b with a=6, b=3 → 6/3 (division unchanged)', () => {
		const ast = parseCustom('a/b');
		const sub = substitute(ast, { a: 6, b: 3 });
		expect(toCustom(sub)).toBe('6/3');
	});

	it('-a with a=5 → -5', () => {
		const ast = parseCustom('-a');
		const sub = substitute(ast, { a: 5 });
		expect(toCustom(sub)).toBe('-5');
	});

	it('2(a+1) with a=3 keeps implicit (right is parenthesized)', () => {
		const ast = parseCustom('2(a+1)');
		const sub = substitute(ast, { a: 3 });
		// Right side starts with addition node, not a number at leftmost
		// So implicit should be preserved (parenthesized expression)
		const result = toCustom(sub);
		expect(result).toBe('2(3+1)');
	});
});
