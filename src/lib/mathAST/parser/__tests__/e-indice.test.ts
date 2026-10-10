/**
 * La lettre `e` est la constante d'Euler, SAUF suivie d'un indice : `e_1`,
 * `e_n` (vecteurs de base, termes d'une suite) restent des variables indicées.
 * Les quatre parseurs (LaTeX pratt et rd, custom pratt et rd) lisent pareil.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../index';
import { parseRD } from '../latex/parser-rd';
import { parseCustom, parseCustomRD } from '../custom';
import { euler, subscript, superscript, variable, number, multiply } from '../../factory';
import { nodesEqual } from '../../pattern/match';
import type { MathNode } from '../../types';

const PARSERS: ReadonlyArray<[string, (input: string) => MathNode]> = [
	['LaTeX pratt', (s) => parseLatex(s)],
	['LaTeX rd', (s) => parseRD(s)],
	['custom pratt', (s) => parseCustom(s)],
	['custom rd', (s) => parseCustomRD(s)]
];

const CASES: ReadonlyArray<[string, string, MathNode]> = [
	['e_1', 'e_1', subscript(variable('e'), number('1'))],
	['e_n', 'e_n', subscript(variable('e'), variable('n'))],
	['3e_2', '3e_2', multiply(number('3'), subscript(variable('e'), number('2')), 'implicit')],
	['e', 'e', euler()],
	['e^{x}', 'e^x', superscript(euler(), variable('x'))]
];

describe.each(PARSERS)('%s', (_name, parse) => {
	it.each(CASES)('%s', (latex, custom, expected) => {
		const input = _name.startsWith('LaTeX') ? latex : custom;
		expect(nodesEqual(parse(input), expected)).toBe(true);
	});
});
