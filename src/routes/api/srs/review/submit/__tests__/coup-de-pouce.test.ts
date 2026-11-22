/**
 * POST /api/srs/review/submit — coup de pouce ouvert (idée 5, `idees-format`)
 * ==========================================================================
 *
 * « Réussi » après un indice ouvert : demi-réussite, la révision espacée reçoit
 * « Difficile » (2) au lieu de « Bien » (3), et la trace dit « avec indice ».
 * « Pas réussi » reste « À revoir » (1). Sans indice : rien ne change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/srs/fsrs-actions.ts', () => ({ applyFsrsReview }));
vi.mock('#lib/server/srs/programme-deck.ts', () => ({ ensureProgrammeDeckCard }));
vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireAuth: async () => ({ user: { id: ELEVE }, profile: { role: 'student' } })
}));
vi.mock('#lib/server/middleware/consent.ts', () => ({ requireConsent: () => {} }));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const CARTE = '22222222-2222-4222-8222-222222222222';
const PAQUET = '33333333-3333-4333-8333-333333333333';
const MODELE = '44444444-4444-4444-8444-444444444444';

/** Le modèle lié à la carte, tel que la RLS le rend à l'élève (null = caché). */
/** Lignes envoyées à `skill_attempts` */
let traces: Record<string, unknown>[] = [];
/** Type de la carte révisée */
let typeCarte: 'template' | 'custom' = 'template';

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
									card_type: typeCarte,
									template_id: typeCarte === 'template' ? MODELE : null,
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
				return {
					insert: async (row: Record<string, unknown>) => {
						traces.push(row);
						return { error: null };
					}
				};
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

async function reviser(corps: Record<string, unknown>) {
	const request = new Request('http://localhost/api/srs/review/submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cardId: CARTE, deckId: PAQUET, ...corps })
	});
	return POST({ request, locals: { supabase: fauxSupabase() } } as never);
}

describe('POST /api/srs/review/submit — coup de pouce', () => {
	beforeEach(() => {
		traces = [];
		typeCarte = 'template';
		modeleLu = { options: null, status: 'published', question_template_points: [] };
		applyFsrsReview.mockReset().mockResolvedValue({
			difficulty: 5,
			stability: 1,
			state: 1,
			nextReview: new Date(),
			totalReviews: 1
		});
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
	});

	it('« Réussi » avec indice : « Difficile » pour FSRS, trace « avec indice »', async () => {
		const response = await reviser({ grade: 3, withHelp: true });
		expect(response.status).toBe(200);
		expect(applyFsrsReview.mock.calls[0][5]).toBe(2);
		expect(traces).toEqual([
			expect.objectContaining({ grade: 2, success: true, with_help: true, place: 'review' })
		]);
	});

	it('« Pas réussi » avec indice : reste « À revoir »', async () => {
		await reviser({ grade: 1, withHelp: true });
		expect(applyFsrsReview.mock.calls[0][5]).toBe(1);
		expect(traces).toEqual([expect.objectContaining({ grade: 1, with_help: true })]);
	});

	it('sans indice : « Bien », trace sans indice (inchangé)', async () => {
		await reviser({ grade: 3 });
		expect(applyFsrsReview.mock.calls[0][5]).toBe(3);
		expect(traces).toEqual([expect.objectContaining({ grade: 3, with_help: false })]);
	});

	it('carte personnelle : « avec indice » ignoré (ni indice ni trace), note gardée', async () => {
		typeCarte = 'custom';
		await reviser({ grade: 3, withHelp: true });
		expect(applyFsrsReview.mock.calls[0][5]).toBe(3);
		expect(traces).toEqual([]);
	});

	it('refuse un « avec indice » qui n’est pas un booléen', async () => {
		const response = await reviser({ grade: 3, withHelp: 'oui' });
		expect(response.status).toBe(400);
		expect(applyFsrsReview).not.toHaveBeenCalled();
	});
});
