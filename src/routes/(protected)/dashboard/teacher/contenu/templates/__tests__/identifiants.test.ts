/**
 * Page d'un modèle — identifiants validés avant toute requête
 * ===========================================================
 *
 * Audit de sécurité (MINEUR) : chaque action valide `params.templateId` (UUID),
 * et « mettre à jour depuis un chapitre » valide aussi `chapterId`, AVANT de
 * toucher la base.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));

const { actions } = await import('../[templateId]/+page.server');

const from = vi.fn();
const locals = { supabase: { from } };

function formulaire(champs: Record<string, string> = {}): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(champs)) body.set(k, v);
	return new Request('http://localhost/', { method: 'POST', body });
}

describe('identifiant de modèle invalide', () => {
	for (const nom of [
		'update',
		'publish',
		'updateFromChapter',
		'delete',
		'archive',
		'instantiate'
	] as const) {
		it(`${nom} : 400 sans requête`, async () => {
			from.mockClear();
			const r = (await actions[nom]!({
				locals,
				params: { templateId: 'pas-un-uuid' },
				request: formulaire()
			} as never)) as { status?: number };
			expect(r.status).toBe(400);
			expect(from).not.toHaveBeenCalled();
		});
	}
});

describe('updateFromChapter : chapitre invalide', () => {
	it('400 avant toute écriture', async () => {
		const single = vi.fn(async () => ({
			data: { created_by: 'prof', status: 'draft' },
			error: null
		}));
		const chain = { select: () => chain, eq: () => chain, single };
		const r = (await actions.updateFromChapter!({
			locals: { supabase: { from: () => chain } },
			params: { templateId: '22222222-2222-4222-8222-222222222222' },
			request: formulaire({ chapterId: 'pas-un-uuid' })
		} as never)) as { status?: number };
		expect(r.status).toBe(400);
	});
});
