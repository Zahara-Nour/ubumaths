/**
 * DELETE /api/teacher/chapter-templates/[id] — un modèle encore relié
 * ===================================================================
 *
 * ADR 0029 : un modèle relié à des chapitres ne se supprime pas, il s'archive.
 * Ce refus est une demande à reformuler (409, message lisible), pas une panne.
 */

import { describe, it, expect, vi } from 'vitest';

const MODELE = '22222222-2222-4222-8222-222222222222';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));
vi.mock('$lib/server/chapter-templates', async (importActual) => {
	const actual = await importActual<typeof import('$lib/server/chapter-templates')>();
	return {
		...actual,
		getChapterTemplate: vi.fn(async () => ({ data: { createdBy: 'prof' }, error: null })),
		deleteChapterTemplate: vi.fn(async () => ({ error: new actual.TemplateInUseError() }))
	};
});

const { DELETE } = await import('../+server');

describe('DELETE d’un modèle relié', () => {
	it('répond 409 avec le message « archivez-le »', async () => {
		try {
			await DELETE({ locals: { supabase: {} }, params: { id: MODELE } } as never);
			expect.unreachable('la route doit refuser');
		} catch (e) {
			const err = e as { status?: number; body?: { message?: string } };
			expect(err.status).toBe(409);
			expect(err.body?.message).toMatch(/archivez/);
		}
	});
});
