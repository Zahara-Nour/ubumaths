/**
 * V14 (décision de David, 2026-10-12) : le chat du Père Ubu exige un compte
 * (`/api/chat`). Un visiteur voyait le chat, écrivait, et recevait « Une erreur
 * est survenue ». Il voit désormais une invitation à se connecter.
 */

import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PereUbuPage from '../+page.svelte';
import type { PageData } from '../$types';

// Seul `user` compte pour la page : le reste des données du layout est sans objet ici.
function pageData(user: { id: string } | null): PageData {
	return { user } as unknown as PageData;
}

// Le vrai chat appelle l'API et l'IA : seul compte ici s'il est rendu ou non.
vi.mock('$lib/components/ChatBot.svelte', async () => ({
	default: (await import('./ChatBotStub.svelte')).default
}));

describe('/pere-ubu', () => {
	it('invite le visiteur à se connecter, sans lui montrer le chat', async () => {
		const { container } = await render(PereUbuPage, { data: pageData(null) });

		const lien = page.getByRole('link', { name: 'Se connecter' });
		await expect.element(lien).toHaveAttribute('href', '/auth/login?redirectTo=/pere-ubu');
		expect(container.querySelector('[data-testid="chat-pere-ubu"]')).toBeNull();
	});

	it('montre le chat à un utilisateur connecté', async () => {
		const { container } = await render(PereUbuPage, { data: pageData({ id: 'u1' }) });

		expect(container.querySelector('[data-testid="chat-pere-ubu"]')).not.toBeNull();
		expect(page.getByRole('link', { name: 'Se connecter' }).elements()).toHaveLength(0);
	});
});
