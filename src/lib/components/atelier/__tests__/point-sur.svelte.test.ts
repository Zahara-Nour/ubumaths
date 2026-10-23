/**
 * Géométrie, lot 2, PR 3 : `intersection` et `point_sur` À L'ÉCRAN — la carte
 * (coordonnées en gris, raison d'une attente, curseur de position) et le dessin
 * dans la vue Géométrie.
 *
 * Asserte le RENDU : texte de la carte, curseur affiché et ce qu'il annonce,
 * éléments SVG de la toile.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import WithAtelier from './harness/WithAtelier.svelte';
import WithFigure from './harness/WithFigure.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { figureNatureOf, figureSummaryOf } from '$lib/atelier/card-state';
import { isCurve, isPoint } from '$lib/atelier/types';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'value' | 'point' | 'curve', name: string, definition: string];

/** A(0 ; 1), B(1 ; 3), O(0 ; 0), C(2 ; 0), u = (OC), c = cercle(O ; 1), puis le reste. */
function atelierWith(more: Entry[]): Atelier {
	const atelier = new Atelier();
	const entries: Entry[] = [
		['point', 'A', '(0 ; 1)'],
		['point', 'B', '(1 ; 3)'],
		['point', 'O', '(0 ; 0)'],
		['point', 'C', '(2 ; 0)'],
		['curve', 'u', '(OC)'],
		['curve', 'c', 'cercle(O ; 1)'],
		...more
	];
	for (const [kind, name, definition] of entries) {
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
	return [...canvasOf(container).querySelectorAll('text.label')].map(
		(t) => t.textContent?.trim() ?? ''
	);
}

// =============================================================================
// La carte
// =============================================================================

describe('la carte d’une intersection', () => {
	it('E = intersection(u, c, 1) : nature « point », coordonnées en gris', async () => {
		const atelier = atelierWith([['point', 'E', 'intersection(u, c, 1)']]);
		const { container } = await render(WithAtelier, { atelier });

		// Plus montrée sur la carte (2026-10-23) : elle ira dans les Propriétés
		expect(cardFor(container, 'E').querySelector('.dessous')).toBeNull();
		expect(natureOf(atelier, 'E')).toBe('point');
		expect(valueText(atelier, 'E')).toBe('E(-1 ; 0)');
		// Pas de caractère de contrôle dans le LaTeX rendu (\t, \r perdus)
		expect(valueText(atelier, 'E')).not.toMatch(/[\t\r]/);
	});

	it('sans point commun : « en attente » et la raison', async () => {
		const atelier = atelierWith([
			['curve', 'k', 'cercle(O ; 2)'],
			['point', 'E', 'intersection(c, k, 1)']
		]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'E');
		expect(card.querySelector('.etat')?.textContent?.trim()).toBe('en attente');
		expect(card.querySelector('.message')?.textContent?.trim()).toBe('c et k ne se coupent pas.');
		expect(figureSummaryOf(atelier, 'E')).toBeNull();
	});
});

describe('la carte d’un point_sur : le curseur de position', () => {
	it('M = point_sur(s ; 0,3) : un curseur, qui annonce la position', async () => {
		const atelier = atelierWith([
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'M');
		expect(valueText(atelier, 'M')).toBe('M(3/10 ; 8/5)');
		const thumb = card.querySelector('[role="slider"]');
		expect(thumb).toBeTruthy();
		await vi.waitFor(() => {
			expect(thumb?.getAttribute('aria-label')).toBe('Position de M');
			expect(thumb?.getAttribute('aria-valuetext')).toBe('position de M = 0,3');
		});
	});

	it('une flèche avance la position d’un pas, et les coordonnées suivent', async () => {
		const atelier = atelierWith([
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);
		const { container } = await render(WithAtelier, { atelier });

		const thumb = cardFor(container, 'M').querySelector('[role="slider"]') as HTMLElement;
		thumb.focus();
		await userEvent.keyboard('{ArrowRight}');

		await vi.waitFor(() => expect(valueText(atelier, 'M')).toBe('M(31/100 ; 81/50)'));
	});

	it('point_sur(s ; t) : pas de curseur sur M (c’est celui de t)', async () => {
		const atelier = atelierWith([
			['value', 't', '0,3'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; t)']
		]);
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'M').querySelector('[role="slider"]')).toBeNull();
	});
});

// =============================================================================
// La vue Géométrie
// =============================================================================

describe('la vue Géométrie dessine les intersections et les points sur un objet', () => {
	it('E et M sont dessinés, avec leurs noms', async () => {
		const atelier = atelierWith([
			['point', 'E', 'intersection(u, c, 2)'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,5)']
		]);
		const { container } = await render(WithFigure, { atelier });

		await vi.waitFor(() => expect(labels(container)).toEqual(expect.arrayContaining(['E', 'M'])));
	});
});
