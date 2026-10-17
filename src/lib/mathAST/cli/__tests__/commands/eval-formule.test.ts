/**
 * `.eval` rend sa valeur en LaTeX, et refuse en français une valeur interdite
 * (décisions de David, 2026-10-14, PR 1 de `.évaluer`).
 *
 * Mesuré avant : `.eval \frac{x+1}{x-1} en x=1` échouait en `PARSE_ERROR`
 * (l'atelier disait « Je n'ai pas su lire »), `.eval \sqrt{x} en x=-1` rendait
 * `sqrt(-1)` et `.eval \ln x en x=0` rendait `ln(0)`, comme des résultats.
 * Une saisie décimale (`en x=1.5`) donnait la fraction 9/4.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';

function run(input: string, mode: 'exact' | 'decimal' = 'exact') {
	const engine = new WebReplEngine();
	if (mode === 'decimal') engine.execute('.mode decimal');
	return engine.execute(input);
}

function latexOf(input: string, mode: 'exact' | 'decimal' = 'exact'): string {
	const result = run(input, mode);
	expect(result.success, input).toBe(true);
	return (result.latex ?? '').replace(/\s/g, '');
}

describe('.eval : la valeur en LaTeX', () => {
	it.each([
		['.eval 3x^2 en x=3', '27'],
		['.eval 2+3', '5'],
		['.eval 3x^2 en x=1/3', '\\dfrac{1}{3}'],
		['.eval 2\\sqrt{x} en x=2', '2\\sqrt{2}']
	])('%s → %s', (input, expected) => {
		expect(latexOf(input)).toBe(expected);
	});

	it('une valeur exacte non décimale porte sa valeur approchée (bouton ≈)', () => {
		expect(run('.eval 2\\sqrt{x} en x=2').approximateLatex).toBe('\\approx 2.8284');
	});

	it('un nombre déjà écrit n’a pas de valeur approchée', () => {
		expect(run('.eval 3x^2 en x=3').approximateLatex).toBeUndefined();
	});
});

describe('E5 : saisie décimale → réponse décimale', () => {
	it.each([
		['.eval 3x^2 en x=1.5', '6.75'],
		['.eval 2x en x=1.5', '3'],
		['.eval x^2+0.5 en x=0.3', '0.59'],
		['.eval 2\\sqrt{x} en x=0.5', '\\approx1.4142']
	])('%s → %s', (input, expected) => {
		expect(latexOf(input)).toBe(expected);
	});

	it('mode décimal : 4 décimales au plus, sans zéros inutiles', () => {
		expect(latexOf('.eval 3x^2 en x=0.3', 'decimal')).toBe('0.27');
		expect(latexOf('.eval 3x^2 en x=1/3', 'decimal')).toBe('\\approx0.3333');
	});
});

describe('valeur interdite : refus en français', () => {
	it.each([
		[
			'.eval \\frac{x+1}{x-1} en x=1',
			"$x = 1$ est une valeur interdite : le dénominateur s'annule."
		],
		['.eval (2x+1)/(3x-6) en x=2', "$x = 2$ est une valeur interdite : le dénominateur s'annule."],
		[
			'.eval 2\\sqrt{x} en x=-1',
			'$x = -1$ est une valeur interdite : le nombre sous la racine carrée est négatif.'
		],
		[
			'.eval 3\\ln(x) en x=0',
			'$x = 0$ est une valeur interdite : le logarithme ne s’applique qu’à un nombre strictement positif.'
		],
		[
			'.eval 3\\ln(x) en x=-2',
			'$x = -2$ est une valeur interdite : le logarithme ne s’applique qu’à un nombre strictement positif.'
		]
	])('%s', (input, message) => {
		const result = run(input);
		expect(result.success).toBe(false);
		expect(result.error?.code).toBe('VALUE_FORBIDDEN');
		expect(result.error?.message).toBe(message);
	});

	it('0 à une puissance négative : 3x^{-2} en x=0', () => {
		expect(run('.eval 3x^{-2} en x=0').error?.message).toBe(
			"$x = 0$ est une valeur interdite : 0 n'a pas de puissance négative."
		);
	});

	it('la cause la plus intérieure : 1/√x en x=−1 parle de la racine', () => {
		expect(run('.eval 1/\\sqrt{x} en x=-1').error?.message).toContain('racine carrée');
	});

	it('1/√x en x=0 : le dénominateur s’annule', () => {
		expect(run('.eval 1/\\sqrt{x} en x=0').error?.message).toContain('dénominateur');
	});

	it('sans lettre : le calcul n’a pas de valeur', () => {
		const result = run('.eval 3/(2-2)');
		expect(result.error?.code).toBe('VALUE_FORBIDDEN');
		expect(result.error?.message).toBe("Ce calcul n'a pas de valeur : le dénominateur s'annule.");
	});

	it('pas de faux refus près de zéro (exact, pas de tolérance) : 1/x en x=0.00000000001', () => {
		expect(latexOf('.eval 1/x en x=0.00000000001')).toBe('100000000000');
	});

	it('une racine d’indice impair accepte un négatif : ∛x en x=−8', () => {
		expect(latexOf('.eval 2\\sqrt[3]{x} en x=-8')).toBe('-4');
	});
});

describe('revue : les faux acceptés deviennent des refus', () => {
	const FRACTIONAL = 'une puissance d’exposant non entier ne s’applique qu’à un nombre positif';
	it.each([
		['.eval 3x^{1/2} en x=-4', `$x = -4$ est une valeur interdite : ${FRACTIONAL}.`],
		['.eval 3x^{0.5} en x=-4', `$x = -4$ est une valeur interdite : ${FRACTIONAL}.`],
		['.eval 3x^{1/3} en x=-8', `$x = -8$ est une valeur interdite : ${FRACTIONAL}.`],
		[
			'.eval 3\\tan x en x=\\pi/2',
			'$x = \\dfrac{\\pi}{2}$ est une valeur interdite : la tangente n’est pas définie là où le cosinus s’annule.'
		],
		[
			'.eval 3\\tan(x) en x=3\\pi/2',
			'$x = \\dfrac{3 \\pi}{2}$ est une valeur interdite : la tangente n’est pas définie là où le cosinus s’annule.'
		],
		[
			'.eval 3\\arcsin(x) en x=2',
			'$x = 2$ est une valeur interdite : l’arc sinus ne s’applique qu’à un nombre compris entre −1 et 1.'
		],
		[
			'.eval 3\\arccos(x) en x=-3/2',
			'$x = -\\dfrac{3}{2}$ est une valeur interdite : l’arc cosinus ne s’applique qu’à un nombre compris entre −1 et 1.'
		],
		[
			'.eval 2\\sqrt[4]{x} en x=-16',
			'$x = -16$ est une valeur interdite : le nombre sous une racine d’indice pair est négatif.'
		],
		[
			'.eval 1/(x-2) en x=4/2',
			"$x = \\dfrac{4}{2}$ est une valeur interdite : le dénominateur s'annule."
		]
	])('%s', (input, message) => {
		const result = run(input);
		expect(result.error?.code, input).toBe('VALUE_FORBIDDEN');
		expect(result.error?.message).toBe(message);
	});

	it.each([
		['.eval 3x^{1/2} en x=4', '6'],
		['.eval 3\\tan(x) en x=\\pi/4', '3'],
		['.eval 3\\arcsin(x) en x=1', '\\dfrac{3\\pi}{2}'],
		['.eval 2\\sqrt[3]{x} en x=-8', '-4'],
		['.eval 3x^{2} en x=-2', '12']
	])('restent acceptés : %s', (input, expected) => {
		expect(latexOf(input)).toBe(expected.replace(/\s/g, ''));
	});
});

describe('le terminal garde son texte', () => {
	it('« Result: » reste dans la sortie du CLI', () => {
		expect(run('.eval 3x^2 en x=3').output).toContain('Result:');
	});
});
