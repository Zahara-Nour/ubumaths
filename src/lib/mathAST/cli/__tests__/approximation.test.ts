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
import { approximateValueLatex } from '../approximation';
import { WebReplEngine } from '../web/web-repl-engine';

const approx = (latex: string) => approximateValueLatex(parseLatex(latex));

describe('la valeur approchée d’un nombre exact', () => {
	it('4 décimales, précédées de ≈', () => {
		expect(approx('\\frac{\\sqrt{2}}{2}')).toBe('\\approx 0.7071');
		expect(approx('\\frac{2}{7}')).toBe('\\approx 0.2857');
		expect(approx('\\ln(3)')).toBe('\\approx 1.0986');
		expect(approx('1000\\sqrt{2}')).toBe('\\approx 1414.2136');
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
		expect(approx('e^{-10}')).toBe('\\approx 0.0000454');
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
