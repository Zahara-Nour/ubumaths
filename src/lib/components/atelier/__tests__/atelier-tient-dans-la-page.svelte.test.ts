/**
 * Sur un bureau de 1280×800, l'atelier tient dans la hauteur que la page lui
 * donne (relevé du 2026-11-11, volet 4 de la piste 4 (c), `amelioration`).
 *
 * La grille n'avait que des colonnes : sa rangée implicite (`auto`) prenait la
 * hauteur du contenu de la zone, 777 px pour 736, et la 2e rangée de « Mes
 * objets » (« + Point / + Courbe ») passait sous le bas de l'écran.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import AtelierSilhouette from '../AtelierSilhouette.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Constantes
// =============================================================================

/** 800 px de fenêtre, moins l'en-tête du site (`.page` : `100vh - 4rem`). */
const HAUTEUR_PAGE = 736;
const VUES = ['graphe', 'figure', 'donnees'] as const;

// =============================================================================
// Outils
// =============================================================================

function bottomOf(container: HTMLElement, selector: string): number {
	const element = container.querySelector(selector);
	if (!element) throw new Error(`pas de ${selector}`);
	return element.getBoundingClientRect().bottom;
}

function creationButton(container: HTMLElement, label: string): HTMLElement {
	const button = [...container.querySelectorAll('.panneau .creer button')].find(
		(b) => b.textContent?.trim() === label
	);
	if (!(button instanceof HTMLElement)) throw new Error(`pas de « ${label} »`);
	return button;
}

/** Donne au conteneur la hauteur de `.page`, et rend son bas. */
function sizeAsPage(container: HTMLElement): number {
	container.style.height = `${HAUTEUR_PAGE}px`;
	return container.getBoundingClientRect().bottom;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

afterEach(async () => {
	await page.viewport(1280, 900);
});

// =============================================================================
// Nominal
// =============================================================================

describe('bureau 1280×800 : l’atelier tient dans la page', () => {
	for (const view of VUES) {
		it(`vue ${view} : « Mes objets » et la zone s’arrêtent au bas de la page`, async () => {
			await page.viewport(1280, 800);
			const { container } = await render(AtelierContainer, {
				atelier: new Atelier(),
				ephemeral: true,
				view,
				consoleAtStart: false
			});
			await vi.waitFor(() => expect(container.querySelector('.scene')).toBeTruthy());
			const bas = sizeAsPage(container);
			await nextFrame();

			expect(bottomOf(container, '.panneau')).toBeLessThanOrEqual(bas);
			expect(bottomOf(container, '.zone')).toBeLessThanOrEqual(bas);
			// La 2e rangée des boutons de création, celle qui était coupée
			expect(
				creationButton(container, '+ Courbe').getBoundingClientRect().bottom
			).toBeLessThanOrEqual(bas);
		});
	}
});

describe('la silhouette, rendue tant que le JS charge', () => {
	it('tient dans la même hauteur que l’atelier', async () => {
		await page.viewport(1280, 800);
		const { container } = await render(AtelierSilhouette, { heading: 'Atelier' });
		const bas = sizeAsPage(container);
		await nextFrame();

		expect(bottomOf(container, '.panneau')).toBeLessThanOrEqual(bas);
		expect(bottomOf(container, '.zone')).toBeLessThanOrEqual(bas);
	});
});
