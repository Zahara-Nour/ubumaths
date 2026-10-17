/**
 * Supprimer un modèle encore relié — action `delete` de la page du modèle
 * =======================================================================
 *
 * ADR 0029 : un modèle relié à des chapitres ne se supprime pas, il s'archive.
 * Ce refus est une demande à reformuler (409, message lisible), pas une panne.
 *
 * Reprend le test de l'ancienne route `DELETE /api/teacher/chapter-templates/[id]`,
 * retirée avec l'ancien système de versions : c'est la page qui porte ce
 * comportement désormais.
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
		deleteChapterTemplate: vi.fn(async () => ({ error: new actual.TemplateInUseError() }))
	};
});

const { actions } = await import('../[templateId]/+page.server');

describe('supprimer un modèle relié', () => {
	it('répond 409 avec le message « archivez-le »', async () => {
		const single = vi.fn(async () => ({
			data: { created_by: 'prof', status: 'published' },
			error: null
		}));
		const chain = { select: () => chain, eq: () => chain, single };

		const r = (await actions.delete!({
			locals: { supabase: { from: () => chain } },
			params: { templateId: MODELE }
		} as never)) as { status?: number; data?: { error?: string } };

		expect(r.status).toBe(409);
		expect(r.data?.error).toMatch(/archivez-le/);
	});
});
