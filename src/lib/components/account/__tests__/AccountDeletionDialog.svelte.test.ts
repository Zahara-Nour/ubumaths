/**
 * T17 : un compte supprimé ne laisse pas sa conversation avec le Père Ubu dans le
 * navigateur (art. 17, appareil partagé).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import AccountDeletionDialog from '../AccountDeletionDialog.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(globalThis, 'fetch').mockResolvedValue(
		new Response(JSON.stringify({ success: true }), { status: 200 })
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('AccountDeletionDialog', () => {
	it('la suppression réussie efface les données de travail du navigateur', async () => {
		localStorage.setItem(
			'chatHistory:eleve-a',
			JSON.stringify([{ role: 'user', content: 'privé', timestamp: 1 }])
		);
		localStorage.setItem('minesweeper_game', '{}');
		localStorage.setItem('theme', 'dark');
		await render(AccountDeletionDialog, { props: { open: true, onOpenChange: () => {} } });

		await page.getByRole('button', { name: 'Je comprends, continuer' }).click();
		await page.getByRole('textbox').fill('SUPPRIMER MON COMPTE');
		await page.getByRole('button', { name: 'Supprimer definitivement' }).click();

		await expect.poll(() => localStorage.getItem('chatHistory:eleve-a')).toBeNull();
		expect(localStorage.getItem('minesweeper_game')).toBeNull();
		expect(fetch).toHaveBeenCalledWith('/api/account/delete', expect.anything());
		expect(localStorage.getItem('theme')).toBe('dark');
	});
});
