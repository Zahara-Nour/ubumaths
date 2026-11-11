import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GraphSVG from '../GraphSVG.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { grapheurContext } from '$lib/stores/grapheur-context';

// Une instance neuve par test, fournie aux composants par le contexte.
let grapheurStore = new GrapheurStore();

/** Plus long que le délai de fin de molette (150 ms). */
const AFTER_WHEEL = 300;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * La molette est une interaction, comme le glisser : pendant le geste, les
 * analyses (points remarquables, intersections) dorment ; elles ne tournent
 * qu'une fois, quand la molette s'arrête. Sans cela, chaque cran relançait
 * l'analyse de toutes les courbes et les intersections de toutes les paires —
 * environ 150 ms par cran avec dix courbes sur un appareil modeste.
 */
describe('GraphSVG — la molette est une interaction', () => {
	beforeEach(() => {
		grapheurStore = new GrapheurStore();
		grapheurStore.setInteracting(false);
	});

	async function mount() {
		const { container } = await render(GraphSVG, { context: grapheurContext(grapheurStore) });
		const svg = container.querySelector('svg');
		expect(svg).not.toBeNull();
		return svg!;
	}

	function wheel(svg: Element, deltaY = -120) {
		const rect = svg.getBoundingClientRect();
		svg.dispatchEvent(
			new WheelEvent('wheel', {
				deltaY,
				clientX: rect.left + rect.width / 2,
				clientY: rect.top + rect.height / 2,
				bubbles: true,
				cancelable: true
			})
		);
	}

	it('zoome, marque l’interaction, puis la clôt quand la molette s’arrête', async () => {
		const svg = await mount();
		const before = grapheurStore.viewport.xMax - grapheurStore.viewport.xMin;

		wheel(svg);

		expect(grapheurStore.viewport.xMax - grapheurStore.viewport.xMin).toBeLessThan(before);
		expect(grapheurStore.isInteracting).toBe(true);

		await wait(AFTER_WHEEL);
		expect(grapheurStore.isInteracting).toBe(false);
	});

	it('reste en interaction tant que les crans s’enchaînent', async () => {
		const svg = await mount();

		for (let i = 0; i < 4; i++) {
			wheel(svg);
			await wait(60);
			expect(grapheurStore.isInteracting).toBe(true);
		}

		await wait(AFTER_WHEEL);
		expect(grapheurStore.isInteracting).toBe(false);
	});

	it('ne clôt pas un glisser en cours quand la molette s’arrête', async () => {
		const svg = await mount();
		const rect = svg.getBoundingClientRect();
		const options = {
			clientX: rect.left + 100,
			clientY: rect.top + 100,
			bubbles: true,
			pointerId: 1,
			button: 0
		};

		svg.dispatchEvent(new PointerEvent('pointerdown', options));
		wheel(svg);
		await wait(AFTER_WHEEL);
		expect(grapheurStore.isInteracting).toBe(true);

		svg.dispatchEvent(new PointerEvent('pointerup', options));
		expect(grapheurStore.isInteracting).toBe(false);
	});
});
