import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ViewportControls from '../ViewportControls.svelte';
import KeyboardHandler from '../KeyboardHandler.svelte';
import { GrapheurStore, BRIEF_GESTURE_DELAY } from '$lib/stores/grapheur.svelte';
import { grapheurContext } from '$lib/stores/grapheur-context';

// Une instance neuve par test, fournie aux composants par le contexte.
let grapheurStore = new GrapheurStore();

/** Un peu plus long que le délai de fin d'un geste bref. */
const AFTER = BRIEF_GESTURE_DELAY + 50;

const width = () => grapheurStore.viewport.xMax - grapheurStore.viewport.xMin;

/**
 * Zoomer aux boutons ou au clavier, ou déplacer la vue aux flèches, est un
 * geste bref : les analyses dorment pendant que les appuis s'enchaînent et ne
 * tournent qu'une fois après le dernier (comme la molette).
 */
describe('zoom au clavier et aux boutons — geste bref', () => {
	beforeEach(() => {
		grapheurStore = new GrapheurStore();
		grapheurStore.setInteracting(false);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('le bouton « Zoom avant » zoome et marque un geste bref', async () => {
		const screen = await render(ViewportControls, {
			props: { svgWidth: 400, svgHeight: 300 },
			context: grapheurContext(grapheurStore)
		});
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const before = width();

		const button = screen.container.querySelector<HTMLButtonElement>(
			'button[aria-label="Zoom avant"]'
		);
		button!.click();

		expect(width()).toBeLessThan(before);
		expect(grapheurStore.isInteracting).toBe(true);
		vi.advanceTimersByTime(AFTER);
		expect(grapheurStore.isInteracting).toBe(false);
	});

	it('le bouton « Zoom arrière » marque aussi un geste bref', async () => {
		const screen = await render(ViewportControls, {
			props: { svgWidth: 400, svgHeight: 300 },
			context: grapheurContext(grapheurStore)
		});
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const before = width();

		screen.container.querySelector<HTMLButtonElement>('button[aria-label="Zoom arrière"]')!.click();

		expect(width()).toBeGreaterThan(before);
		expect(grapheurStore.isInteracting).toBe(true);
	});

	it.each(['+', '-', 'ArrowLeft', 'ArrowUp'])(
		'la touche %s marque un geste bref, clos après le délai',
		async (key) => {
			await render(KeyboardHandler, { context: grapheurContext(grapheurStore) });
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			const before = { ...grapheurStore.viewport };

			window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

			expect(grapheurStore.viewport).not.toEqual(before);
			expect(grapheurStore.isInteracting).toBe(true);
			vi.advanceTimersByTime(AFTER);
			expect(grapheurStore.isInteracting).toBe(false);
		}
	);
});
