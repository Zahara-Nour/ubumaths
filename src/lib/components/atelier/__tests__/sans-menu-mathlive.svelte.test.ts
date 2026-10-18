/**
 * Le menu ☰ de MathLive est retiré des champs de l'atelier (David, 2026-10-15) :
 * ses entrées (mode texte ou LaTeX, couleur, style, matrice) produisent des
 * lignes que le moteur ne sait pas lire ; le clavier virtuel garde l'utile.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';

afterEach(() => localStorage.removeItem(INPUT_MODE_KEY));

/** Le bouton ☰ se voit-il ? (dans le shadow DOM du champ) */
function menuToggleShown(field: MathfieldElement): boolean {
	const toggle = field.shadowRoot?.querySelector<HTMLElement>('[part~="menu-toggle"]');
	if (!toggle) return false;
	const style = getComputedStyle(toggle);
	return style.display !== 'none' && style.visibility !== 'hidden';
}

describe('pas de menu MathLive dans l’atelier', () => {
	it('dans le champ « Écriture mathématique » de Calcul', async () => {
		localStorage.setItem(INPUT_MODE_KEY, 'math');
		const { container } = await render(AtelierContainer, {
			atelier: new Atelier(),
			ephemeral: true
		});
		const field = await vi.waitFor(() => {
			const found = container.querySelector('.calcul form math-field') as MathfieldElement;
			expect(found?.shadowRoot).toBeTruthy();
			return found;
		});

		await vi.waitFor(() => expect(field.menuItems).toEqual([]));
		await vi.waitFor(() => expect(menuToggleShown(field)).toBe(false));
	});

	it('dans le champ d’une carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const card = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'f'
		) as HTMLElement;
		// Le champ d'une fonction est sur sa ligne, sans rien ouvrir (lot 3 de la refonte)
		const field = await vi.waitFor(() => {
			const found = card.querySelector('math-field') as MathfieldElement;
			expect(found?.shadowRoot).toBeTruthy();
			return found;
		});

		await vi.waitFor(() => expect(field.menuItems).toEqual([]));
		await vi.waitFor(() => expect(menuToggleShown(field)).toBe(false));
	});
});
