/**
 * La Descente de la Vistule — appels de la page de combat
 * =======================================================
 *
 * Trois routes (`/api/descente/combat/[beastId]/…`) : question, réponse,
 * victoire. Une demande de question ou de victoire est refaite quand le serveur
 * répond qu'il est en panne (5xx, 429, 408) : elle n'écrit rien en double (la
 * victoire est payée une seule fois en base). Une RÉPONSE n'est jamais renvoyée :
 * un 500 peut arriver après l'écriture de la trace et des dégâts, la renvoyer les
 * doublerait. Elle est alors perdue et le combat continue.
 */

import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';
import type { AnswerData } from '#lib/types/question-display.ts';
import { buildSeriesTrace } from '#lib/questions/series-trace.ts';

// Types
export type CombatPurpose = 'attack' | 'dodge';

export interface CombatAnswerResponse {
	beastHp: number;
	recorded: boolean;
	victory: { paid: number; capReached: boolean } | null;
}

/** Échec d'un appel : `code` lu dans le corps (`defeated`, `gone`…), sinon `network` ou `server_error` */
export interface CombatCallFailure {
	ok: false;
	code: string;
}

export type CombatCall<T> = { ok: true; value: T } | CombatCallFailure;

// Constantes
const DEFAULT_RETRY_DELAYS_MS = [1000, 3000];

// Functions
function isRetryable(status: number): boolean {
	return status >= 500 || status === 429 || status === 408;
}

function wait(ms: number): Promise<void> {
	return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function errorCode(response: Response): Promise<string> {
	try {
		const body: unknown = await response.json();
		if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
			return body.error;
		}
	} catch {
		// Corps illisible
	}
	return response.status >= 500 ? 'server_error' : `http_${response.status}`;
}

async function post<T>(
	url: string,
	body: unknown,
	options: { fetchFn?: typeof fetch; retryDelaysMs?: number[] }
): Promise<CombatCall<T>> {
	const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
	const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
	let failure: CombatCallFailure = { ok: false, code: 'server_error' };
	for (let attempt = 0; attempt <= delays.length; attempt += 1) {
		if (attempt > 0) await wait(delays[attempt - 1]);
		let response: Response;
		try {
			response = await fetchFn(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body ?? {})
			});
		} catch {
			// Coupure réseau : pas de nouvel essai (doublon possible)
			return { ok: false, code: 'network' };
		}
		if (response.ok) return { ok: true, value: (await response.json()) as T };
		failure = { ok: false, code: await errorCode(response) };
		if (!isRetryable(response.status)) return failure;
	}
	return failure;
}

/** Une question courte pour un coup (Province du coup) ou une esquive. */
export function requestQuestion(
	beastId: string,
	input: { purpose: CombatPurpose; province: ProvinceId; recent: string[] },
	options: { fetchFn?: typeof fetch; retryDelaysMs?: number[] } = {}
): Promise<CombatCall<{ instance: QuestionInstance }>> {
	return post(`/api/descente/combat/${beastId}/question`, input, options);
}

/**
 * Envoie la réponse : verdict, graine, réponse et verdict par case (comme une
 * trace de la forme Saisie : on tape sa réponse).
 */
export function sendAnswer(
	beastId: string,
	input: {
		purpose: CombatPurpose;
		province: ProvinceId;
		instance: QuestionInstance;
		answer: AnswerData;
	},
	options: { fetchFn?: typeof fetch } = {}
): Promise<CombatCall<CombatAnswerResponse>> {
	const trace = buildSeriesTrace({
		place: 'typing',
		instance: input.instance,
		answer: input.answer
	});
	return post(
		`/api/descente/combat/${beastId}/answer`,
		{
			purpose: input.purpose,
			province: input.province,
			template_id: input.instance.templateId,
			success: input.answer.isCorrect,
			seed: trace?.seed,
			answer_parts: trace?.answer_parts,
			part_verdicts: trace?.part_verdicts
		},
		// Jamais renvoyée (voir l'en-tête)
		{ fetchFn: options.fetchFn, retryDelaysMs: [] }
	);
}

/** Renvoi de la victoire (la réponse qui a achevé la Bête ne l'a pas enregistrée). */
export function claimVictory(
	beastId: string,
	options: { fetchFn?: typeof fetch; retryDelaysMs?: number[] } = {}
): Promise<CombatCall<{ paid: number; capReached: boolean }>> {
	return post(`/api/descente/combat/${beastId}/victory`, {}, options);
}
