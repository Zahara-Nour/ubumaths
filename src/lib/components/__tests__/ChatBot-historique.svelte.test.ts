/**
 * T17 : sur une tablette partagée, l'élève suivant ne lit pas la conversation du
 * précédent avec le Père Ubu. L'historique est rangé par compte et effacé à la
 * déconnexion.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChatBot from '../ChatBot.svelte';
import { submitLogoutForm } from '$lib/utils/auth';

const SECRET_A = 'Conversation privée de l’élève A';

function savedConversation(text: string) {
	return JSON.stringify([{ role: 'user', content: text, timestamp: 1 }]);
}

beforeEach(() => {
	localStorage.clear();
});

describe('ChatBot — historique par compte', () => {
	it('l’ancienne clé commune (« chatHistory ») n’est pas affichée et elle est effacée', async () => {
		localStorage.setItem('chatHistory', savedConversation(SECRET_A));
		const screen = await render(ChatBot, { props: { userId: 'eleve-b' } });
		await expect.poll(() => localStorage.getItem('chatHistory')).toBeNull();
		expect(screen.container.textContent).not.toContain(SECRET_A);
	});

	it('l’historique d’un autre compte n’est pas affiché et il est effacé', async () => {
		localStorage.setItem('chatHistory:eleve-a', savedConversation(SECRET_A));
		const screen = await render(ChatBot, { props: { userId: 'eleve-b' } });
		await expect.poll(() => localStorage.getItem('chatHistory:eleve-a')).toBeNull();
		expect(screen.container.textContent).not.toContain(SECRET_A);
	});

	it('un autre compte se connecte, chat ouvert : la conversation précédente disparaît', async () => {
		// Deux onglets : B se connecte dans l'autre, `data.user` change sans démonter le chat.
		localStorage.setItem('chatHistory:eleve-a', savedConversation(SECRET_A));
		const screen = await render(ChatBot, { props: { userId: 'eleve-a' } });
		await expect.poll(() => screen.container.textContent).toContain(SECRET_A);

		await screen.rerender({ userId: 'eleve-b' });

		await expect.poll(() => screen.container.textContent).not.toContain(SECRET_A);
		expect(localStorage.getItem('chatHistory:eleve-b')).toBeNull();
		expect(localStorage.getItem('chatHistory:eleve-a')).toBeNull();
	});

	it('l’élève retrouve sa propre conversation', async () => {
		localStorage.setItem('chatHistory:eleve-a', savedConversation(SECRET_A));
		const screen = await render(ChatBot, { props: { userId: 'eleve-a' } });
		await expect.poll(() => screen.container.textContent).toContain(SECRET_A);
	});
});

describe('Déconnexion', () => {
	it('efface toutes les conversations et les données de travail du navigateur', () => {
		const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
		localStorage.setItem('chatHistory', savedConversation('ancienne'));
		localStorage.setItem('chatHistory:eleve-a', savedConversation(SECRET_A));
		localStorage.setItem('chiphre-python-playground', 'print("A")');
		localStorage.setItem('theme', 'dark');

		submitLogoutForm();

		expect(submit).toHaveBeenCalled();
		expect(localStorage.getItem('chatHistory')).toBeNull();
		expect(localStorage.getItem('chatHistory:eleve-a')).toBeNull();
		expect(localStorage.getItem('chiphre-python-playground')).toBeNull();
		// Les préférences d'affichage ne sont pas des données de l'élève : elles restent.
		expect(localStorage.getItem('theme')).toBe('dark');
		submit.mockRestore();
	});
});
