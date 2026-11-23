/**
 * GET /api/evaluations/assignments/[id] — page d'attente d'un contrôle assigné
 * (chantier `diaporama-reglages`, PR 2b)
 *
 * Lecture SEULE : titre, forme, nombre de questions, durée, reprise. Mêmes
 * droits et mêmes refus que `start` (404, 403), mais rien n'est jamais écrit :
 * la tentative ne démarre qu'au clic sur « C'est parti ! ». Le parcours contre
 * la vraie base (aucune séance créée, reprise) :
 * `tests/integration/evaluation-notee-serveur.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le client service_role ne doit JAMAIS écrire ici : on compte ses appels
const serviceFrom = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ from: serviceFrom })
}));

vi.mock(
	'#lib/server/rateLimiter.ts',
	() => import('#lib/server/__tests__/helpers/fake-rate-limiter.ts')
);

import { GET } from '../+server';
import { createFakeSupabase } from '#lib/server/__tests__/helpers/fake-supabase.ts';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const TEACHER = '22222222-2222-4222-8222-222222222222';
const OTHER_TEACHER = '77777777-7777-4777-8777-777777777777';
const ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const EVALUATION = '55555555-5555-4555-8555-555555555555';
const TEMPLATE = '4d5e6f70-4444-4444-8444-444444444444';
const CARD = '4d5e6f70-5555-4555-8555-555555555555';
const FIXED = '4d5e6f70-6666-4666-8666-666666666666';

const ITEMS = [
	{ templateId: TEMPLATE, quantity: 4, delay: 20 },
	// Carte de cours : jamais tirée en contrôle, donc jamais comptée
	{ templateId: CARD, quantity: 2, delay: 30 },
	// Une seule question possible : 3 demandées, 1 tirée (comme au démarrage)
	{ templateId: FIXED, quantity: 3, delay: 10 }
];

/** Moitié d'un entier : beaucoup de questions distinctes */
const HALF_VARIATION = {
	statement: 'Quelle est la moitié de ${{b}}$ ?\n\nLa moitié de ${{b}}$ est $?$.',
	variables: [
		{ name: 'a', expression: '1..9|11..15|16..20|25|30|50' },
		{ name: 'b', expression: 'eval:2*a' }
	],
	blanks: [{ expectedAnswer: '{{eval:a}}' }]
};

/** Sans variable : une seule question possible */
const FIXED_VARIATION = {
	statement: 'Combien font 2 + 2 ?\n\n$?$',
	blanks: [{ expectedAnswer: '4' }]
};

function templateRow(id: string, variation: object, options: unknown = null) {
	return {
		id,
		type: 'fill_in_blanks',
		title: 'Modèle',
		level: 1,
		status: 'published',
		grades: ['6'],
		variations: [variation],
		options
	};
}

function setup(options: {
	role: 'student' | 'teacher' | 'admin';
	userId: string;
	recipient: boolean;
	form?: 'interactive' | 'course';
	attempts?: number;
	maxAttempts?: number | null;
	deadline?: string | null;
}) {
	const form = options.form ?? 'course';
	const fake = createFakeSupabase((table, calls) => {
		if (table === 'profiles') return { data: { id: options.userId, role: options.role } };
		if (table === 'evaluation_assignments') {
			return {
				data: {
					id: ASSIGNMENT,
					evaluation_id: EVALUATION,
					class_id: null,
					student_id: options.recipient ? options.userId : STUDENT,
					assigned_by: TEACHER,
					assigned_at: '2026-09-30T10:00:00Z',
					evaluation: {
						id: EVALUATION,
						series_id: 'serie',
						form,
						time_limit: form === 'course' ? 420 : null,
						max_attempts: options.maxAttempts ?? null,
						deadline: options.deadline ?? null,
						shuffle_questions: true,
						academic_period_id: null,
						status: 'published',
						created_by: TEACHER,
						created_at: '2026-09-30T10:00:00Z',
						updated_at: '2026-09-30T10:00:00Z',
						series: {
							id: 'serie',
							title: 'Tables de 7',
							description: null,
							grade: '6',
							items: ITEMS,
							created_by: TEACHER,
							created_at: '2026-09-30T10:00:00Z',
							updated_at: '2026-09-30T10:00:00Z'
						}
					}
				}
			};
		}
		if (table === 'test_sessions') {
			// Comptage des tentatives (head + count) ; sinon : tentative en cours (aucune)
			if (calls.some((c) => JSON.stringify(c.args).includes('exact'))) {
				return { count: options.attempts ?? 0 };
			}
			return { data: [] };
		}
		if (table === 'question_templates') {
			return {
				data: [
					templateRow(TEMPLATE, HALF_VARIATION),
					templateRow(CARD, HALF_VARIATION, { courseCard: true }),
					templateRow(FIXED, FIXED_VARIATION)
				]
			};
		}
		return {};
	});
	const call = (id = ASSIGNMENT) =>
		GET({
			params: { id },
			locals: {
				supabase: fake.client,
				safeGetSession: async () => ({ user: { id: options.userId }, session: {} })
			}
		} as never);
	return { fake, call };
}

beforeEach(() => {
	serviceFrom.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/evaluations/assignments/[id] (page d’attente)', () => {
	it('Course, aucune tentative en cours : titre, forme, questions tirées à blanc (ni carte de cours, ni question en double), temps imparti ; rien d’écrit', async () => {
		const { call, fake } = setup({ role: 'student', userId: STUDENT, recipient: true });
		const response = await call();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			preview: false,
			evaluation: { id: EVALUATION, form: 'course', time_limit: 420, title: 'Tables de 7' },
			questionCount: 5,
			durationSeconds: 420,
			resumed: false
		});
		// Aucune écriture : ni service_role, ni insert du client de l'élève
		expect(serviceFrom).not.toHaveBeenCalled();
		const writes = fake.queries.filter((q) =>
			q.calls.some((c) => ['insert', 'update', 'delete', 'upsert'].includes(c.method))
		);
		expect(writes).toHaveLength(0);
	});

	it('Contrôle blanc : durée = somme des chronos des questions comptées', async () => {
		const { call } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			form: 'interactive'
		});
		const body = await (await call()).json();
		expect(body).toMatchObject({ questionCount: 5, durationSeconds: 90, resumed: false });
	});

	it('date limite dépassée → 403 dès la page d’attente, rien d’écrit', async () => {
		const { call } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			deadline: '2020-01-01T00:00:00Z'
		});
		const response = await call();
		expect(response.status).toBe(403);
		expect((await response.json()).error).toMatch(/date limite/);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('tentatives épuisées → 403, rien d’écrit', async () => {
		const { call } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			attempts: 2,
			maxAttempts: 2
		});
		const response = await call();
		expect(response.status).toBe(403);
		expect((await response.json()).error).toMatch(/tentatives/);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('prof propriétaire, non destinataire : aperçu, sans les lignes de la série', async () => {
		const { call, fake } = setup({ role: 'teacher', userId: TEACHER, recipient: false });
		const body = await (await call()).json();
		expect(body).toMatchObject({ preview: true, questionCount: 5, durationSeconds: 420 });
		expect(body.evaluation.items).toBeUndefined();
		expect(fake.on('test_sessions')).toHaveLength(0);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('autre prof, non destinataire → 404', async () => {
		const { call } = setup({ role: 'teacher', userId: OTHER_TEACHER, recipient: false });
		expect((await call()).status).toBe(404);
	});

	it('élève non destinataire → 404, rien lu des modèles', async () => {
		const { call, fake } = setup({ role: 'student', userId: OTHER_TEACHER, recipient: false });
		expect((await call()).status).toBe(404);
		expect(fake.on('question_templates')).toHaveLength(0);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('identifiant invalide : 400', async () => {
		const { call } = setup({ role: 'student', userId: STUDENT, recipient: true });
		expect((await call('pas-un-uuid')).status).toBe(400);
	});
});
