/**
 * POST /api/srs/review/submit — paquet « Programme » (Q113)
 * =========================================================
 *
 * Réviser une carte d'un paquet quelconque (paquet assigné, paquet de
 * chapitre…) ajoute le modèle au paquet Programme s'il est tagué à un point de
 * programme. Mais une question de cours (ou une carte de cours) n'y entre
 * JAMAIS (décision Q113) ; un brouillon non plus (même règle que
 * `/api/skill-attempts`). La nature du modèle est lue en base, avec la carte.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({ user: { id: ELEVE }, profile: { role: 'student' } })
}));
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: () => {} }));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const CARTE = '22222222-2222-4222-8222-222222222222';
const PAQUET = '33333333-3333-4333-8333-333333333333';
const MODELE = '44444444-4444-4444-8444-444444444444';
const POINT = '55555555-5555-4555-8555-555555555555';

/** Le modèle lié à la carte, tel que la RLS le rend à l'élève (null = caché). */
let modeleLu: {
	options: unknown;
	status: string;
	question_template_points: { point_id: string }[];
} | null;

function fauxSupabase() {
	return {
		from(table: string) {
			if (table === 'srs_cards') {
				return {
					select: () => ({
						eq: () => ({
							single: async () => ({
								data: {
									id: CARTE,
									deck_id: PAQUET,
									card_type: 'template',
									template_id: MODELE,
									question_templates: modeleLu
								},
								error: null
							})
						})
					})
				};
			}
			if (table === 'srs_decks') {
				return {
					select: () => ({
						eq: () => ({
							eq: () => ({
								single: async () => ({ data: { id: PAQUET, owner_id: ELEVE }, error: null })
							})
						})
					})
				};
			}
			if (table === 'skill_attempts') {
				return { insert: async () => ({ error: null }) };
			}
			// srs_review_sessions
			return {
				select: () => ({
					eq: () => ({
						eq: () => ({
							gte: () => ({
								order: () => ({
									limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) })
								})
							})
						})
					})
				}),
				insert: async () => ({ error: null })
			};
		}
	};
}

async function reviser() {
	const request = new Request('http://localhost/api/srs/review/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cardId: CARTE, deckId: PAQUET, grade: 3 })
	});
	const response = await POST({ request, locals: { supabase: fauxSupabase() } } as never);
	expect(response.status, 'statut de la route').toBe(200);
}

describe('POST /api/srs/review/submit — paquet Programme', () => {
	beforeEach(() => {
		modeleLu = {
			options: null,
			status: 'published',
			question_template_points: [{ point_id: POINT }]
		};
		applyFsrsReview.mockReset().mockResolvedValue({
			difficulty: 5,
			stability: 1,
			state: 1,
			nextReview: new Date(),
			totalReviews: 1
		});
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
	});

	it('question ordinaire publiée taguée : ajoutée au paquet Programme (inchangé)', async () => {
		await reviser();
		expect(ensureProgrammeDeckCard).toHaveBeenCalledTimes(1);
		expect(ensureProgrammeDeckCard.mock.calls[0].slice(1)).toEqual([ELEVE, MODELE]);
	});

	it('question non taguée : pas ajoutée (inchangé)', async () => {
		modeleLu = { options: null, status: 'published', question_template_points: [] };
		await reviser();
		expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
	});

	it('question de cours taguée : jamais ajoutée au paquet Programme', async () => {
		modeleLu = {
			options: { courseQuestion: true },
			status: 'published',
			question_template_points: [{ point_id: POINT }]
		};
		await reviser();
		expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
	});

	it('carte de cours taguée : jamais ajoutée au paquet Programme', async () => {
		modeleLu = {
			options: { courseCard: true },
			status: 'published',
			question_template_points: [{ point_id: POINT }]
		};
		await reviser();
		expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
	});

	it('modèle illisible (brouillon caché par la RLS) : pas ajouté', async () => {
		modeleLu = null;
		await reviser();
		expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
	});
});
