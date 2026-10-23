/**
 * Géométrie, lot 2, PR 1 : les constructions À L'ÉCRAN — leur carte (L7 :
 * nature, construction telle qu'écrite, coordonnées exactes, longueur) et leur
 * dessin dans la vue Géométrie (L1 : projection par `syncFigure`).
 *
 * Asserte le RENDU : texte de la carte, éléments SVG de la toile.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import WithFigure from './harness/WithFigure.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { figureNatureOf, figureSummaryOf } from '$lib/atelier/card-state';
import { isCurve, isPoint } from '$lib/atelier/types';

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
/**
 * Ce que vaut une construction, en clair. Plus montré sur la carte (2026-10-23) :
 * il ira dans les Propriétés de l'objet ; on lit le calcul en attendant.
 */
function valueText(atelier: Atelier, name: string): string {
	return figureSummaryOf(atelier, name)?.text ?? '';
}
/** La nature d'un objet de la figure (plus montrée sur la carte, cf. `valueText`). */
function natureOf(atelier: Atelier, name: string): string {
	const object = atelier.get(name);
	if (object === undefined || !(isPoint(object) || isCurve(object))) throw new Error(name);
	return figureNatureOf(atelier, object).label;
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

function labels(container: HTMLElement): string[] {
	// Le nom d'un cercle est un texte de la figure (`geo-text`), pas une étiquette de point
	return [...canvasOf(container).querySelectorAll('text.label, text.geo-text')].map(
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
		expect(natureOf(atelier, 'I')).toBe('point');
		// Lot 4b de la refonte : la construction est dans le champ de la ligne
		expect(card.querySelector<MathfieldElement>('math-field')?.value).toContain('milieu');
		expect(card.querySelector('.egal')?.textContent?.trim()).toBe('=');
		expect(valueText(atelier, 'I')).toBe('I(1/2 ; 2)');
	});

	it('s = [AB] : nature « segment », sa longueur', async () => {
		const atelier = atelierWith([['curve', 's', '[AB]']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 's');
		expect(natureOf(atelier, 's')).toBe('segment');
		// Une construction se nomme avec « = », pas « : »
		expect(card.querySelector('.egal')?.textContent?.trim()).toBe('=');
		expect(valueText(atelier, 's')).toBe('longueur √5');
	});

	it('d = (AB) : nature « droite », son équation réduite', async () => {
		const atelier = atelierWith([['curve', 'd', '(AB)']]);
		const { container } = await render(WithAtelier, { atelier });

		// Plus montrée sur la carte (2026-10-23) : elle ira dans les Propriétés
		expect(cardFor(container, 'd').querySelector('.dessous')).toBeNull();
		expect(natureOf(atelier, 'd')).toBe('droite');
		expect(valueText(atelier, 'd')).toBe('y = 2x + 1');
	});

	it('c = cercle(O ; 3) : nature « cercle »', async () => {
		const atelier = atelierWith([['curve', 'c', 'cercle(O ; 3)']]);
		const { container } = await render(WithAtelier, { atelier });

		expect(natureOf(atelier, 'c')).toBe('cercle');
		expect(cardFor(container, 'c').querySelector('.dessous')).toBeNull();
	});

	it('une construction en attente le dit, sans valeur', async () => {
		const atelier = atelierWith([['point', 'I', 'milieu(A, Z)']]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'I');
		expect(card.querySelector('.etat')?.textContent?.trim()).toBe('en attente');
		expect(figureSummaryOf(atelier, 'I')).toBeNull();
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

// =============================================================================
// La console : la formule d'une réponse se compose sans antislash perdu
// =============================================================================

describe('L2 : la ligne de console d’une construction tapée seule', () => {
	async function settle() {
		await tick();
		await new Promise((r) => setTimeout(r, 0));
		await tick();
	}

	async function answerOf(line: string): Promise<string> {
		const atelier = atelierWith([]);
		const view = await render(AtelierContainer, { atelier, ephemeral: true });
		const field = view.container.querySelector('input[type="text"]') as HTMLInputElement;
		const form = view.container.querySelector('form') as HTMLFormElement;
		field.value = line;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		await settle();
		const history = view.container.querySelector('.historique');
		await vi.waitFor(() => expect(history?.querySelector('.math')).toBeTruthy());
		return history?.textContent ?? '';
	}

	it('`milieu(A, B)` : ni « ight » ni « left » lus en lettres', async () => {
		const text = await answerOf('milieu(A, B)');
		expect(text).not.toContain('ight');
		expect(text).not.toMatch(/left\(/);
	});

	it('`[AB]` : « segment de longueur » sans « ext »', async () => {
		const text = await answerOf('[AB]');
		expect(text).toContain('segment de longueur');
		expect(text).not.toContain('ext');
	});
});
