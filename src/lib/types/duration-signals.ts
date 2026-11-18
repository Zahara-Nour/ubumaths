/**
 * Durées trop courtes, modèle par modèle (chantier `durees-trop-courtes`, PR 2)
 * ============================================================================
 *
 * Ce que le panier et l'éditeur de série reçoivent : pour chaque modèle, une
 * entrée par durée observée (modèle × durée, Q2). Partagé client / serveur.
 *
 * Durée observée (chantier `durees-ajustees`, A1) : pour chaque modèle, la
 * durée dans laquelle 80 % des tirages ont été validés, suggérée au prof sous
 * la durée d'une ligne quand l'écart compte (Q5). Rien n'est changé sans lui.
 */

import type { QuestionTiming } from './evaluation-breakdown';
import { DEFAULT_QUESTION_DELAY_SECONDS } from '#lib/questions/series-items.ts';

// Types

/** Modèle → ses durées observées, de la plus courte à la plus longue */
export type DurationSignals = Record<string, QuestionTiming[]>;

/** Durée observée d'un modèle, chez les élèves du prof */
export interface ObservedDuration {
	/** Secondes, multiple de 5, entre 5 et 300 */
	seconds: number;
	/** Élèves dont les tirages ont compté */
	students: number;
}

/** Modèle → sa durée observée ; absent : pas assez d'élèves ou pas calculable */
export type ObservedDurations = Record<string, ObservedDuration>;

export type DurationSignalsResult =
	| { status: 'ok'; signals: DurationSignals; observed: ObservedDurations }
	| { status: 'error'; message: string };

/** Réponse de `GET /api/series/duration-signals` */
export interface DurationSignalsResponse {
	signals: DurationSignals;
	observed: ObservedDurations;
}

// Constantes

export const DURATION_SIGNALS_MESSAGE = 'Impossible de lire les durées observées';

/** Modèles demandés à la fois (une série en a rarement plus de 30) */
export const DURATION_SIGNALS_MAX_TEMPLATES = 100;

/** Part des tirages validés dans la durée observée (Q3) */
export const OBSERVED_QUANTILE = 0.8;
/** Arrondi supérieur et bornes : ceux du réglage de durée du panier */
export const OBSERVED_STEP_SECONDS = 5;
export const OBSERVED_MIN_SECONDS = 5;
export const OBSERVED_MAX_SECONDS = 300;
/** Écart minimal avec la durée de la ligne pour suggérer (Q5) : les deux à la fois */
export const OBSERVED_MIN_GAP_SECONDS = 5;
export const OBSERVED_MIN_GAP_RATIO = 0.25;
export const OBSERVED_LABEL = 'Durée observée';

// Functions

/** Durée réelle d'une ligne (0 = durée par défaut, comme au tirage) */
export function effectiveDelay(delay: number): number {
	return delay > 0 ? delay : DEFAULT_QUESTION_DELAY_SECONDS;
}

/** L'entrée de la durée demandée, si elle est signalée trop courte ; sinon null */
export function tooShortAt(
	signals: DurationSignals | null | undefined,
	templateId: string,
	delaySeconds: number
): QuestionTiming | null {
	const delay = effectiveDelay(delaySeconds);
	const timing = signals?.[templateId]?.find((t) => t.delaySeconds === delay);
	return timing?.tooShort ? timing : null;
}

/**
 * Durée observée à suggérer pour une ligne, ou null : rien d'observé, ou écart
 * avec la durée de la ligne sous 5 s ou sous 25 % (Q5), dans un sens ou l'autre.
 */
export function observedSuggestion(
	observed: ObservedDurations | null | undefined,
	templateId: string,
	delaySeconds: number
): number | null {
	const entry = observed?.[templateId];
	if (!entry) return null;
	const delay = effectiveDelay(delaySeconds);
	const gap = Math.abs(entry.seconds - delay);
	if (gap < OBSERVED_MIN_GAP_SECONDS || gap < OBSERVED_MIN_GAP_RATIO * delay) return null;
	return entry.seconds;
}
