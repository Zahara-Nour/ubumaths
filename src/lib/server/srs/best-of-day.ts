/**
 * « Le meilleur résultat du jour » (auto-évaluations)
 * ===================================================
 *
 * Décision de David (2026-09-30) : pour une auto-évaluation (flash-cards, cartes
 * de cours), l'élève peut refaire une question plusieurs fois dans la journée ;
 * la planification FSRS ne garde qu'UN résultat par jour et par question, le
 * MEILLEUR. Les traces (`skill_attempts`) ne sont pas concernées : elles gardent
 * tout (décision Q17).
 *
 * Mécanisme : chaque révision passée ici mémorise l'état de la fiche juste avant
 * elle (`before`). Une note meilleure plus tard le même jour repart de cet état et
 * remplace la révision du jour ; une note égale ou moins bonne ne change rien.
 */

import { schoolDay } from '$lib/server/course-card-attempts';
import type { FSRS } from '$lib/srs/fsrs';
import type { CardStats, Grade, ReviewHistoryEntry, ReviewSnapshot } from '$lib/srs/types';

function snapshotOf(stats: CardStats): ReviewSnapshot {
	return {
		difficulty: stats.difficulty,
		stability: stats.stability,
		state: stats.state,
		lastReview: stats.lastReview,
		nextReview: stats.nextReview,
		totalReviews: stats.totalReviews
	};
}

/** Révise `base` et mémorise `before` dans l'entrée d'historique ajoutée */
function reviewWithSnapshot(
	fsrs: FSRS,
	base: CardStats,
	grade: Grade,
	before: ReviewSnapshot,
	timeSpent?: number
): CardStats {
	const reviewed: CardStats = { ...base, ...fsrs.reviewCard(base, grade, timeSpent) };
	const history = [...reviewed.reviewHistory];
	const last = history.at(-1);
	if (last) history[history.length - 1] = { ...last, before };
	return { ...reviewed, reviewHistory: history };
}

/**
 * Nouvelle fiche, ou `null` s'il n'y a rien à écrire (la journée a déjà un
 * résultat au moins aussi bon, ou la révision du jour vient d'un autre chemin et
 * ne peut pas être remplacée sans son état d'avant).
 */
export function reviewBestOfDay(
	fsrs: FSRS,
	stats: CardStats,
	grade: Grade,
	now: Date,
	timeSpent?: number
): CardStats | null {
	const today = schoolDay(now);
	const isToday = (entry: ReviewHistoryEntry) => schoolDay(new Date(entry.date)) === today;
	const todayEntries = stats.reviewHistory.filter(isToday);

	if (todayEntries.length === 0) {
		return reviewWithSnapshot(fsrs, stats, grade, snapshotOf(stats), timeSpent);
	}

	const bestToday = Math.max(...todayEntries.map((entry) => entry.grade));
	if (grade <= bestToday) return null;

	// Repartir de l'état d'avant la PREMIÈRE révision du jour
	const before = todayEntries[0].before;
	if (!before) return null;
	const base: CardStats = {
		...stats,
		...before,
		reviewHistory: stats.reviewHistory.filter((entry) => !isToday(entry))
	};
	return reviewWithSnapshot(fsrs, base, grade, before, timeSpent);
}
