/**
 * Trace d'une question de série libre (ADR 0038, chantier `formes-de-serie`, PR 4)
 * ================================================================================
 *
 * Contenu (N10, N11) et envoi (N9, E1) d'une trace, question par question.
 */
import { describe, it, expect, vi } from 'vitest';
import { buildSeriesTrace, createTraceRecorder } from '../series-trace';
import type { QuestionInstance } from '../types';
import type { AnswerData } from '$lib/types/question-display';

// Constantes
const MODELE = '22222222-2222-4222-8222-222222222222';

// Functions
function instance(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
	return {
		templateId: MODELE,
		statement: 'Calculer $2+2 = \\placeholder[0]$ et $3+3 = \\placeholder[1]$',
		blanks: [
			{ expectedAnswer: '4', type: 'math' },
			{ expectedAnswer: '6', type: 'math' }
		],
		generatedAt: '2026-11-11T10:00:00.000Z',
		seed: 1234,
		...overrides
	} as QuestionInstance;
}

function reponse(value: AnswerData['value'], isCorrect: boolean): AnswerData {
	return { value, isCorrect, timeSpent: 3, attempts: 1, submittedAt: '2026-11-11T10:00:03.000Z' };
}

describe('buildSeriesTrace — contenu', () => {
	it('Flash-cards : modèle, réussi, graine ; ni réponse, ni verdicts, ni durées', () => {
		const trace = buildSeriesTrace({
			place: 'flash_cards',
			instance: instance(),
			answer: reponse('knew', true)
		});
		expect(trace).toEqual({
			template_id: MODELE,
			success: true,
			place: 'flash_cards',
			seed: 1234
		});
	});

	it('Contrôle blanc : réponse et verdict case par case', () => {
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: instance(),
			answer: reponse(['4', '7'], false),
			timing: { responseMs: 4200, allottedMs: 30000, endReason: 'validated' }
		});
		expect(trace).toMatchObject({
			success: false,
			place: 'mock_test',
			answer_parts: ['4', '7'],
			part_verdicts: [true, false],
			response_ms: 4200,
			allotted_ms: 30000,
			end_reason: 'validated'
		});
	});

	it('durée de réponse plafonnée à la durée allouée', () => {
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: instance(),
			answer: reponse(['4', '6'], true),
			timing: { responseMs: 30450, allottedMs: 30000, endReason: 'timeout' }
		});
		expect(trace?.response_ms).toBe(30000);
	});

	it('temps écoulé sans rien taper : ratée, aucune case (NULL, jamais [])', () => {
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: instance(),
			answer: reponse('', false),
			timing: { responseMs: 30000, allottedMs: 30000, endReason: 'timeout' }
		});
		expect(trace).toMatchObject({ success: false, end_reason: 'timeout' });
		expect(trace).not.toHaveProperty('answer_parts');
		expect(trace).not.toHaveProperty('part_verdicts');
	});

	it('pas de réponse du tout (Course, « Terminer ») : ratée, sans durée ni fin', () => {
		const trace = buildSeriesTrace({ place: 'number_race', instance: instance() });
		expect(trace).toEqual({
			template_id: MODELE,
			success: false,
			place: 'number_race',
			seed: 1234
		});
	});

	it('figure à compléter : la case garde son verdict, jamais le tracé', () => {
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: instance({
				blanks: [
					{ expectedAnswer: '4', type: 'math' },
					{ expectedAnswer: '', type: 'graphical' }
				] as QuestionInstance['blanks']
			}),
			answer: reponse(['4', 'A(1;2) B(3;4) segment AB'], false),
			timing: { responseMs: 1000, allottedMs: 30000, endReason: 'validated' }
		});
		expect(trace?.answer_parts).toEqual(['4', '']);
		expect(trace?.part_verdicts).toHaveLength(2);
		expect(trace?.part_verdicts?.[0]).toBe(true);
	});

	it('carte de cours : jamais de réponse ni de verdicts', () => {
		const trace = buildSeriesTrace({
			place: 'flash_cards',
			instance: instance({ options: { courseCard: true } }),
			answer: reponse('did_not_know', false)
		});
		expect(trace).toMatchObject({ success: false });
		expect(trace).not.toHaveProperty('answer_parts');
	});

	it('bornes de la base : 2 000 caractères par case, 10 000 en tout', () => {
		const longue = 'x'.repeat(2500);
		const blanks = Array.from({ length: 6 }, () => ({ expectedAnswer: '1', type: 'text' }));
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: instance({ blanks: blanks as QuestionInstance['blanks'] }),
			answer: reponse(Array(6).fill(longue), false),
			timing: { responseMs: 1, allottedMs: 30000, endReason: 'validated' }
		});
		const parts = trace?.answer_parts ?? [];
		expect(parts).toHaveLength(6);
		expect(parts.every((part) => part.length <= 2000)).toBe(true);
		expect(parts.join('').length).toBeLessThanOrEqual(10000);
	});

	it('émojis : chaque case tient dans 2 000 unités UTF-16 (borne du Zod)', () => {
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: instance({
				blanks: [{ expectedAnswer: '1', type: 'text' }] as QuestionInstance['blanks']
			}),
			answer: reponse(['😀'.repeat(1500)], false),
			timing: { responseMs: 1, allottedMs: 30000, endReason: 'validated' }
		});
		const [part] = trace?.answer_parts ?? [];
		expect(part.length).toBeLessThanOrEqual(2000);
		// Jamais un émoji coupé en deux
		expect(part).toBe('😀'.repeat(1000));
	});

	it('graine absente ou hors bornes : pas de graine', () => {
		expect(
			buildSeriesTrace({ place: 'flash_cards', instance: instance({ seed: undefined }) })
		).not.toHaveProperty('seed');
		expect(
			buildSeriesTrace({ place: 'flash_cards', instance: instance({ seed: 2 ** 31 }) })
		).not.toHaveProperty('seed');
	});

	it('modèle qui n’est pas un identifiant (aperçu de contrôle) : aucune trace', () => {
		expect(
			buildSeriesTrace({ place: 'mock_test', instance: instance({ templateId: 'position-3' }) })
		).toBeNull();
	});
});

describe('createTraceRecorder — envoi (N9, E1)', () => {
	const trace = { template_id: MODELE, success: true, place: 'flash_cards' as const };

	it('envoie la trace à /api/skill-attempts, aussitôt', async () => {
		const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));
		const recorder = createTraceRecorder({ fetchFn, retryDelaysMs: [0, 0] });
		recorder.record(trace);
		expect(fetchFn).toHaveBeenCalledTimes(1);
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/skill-attempts');
		expect(JSON.parse(init.body as string)).toEqual(trace);
		expect(await recorder.settle()).toEqual({ failed: 0 });
	});

	it('réseau coupé : réessaie en silence, puis réussit', async () => {
		const fetchFn = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce(new Response('{}', { status: 503 }))
			.mockResolvedValueOnce(new Response('{}', { status: 200 }));
		const recorder = createTraceRecorder({ fetchFn, retryDelaysMs: [0, 0] });
		recorder.record(trace);
		expect(await recorder.settle()).toEqual({ failed: 0 });
		expect(fetchFn).toHaveBeenCalledTimes(3);
	});

	it('échec persistant : compté une fois, sans lever', async () => {
		const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const recorder = createTraceRecorder({ fetchFn, retryDelaysMs: [0, 0] });
		recorder.record(trace);
		expect(await recorder.settle()).toEqual({ failed: 1 });
		expect(fetchFn).toHaveBeenCalledTimes(3);
	});

	it('trace refusée (400) : pas de nouvel essai, comptée comme non enregistrée (L3)', async () => {
		const fetchFn = vi.fn(async () => new Response('{}', { status: 400 }));
		const recorder = createTraceRecorder({ fetchFn, retryDelaysMs: [0, 0] });
		recorder.record(trace);
		expect(await recorder.settle()).toEqual({ failed: 1 });
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('settle remet le compte à zéro (série suivante)', async () => {
		const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const recorder = createTraceRecorder({ fetchFn, retryDelaysMs: [0, 0] });
		recorder.record(trace);
		await recorder.settle();
		expect(await recorder.settle()).toEqual({ failed: 0 });
	});
});
