/**
 * Forfait de révision espacée : l'effort du jour, au plus une fois par jour
 * =========================================================================
 *
 * Décision de David (2026-10-18) : récompenser l'effort, pas la réussite (les
 * cartes sont auto-évaluées). Règle (revue du 2026-10-18) : après la carte
 * notée, le forfait tombe si
 *   (a) l'élève a révisé au moins 10 cartes aujourd'hui, tous paquets confondus,
 *   (b) OU ce paquet n'a plus aucune carte due ET il en a révisé au moins 3.
 * Le compte du jour se lit dans `srs_card_stats.last_review` (écrite par le
 * serveur seul, Q171 : l'élève ne peut pas la forger).
 *
 * « Une fois par jour » sans migration : `srs_review_sessions.completed_at`
 * marque la séance récompensée. Gidouilles (décision de David, 2026-10-24) : +2
 * pour la séance terminée, avec ou sans Palotin, plafond d'XP atteint ou non ; la
 * réclamation n'est relâchée que si RIEN n'a été donné (ni XP ni gidouilles).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BuddyXpFromExerciseResult } from '$lib/server/buddy-xp-service';
import type { BuddyState } from '$lib/types/buddy';
import {
	DAILY_XP_CAP,
	REVIEW_REWARD_CARDS_ANY_DECK,
	REVIEW_REWARD_CARDS_EMPTIED_DECK
} from '$lib/utils/buddy-xp';

const addBuddyXpFromReviewSession = vi.hoisted(() =>
	vi.fn<(supabase: unknown, studentId: string) => Promise<BuddyXpFromExerciseResult | null>>()
);
const getStudentBuddy = vi.hoisted(() =>
	vi.fn<(supabase: unknown, studentId: string) => Promise<BuddyState | null>>()
);
vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromReviewSession }));
vi.mock('$lib/server/buddy-queries', () => ({ getStudentBuddy }));
const creditStudentGidouilles = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/achievements/credit-gidouilles', () => ({ creditStudentGidouilles }));
// Réclamation et relâche au client SERVICE (l'élève n'écrit pas `completed_at`)
const service = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => service.current
}));

import { rewardFinishedReviewSession } from '../review-session-reward';

// Types
type Result = { data?: unknown; count?: number | null; error: { message: string } | null };
type Call = { table: string; op: string; chain: [string, unknown[]][] };

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const DECK = '33333333-3333-4333-8333-333333333333';
const DAY_START = '2026-10-18T00:00:00.000Z';
const TODAY = new Date().toISOString().split('T')[0];
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
/** Réponses par « table:opération », consommées dans l'ordre des appels. */
let results: Record<string, Result[]>;
let dueCards: Result;
let calls: Call[];
/** Requêtes reçues par le client de l'élève seul. */
let studentCalls: Call[];
let rpcCalls: [string, unknown][];

// Functions
function buddy(overrides: Partial<BuddyState> = {}): BuddyState {
	return {
		student_id: STUDENT,
		palotin_type: 'giron',
		xp: 40,
		level: 2,
		current_streak: 0,
		longest_streak: 0,
		last_activity_date: TODAY,
		xp_earned_today: 0,
		last_xp_date: TODAY,
		themes_explored: [],
		change_count: 0,
		equipped_skin_id: null,
		constance_week_start: null,
		constance_days_this_week: 0,
		...overrides
	};
}

/** Chaîne PostgREST factice : chaque méthode est notée, la fin résout la réponse suivante. */
function chain(call: Call) {
	const builder: Record<string, unknown> = {};
	for (const method of ['eq', 'neq', 'gte', 'is', 'in', 'select', 'limit', 'order']) {
		builder[method] = (...args: unknown[]) => {
			call.chain.push([method, args]);
			return builder;
		};
	}
	builder.then = (resolve: (r: Result) => unknown) => {
		const queue = results[`${call.table}:${call.op}`] ?? [];
		return resolve(queue.shift() ?? { data: [], error: null });
	};
	return builder;
}

function fakeSupabase(own: () => Call[]): SupabaseClient<Database> {
	return {
		rpc: async (name: string, args: unknown) => {
			rpcCalls.push([name, args]);
			return dueCards;
		},
		from(table: string) {
			const start = (op: string, args: unknown[]) => {
				const call: Call = { table, op, chain: [[op, args]] };
				calls.push(call);
				own().push(call);
				return chain(call);
			};
			return {
				update: (...args: unknown[]) => start('update', args),
				select: (...args: unknown[]) => start('select', args)
			};
		}
	} as unknown as SupabaseClient<Database>;
}

function reviewedToday(count: number) {
	results['srs_card_stats:select'] = [{ count, error: null }];
}

function updates(): Call[] {
	return calls.filter((c) => c.op === 'update');
}

function reward() {
	service.current = fakeSupabase(() => []);
	return rewardFinishedReviewSession(
		fakeSupabase(() => studentCalls),
		STUDENT,
		DECK,
		DAY_START
	);
}

describe('rewardFinishedReviewSession', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		results = {
			// 1re lecture : séances déjà terminées aujourd'hui ; 2e : vérification après réclamation
			'srs_review_sessions:select': [
				{ data: [], error: null },
				{ data: [{ id: 'session-1' }], error: null }
			],
			'srs_review_sessions:update': [
				{ data: [{ id: 'session-1' }], error: null },
				{ data: [{ id: 'session-1' }], error: null }
			]
		};
		reviewedToday(REVIEW_REWARD_CARDS_EMPTIED_DECK);
		dueCards = { data: [], error: null };
		calls = [];
		studentCalls = [];
		rpcCalls = [];
		getStudentBuddy.mockReset().mockResolvedValue(buddy());
		addBuddyXpFromReviewSession.mockReset().mockResolvedValue(REWARD);
		creditStudentGidouilles.mockReset().mockResolvedValue(null);
	});

	it('les seuils : 10 cartes tous paquets, 3 cartes et paquet vidé', () => {
		expect(REVIEW_REWARD_CARDS_ANY_DECK).toBe(10);
		expect(REVIEW_REWARD_CARDS_EMPTIED_DECK).toBe(3);
	});

	it('(b) paquet vidé après 3 cartes du jour : séance réclamée, forfait crédité', async () => {
		expect(await reward()).toEqual({ buddyXp: REWARD, gidouilles: 2 });
		expect(rpcCalls).toEqual([
			['get_due_cards_for_deck', { p_user_id: STUDENT, p_deck_id: DECK, p_all: false }]
		]);
		// Aucune écriture au client de l'élève
		expect(studentCalls.filter((c) => c.op === 'update')).toEqual([]);
		const [claim] = updates();
		expect(claim.chain).toEqual(
			expect.arrayContaining([
				['eq', ['user_id', STUDENT]],
				['eq', ['deck_id', DECK]],
				['gte', ['started_at', DAY_START]],
				['is', ['completed_at', null]],
				['select', ['id']]
			])
		);
		// Le compte du jour vient de la mémoire de révision (écrite par le serveur seul)
		const count = calls.find((c) => c.table === 'srs_card_stats');
		expect(count?.chain).toEqual(
			expect.arrayContaining([
				['eq', ['user_id', STUDENT]],
				['gte', ['last_review', DAY_START]]
			])
		);
	});

	it('(b) paquet vidé mais seulement 1 carte aujourd’hui (paquet d’une carte) : rien', async () => {
		reviewedToday(1);
		expect(await reward()).toBeNull();
		expect(updates()).toEqual([]);
		expect(rpcCalls).toEqual([]);
	});

	it('(b) 3 cartes mais il reste des cartes dues : rien', async () => {
		dueCards = { data: [{ card_id: 'c2' }], error: null };
		expect(await reward()).toBeNull();
		expect(updates()).toEqual([]);
	});

	it('(a) 10 cartes du jour : forfait même s’il reste des cartes dues, sans lire l’échéancier', async () => {
		reviewedToday(REVIEW_REWARD_CARDS_ANY_DECK);
		dueCards = { data: [{ card_id: 'c2' }], error: null };
		expect(await reward()).toEqual({ buddyXp: REWARD, gidouilles: 2 });
		expect(rpcCalls).toEqual([]);
	});

	it('une séance déjà terminée aujourd’hui : rien, ni compte ni échéancier', async () => {
		results['srs_review_sessions:select'] = [{ data: [{ id: 'session-0' }], error: null }];
		reviewedToday(REVIEW_REWARD_CARDS_ANY_DECK);
		expect(await reward()).toBeNull();
		expect(calls.some((c) => c.table === 'srs_card_stats')).toBe(false);
		expect(rpcCalls).toEqual([]);
		expect(updates()).toEqual([]);
	});

	it('plafond du jour déjà atteint : pas d’XP, mais la séance rapporte ses gidouilles', async () => {
		getStudentBuddy.mockResolvedValue(buddy({ xp_earned_today: DAILY_XP_CAP }));
		reviewedToday(REVIEW_REWARD_CARDS_ANY_DECK);
		expect(await reward()).toEqual({ buddyXp: null, gidouilles: 2 });
		expect(updates()).toHaveLength(1);
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('plafond atteint HIER : la journée repart, forfait dû', async () => {
		getStudentBuddy.mockResolvedValue(
			buddy({ xp_earned_today: DAILY_XP_CAP, last_xp_date: '2000-01-01' })
		);
		expect(await reward()).toEqual({ buddyXp: REWARD, gidouilles: 2 });
	});

	it('élève sans Palotin : la séance est réclamée et rapporte ses gidouilles', async () => {
		getStudentBuddy.mockResolvedValue(null);
		expect(await reward()).toEqual({ buddyXp: null, gidouilles: 2 });
		expect(updates()).toHaveLength(1);
	});

	it('gidouilles : +2 au client service, pour l’élève de la session, une seule fois', async () => {
		await reward();
		expect(creditStudentGidouilles).toHaveBeenCalledTimes(1);
		expect(creditStudentGidouilles).toHaveBeenCalledWith(
			service.current,
			STUDENT,
			2,
			'Révision du jour terminée'
		);
	});

	it('gidouilles en échec, XP donnée : la réclamation est gardée, gidouilles à 0', async () => {
		creditStudentGidouilles.mockResolvedValue({ message: 'refusé' });
		expect(await reward()).toEqual({ buddyXp: REWARD, gidouilles: 0 });
		expect(updates()).toHaveLength(1);
	});

	it('séance déjà récompensée, déjà réclamée ou effort insuffisant : aucune gidouille', async () => {
		results['srs_review_sessions:select'] = [{ data: [{ id: 'session-0' }], error: null }];
		expect(await reward()).toBeNull();
		reviewedToday(1);
		results['srs_review_sessions:select'] = [{ data: [], error: null }];
		expect(await reward()).toBeNull();
		results['srs_review_sessions:select'] = [{ data: [], error: null }];
		reviewedToday(REVIEW_REWARD_CARDS_ANY_DECK);
		results['srs_review_sessions:update'] = [{ data: [], error: null }];
		expect(await reward()).toBeNull();
		expect(creditStudentGidouilles).not.toHaveBeenCalled();
	});

	it('XP nulle : les gidouilles suffisent, la réclamation est gardée', async () => {
		addBuddyXpFromReviewSession.mockResolvedValue({
			...REWARD,
			xpResult: { ...REWARD.xpResult, xp_gained: 0 }
		});
		expect(await reward()).toEqual({ buddyXp: null, gidouilles: 2 });
		expect(updates()).toHaveLength(1);
	});

	it('rien de donné (XP nulle ET gidouilles en échec) : la réclamation est relâchée (vérifié)', async () => {
		addBuddyXpFromReviewSession.mockResolvedValue({
			...REWARD,
			xpResult: { ...REWARD.xpResult, xp_gained: 0 }
		});
		creditStudentGidouilles.mockResolvedValue({ message: 'refusé' });
		expect(await reward()).toBeNull();
		const [, release] = updates();
		expect(release.chain[0]).toEqual(['update', [{ completed_at: null }]]);
		expect(studentCalls.filter((c) => c.op === 'update')).toEqual([]);
		expect(release.chain).toEqual(
			expect.arrayContaining([
				['eq', ['user_id', STUDENT]],
				['in', ['id', ['session-1']]],
				['select', ['id']]
			])
		);
	});

	it('XP en erreur, gidouilles versées : la réclamation est gardée (pas de second versement)', async () => {
		addBuddyXpFromReviewSession.mockRejectedValue(new Error('panne'));
		expect(await reward()).toEqual({ buddyXp: null, gidouilles: 2 });
		expect(updates()).toHaveLength(1);
	});

	it('XP en erreur ET gidouilles en échec : la réclamation est relâchée', async () => {
		addBuddyXpFromReviewSession.mockRejectedValue(new Error('panne'));
		creditStudentGidouilles.mockResolvedValue({ message: 'refusé' });
		expect(await reward()).toBeNull();
		expect(updates()).toHaveLength(2);
		expect(updates()[1].chain[0]).toEqual(['update', [{ completed_at: null }]]);
	});

	it('réclamation sans ligne (déjà réclamée par un envoi simultané) : rien', async () => {
		results['srs_review_sessions:update'] = [{ data: [], error: null }];
		expect(await reward()).toBeNull();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('deux paquets réclamés au même instant : aucun forfait (côté sûr)', async () => {
		results['srs_review_sessions:select'] = [
			{ data: [], error: null },
			{ data: [{ id: 'session-1' }, { id: 'autre-paquet' }], error: null }
		];
		expect(await reward()).toBeNull();
		expect(addBuddyXpFromReviewSession).not.toHaveBeenCalled();
	});

	it('pannes de lecture : rien (on ne conclut jamais sur une lecture manquée)', async () => {
		results['srs_review_sessions:select'] = [{ data: null, error: { message: 'panne' } }];
		expect(await reward()).toBeNull();

		results['srs_review_sessions:select'] = [{ data: [], error: null }];
		results['srs_card_stats:select'] = [{ count: null, error: { message: 'panne' } }];
		expect(await reward()).toBeNull();

		results['srs_review_sessions:select'] = [{ data: [], error: null }];
		reviewedToday(REVIEW_REWARD_CARDS_EMPTIED_DECK);
		dueCards = { data: null, error: { message: 'panne' } };
		expect(await reward()).toBeNull();
		expect(updates()).toEqual([]);
	});
});
