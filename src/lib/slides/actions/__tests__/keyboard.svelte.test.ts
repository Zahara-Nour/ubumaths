/**
 * Flèches du clavier : → montre le fragment suivant avant de changer de
 * diapositive, ← le cache (écarts E36, E37 : → sautait les fragments)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { keyboard } from '../keyboard.js';
import { createDeckStore } from '../../stores/deckStore.svelte.js';

// Fonctions

function slideWithFragments(count: number): HTMLElement {
	const element = document.createElement('div');
	for (let i = 0; i < count; i++) {
		const fragment = document.createElement('p');
		fragment.classList.add('fragment');
		element.appendChild(fragment);
	}
	return element;
}

function press(node: HTMLElement, key: string): void {
	node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('keyboard : flèches et fragments', () => {
	let destroy: (() => void) | undefined;

	afterEach(() => destroy?.());

	it('→ montre chaque fragment, puis passe à la diapositive suivante ; ← revient', () => {
		const store = createDeckStore();
		store.registerSlide({ h: 0, v: 0, element: slideWithFragments(3) });
		store.registerSlide({ h: 1, v: 0, element: slideWithFragments(0) });
		const node = document.createElement('div');
		destroy = keyboard(node, { store, enabled: true }).destroy;

		press(node, 'ArrowRight');
		expect(store.state).toEqual({ h: 0, v: 0, f: 0 });
		press(node, 'ArrowRight');
		press(node, 'ArrowRight');
		expect(store.state).toEqual({ h: 0, v: 0, f: 2 });
		press(node, 'ArrowRight');
		expect(store.state).toEqual({ h: 1, v: 0, f: -1 });

		press(node, 'ArrowLeft');
		expect(store.state).toEqual({ h: 0, v: 0, f: 2 });
		press(node, 'ArrowLeft');
		expect(store.state).toEqual({ h: 0, v: 0, f: 1 });
	});
});
