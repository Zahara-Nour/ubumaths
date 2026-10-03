import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ScatterPlot from '../ScatterPlot.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { ScatterPlottable, Viewport } from '$lib/grapheur/types';

/**
 * Le nuage de deux séries saisies par l'élève — décision Q3.
 *
 * ⚠️ À ne pas confondre avec le nuage d'une SUITE : là l'abscisse est le rang
 * et l'ordonnée vient d'une formule. Ici les deux coordonnées sont des données.
 */
describe('ScatterPlot', () => {
	const viewport: Viewport = { xMin: -2, xMax: 12, yMin: -2, yMax: 12 };
	const transformer = createTransformer(viewport, 700, 700);

	function scatter(overrides: Partial<ScatterPlottable> = {}): ScatterPlottable {
		return {
			id: '55555555-5555-4555-8555-555555555555',
			type: 'scatter',
			label: 'L / M',
			xs: [1, 2, 3],
			ys: [2, 4, 6],
			color: '#d946ef',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid',
			...overrides
		};
	}

	const pointsOf = (container: HTMLElement) => container.querySelectorAll('circle.scatter-point');

	it('dessine un point par paire', async () => {
		const { container } = await render(ScatterPlot, { scatter: scatter(), transformer });

		expect(pointsOf(container).length).toBe(3);
	});

	// Couleur RENDUE (getComputedStyle), pas l'attribut : la couleur passe par le
	// style, et une identité de palette ne se lit qu'une fois le thème appliqué.
	it('leur donne la couleur de l’objet', async () => {
		const { container } = await render(ScatterPlot, { scatter: scatter(), transformer });

		expect(getComputedStyle(pointsOf(container)[0]).fill).toBe('rgb(217, 70, 239)');
	});

	it('peint une couleur de la palette dans la variante du mode courant', async () => {
		const root = document.documentElement;
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ color: 'curve-1' }),
			transformer
		});
		const point = pointsOf(container)[0];

		try {
			root.style.colorScheme = 'light';
			expect(getComputedStyle(point).fill).toBe('rgb(1, 124, 183)'); // #017cb7
			root.style.colorScheme = 'dark';
			expect(getComputedStyle(point).fill).toBe('rgb(34, 139, 199)'); // #228bc7
		} finally {
			root.style.colorScheme = '';
		}
	});

	it('les place aux bonnes coordonnées', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ xs: [0], ys: [0] }),
			transformer
		});

		const attendu = transformer.mathToSvg(0, 0);
		const point = pointsOf(container)[0];
		expect(Number(point.getAttribute('cx'))).toBeCloseTo(attendu.x, 3);
		expect(Number(point.getAttribute('cy'))).toBeCloseTo(attendu.y, 3);
	});

	// §4 L1 : une liste plus longue que l'autre est ordinaire, pas une faute
	it('s’arrête à la plus courte des deux séries', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ xs: [1, 2, 3, 4, 5], ys: [2, 4, 6] }),
			transformer
		});

		expect(pointsOf(container).length).toBe(3);
	});

	// ⚠️ Un NaN projeté donne un attribut SVG invalide, que le navigateur
	// abandonne SANS RIEN DIRE — le point disparaîtrait, et les autres avec lui
	// si l'on ne filtrait pas.
	it('saute une valeur non finie sans perdre les autres', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ xs: [1, Number.NaN, 3], ys: [2, 4, 6] }),
			transformer
		});

		expect(pointsOf(container).length).toBe(2);
	});

	it('saute aussi un infini', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ xs: [1, 2], ys: [2, Number.POSITIVE_INFINITY] }),
			transformer
		});

		expect(pointsOf(container).length).toBe(1);
	});

	it('ne dessine rien quand il est masqué', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ visible: false }),
			transformer
		});

		expect(pointsOf(container).length).toBe(0);
	});

	it('ne dessine rien d’une série vide, sans erreur', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ xs: [], ys: [] }),
			transformer
		});

		expect(pointsOf(container).length).toBe(0);
	});

	// Une donnée légitime : trois fois la même ordonnée se trace
	it('dessine des points alignés horizontalement', async () => {
		const { container } = await render(ScatterPlot, {
			scatter: scatter({ xs: [1, 2, 3], ys: [4, 4, 4] }),
			transformer
		});

		expect(pointsOf(container).length).toBe(3);
	});
});
