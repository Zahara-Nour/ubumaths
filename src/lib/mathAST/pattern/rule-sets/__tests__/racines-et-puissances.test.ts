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

// Lot 5a de simplify-carte : la dérivée de x·∛x, passée par `auto`, rendait
// `∛x + x/(3|x|)` (`sqrt-square` sur ∛(x²)) — valeur fausse pour x < 0 ; et
// `x/(3(∛x)²)` rendait `1/3` (`square-sqrt` sur (∛x)²).
describe('√(a²) = |a|, (√a)² = a et √(a/b) = √a/√b : racine carrée seulement', () => {
	it.each([
		['\\sqrt[3]{x^2}', '\\sqrt[3]{x^2}'],
		['\\sqrt[4]{x^2}', '\\sqrt[4]{x^2}'],
		['\\sqrt[3]{\\frac{x}{2}}', '\\sqrt[3]{\\dfrac{x}{2}}']
	])('%s reste %s', (source, attendu) => {
		expect(reduire(source)).toBe(attendu);
	});

	it('(∛x)² ne vaut pas x', () => {
		expect(reduire('\\sqrt[3]{x}^{2}')).not.toBe('x');
	});

	it('la racine carrée garde ses règles', () => {
		expect(reduire('\\sqrt{x}^{2}')).toBe('x');
		expect(reduire('\\sqrt{\\frac{x}{2}}')).toContain('\\sqrt{x}');
	});

	it('auto : la dérivée de x·∛x garde sa valeur', () => {
		const result = toLatex(
			generatePedagogicalSimplifySteps(parseLatex('\\sqrt[3]{x} + \\frac{x}{3\\sqrt[3]{x^2}}'), {
				intent: 'auto',
				schoolLevel: 'lycee'
			}).result
		);
		expect(result).not.toContain('\\left|');
		expect(result).not.toContain('\\dfrac{1}{3}');
	});
});

describe('les exposants se réduisent', () => {
	it.each([
		['e^{x}e^{2x}', '\\exponentialE^{3 x}'],
		['e^{x}e^{x}', '\\exponentialE^{2 x}'],
		['(e^{x})^{3}', '\\exponentialE^{3 x}'],
		['(e^{2x})^{3}', '\\exponentialE^{6 x}']
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
		// `reduire` finit par `tidy`, comme `simplify` : il écrit `√2/2` (avant,
		// normalize écrivait le coefficient devant, `½√2` ; chantier simplify-carte § 33)
		['\\frac{1}{\\sqrt{2}}', '\\dfrac{\\sqrt{2}}{2}']
	])('%s → %s', (source, attendu) => {
		expect(reduire(source)).toBe(attendu);
	});
});
