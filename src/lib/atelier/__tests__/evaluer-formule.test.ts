/**
 * `.évaluer` dans l'atelier : une FORMULE, comme les autres commandes
 * (décisions de David, 2026-10-14, PR 1 de `.évaluer`).
 *
 * Mesuré avant : la ligne montrait le texte du terminal, en anglais,
 * « Result: 9 (exact) Mode: exact » ; `en x=1,5` répondait 9/4 ; et
 * `\frac{x+1}{x-1} en x=1` répondait « Je n'ai pas su lire cette expression ».
 *
 * Choix d'écriture : une fonction de l'atelier s'écrit `f(3) = 9` ; une
 * expression, sa valeur seule (l'écho de la ligne montre déjà l'expression ;
 * le remplacement viendra avec les étapes).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function session(setup: readonly string[] = []): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function commande(result: CalcResult) {
	if (result.kind !== 'commande') throw new Error(`attendu une commande, reçu ${result.kind}`);
	return result;
}

function line(input: string, setup: readonly string[] = []) {
	return commande(runInput(session(setup), input));
}

function latex(input: string, setup: readonly string[] = []): string {
	return (line(input, setup).latex ?? '').replace(/\s/g, '');
}

function refusal(input: string, setup: readonly string[] = []) {
	const result = runInput(session(setup), input);
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${result.kind}`);
	return result;
}

describe('la réponse est une formule', () => {
	it('une expression : sa valeur seule', () => {
		expect(latex('.évaluer 3x^2 en x=3')).toBe('27');
		expect(line('.évaluer 3x^2 en x=3').output).toBe('27');
	});

	it('une fonction de l’atelier : f(3) = 27', () => {
		expect(latex('.évaluer f en x=3', ['f(x) = 3x^2'])).toBe('f(3)=27');
		expect(line('.évaluer f en x=3', ['f(x) = 3x^2']).output).toBe('f(3) = 27');
	});

	it('f(x) tapé avec sa variable : f(−2) = 12', () => {
		expect(latex('.évaluer f(x) en x=-2', ['f(x) = 3x^2'])).toBe('f(-2)=12');
	});

	it('dans sa lettre : f(t) = 3t², .évaluer f en t=2 → f(2) = 12', () => {
		expect(latex('.évaluer f en t=2', ['f(t) = 3t^2'])).toBe('f(2)=12');
	});

	it('une expression qui contient f : la valeur seule', () => {
		expect(latex('.évaluer f(x)+1 en x=2', ['f(x) = 3x^2'])).toBe('13');
	});

	it('sans lettre : .évaluer 2+3 → 5', () => {
		expect(latex('.évaluer 2+3')).toBe('5');
	});

	it('une valeur exacte garde son écriture, et le bouton ≈ sa valeur approchée', () => {
		const result = line('.évaluer 2\\sqrt{x} en x=2');
		expect((result.latex ?? '').replace(/\s/g, '')).toBe('2\\sqrt{2}');
		expect(result.alternative?.latex).toBe('\\approx 2{,}8284');
	});

	it('une fraction : f(1/3) = 1/3', () => {
		expect(latex('.évaluer f en x=1/3', ['f(x) = 3x^2'])).toBe(
			'f\\left(\\dfrac{1}{3}\\right)=\\dfrac{1}{3}'
		);
	});

	it('plus aucun texte de terminal en anglais', () => {
		for (const input of ['.évaluer 3x^2 en x=3', '.évaluer 2+3', '.évaluer x>2 en x=3']) {
			const result = line(input);
			expect(result.output, input).not.toMatch(/Result|Mode|exact|true|false/);
		}
	});

	it('une comparaison : vrai / faux en français', () => {
		expect(line('.évaluer x>2 en x=3').output).toBe('vrai');
		expect(line('.évaluer x>2 en x=1').output).toBe('faux');
	});
});

describe('E5 : saisie décimale → réponse décimale, à la virgule', () => {
	it.each([
		['.évaluer 3x^2 en x=1,5', '6{,}75'],
		['.évaluer 3x^2 en x=1.5', '6{,}75'],
		['.évaluer 2x en x=1,5', '3'],
		['.évaluer x^2+0,5 en x=0,3', '0{,}59']
	])('%s → %s', (input, expected) => {
		expect(latex(input)).toBe(expected);
	});

	it('le texte aussi : 6,75', () => {
		expect(line('.évaluer 3x^2 en x=1,5').output).toBe('6,75');
	});

	it('une fonction en un décimal : f(1,5) = 6,75', () => {
		expect(latex('.évaluer f en x=1,5', ['f(x) = 3x^2'])).toBe('f(1{,}5)=6{,}75');
	});

	it('arrondi : f(0,5) ≈ 1,4142 pour f(x) = 2√x', () => {
		expect(latex('.évaluer f en x=0,5', ['f(x) = 2\\sqrt{x}'])).toBe('f(0{,}5)\\approx1{,}4142');
	});

	it('saisie exacte → réponse exacte : en x=3/2, 27/4', () => {
		expect(latex('.évaluer 3x^2 en x=3/2')).toBe('\\dfrac{27}{4}');
	});

	it('mode décimal : .évaluer 3x^2 en x=0.3 → 0,27', () => {
		const s = session(['.mode decimal']);
		const result = commande(runInput(s, '.évaluer 3x^2 en x=0.3'));
		expect((result.latex ?? '').replace(/\s/g, '')).toBe('0{,}27');
	});
});

describe('valeur interdite : un refus juste', () => {
	it('\\frac{x+1}{x-1} en x=1 : le dénominateur s’annule', () => {
		const result = refusal('.évaluer \\frac{x+1}{x-1} en x=1');
		expect(result.message).toBe("$x = 1$ est une valeur interdite : le dénominateur s'annule.");
		expect(result.formulas).toBe(true);
	});

	it('2√x en x=−1 : la racine', () => {
		expect(refusal('.évaluer 2\\sqrt{x} en x=-1').message).toBe(
			'$x = -1$ est une valeur interdite : le nombre sous la racine carrée est négatif.'
		);
	});

	it('3 ln x en x=0 : le logarithme', () => {
		expect(refusal('.évaluer 3\\ln x en x=0').message).toBe(
			'$x = 0$ est une valeur interdite : le logarithme ne s’applique qu’à un nombre strictement positif.'
		);
	});

	it('une fonction de l’atelier : f(x) = 3/(x−2), .évaluer f en x=2', () => {
		expect(refusal('.évaluer f en x=2', ['f(x) = 3/(x-2)']).message).toBe(
			"$x = 2$ est une valeur interdite : le dénominateur s'annule."
		);
	});

	it('dans sa lettre : f(t) = 3/(t−2), .évaluer f en t=2', () => {
		expect(refusal('.évaluer f en t=2', ['f(t) = 3/(t-2)']).message).toBe(
			"$t = 2$ est une valeur interdite : le dénominateur s'annule."
		);
	});

	it('une valeur décimale garde sa virgule : 1/(2x−3) en x=1,5', () => {
		expect(refusal('.évaluer 1/(2x-3) en x=1,5').message).toBe(
			"$x = 1{,}5$ est une valeur interdite : le dénominateur s'annule."
		);
	});

	it('la valeur citée s’écrit comme dans la ligne : x = π/2 en fraction', () => {
		expect(refusal('.évaluer 1/(x-\\pi/2) en x=\\pi/2').message).toBe(
			"$x = \\dfrac{\\pi}{2}$ est une valeur interdite : le dénominateur s'annule."
		);
	});
});

describe('revue : écriture de la valeur tapée', () => {
	it('une fraction négative : f(−1/2) s’écrit f(−½)', () => {
		expect(latex('.évaluer f en x=-1/2', ['f(x) = 3x^2'])).toBe(
			'f\\left(-\\dfrac{1}{2}\\right)=\\dfrac{3}{4}'
		);
	});

	it('le texte est homogène : f(sqrt(2)) = 1+sqrt(2)', () => {
		expect(line('.évaluer f en x=\\sqrt{2}', ['f(x) = x+1']).output).toBe('f(sqrt(2)) = 1+sqrt(2)');
	});
});
