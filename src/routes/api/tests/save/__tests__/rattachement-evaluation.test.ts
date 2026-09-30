/**
 * `/api/tests/save` ne rattache PLUS rien à une évaluation (chantier 5, ADR 0015)
 * ==============================================================================
 *
 * Une évaluation se passe désormais par le serveur (démarrage, envoi) : c'est
 * lui qui tire, corrige et note. Une sauvegarde qui cible une évaluation
 * (`assignmentId`) est refusée (400), RIEN n'est écrit, rien n'est lu des
 * assignations. Entraînement libre, course libre et flash-cards : inchangés
 * (verdict du navigateur, ADR 0001).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard: vi.fn() }));
const addBuddyXpFromTest = vi.hoisted(() => vi.fn(async () => null));
vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromTest }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) })
	})
}));

import { POST } from '../+server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const TEACHER = '22222222-2222-4222-8222-222222222222';
const TEMPLATE = '33333333-3333-4333-8333-333333333333';
const ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const EVALUATION = '55555555-5555-4555-8555-555555555555';
const CLASS_ID = '66666666-6666-4666-8666-666666666666';

let sessionInseree: Record<string, unknown> | null;
/** Séances déjà rattachées à l'évaluation (comptage des tentatives) */
let tentativesPassees: number;

const CATEGORY_ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 1,
	delay: 20
};

function fakeSupabase(options: { form: 'interactive' | 'course'; recipient: boolean }) {
	return createFakeSupabase((table, calls) => {
		if (table === 'evaluation_assignments') {
			return {
				data: {
					id: ASSIGNMENT,
					evaluation_id: EVALUATION,
					class_id: CLASS_ID,
					student_id: null,
					assigned_by: TEACHER,
					assigned_at: '2026-09-30T10:00:00Z',
					evaluation: {
						id: EVALUATION,
						series_id: 'serie',
						form: options.form,
						time_limit: options.form === 'course' ? 420 : null,
						max_attempts: 1,
						deadline: null,
						shuffle_questions: true,
						academic_period_id: null,
						status: 'published',
						created_by: TEACHER,
						created_at: '2026-09-30T10:00:00Z',
						updated_at: '2026-09-30T10:00:00Z',
						series: {
							id: 'serie',
							title: 'Tables',
							description: null,
							grade: '6',
							categories: [CATEGORY_ITEM],
							created_by: TEACHER,
							created_at: '2026-09-30T10:00:00Z',
							updated_at: '2026-09-30T10:00:00Z'
						}
					}
				}
			};
		}
		if (table === 'class_members') {
			return { data: options.recipient ? { id: 'membre' } : null };
		}
		if (table === 'test_sessions') {
			if (calls.some((c) => c.method === 'select' && JSON.stringify(c.args).includes('exact'))) {
				return { count: tentativesPassees };
			}
			const insert = calls.find((c) => c.method === 'insert');
			sessionInseree = (insert?.args[0] as Record<string, unknown>) ?? null;
			return { data: { id: 'session-1' } };
		}
		if (table === 'question_template_points') return { data: [] };
		// test_answers, skill_attempts : lignes « écrites »
		const insert = calls.find((c) => c.method === 'insert');
		const rows = insert ? (Array.isArray(insert.args[0]) ? insert.args[0] : [insert.args[0]]) : [];
		return { data: rows.map((_: unknown, i: number) => ({ id: `row-${i}` })) };
	});
}

async function enregistrer(options: {
	mode: 'interactive' | 'course' | 'flash';
	form?: 'interactive' | 'course';
	recipient?: boolean;
	userId?: string;
	assignmentId?: string;
	categories?: unknown[];
}) {
	const answers = [
		{
			index: 0,
			instance: { templateId: TEMPLATE, statement: '2 + 2 ?' },
			isCorrect: true,
			timeSpent: 5,
			attempts: 1
		}
	];
	const request = new Request('http://localhost/api/tests/save', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			result: {
				mode: options.mode,
				score: 10,
				scorePercentage: 100,
				totalQuestions: 1,
				correctAnswers: 1,
				timeSpent: 30,
				averageTime: 30,
				completedAt: new Date().toISOString(),
				answers
			},
			categories: options.categories ?? [CATEGORY_ITEM],
			assignmentId: options.assignmentId
		})
	});
	const fake = fakeSupabase({
		form: options.form ?? 'interactive',
		recipient: options.recipient ?? true
	});
	const response = await POST({
		request,
		locals: {
			supabase: fake.client,
			safeGetSession: async () => ({ user: { id: options.userId ?? STUDENT }, session: {} })
		}
	} as never);
	return { response, fake };
}

describe('POST /api/tests/save — plus aucune évaluation', () => {
	beforeEach(() => {
		sessionInseree = null;
		tentativesPassees = 0;
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
		addBuddyXpFromTest.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it.each(['interactive', 'course'] as const)(
		'%s + assignation : 400 « passe par l’envoi de l’évaluation », RIEN n’est écrit ni lu',
		async (mode) => {
			const { response, fake } = await enregistrer({ mode, form: mode, assignmentId: ASSIGNMENT });
			expect(response.status).toBe(400);
			expect((await response.json()).error).toMatch(/envoi de l.évaluation/);
			expect(fake.on('test_sessions')).toHaveLength(0);
			expect(fake.on('test_answers')).toHaveLength(0);
			expect(fake.on('evaluation_assignments')).toHaveLength(0);
			expect(applyFsrsReview).not.toHaveBeenCalled();
			expect(addBuddyXpFromTest).not.toHaveBeenCalled();
		}
	);

	it('aperçu du prof avec assignation : refusé aussi (l’aperçu s’enregistre sans assignation)', async () => {
		const { response } = await enregistrer({
			mode: 'interactive',
			form: 'interactive',
			recipient: false,
			userId: TEACHER,
			assignmentId: ASSIGNMENT
		});
		expect(response.status).toBe(400);
	});

	it('flash + évaluation : 400', async () => {
		const { response, fake } = await enregistrer({ mode: 'flash', assignmentId: ASSIGNMENT });
		expect(response.status).toBe(400);
		expect(fake.on('test_sessions')).toHaveLength(0);
	});

	it('entraînement libre : evaluation_id nul, aucune lecture d’assignation, FSRS et XP comme avant', async () => {
		const { response, fake } = await enregistrer({ mode: 'interactive' });
		expect(response.status).toBe(201);
		expect(sessionInseree).toMatchObject({ evaluation_id: null });
		expect(fake.on('evaluation_assignments')).toHaveLength(0);
		expect(applyFsrsReview).toHaveBeenCalledTimes(1);
		expect(addBuddyXpFromTest).toHaveBeenCalledTimes(1);
	});

	it('course libre : enregistrée comme avant', async () => {
		const { response } = await enregistrer({ mode: 'course' });
		expect(response.status).toBe(201);
		expect(sessionInseree).toMatchObject({ evaluation_id: null, mode: 'course' });
	});
});
