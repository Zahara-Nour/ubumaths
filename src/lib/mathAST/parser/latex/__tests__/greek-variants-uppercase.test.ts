/**
 * Variantes grecques (`\varphi`…) et majuscules grecques usuelles (`\Delta`…).
 *
 * Ce sont des lettres ordinaires (variables) : `\Delta` n'est pas « le
 * discriminant », `\Sigma` / `\Pi` ne sont pas ∑ / ∏ (ces opérateurs sont
 * `\sum` / `\prod`, d'autres commandes). Les deux parseurs (Pratt et RD)
 * doivent rendre le même arbre, et l'aller-retour toLatex / toCustom doit
 * redonner la même lettre.
 */

import { describe, it, expect } from 'vitest';
import { parsePratt } from '../parser-pratt';
import { parseRD } from '../parser-rd';
import { parseCustom } from '../../custom';
import { toLatex } from '../../../latex-generator';
import { toCustom } from '../../../custom-generator';
import { MathAST } from '../../../factory';
import type { GreekLetter, MathNode } from '../../../types';

const PARSERS: ReadonlyArray<readonly [string, (latex: string) => MathNode]> = [
	['Pratt', parsePratt],
	['RD', parseRD]
];

const NEW_LETTERS: readonly GreekLetter[] = [
	'varphi',
	'vartheta',
	'varepsilon',
	'varpi',
	'varrho',
	'varsigma',
	'Delta',
	'Gamma',
	'Lambda',
	'Omega',
	'Phi',
	'Pi',
	'Sigma',
	'Theta',
	'Psi',
	'Xi',
	'Upsilon'
];

describe.each(PARSERS)('Lettres grecques — variantes et majuscules (%s)', (_name, parse) => {
	it.each(NEW_LETTERS)('\\%s est une lettre grecque', (letter) => {
		expect(parse(`\\${letter}`)).toEqual(MathAST.greek(letter));
	});

	it('\\Delta reste une lettre ordinaire dans une expression', () => {
		const node = parse('2\\Delta+1');
		expect(node.type).toBe('addition');
		expect(toLatex(node)).toBe('2 \\Delta + 1');
		expect(JSON.stringify(node)).toContain('"letter":"Delta"');
	});

	it('\\Pi majuscule n’est pas la constante π', () => {
		expect(parse('\\Pi')).toEqual(MathAST.greek('Pi'));
		expect(parse('\\pi')).toEqual(MathAST.piConstant());
	});

	it('variable de limite : \\varphi accepté', () => {
		const node = parse('\\lim_{\\varphi\\to0}\\varphi');
		expect(node).toEqual(MathAST.limit(MathAST.greek('varphi'), 'varphi', MathAST.number('0')));
	});
});

describe('Lettres grecques — aller-retour des générateurs', () => {
	it.each(NEW_LETTERS)('toLatex(\\%s) redonne \\%s', (letter) => {
		const node = MathAST.greek(letter);
		expect(toLatex(node)).toBe(`\\${letter}`);
		expect(parsePratt(toLatex(node))).toEqual(node);
	});

	it.each(NEW_LETTERS)('toCustom(\\%s) se relit (syntaxe custom)', (letter) => {
		const node = MathAST.greek(letter);
		const custom = toCustom(node);
		expect(custom).toBe(`\\${letter}`);
		expect(parseCustom(custom)).toEqual(node);
	});
});
