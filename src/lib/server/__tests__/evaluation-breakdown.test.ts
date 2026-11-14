/**
 * Bilan d'un contrôle par question et par notion (chantier `bilan-controle`, P6) :
 * calcul pur (N1-N3, L1-L5) et lecture (N4 mode test par les élèves fournis, E1).
 * Durée sans doute trop courte (chantier `durees-trop-courtes`, P7).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	computeEvaluationBreakdown,
	getEvaluationBreakdown,
	type BreakdownInput
} from '../evaluation-breakdown';
import {
	BREAKDOWN_ERROR_MESSAGE,
	DELETED_TEMPLATE_LABEL,
	NO_NOTION_LABEL,
	UNKNOWN_TEMPLATE_LABEL
} from '$lib/types/evaluation-breakdown';
import { called, createFakeSupabase, type Call, type Result } from './helpers/fake-supabase';

const EVALUATION = '8b9c0d1e-8888-4888-8888-888888888888';
const ADA = '7a8b9c0d-7777-4777-8777-777777777777';
const BOB = '7a8b9c0d-7777-4777-8777-777777777778';
const T1 = '4d5e6f70-4444-4444-8444-444444444441';
const T2 = '4d5e6f70-4444-4444-8444-444444444442';
const T3 = '4d5e6f70-4444-4444-8444-444444444443';

const NODES = [
	{ id: 'b-num', name: 'Nombres', kind: 'branch', parent_id: null },
	{ id: 'n-frac', name: 'Fractions', kind: 'notion', parent_id: 'b-num' },
	{ id: 's-frac-eq', name: 'Égalité de fractions', kind: 'subnotion', parent_id: 'n-frac' },
	{ id: 'n-rel', name: 'Relatifs', kind: 'notion', parent_id: 'b-num' }
];
const POINTS = [
	{ id: 'p-frac', node_id: 's-frac-eq' },
	// Point posé directement sur la notion (sans sous-notion)
	{ id: 'p-rel', node_id: 'n-rel' }
];

function session(id: string, user: string, grade: number | null, completedAt: string | null) {
	return { id, user_id: user, grade, completed_at: completedAt };
}

function answer(
	sessionId: string,
	templateId: string | null,
	status: string | null,
	points: number,
	timeSpent: number | null = null
) {
	return {
		test_session_id: sessionId,
		template_id: templateId,
		status,
		points,
		time_spent: timeSpent
	};
}

function input(overrides: Partial<BreakdownInput> = {}): BreakdownInput {
	return {
		form: 'interactive',
		items: [{ templateId: T1 }, { templateId: T2 }],
		sessions: [],
		answers: [],
		templates: [
			{ id: T1, title: 'Fractions égales' },
			{ id: T2, title: 'Somme de relatifs' }
		],
		templatePoints: [
			{ template_id: T1, point_id: 'p-frac' },
			{ template_id: T2, point_id: 'p-rel' }
		],
		points: POINTS,
		nodes: NODES,
		...overrides
	};
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('computeEvaluationBreakdown — par question (N1)', () => {
	it('une ligne par modèle, dans l’ordre de la composition, taux et répartition', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T2 }, { templateId: T1 }],
				sessions: [session('s-ada', ADA, 15, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T1, 'correct', 1), answer('s-ada', T2, 'unoptimal_form', 0.5)]
			})
		);
		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.copies).toBe(1);
		expect(result.questions.map((q) => q.title)).toEqual(['Somme de relatifs', 'Fractions égales']);
		expect(result.questions[0]).toMatchObject({
			templateId: T2,
			answers: 1,
			pointsEarned: 0.5,
			successRate: 50,
			correct: 0,
			partial: 1,
			incorrect: 0,
			empty: 0
		});
		expect(result.questions[1]).toMatchObject({ successRate: 100, correct: 1 });
	});

	it('Q2 : forme non optimale (½) en « partiel » ; mauvaise forme (0) en « faux »', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [
					session('s-ada', ADA, 10, '2026-11-10T10:00:00Z'),
					session('s-bob', BOB, 10, '2026-11-10T10:00:00Z')
				],
				answers: [answer('s-ada', T1, 'unoptimal_form', 0.5), answer('s-bob', T1, 'bad_form', 0)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		// Le correcteur donne 0 à `bad_form` (`pointsOfStatus`) : chaque colonne a ses points
		expect(result.questions[0]).toMatchObject({
			partial: 1,
			incorrect: 1,
			answers: 2,
			pointsEarned: 0.5,
			successRate: 25
		});
	});

	it('faux et sans réponse sont distingués ; un statut inconnu compte « sans réponse »', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [session('s-ada', ADA, 0, '2026-11-10T10:00:00Z')],
				answers: [
					answer('s-ada', T1, 'incorrect', 0),
					answer('s-ada', T1, 'empty', 0),
					answer('s-ada', T1, 'bizarre', 0)
				]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions[0]).toMatchObject({
			incorrect: 1,
			empty: 2,
			answers: 3,
			successRate: 0
		});
	});

	it('L2 : un modèle tiré plusieurs fois additionne ses réponses sur sa ligne', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [
					answer('s-ada', T1, 'correct', 1),
					answer('s-ada', T1, 'correct', 1),
					answer('s-ada', T1, 'incorrect', 0),
					answer('s-ada', T1, 'incorrect', 0)
				]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions).toHaveLength(1);
		expect(result.questions[0]).toMatchObject({ answers: 4, correct: 2, successRate: 50 });
	});

	it('un modèle présent sur deux lignes de la série n’a qu’une ligne (à sa première place)', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }, { templateId: T2 }, { templateId: T1 }],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T1, 'correct', 1), answer('s-ada', T2, 'correct', 1)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions.map((q) => q.templateId)).toEqual([T1, T2]);
	});

	it('L5 : réponse d’un modèle hors de la série → comptée sous son modèle, en fin de liste', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T1, 'correct', 1), answer('s-ada', T2, 'incorrect', 0)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions.map((q) => [q.templateId, q.answers])).toEqual([
			[T1, 1],
			[T2, 1]
		]);
	});

	it('modèle supprimé (template_id nul) ou titre illisible → ligne nommée, jamais perdue', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T3 }],
				templates: [],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T3, 'correct', 1), answer('s-ada', null, 'incorrect', 0)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions.map((q) => [q.templateId, q.title, q.answers])).toEqual([
			[T3, UNKNOWN_TEMPLATE_LABEL, 1],
			[null, DELETED_TEMPLATE_LABEL, 1]
		]);
	});
});

describe('computeEvaluationBreakdown — copie comptée (N3, Q1, L1, L4)', () => {
	it('Q1 : la MEILLEURE copie de chaque élève, pas la dernière', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [
					session('s-ada-1', ADA, 15, '2026-11-10T10:00:00Z'),
					session('s-ada-2', ADA, 5, '2026-11-11T10:00:00Z')
				],
				answers: [answer('s-ada-1', T1, 'correct', 1), answer('s-ada-2', T1, 'incorrect', 0)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.copies).toBe(1);
		expect(result.questions[0]).toMatchObject({ answers: 1, correct: 1 });
	});

	it('à note égale, la copie la plus récente', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [
					session('s-old', ADA, 10, '2026-11-10T10:00:00Z'),
					session('s-new', ADA, 10, '2026-11-11T10:00:00Z')
				],
				answers: [answer('s-old', T1, 'incorrect', 0), answer('s-new', T1, 'unoptimal_form', 0.5)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions[0]).toMatchObject({ partial: 1, incorrect: 0 });
	});

	it('une tentative ouverte (non rendue) ne compte pas', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [session('s-open', ADA, null, null)],
				answers: []
			})
		);
		expect(result).toMatchObject({ status: 'ok', copies: 0, lateCopies: 0 });
	});

	it('L1 : aucune copie rendue → 0 copie, taux nuls (pas 0 %)', () => {
		const result = computeEvaluationBreakdown(input());
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.copies).toBe(0);
		expect(result.questions.every((q) => q.successRate === null && q.answers === 0)).toBe(true);
		expect(result.notions).toEqual([]);
	});

	it('L4 : copie en retard (aucune réponse) → hors du bilan, comptée à part', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [
					session('s-ada', ADA, 12, '2026-11-10T10:00:00Z'),
					session('s-bob', BOB, 0, '2026-11-12T10:00:00Z')
				],
				answers: [answer('s-ada', T1, 'correct', 1)]
			})
		);
		expect(result).toMatchObject({ status: 'ok', copies: 1, lateCopies: 1 });
		if (result.status !== 'ok') return;
		expect(result.questions[0].answers).toBe(1);
	});

	it('à note égale (0), une copie avec réponses l’emporte sur une copie en retard', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				sessions: [
					session('s-zero', ADA, 0, '2026-11-10T10:00:00Z'),
					session('s-late', ADA, 0, '2026-11-12T10:00:00Z')
				],
				answers: [answer('s-zero', T1, 'incorrect', 0)]
			})
		);
		expect(result).toMatchObject({ status: 'ok', copies: 1, lateCopies: 0 });
	});
});

describe('computeEvaluationBreakdown — par notion (N2, Q3, L3)', () => {
	it('branche › notion, en remontant de la sous-notion ; point posé sur la notion compris', () => {
		const result = computeEvaluationBreakdown(
			input({
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T1, 'correct', 1), answer('s-ada', T2, 'incorrect', 0)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.notions.map((n) => [n.branch, n.notion, n.successRate])).toEqual([
			['Nombres', 'Relatifs', 0],
			['Nombres', 'Fractions', 100]
		]);
	});

	it('triées du taux le plus faible au plus fort, « Sans notion » en dernier', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }, { templateId: T2 }, { templateId: T3 }],
				templates: [
					{ id: T1, title: 'Fractions égales' },
					{ id: T2, title: 'Somme de relatifs' },
					{ id: T3, title: 'Sans point' }
				],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [
					answer('s-ada', T1, 'unoptimal_form', 0.5),
					answer('s-ada', T2, 'correct', 1),
					answer('s-ada', T3, 'incorrect', 0)
				]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.notions.map((n) => [n.notion, n.notionId])).toEqual([
			['Fractions', 'n-frac'],
			['Relatifs', 'n-rel'],
			[NO_NOTION_LABEL, null]
		]);
	});

	it('Q3 : un modèle à plusieurs notions compte dans chacune ; deux points d’une même notion, une fois', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				templatePoints: [
					{ template_id: T1, point_id: 'p-frac' },
					{ template_id: T1, point_id: 'p-frac-bis' },
					{ template_id: T1, point_id: 'p-rel' }
				],
				points: [...POINTS, { id: 'p-frac-bis', node_id: 'n-frac' }],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T1, 'correct', 1), answer('s-ada', T1, 'incorrect', 0)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.notions).toHaveLength(2);
		for (const notion of result.notions) {
			expect(notion).toMatchObject({ answers: 2, correct: 1, incorrect: 1, successRate: 50 });
		}
	});

	it('point rattaché à une branche seulement → « Sans notion »', () => {
		const result = computeEvaluationBreakdown(
			input({
				items: [{ templateId: T1 }],
				templatePoints: [{ template_id: T1, point_id: 'p-branche' }],
				points: [{ id: 'p-branche', node_id: 'b-num' }],
				sessions: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')],
				answers: [answer('s-ada', T1, 'correct', 1)]
			})
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.notions.map((n) => [n.notionId, n.notion])).toEqual([[null, NO_NOTION_LABEL]]);
	});
});

// ===========================================================================
// Durée sans doute trop courte (chantier `durees-trop-courtes`, P7)
// ===========================================================================

/** n élèves, chacun avec sa copie rendue */
function students(n: number) {
	return Array.from({ length: n }, (_, i) =>
		session(`s-${i}`, `eleve-${i}`, 10, '2026-11-10T10:00:00Z')
	);
}

/** Réponse vide au chrono écoulé (la page déclare la durée entière) */
function timedOut(sessionId: string, templateId: string | null, delay: number) {
	return answer(sessionId, templateId, 'empty', 0, delay);
}

function timingOf(overrides: Partial<BreakdownInput>, templateId = T1) {
	const result = computeEvaluationBreakdown(input(overrides));
	if (result.status !== 'ok') throw new Error('bilan attendu');
	return result.questions.find((q) => q.templateId === templateId)?.timing;
}

describe('computeEvaluationBreakdown — durée sans doute trop courte (P7)', () => {
	const items = [{ templateId: T1, delay: 10 }];

	it('N : 3 élèves sur 5 sans réponse au chrono écoulé → signalée, à la durée de la série', () => {
		const answers = [
			timedOut('s-0', T1, 10),
			timedOut('s-1', T1, 10),
			timedOut('s-2', T1, 10),
			answer('s-3', T1, 'correct', 1, 6),
			answer('s-4', T1, 'incorrect', 0, 8)
		];
		expect(timingOf({ items, sessions: students(5), answers })).toEqual({
			delaySeconds: 10,
			students: 5,
			unansweredInTime: 3,
			tooShort: true
		});
	});

	it('L : moins de 5 élèves → compté, jamais signalé', () => {
		const answers = [0, 1, 2, 3].map((i) => timedOut(`s-${i}`, T1, 10));
		expect(timingOf({ items, sessions: students(4), answers })).toMatchObject({
			students: 4,
			unansweredInTime: 4,
			tooShort: false
		});
	});

	it('L : la moitié exactement ne suffit pas (plus de la moitié)', () => {
		const answers = [
			...[0, 1, 2].map((i) => timedOut(`s-${i}`, T1, 10)),
			...[3, 4, 5].map((i) => answer(`s-${i}`, T1, 'correct', 1, 4))
		];
		expect(timingOf({ items, sessions: students(6), answers })).toMatchObject({
			students: 6,
			unansweredInTime: 3,
			tooShort: false
		});
	});

	it('L : réponse fausse à temps ou réponse commencée au chrono → pas un manque de temps', () => {
		const answers = [
			// Réponse tapée, validée d'office au chrono (Q1) : jugée, pas vide
			...[0, 1, 2].map((i) => answer(`s-${i}`, T1, 'incorrect', 0, 10)),
			...[3, 4].map((i) => answer(`s-${i}`, T1, 'incorrect', 0, 3))
		];
		expect(timingOf({ items, sessions: students(5), answers })).toMatchObject({
			unansweredInTime: 0,
			tooShort: false
		});
	});

	it('L : vide validé tôt, ou sans durée déclarée → pas compté « sans réponse à temps »', () => {
		const answers = [
			answer('s-0', T1, 'empty', 0, 2),
			answer('s-1', T1, null, 0, 1),
			answer('s-2', T1, 'empty', 0, null),
			timedOut('s-3', T1, 10),
			// Secondes entières déclarées : 9 s sur 10 s, c'est le chrono écoulé
			answer('s-4', T1, 'empty', 0, 9)
		];
		expect(timingOf({ items, sessions: students(5), answers })).toMatchObject({
			students: 5,
			unansweredInTime: 2,
			tooShort: false
		});
	});

	it('statut inconnu ou nul, chrono écoulé → sans réponse (règle du bilan)', () => {
		const answers = [0, 1, 2, 3, 4].map((i) =>
			answer(`s-${i}`, T1, i % 2 === 0 ? null : 'bizarre', 0, 10)
		);
		expect(timingOf({ items, sessions: students(5), answers })).toMatchObject({
			unansweredInTime: 5,
			tooShort: true
		});
	});

	it('durée 0 dans la série = durée par défaut (20 s)', () => {
		const answers = [0, 1, 2, 3, 4].map((i) => timedOut(`s-${i}`, T1, 20));
		expect(
			timingOf({
				items: [{ templateId: T1, delay: 0 }],
				sessions: students(5),
				answers
			})
		).toMatchObject({ delaySeconds: 20, unansweredInTime: 5, tooShort: true });
	});

	it('plusieurs tirages : un élève compte une fois, sans réponse seulement s’il les a TOUS manqués', () => {
		const two = [{ templateId: T1, delay: 10 }];
		const answers = [
			// 1 manqué sur 2 → a répondu à l'autre : ne compte pas
			timedOut('s-0', T1, 10),
			answer('s-0', T1, 'correct', 1, 5),
			// 2 sur 2 → compte
			timedOut('s-1', T1, 10),
			timedOut('s-1', T1, 10),
			// 0 sur 2 → ne compte pas
			answer('s-2', T1, 'correct', 1, 5),
			answer('s-2', T1, 'incorrect', 0, 5)
		];
		expect(timingOf({ items: two, sessions: students(3), answers })).toMatchObject({
			students: 3,
			unansweredInTime: 1
		});
	});

	it('seule la meilleure copie de chaque élève compte (comme le bilan)', () => {
		const sessions = [
			...students(5),
			// Ada a refait le contrôle et a mieux réussi : sa première copie est écartée
			session('s-ada-1', 'eleve-0', 2, '2026-11-09T10:00:00Z')
		];
		const answers = [
			timedOut('s-ada-1', T1, 10),
			...[0, 1, 2, 3, 4].map((i) => answer(`s-${i}`, T1, 'correct', 1, 3))
		];
		expect(timingOf({ items, sessions, answers })).toMatchObject({
			students: 5,
			unansweredInTime: 0
		});
	});

	it('D1 : modèle sur deux lignes à durées différentes → pas de durée, pas de signal', () => {
		const answers = [0, 1, 2, 3, 4].map((i) => timedOut(`s-${i}`, T1, 10));
		expect(
			timingOf({
				items: [
					{ templateId: T1, delay: 10 },
					{ templateId: T1, delay: 40 }
				],
				sessions: students(5),
				answers
			})
		).toBeNull();
	});

	it('modèle sur deux lignes à la même durée → une seule durée, signal lu', () => {
		const answers = [0, 1, 2, 3, 4].map((i) => timedOut(`s-${i}`, T1, 10));
		expect(
			timingOf({
				items: [
					{ templateId: T1, delay: 10 },
					{ templateId: T1, delay: 10 }
				],
				sessions: students(5),
				answers
			})
		).toMatchObject({ delaySeconds: 10, tooShort: true });
	});

	it('Q4 : Course aux nombres → aucune durée par question, aucun signal', () => {
		const answers = [0, 1, 2, 3, 4].map((i) => timedOut(`s-${i}`, T1, 10));
		expect(timingOf({ form: 'course', items, sessions: students(5), answers })).toBeNull();
	});

	it('modèle hors de la série, ou supprimé → pas de durée connue', () => {
		const answers = [0, 1, 2, 3, 4].flatMap((i) => [
			timedOut(`s-${i}`, T3, 10),
			timedOut(`s-${i}`, null, 10)
		]);
		const result = computeEvaluationBreakdown(input({ items, sessions: students(5), answers }));
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions.find((q) => q.templateId === T3)?.timing).toBeNull();
		expect(result.questions.find((q) => q.templateId === null)?.timing).toBeNull();
	});

	it('question de la série sans copie → aucun élève, pas de signal', () => {
		expect(timingOf({ items, sessions: [], answers: [] })).toEqual({
			delaySeconds: 10,
			students: 0,
			unansweredInTime: 0,
			tooShort: false
		});
	});
});

// ===========================================================================
// Lecture
// ===========================================================================

type Tables = Record<string, Result | ((calls: Call[]) => Result)>;

function fakeFrom(tables: Tables) {
	return createFakeSupabase((table, calls) => {
		const entry = tables[table];
		if (typeof entry === 'function') return entry(calls);
		return entry ?? { data: [] };
	});
}

const EVALUATION_INPUT = {
	id: EVALUATION,
	form: 'interactive' as const,
	series: { items: [{ templateId: T1, quantity: 2, delay: 20 }] }
};

function readable(): Tables {
	return {
		test_sessions: { data: [session('s-ada', ADA, 10, '2026-11-10T10:00:00Z')] },
		test_answers: {
			data: [answer('s-ada', T1, 'correct', 1), answer('s-ada', T1, 'incorrect', 0)]
		},
		question_templates: { data: [{ id: T1, title: 'Fractions égales' }] },
		question_template_points: { data: [{ template_id: T1, point_id: 'p-frac' }] },
		curriculum_points: { data: POINTS },
		classification_nodes: (calls) => {
			const ids = calls.find((c) => c.method === 'in')?.args[1] as string[];
			return { data: NODES.filter((n) => ids.includes(n.id)) };
		}
	};
}

describe('getEvaluationBreakdown', () => {
	it('lit les copies rendues de CES élèves pour CE contrôle, puis leurs réponses', async () => {
		const fake = fakeFrom(readable());
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, [ADA]);

		expect(result).toMatchObject({ status: 'ok', copies: 1 });
		if (result.status !== 'ok') return;
		expect(result.questions[0]).toMatchObject({ title: 'Fractions égales', successRate: 50 });
		expect(result.notions.map((n) => [n.branch, n.notion])).toEqual([['Nombres', 'Fractions']]);

		const [sessions] = fake.on('test_sessions');
		expect(called(sessions, 'eq', 'evaluation_id', EVALUATION)).toBe(true);
		// N4 : les élèves fournis (mode test déjà appliqué) bornent la lecture
		expect(called(sessions, 'in', 'user_id', [ADA])).toBe(true);
		expect(called(sessions, 'not', 'completed_at', 'is', null)).toBe(true);
		const [answers] = fake.on('test_answers');
		expect(called(answers, 'in', 'test_session_id', ['s-ada'])).toBe(true);
		// P7 : le temps passé est lu avec la réponse
		expect(
			called(answers, 'select', 'test_session_id, template_id, status, points, time_spent')
		).toBe(true);
	});

	it('P7 : la durée vient de la composition de la série ; le temps passé, des réponses', async () => {
		const many = Array.from({ length: 5 }, (_, i) => `eleve-${i}`);
		const fake = fakeFrom({
			...readable(),
			test_sessions: { data: many.map((id) => session(`s-${id}`, id, 10, '2026-11-10T10:00:00Z')) },
			test_answers: { data: many.map((id) => timedOut(`s-${id}`, T1, 20)) }
		});
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, many);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions[0].timing).toEqual({
			delaySeconds: 20,
			students: 5,
			unansweredInTime: 5,
			tooShort: true
		});
	});

	it('P7 : Course aux nombres → aucun signal', async () => {
		const many = Array.from({ length: 5 }, (_, i) => `eleve-${i}`);
		const fake = fakeFrom({
			...readable(),
			test_sessions: { data: many.map((id) => session(`s-${id}`, id, 10, '2026-11-10T10:00:00Z')) },
			test_answers: { data: many.map((id) => timedOut(`s-${id}`, T1, 20)) }
		});
		const result = await getEvaluationBreakdown(
			fake.client,
			{ ...EVALUATION_INPUT, form: 'course' },
			many
		);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions[0].timing).toBeNull();
	});

	it('N4 : aucun élève (mode test sans élève de test) → aucune lecture de copie', async () => {
		const fake = fakeFrom(readable());
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, []);
		expect(result).toMatchObject({ status: 'ok', copies: 0 });
		expect(fake.on('test_sessions')).toHaveLength(0);
		expect(fake.on('test_answers')).toHaveLength(0);
	});

	it('réponses lues par pages de 1 000 (plafond PostgREST) : rien de perdu au-delà', async () => {
		const many = Array.from({ length: 1500 }, () => answer('s-ada', T1, 'correct', 1));
		const fake = fakeFrom({
			...readable(),
			test_answers: (calls) => {
				const range = calls.find((c) => c.method === 'range')?.args as [number, number];
				return { data: many.slice(range[0], range[1] + 1) };
			}
		});
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, [ADA]);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.questions[0].answers).toBe(1500);
		expect(fake.on('test_answers')).toHaveLength(2);
	});

	it('élèves et copies lus par lots de 100 identifiants : l’adresse de la requête reste courte', async () => {
		const students = Array.from({ length: 250 }, (_, i) => `eleve-${i}`);
		const fake = fakeFrom({
			...readable(),
			test_sessions: (calls) => {
				const batch = calls.find((c) => c.method === 'in')?.args[1] as string[];
				return { data: batch.map((id) => session(`s-${id}`, id, 10, '2026-11-10T10:00:00Z')) };
			},
			test_answers: (calls) => {
				const batch = calls.find((c) => c.method === 'in')?.args[1] as string[];
				return { data: batch.map((id) => answer(id, T1, 'correct', 1)) };
			}
		});
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, students);
		if (result.status !== 'ok') throw new Error('bilan attendu');
		expect(result.copies).toBe(250);
		expect(result.questions[0].answers).toBe(250);
		const sizes = (table: string) =>
			fake
				.on(table)
				.map((q) => (q.calls.find((c) => c.method === 'in')?.args[1] as string[]).length);
		expect(sizes('test_sessions')).toEqual([100, 100, 50]);
		expect(sizes('test_answers')).toEqual([100, 100, 50]);
	});

	it.each([
		'test_sessions',
		'test_answers',
		'question_templates',
		'question_template_points',
		'curriculum_points',
		'classification_nodes'
	])('E1 : %s illisible → erreur propre au bilan, jamais un bilan faux', async (table) => {
		const fake = fakeFrom({ ...readable(), [table]: { error: { message: 'panne' } } });
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, [ADA]);
		expect(result).toEqual({ status: 'error', message: BREAKDOWN_ERROR_MESSAGE });
	});

	it('E1 : une exception (réseau) ne remonte pas au chargement de la page', async () => {
		const fake = fakeFrom({
			...readable(),
			test_answers: () => {
				throw new Error('réseau');
			}
		});
		const result = await getEvaluationBreakdown(fake.client, EVALUATION_INPUT, [ADA]);
		expect(result).toEqual({ status: 'error', message: BREAKDOWN_ERROR_MESSAGE });
	});
});
