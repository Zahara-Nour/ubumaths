/**
 * Trace d'une question de série libre (ADR 0038)
 * ==============================================
 *
 * Une trace par question, envoyée dès la réponse (N9) à `/api/skill-attempts` :
 * Flash-cards, Contrôle blanc, Course aux nombres. Une série abandonnée garde
 * les réponses données.
 *
 * Contenu (N10, N11) :
 * - toujours : modèle, réussi, lieu, graine (avec le modèle, elle reproduit
 *   tout le tirage) ;
 * - formes chronométrées (Contrôle blanc, Course) : durée de réponse, plafonnée
 *   à la durée allouée, durée allouée et fin (validée / temps écoulé) ; aucune
 *   durée pour une question laissée par « Terminer » (décision du 2026-11-11) ;
 * - formes où l'on tape : réponse case par case et verdict par case (juste en
 *   valeur : le vert ou l'ambre de la carte). Figure à compléter : son verdict,
 *   jamais le tracé (case vide). Aucune case → rien (la base refuse `[]`).
 *
 * Bornes de la base (50 cases, 2 000 caractères par case, 10 000 en tout) : rien
 * n'est tronqué ici ; au-delà, le serveur refuse la trace (400, décision L3) et
 * elle compte parmi les traces non enregistrées.
 *
 * Envoi (E1) : une trace à la fois, dans l'ordre (deux révisions FSRS en
 * parallèle sur un même modèle perdraient une mise à jour : lecture puis
 * écriture, sans verrou) ; réessayé en silence ; `settle()` dit en fin de série combien de
 * traces n'ont pas pu être enregistrées, pour un message unique. Jamais de
 * blocage de la série. `answer_parts` est du texte libre de mineur : affiché
 * échappé partout où il sera relu.
 */

import { computeBlankColors } from '$lib/components/questions/blank-verdicts';
import { getQuestionType, type QuestionInstance } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';

// Types
/** Lieux d'une série libre qui laissent une trace par cette voie */
export type SeriesTracePlace = 'flash_cards' | 'mock_test' | 'number_race';

export interface SeriesTraceTiming {
	/** De l'affichage de la question à « Valider » (ou au temps écoulé) */
	responseMs: number;
	allottedMs: number;
	endReason: 'validated' | 'timeout';
}

/** Corps de `POST /api/skill-attempts` */
export interface SeriesTraceBody {
	template_id: string;
	success: boolean;
	place: SeriesTracePlace;
	seed?: number;
	response_ms?: number;
	allotted_ms?: number;
	end_reason?: 'validated' | 'timeout';
	answer_parts?: string[];
	part_verdicts?: boolean[];
}

export interface TraceRecorder {
	/** Envoie la trace tout de suite (sans attendre) */
	record: (trace: SeriesTraceBody) => void;
	/** Attend les envois en cours ; rend le nombre de traces perdues depuis le dernier appel */
	settle: () => Promise<{ failed: number }>;
}

// Constantes (bornes de la base, CHECK de `skill_attempts`)
const MAX_DURATION_MS = 86_400_000;
const MAX_SEED = 2_147_483_647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lieux où l'élève tape sa réponse */
const ANSWERED_PLACES: readonly SeriesTracePlace[] = ['mock_test', 'number_race'];
/** Attentes avant chaque nouvel essai (deux essais de plus) */
const DEFAULT_RETRY_DELAYS_MS = [1000, 3000];

// Functions
function clampDuration(ms: number): number {
	return Math.min(MAX_DURATION_MS, Math.max(0, Math.round(ms)));
}

/** Cases tapées ; la figure n'envoie pas son tracé, seulement son verdict */
function answerPartsOf(values: string[], instance: QuestionInstance): string[] {
	const blanks = instance.blanks ?? [];
	return values.map((value, index) => (blanks[index]?.type === 'graphical' ? '' : value));
}

/** Réponse et verdicts par case ; null quand il n'y a aucune case tapée */
function answerOf(
	instance: QuestionInstance,
	answer: AnswerData | undefined
): { parts: string[]; verdicts: boolean[] } | null {
	if (!answer || !Array.isArray(answer.value)) return null;
	const typed: readonly (string | number)[] = answer.value;
	const blanks = instance.blanks ?? [];
	if (blanks.length === 0) return null;
	const values = blanks.map((_, index) => String(typed[index] ?? ''));
	// Rien de tapé (cases vides) : comme une question sans réponse
	if (values.every((value) => value.trim() === '')) return null;
	const { verdicts } = computeBlankColors(values, instance);
	return { parts: answerPartsOf(values, instance), verdicts };
}

/**
 * Trace d'une question. `answer` absent : question jamais validée (ratée).
 * Rend null si la question ne porte pas de modèle identifiable.
 */
export function buildSeriesTrace(input: {
	place: SeriesTracePlace;
	instance: QuestionInstance;
	answer?: AnswerData;
	timing?: SeriesTraceTiming;
}): SeriesTraceBody | null {
	const { place, instance, answer, timing } = input;
	if (!UUID.test(instance.templateId ?? '')) return null;

	const trace: SeriesTraceBody = {
		template_id: instance.templateId,
		success: answer?.isCorrect ?? false,
		place
	};
	const seed = instance.seed;
	if (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED) {
		trace.seed = seed;
	}
	if (timing && place !== 'flash_cards') {
		const allotted = Math.max(1, clampDuration(timing.allottedMs));
		trace.response_ms = Math.min(clampDuration(timing.responseMs), allotted);
		trace.allotted_ms = allotted;
		trace.end_reason = timing.endReason;
	}
	if (ANSWERED_PLACES.includes(place) && getQuestionType(instance) !== 'course_card') {
		const typed = answerOf(instance, answer);
		if (typed) {
			trace.answer_parts = typed.parts;
			trace.part_verdicts = typed.verdicts;
		}
	}
	return trace;
}

/** Un essai mérite-t-il d'être refait ? Réseau, serveur en panne, trop de requêtes */
function isRetryable(status: number): boolean {
	return status >= 500 || status === 429 || status === 408;
}

function wait(ms: number): Promise<void> {
	return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/**
 * Envoi des traces d'une série. `fetchFn` et les attentes : remplaçables pour
 * les tests.
 */
export function createTraceRecorder(
	options: { fetchFn?: typeof fetch; retryDelaysMs?: number[] } = {}
): TraceRecorder {
	const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
	const retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
	// File : chaque envoi attend la fin du précédent
	let queue: Promise<void> = Promise.resolve();
	let failed = 0;

	async function send(trace: SeriesTraceBody): Promise<void> {
		for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
			if (attempt > 0) await wait(retryDelays[attempt - 1]);
			try {
				const response = await fetchFn('/api/skill-attempts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(trace)
				});
				if (response.ok) return;
				// Refusée (400, 404, 401) : un nouvel essai serait refusé aussi
				if (!isRetryable(response.status)) break;
			} catch {
				// Réseau coupé : nouvel essai
			}
		}
		failed += 1;
	}

	return {
		record(trace) {
			queue = queue.then(() => send(trace));
		},
		async settle() {
			await queue;
			const lost = failed;
			failed = 0;
			return { failed: lost };
		}
	};
}
