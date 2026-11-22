/**
 * Résumé d'une série sur sa page d'attente (`SeriesStartScreen`, chantier
 * `diaporama-reglages`), ex. « 10 questions · environ 4 min ».
 */

/**
 * Durée lisible : « 45 s », « 5 min », « 1 min 30 s ».
 * Approximative : arrondie à la minute dès 60 s (« environ 4 min »).
 */
function formatDuration(seconds: number, approximate: boolean): string {
	if (seconds < 60) return `${seconds} s`;
	if (approximate) return `${Math.round(seconds / 60)} min`;
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

/**
 * « 3 questions · environ 30 s » (durée estimée : somme des chronos) ou
 * « 20 questions · 5 min » (durée exacte : temps imparti d'une course).
 */
export function seriesSummary(
	count: number,
	seconds: number,
	{ approximate }: { approximate: boolean }
): string {
	const questions = `${count} ${count > 1 ? 'questions' : 'question'}`;
	const duration = formatDuration(seconds, approximate);
	return `${questions} · ${approximate ? 'environ ' : ''}${duration}`;
}
