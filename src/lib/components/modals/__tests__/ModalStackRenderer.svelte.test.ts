/**
 * ModalStackRenderer — clavier et lecteur d'écran dans la fenêtre (écart V73).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { modalStack } from '#lib/stores/modalStack.svelte.ts';
import ModalHarness from './ModalHarness.svelte';

// Functions
function focusedText(): string {
	return document.activeElement?.textContent?.trim() ?? '';
}

async function openModal(canDismiss = true): Promise<void> {
	await render(ModalHarness, { canDismiss });
	await page.getByRole('button', { name: 'Ouvrir' }).click();
	await expect.element(page.getByRole('dialog')).toBeVisible();
}

describe('ModalStackRenderer (V73)', () => {
	afterEach(() => {
		modalStack.clear();
	});

	it("à l'ouverture, le clavier entre dans la fenêtre", async () => {
		await openModal();
		await expect.poll(focusedText).toBe('Premier');
	});

	it('Tab et Maj+Tab tournent dans la fenêtre', async () => {
		await openModal();
		await expect.poll(focusedText).toBe('Premier');
		await userEvent.keyboard('{Tab}');
		expect(focusedText()).toBe('Dernier');
		await userEvent.keyboard('{Tab}');
		expect(focusedText()).toBe('Premier');
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		expect(focusedText()).toBe('Dernier');
	});

	it('le reste de la page est inerte tant que la fenêtre est ouverte', async () => {
		await openModal();
		const opener = page.getByRole('button', { name: 'Ouvrir', includeHidden: true }).element();
		const link = page.getByText('Lien derrière').element();
		expect(opener.closest('[inert]')).not.toBeNull();
		expect(link.closest('[inert]')).not.toBeNull();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => opener.closest('[inert]')).toBeNull();
	});

	it("la fenêtre n'est pas rendue dans un bouton", async () => {
		await openModal();
		expect(page.getByRole('dialog').element().closest('button')).toBeNull();
	});

	it('Échap ferme et le clavier revient sur le bouton d’ouverture', async () => {
		await openModal();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
		await expect.poll(focusedText).toBe('Ouvrir');
	});

	it('un clic sur le fond ferme la fenêtre', async () => {
		await openModal();
		const backdrop = document.querySelector<HTMLElement>('[data-modal-backdrop]');
		expect(backdrop).not.toBeNull();
		backdrop?.click();
		await expect.poll(() => document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('une fenêtre qui porte déjà son rôle n’est pas annoncée deux fois', async () => {
		await render(ModalHarness, { ownDialog: true });
		await page.getByRole('button', { name: 'Ouvrir' }).click();
		await expect.element(page.getByRole('dialog', { name: 'Fenêtre titrée' })).toBeVisible();
		await expect.poll(() => document.querySelectorAll('[role="dialog"]').length).toBe(1);
		await expect.poll(focusedText).toBe('Seul bouton');
	});

	it('canDismiss: false — ni Échap ni le fond ne ferment', async () => {
		await openModal(false);
		await userEvent.keyboard('{Escape}');
		document.querySelector<HTMLElement>('[data-modal-backdrop]')?.click();
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
	});
});
