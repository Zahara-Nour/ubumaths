/**
 * Le bouton « Copier » d'une ligne de Calcul, vu depuis l'écran.
 *
 * Phase 0 `docs/wip/atelier-copier-phase0.md` : la réponse seule, en texte
 * lisible ; « Copier en LaTeX » au menu ; un retour annoncé, jamais muet.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

let writeText: Mock<(data: string) => Promise<void>>;

beforeEach(() => {
	// Le vrai presse-papier demande une permission : on regarde ce qui y part
	writeText = vi.fn<(data: string) => Promise<void>>().mockResolvedValue(undefined);
	vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
});

afterEach(() => {
	vi.restoreAllMocks();
});

async function open() {
	const view = await render(AtelierContainer, { atelier: new Atelier(), ephemeral: true });
	const container = view.container;
	const field = container.querySelector('.calcul form input[type="text"]') as HTMLInputElement;

	async function submit(text: string) {
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(field.value).toBe(text));
		(field.form as HTMLFormElement).requestSubmit();
		await vi.waitFor(() => expect(field.value).toBe(''));
	}

	const lastLine = () => [...container.querySelectorAll('.historique li')].at(-1) as HTMLElement;
	const buttonIn = (line: HTMLElement, label: string) =>
		[...line.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label
		);
	const notice = () => container.querySelector('.retour')?.textContent?.trim() ?? '';

	return { container, submit, lastLine, buttonIn, notice };
}

// =============================================================================
// Tests
// =============================================================================

describe('le bouton « Copier » d’une ligne', () => {
	it('copie la réponse en texte lisible, et le dit', async () => {
		const { submit, lastLine, buttonIn, notice } = await open();
		await submit('.développer (2x-1)(x+3)');

		buttonIn(lastLine(), 'Copier')?.click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('2x² + 5x − 3'));
		await vi.waitFor(() => expect(notice()).toBe('Copié.'));
	});

	it('la flèche propose « Copier en LaTeX »', async () => {
		const { submit, lastLine, buttonIn, notice } = await open();
		await submit('.développer (2x-1)(x+3)');

		buttonIn(lastLine(), 'Autres façons de copier')?.click();
		await page.getByRole('menuitem', { name: 'Copier en LaTeX' }).click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('2 x^2 + 5 x - 3'));
		await vi.waitFor(() => expect(notice()).toBe('Copié en LaTeX.'));
	});

	it('copie la valeur approchée quand le bouton ≈ l’affiche', async () => {
		const { submit, lastLine, buttonIn } = await open();
		await submit('1/7');

		buttonIn(lastLine(), 'Valeur approchée')?.click();
		await vi.waitFor(() => expect(buttonIn(lastLine(), 'Valeur exacte')).toBeTruthy());
		buttonIn(lastLine(), 'Copier')?.click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('≈ 0,1429'));
	});

	it('pas de bouton sur un refus, ni sur une définition', async () => {
		const { submit, lastLine, buttonIn } = await open();

		await submit('.résoudre');
		expect(buttonIn(lastLine(), 'Copier')).toBeUndefined();
		await submit('f(x) = x^2');
		expect(buttonIn(lastLine(), 'Copier')).toBeUndefined();
	});

	it('une copie refusée par le navigateur est dite', async () => {
		writeText.mockRejectedValue(new DOMException('refusé', 'NotAllowedError'));
		const { submit, lastLine, buttonIn, notice } = await open();
		await submit('1/3+1/6');

		buttonIn(lastLine(), 'Copier')?.click();

		await vi.waitFor(() => expect(notice()).toBe('Ton navigateur a refusé la copie.'));
	});
});
