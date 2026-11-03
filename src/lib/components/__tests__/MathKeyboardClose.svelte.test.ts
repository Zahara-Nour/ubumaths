/**
 * MathKeyboardClose — bouton « Fermer le clavier » au-dessus du clavier virtuel MathLive.
 *
 * Faux clavier (`window.mathVirtualKeyboard`) : monter le vrai clavier dans le test
 * (`initVirtualKeyboardInCurrentBrowsingContext`) accroche un écouteur à `window.top`, la page
 * de vitest partagée par tous les fichiers du shard ; il survit à l'iframe du test et a fait
 * tomber le navigateur de la CI sur le fichier suivant (#2353). Le piège de `blur()` côté
 * MathLive, lui, ne se reproduit qu'avec l'émulation tactile : il est mesuré au navigateur
 * (docs/wip/clavier-mathlive-progress.md), pas ici.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MathKeyboardClose from '../MathKeyboardClose.svelte';

/** Faux clavier : ce que le composant lit (`visible`, `boundingRect`) et ses deux événements */
class FakeKeyboard extends EventTarget {
	visible = false;
	boundingRect = new DOMRect(0, 0, 0, 0);

	open(height: number) {
		this.visible = true;
		this.boundingRect = new DOMRect(0, window.innerHeight - height, window.innerWidth, height);
		this.dispatchEvent(new Event('virtual-keyboard-toggle'));
	}

	close() {
		this.visible = false;
		this.boundingRect = new DOMRect(0, 0, 0, 0);
		this.dispatchEvent(new Event('virtual-keyboard-toggle'));
	}

	/** Changement de géométrie sans fermeture (onglets remis à zéro, rotation…) */
	reflow() {
		this.dispatchEvent(new Event('geometrychange'));
	}
}

const KEYBOARD_HEIGHT = 200;

describe('MathKeyboardClose', () => {
	let keyboard: FakeKeyboard;
	let field: HTMLElement;

	beforeEach(() => {
		keyboard = new FakeKeyboard();
		Object.defineProperty(window, 'mathVirtualKeyboard', {
			value: keyboard,
			configurable: true,
			writable: true
		});
		// Un `math-field` focalisable, sans charger MathLive
		field = document.createElement('math-field');
		field.tabIndex = 0;
		document.body.append(field);
	});

	afterEach(() => {
		field.remove();
		Reflect.deleteProperty(window, 'mathVirtualKeyboard');
	});

	const button = () => page.getByRole('button', { name: 'Fermer le clavier' });

	it("n'affiche rien tant que le clavier est fermé", async () => {
		await render(MathKeyboardClose);
		field.focus();
		await expect.element(button()).not.toBeInTheDocument();
	});

	it('apparaît juste au-dessus du clavier ouvert', async () => {
		await render(MathKeyboardClose);
		keyboard.open(KEYBOARD_HEIGHT);
		await expect.element(button()).toBeVisible();
		const bottom = button().element().getBoundingClientRect().bottom;
		expect(bottom).toBeLessThanOrEqual(window.innerHeight - KEYBOARD_HEIGHT);
		expect(bottom).toBeGreaterThan(window.innerHeight - KEYBOARD_HEIGHT - 20);
	});

	it('prend le focus au clic, comme un toucher sur iOS où le bouton ne le prend pas seul', async () => {
		await render(MathKeyboardClose);
		field.focus();
		keyboard.open(KEYBOARD_HEIGHT);
		await expect.element(button()).toBeVisible();

		const focused: EventTarget[] = [];
		const track = (event: FocusEvent) => event.target && focused.push(event.target);
		document.addEventListener('focusin', track);
		// Clic programmatique : il ne déplace pas le focus de lui-même
		(button().element() as HTMLButtonElement).click();
		document.removeEventListener('focusin', track);

		expect(focused[0]).toBeInstanceOf(HTMLButtonElement);
		expect(document.activeElement).not.toBe(field);
	});

	it('reste caché pendant la fermeture, même si la géométrie du clavier change', async () => {
		await render(MathKeyboardClose);
		field.focus();
		keyboard.open(KEYBOARD_HEIGHT);
		await expect.element(button()).toBeVisible();

		(button().element() as HTMLButtonElement).click();
		await expect.element(button()).not.toBeInTheDocument();
		// MathLive n'a pas encore fermé (≈ 300 ms) : un changement de géométrie arrive
		keyboard.reflow();
		await expect.element(button()).not.toBeInTheDocument();

		keyboard.close();
		await expect.element(button()).not.toBeInTheDocument();
	});

	it('revient quand un champ reprend le focus et que le clavier se rouvre', async () => {
		await render(MathKeyboardClose);
		field.focus();
		keyboard.open(KEYBOARD_HEIGHT);
		await expect.element(button()).toBeVisible();
		(button().element() as HTMLButtonElement).click();
		await expect.element(button()).not.toBeInTheDocument();

		// Toucher le champ avant même la fermeture : le clavier reste ouvert, le bouton revient
		field.focus();
		keyboard.reflow();
		await expect.element(button()).toBeVisible();
	});
});
