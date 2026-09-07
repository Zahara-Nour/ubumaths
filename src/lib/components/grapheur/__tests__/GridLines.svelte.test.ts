import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GridLines from '../GridLines.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { Viewport } from '$lib/grapheur/types';

const WIDTH = 800;
const HEIGHT = 400;

function renderGrid(viewport: Viewport) {
	const { container } = render(GridLines, {
		viewport,
		transformer: createTransformer(viewport, WIDTH, HEIGHT),
		width: WIDTH,
		height: HEIGHT
	});

	const lines = (selector: string) => [...container.querySelectorAll<SVGLineElement>(selector)];
	const isVertical = (l: SVGLineElement) => l.getAttribute('x1') === l.getAttribute('x2');

	return {
		verticalMajor: lines('.grid-major line').filter(isVertical),
		horizontalMajor: lines('.grid-major line').filter((l) => !isVertical(l))
	};
}

/**
 * Tirer sur un seul axe pour le redimensionner est la fonctionnalité qui
 * distingue le grapheur : la grille doit la suivre. Un pas unique tiré de la
 * plus grande des deux amplitudes vidait la grille de ses lignes verticales dès
 * que les deux échelles s'écartaient, alors que les graduations, elles, restent
 * calculées axe par axe.
 */
describe('GridLines', () => {
	it('gradue chaque axe séparément quand les échelles diffèrent', () => {
		const { verticalMajor, horizontalMajor } = renderGrid({
			xMin: -10,
			xMax: 10,
			yMin: -1000,
			yMax: 1000
		});

		expect(verticalMajor.length).toBeGreaterThanOrEqual(5);
		expect(horizontalMajor.length).toBeGreaterThanOrEqual(5);
	});

	it('suit aussi un axe des ordonnées écrasé', () => {
		const { verticalMajor, horizontalMajor } = renderGrid({
			xMin: -500,
			xMax: 500,
			yMin: -1,
			yMax: 1
		});

		expect(verticalMajor.length).toBeGreaterThanOrEqual(5);
		expect(horizontalMajor.length).toBeGreaterThanOrEqual(5);
	});

	it('ne change rien quand les deux amplitudes sont égales', () => {
		const { verticalMajor, horizontalMajor } = renderGrid({
			xMin: -10,
			xMax: 10,
			yMin: -10,
			yMax: 10
		});

		// Pas majeur de 2 sur [-10 ; 10] : -10, -8, …, 10.
		expect(verticalMajor).toHaveLength(11);
		expect(horizontalMajor).toHaveLength(11);
	});
});
