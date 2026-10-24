/**
 * POST /api/srs/review/submit — forfait du Palotin (décision de David, 2026-10-18)
 * ================================================================================
 *
 * La route renvoie `buddy_xp`, de la MÊME forme que `POST /api/tests/save`
 * (l'écran de fin de séance l'affiche). La décision « séance terminée, une fois
 * par jour » est prise par `rewardFinishedReviewSession` (testé à part) ; ici, le
 * branchement : appel avec l'identité de la SESSION et le paquet révisé, gain
 * rendu, et une panne du Palotin ne fait jamais échouer la révision.
 *
 * Gidouilles de la révision du jour (décision de David, 2026-10-24) : +2 avec le
 * forfait, donc au plus une fois par jour, au client service, rendues sous
 * `review_gidouilles` ; une panne du crédit ne fait pas échouer la révision.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BuddyXpFromExerciseResult } from '$lib/server/buddy-xp-service';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const role = vi.hoisted(() => ({ current: 'student' }));
const rewardFinishedReviewSession = vi.hoisted(() =>
	vi.fn<
		(
			supabase: unknown,
			userId: string,
			deckId: string,
			dayStartIso: string
		) => Promise<{ buddyXp: BuddyXpFromExerciseResult | null; gidouilles: number } | null>
	>()
);

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard: vi.fn() }));
vi.mock('$lib/server/srs/review-session-reward', () => ({ rewardFinishedReviewSession }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({ user: { id: ELEVE }, profile: { role: role.current } })
}));
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: () => {} }));

import { POST } from '../+server';

// Constantes
const ELEVE = '11111111-1111-4111-8111-111111111111';
const CARTE = '22222222-2222-4222-8222-222222222222';
const PAQUET = '33333333-3333-4333-8333-333333333333';
const GAIN: BuddyXpFromExerciseResult = {
	xpResult: {
		xp_gained: 20,
		new_xp: 60,
		new_level: 2,
		leveled_up: false,
		daily_cap_reached: false
	},
	streakUpdated: false,
	newStreak: 2,
	streakBonusXp: 0,
	isNewTheme: false
};

// Functions
function fauxSupabase() {
	return {
		from(table: string) {
			if (table === 'srs_cards') {
				return {
					select: () => ({
						eq: () => ({
							single: async () => ({
								data: { id: CARTE, deck_id: PAQUET, card_type: 'custom', template_id: null },
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
			// srs_review_sessions : aucune séance du jour, création acceptée
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
	return (await response.json()) as {
		success: boolean;
		buddy_xp: unknown;
		review_gidouilles: number;
	};
}

describe('POST /api/srs/review/submit — forfait du Palotin', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		applyFsrsReview.mockReset().mockResolvedValue({
			difficulty: 5,
			stability: 1,
			state: 'review',
			nextReview: new Date().toISOString(),
			totalReviews: 1
		});
		rewardFinishedReviewSession.mockReset().mockResolvedValue({ buddyXp: GAIN, gidouilles: 2 });
		role.current = 'student';
	});

	it('rend le gain du Palotin sous `buddy_xp`, forme de /api/tests/save', async () => {
		const body = await reviser();
		expect(body.success).toBe(true);
		expect(body.buddy_xp).toEqual(GAIN);
	});

	it('décide avec l’identité de la session et le paquet révisé', async () => {
		await reviser();
		expect(rewardFinishedReviewSession).toHaveBeenCalledTimes(1);
		const [, userId, deckId, dayStart] = rewardFinishedReviewSession.mock.calls[0];
		expect([userId, deckId]).toEqual([ELEVE, PAQUET]);
		expect(Number.isNaN(Date.parse(dayStart))).toBe(false);
	});

	it('pas de forfait (séance pas finie, déjà donné, sans Palotin) : `buddy_xp` null', async () => {
		rewardFinishedReviewSession.mockResolvedValue(null);
		expect((await reviser()).buddy_xp).toBeNull();
	});

	it('panne du Palotin : la révision reste enregistrée (200), `buddy_xp` null', async () => {
		rewardFinishedReviewSession.mockRejectedValue(new Error('panne'));
		const body = await reviser();
		expect(body.success).toBe(true);
		expect(body.buddy_xp).toBeNull();
	});

	it('séance récompensée : les gidouilles sont rendues sous `review_gidouilles`', async () => {
		expect((await reviser()).review_gidouilles).toBe(2);
	});

	it('sans Palotin : pas de `buddy_xp`, mais les gidouilles de la séance', async () => {
		rewardFinishedReviewSession.mockResolvedValue({ buddyXp: null, gidouilles: 2 });
		const body = await reviser();
		expect(body.buddy_xp).toBeNull();
		expect(body.review_gidouilles).toBe(2);
	});

	it('rien de donné : `buddy_xp` null, aucune gidouille', async () => {
		rewardFinishedReviewSession.mockResolvedValue(null);
		const body = await reviser();
		expect(body.buddy_xp).toBeNull();
		expect(body.review_gidouilles).toBe(0);
	});

	it('compte non élève (prof qui révise) : aucune récompense demandée', async () => {
		role.current = 'teacher';
		const body = await reviser();
		expect(rewardFinishedReviewSession).not.toHaveBeenCalled();
		expect(body.buddy_xp).toBeNull();
		expect(body.review_gidouilles).toBe(0);
	});
});
