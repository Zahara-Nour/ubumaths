/**
 * Lecture graphique de l'image dans le grapheur : les pointillés des calculs
 * `f(a)` de la console et le point glissant (lot 3 bis de la refonte de
 * l'Atelier). On lit le RENDU : traits, point, étiquettes, curseur.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import GraphSVG from '../GraphSVG.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';

async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Une courbe posée avec sa lecture, comme l'atelier la synchronise. */
function plotted(latex: string, at: number[], name = 'f'): string {
	const id = grapheurStore.addFunction(latex);
	grapheurStore.updateFunction(id, { reading: { name, at } });
	return id;
}

function attr(element: Element, name: string): number {
	return Number(element.getAttribute(name));
}

describe('lecture graphique — les calculs de la console', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setInteracting(false);
		grapheurStore.setViewport({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
	});

	it('f(2) sur x² : pointillés de l’axe des abscisses au point, puis à l’axe des ordonnées', async () => {
		plotted('x^2', [2]);
		const { container } = await render(GraphSVG, {});
		await settle();

		const reading = container.querySelector('g.image-readings [data-source="console"]');
		expect(reading).not.toBeNull();
		const vertical = reading!.querySelector('line.lecture-verticale')!;
		const horizontal = reading!.querySelector('line.lecture-horizontale')!;
		const point = reading!.querySelector('circle.lecture-point')!;

		// Le trait vertical monte de l'axe au point, l'horizontal en repart
		expect(attr(vertical, 'x1')).toBeCloseTo(attr(vertical, 'x2'));
		expect(attr(vertical, 'y2')).toBeCloseTo(attr(point, 'cy'));
		expect(attr(horizontal, 'y1')).toBeCloseTo(attr(horizontal, 'y2'));
		expect(attr(horizontal, 'x1')).toBeCloseTo(attr(point, 'cx'));
		expect(vertical.getAttribute('stroke-dasharray')).not.toBeNull();

		// a et f(a) écrits au pied des pointillés
		expect(reading!.textContent).toContain('2');
		expect(reading!.textContent).toContain('4');
	});

	it('hors de l’ensemble de définition : rien de dessiné', async () => {
		plotted('\\sqrt{x}', [-1]);
		const { container } = await render(GraphSVG, {});
		await settle();

		expect(container.querySelector('[data-source="console"]')).toBeNull();
	});

	it('une courbe sans lecture : ni pointillés ni point glissant', async () => {
		grapheurStore.addFunction('x^2');
		const { container } = await render(GraphSVG, {});
		await settle();

		expect(container.querySelector('g.image-readings')?.children.length ?? 0).toBe(0);
		expect(container.querySelector('[role="slider"]')).toBeNull();
	});
});

describe('lecture graphique — le point glissant', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setInteracting(false);
		grapheurStore.setViewport({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
	});

	it('un curseur par courbe lue, hors de l’image décorative, qui dit sa lecture', async () => {
		plotted('x^2', []);
		const { container } = await render(GraphSVG, {});
		await settle();

		const slider = container.querySelector('[role="slider"]') as HTMLElement;
		expect(slider).not.toBeNull();
		expect(slider.getAttribute('aria-label')).toBe('Lecture graphique de f');
		expect(slider.getAttribute('aria-valuetext')).toBe('Lecture de f en x = 0 : f(0) = 0');
		// Atteignable : ni dans le SVG masqué, ni dans l'image `role="img"`
		expect(slider.closest('[aria-hidden="true"], [role="img"]')).toBeNull();
		expect(slider.tabIndex).toBe(0);
		// Son point est dessiné sur la courbe
		expect(container.querySelector('[data-source="curseur"] circle.lecture-point')).not.toBeNull();
	});

	it('les flèches le déplacent, la lecture suit, la touche ne remonte pas au graphe', async () => {
		plotted('x^2', []);
		const { container } = await render(GraphSVG, {});
		await settle();

		const slider = container.querySelector('[role="slider"]') as HTMLElement;
		const seen: KeyboardEvent[] = [];
		window.addEventListener('keydown', (event) => seen.push(event));
		slider.focus();
		await userEvent.keyboard('{ArrowRight}');
		await settle();

		const text = slider.getAttribute('aria-valuetext') ?? '';
		const at = Number(/x = (-?[\d,]+)/.exec(text)?.[1].replace(',', '.'));
		expect(at).toBeGreaterThan(0);
		expect(text).toContain(`f(${String(at).replace('.', ',')})`);
		// Consommée : le KeyboardHandler du grapheur l'ignore (`defaultPrevented`, #1487)
		expect(seen.at(-1)?.defaultPrevented).toBe(true);
	});
});
