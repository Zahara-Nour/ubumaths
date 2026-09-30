/**
 * Filtre des frappes et des gestes venant d'un champ de saisie.
 *
 * Une frappe dans un champ (input, textarea, contentEditable, champ MathLive
 * `<math-field>`, y compris depuis son shadow DOM) ne doit PAS piloter le
 * diaporama : « n » ou « espace » servent à écrire la réponse.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { keyboard } from '../keyboard.js';
import { swipe } from '../swipe.js';
import { createDeckStore, type DeckStore } from '../../stores/deckStore.svelte.js';

// Deux diapositives horizontales, position 0
function storeWithTwoSlides(): DeckStore {
	const store = createDeckStore();
	store.registerSlide({ h: 0, v: 0, element: document.createElement('div') });
	store.registerSlide({ h: 1, v: 0, element: document.createElement('div') });
	return store;
}

let root: HTMLElement;

function mount(): HTMLElement {
	root = document.createElement('div');
	document.body.appendChild(root);
	return root;
}

afterEach(() => {
	root?.remove();
});

function pressFrom(target: HTMLElement, key: string) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
}

describe('clavier : frappes venant de la diapositive', () => {
	it('une frappe hors champ fait avancer (témoin)', () => {
		const node = mount();
		const store = storeWithTwoSlides();
		const action = keyboard(node, { store, enabled: true });
		const div = document.createElement('div');
		node.appendChild(div);

		pressFrom(div, 'ArrowRight');

		expect(store.h).toBe(1);
		action.destroy();
	});

	it.each(['input', 'textarea'])('ignore une frappe dans un <%s>', (tag) => {
		const node = mount();
		const store = storeWithTwoSlides();
		const action = keyboard(node, { store, enabled: true });
		const field = document.createElement(tag);
		node.appendChild(field);

		pressFrom(field, 'ArrowRight');

		expect(store.h).toBe(0);
		action.destroy();
	});

	it('ignore une frappe dans un champ MathLive <math-field>', () => {
		const node = mount();
		const store = storeWithTwoSlides();
		const action = keyboard(node, { store, enabled: true });
		const field = document.createElement('math-field');
		node.appendChild(field);

		pressFrom(field, 'n');

		expect(store.h).toBe(0);
		action.destroy();
	});

	it("ignore une frappe venant du shadow DOM d'un <math-field>", () => {
		const node = mount();
		const store = storeWithTwoSlides();
		const action = keyboard(node, { store, enabled: true });
		const field = document.createElement('math-field');
		node.appendChild(field);
		// Le vrai MathLive tape dans un élément interne de son shadow root
		const shadow = field.attachShadow({ mode: 'open' });
		const inner = document.createElement('span');
		shadow.appendChild(inner);

		pressFrom(inner, ' ');

		expect(store.h).toBe(0);
		action.destroy();
	});

	it("ignore une frappe dans un élément imbriqué d'un contentEditable", () => {
		const node = mount();
		const store = storeWithTwoSlides();
		const action = keyboard(node, { store, enabled: true });
		const editable = document.createElement('div');
		editable.contentEditable = 'true';
		const inner = document.createElement('b');
		editable.appendChild(inner);
		node.appendChild(editable);

		pressFrom(inner, 'ArrowRight');

		expect(store.h).toBe(0);
		action.destroy();
	});
});

// Geste de balayage vers la gauche (= suivante) commençant sur `target`
function swipeLeftFrom(target: HTMLElement) {
	const start = new Touch({ identifier: 1, target, clientX: 300, clientY: 100 });
	const end = new Touch({ identifier: 1, target, clientX: 100, clientY: 100 });
	target.dispatchEvent(
		new TouchEvent('touchstart', {
			touches: [start],
			changedTouches: [start],
			bubbles: true,
			composed: true
		})
	);
	target.dispatchEvent(
		new TouchEvent('touchend', {
			touches: [],
			changedTouches: [end],
			bubbles: true,
			composed: true,
			cancelable: true
		})
	);
}

describe('balayage : geste commencé dans un champ', () => {
	it('un balayage hors champ déclenche la navigation (témoin)', () => {
		const node = mount();
		let swiped = 0;
		const action = swipe(node, { onSwipeLeft: () => swiped++ });
		const div = document.createElement('div');
		node.appendChild(div);

		swipeLeftFrom(div);

		expect(swiped).toBe(1);
		action?.destroy?.();
	});

	it.each(['input', 'textarea', 'math-field'])(
		'ignore un balayage commencé dans un <%s>',
		(tag) => {
			const node = mount();
			let swiped = 0;
			const action = swipe(node, { onSwipeLeft: () => swiped++ });
			const field = document.createElement(tag);
			node.appendChild(field);

			swipeLeftFrom(field);

			expect(swiped).toBe(0);
			action?.destroy?.();
		}
	);
});
