/**
 * E9 (chantier ecarts-verifs) : tapé en ligne, `(x^2-1)/(x+1)` a besoin de ses
 * parenthèses pour dire ce que le `/` sépare. Écrit en `\dfrac`, la barre
 * groupe déjà : les écrire affichait `\dfrac{\left( x^2 - 1 \right)}…` dans
 * les étapes de l'Atelier.
 *
 * L'ARBRE garde ses parenthèses : elles portent du sens ailleurs (réécriture
 * en ligne `(a+b)/2`, frontière d'une unité `1/(2[s])`). Seul le LaTeX d'un
 * `\dfrac` les tait.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../parser/custom/index';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';

const PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

function astOf(parse: (typeof PARSERS)[number][1], input: string) {
	const { ast, errors } = parse(input);
	if (ast === null || errors.length > 0) throw new Error(`illisible : ${input}`);
	return ast;
}

describe.each(PARSERS)('%s : un \\dfrac n’écrit pas les parenthèses du `/`', (_, parse) => {
	it.each([
		['(x^2-1)/(x+1)', '\\dfrac{x^2 - 1}{x + 1}'],
		['(3x^2-x)/(x^2+1)', '\\dfrac{3 x^2 - x}{x^2 + 1}'],
		['x/(x+1)', '\\dfrac{x}{x + 1}'],
		['(x+1)/2', '\\dfrac{x + 1}{2}'],
		['(1/2)/(3/4)', '\\dfrac{\\dfrac{1}{2}}{\\dfrac{3}{4}}'],
		// Le `/` lie serré : seul (x+1) est au numérateur, (x−1) reste devant
		['(x-1)(x+1)/(x+1)', '\\left( x - 1 \\right) \\dfrac{x + 1}{x + 1}']
	])('%s', (input, latex) => {
		expect(toLatex(astOf(parse, input))).toBe(latex);
	});

	it.each([
		// Les parenthèses qui ne sont pas TOUT l'opérande restent
		['(x+1)^2/2', '\\dfrac{\\left( x + 1 \\right)^2}{2}'],
		// Un crochet de calcul est un choix d'écriture
		['[x-1]/2', '\\dfrac{\\left[ x - 1 \\right]}{2}']
	])('%s garde ses parenthèses', (input, latex) => {
		expect(toLatex(astOf(parse, input))).toBe(latex);
	});

	it.each(['(a+b)/2', 'a/(b+c)', '(x^2-1)/(x+1)'])('%s se réécrit en ligne tel quel', (input) => {
		expect(toCustom(astOf(parse, input))).toBe(input);
	});
});
