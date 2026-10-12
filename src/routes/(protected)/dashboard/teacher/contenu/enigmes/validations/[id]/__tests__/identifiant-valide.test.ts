/**
 * L'identifiant de la tentative vient de l'adresse : contrôlé avant toute requête
 * (règle 1 du CLAUDE.md), comme le fait déjà l'action `validate`.
 */
import { describe, it, expect, vi } from 'vitest';
import { load } from '../+page.server';

describe('validation d’une tentative : identifiant de l’adresse', () => {
	it('refuse un identifiant qui n’est pas un UUID (400), sans interroger la base', async () => {
		const from = vi.fn();
		const event = {
			params: { id: 'pas-un-uuid' },
			locals: {
				supabase: { from },
				safeGetSession: async () => ({ user: { id: 'u' } })
			}
		} as never;

		await expect(load(event)).rejects.toMatchObject({ status: 400 });
		expect(from).not.toHaveBeenCalled();
	});
});
