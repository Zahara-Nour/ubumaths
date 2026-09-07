import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AxisLines from '../AxisLines.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { Viewport } from '$lib/grapheur/types';

const WIDTH = 800;
const HEIGHT = 400;

function renderAxes(viewport: Viewport) {
	const { container } = render(AxisLines, {
		viewport,
		transformer: createTransformer(viewport, WIDTH, HEIGHT),
		width: WIDTH,
		height: HEIGHT
	});

	// Les étiquettes de l'axe des abscisses sont centrées sous leur graduation,
	// celles de l'axe des ordonnées sont alignées à droite de l'axe. L'étiquette
	// de l'origine et les noms « x » / « y » ne sont pas des graduations.
	const labels = [
		...container.querySelectorAll<SVGTextElement>('text.axis-label:not(.origin-label)')
	];
	const coord = (list: SVGTextElement[], attr: 'x' | 'y') =>
		list.map((t) => Number(t.getAttribute(attr))).sort((a, b) => a - b);

	const xLabels = labels.filter((t) => t.getAttribute('text-anchor') === 'middle');
	const yLabels = labels.filter((t) => t.getAttribute('text-anchor') === 'end');

	return { labels, xs: coord(xLabels, 'x'), ys: coord(yLabels, 'y') };
}

function minGap(values: number[]): number {
	let min = Infinity;
	for (let i = 1; i < values.length; i++) {
		const gap = values[i] - values[i - 1];
		if (gap > 0.5 && gap < min) min = gap;
	}
	return min;
}

/**
 * Les graduations partagent désormais l'heuristique 1-2-5 de `geometry-core`,
 * mais gardent leur contrainte propre : une étiquette a besoin de place, donc
 * jamais moins de 50 px entre deux voisines.
 */
describe('AxisLines', () => {
	it('n’écrit jamais deux étiquettes à moins de 50 px', () => {
		for (const viewport of [
			{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
			{ xMin: -1, xMax: 1, yMin: -1000, yMax: 1000 },
			{ xMin: -500, xMax: 500, yMin: -1, yMax: 1 },
			{ xMin: -0.001, xMax: 0.001, yMin: -3, yMax: 7 }
		]) {
			const { xs, ys } = renderAxes(viewport);

			expect(minGap(xs)).toBeGreaterThanOrEqual(50);
			expect(minGap(ys)).toBeGreaterThanOrEqual(50);
		}
	});

	it('gradue les deux axes même quand leurs échelles diffèrent', () => {
		const { labels } = renderAxes({ xMin: -10, xMax: 10, yMin: -1000, yMax: 1000 });

		expect(labels.length).toBeGreaterThanOrEqual(8);
	});

	it('n’écrit aucune graduation sur une fenêtre dégénérée', () => {
		const { labels } = renderAxes({
			xMin: 1e6 - 5e-10,
			xMax: 1e6 + 5e-10,
			yMin: 1e6 - 5e-10,
			yMax: 1e6 + 5e-10
		});

		expect(labels).toHaveLength(0);
	});
});
