/**
 * Les Dépêches du Czar : on joue comme un visiteur (répondre, demander un
 * indice, recharger) et on lit ce qui est affiché.
 */
import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Depeches from '../depeches/+page.svelte';
import { lettersOnly } from '$lib/ciphers/alphabet';
import { HINTS_KEY, PROGRESS_KEY } from '$lib/ciphers/dispatch-progress';
import { DISPATCHES } from '$lib/ciphers/dispatches';

function text(container: HTMLElement, testid: string): string {
	return container.querySelector(`[data-testid="${testid}"]`)?.textContent ?? '';
}

beforeEach(() => {
	localStorage.removeItem(PROGRESS_KEY);
	localStorage.removeItem(HINTS_KEY);
});

describe('Les Dépêches du Czar', () => {
	it('au départ : la n° 1 est ouverte, la n° 2 verrouillée et sans titre', async () => {
		const screen = await render(Depeches);
		await expect.element(page.getByRole('heading', { name: /Dépêche n° 1/ })).toBeInTheDocument();
		const second = screen.container.querySelector<HTMLButtonElement>('[data-testid="dispatch-2"]');
		expect(second?.disabled).toBe(true);
		expect(second?.textContent).toContain('???');
	});

	it('une réponse juste, même sans accents ni ponctuation, décrypte et ouvre la suivante', async () => {
		const screen = await render(Depeches);
		await page
			.getByLabelText(/Votre décryptage/)
			.fill(
				'rendez vous a la tour du vieux moulin au coucher du soleil apportez les cartes du royaume'
			);
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect
			.poll(() => text(screen.container, 'dispatch-solved'))
			.toContain(DISPATCHES[0].epilogue);
		expect(text(screen.container, 'dispatch-progress')).toContain('1 / 9');
		await page.getByRole('button', { name: 'Dépêche suivante' }).click();
		await expect.element(page.getByRole('heading', { name: /Dépêche n° 2/ })).toBeInTheDocument();
	});

	it('une réponse fausse : message, avec le nombre de lettres attendu', async () => {
		const screen = await render(Depeches);
		await page.getByLabelText(/Votre décryptage/).fill('le czar arrive');
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect
			.poll(() => text(screen.container, 'dispatch-feedback'))
			.toContain('Ce n’est pas encore ça');
		const expected = lettersOnly(DISPATCHES[0].plaintext).length;
		expect(text(screen.container, 'dispatch-feedback')).toContain(`compte ${expected} lettres`);
	});

	it('la progression survit à un rechargement', async () => {
		localStorage.setItem(PROGRESS_KEY, JSON.stringify([1, 2, 3, 4]));
		const screen = await render(Depeches);
		// On reprend à la première dépêche ouverte et non décryptée : la n° 5
		await expect.element(page.getByRole('heading', { name: /Dépêche n° 5/ })).toBeInTheDocument();
		expect(text(screen.container, 'dispatch-progress')).toContain('4 / 9');
	});

	it('n° 5 : le lien vers les outils n’apparaît qu’après le premier indice, et porte le message', async () => {
		localStorage.setItem(PROGRESS_KEY, JSON.stringify([1, 2, 3, 4]));
		const screen = await render(Depeches);
		await expect.element(page.getByRole('heading', { name: /Dépêche n° 5/ })).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="dispatch-tools"]')).toBeNull();
		await page.getByRole('button', { name: 'Un indice' }).click();
		await expect.poll(() => text(screen.container, 'dispatch-hint')).toContain('substitution');
		const link = screen.container.querySelector<HTMLAnchorElement>(
			'[data-testid="dispatch-tools"]'
		);
		const url = new URL(link?.href ?? '', 'https://chiph.re');
		expect(url.pathname).toBe('/chiffrement/substitution');
		expect(url.searchParams.get('decrypter')).toBe(
			text(screen.container, 'dispatch-ciphertext').trim()
		);
	});

	it('n° 1 : le récit nomme déjà le chiffre, le lien est offert d’emblée', async () => {
		const screen = await render(Depeches);
		await expect.element(page.getByRole('heading', { name: /Dépêche n° 1/ })).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="dispatch-tools"]')).not.toBeNull();
	});

	it('toutes décryptées : la campagne est saluée', async () => {
		localStorage.setItem(PROGRESS_KEY, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]));
		const screen = await render(Depeches);
		await page.getByTestId('dispatch-9').click();
		await expect
			.poll(() => text(screen.container, 'dispatch-campaign-done'))
			.toContain('Toutes les dépêches');
	});

	it('recommencer efface la progression, après confirmation', async () => {
		localStorage.setItem(PROGRESS_KEY, JSON.stringify([1, 2]));
		const screen = await render(Depeches);
		await expect.poll(() => text(screen.container, 'dispatch-progress')).toContain('2 / 9');
		await page.getByRole('button', { name: 'Recommencer la campagne' }).click();
		await page.getByRole('button', { name: 'Confirmer : tout effacer' }).click();
		await expect.poll(() => text(screen.container, 'dispatch-progress')).toContain('0 / 9');
		expect(localStorage.getItem(PROGRESS_KEY)).toBe('[]');
	});

	// Revue du 2026-10-07
	it('les indices vus survivent à un aller-retour vers les outils', async () => {
		localStorage.setItem(PROGRESS_KEY, JSON.stringify([1, 2, 3, 4]));
		const first = await render(Depeches);
		await page.getByRole('button', { name: 'Un indice' }).click();
		await expect.poll(() => text(first.container, 'dispatch-hint')).toContain('substitution');
		first.unmount();
		const second = await render(Depeches);
		await expect.poll(() => text(second.container, 'dispatch-hint')).toContain('substitution');
		expect(second.container.querySelector('[data-testid="dispatch-tools"]')).not.toBeNull();
	});

	it('« Recommencer » se désarme dès qu’on reprend le jeu', async () => {
		localStorage.setItem(PROGRESS_KEY, JSON.stringify([1, 2]));
		await render(Depeches);
		await page.getByRole('button', { name: 'Recommencer la campagne' }).click();
		await page.getByRole('button', { name: 'Un indice' }).click();
		await expect
			.element(page.getByRole('button', { name: 'Recommencer la campagne' }))
			.toBeInTheDocument();
	});

	it('deux erreurs de suite : le message change, pour être annoncé de nouveau', async () => {
		const screen = await render(Depeches);
		await page.getByLabelText(/Votre décryptage/).fill('le czar arrive');
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect
			.poll(() => text(screen.container, 'dispatch-feedback'))
			.toContain('Ce n’est pas encore ça');
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect.poll(() => text(screen.container, 'dispatch-feedback')).toContain('essai 2');
	});

	it('une bonne réponse porte le focus sur « Décryptée ! »', async () => {
		await render(Depeches);
		await page.getByLabelText(/Votre décryptage/).fill(DISPATCHES[0].plaintext);
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect.poll(() => document.activeElement?.textContent).toBe('Décryptée !');
	});
});
