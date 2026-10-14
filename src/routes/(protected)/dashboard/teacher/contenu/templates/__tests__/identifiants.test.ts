/**
 * Page d'un modèle — identifiants validés avant toute requête
 * ===========================================================
 *
 * Audit de sécurité (MINEUR) : chaque action valide `params.templateId` (UUID)
 * AVANT de toucher la base.
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
	for (const nom of ['update', 'publish', 'delete', 'archive', 'instantiate'] as const) {
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

/**
 * ADR 0029 : le modèle s'édite sur sa page. L'ancien circuit « mettre à jour
 * depuis un chapitre » (versions figées) a été retiré : l'action n'existe plus.
 */
describe('ancien circuit des versions', () => {
	it('l’action updateFromChapter n’existe plus', () => {
		expect(Object.keys(actions)).not.toContain('updateFromChapter');
	});
});
