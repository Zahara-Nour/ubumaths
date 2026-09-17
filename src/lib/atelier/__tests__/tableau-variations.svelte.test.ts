/**
 * Le tableau de variations est-il VRAIMENT dessiné ?
 *
 * ⚠️ Que le pont produise le nœud ne dit rien de ce qui atterrit à l'écran. Le
 * composant est donc monté pour de bon, dans un vrai Chromium, et on regarde le
 * DOM.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import CalculView from '$lib/components/atelier/CalculView.svelte';

/** Le marqueur que MathLive pose sur ce qu'il n'a pas su composer. */
const ERROR_MARKER = 'ML__error';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function afficherVariations(definition: string): HTMLElement {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition });
	const desk = new CalcDesk(atelier);
	desk.runFromPanel('variations', 'f');

	cible = document.createElement('div');
	document.body.appendChild(cible);
	monte = mount(CalculView, { target: cible, props: { desk } });
	return cible;
}

describe('le tableau de variations dans le DOM', () => {
	it('une parabole donne un vrai tableau, sans boîte d’erreur', () => {
		const racine = afficherVariations('x^2 - 3x + 2');

		expect(racine.innerHTML).not.toContain(ERROR_MARKER);
		expect(racine.querySelectorAll('table').length).toBeGreaterThan(0);
	});

	it('le zéro de la dérivée est dessiné', () => {
		const racine = afficherVariations('x^2 - 3x + 2');

		expect(racine.innerHTML).toContain('vt-zero');
	});

	it('les flèches de variation sont tracées', () => {
		const racine = afficherVariations('x^2 - 3x + 2');

		// `VariationTable` dessine les sens en SVG : sans flèche, le tableau ne
		// dirait pas ce qu'il est censé dire.
		expect(racine.querySelectorAll('svg').length).toBeGreaterThan(0);
	});

	it('une fonction à asymptote garde le texte du moteur', () => {
		const racine = afficherVariations('1/x');

		expect(racine.querySelectorAll('table').length).toBe(0);
		// La réponse ne disparaît pas.
		expect((racine.textContent ?? '').length).toBeGreaterThan(20);
	});
});
