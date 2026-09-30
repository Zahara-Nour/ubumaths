/**
 * Défilement automatique, pause, plein écran et adresse de page, vus depuis
 * le Deck rendu (Deck + Slide réels, via DeckHarness).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import DeckHarness from './DeckHarness.svelte';
import type { DeckConfig, DeckContext } from '../types.js';

interface Setup {
	durations: Array<number | undefined>;
	config?: Partial<DeckConfig>;
	onend?: () => void;
}

async function open(setup: Setup) {
	let deck: DeckContext | undefined;
	const result = await render(DeckHarness, {
		...setup,
		onprobe: (context: DeckContext) => {
			deck = context;
		}
	});
	flushSync();
	await tick();
	if (!deck) throw new Error('DeckContext non reçu');
	return { ...result, deck };
}

// Avance le temps simulé puis laisse les effets du Deck s'exécuter
function elapse(ms: number) {
	vi.advanceTimersByTime(ms);
	flushSync();
}

describe('défilement automatique', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('passe à la diapositive suivante quand la durée est écoulée', async () => {
		const { deck } = await open({ durations: [1000, 1000, 1000] });
		expect(deck.getIndices().h).toBe(0);

		elapse(999);
		expect(deck.getIndices().h).toBe(0);
		elapse(1);
		expect(deck.getIndices().h).toBe(1);
		elapse(1000);
		expect(deck.getIndices().h).toBe(2);
	});

	it('sur la dernière diapositive : émet onend une fois, sans boucler', async () => {
		const onend = vi.fn();
		const { deck } = await open({ durations: [1000, 1000], onend });

		elapse(1000);
		elapse(1000);
		expect(onend).toHaveBeenCalledTimes(1);
		expect(deck.getIndices().h).toBe(1);

		elapse(10_000);
		expect(onend).toHaveBeenCalledTimes(1);
		expect(deck.getIndices().h).toBe(1);
	});

	it('la durée de la diapositive l’emporte sur celle du deck', async () => {
		const { deck } = await open({ durations: [1000, undefined], config: { autoSlide: 5000 } });
		expect(deck.getAutoSlideDuration()).toBe(1000);

		elapse(1000);
		expect(deck.getIndices().h).toBe(1);
		expect(deck.getAutoSlideDuration()).toBe(5000);
	});

	it('aucune durée nulle part : pas de défilement', async () => {
		const { deck } = await open({ durations: [undefined, undefined] });
		elapse(60_000);
		expect(deck.getIndices().h).toBe(0);
		expect(deck.getAutoSlideDuration()).toBe(0);
	});

	it('pause / reprise exposées par le contexte gèlent et reprennent le compte', async () => {
		const { deck } = await open({ durations: [1000, 1000] });
		elapse(400);
		deck.pause();
		flushSync();
		expect(deck.isPaused()).toBe(true);
		elapse(10_000);
		expect(deck.getIndices().h).toBe(0);
		expect(deck.getAutoSlideRemaining()).toBe(600);

		deck.resume();
		flushSync();
		elapse(600);
		expect(deck.getIndices().h).toBe(1);

		deck.togglePause();
		flushSync();
		expect(deck.isPaused()).toBe(true);
	});

	it('la vue d’ensemble gèle le compte', async () => {
		const { deck } = await open({ durations: [1000, 1000] });
		deck.getStore().setOverview(true);
		flushSync();
		elapse(10_000);
		expect(deck.getIndices().h).toBe(0);
	});

	it('revenir sur une diapositive terminée met en pause, la reprise relance sa durée', async () => {
		const { deck } = await open({ durations: [1000, 5000] });
		elapse(1000);
		expect(deck.getIndices().h).toBe(1);

		deck.slide(0);
		flushSync();
		expect(deck.isPaused()).toBe(true);
		elapse(10_000);
		expect(deck.getIndices().h).toBe(0);

		deck.resume();
		flushSync();
		expect(deck.getAutoSlideRemaining()).toBe(1000);
		elapse(1000);
		expect(deck.getIndices().h).toBe(1);
	});

	it('la prop autoSlide est réactive : l’écart s’ajoute au temps restant', async () => {
		const durations = $state<Array<number | undefined>>([1000, 1000]);
		const { deck } = await open({ durations });
		elapse(500);

		durations[0] = 3000;
		flushSync();
		expect(deck.getAutoSlideDuration()).toBe(3000);
		expect(deck.getAutoSlideRemaining()).toBe(2500);
		elapse(2499);
		expect(deck.getIndices().h).toBe(0);
		elapse(1);
		expect(deck.getIndices().h).toBe(1);
	});

	it('le snippet overlay reçoit le contexte et affiche le temps restant', async () => {
		const { container } = await open({ durations: [1000, 1000] });
		const remaining = () => container.querySelector('[data-testid="remaining"]')?.textContent;
		expect(remaining()).toBe('1000');
		expect(container.querySelector('[data-testid="duration"]')?.textContent).toBe('1000');

		elapse(300);
		expect(remaining()).toBe('700');
	});
});

describe('plein écran réel', () => {
	let fullscreenElement: Element | null = null;

	// Ce que ferait le navigateur : l'élément passe en plein écran, puis l'événement
	function enterFullscreen(element: Element) {
		fullscreenElement = element;
		document.dispatchEvent(new Event('fullscreenchange'));
	}

	beforeEach(() => {
		fullscreenElement = null;
		Object.defineProperty(document, 'fullscreenElement', {
			configurable: true,
			get: () => fullscreenElement
		});
	});
	afterEach(() => {
		// Rend la propriété native du prototype
		delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
		vi.restoreAllMocks();
	});

	it('la touche f demande le plein écran sur l’élément du Deck, puis le quitte', async () => {
		const request = vi
			.spyOn(HTMLElement.prototype, 'requestFullscreen')
			.mockImplementation(async function (this: HTMLElement) {
				enterFullscreen(this);
			});
		const exit = vi.spyOn(document, 'exitFullscreen').mockImplementation(async () => {
			fullscreenElement = null;
			document.dispatchEvent(new Event('fullscreenchange'));
		});
		const { container, deck } = await open({ durations: [undefined] });
		const wrapper = container.querySelector<HTMLElement>('.deck-wrapper')!;

		wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
		await tick();
		await Promise.resolve();
		flushSync();

		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.contexts[0]).toBe(wrapper);
		expect(deck.isFullscreen()).toBe(true);

		await deck.toggleFullscreen();
		flushSync();
		expect(exit).toHaveBeenCalledTimes(1);
		expect(deck.isFullscreen()).toBe(false);
	});

	it('reflète une sortie du plein écran faite par le navigateur (Échap)', async () => {
		const { container, deck } = await open({ durations: [undefined] });
		const wrapper = container.querySelector<HTMLElement>('.deck-wrapper')!;

		fullscreenElement = wrapper;
		document.dispatchEvent(new Event('fullscreenchange'));
		flushSync();
		expect(deck.isFullscreen()).toBe(true);

		fullscreenElement = null;
		document.dispatchEvent(new Event('fullscreenchange'));
		flushSync();
		expect(deck.isFullscreen()).toBe(false);
	});
});

describe('adresse de page', () => {
	let initialHref: string;

	beforeEach(() => {
		initialHref = window.location.href;
	});
	afterEach(() => {
		history.replaceState(history.state, '', initialHref);
	});

	it('hash: false n’écrit jamais dans l’URL', async () => {
		const { deck } = await open({ durations: [undefined, undefined, undefined] });
		deck.next();
		flushSync();
		await tick();
		deck.slide(2);
		flushSync();
		await tick();

		expect(deck.getIndices().h).toBe(2);
		expect(window.location.href).toBe(initialHref);
	});

	it('témoin : hash: true écrit bien la position dans l’URL', async () => {
		const { deck } = await open({
			durations: [undefined, undefined, undefined],
			config: { hash: true }
		});
		deck.slide(2);
		flushSync();
		await tick();

		expect(window.location.hash).toBe('#/2');
	});
});
