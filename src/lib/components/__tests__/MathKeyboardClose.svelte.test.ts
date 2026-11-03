/**
 * MathKeyboardClose — bouton « Fermer le clavier » au-dessus du clavier virtuel MathLive.
 *
 * Avec le vrai MathLive : le piège mesuré (un `blur()` sur le champ le laisse se croire
 * actif, et il rouvre le clavier) ne se voit qu'avec lui.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { MathfieldElement, initVirtualKeyboardInCurrentBrowsingContext } from 'mathlive';
import MathKeyboardClose from '../MathKeyboardClose.svelte';

/** Délai de MathLive entre la perte de focus et la fermeture du clavier (300 ms), plus une marge */
const MATHLIVE_HIDE_DELAY = 500;

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('MathKeyboardClose', () => {
	let field: MathfieldElement;

	// Les tests tournent dans une iframe, où MathLive ne monte qu'un relais vers la page
	// parente : on monte ici le vrai clavier
	beforeAll(() => {
		initVirtualKeyboardInCurrentBrowsingContext();
	});

	beforeEach(() => {
		field = new MathfieldElement();
		document.body.append(field);
	});

	afterEach(() => {
		window.mathVirtualKeyboard.hide();
		field.remove();
	});

	it("n'affiche rien tant que le clavier est fermé", async () => {
		await render(MathKeyboardClose);
		field.focus();
		await wait(50);
		await expect
			.element(page.getByRole('button', { name: 'Fermer le clavier' }))
			.not.toBeInTheDocument();
	});

	it('apparaît au-dessus du clavier ouvert', async () => {
		await render(MathKeyboardClose);
		field.focus();
		window.mathVirtualKeyboard.show();
		const button = page.getByRole('button', { name: 'Fermer le clavier' });
		await expect.element(button).toBeVisible();
		const height = window.mathVirtualKeyboard.boundingRect.height;
		expect(height).toBeGreaterThan(0);
		expect(button.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(
			window.innerHeight - height
		);
	});

	it('ferme le clavier : le champ perd vraiment le focus, et le bouton disparaît', async () => {
		await render(MathKeyboardClose);
		field.focus();
		window.mathVirtualKeyboard.show();
		const button = page.getByRole('button', { name: 'Fermer le clavier' });
		await expect.element(button).toBeVisible();
		expect(field.hasFocus()).toBe(true);

		// Comme un toucher sur iOS : le bouton ne prend pas le focus de lui-même (un clic de
		// souris le lui donnerait et masquerait le piège)
		(button.element() as HTMLButtonElement).click();
		await wait(MATHLIVE_HIDE_DELAY);

		// Avec `field.blur()`, hasFocus() restait vrai et le clavier se rouvrait
		expect(field.hasFocus()).toBe(false);
		expect(window.mathVirtualKeyboard.visible).toBe(false);
		await expect.element(button).not.toBeInTheDocument();
	});
});
