/**
 * Formes complexes exigées (`requiredForm`) sur une saisie avec la LETTRE i,
 * désormais lue `complex(0, 1)` comme `\imaginaryI` (décision de David du
 * 2026-10-11). Une forme trigonométrique n'est ni algébrique ni exponentielle.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { matchesComplexForm } from '$lib/questions/complex-forms';

const TRIGONOMETRIC = '2\\left(\\cos\\frac{\\pi}{3}+i\\sin\\frac{\\pi}{3}\\right)';

describe('forme algébrique', () => {
	it.each([
		'2-3i',
		'2-3\\imaginaryI',
		'3i',
		'i',
		'\\frac{1-i}{2}',
		'\\frac{1}{2}+\\frac{\\sqrt{3}}{2}i',
		'-4'
	])('%s : algébrique', (latex) => {
		expect(matchesComplexForm(parseLatex(latex), 'algebrique')).toBe(true);
	});

	it.each(['\\frac{1}{1+i}', '1+2+i', '2e^{i\\frac{\\pi}{3}}', TRIGONOMETRIC, 'x+i'])(
		'%s : pas algébrique',
		(latex) => {
			expect(matchesComplexForm(parseLatex(latex), 'algebrique')).toBe(false);
		}
	);
});

describe('forme exponentielle', () => {
	it.each([
		'e^{i\\pi}',
		'2e^{i\\frac{\\pi}{3}}',
		'e^{-i\\frac{\\pi}{4}}',
		'\\sqrt{2}e^{\\frac{i\\pi}{4}}',
		'3e^{\\frac{\\pi}{6}i}'
	])('%s : exponentielle', (latex) => {
		expect(matchesComplexForm(parseLatex(latex), 'exponentielle')).toBe(true);
	});

	it.each(['-2e^{i\\pi}', '2-3i', TRIGONOMETRIC, 'e^{1+i\\pi}', 'e^{ix}'])(
		'%s : pas exponentielle',
		(latex) => {
			expect(matchesComplexForm(parseLatex(latex), 'exponentielle')).toBe(false);
		}
	);
});
