/**
 * Badge des niveaux d'un modèle, au-dessus de sa tuile (catalogue Automaths, Ma série)
 *
 * Phase 0 validée par David (2026-11-26) : « CM1–CM2 » si les niveaux se
 * suivent, sinon « CM1 · 6e ». Deux niveaux se suivent quand le second a le
 * premier pour prérequis direct (CM2 après CM1, 1re spé après la seconde) ;
 * deux filières d'une même année ne se suivent pas.
 */
import { GRADE_CODES, GRADES, type GradeCode } from '#lib/types/grades.ts';

/** Nom court des niveaux, suites reliées par « – », le reste séparé par « · » */
export function formatGradeBadge(grades: readonly string[]): string {
	// Ordre de l'école (celui de GRADE_CODES), doublons et codes inconnus écartés
	const codes = GRADE_CODES.filter((code) => grades.includes(code));

	const runs: GradeCode[][] = [];
	for (const code of codes) {
		const run = runs.at(-1);
		const previous = run?.at(-1);
		if (run && previous && GRADES[code].prerequisites.includes(previous)) run.push(code);
		else runs.push([code]);
	}

	return runs
		.map((run) => {
			const first = GRADES[run[0]].shortName;
			return run.length === 1 ? first : `${first}–${GRADES[run[run.length - 1]].shortName}`;
		})
		.join(' · ');
}
