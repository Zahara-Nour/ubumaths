/**
 * Action « masquer une section » de la page professeur du chapitre
 * ================================================================
 *
 * Décision du 2026-10-14 : une section d'un chapitre (du modèle OU propre à la
 * classe) se masque ; la base masque et dépublie alors tout son contenu
 * (déclencheur `section_masquee_propage`, prouvé par
 * `tests/integration/modele-section-masquee.test.ts`).
 *
 * Ce qui se joue ici : l'écriture vise la section DE CE CHAPITRE (filtre
 * `chapter_id` de l'adresse), et un refus silencieux de la RLS (zéro ligne) ne
 * passe pas pour un succès.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));

const { actions } = await import('../+page.server');

// Types
type ActionEvent = Parameters<NonNullable<typeof actions.setSectionHidden>>[0];

interface Appel {
	table: string;
	payload: unknown;
	filtres: string[];
}

// Constantes
const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const SECTION = '22222222-2222-4222-8222-222222222222';

// Functions
function evenement(
	champs: Record<string, string>,
	reponse: { data: unknown; error: { message: string } | null }
): { event: ActionEvent; appels: Appel[] } {
	const appels: Appel[] = [];
	const body = new FormData();
	for (const [cle, valeur] of Object.entries(champs)) body.set(cle, valeur);

	const supabase = {
		from(table: string) {
			const appel: Appel = { table, payload: null, filtres: [] };
			appels.push(appel);
			const requete = {
				update: (payload: unknown) => {
					appel.payload = payload;
					return requete;
				},
				eq: (col: string, val: string) => {
					appel.filtres.push(`${col}=${val}`);
					return requete;
				},
				select: async () => reponse
			};
			return requete;
		}
	};

	return {
		event: {
			request: new Request('http://localhost/x', { method: 'POST', body }),
			locals: { supabase },
			params: { classId: 'classe', chapterId: CHAPITRE }
		} as unknown as ActionEvent,
		appels
	};
}

function statut(resultat: unknown): number | null {
	const r = resultat as { status?: number };
	return typeof r?.status === 'number' ? r.status : null;
}

describe('setSectionHidden', () => {
	it('masque la section de CE chapitre', async () => {
		const { event, appels } = evenement(
			{ sectionId: SECTION, hidden: 'true' },
			{ data: [{ id: SECTION }], error: null }
		);

		const r = await actions.setSectionHidden!(event);

		expect(statut(r)).toBeNull();
		expect(r).toMatchObject({ success: true, action: 'hideSection' });
		expect(appels).toEqual([
			{
				table: 'chapter_sections',
				payload: { hidden: true },
				filtres: [`id=${SECTION}`, `chapter_id=${CHAPITRE}`]
			}
		]);
	});

	it('réaffiche la section', async () => {
		const { event, appels } = evenement(
			{ sectionId: SECTION, hidden: 'false' },
			{ data: [{ id: SECTION }], error: null }
		);

		const r = await actions.setSectionHidden!(event);

		expect(r).toMatchObject({ success: true, action: 'unhideSection' });
		expect(appels[0].payload).toEqual({ hidden: false });
	});

	it('refuse un identifiant invalide, sans écrire', async () => {
		const { event, appels } = evenement(
			{ sectionId: 'pas-un-uuid', hidden: 'true' },
			{ data: [], error: null }
		);

		expect(statut(await actions.setSectionHidden!(event))).toBe(400);
		expect(appels).toHaveLength(0);
	});

	it('zéro ligne écrite (autre chapitre, RLS) : 404, jamais un succès', async () => {
		const { event } = evenement({ sectionId: SECTION, hidden: 'true' }, { data: [], error: null });

		expect(statut(await actions.setSectionHidden!(event))).toBe(404);
	});

	it('une panne d’écriture : 500', async () => {
		const { event } = evenement(
			{ sectionId: SECTION, hidden: 'true' },
			{ data: null, error: { message: 'panne' } }
		);

		expect(statut(await actions.setSectionHidden!(event))).toBe(500);
	});
});
