/**
 * Écart V29 : un libellé `sr-only sm:not-sr-only` doit apparaître sur grand écran.
 *
 * `src/app.css` redéfinissait `.sr-only` hors de toute couche CSS : une règle hors
 * couche l'emporte sur les couches de Tailwind, donc sur `sm:not-sr-only`. Les
 * libellés des boutons PDF, Précédent / Suivant et Régénérer restaient masqués sur
 * ordinateur (icône seule).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

function libelle(): HTMLSpanElement {
	const span = document.createElement('span');
	span.className = 'sr-only sm:not-sr-only';
	span.textContent = 'Télécharger le PDF';
	document.body.append(span);
	return span;
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('sr-only et ses variantes Tailwind', () => {
	it('le libellé est visible sur grand écran', async () => {
		await page.viewport(1280, 800);
		const style = getComputedStyle(libelle());
		expect(style.position).toBe('static');
		expect(style.width).not.toBe('1px');
	});

	it('le libellé reste masqué sur petit écran', async () => {
		await page.viewport(375, 800);
		const style = getComputedStyle(libelle());
		expect(style.position).toBe('absolute');
		expect(style.width).toBe('1px');
	});
});
