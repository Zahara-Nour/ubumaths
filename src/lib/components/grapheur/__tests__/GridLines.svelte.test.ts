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

	/**
	 * Loin de l'origine et très zoomée, la fenêtre atteint un pas si petit que
	 * `x + pas === x` en flottant : une boucle qui accumule n'avance plus jamais.
	 * Le glissement d'axe y mène, `setViewport` ne bornant pas l'amplitude.
	 */
	it('ne boucle pas sur une fenêtre dégénérée', () => {
		const { verticalMajor, horizontalMajor } = renderGrid({
			xMin: 1e6 - 5e-10,
			xMax: 1e6 + 5e-10,
			yMin: -10,
			yMax: 10
		});

		expect(verticalMajor).toHaveLength(0);
		expect(horizontalMajor.length).toBeGreaterThan(0);
	});

	it('plafonne le nombre de lignes par axe', () => {
		const { verticalMajor, horizontalMajor } = renderGrid({
			xMin: -1e-300,
			xMax: 1e-300,
			yMin: -10,
			yMax: 10
		});

		expect(verticalMajor.length).toBeLessThanOrEqual(400);
		expect(horizontalMajor.length).toBeLessThanOrEqual(400);
	});

	/**
	 * Le critère est l'espacement en **pixels**, pas un nombre de lignes : c'est
	 * le seul qui garde un sens quand les deux axes portent des échelles
	 * différentes. Deux amplitudes égales sur un canevas non carré donnent donc
	 * deux pas différents — et c'est voulu.
	 */
	it('gradue selon les pixels, pas selon l’amplitude', () => {
		const { verticalMajor, horizontalMajor } = renderGrid({
			xMin: -10,
			xMax: 10,
			yMin: -10,
			yMax: 10
		});

		// 800 px pour 20 unités → 40 px/unité → pas de 2 : -10, -8, …, 10.
		expect(verticalMajor).toHaveLength(11);
		// 400 px pour 20 unités → 20 px/unité → pas de 5 : -10, -5, 0, 5, 10.
		expect(horizontalMajor).toHaveLength(5);
	});

	it('donne le même pas aux deux axes sur un canevas carré', () => {
		const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
		const { container } = render(GridLines, {
			viewport,
			transformer: createTransformer(viewport, 800, 800),
			width: 800,
			height: 800
		});

		const lines = [...container.querySelectorAll<SVGLineElement>('.grid-major line')];
		const vertical = lines.filter((l) => l.getAttribute('x1') === l.getAttribute('x2'));

		expect(vertical).toHaveLength(11);
		expect(lines).toHaveLength(22);
	});
});
