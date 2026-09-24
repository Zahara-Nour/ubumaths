import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GraphSVG from '../GraphSVG.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';

/**
 * Épingler une étiquette passe par un vrai geste : appuyer marque le graphe
 * comme « en interaction », ce qui met les analyses en sommeil. Fabriquer un
 * `click()` court-circuiterait précisément l'étape qui casse — d'où la
 * séquence complète, pointerdown puis pointerup.
 */
describe('GraphSVG — épingler une étiquette au clic', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setInteracting(false);
	});

	/** Dimensions par défaut du composant : le conteneur n'est pas mesuré ici. */
	const WIDTH = 800;
	const HEIGHT = 600;

	const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

	/**
	 * Appui puis relâchement au même endroit, comme un doigt ou une souris.
	 *
	 * Chaque étape est séparée par une attente : dans la vraie vie plusieurs
	 * millisecondes s'écoulent, ce qui laisse le survol se propager avant
	 * l'appui, puis les analyses s'endormir pendant l'appui.
	 */
	async function clickAt(svg: Element, svgX: number, svgY: number) {
		const rect = svg.getBoundingClientRect();
		const options = {
			clientX: rect.left + svgX,
			clientY: rect.top + svgY,
			bubbles: true,
			pointerId: 1,
			button: 0
		};

		svg.dispatchEvent(new PointerEvent('pointermove', options));
		await flush();

		svg.dispatchEvent(new PointerEvent('pointerdown', options));
		// Un clic humain dure ; c'est pendant ce temps que les analyses
		// s'endorment et que le point disparaît de sous le curseur.
		await flush();

		svg.dispatchEvent(new PointerEvent('pointerup', options));
		await flush();
	}

	it('épingle le terme sous le curseur, analyses en sommeil comprises', async () => {
		const id = grapheurStore.addSequence('explicit', '2n');
		grapheurStore.updateSequence(id, { firstIndex: 0 });
		grapheurStore.setViewport({ xMin: -1, xMax: 6, yMin: -2, yMax: 12 });

		const { container } = await render(GraphSVG, {});
		const svg = container.querySelector('svg');
		expect(svg).not.toBeNull();

		// Le terme de rang 2 vaut 4 : on vise son point dans le repère du SVG.
		await clickAt(svg!, (WIDTH * (2 - -1)) / 7, (HEIGHT * (12 - 4)) / 14);

		expect(grapheurStore.pinnedLabels).toHaveLength(1);
		expect(grapheurStore.pinnedLabels[0]).toMatchObject({ kind: 'term', rank: 2 });
		// Le premier clic montre la décimale : l'exacte est déjà au survol.
		expect(grapheurStore.pinnedLabels[0].showsExact).toBe(false);
	});

	// Le vrai piège : appuyer met le graphe « en interaction », ce qui met les
	// analyses en sommeil. Une racine n'est donc plus sous le curseur au moment
	// du relâchement — seule la cible capturée à l'appui la retrouve.
	it('épingle une racine, que l’appui fait disparaître des analyses', async () => {
		grapheurStore.addFunction('x^2-2');
		grapheurStore.setViewport({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });

		const { container } = await render(GraphSVG, {});
		const svg = container.querySelector('svg');

		// La racine √2, sur l'axe des abscisses.
		await clickAt(svg!, (WIDTH * (Math.SQRT2 + 5)) / 10, (HEIGHT * 5) / 10);

		expect(grapheurStore.pinnedLabels).toHaveLength(1);
		expect(grapheurStore.pinnedLabels[0]).toMatchObject({ kind: 'point', pointType: 'root' });
	});

	// Le survol dessine son étiquette au même endroit que celle du clic : si
	// elle reste au-dessus, cliquer semble ne rien faire, puisque la valeur
	// exacte du survol masque la décimale que le clic vient de poser.
	it('montre la décimale du clic, curseur toujours sur le point', async () => {
		const id = grapheurStore.addSequence('explicit', '3\\cdot\\left(-\\frac12\\right)^n');
		grapheurStore.updateSequence(id, { firstIndex: 0 });
		grapheurStore.setViewport({ xMin: -1, xMax: 6, yMin: -4, yMax: 4 });

		const { container } = await render(GraphSVG, {});
		const svg = container.querySelector('svg');

		// Le terme de rang 3 vaut -0.375, soit -3/8.
		await clickAt(svg!, (WIDTH * (3 - -1)) / 7, (HEIGHT * (4 - -0.375)) / 8);

		expect(grapheurStore.pinnedLabels).toHaveLength(1);
		expect(container.textContent).toContain('0.375');

		// Une seule boîte sur le point : celle du clic. Deux superposées et
		// c'est l'exacte du survol qu'on lit, par-dessus la décimale.
		expect(container.querySelectorAll('.tooltip-bg')).toHaveLength(1);
	});

	it('ne fige rien quand le geste était un déplacement', async () => {
		const id = grapheurStore.addSequence('explicit', '2n');
		grapheurStore.updateSequence(id, { firstIndex: 0 });
		grapheurStore.setViewport({ xMin: -1, xMax: 6, yMin: -2, yMax: 12 });

		const { container } = await render(GraphSVG, {});
		const svg = container.querySelector('svg');
		const rect = svg!.getBoundingClientRect();
		const x = rect.left + (WIDTH * (2 - -1)) / 7;
		const y = rect.top + (HEIGHT * (12 - 4)) / 14;

		const down = { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0 };
		svg!.dispatchEvent(new PointerEvent('pointermove', down));
		await flush();

		svg!.dispatchEvent(new PointerEvent('pointerdown', down));
		// Relâché 40 pixels plus loin : c'est un déplacement du graphe.
		svg!.dispatchEvent(
			new PointerEvent('pointerup', { ...down, clientX: x + 40, clientY: y + 40 })
		);
		await flush();

		expect(grapheurStore.pinnedLabels).toHaveLength(0);
	});
});
