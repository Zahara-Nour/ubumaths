/**
 * La vue Figure (géométrie v2, lot 1, PR 2 — F1 à F5 de
 * `docs/wip/atelier-geometrie-phase0.md`) : une projection de l'atelier dans une
 * `GeometryCanvas`, repère orthonormé, rien qui se glisse.
 *
 * Asserte le RENDU : éléments SVG présents, texte de la vue.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import WithFigure from './harness/WithFigure.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'value' | 'function' | 'point' | 'curve', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		atelier.create({ kind, name, definition }, 'text');
	}
	return atelier;
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

/** Les noms écrits sur la toile (étiquettes des points et des courbes). */
function labels(container: HTMLElement): string[] {
	return [...canvasOf(container).querySelectorAll('text.label')].map(
		(t) => t.textContent?.trim() ?? ''
	);
}

// =============================================================================
// Tests
// =============================================================================

describe('la vue Géométrie (FigureView)', () => {
	it('F1, Q5 révisée : l’onglet Géométrie est entre Graphe et Données', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });

		const tabs = [...container.querySelectorAll('.onglet')].map((b) => b.textContent?.trim());
		// Plus d'onglet Calcul : la console est un volet (lot 2 de la refonte)
		expect(tabs).toEqual(['Graphe', 'Géométrie', 'Données']);
		expect(container.textContent).not.toContain('Figure');
	});

	it('Q5 révisée : la vue s’annonce « Géométrie » au lecteur d’écran', async () => {
		const { container } = await render(WithFigure, { atelier: atelierOf([]) });

		expect(container.querySelector('section[aria-label="Géométrie"]')).toBeTruthy();
	});

	it('K1 : une fonction affichée est tracée, et la vue n’est plus vide', async () => {
		const atelier = atelierOf([['function', 'f', 'x^2']]);
		atelier.setInFigure('f', true);
		const { container } = await render(WithFigure, { atelier });

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('path.function-curve')).toBeTruthy()
		);
		expect(labels(container)).toContain('f');
		expect(container.textContent).not.toContain('écris un point');
		expect(container.textContent).toContain('Repère');
	});

	it('F1 : une fonction affichée mais en attente (b absent) ne rend pas la vue non vide', async () => {
		const atelier = atelierOf([['function', 'f', 'b x']]);
		atelier.setInFigure('f', true);
		const { container } = await render(WithFigure, { atelier });

		await vi.waitFor(() => expect(container.querySelector('svg.geometry-canvas')).toBeTruthy());
		expect(container.textContent).toContain('écris un point');
		expect(canvasOf(container).querySelector('path.function-curve')).toBeNull();
	});

	it('K1 : « Afficher dans Géométrie » sur la carte trace 𝒞f, écrit sa ligne et ouvre Géométrie', async () => {
		const atelier = atelierOf([['function', 'f', 'x^2']]);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		// Lot 3 de la refonte : l'action est dans le menu de la carte
		await chooseCardAction(container, 'f', 'Afficher dans Géométrie');

		await vi.waitFor(() =>
			expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
				'Géométrie'
			)
		);
		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('path.function-curve')).toBeTruthy()
		);
		// G2 : le geste a écrit sa ligne dans la console
		await vi.waitFor(() =>
			expect(container.querySelector('.historique')?.textContent).toContain(
				'La courbe de f est affichée dans Géométrie.'
			)
		);
	});

	it('F1 : sans objet de figure, la vue dit quoi écrire', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierOf([['function', 'f', 'x^2']]),
			ephemeral: true,
			view: 'figure'
		});

		expect(container.textContent).toContain(
			'Dans la console, écris un point A = (1 ; 2) ou une courbe d : y = 3x − 2'
		);
	});

	it('F2 : le point A et la droite d sont dessinés et nommés', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierOf([
				['point', 'A', '(1 ; 2)'],
				['curve', 'd', 'y = 3x - 2']
			]),
			ephemeral: true,
			view: 'figure'
		});

		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		expect(canvasOf(container).querySelector('line.geo-line')).toBeTruthy();
		expect(labels(container)).toEqual(expect.arrayContaining(['A', 'd']));
		expect(container.textContent).not.toContain('écris un point');
	});

	it('F2 : repère orthonormé — le cercle x² + y² = 4 est rond à l’écran', async () => {
		const { container } = await render(WithFigure, {
			atelier: atelierOf([['curve', 'C', 'x^2 + y^2 = 4']]),
			width: 600,
			height: 300
		});

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('path.function-curve')).toBeTruthy()
		);
		const box = (
			canvasOf(container).querySelector('path.function-curve') as SVGPathElement
		).getBBox();
		expect(Math.abs(box.width - box.height)).toBeLessThan(1);
	});

	it('F5 : une courbe en attente n’est pas dessinée', async () => {
		const { container } = await render(WithFigure, {
			atelier: atelierOf([
				['curve', 'C', 'x^2 + y^2 = b^2'],
				['point', 'A', '(1 ; 2)']
			])
		});

		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		expect(canvasOf(container).querySelector('path.function-curve')).toBeNull();
		expect(labels(container)).not.toContain('C');
	});

	it('F3 : le repère est affiché par défaut ; la case « Repère » le masque', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() => expect(canvasOf(container).querySelector('g.grid')).toBeTruthy());

		const box = container.querySelector('button[role="checkbox"]');
		expect(box?.getAttribute('aria-checked')).toBe('true');
		expect(container.textContent).toContain('Repère');
		await userEvent.click(box as HTMLElement);

		await vi.waitFor(() => expect(canvasOf(container).querySelector('g.grid')).toBeNull());
		expect(atelier.figureFrame).toBe(false);
	});

	it('F4 : rien ne se glisse — tirer sur le point ne change ni l’atelier ni le dessin', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		const point = canvasOf(container).querySelector('circle.point') as SVGCircleElement;
		const before = [point.getAttribute('cx'), point.getAttribute('cy')];
		const rect = point.getBoundingClientRect();
		const at = { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 };

		point.dispatchEvent(new PointerEvent('pointerdown', { ...at, bubbles: true, pointerId: 1 }));
		canvasOf(container).dispatchEvent(
			new PointerEvent('pointermove', {
				clientX: at.clientX + 60,
				clientY: at.clientY + 40,
				bubbles: true,
				pointerId: 1
			})
		);
		canvasOf(container).dispatchEvent(
			new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
		);
		await new Promise((r) => setTimeout(r, 50));

		expect(atelier.get('A')?.definition).toBe('(1 ; 2)');
		const after = canvasOf(container).querySelector('circle.point') as SVGCircleElement;
		expect([after.getAttribute('cx'), after.getAttribute('cy')]).toEqual(before);
	});

	it('S1 : le curseur de l’atelier fait bouger le point, sans curseur affiché dans la figure', async () => {
		const atelier = atelierOf([
			['value', 'a', '1'],
			['point', 'M', '(a ; 0)']
		]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		const before = canvasOf(container).querySelector('circle.point')?.getAttribute('cx');
		// Le curseur est CACHÉ : celui de la carte suffit (S4)
		expect(container.querySelector('.sliders-panel')).toBeNull();

		atelier.slideTo('a', 3);

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('circle.point')?.getAttribute('cx')).not.toBe(before)
		);
	});

	it('tient à la largeur d’un téléphone (360 px) sans déborder', async () => {
		const { container } = await render(WithFigure, {
			atelier: atelierOf([['point', 'A', '(1 ; 2)']]),
			width: 360,
			height: 520
		});

		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		expect(canvasOf(container).getBoundingClientRect().width).toBeLessThanOrEqual(360);
		const view = container.querySelector('.figure') as HTMLElement;
		expect(view.scrollWidth).toBeLessThanOrEqual(360);
	});
});
