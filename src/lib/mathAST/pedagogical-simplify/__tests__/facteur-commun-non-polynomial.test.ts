/**
 * `factoriser` sort un facteur commun NON polynomial : eˣ, (x+1), sin x…
 *
 * ## Le manque, mesuré sur `main` à `20103a554` (lycée)
 *
 * | entrée | `factoriser` rendait | attendu |
 * | --- | --- | --- |
 * | `xe^x - e^x` | inchangée | `(x−1)eˣ` |
 * | `x²eˣ − 2xeˣ + 2eˣ` | inchangée | `(x²−2x+2)eˣ` |
 * | `(x+1)² − (x+1)` | inchangée | `x(x+1)` |
 *
 * La mise en facteur symbolique (`a·c + b·c`) ne connaît que l'addition de
 * deux termes, et la mise en facteur du contenu ne voyait que des monômes :
 * dès qu'un terme portait un eˣ, la décomposition échouait. C'est ce qui
 * empêche d'écrire une primitive de x²eˣ sous la forme `(x²−2x+2)eˣ`.
 *
 * Le facteur non polynomial s'écrit APRÈS la parenthèse, comme dans les
 * manuels : `(x−1)eˣ`, et non `eˣ(x−1)`. Décision de David, 2026-10-11.
 */

import { describe, it, expect } from 'vitest';
import { toLatex } from '../../index';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { PedagogicalSimplifyRenderer } from '../renderer';

function factoriser(source: string) {
	const input = parseLatex(source);
	const { result, steps } = generatePedagogicalSimplifySteps(input, {
		intent: 'factoriser',
		schoolLevel: 'lycee'
	});
	return { input, result, steps, latex: toLatex(result) };
}

describe('le facteur commun non polynomial sort', () => {
	it.each([
		['xe^x-e^x', '\\left( x - 1 \\right) \\exponentialE^x'],
		['x^2e^x-2xe^x+2e^x', '\\left( x^2 - 2 x + 2 \\right) \\exponentialE^x'],
		// coefficient ≠ 1 : le nombre devant, l'exponentielle derrière
		['3xe^{2x}+6e^{2x}', '3 \\left( x + 2 \\right) \\exponentialE^{2 x}'],
		['x^2\\sin x+3x\\sin x', 'x \\left( x + 3 \\right) \\sin\\left( x \\right)']
	])('%s → %s', (source, attendu) => {
		const { input, result, latex } = factoriser(source);

		expect(latex).toBe(attendu);
		expect(areEquivalent(result, input)).toBe(true);
	});
});

describe('des coefficients fractionnaires', () => {
	it('le facteur e²ˣ sort, les fractions restent dans la parenthèse', () => {
		// Forme relevée, non décidée : (x/2 − 1/4)e²ˣ. Sortir 1/4 — (2x − 1)e²ˣ/4 —
		// serait un choix de David ; le PGCD numérique ne porte que sur des entiers.
		const { input, result, latex } = factoriser('\\frac{1}{2}xe^{2x}-\\frac{1}{4}e^{2x}');

		expect(latex).toBe('\\left( \\dfrac{x}{2} - \\dfrac{1}{4} \\right) \\exponentialE^{2 x}');
		expect(areEquivalent(result, input)).toBe(true);
	});
});

describe('une puissance de même base', () => {
	it('(x+1)² − (x+1) → x(x+1)', () => {
		const { input, result, latex } = factoriser('(x+1)^2-(x+1)');

		// Polynôme en x : l'ordre est celui du noyau (ADR 0024, décision Q3).
		expect(latex).toBe('x \\left( x + 1 \\right)');
		expect(areEquivalent(result, input)).toBe(true);
	});

	it('(x+1)² + 3(x+1) → (x+1)(x+4)', () => {
		const { input, result, latex } = factoriser('(x+1)^2+3(x+1)');

		expect(latex).toBe('\\left( x + 1 \\right) \\left( x + 4 \\right)');
		expect(areEquivalent(result, input)).toBe(true);
	});
});

describe('rien à sortir : inchangé', () => {
	it.each([
		['xe^x+\\sin x', 'x \\exponentialE^x + \\sin\\left( x \\right)'],
		['3xe^x', '3 x \\exponentialE^x'],
		// eˣ et e²ˣ : la puissance d'une exponentielle n'est pas vue comme un
		// facteur commun (e²ˣ = (eˣ)² n'est pas tenté).
		['e^{x}+e^{2x}', '\\exponentialE^x + \\exponentialE^{2 x}'],
		['e^{2x}-e^x', '\\exponentialE^{2 x} - \\exponentialE^x']
	])('%s reste %s', (source, attendu) => {
		expect(factoriser(source).latex).toBe(attendu);
	});
});

describe('non-régression : les facteurs polynomiaux', () => {
	it.each([
		['3x^2+6x', '3 x \\left( x + 2 \\right)'],
		['x(x+1)+2(x+1)', '\\left( x + 1 \\right) \\left( x + 2 \\right)'],
		['xe^x+e^x', '\\left( x + 1 \\right) \\exponentialE^x'],
		['2x-4', '2 \\left( x - 2 \\right)'],
		['3x^2+6x+3', '3 \\left( x + 1 \\right)^2']
	])('%s → %s', (source, attendu) => {
		expect(factoriser(source).latex).toBe(attendu);
	});
});

describe('l’étape se dit en français', () => {
	it.each(['xe^x-e^x', 'x^2e^x-2xe^x+2e^x', '3x^2+6x'])('%s', (source) => {
		const { steps } = factoriser(source);
		const rendered = new PedagogicalSimplifyRenderer().renderAll(steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		expect(rendered.length).toBeGreaterThan(0);
		const texts = [
			...steps.map((s) => s.description),
			...rendered.flatMap((s) => [s.title, s.explanation ?? ''])
		];
		for (const text of texts) {
			expect(text).not.toContain('common-factor');
			expect(text).not.toContain('Règle');
		}
		const [last] = rendered.slice(-1);
		expect(last.title).toBe('On met le facteur commun en évidence');
		expect(last.explanation).toContain('facteur commun');
	});
});

/**
 * Suites de revue (2026-10-11). Mesuré sur c6a1be7d1 :
 *
 * | entrée | rendait |
 * | --- | --- |
 * | `3(x+1)²−6(x+1)` | `3((x+1)²−2x−2)` — MOINS factorisé que l'entrée |
 * | `−xeˣ−eˣ` | `−eˣ(x+1)` — eˣ devant |
 * | `sin(xeˣ−eˣ)` | `sin(eˣ(x−1))` |
 * | `(x+1)²−(x+1)³` | `(1−(x+1))(x+1)²` |
 */
describe('une somme en facteur n’est jamais redéveloppée', () => {
	it.each([
		['3(x+1)^2-6(x+1)', '3 \\left( x - 1 \\right) \\left( x + 1 \\right)'],
		['2(x+1)^2+4(x+1)', '2 \\left( x + 1 \\right) \\left( x + 3 \\right)'],
		['(x+1)^2-(x+1)^3', '-x \\left( x + 1 \\right)^2']
	])('%s → %s', (source, attendu) => {
		const { input, result, latex } = factoriser(source);

		expect(latex).toBe(attendu);
		expect(areEquivalent(result, input)).toBe(true);
	});
});

describe('le facteur non polynomial reste derrière la parenthèse', () => {
	it.each([
		['-xe^x-e^x', '-\\left( x + 1 \\right) \\exponentialE^x'],
		['\\sin(xe^x-e^x)', '\\sin\\left( \\left( x - 1 \\right) \\exponentialE^x \\right)']
	])('%s → %s', (source, attendu) => {
		const { input, result, latex } = factoriser(source);

		expect(latex).toBe(attendu);
		expect(areEquivalent(result, input)).toBe(true);
	});
});
