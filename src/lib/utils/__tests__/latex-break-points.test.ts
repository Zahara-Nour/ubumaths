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

	it('les morceaux recollés redonnent la formule (aux espaces près)', () => {
		const latex = '1+2+\\cdots+n=\\frac{n(n+1)}{2}';
		expect(splitLatexAtBreaks(latex).join('').replaceAll('\\;', '').replaceAll('\\:', '')).toBe(
			latex
		);
	});
});
