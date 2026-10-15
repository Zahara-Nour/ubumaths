/**
 * Action « réafficher un élément du modèle » quand sa section est masquée
 * =======================================================================
 *
 * Décision du 2026-10-14 : masquer une section masque tout son contenu. Le
 * serveur refuse de réafficher SEUL un élément d'une section masquée
 * (`setLinkedElementHidden` rend `sectionHidden`, prouvé par
 * `tests/integration/sections-masquees-serveur.test.ts`) ; l'action le dit au
 * professeur (409), au lieu d'un « introuvable » ou d'une panne.
 */

import { describe, it, expect, vi } from 'vitest';

const setLinkedElementHidden = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));
vi.mock('$lib/server/chapters-publication', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/chapters-publication')>()),
	setLinkedElementHidden: (...args: unknown[]) => setLinkedElementHidden(...args)
}));

const { actions } = await import('../+page.server');

type ActionEvent = Parameters<NonNullable<typeof actions.setHidden>>[0];

const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const ELEMENT = '22222222-2222-4222-8222-222222222222';

function evenement(hidden: boolean): ActionEvent {
	const body = new FormData();
	body.set('contentType', 'document');
	body.set('itemId', ELEMENT);
	body.set('hidden', String(hidden));
	return {
		request: new Request('http://localhost/x', { method: 'POST', body }),
		locals: { supabase: {} },
		params: { classId: 'classe', chapterId: CHAPITRE }
	} as unknown as ActionEvent;
}

describe('setHidden — section masquée', () => {
	it('réafficher un élément d’une section masquée : 409 et message clair', async () => {
		setLinkedElementHidden.mockResolvedValue({
			error: new Error('x'),
			sectionHidden: true
		});
		const r = (await actions.setHidden!(evenement(false))) as {
			status?: number;
			data?: { error?: string };
		};
		expect(r.status).toBe(409);
		expect(r.data?.error).toMatch(/section est masquée/);
	});
});
