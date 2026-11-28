/**
 * Trace d'une question de contrôle (chantier `formes-de-serie`, PR 4 bis, ADR 0038)
 * =================================================================================
 *
 * Colonnes propres au contrôle d'une trace `skill_attempts`, écrite par le
 * serveur à l'envoi de la copie (client service : la policy élève refuse le
 * lieu `evaluation`).
 *
 * - Lieu `evaluation` toujours ; ni graine (D18 : l'élève lit ses traces), ni
 *   réponse ni verdict par case (refusés en base, déjà dans `test_answers`).
 * - Durée allouée : délai de la question (Contrôle blanc) ou durée de la
 *   course (Course). Durée de réponse : celle envoyée par la page, plafonnée ;
 *   temps écoulé → la durée allouée. La page envoie des secondes entières :
 *   précision d'une seconde (les séries libres mesurent à la milliseconde).
 * - Fin inconnue (question laissée par « Terminer », onglet antérieur à la
 *   PR 4 bis) ou durée introuvable → ni durée ni fin : la trace ne fausse pas
 *   la mesure du temps par question.
 */

// Types
export type EvaluationEndReason = 'validated' | 'timeout';

export interface EvaluationTraceColumns {
	place: 'evaluation';
	response_ms?: number;
	allotted_ms?: number;
	end_reason?: EvaluationEndReason;
}

// Constantes (bornes de la base, CHECK de `skill_attempts`)
const MAX_DURATION_MS = 86_400_000;

// Functions
function allottedMsOf(seconds: number | null): number | null {
	if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
	return Math.min(MAX_DURATION_MS, Math.round(seconds * 1000));
}

export function evaluationTraceOf(input: {
	/** Forme du contrôle (`test_sessions.mode`) */
	form: 'interactive' | 'course';
	/** Délai de la question (Contrôle blanc) */
	delaySeconds: number | null;
	/** Durée de la course (Course) */
	timeLimitSeconds: number | null;
	/** Ce que la page a envoyé pour cette question (null : rien) */
	sent: { timeSpent?: number; endReason?: EvaluationEndReason } | null;
}): EvaluationTraceColumns {
	const trace: EvaluationTraceColumns = { place: 'evaluation' };
	const endReason = input.sent?.endReason;
	if (!endReason) return trace;

	const allotted = allottedMsOf(
		input.form === 'course' ? input.timeLimitSeconds : input.delaySeconds
	);
	if (allotted === null) return trace;

	let response: number;
	if (endReason === 'timeout') {
		response = allotted;
	} else {
		const timeSpent = input.sent?.timeSpent;
		if (timeSpent === undefined || !Number.isFinite(timeSpent)) return trace;
		response = Math.min(allotted, Math.max(0, Math.round(timeSpent * 1000)));
	}

	return { ...trace, response_ms: response, allotted_ms: allotted, end_reason: endReason };
}
