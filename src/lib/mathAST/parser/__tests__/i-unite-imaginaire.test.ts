/**
 * La lettre `i` est l'unité imaginaire `complex(0, 1)` dans les quatre parseurs
 * (LaTeX et custom, pratt et rd), décision de David du 2026-10-11 — comme `e`
 * est la constante d'Euler (#1061). Deux exceptions, où `i` reste une variable :
 * - dans un indice (`u_i`, `x_{i+1}`, `x_{2i}`) : un rang, jamais l'imaginaire ;
 * - suivie d'un indice (`i_1`, `i_{n}`) : variable indicée, comme `e_1`.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../index';
import { parseCustom, parseCustomRD } from '../custom';
import {
	add,
	complex,
	euler,
	multiply,
	number,
	piConstant,
	subscript,
	superscript,
	variable
} from '../../factory';
import { nodesEqual } from '../../pattern/match';
import type { MathNode } from '../../types';

const PARSERS: ReadonlyArray<[string, (input: string) => MathNode]> = [
	['LaTeX pratt', (s) => parseLatex(s)],
	['LaTeX rd', (s) => parseLatex(s, { parser: 'rd' })],
	['custom pratt', (s) => parseCustom(s)],
	['custom rd', (s) => parseCustomRD(s)]
];

const I = (): MathNode => complex(number('0'), number('1'));

/** [LaTeX, custom, arbre attendu] */
const CASES: ReadonlyArray<[string, string, MathNode]> = [
	// `i` hors indice : l'unité imaginaire
	['i', 'i', I()],
	['3+4i', '3+4i', add(number('3'), multiply(number('4'), I(), 'implicit'))],
	['i^2', 'i^2', superscript(I(), number('2'))],
	['e^{i\\pi}', 'e^{i\\pi}', superscript(euler(), multiply(I(), piConstant(), 'implicit'))],
	['2i x', '2ix', multiply(multiply(number('2'), I(), 'implicit'), variable('x'), 'implicit')],
	// `i` dans un indice : une variable (un rang)
	['u_i', 'u_i', subscript(variable('u'), variable('i'))],
	['x_{i+1}', 'x_{i+1}', subscript(variable('x'), add(variable('i'), number('1')))],
	['x_{2i}', 'x_{2i}', subscript(variable('x'), multiply(number('2'), variable('i'), 'implicit'))],
	// `i` suivie d'un indice : variable indicée
	['i_1', 'i_1', subscript(variable('i'), number('1'))],
	['i_{n}', 'i_{n}', subscript(variable('i'), variable('n'))],
	['3i_2', '3i_2', multiply(number('3'), subscript(variable('i'), number('2')), 'implicit')]
];

describe.each(PARSERS)('%s', (name, parse) => {
	it.each(CASES)('%s', (latex, custom, expected) => {
		const input = name.startsWith('LaTeX') ? latex : custom;
		expect(nodesEqual(parse(input), expected)).toBe(true);
	});
});

describe('notations LaTeX de l’unité imaginaire : inchangées', () => {
	it.each([
		// `\imaginaryI` : le parseur rd ne le lit pas (écart antérieur, hors chantier)
		['\\imaginaryI', 'pratt'],
		['\\mathrm{i}', 'pratt'],
		['\\mathrm{i}', 'rd']
	] as const)('%s (%s) → complex(0, 1)', (latex, parser) => {
		expect(nodesEqual(parseLatex(latex, { parser }), I())).toBe(true);
	});

	it('2-3\\imaginaryI et 2-3i : le même arbre', () => {
		expect(nodesEqual(parseLatex('2-3\\imaginaryI'), parseLatex('2-3i'))).toBe(true);
	});
});
