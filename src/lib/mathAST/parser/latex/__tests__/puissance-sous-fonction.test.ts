/**
 * Fonction écrite sans parenthèses : la puissance qui suit porte sur l'argument (écart V39).
 *
 * `\ln 5^2` se lit ln(5²), comme dans les manuels, et non (ln 5)². Décision de David du
 * 2026-11-03 pour `ln`, étendue le 2026-11-27 à toutes les fonctions nommées (`\sin x^2` =
 * sin(x²), `\cos 60^\circ` = cos(60°)). Avec des parenthèses ou des accolades écrites,
 * rien ne change : `\ln(5)^2` reste (ln 5)².
 *
 * Les deux parseurs doivent lire pareil : chaque cas passe par les deux.
 */

import { describe, it, expect } from 'vitest';
import { parsePratt } from '../parser-pratt';
import { parseRD } from '../parser-rd';
import { toLatex } from '../../../latex-generator';

const PARSERS = [
	['Pratt', parsePratt],
	['RD', parseRD]
] as const;

/** L'écriture explicite (parenthèses partout) de ce que le parseur a lu. */
const UNDER_THE_FUNCTION: [source: string, read: string][] = [
	['\\ln 5^2', '\\ln\\left( 5^2 \\right)'],
	['\\ln5^2', '\\ln\\left( 5^2 \\right)'],
	['\\ln x^2', '\\ln\\left( x^2 \\right)'],
	['\\ln q^n', '\\ln\\left( q^n \\right)'],
	['\\ln e^{2x}', '\\ln\\left( \\exponentialE^{2 x} \\right)'],
	['\\log 10^{-3}', '\\log\\left( 10^{-3} \\right)'],
	['\\log_2 8^2', '\\log_2\\left( 8^2 \\right)'],
	['\\sin x^2', '\\sin\\left( x^2 \\right)'],
	['\\cos x^2', '\\cos\\left( x^2 \\right)'],
	['\\tan \\alpha^2', '\\tan\\left( \\alpha^2 \\right)'],
	['\\exp x^2', '\\exp\\left( x^2 \\right)'],
	['\\ln \\pi^2', '\\ln\\left( \\pi^2 \\right)'],
	['\\sin^2 x^3', '\\sin^2\\left( x^3 \\right)'],
	['2\\ln 3^2', '2 \\ln\\left( 3^2 \\right)'],
	['\\ln 5^2+1', '\\ln\\left( 5^2 \\right) + 1'],
	['\\ln 5^2x', '\\ln\\left( 5^2 \\right) x'],
	['\\cos 60^\\circ', '\\cos\\left( 60^\\circ \\right)']
];

/** Parenthèses, accolades ou racine écrites : la lecture d'avant, inchangée. */
const UNCHANGED: [source: string, read: string][] = [
	['\\ln(5)^2', '\\left( \\ln\\left( 5 \\right) \\right)^2'],
	['\\ln\\left(5\\right)^2', '\\left( \\ln\\left( 5 \\right) \\right)^2'],
	['\\ln{5}^2', '\\left( \\ln\\left( 5 \\right) \\right)^2'],
	['\\sin(x)^2', '\\sin\\left( x \\right)^2'],
	['\\sin^2 x', '\\sin^2\\left( x \\right)'],
	['\\ln 2x^2', '\\ln\\left( 2 \\right) x^2'],
	['\\ln 5', '\\ln\\left( 5 \\right)'],
	['\\sqrt 5^2', '\\sqrt{5}^2'],
	['x^2', 'x^2']
];

describe.each(PARSERS)('V39, parseur %s : puissance sous la fonction', (_name, parse) => {
	it.each(UNDER_THE_FUNCTION)('%s se lit %s', (source, read) => {
		expect(toLatex(parse(source))).toBe(read);
	});

	it.each(UNCHANGED)('%s reste %s', (source, read) => {
		expect(toLatex(parse(source))).toBe(read);
	});

	it('l’argument de \\ln 5^2 est une puissance, le ln est en tête', () => {
		const node = parse('\\ln 5^2');

		expect(node.type).toBe('function');
		if (node.type !== 'function') return;
		expect(node.name).toBe('ln');
		expect(node.args[0]?.type).toBe('superscript');
	});

	it('deux exposants de suite restent refusés', () => {
		expect(() => parse('\\ln 5^2^3')).toThrow(/Two exponents in a row/);
	});
});
