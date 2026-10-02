/**
 * StatChart dessine une scène déjà construite : simulations de l'atelier
 * (outils statistiques v2, PR (c), Q80-Q82). Rendu dans <main>, décor réel.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StatChart from '../StatChart.svelte';
import { buildRunningMeanScene, buildSampleMeansScene } from '$lib/ubumark/utils/simulation-scene';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

describe('moyenne des tirages selon n (Q81)', () => {
	const means = Array.from({ length: 800 }, (_, i) => 0.5 + 0.4 / (i + 1));

	it('la courbe et la droite de l’espérance sont VISIBLES, avec leur légende', async () => {
		const scene = buildRunningMeanScene(means, 0.5, '1/2', 'fr');
		const screen = await render(StatChart, { target: mainElement(), props: { scene } });
		const curve = screen.container.querySelector<SVGPolylineElement>('.stat-polygone')!;
		const reference = screen.container.querySelector<SVGLineElement>('.stat-reference')!;

		expect(curve.getBoundingClientRect().width).toBeGreaterThan(0);
		expect(reference.getBoundingClientRect().width).toBeGreaterThan(0);
		expect(getComputedStyle(reference).strokeDasharray).not.toBe('none');
		expect(screen.container.textContent).toContain('espérance 1/2');
		expect(screen.container.textContent).toContain('Nombre de tirages');
	});

	it('titre et description accessibles', async () => {
		const scene = buildRunningMeanScene(means, 0.5, '1/2', 'fr');
		const screen = await render(StatChart, { target: mainElement(), props: { scene } });

		expect(screen.container.querySelector('svg title')?.textContent).toBe(
			'Moyenne des tirages selon leur nombre'
		);
		expect(screen.container.querySelector('svg desc')?.textContent).toMatch(/espérance de 1\/2/);
	});

	it('la droite y = E(X) est À SA HAUTEUR : entre le haut et le bas du cadre', async () => {
		const scene = buildRunningMeanScene([-3, -2, -2.5], -2, '−2', 'fr');
		const screen = await render(StatChart, { target: mainElement(), props: { scene } });
		const reference = screen.container.querySelector<SVGLineElement>('.stat-reference')!;
		const svg = screen.container.querySelector('svg')!.getBoundingClientRect();
		const y = reference.getBoundingClientRect().top;

		expect(y).toBeGreaterThan(svg.top);
		expect(y).toBeLessThan(svg.bottom);
	});
});

describe('histogramme des moyennes (Q82)', () => {
	it('les classes hors de μ ± 2σ/√n sont grisées, les autres en couleur', async () => {
		const scene = buildSampleMeansScene([3.0, 3.4, 3.5, 3.6, 4.1], 3.5, 0.34, 'fr');
		const screen = await render(StatChart, { target: mainElement(), props: { scene } });
		const rects = [...screen.container.querySelectorAll<SVGRectElement>('.stat-rectangle')];
		const outside = rects.filter((r) => r.classList.contains('stat-rectangle-hors'));
		const inside = rects.filter((r) => !r.classList.contains('stat-rectangle-hors'));

		expect(outside.length).toBeGreaterThan(0);
		expect(inside.length).toBeGreaterThan(0);
		expect(getComputedStyle(inside[0]).fill).not.toBe(getComputedStyle(outside[0]).fill);
	});
});
