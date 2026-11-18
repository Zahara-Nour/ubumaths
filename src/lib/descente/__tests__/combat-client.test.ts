/**
 * Appels de la page de combat : une réponse est renvoyée quand le serveur est en
 * panne, jamais après une coupure réseau (doublon de trace et de dégâts).
 */

import { describe, expect, test, vi } from 'vitest';
import { claimVictory, requestQuestion, sendAnswer } from '../combat-client';
import type { QuestionInstance } from '#lib/questions/types.ts';
import type { AnswerData } from '#lib/types/question-display.ts';

const BEAST = '44444444-4444-4444-8444-444444444444';
const TEMPLATE = '11111111-1111-4111-8111-111111111111';

function reply(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

const instance = {
	templateId: TEMPLATE,
	statement: 'Combien ? $\\placeholder[0]{}$',
	blanks: [{ expectedAnswer: '4', type: 'math' }],
	grades: ['6'],
	level: 1,
	seed: 7,
	generatedAt: '2026-11-18T08:00:00Z'
} as unknown as QuestionInstance;

const answer: AnswerData = {
	value: ['4'],
	isCorrect: true,
	timeSpent: 3,
	attempts: 1,
	submittedAt: '2026-11-18T08:00:03Z'
};

describe('sendAnswer', () => {
	test('corps : coup, verdict, graine, réponse et verdict par case', async () => {
		const fetchFn = vi.fn(async () => reply(200, { beastHp: 100, recorded: true, victory: null }));
		const result = await sendAnswer(
			BEAST,
			{ purpose: 'attack', province: 'bedonstan', instance, answer },
			{ fetchFn }
		);
		expect(result).toEqual({ ok: true, value: { beastHp: 100, recorded: true, victory: null } });
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`/api/descente/combat/${BEAST}/answer`);
		expect(JSON.parse(String(init.body))).toEqual({
			purpose: 'attack',
			province: 'bedonstan',
			template_id: TEMPLATE,
			success: true,
			seed: 7,
			answer_parts: ['4'],
			part_verdicts: [true]
		});
	});

	test('serveur en panne : jamais renvoyée (trace et dégâts possiblement déjà écrits)', async () => {
		const fetchFn = vi.fn(async () => reply(500, { error: 'server_error' }));
		const result = await sendAnswer(
			BEAST,
			{ purpose: 'attack', province: 'bedonstan', instance, answer },
			{ fetchFn }
		);
		expect(result).toEqual({ ok: false, code: 'server_error' });
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	test('coupure réseau : jamais renvoyée', async () => {
		const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		const result = await sendAnswer(
			BEAST,
			{ purpose: 'dodge', province: 'bedonstan', instance, answer },
			{ fetchFn }
		);
		expect(result).toEqual({ ok: false, code: 'network' });
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	test('refus (409) : le code du corps, sans nouvel essai', async () => {
		const fetchFn = vi.fn(async () => reply(409, { error: 'gone' }));
		const result = await sendAnswer(
			BEAST,
			{ purpose: 'attack', province: 'bedonstan', instance, answer },
			{ fetchFn }
		);
		expect(result).toEqual({ ok: false, code: 'gone' });
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});
});

describe('requestQuestion et claimVictory', () => {
	test('question : refaite quand le serveur est en panne', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(reply(503, { error: 'server_error' }))
			.mockResolvedValueOnce(reply(200, { instance }));
		const result = await requestQuestion(
			BEAST,
			{ purpose: 'dodge', province: 'bedonstan', recent: [] },
			{ fetchFn, retryDelaysMs: [0, 0] }
		);
		expect(result.ok).toBe(true);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	test('question : coup et modèles déjà posés', async () => {
		const fetchFn = vi.fn(async () => reply(200, { instance }));
		const result = await requestQuestion(
			BEAST,
			{ purpose: 'attack', province: 'nombrilie', recent: [TEMPLATE] },
			{ fetchFn }
		);
		expect(result.ok).toBe(true);
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`/api/descente/combat/${BEAST}/question`);
		expect(JSON.parse(String(init.body))).toEqual({
			purpose: 'attack',
			province: 'nombrilie',
			recent: [TEMPLATE]
		});
	});

	test('victoire renvoyée', async () => {
		const fetchFn = vi.fn(async () => reply(200, { paid: 1, capReached: false }));
		expect(await claimVictory(BEAST, { fetchFn })).toEqual({
			ok: true,
			value: { paid: 1, capReached: false }
		});
	});
});
