/**
 * Géométrie, lot 2, PR 1 : les constructions À L'ÉCRAN — leur carte (L7 :
 * nature, construction telle qu'écrite, coordonnées exactes, longueur) et leur
 * dessin dans la vue Géométrie (L1 : projection par `syncFigure`).
 *
 * Asserte le RENDU : texte de la carte, éléments SVG de la toile.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import WithFigure from './harness/WithFigure.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

/** A(0 ; 1), B(1 ; 3), O(0 ; 0), puis les constructions demandées. */
function atelierWith(constructions: [kind: 'point' | 'curve', name: string, definition: string][]) {
	const atelier = new Atelier();
	atelier.create({ kind: 'point', name: 'A', definition: '(0 ; 1)' }, 'text');
	atelier.create({ kind: 'point', name: 'B', definition: '(1 ; 3)' }, 'text');
	atelier.create({ kind: 'point', name: 'O', definition: '(0 ; 0)' }, 'text');
	for (const [kind, name, definition] of constructions) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(done.message);
	}
	return atelier;
}

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

/** Ce que la carte dit de la valeur de l'objet, en clair (lecture d'écran). */
function valueText(card: HTMLElement): string {
	return card.querySelector('.valeur .sr-only')?.textContent?.trim() ?? '';
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

function labels(container: HTMLElement): string[] {
	return [...canvasOf(container).querySelectorAll('text.label')].map(
		(t) => t.textContent?.trim() ?? ''
	);
}

// =============================================================================
// L7 — la carte
// =============================================================================

describe('L7 : la carte d’une construction', () => {
	it('I = milieu(A, B) : nature « point », construction écrite, I(1/2 ; 2)', async () => {
		const atelier = atelierWith([['point', 'I', 'milieu(A, B)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'I');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('point');
		expect(card.querySelector('.definition')?.textContent).toContain('milieu');
		expect(card.querySelector('.signe')?.textContent?.trim()).toBe('=');
		expect(valueText(card)).toBe('I(1/2 ; 2)');
	});

	it('s = [AB] : nature « segment », sa longueur', async () => {
		const atelier = atelierWith([['curve', 's', '[AB]']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 's');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('segment');
		// Une construction se nomme avec « = », pas « : »
		expect(card.querySelector('.signe')?.textContent?.trim()).toBe('=');
		expect(valueText(card)).toBe('longueur √5');
	});

	it('d = (AB) : nature « droite », son équation réduite', async () => {
		const atelier = atelierWith([['curve', 'd', '(AB)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'd');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('droite');
		expect(valueText(card)).toBe('y = 2x + 1');
	});

	it('c = cercle(O ; 3) : nature « cercle »', async () => {
		const atelier = atelierWith([['curve', 'c', 'cercle(O ; 3)']]);
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'c').querySelector('.type')?.textContent?.trim()).toBe('cercle');
	});

	it('une construction en attente le dit, sans valeur', async () => {
		const atelier = atelierWith([['point', 'I', 'milieu(A, Z)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'I');
		expect(card.querySelector('.etat')?.textContent?.trim()).toBe('en attente');
		expect(card.querySelector('.valeur')).toBeNull();
	});
});

// =============================================================================
// L1 — la vue Géométrie
// =============================================================================

describe('L1 : la vue Géométrie dessine les constructions', () => {
	it('segment, droite, demi-droite, cercle et point construit, avec leurs étiquettes', async () => {
		const atelier = atelierWith([
			['point', 'I', 'milieu(A, B)'],
			['curve', 's', '[AB]'],
			['curve', 'd', '(OI)'],
			['curve', 'r', '[OA)'],
			['curve', 'c', 'cercle(O ; 3)']
		]);
		const { container } = await render(WithFigure, { atelier });

		await vi.waitFor(() => expect(canvasOf(container).querySelector('.segment')).toBeTruthy());
		const svg = canvasOf(container);
		expect(svg.querySelector('.geo-line')).toBeTruthy();
		expect(svg.querySelector('.ray')).toBeTruthy();
		expect(svg.querySelector('.circle')).toBeTruthy();
		expect(labels(container)).toEqual(expect.arrayContaining(['I', 's', 'd', 'r', 'c']));
	});
});
