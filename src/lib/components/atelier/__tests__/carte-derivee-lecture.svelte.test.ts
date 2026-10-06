/**
 * La carte `f′` montre la FORMULE de la dérivée, lue sans perte.
 *
 * ⚠️ Révélé par l'oracle des dérivées (#910) : la carte repasse par le texte
 * — `expressionOf` (écriture maison) puis relecture par `astOf`. La relecture
 * prenait `e^{sin(x)}` pour du LaTeX (accolades) et l'affichait
 * `c o s(x) e^{s i n(x)}` ; `ln(3)·3^(2x)` y était lu `l n` ; et `3\pi x`
 * s'écrivait `3\pix`, illisible (la carte retombait sur le texte `f'(x)`).
 *
 * Coefficients ≠ 1 : une constante mal lue s'y voit.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

/** Ce que la carte `f′` fait lire à un lecteur d'écran. */
async function spokenDerivativeOf(definition: string): Promise<string> {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	atelier.createDerivative('f');
	const { container } = await render(WithAtelier, { atelier });

	const definitionEl = cardFor(container, 'f′').querySelector('.definition') as HTMLElement;
	return (
		definitionEl.querySelector('.sr-only')?.textContent ?? `(texte) ${definitionEl.textContent}`
	);
}

describe('la carte f′ lit la formule de la dérivée', () => {
	it.each([
		['2e^(sin(x))', ['cosine', 'sine']],
		['2ln(3)*3^(2x)', ['ln']],
		['3\\pi x^2/4', ['pie']],
		['3π x^2/4', ['pie']],
		['cos(3x+\\pi/4)', ['sine', 'pie']]
	])('%s', async (definition, words) => {
		const spoken = await spokenDerivativeOf(definition);

		// Rendue en mathématiques (pas le texte de repli), noms de fonctions entiers
		expect(spoken).not.toMatch(/^\(texte\)/);
		for (const word of words) expect(spoken).toContain(word);
		expect(spoken).not.toMatch(/'[SCL]'/);
	});
});
