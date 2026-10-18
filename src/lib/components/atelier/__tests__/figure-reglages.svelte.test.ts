/**
 * Lot 4b de la refonte, côté figure : ce que la vue Géométrie PEINT quand la
 * carte d'un point ou d'une courbe est réglée (`setFigureDisplay`). Asserte le
 * rendu : `fill` / `stroke` / rayon / pointillés des éléments SVG, nom absent.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WithFigure from './harness/WithFigure.svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'value' | 'point' | 'curve', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

function set(atelier: Atelier, name: string, patch: Record<string, unknown>): void {
	const done = atelier.setFigureDisplay(name, patch);
	if (!done.ok) throw new Error(done.message);
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

function one<T extends Element>(container: HTMLElement, selector: string): T {
	const el = canvasOf(container).querySelector(selector);
	if (el === null) throw new Error(`rien pour ${selector}`);
	return el as T;
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

describe('la vue Géométrie peint les réglages des cartes', () => {
	it('un point : couleur, rayon, puis nom masqué — et retour', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		const point = () => one<SVGCircleElement>(container, 'circle.point');
		await vi.waitFor(() => expect(point()).toBeTruthy());
		// Sans réglage : le dessin d'avant
		expect(point().getAttribute('r')).toBe('5');
		expect(labels(container)).toContain('A');

		set(atelier, 'A', { color: 'curve-2', size: 'large' });

		await vi.waitFor(() => expect(point().style.fill).toBe('var(--color-curve-2)'));
		expect(point().getAttribute('r')).toBe('7');

		set(atelier, 'A', { showLabel: false, size: 'small' });

		await vi.waitFor(() => expect(labels(container)).not.toContain('A'));
		expect(point().getAttribute('r')).toBe('3');

		set(atelier, 'A', { showLabel: true });

		await vi.waitFor(() => expect(labels(container)).toContain('A'));
	});

	it('une droite d’équation : couleur, pointillés, épaisseur', async () => {
		const atelier = atelierOf([['curve', 'd', 'y = 3x - 2']]);
		const { container } = await render(WithFigure, { atelier });
		const line = () => one<SVGLineElement>(container, 'line.geo-line');
		await vi.waitFor(() => expect(line()).toBeTruthy());

		set(atelier, 'd', { color: 'curve-3', lineStyle: 'dashed', lineWidth: 4 });

		await vi.waitFor(() => expect(line().style.stroke).toBe('var(--color-curve-3)'));
		expect(line().getAttribute('stroke-width')).toBe('4');
		expect(line().getAttribute('stroke-dasharray')).toBe('12 8');
	});

	it('régler la taille seule ne change pas la couleur peinte', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		const point = () => one<SVGCircleElement>(container, 'circle.point');
		await vi.waitFor(() => expect(point()).toBeTruthy());
		const before = point().style.fill;

		set(atelier, 'A', { size: 'large' });

		await vi.waitFor(() => expect(point().getAttribute('r')).toBe('7'));
		expect(point().style.fill).toBe(before);
	});

	it('le point de couleur d’une carte sans réglage montre la couleur de la figure', async () => {
		const atelier = atelierOf([
			['point', 'A', '(1 ; 2)'],
			['curve', 'd', 'y = 3x - 2']
		]);
		const figure = await render(WithFigure, { atelier });
		const panel = await render(WithAtelier, { atelier });
		const point = () => one<SVGCircleElement>(figure.container, 'circle.point');
		const line = () => one<SVGLineElement>(figure.container, 'line.geo-line');
		await vi.waitFor(() => expect(point()).toBeTruthy());
		const trigger = (label: string) => {
			const button = panel.container.querySelector<HTMLButtonElement>(
				`button[aria-label="${label}"]`
			);
			if (button === null) throw new Error(`pas de bouton ${label}`);
			return button;
		};

		expect(trigger('Couleur et taille de A').style.backgroundColor).toBe(point().style.fill);
		expect(trigger('Couleur et trait de d').style.backgroundColor).toBe(line().style.stroke);
	});

	it('un cercle construit et son nom prennent la couleur de la carte', async () => {
		const atelier = atelierOf([
			['point', 'O', '(0 ; 0)'],
			['curve', 'c', 'cercle(O ; 3)']
		]);
		set(atelier, 'c', { color: 'curve-4' });
		const { container } = await render(WithFigure, { atelier });
		const circle = () => one<SVGCircleElement>(container, 'circle.circle');
		await vi.waitFor(() => expect(circle()).toBeTruthy());

		expect(circle().style.stroke).toBe('var(--color-curve-4)');
		const name = one<SVGTextElement>(container, 'text.geo-text');
		expect(name.textContent?.trim()).toBe('c');
		expect(name.style.fill).toBe('var(--color-curve-4)');
	});
});
