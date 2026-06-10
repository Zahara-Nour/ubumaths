/**
 * Détecteurs anti-fraud SRS — 5 signaux individuels + composite.
 *
 * Fonctions PURES (pas d'I/O DB), testables unitairement.
 * Cf. spec TDD `docs/wip/srs-anti-fraud-spec-tdd.md` §B1..B6.
 *
 * Chaque fonction retourne `SignalResult | null` :
 *   - `null` si seuil non franchi ou sample_size insuffisant
 *   - `SignalResult` sinon (créé sans question par le runner)
 */

import type { AttemptEntry, CompositeResult, ReviewEntry, SignalResult } from './types';

// ============================================================================
// B1 — high_easy_ratio
// ============================================================================

/**
 * Détecte un ratio Easy (grade=4) anormalement élevé.
 * Seuil : > 90 % sur ≥ 20 reviews.
 */
export function detectHighEasyRatio(reviews: ReviewEntry[]): SignalResult | null {
	if (reviews.length < 20) return null;

	const easyCount = reviews.filter((r) => r.grade === 4).length;
	const ratio = easyCount / reviews.length;

	if (ratio <= 0.9) return null;

	return {
		flag_type: 'high_easy_ratio',
		severity: 2,
		score: 0.5,
		sample_size: reviews.length,
		details: {
			ratio,
			easy_count: easyCount,
			total: reviews.length
		}
	};
}

// ============================================================================
// B2 — no_again
// ============================================================================

/**
 * Détecte une absence totale de Again (grade=1) sur ≥ 30 reviews consécutives.
 *
 * Stratégie : on regarde la **plus longue séquence sans grade=1** (post-dernière
 * Again). Si cette séquence atteint 30+, on flag.
 */
export function detectNoAgain(reviews: ReviewEntry[]): SignalResult | null {
	if (reviews.length < 30) return null;

	// Trie chronologique (au cas où ce ne soit pas garanti par l'amont).
	const sorted = [...reviews].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);

	const lastAgainIdx = sorted.reduce(
		(acc, r, idx) => (r.grade === 1 ? idx : acc),
		-1 // -1 = aucune Again trouvée
	);

	const streakLength = sorted.length - lastAgainIdx - 1;
	if (streakLength < 30) return null;

	const lastAgainDate = lastAgainIdx >= 0 ? sorted[lastAgainIdx].date : null;

	return {
		flag_type: 'no_again',
		severity: 3,
		score: 0.7,
		sample_size: streakLength,
		details: {
			streak_length: streakLength,
			last_again_date: lastAgainDate
		}
	};
}

// ============================================================================
// B3 — fast_timeSpent
// ============================================================================

/**
 * Médiane `timeSpent` < 2s sur ≥ 10 reviews (avec `timeSpent` renseigné).
 */
export function detectFastTimeSpent(reviews: ReviewEntry[]): SignalResult | null {
	const withTime = reviews
		.map((r) => r.timeSpent)
		.filter((t): t is number => typeof t === 'number' && t >= 0);

	if (withTime.length < 10) return null;

	const sorted = [...withTime].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

	if (median >= 2) return null;

	return {
		flag_type: 'fast_timeSpent',
		severity: 3,
		score: 0.7,
		sample_size: withTime.length,
		details: {
			median_seconds: median,
			sample_size: withTime.length
		}
	};
}

// ============================================================================
// B4 — burst
// ============================================================================

/**
 * Détecte un pic ≥ 16 reviews dans une fenêtre glissante de 60 s.
 * Pas de seuil sample_size global (un burst se détecte sur peu de reviews aussi).
 */
export function detectBurst(reviews: ReviewEntry[]): SignalResult | null {
	if (reviews.length < 16) return null;

	const sorted = [...reviews].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
	const times = sorted.map((r) => new Date(r.date).getTime());

	let maxCount = 0;
	let burstStart = '';
	let burstEnd = '';

	// Two-pointer sliding window 60s.
	let left = 0;
	for (let right = 0; right < times.length; right += 1) {
		while (times[right] - times[left] > 60_000) {
			left += 1;
		}
		const count = right - left + 1;
		if (count > maxCount) {
			maxCount = count;
			burstStart = sorted[left].date;
			burstEnd = sorted[right].date;
		}
	}

	if (maxCount < 16) return null;

	return {
		flag_type: 'burst',
		severity: 4,
		score: 0.85,
		sample_size: maxCount,
		details: {
			burst_count: maxCount,
			burst_start: burstStart,
			burst_end: burstEnd
		}
	};
}

// ============================================================================
// B5 — srs_vs_quiz_gap
// ============================================================================

/**
 * Détecte un écart > 50 points entre taux succès SRS et taux succès Monde 1
 * sur une même capacité. Chaque côté nécessite ≥ 10 attempts.
 */
export function detectSrsVsQuizGap(srs: AttemptEntry[], quiz: AttemptEntry[]): SignalResult | null {
	if (srs.length < 10 || quiz.length < 10) return null;

	const srsRate = srs.filter((a) => a.success).length / srs.length;
	const quizRate = quiz.filter((a) => a.success).length / quiz.length;
	const gap = srsRate - quizRate;

	if (gap <= 0.5) return null;

	return {
		flag_type: 'srs_vs_quiz_gap',
		severity: 5,
		score: 0.9,
		sample_size: Math.min(srs.length, quiz.length),
		details: {
			srs_rate: srsRate,
			quiz_rate: quizRate,
			gap_pct: gap,
			srs_total: srs.length,
			quiz_total: quiz.length
		}
	};
}

// ============================================================================
// B6 — composite
// ============================================================================

const SIGNAL_WEIGHTS: Record<SignalResult['flag_type'], number> = {
	high_easy_ratio: 1,
	no_again: 2,
	fast_timeSpent: 2,
	burst: 3,
	srs_vs_quiz_gap: 3
};

/**
 * Calcule un score composite à partir des signaux individuels déclenchés.
 * Retourne `null` si < 2 signaux ou si score composite ≤ 0.7.
 */
export function composeSignals(signals: SignalResult[]): CompositeResult | null {
	if (signals.length < 2) return null;

	const totalWeight = signals.reduce((sum, s) => sum + SIGNAL_WEIGHTS[s.flag_type], 0);
	const weightedScore = signals.reduce((sum, s) => sum + s.score * SIGNAL_WEIGHTS[s.flag_type], 0);
	const composite = Math.min(1, weightedScore / totalWeight);

	if (composite <= 0.7) return null;

	// Sample size composite = max des sample_size individuels (info synthétique).
	const sampleSize = Math.max(...signals.map((s) => s.sample_size));

	return {
		flag_type: 'composite',
		severity: 5,
		score: composite,
		sample_size: sampleSize,
		details: {
			signals
		}
	};
}
