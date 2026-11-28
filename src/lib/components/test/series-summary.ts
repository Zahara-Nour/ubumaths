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

/** Nom de la forme d'un contrôle assigné, tel que l'élève le lit */
const EVALUATION_FORM_LABELS = {
	interactive: 'Contrôle blanc',
	course: 'Course aux nombres'
} as const;

/**
 * Résumé de la page d'attente d'un contrôle assigné (PR 2b) :
 * « Course aux nombres · 15 questions · 10 min », « Contrôle blanc · 10
 * questions · environ 4 min » ; tentative commencée : « Tu reprends ton
 * contrôle : il te reste 6 min » (Course) ou « … : 10 questions, réponses à
 * retaper » (Contrôle blanc, chaque question a son propre chrono).
 */
export function evaluationSummary(overview: {
	evaluation: { form: keyof typeof EVALUATION_FORM_LABELS };
	questionCount: number;
	durationSeconds: number;
	resumed: boolean;
}): string {
	const { form } = overview.evaluation;
	const isCourse = form === 'course';
	if (overview.resumed) {
		if (!isCourse) {
			const questions = `${overview.questionCount} ${overview.questionCount > 1 ? 'questions' : 'question'}`;
			return `Tu reprends ton contrôle : ${questions}, réponses à retaper`;
		}
		return overview.durationSeconds > 0
			? `Tu reprends ton contrôle : il te reste ${formatDuration(overview.durationSeconds, false)}`
			: 'Tu reprends ton contrôle : le temps est écoulé, ta copie va partir';
	}
	const series = seriesSummary(overview.questionCount, overview.durationSeconds, {
		approximate: !isCourse
	});
	return `${EVALUATION_FORM_LABELS[form]} · ${series}`;
}
