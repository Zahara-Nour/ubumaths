/**
 * Résumé de « Ma série » dans le catalogue Automaths : nombre de questions
 * (une par modèle, comme les tuiles) et durée totale (répétitions × durée par
 * question ; durée 0 = durée par défaut, comme au lancement).
 */

import { effectiveDelay } from '#lib/types/duration-signals.ts';
import type { SeriesItem } from '#lib/validation/series.ts';

// Functions

/** Durée totale d'une série, en secondes */
export function seriesTotalSeconds(items: readonly SeriesItem[]): number {
	return items.reduce((sum, item) => sum + item.quantity * effectiveDelay(item.delay), 0);
}

/** « 45 s », « 1 min », « 2 min 05 », « 65 min » */
export function formatSeriesDuration(totalSeconds: number): string {
	if (totalSeconds < 60) return `${totalSeconds} s`;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return seconds === 0 ? `${minutes} min` : `${minutes} min ${String(seconds).padStart(2, '0')}`;
}

/** « 1 question », « 3 questions » */
export function seriesQuestionCount(count: number): string {
	return `${count} question${count > 1 ? 's' : ''}`;
}
