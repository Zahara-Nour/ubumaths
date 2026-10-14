/**
 * Action « ajouter un objectif » de la page professeur du chapitre
 * ================================================================
 *
 * 2026-10-14 : chaque ajout répondait 400. L'action validait avec
 * `createChecklistItemSchema`, qui exige `chapterId`, sans le lui donner :
 * le formulaire ne le porte pas, il vient de l'adresse.
 *
 * Le module d'écriture est simulé ; le chapitre « existe » (lecture simulée).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const addChecklistItem = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));
vi.mock('$lib/server/chapters', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/chapters')>()),
	addChecklistItem: (...args: unknown[]) => addChecklistItem(...args)
}));

const { actions } = await import('../+page.server');

const CHAPITRE = '11111111-1111-4111-8111-111111111111';

type ActionEvent = Parameters<NonNullable<typeof actions.addChecklistItem>>[0];

function evenement(champs: Record<string, string>): ActionEvent {
	const body = new FormData();
	for (const [cle, valeur] of Object.entries(champs)) body.set(cle, valeur);
	// Le chapitre existe : `from('class_chapters').select().eq().single()`.
	const requete = {
		select: () => requete,
		eq: () => requete,
		single: async () => ({ data: { id: CHAPITRE }, error: null })
	};
	return {
		request: new Request('http://localhost/x', { method: 'POST', body }),
		locals: { supabase: { from: () => requete } },
		params: { classId: 'classe', chapterId: CHAPITRE }
	} as unknown as ActionEvent;
}

function statut(resultat: unknown): number | null {
	const r = resultat as { status?: number };
	return typeof r?.status === 'number' ? r.status : null;
}

beforeEach(() => {
	addChecklistItem.mockReset();
});

describe('addChecklistItem', () => {
	it('ajoute l’objectif au chapitre de l’adresse', async () => {
		addChecklistItem.mockResolvedValue({ data: { id: 'o1' }, error: null });
		const r = await actions.addChecklistItem!(evenement({ content: 'Je sais factoriser' }));
		expect(statut(r)).toBeNull();
		expect(r).toMatchObject({ success: true, action: 'addChecklistItem' });
		expect(addChecklistItem).toHaveBeenCalledWith(
			CHAPITRE,
			expect.objectContaining({ content: 'Je sais factoriser' }),
			expect.anything()
		);
	});

	it('refuse un objectif vide, sans écrire', async () => {
		const r = await actions.addChecklistItem!(evenement({ content: '   ' }));
		expect(statut(r)).toBe(400);
		expect(addChecklistItem).not.toHaveBeenCalled();
	});
});
