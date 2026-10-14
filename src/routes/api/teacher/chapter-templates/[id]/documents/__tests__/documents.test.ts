/**
 * POST /api/teacher/chapter-templates/[id]/documents — échec d'enregistrement
 * ===========================================================================
 *
 * Audit de sécurité (IMPORTANT 2) : le chemin de stockage vient du navigateur.
 * Après un échec d'insertion, le fichier n'est supprimé que si AUCUNE ligne ne
 * le désigne (`removeFileIfUnused`) — jamais par un `remove` direct, qui aurait
 * pu effacer le fichier d'un autre document du modèle.
 */

import { describe, it, expect, vi } from 'vitest';

const MODELE = '22222222-2222-4222-8222-222222222222';
const removeFileIfUnused = vi.fn(async () => false);
const remove = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));
vi.mock('$lib/server/template-guard', () => ({
	requireOwnedTemplate: vi.fn(async () => MODELE)
}));
vi.mock('$lib/server/chapters', () => ({
	insertDocument: vi.fn(async () => ({ data: null, error: new Error('refusé') }))
}));
vi.mock('$lib/server/template-content', () => ({
	removeFileIfUnused: (...args: unknown[]) => removeFileIfUnused(...(args as []))
}));

const { POST } = await import('../+server');

describe('échec d’enregistrement d’un document de modèle', () => {
	it('passe par removeFileIfUnused, jamais par un remove direct', async () => {
		const chemin = `templates/${MODELE}/1.pdf`;
		const request = new Request('http://localhost/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: 'Cours',
				storagePath: chemin,
				fileName: 'cours.pdf',
				fileType: 'application/pdf',
				fileSize: 10
			})
		});
		const locals = { supabase: { storage: { from: () => ({ remove }) } } };

		await expect(POST({ locals, params: { id: MODELE }, request } as never)).rejects.toMatchObject({
			status: 500
		});
		expect(removeFileIfUnused).toHaveBeenCalledWith(chemin, locals.supabase);
		expect(remove).not.toHaveBeenCalled();
	});
});
