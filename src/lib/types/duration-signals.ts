/**
 * Durées trop courtes, modèle par modèle (chantier `durees-trop-courtes`, PR 2)
 * ============================================================================
 *
 * Ce que le panier et l'éditeur de série reçoivent : pour chaque modèle, une
 * entrée par durée observée (modèle × durée, Q2). Partagé client / serveur.
 */

import type { QuestionTiming } from './evaluation-breakdown';
import { DEFAULT_QUESTION_DELAY_SECONDS } from '$lib/questions/series-items';

// Types

/** Modèle → ses durées observées, de la plus courte à la plus longue */
export type DurationSignals = Record<string, QuestionTiming[]>;

export type DurationSignalsResult =
	{ status: 'ok'; signals: DurationSignals } | { status: 'error'; message: string };

// Constantes

export const DURATION_SIGNALS_MESSAGE = 'Impossible de lire les durées observées';

/** Modèles demandés à la fois (une série en a rarement plus de 30) */
export const DURATION_SIGNALS_MAX_TEMPLATES = 100;

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
