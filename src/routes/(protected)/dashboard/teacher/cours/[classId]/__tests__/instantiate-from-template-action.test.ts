/**
 * Créer un chapitre depuis un modèle — action `instantiateFromTemplate`
 * =====================================================================
 *
 *  - un modèle inutilisable (brouillon, archivé) : le professeur lit la VRAIE
 *    raison (« publiez-le d'abord »), pas un « Erreur lors de la creation »
 *    qui ne dit pas quoi faire (2026-10-14 : un brouillon choisi dans la liste,
 *    seul le journal Vercel savait pourquoi) ;
 *  - toute autre panne (base, RLS) garde le message générique : un message
 *    Postgres n'a rien à faire à l'écran.
 *
 * Le module d'écriture est simulé ; le refus lui-même est prouvé par
 * `src/lib/server/__tests__/chapter-templates.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRole = vi.fn();
const instantiate = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: (...a: unknown[]) => requireRole(...a)
}));
vi.mock('$lib/server/chapter-templates', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/chapter-templates')>()),
	instantiateTemplate: (...a: unknown[]) => instantiate(...a)
}));

const { actions } = await import('../+page.server');
const { TemplateUnusableError } = await import('$lib/server/chapter-templates');

const CLASSE = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';

type ActionEvent = Parameters<NonNullable<typeof actions.instantiateFromTemplate>>[0];

function evenement(): ActionEvent {
	const body = new FormData();
	body.set('templateId', MODELE);
	body.set('title', '');
	body.set('isVisible', 'true');
	// La classe existe : `from('classes').select().eq().single()`.
	const requete = {
		select: () => requete,
		eq: () => requete,
		single: async () => ({ data: { id: CLASSE }, error: null })
	};
	return {
		request: new Request('http://localhost/x', { method: 'POST', body }),
		locals: { supabase: { from: () => requete } },
		params: { classId: CLASSE }
	} as unknown as ActionEvent;
}

function resultat(r: unknown): { status: number | null; error?: string } {
	const f = r as { status?: number; data?: { error?: string } };
	return { status: typeof f?.status === 'number' ? f.status : null, error: f?.data?.error };
}

beforeEach(() => {
	requireRole.mockReset();
	requireRole.mockResolvedValue({ user: { id: 'prof' } });
	instantiate.mockReset();
});

describe('instantiateFromTemplate', () => {
	it('modèle en brouillon → 409 avec la vraie raison', async () => {
		instantiate.mockResolvedValue({
			data: null,
			error: new TemplateUnusableError(
				'Un modèle en brouillon ne peut pas être utilisé : publiez-le d’abord.'
			)
		});
		const r = resultat(await actions.instantiateFromTemplate!(evenement()));
		expect(r.status).toBe(409);
		expect(r.error).toBe('Un modèle en brouillon ne peut pas être utilisé : publiez-le d’abord.');
	});

	it('panne de base → 500 et message générique, sans le texte Postgres', async () => {
		instantiate.mockResolvedValue({
			data: null,
			error: new Error('new row violates row-level security policy for table "class_chapters"')
		});
		const r = resultat(await actions.instantiateFromTemplate!(evenement()));
		expect(r.status).toBe(500);
		expect(r.error).toBe('Erreur lors de la creation du chapitre depuis le template');
	});

	it('succès → le chapitre créé', async () => {
		instantiate.mockResolvedValue({ data: { chapterId: 'c1' }, error: null });
		const r = await actions.instantiateFromTemplate!(evenement());
		expect(r).toMatchObject({ success: true, chapterId: 'c1' });
	});
});
