import { describe, expect, it } from 'vitest';
import { splitLatexAtBreaks } from '../latex-break-points';

describe('splitLatexAtBreaks — où une formule peut passer à la ligne (E52)', () => {
	it('après chaque = et + de premier niveau, l’opérateur au bout du morceau, suivi de son espace', () => {
		expect(splitLatexAtBreaks('a+b=c')).toEqual(['a+\\:', 'b=\\;', 'c']);
	});

	it('dans une parenthèse simple aussi : « (MI + IA)·(MI + IB) » se coupe après un +', () => {
		const latex =
			'\\overrightarrow{MA}\\cdot\\overrightarrow{MB}=(\\overrightarrow{MI}+\\overrightarrow{IA})\\cdot(\\overrightarrow{MI}+\\overrightarrow{IB})';
		const pieces = splitLatexAtBreaks(latex);
		expect(pieces).toEqual([
			'\\overrightarrow{MA}\\cdot\\overrightarrow{MB}=\\;',
			'(\\overrightarrow{MI}+\\:',
			'\\overrightarrow{IA})\\cdot(\\overrightarrow{MI}+\\:',
			'\\overrightarrow{IB})'
		]);
	});

	it('jamais dans une accolade, un \\left … \\right ni un environnement', () => {
		expect(splitLatexAtBreaks('\\frac{a+b}{2}')).toEqual(['\\frac{a+b}{2}']);
		expect(splitLatexAtBreaks('\\left(a+b\\right)^2')).toEqual(['\\left(a+b\\right)^2']);
		expect(splitLatexAtBreaks('\\begin{pmatrix}a+b\\end{pmatrix}')).toEqual([
			'\\begin{pmatrix}a+b\\end{pmatrix}'
		]);
	});

	it('ni un signe en tête, ni un exposant, ni un opérateur en fin de formule', () => {
		expect(splitLatexAtBreaks('+3')).toEqual(['+3']);
		expect(splitLatexAtBreaks('x^+')).toEqual(['x^+']);
		expect(splitLatexAtBreaks('a=')).toEqual(['a=']);
		expect(splitLatexAtBreaks('x')).toEqual(['x']);
	});

	it('ni dans l’argument optionnel d’une commande, ni dans une accolade échappée (revue de G)', () => {
		expect(splitLatexAtBreaks('\\sqrt[n+1]{x}=2')).toEqual(['\\sqrt[n+1]{x}=\\;', '2']);
		expect(splitLatexAtBreaks('x\\in\\{a=b\\}')).toEqual(['x\\in\\{a=b\\}']);
		expect(splitLatexAtBreaks('x\\in\\lbrace a+b\\rbrace')).toEqual(['x\\in\\lbrace a+b\\rbrace']);
	});

	it('un crochet d’intervalle ne bloque pas la suite : ]0 ; +∞[ puis =', () => {
		expect(splitLatexAtBreaks('I=]0;+\\infty[')).toEqual(['I=\\;', ']0;+\\infty[']);
	});

	it('un signe après (, une relation ou un opérateur n’est pas un endroit où couper', () => {
		expect(splitLatexAtBreaks('(+3)=3')).toEqual(['(+3)=\\;', '3']);
		expect(splitLatexAtBreaks('a\\cdot+b')).toEqual(['a\\cdot+b']);
		expect(splitLatexAtBreaks('a=+b')).toEqual(['a=\\;', '+b']);
	});

	it('les morceaux recollés redonnent la formule (aux espaces près)', () => {
		const latex = '1+2+\\cdots+n=\\frac{n(n+1)}{2}';
		expect(splitLatexAtBreaks(latex).join('').replaceAll('\\;', '').replaceAll('\\:', '')).toBe(
			latex
		);
	});
});
