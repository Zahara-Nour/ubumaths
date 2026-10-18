/**
 * Forfait de révision espacée : une séance TERMINÉE, au plus une fois par jour
 * ============================================================================
 *
 * Décision de David (2026-10-18) : récompenser l'effort, pas la réussite (les
 * cartes sont auto-évaluées). Une séance est terminée quand, après cette
 * réponse, le paquet n'a plus aucune carte due (lu en base, jamais déclaré par
 * le client). « Une fois par jour » sans migration : la séance du jour est
 * marquée terminée (`srs_review_sessions.completed_at`, jusqu'ici jamais écrite)
 * par une écriture CONDITIONNELLE (`completed_at is null`) vérifiée par
 * `.select()` ; le forfait n'est dû que si aucune autre séance n'a été terminée
 * le même jour (toute séance terminée aujourd'hui, hors celle qu'on vient de marquer).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BuddyXpFromExerciseResult } from '$lib/server/buddy-xp-service';

const addBuddyXpFromReviewSession = vi.hoisted(() =>
	vi.fn<(supabase: unknown, studentId: string) => Promise<BuddyXpFromExerciseResult | null>>()
);
vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromReviewSession }));

import { rewardFinishedReviewSession } from '../review-session-reward';

// Types
type Result = { data: unknown; error: { message: string; code?: string } | null };
type Call = { table: string; op: string; chain: [string, unknown[]][] };

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const DECK = '33333333-3333-4333-8333-333333333333';
const DAY_START = '2026-10-18T00:00:00.000Z';
const REWARD: BuddyXpFromExerciseResult = {
	xpResult: {
		xp_gained: 20,
		new_xp: 60,
		new_level: 2,
		leveled_up: false,
		daily_cap_reached: false
	},
	streakUpdated: false,
	newStreak: 0,
	streakBonusXp: 0,
	isNewTheme: false
};

// Variables
let dueCards: Result;
let claimed: Result;
let otherCompleted: Result;
let calls: Call[];
let rpcCalls: [string, unknown][];

// Functions
/** Chaîne PostgREST factice : chaque méthode est notée, la fin résout `result`. */
function chain(call: Call, result: () => Result) {
	const builder: Record<string, unknown> = {};
	for (const method of ['eq', 'neq', 'gte', 'is', 'select', 'limit', 'order']) {
		builder[method] = (...args: unknown[]) => {
			call.chain.push([method, args]);
			return builder;
		};
	}
	builder.then = (resolve: (r: Result) => unknown) => resolve(result());
	return builder;
}

function fakeSupabase(): SupabaseClient<Database> {
	return {
		rpc: async (name: string, args: unknown) => {
			rpcCalls.push([name, args]);
			return dueCards;
		},
		from(table: string) {
			return {
				update: (row: unknown) => {
					const call: Call = { table, op: 'update', chain: [['update', [row]]] };
					calls.push(call);
					return chain(call, () => claimed);
				},
				select: (...args: unknown[]) => {
					const call: Call = { table, op: 'select', chain: [['select', args]] };
					calls.push(call);
					return chain(call, () => otherCompleted);
				}
			};
		}
	} as unknown as SupabaseClient<Database>;
}

function claimCall(): Call | undefined {
	return calls.find((c) => c.op === 'update');
}

describe('rewardFinishedReviewSession', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		dueCards = { data: [], error: null };
		claimed = { data: [{ id: 'session-1' }], error: null };
		otherCompleted = { data: [], error: null };
		calls = [];
		rpcCalls = [];
		addBuddyXpFromReviewSession.mockReset().mockResolvedValue(REWARD);
	});

	it('dernière carte due passée : séance marquée terminée, forfait crédité', async () => {
		const result = await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START);

		expect(result).toEqual(REWARD);
		expect(addBuddyXpFromReviewSession).toHaveBeenCalledWith(expect.anything(), STUDENT);
		// Échéancier lu en base, échéance respectée (pas la révision forcée)
		expect(rpcCalls).toEqual([
			['get_due_cards_for_deck', { p_user_id: STUDENT, p_deck_id: DECK, p_all: false }]
		]);
		// Marquage conditionnel de la séance du jour de CE paquet, vérifié
		const claim = claimCall();
		expect(claim?.table).toBe('srs_review_sessions');
		const [, [row]] = claim!.chain[0];
		expect(Object.keys(row as object)).toEqual(['completed_at']);
		expect(claim?.chain).toEqual(
			expect.arrayContaining([
				['eq', ['user_id', STUDENT]],
				['eq', ['deck_id', DECK]],
				['gte', ['started_at', DAY_START]],
				['is', ['completed_at', null]],
				['select', ['id']]
			])
		);
	});

	it('il reste des cartes dues : rien, la séance continue', async () => {
		dueCards = { data: [{ card_id: 'c2' }], error: null };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(claimCall()).toBeUndefined();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('séance déjà terminée aujourd’hui (marquage sans ligne) : pas de second forfait', async () => {
		claimed = { data: [], error: null };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('une AUTRE séance déjà terminée aujourd’hui : marquée, mais sans forfait', async () => {
		otherCompleted = { data: [{ id: 'session-1' }, { id: 'session-0' }], error: null };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(claimCall()).toBeDefined();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
		const check = calls.find((c) => c.op === 'select');
		expect(check?.chain).toEqual(
			expect.arrayContaining([
				['eq', ['user_id', STUDENT]],
				['gte', ['completed_at', DAY_START]]
			])
		);
	});

	it('seule la séance qu’on vient de marquer est terminée aujourd’hui : forfait dû', async () => {
		otherCompleted = { data: [{ id: 'session-1' }], error: null };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toEqual(
			REWARD
		);
	});

	it('échéancier illisible : rien (on ne conclut pas « terminé » sur une panne)', async () => {
		dueCards = { data: null, error: { message: 'panne' } };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(claimCall()).toBeUndefined();
	});

	it('marquage en erreur : rien', async () => {
		claimed = { data: null, error: { message: 'panne' } };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('vérification des autres séances illisible : rien', async () => {
		otherCompleted = { data: null, error: { message: 'panne' } };
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('élève sans Palotin : séance marquée terminée, aucun gain', async () => {
		addBuddyXpFromReviewSession.mockResolvedValue(null);
		expect(await rewardFinishedReviewSession(fakeSupabase(), STUDENT, DECK, DAY_START)).toBeNull();
		expect(claimCall()).toBeDefined();
	});
});
