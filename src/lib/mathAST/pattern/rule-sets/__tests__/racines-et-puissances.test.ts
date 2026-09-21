/**
 * Les règles de racines et de puissances ne doivent ni ignorer l'indice, ni
 * laisser un exposant non réduit.
 *
 * ## Quatre défauts, mesurés sur `main` à `eff054fd7`
 *
 * | entrée | rendu | attendu |
 * | --- | --- | --- |
 * | `√x · √x` | `\|x\|` | `x` |
 * | `∛x · ∛x` | `\|x\|` | pas `\|x\|` — la valeur est `x^{2/3}` |
 * | `eˣ · e^{2x}` | `e^{x + 2x}` | `e^{3x}` |
 * | `(eˣ)³` | `e^x^3` | `e^{3x}` |
 *
 * Les deux premiers viennent de `sqrt-product`, qui fusionne deux racines sans
 * regarder leur **indice** : `parseLatex('\sqrt[3]{x}')` rend une fonction
 * nommée `sqrt` à un seul argument, l'indice vivant dans `base`. C'est le
 * **quatrième module** où cet angle mort mord, après `normal/rules/radicals.ts`
 * et deux endroits de `normal/normalize.ts`.
 *
 * ⚠️ `∛x · ∛x ≡ |x|` est un **faux positif** : `|x|` n'est pas la valeur.
 *
 * Les deux derniers viennent de `same-base-mul` et `pow-of-pow`, qui
 * construisent la somme ou le produit des exposants sans jamais les réduire.
 * `(eˣ)³` rend même `e^x^3`, qui ne se relit pas.
 */

import { describe, it, expect } from 'vitest';
import { toLatex } from '../../../index';
import { parseLatex } from '../../../parser';
import { generatePedagogicalSimplifySteps } from '../../../pedagogical-simplify/pipeline';

const reduire = (source: string) =>
	toLatex(
		generatePedagogicalSimplifySteps(parseLatex(source), {
			intent: 'reduire',
			schoolLevel: 'lycee'
		}).result
	);

describe('un produit de deux racines identiques vaut le radicande', () => {
	it.each([
		['\\sqrt{x}\\sqrt{x}', 'x'],
		['\\sqrt{x+1}\\sqrt{x+1}', 'x + 1'],
		['\\sqrt{2}\\sqrt{2}', '2']
	])('%s → %s', (source, attendu) => {
		expect(reduire(source)).toBe(attendu);
	});
});

describe('la fusion des racines s’arrête à l’indice 2', () => {
	it.each(['\\sqrt[3]{x}\\sqrt[3]{x}', '\\sqrt[4]{x}\\sqrt[4]{x}', '\\sqrt[3]{x}\\sqrt{x}'])(
		'%s ne devient pas une valeur absolue',
		(source) => {
			expect(reduire(source)).not.toContain('\\left|');
		}
	);

	it('ni une racine carrée du produit', () => {
		expect(reduire('\\sqrt[3]{x}\\sqrt[3]{y}')).not.toBe('\\sqrt{x y}');
	});

	it('mais l’indice 2 fusionne toujours', () => {
		expect(reduire('\\sqrt{x}\\sqrt{y}')).toBe('\\sqrt{x y}');
	});
});

describe('les exposants se réduisent', () => {
	it.each([
		['e^{x}e^{2x}', 'e^{3 x}'],
		['e^{x}e^{x}', 'e^{2 x}'],
		['(e^{x})^{3}', 'e^{3 x}'],
		['(e^{2x})^{3}', 'e^{6 x}']
	])('%s → %s', (source, attendu) => {
		expect(reduire(source)).toBe(attendu);
	});

	it('et un exposant numérique continue de marcher', () => {
		expect(reduire('(x^{2})^{3}')).toBe('x^6');
	});
});

describe('ce qui ne doit pas changer', () => {
	it.each([
		['\\sqrt{x^2}', '\\left| x \\right|'],
		['\\sqrt{8}', '2 \\sqrt{2}'],
		// L'intention `reduire` ecrit le coefficient devant : ce n'est pas le meme
		// choix que `simplify`, et ce test le pinne tel quel.
		['\\frac{1}{\\sqrt{2}}', '\\dfrac{1}{2} \\sqrt{2}']
	])('%s → %s', (source, attendu) => {
		expect(reduire(source)).toBe(attendu);
	});
});
