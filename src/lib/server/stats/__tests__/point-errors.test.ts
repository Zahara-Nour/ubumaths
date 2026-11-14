/**
 * Erreurs de la classe sur un point du programme (chantier
 * `erreurs-frequentes`, PR 2) : trace rejouée, tri, lecture.
 */
import { describe, expect, it } from 'vitest';
import {
	buildPointErrors,
	getClassPointErrors,
	seriesTraceAnswer,
	type SeriesTraceRow
} from '../point-errors';
import type { QuestionErrorAnswer } from '../../evaluation-question-errors';
import { POINT_ERRORS_MESSAGE, POINT_ERRORS_TRACE_CAP } from '$lib/types/point-errors';
import type { QuestionInstance } from '$lib/questions/types';
import {
	called,
	createFakeSupabase,
	type Call,
	type Result
} from '../../__tests__/helpers/fake-supabase';

const CLASS = '1a2b3c4d-1111-4111-8111-111111111111';
const POINT = '2b3c4d5e-2222-4222-8222-222222222222';
const TEMPLATE = '4d5e6f70-4444-4444-8444-444444444441';
const OTHER_TEMPLATE = '4d5e6f70-4444-4444-8444-444444444442';
const UPDATED_AT = '2026-11-12T08:00:00Z';

function instance(statement: string, blankTypes: string[] = ['math']): QuestionInstance {
	return {
		templateId: TEMPLATE,
		statement,
		blanks: blankTypes.map((type) => ({ type, expectedAnswer: '1' })),
		generatedAt: '2026-11-13T10:00:00Z'
	} as unknown as QuestionInstance;
}

function trace(overrides: Partial<SeriesTraceRow> = {}): SeriesTraceRow {
	return {
		id: 't-1',
		student_id: 'u-ada',
		template_id: TEMPLATE,
		success: false,
		seed: 42,
		answer_parts: ['8'],
		part_verdicts: [false],
		created_at: '2026-11-13T10:00:00Z',
		...overrides
	};
}

const replayAny = (seed: number) => instance(`Calcule ${seed} + 1`);

/** Modèle publié minimal, que `generateInstance` sait tirer (graine → nombre) */
function templateRow(id: string, title: string, updatedAt: string | null = UPDATED_AT) {
	return {
		id,
		title,
		description: null,
		classification_node_id: null,
		level: 1,
		status: 'published',
		grades: ['1_SPE'],
		delay: null,
		variations: [
			{
				statement: 'Calcule ${{a}} + 1$\n\n$?$',
				variables: [{ name: 'a', expression: '1..9' }],
				blanks: [{ expectedAnswer: '{{eval:a+1}}' }],
				correction: { steps: ['x'] }
			}
		],
		shared: null,
		options: null,
		default_display_options: null,
		test_specs: null,
		exercise_instruction: null,
		created_at: '2026-11-01T08:00:00Z',
		updated_at: updatedAt,
		created_by: null,
		type: 'fill_in_blanks',
		precision: null
	};
}

describe('seriesTraceAnswer', () => {
	it('trace ratée : faux, réponse tapée, verdict par case stocké (jamais recalculé)', () => {
		const row = seriesTraceAnswer(
			trace({ answer_parts: ['3', '9'], part_verdicts: [true, false] }),
			'Ada',
			(seed) => instance(`Calcule ${seed}`, ['math', 'math'])
		);
		expect(row).toMatchObject({
			studentName: 'Ada',
			userAnswer: { value: ['3', '9'] },
			status: 'incorrect',
			verdict: {
				status: 'incorrect',
				blanks: [
					{ index: 0, status: 'correct', answer: '3' },
					{ index: 1, status: 'incorrect', answer: '9' }
				]
			}
		});
	});

	it('trace réussie : juste', () => {
		const row = seriesTraceAnswer(
			trace({ success: true, part_verdicts: [true] }),
			'Ada',
			replayAny
		);
		expect(row?.status).toBe('correct');
	});

	it('rien de tapé : sans réponse (statut vide), jamais listé', () => {
		const row = seriesTraceAnswer(
			trace({ answer_parts: null, part_verdicts: null }),
			'Ada',
			replayAny
		);
		expect(row).toMatchObject({ status: null, userAnswer: null });
		expect(row?.verdict).toBeUndefined();
	});

	it('verdicts absents ou de mauvaise longueur : détail indisponible, statut de la trace', () => {
		const row = seriesTraceAnswer(trace({ part_verdicts: [false, true] }), 'Ada', replayAny);
		expect(row?.verdict).toEqual({ unavailable: true, status: 'incorrect' });
	});

	it('graine absente ou énoncé impossible à rejouer : trace écartée', () => {
		expect(seriesTraceAnswer(trace({ seed: null }), 'Ada', replayAny)).toBeNull();
		expect(seriesTraceAnswer(trace(), 'Ada', () => null)).toBeNull();
	});
});

describe('buildPointErrors', () => {
	const wrong = (name: string, statement: string): QuestionErrorAnswer => ({
		studentName: name,
		instance: instance(statement),
		userAnswer: { value: ['0'] },
		status: 'incorrect',
		verdict: { unavailable: true, status: 'incorrect' }
	});

	it('modèle sans réponse écarté ; le plus de réponses fausses en premier', () => {
		const result = buildPointErrors(
			[
				{ id: 'a', title: 'Additions', capped: false },
				{ id: 'b', title: 'Brouillon', capped: false },
				{ id: 'c', title: 'Carrés', capped: true }
			],
			new Map([
				['a', [wrong('Ada', 'x')]],
				['c', [wrong('Ada', 'y'), wrong('Bob', 'z')]]
			])
		);
		expect(result.map((t) => t.templateId)).toEqual(['c', 'a']);
		expect(result[0]).toMatchObject({ title: 'Carrés', capped: true });
		expect(result[0].errors.groups).toHaveLength(2);
	});

	it('même énoncé rejoué, même réponse : un groupe (séries et contrôles mêlés)', () => {
		const result = buildPointErrors(
			[{ id: 'a', title: 'Additions', capped: false }],
			new Map([
				[
					'a',
					[
						wrong('Ada', 'Calcule 3 + 1'),
						{
							studentName: 'Bob',
							instance: { ...instance('Calcule 3 + 1'), attemptPosition: 4, seed: 7 },
							userAnswer: { value: ['0'] },
							status: 'incorrect'
						}
					]
				]
			]),
			{ validate: () => ({ status: 'incorrect', blanks: [] }) }
		);
		expect(result[0].errors.groups).toHaveLength(1);
		expect(result[0].errors.groups[0].students).toEqual(['Ada', 'Bob']);
	});
});

describe('getClassPointErrors', () => {
	type Tables = Record<string, Result | ((calls: Call[]) => Result)>;

	function fakeFrom(tables: Tables) {
		return createFakeSupabase((table, calls) => {
			const entry = tables[table];
			if (typeof entry === 'function') return entry(calls);
			return entry ?? { data: [] };
		});
	}

	function readable(): Tables {
		return {
			class_members: {
				data: [
					{ student_id: 'u-ada', profiles: { firstname: 'Ada', lastname: 'Lovelace' } },
					{ student_id: 'u-bob', profiles: { firstname: 'Bob', lastname: null } }
				]
			},
			question_template_points: { data: [{ template_id: TEMPLATE }] },
			question_templates: { data: [templateRow(TEMPLATE, 'Ajouter 1')] },
			test_sessions: {
				data: [
					{
						id: 's-ada',
						user_id: 'u-ada',
						grade: 4,
						completed_at: '2026-11-10T10:00:00Z',
						evaluation_id: 'e-1'
					}
				]
			},
			test_answers: (calls) =>
				calls.some((c) => c.method === 'in' && c.args[0] === 'template_id')
					? {
							data: [
								{
									id: 'a-1',
									test_session_id: 's-ada',
									template_id: TEMPLATE,
									question_instance: { ...instance('Calcule 3 + 1'), attemptPosition: 1 },
									user_answer: { value: ['5'] },
									status: 'incorrect'
								}
							]
						}
					: { data: [{ id: 'a-1', test_session_id: 's-ada' }] },
			skill_attempts: { data: [trace({ student_id: 'u-bob' })] }
		};
	}

	it('nominal : contrôles et séries réunis, noms des élèves', async () => {
		const fake = fakeFrom(readable());
		const result = await getClassPointErrors(fake.client, CLASS, POINT);
		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.templates).toHaveLength(1);
		const [entry] = result.templates;
		expect(entry).toMatchObject({ templateId: TEMPLATE, title: 'Ajouter 1', capped: false });
		expect(entry.errors.answers).toBe(2);
		expect(entry.errors.groups.flatMap((g) => g.students).sort()).toEqual(['Ada Lovelace', 'Bob']);
	});

	it("la trace rejouée porte l'énoncé du modèle tiré de sa graine", async () => {
		const fake = fakeFrom(readable());
		const result = await getClassPointErrors(fake.client, CLASS, POINT);
		if (result.status !== 'ok') throw new Error('attendu ok');
		const bob = result.templates[0].errors.groups.find((g) => g.students.includes('Bob'));
		expect(bob?.instance.statement).toMatch(/Calcule \$\d \+ 1\$/);
		expect(bob?.values).toEqual(['8']);
	});

	it('traces : élèves de la classe, modèle du point, lieux où l’on tape, graine, postérieures à la modification', async () => {
		const fake = fakeFrom(readable());
		await getClassPointErrors(fake.client, CLASS, POINT);
		const [query] = fake.on('skill_attempts');
		expect(called(query, 'eq', 'template_id', TEMPLATE)).toBe(true);
		expect(called(query, 'in', 'student_id', ['u-ada', 'u-bob'])).toBe(true);
		expect(called(query, 'in', 'place', ['typing', 'mock_test', 'number_race'])).toBe(true);
		expect(called(query, 'not', 'seed', 'is', null)).toBe(true);
		expect(called(query, 'gt', 'created_at', UPDATED_AT)).toBe(true);
	});

	it('contrôles : copies des élèves de la classe seulement, séances de contrôle seulement', async () => {
		const fake = fakeFrom(readable());
		await getClassPointErrors(fake.client, CLASS, POINT);
		const [sessions] = fake.on('test_sessions');
		expect(called(sessions, 'in', 'user_id', ['u-ada', 'u-bob'])).toBe(true);
		expect(called(sessions, 'not', 'evaluation_id', 'is', null)).toBe(true);
		const [members] = fake.on('class_members');
		expect(called(members, 'eq', 'class_id', CLASS)).toBe(true);
	});

	it('meilleure copie par élève ET par contrôle : deux contrôles, deux copies comptées', async () => {
		const tables = readable();
		tables.test_sessions = {
			data: [
				{
					id: 's-1',
					user_id: 'u-ada',
					grade: 4,
					completed_at: '2026-11-10T10:00:00Z',
					evaluation_id: 'e-1'
				},
				{
					id: 's-2',
					user_id: 'u-ada',
					grade: 9,
					completed_at: '2026-11-11T10:00:00Z',
					evaluation_id: 'e-2'
				}
			]
		};
		tables.test_answers = (calls) =>
			calls.some((c) => c.method === 'in' && c.args[0] === 'template_id')
				? {
						data: ['s-1', 's-2'].map((s, i) => ({
							id: `a-${i}`,
							test_session_id: s,
							template_id: TEMPLATE,
							question_instance: instance(`Calcule ${i} + 1`),
							user_answer: { value: ['0'] },
							status: 'incorrect'
						}))
					}
				: {
						data: [
							{ id: 'a-0', test_session_id: 's-1' },
							{ id: 'a-1', test_session_id: 's-2' }
						]
					};
		tables.skill_attempts = { data: [] };
		const fake = fakeFrom(tables);
		const result = await getClassPointErrors(fake.client, CLASS, POINT);
		if (result.status !== 'ok') throw new Error('attendu ok');
		expect(result.templates[0].errors.answers).toBe(2);
		const [answers] = fake
			.on('test_answers')
			.filter((q) => q.calls.some((c) => c.method === 'in' && c.args[0] === 'template_id'));
		expect(called(answers, 'in', 'test_session_id', ['s-1', 's-2'])).toBe(true);
	});

	it('plafond : seules les traces les plus récentes sont lues, le modèle le dit', async () => {
		const tables = readable();
		tables.test_sessions = { data: [] };
		tables.skill_attempts = {
			data: Array.from({ length: POINT_ERRORS_TRACE_CAP + 5 }, (_, i) =>
				trace({
					id: `t-${String(i).padStart(4, '0')}`,
					created_at: new Date(Date.UTC(2026, 10, 13, 0, 0, i)).toISOString()
				})
			)
		};
		const result = await getClassPointErrors(fakeFrom(tables).client, CLASS, POINT);
		if (result.status !== 'ok') throw new Error('attendu ok');
		expect(result.templates[0].capped).toBe(true);
		expect(result.templates[0].errors.answers).toBe(POINT_ERRORS_TRACE_CAP);
	});

	it('plafond posé par la base : plus récentes d’abord, CAP + 1 lignes au plus', async () => {
		const fake = fakeFrom(readable());
		await getClassPointErrors(fake.client, CLASS, POINT);
		const [query] = fake.on('skill_attempts');
		expect(called(query, 'order', 'created_at', { ascending: false })).toBe(true);
		expect(called(query, 'range', 0, POINT_ERRORS_TRACE_CAP)).toBe(true);
	});

	it('budget de temps épuisé : aucun énoncé rejoué, le modèle le dit ; les contrôles restent', async () => {
		let now = 0;
		// Chaque lecture de l'horloge avance d'une minute : budget épuisé dès le rejeu
		const clock = () => (now += 60_000);
		const result = await getClassPointErrors(fakeFrom(readable()).client, CLASS, POINT, clock);
		if (result.status !== 'ok') throw new Error('attendu ok');
		const [entry] = result.templates;
		expect(entry.capped).toBe(true);
		expect(entry.errors.groups.flatMap((g) => g.students)).toEqual(['Ada Lovelace']);
	});

	it('aucune réponse écrite : liste vide', async () => {
		const tables = readable();
		tables.test_sessions = { data: [] };
		tables.skill_attempts = { data: [] };
		const result = await getClassPointErrors(fakeFrom(tables).client, CLASS, POINT);
		expect(result).toEqual({ status: 'ok', templates: [] });
	});

	it('modèle jamais modifié (date absente) : aucun filtre de date', async () => {
		const tables = readable();
		tables.question_templates = { data: [templateRow(TEMPLATE, 'Ajouter 1', null)] };
		const fake = fakeFrom(tables);
		await getClassPointErrors(fake.client, CLASS, POINT);
		const [query] = fake.on('skill_attempts');
		expect(query.calls.some((c) => c.method === 'gt')).toBe(false);
	});

	it('point sans modèle lisible : liste vide, aucune lecture de réponses', async () => {
		const tables = readable();
		tables.question_templates = { data: [] };
		const fake = fakeFrom(tables);
		expect(await getClassPointErrors(fake.client, CLASS, POINT)).toEqual({
			status: 'ok',
			templates: []
		});
		expect(fake.on('skill_attempts')).toHaveLength(0);
		expect(fake.on('test_sessions')).toHaveLength(0);
	});

	it('lecture en échec : erreur propre', async () => {
		const tables = readable();
		tables.skill_attempts = { error: { message: 'boom' } };
		const result = await getClassPointErrors(fakeFrom(tables).client, CLASS, POINT);
		expect(result).toEqual({ status: 'error', message: POINT_ERRORS_MESSAGE });
	});

	it('modèle étranger au point : jamais lu', async () => {
		const fake = fakeFrom(readable());
		await getClassPointErrors(fake.client, CLASS, POINT);
		const [templates] = fake.on('question_templates');
		expect(called(templates, 'in', 'id', [TEMPLATE])).toBe(true);
		expect(JSON.stringify(templates.calls)).not.toContain(OTHER_TEMPLATE);
	});
});
