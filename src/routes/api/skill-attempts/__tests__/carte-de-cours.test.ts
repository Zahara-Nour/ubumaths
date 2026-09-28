/**
 * POST /api/skill-attempts — source de la tentative
 * ==================================================
 *
 * Une carte de cours (#617) n'a pas de réponse à valider : la tentative est une
 * auto-évaluation. La source est lue en BASE (`options.courseCard` du modèle),
 * jamais dans le corps de la requête.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({ user: { id: ELEVE } })
}));
// Le serveur lit la nature du modèle avec ses propres droits : il voit aussi
// les brouillons, que la RLS cache à l'élève.
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({
						data: {
							id: MODELE,
							options: optionsDuModele,
							status: modeleEnBrouillon ? 'draft' : 'published',
							question_template_points: pointsDuModele
						},
						error: null
					})
				})
			})
		})
	})
}));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';

let attemptsInseres: Record<string, unknown>[];
let optionsDuModele: unknown;
/** Modèle repassé en brouillon : la RLS le cache à l'élève (0 ligne, sans erreur). */
let modeleEnBrouillon = false;
/** Points de programme tagués sur le modèle. */
let pointsDuModele: { point_id: string }[] = [];

function fauxSupabase() {
	return {
		from(table: string) {
			if (table === 'question_templates') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: modeleEnBrouillon
									? null
									: { id: MODELE, options: optionsDuModele, question_template_points: [] },
								error: null
							})
						})
					})
				};
			}
			return {
				// INSERT … `.select('id')` : la route vérifie la ligne écrite
				insert: (row: Record<string, unknown>) => ({
					select: async () => {
						attemptsInseres.push(row);
						return { data: [{ id: 'attempt-1' }], error: null };
					}
				})
			};
		}
	};
}

async function poster(body: Record<string, unknown>) {
	const request = new Request('http://localhost/api/skill-attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const response = await POST({ request, locals: { supabase: fauxSupabase() } } as never);
	expect(response.status).toBe(200);
}

describe('POST /api/skill-attempts — source', () => {
	beforeEach(() => {
		attemptsInseres = [];
		optionsDuModele = null;
		modeleEnBrouillon = false;
		pointsDuModele = [];
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
	});

	it('question ordinaire : source auto (inchangé)', async () => {
		await poster({ template_id: MODELE, success: true });
		expect(attemptsInseres[0]).toMatchObject({ source: 'auto', success: true, grade: 3 });
	});

	it('carte de cours : source student_self', async () => {
		optionsDuModele = { courseCard: true };
		await poster({ template_id: MODELE, success: false });
		expect(attemptsInseres[0]).toMatchObject({
			source: 'student_self',
			success: false,
			grade: 1
		});
	});

	// Carte repassée en brouillon pendant la série (décision de David, 2026-09-28) :
	// la trace est gardée, en auto-évaluation, au lieu d'un refus 404.
	it('carte repassée en brouillon : trace gardée, source student_self', async () => {
		optionsDuModele = { courseCard: true };
		modeleEnBrouillon = true;
		await poster({ template_id: MODELE, success: true });
		expect(attemptsInseres[0]).toMatchObject({ source: 'student_self', success: true });
	});

	// Relevé par security-auditor : un brouillon ajouté au paquet Programme y serait
	// une carte fantôme (la révision le relit avec les droits de l'élève).
	it('question repassée en brouillon : trace gardée, mais pas ajoutée au paquet Programme', async () => {
		modeleEnBrouillon = true;
		pointsDuModele = [{ point_id: '33333333-3333-4333-8333-333333333333' }];
		await poster({ template_id: MODELE, success: true });
		expect(attemptsInseres[0]).toMatchObject({ source: 'auto' });
		expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
	});

	it('question publiée taguée : ajoutée au paquet Programme (inchangé)', async () => {
		pointsDuModele = [{ point_id: '33333333-3333-4333-8333-333333333333' }];
		await poster({ template_id: MODELE, success: true });
		expect(ensureProgrammeDeckCard).toHaveBeenCalledTimes(1);
	});
});
