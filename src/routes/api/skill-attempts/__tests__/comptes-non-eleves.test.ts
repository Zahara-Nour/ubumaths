/**
 * POST /api/skill-attempts — seuls les élèves laissent une trace
 * ===============================================================
 *
 * Répondre dans l'aperçu admin d'un modèle, ou sur une page de démo, passe par
 * `FlashCard`, qui poste ici pour le compte connecté. Avant : un admin ou un
 * professeur recevait `skill_attempts` + fiche FSRS + carte du deck Programme,
 * et polluait les statistiques.
 *
 * Règle : seul un profil `student` est enregistré. Tout autre rôle reçoit
 * 200 `{ success: true, recorded: false }`, sans aucune écriture.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());
const insert = vi.hoisted(() => vi.fn());
const lectureModele = vi.hoisted(() => vi.fn());
const role = vi.hoisted(() => ({ value: 'student' as 'student' | 'teacher' | 'admin' }));

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({ user: { id: COMPTE }, profile: { id: COMPTE, role: role.value } })
}));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => {
						lectureModele();
						return {
							data: {
								id: MODELE,
								options: null,
								status: 'published',
								question_template_points: [{ point_id: POINT }]
							},
							error: null
						};
					}
				})
			})
		})
	})
}));

import { POST } from '../+server';

const COMPTE = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';
const POINT = '33333333-3333-4333-8333-333333333333';

function fauxSupabase() {
	return {
		from: () => ({
			insert: (row: Record<string, unknown>) => {
				insert(row);
				return { select: async () => ({ data: [{ id: 'attempt-1' }], error: null }) };
			}
		})
	};
}

async function post() {
	const request = new Request('http://localhost/api/skill-attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ template_id: MODELE, success: true, with_help: false })
	});
	return POST({ request, locals: { supabase: fauxSupabase() } } as never);
}

describe('POST /api/skill-attempts — comptes non élèves', () => {
	beforeEach(() => {
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
		insert.mockReset();
		lectureModele.mockReset();
	});

	it.each(['admin', 'teacher'] as const)(
		'%s : 200 recorded:false, aucune écriture ni effet FSRS/deck',
		async (r) => {
			role.value = r;
			const response = await post();
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ success: true, recorded: false });
			expect(insert).not.toHaveBeenCalled();
			expect(applyFsrsReview).not.toHaveBeenCalled();
			expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
			expect(lectureModele).not.toHaveBeenCalled();
		}
	);

	it('student : comportement inchangé (FSRS + INSERT + deck)', async () => {
		role.value = 'student';
		const response = await post();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ inserted: 1, point_ids: [POINT] });
		expect(applyFsrsReview).toHaveBeenCalledTimes(1);
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({ student_id: COMPTE, template_id: MODELE, success: true })
		);
		expect(ensureProgrammeDeckCard).toHaveBeenCalledWith(expect.anything(), COMPTE, MODELE);
	});

	it('corps invalide : 400 quel que soit le rôle', async () => {
		role.value = 'admin';
		const request = new Request('http://localhost/api/skill-attempts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ template_id: 'pas-un-uuid', success: true })
		});
		await expect(
			POST({ request, locals: { supabase: fauxSupabase() } } as never)
		).rejects.toMatchObject({
			status: 400
		});
	});
});
