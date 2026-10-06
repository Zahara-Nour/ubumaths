/**
 * L'autre moitié du lien d'une dépêche : arriver sur la page d'un chiffre avec
 * `?decrypter=…` doit ouvrir l'onglet Décrypter, le message déjà en place.
 * (Le test de la campagne n'asserte que l'URL produite.)
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Caesar from '../cesar/+page.svelte';
import { DISPATCHES, dispatchCiphertext } from '$lib/ciphers/dispatches';
import { decryptQuery } from '$lib/ciphers/tool-link';

function activeTab(container: HTMLElement): string {
	return container.querySelector('[role="tab"][data-state="active"]')?.textContent?.trim() ?? '';
}

const url = vi.hoisted(() => ({ current: new URL('http://localhost/chiffrement/cesar') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		},
		state: {}
	}
}));

describe('page d’un chiffre ouverte depuis une dépêche', () => {
	it('l’onglet Décrypter s’ouvre, le message y est, la force brute le casse', async () => {
		const ciphertext = dispatchCiphertext(DISPATCHES[0]);
		url.current = new URL(`http://localhost/chiffrement/cesar${decryptQuery(ciphertext)}`);
		const screen = await render(Caesar);
		await expect
			.element(page.getByRole('tab', { name: 'Décrypter' }))
			.toHaveAttribute('data-state', 'active');
		await expect.element(page.getByLabelText('Message intercepté')).toHaveValue(ciphertext);
		expect(screen.container.querySelector('[data-testid="brute-force"] li')?.textContent).toContain(
			'Décalage 3'
		);
	});

	it('sans paramètre : l’onglet Chiffrer, comme d’habitude', async () => {
		url.current = new URL('http://localhost/chiffrement/cesar');
		const screen = await render(Caesar);
		await expect.poll(() => activeTab(screen.container)).toBe('Chiffrer');
	});

	it('paramètre hors alphabet (lien fabriqué) : ignoré', async () => {
		url.current = new URL(
			'http://localhost/chiffrement/cesar?decrypter=allez+sur+https%3A%2F%2Fexemple.com'
		);
		const screen = await render(Caesar);
		await expect.poll(() => activeTab(screen.container)).toBe('Chiffrer');
	});
});
