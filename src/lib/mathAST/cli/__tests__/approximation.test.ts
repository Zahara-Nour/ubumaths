/**
 * La valeur approchée d'un résultat exact, pour le bouton ≈ de Calcul.
 *
 * Décisions de David (2026-10-11, `docs/wip/atelier-cas-phase0.md`, PR 2) :
 * 4 décimales ; une valeur dont l'écriture décimale tient dans l'arrondi
 * s'écrit avec « = » sans zéros inutiles ; rien pour un résultat déjà entier
 * ou décimal.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluate } from '$lib/mathAST/eval/evaluate';
import {
	approximateDigitsOf,
	approximateLatexOf,
	approximateSolutionsLatex,
	isWrittenNumber
} from '../approximation';
import { WebReplEngine } from '../web/web-repl-engine';
import type { MathNode } from '$lib/mathAST/types';

// Même composition que la Web REPL (`web-repl-engine.ts`) : rien pour un nombre déjà écrit
function approximationOf(node: MathNode): string | null {
	if (isWrittenNumber(node)) return null;
	const approximation = approximateDigitsOf(node);
	return approximation === null ? null : approximateLatexOf(approximation);
}

const approx = (latex: string) => approximationOf(parseLatex(latex));

describe('la valeur approchée d’un nombre exact', () => {
	it('4 décimales, précédées de ≈', () => {
		expect(approx('\\frac{\\sqrt{2}}{2}')).toBe('\\approx 0.7071');
		expect(approx('\\frac{2}{7}')).toBe('\\approx 0.2857');
		expect(approx('\\ln(3)')).toBe('\\approx 1.0986');
		expect(approx('1000\\sqrt{2}')).toBe('\\approx 1414.2136');
	});

	// Décision de David : 4 décimales — les zéros ne tombent que si c'est exact (revue)
	it('une valeur approchée garde ses 4 décimales, zéros compris', () => {
		expect(approx('\\sqrt{26}')).toBe('\\approx 5.0990');
		expect(approx('\\frac{19999}{20000}')).toBe('\\approx 1.0000');
	});

	// Revue : un seuil d'exactitude relatif donnait « = 485165195.4098 »
	it('un grand irrationnel n’est jamais « = »', () => {
		expect(approx('e^{20}')).toBe('\\approx 485165195.4098');
		expect(approx('\\frac{1000000}{3}')).toBe('\\approx 333333.3333');
	});

	// Décision a de David (2026-10-12) : au-delà du milliard, la notation scientifique
	// (était : rien, « les 4 décimales n'y sont plus sûres »)
	it('au-delà du milliard : la notation scientifique', () => {
		expect(approx('10^{10}\\sqrt{2}')).toBe('\\approx 1.4142 \\times 10^{10}');
	});

	it('garde le signe', () => {
		expect(approx('-\\sqrt{2}')).toBe('\\approx -1.4142');
	});

	it('une écriture décimale qui tient dans l’arrondi : « = », sans zéros inutiles', () => {
		expect(approx('\\frac{1}{4}')).toBe('= 0.25');
		expect(approx('\\frac{1}{8}')).toBe('= 0.125');
		expect(approx('-\\frac{3}{2}')).toBe('= -1.5');
	});

	it('une écriture décimale plus longue que 4 décimales est arrondie', () => {
		expect(approx('\\frac{1}{32}')).toBe('\\approx 0.0313');
	});

	// Arrondi à 4 décimales, e^{-10} vaudrait « ≈ 0 » : faux pour un élève
	it('un nombre trop petit pour 4 décimales garde 4 chiffres significatifs', () => {
		expect(approx('e^{-10}')).toBe('\\approx 0.00004540');
	});

	it('rien pour un résultat déjà entier ou décimal', () => {
		expect(approx('3')).toBeNull();
		expect(approx('-3')).toBeNull();
		expect(approx('2.5')).toBeNull();
	});

	it('rien pour une expression littérale', () => {
		expect(approx('2x+1')).toBeNull();
		expect(approx('\\frac{x}{3}')).toBeNull();
	});
});

describe('la valeur approchée des solutions de .solve', () => {
	const solved = (equation: string) => new WebReplEngine().execute(`.solve ${equation}`);

	it('un ensemble de solutions irrationnelles', () => {
		expect(solved('x^2=2').approximateLatex).toBe(
			'S \\approx \\left\\{ -1.4142 \\,;\\, 1.4142 \\right\\}'
		);
	});

	it('une solution unique', () => {
		expect(solved('x^3=2').approximateLatex).toBe('x \\approx 1.2599');
		expect(solved('2x=1').approximateLatex).toBe('x = 0.5');
	});

	it('4 décimales, zéros compris, pour le nombre d’or', () => {
		expect(solved('x^2-3x+1=0').approximateLatex).toBe(
			'S \\approx \\left\\{ 0.3820 \\,;\\, 2.6180 \\right\\}'
		);
	});

	// Revue : `dans [a ; b]`, là où la valeur approchée sert le plus, n'en avait pas
	it('dans un intervalle aussi', () => {
		expect(solved('x^2-3=0 dans [-5 ; 5]').approximateLatex).toBe(
			'S \\approx \\left\\{ -1.7321 \\,;\\, 1.7321 \\right\\}'
		);
	});

	it('rien quand les solutions sont déjà des entiers', () => {
		expect(solved('x^2=4').success).toBe(true);
		expect(solved('x^2=4').approximateLatex).toBeUndefined();
	});

	it('rien pour une famille de solutions ni pour une inéquation', () => {
		expect(solved('sin(x)=1/2').approximateLatex).toBeUndefined();
		expect(solved('x^2<2').approximateLatex).toBeUndefined();
	});
});

describe('la valeur exacte d’un calcul fait en mode décimal', () => {
	it('le moteur la donne avec la valeur décimale', () => {
		const engine = new WebReplEngine();
		engine.execute('.mode decimal');

		const result = engine.execute('sqrt(2)/2');

		expect(result.exactLatex).toContain('\\sqrt{2}');
	});

	it('et donne la valeur approchée en mode exact', () => {
		const result = new WebReplEngine().execute('sqrt(2)/2');

		expect(result.approximateLatex).toBe('\\approx 0.7071');
		expect(result.exactLatex).toBeUndefined();
	});
});

// Mesuré avant (2026-10-11) : rien — la fraction exacte a des termes de plus de
// 10³⁰⁸ (3001 chiffres pour la suite qui tend vers e), leur conversion débordait
describe('le bouton ≈ sur une fraction aux termes géants', () => {
	it.each([
		['\\left(1+\\frac{1}{1000}\\right)^{1000}', '\\approx 2.7169'],
		['1000\\left(1+\\frac{0.03}{12}\\right)^{360}', '\\approx 2456.8422'],
		['1.01^{365}', '\\approx 37.7834'],
		['0.99^{365}', '\\approx 0.0255']
	])('%s → %s', (latex, expected) => {
		expect(approx(latex)).toBe(expected);
	});
});

// Décisions a, b, c, d de David (2026-10-12, `docs/wip/mode-decimal-progress.md`) : hors de
// [10⁻⁶ ; 10⁹[, la notation scientifique du collège, 4 décimales sur la mantisse, calculée sur
// la fraction exacte. Valeurs attendues tirées des fractions exactes (Python `Fraction`).
describe('hors de l’échelle : la notation scientifique', () => {
	it.each([
		['\\pi^{20}', '\\approx 8.7700 \\times 10^{9}'],
		['-\\pi^{20}', '\\approx -8.7700 \\times 10^{9}'],
		['e^{30}', '\\approx 1.0686 \\times 10^{13}'],
		['e^{1000}', '\\approx 1.9701 \\times 10^{434}'],
		['\\frac{1}{7000000}', '\\approx 1.4286 \\times 10^{-7}'],
		['2^{64}', '\\approx 1.8447 \\times 10^{19}'],
		['0.3^{1000}', '\\approx 1.3221 \\times 10^{-523}']
	])('%s → %s', (latex, expected) => {
		expect(approx(latex)).toBe(expected);
	});

	// Au-delà de l'exposant 1000 : sur le résultat exact, ou sur l'expression tapée dans le
	// budget de taille (lot « lenteur des grandes fractions » : une écriture gardée trouve
	// ainsi sa valeur approchée ; avant ce lot, l'expression tapée ne donnait rien)
	it('au-delà de l’exposant 1000 : sur le résultat exact ou dans le budget de taille', () => {
		const ofExact = (latex: string) => {
			const result = evaluate(parseLatex(latex), { mode: 'exact' });
			return result.status === 'value' ? approximationOf(result.node) : null;
		};

		expect(ofExact('0.5^{2000}')).toBe('\\approx 8.7098 \\times 10^{-603}');
		expect(ofExact('1.5^{2000}')).toBe('\\approx 1.5224 \\times 10^{352}');
		expect(approx('1.5^{2000}')).toBe('\\approx 1.5224 \\times 10^{352}');
	});

	it('exacte : « = », zéros de la mantisse retirés', () => {
		expect(approx('\\frac{1}{8000000}')).toBe('= 1.25 \\times 10^{-7}');
		expect(approx('3 \\times 10^{20}')).toBe('= 3 \\times 10^{20}');
	});

	it('la retenue garde la mantisse sous 10 : 9999950000,5 → 1,0000 × 10¹⁰', () => {
		expect(approx('\\frac{19999900001}{2}')).toBe('\\approx 1.0000 \\times 10^{10}');
	});

	// Décision b : un entier exact s'écrit en entier jusqu'à 15 chiffres
	it('un entier exact jusqu’à 15 chiffres : en entier', () => {
		expect(approx('2^{40}')).toBe('= 1099511627776');
		expect(approx('10^{14}+1')).toBe('= 100000000000001');
		expect(approx('10^{15}+1')).toBe('\\approx 1.0000 \\times 10^{15}');
	});

	it('les solutions aussi', () => {
		expect(approximateSolutionsLatex('x', [parseLatex('\\frac{1}{7000000}')], false)).toBe(
			'x \\approx 1.4286 \\times 10^{-7}'
		);
	});
});

// Revue : l'exactitude se décidait à 10 décimales, l'écriture à 4 chiffres significatifs
describe('entre 10⁻⁶ et 10⁻⁴ : 4 chiffres significatifs', () => {
	it('arrondie : ≈, zéros gardés', () => {
		expect(approx('\\frac{123456}{10^{10}}')).toBe('\\approx 0.00001235');
		expect(approx('e^{-10}')).toBe('\\approx 0.00004540');
	});

	it('exacte : =, zéros retirés', () => {
		expect(approx('\\frac{1}{20000}')).toBe('= 0.00005');
		expect(approx('\\frac{1234}{10^{8}}')).toBe('= 0.00001234');
	});

	it('la retenue garde 4 chiffres : 9,99996 × 10⁻⁵ → 0,0001000', () => {
		expect(approx('\\frac{999996}{10^{10}}')).toBe('\\approx 0.0001000');
	});
});
