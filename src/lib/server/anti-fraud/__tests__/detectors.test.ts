/**
 * Tests TDD des détecteurs anti-fraud (Phase 2).
 *
 * Source : `docs/wip/srs-anti-fraud-spec-tdd.md` §B1..B6 (cas limites inclus).
 *
 * Fonctions PURES → tests unitaires sans mock DB.
 */

import { describe, expect, it } from 'vitest';
import {
	composeSignals,
	detectBurst,
	detectFastTimeSpent,
	detectHighEasyRatio,
	detectNoAgain,
	detectSrsVsQuizGap
} from '../detectors';
import type { AttemptEntry, ReviewEntry } from '../types';

// ----------------------------------------------------------------------------
// Helpers de fabrication
// ----------------------------------------------------------------------------

function makeReview(
	idx: number,
	grade: 1 | 2 | 3 | 4,
	overrides: Partial<ReviewEntry> = {}
): ReviewEntry {
	return {
		date: new Date(Date.UTC(2026, 5, 1, 12, 0, idx)).toISOString(),
		grade,
		elapsedDays: 1,
		retrievability: 0.9,
		...overrides
	};
}

function makeAttempt(idx: number, success: boolean, source: 'srs' | 'auto' = 'srs'): AttemptEntry {
	return {
		created_at: new Date(Date.UTC(2026, 5, 1, 12, 0, idx)).toISOString(),
		success,
		grade: success ? 4 : 1,
		source
	};
}

// ============================================================================
// B1 — high_easy_ratio
// ============================================================================

describe('detectHighEasyRatio', () => {
	it('null si moins de 20 reviews', () => {
		const reviews = Array.from({ length: 19 }, (_, i) => makeReview(i, 4));
		expect(detectHighEasyRatio(reviews)).toBeNull();
	});

	it('flag si ratio > 90% sur 20 reviews', () => {
		// 19 Easy / 20 = 95%
		const reviews = [...Array.from({ length: 19 }, (_, i) => makeReview(i, 4)), makeReview(19, 3)];
		const r = detectHighEasyRatio(reviews);
		expect(r).not.toBeNull();
		expect(r?.flag_type).toBe('high_easy_ratio');
		expect(r?.severity).toBe(2);
		expect((r?.details.ratio as number) > 0.9).toBe(true);
		expect(r?.details.easy_count).toBe(19);
		expect(r?.details.total).toBe(20);
	});

	it('seuil strict : ratio = 0.90 exact → PAS de flag', () => {
		// 18 Easy / 20 = 90% exact
		const reviews = [
			...Array.from({ length: 18 }, (_, i) => makeReview(i, 4)),
			makeReview(18, 3),
			makeReview(19, 3)
		];
		expect(detectHighEasyRatio(reviews)).toBeNull();
	});

	it('null si aucune Easy', () => {
		const reviews = Array.from({ length: 20 }, (_, i) => makeReview(i, 3));
		expect(detectHighEasyRatio(reviews)).toBeNull();
	});

	it('exactement à la frontière (19/20 = 95%) → flag', () => {
		const reviews = [...Array.from({ length: 19 }, (_, i) => makeReview(i, 4)), makeReview(19, 2)];
		expect(detectHighEasyRatio(reviews)).not.toBeNull();
	});
});

// ============================================================================
// B2 — no_again
// ============================================================================

describe('detectNoAgain', () => {
	it('null si moins de 30 reviews', () => {
		const reviews = Array.from({ length: 29 }, (_, i) => makeReview(i, 3));
		expect(detectNoAgain(reviews)).toBeNull();
	});

	it('flag si aucune Again sur 30 reviews', () => {
		const reviews = Array.from({ length: 30 }, (_, i) => makeReview(i, 3));
		const r = detectNoAgain(reviews);
		expect(r?.flag_type).toBe('no_again');
		expect(r?.details.streak_length).toBe(30);
		expect(r?.details.last_again_date).toBeNull();
	});

	it('flag basé sur séquence POST-dernière-Again si ≥ 30', () => {
		// 50 reviews dont 1 Again en position 5 → streak post = 45
		const reviews = Array.from({ length: 50 }, (_, i) =>
			i === 5 ? makeReview(i, 1) : makeReview(i, 3)
		);
		const r = detectNoAgain(reviews);
		expect(r?.details.streak_length).toBe(44);
		expect(r?.details.last_again_date).toBe(reviews[5].date);
	});

	it('null si Again récente coupant la séquence', () => {
		// 35 reviews dont 1 Again en position 25 → streak post = 9 < 30
		const reviews = Array.from({ length: 35 }, (_, i) =>
			i === 25 ? makeReview(i, 1) : makeReview(i, 3)
		);
		expect(detectNoAgain(reviews)).toBeNull();
	});

	it('null si plein de Again réparties', () => {
		const reviews = Array.from({ length: 40 }, (_, i) =>
			i % 3 === 0 ? makeReview(i, 1) : makeReview(i, 3)
		);
		expect(detectNoAgain(reviews)).toBeNull();
	});
});

// ============================================================================
// B3 — fast_timeSpent
// ============================================================================

describe('detectFastTimeSpent', () => {
	it('null si moins de 10 reviews avec timeSpent', () => {
		const reviews = Array.from({ length: 9 }, (_, i) => makeReview(i, 3, { timeSpent: 1 }));
		expect(detectFastTimeSpent(reviews)).toBeNull();
	});

	it('flag si médiane < 2s sur 10 reviews', () => {
		const reviews = Array.from({ length: 10 }, (_, i) => makeReview(i, 3, { timeSpent: 1.5 }));
		const r = detectFastTimeSpent(reviews);
		expect(r?.flag_type).toBe('fast_timeSpent');
		expect(r?.details.median_seconds).toBe(1.5);
	});

	it('seuil strict : médiane = 2.0 exact → PAS de flag', () => {
		const reviews = Array.from({ length: 10 }, (_, i) => makeReview(i, 3, { timeSpent: 2 }));
		expect(detectFastTimeSpent(reviews)).toBeNull();
	});

	it('ignore reviews sans timeSpent', () => {
		// 15 reviews, 5 sans timeSpent → 10 avec timeSpent=1 → flag
		const reviews = Array.from({ length: 15 }, (_, i) =>
			i < 5 ? makeReview(i, 3) : makeReview(i, 3, { timeSpent: 1 })
		);
		const r = detectFastTimeSpent(reviews);
		expect(r?.sample_size).toBe(10);
	});

	it('médiane sur nombre pair = moyenne des 2 centraux', () => {
		const reviews = Array.from({ length: 10 }, (_, i) =>
			makeReview(i, 3, { timeSpent: i < 5 ? 1 : 3 })
		);
		// Médiane = (1 + 3) / 2 = 2.0 → PAS de flag (seuil strict)
		expect(detectFastTimeSpent(reviews)).toBeNull();
	});
});

// ============================================================================
// B4 — burst
// ============================================================================

describe('detectBurst', () => {
	it('null si moins de 16 reviews', () => {
		const reviews = Array.from({ length: 15 }, (_, i) =>
			makeReview(i, 3, { date: new Date(Date.UTC(2026, 5, 1, 12, 0, i * 2)).toISOString() })
		);
		expect(detectBurst(reviews)).toBeNull();
	});

	it('flag si 20 reviews en 30s', () => {
		const start = Date.UTC(2026, 5, 1, 12, 0, 0);
		const reviews = Array.from({ length: 20 }, (_, i) => ({
			date: new Date(start + i * 1500).toISOString(), // 1.5s entre chaque
			grade: 3 as const,
			elapsedDays: 1,
			retrievability: 0.9
		}));
		const r = detectBurst(reviews);
		expect(r?.flag_type).toBe('burst');
		expect(r?.details.burst_count).toBe(20);
	});

	it('seuil strict : 15 reviews en 60s → PAS de flag', () => {
		const start = Date.UTC(2026, 5, 1, 12, 0, 0);
		const reviews = Array.from({ length: 15 }, (_, i) => ({
			date: new Date(start + i * 3000).toISOString(),
			grade: 3 as const,
			elapsedDays: 1,
			retrievability: 0.9
		}));
		expect(detectBurst(reviews)).toBeNull();
	});

	it('null si reviews dispersées (1/min)', () => {
		const start = Date.UTC(2026, 5, 1, 12, 0, 0);
		const reviews = Array.from({ length: 20 }, (_, i) => ({
			date: new Date(start + i * 70_000).toISOString(), // 70s entre
			grade: 3 as const,
			elapsedDays: 1,
			retrievability: 0.9
		}));
		expect(detectBurst(reviews)).toBeNull();
	});

	it('détecte le max sur fenêtre glissante', () => {
		const start = Date.UTC(2026, 5, 1, 12, 0, 0);
		// 5 reviews puis pause 5min puis burst de 17 reviews en 50s
		const reviews = [
			...Array.from({ length: 5 }, (_, i) => ({
				date: new Date(start + i * 10_000).toISOString(),
				grade: 3 as const,
				elapsedDays: 1,
				retrievability: 0.9
			})),
			...Array.from({ length: 17 }, (_, i) => ({
				date: new Date(start + 5 * 60_000 + i * 2500).toISOString(),
				grade: 3 as const,
				elapsedDays: 1,
				retrievability: 0.9
			}))
		];
		const r = detectBurst(reviews);
		expect(r?.details.burst_count).toBe(17);
	});
});

// ============================================================================
// B5 — srs_vs_quiz_gap
// ============================================================================

describe('detectSrsVsQuizGap', () => {
	it('null si moins de 10 SRS', () => {
		const srs = Array.from({ length: 9 }, (_, i) => makeAttempt(i, true, 'srs'));
		const quiz = Array.from({ length: 10 }, (_, i) => makeAttempt(i, false, 'auto'));
		expect(detectSrsVsQuizGap(srs, quiz)).toBeNull();
	});

	it('null si moins de 10 quiz', () => {
		const srs = Array.from({ length: 10 }, (_, i) => makeAttempt(i, true, 'srs'));
		const quiz = Array.from({ length: 5 }, (_, i) => makeAttempt(i, false, 'auto'));
		expect(detectSrsVsQuizGap(srs, quiz)).toBeNull();
	});

	it('flag si gap > 50 points', () => {
		// SRS 95% (19/20), Quiz 30% (3/10) → gap = 0.65
		const srs = Array.from({ length: 20 }, (_, i) => makeAttempt(i, i < 19, 'srs'));
		const quiz = Array.from({ length: 10 }, (_, i) => makeAttempt(i, i < 3, 'auto'));
		const r = detectSrsVsQuizGap(srs, quiz);
		expect(r?.flag_type).toBe('srs_vs_quiz_gap');
		expect((r?.details.gap_pct as number) > 0.5).toBe(true);
		expect(r?.sample_size).toBe(10);
	});

	it('seuil strict : gap = 0.50 exact → PAS de flag', () => {
		// SRS 80% (8/10), Quiz 30% (3/10) → gap = 0.50 exact
		const srs = Array.from({ length: 10 }, (_, i) => makeAttempt(i, i < 8, 'srs'));
		const quiz = Array.from({ length: 10 }, (_, i) => makeAttempt(i, i < 3, 'auto'));
		expect(detectSrsVsQuizGap(srs, quiz)).toBeNull();
	});

	it('null si gap négatif (quiz mieux que SRS)', () => {
		const srs = Array.from({ length: 10 }, (_, i) => makeAttempt(i, false, 'srs'));
		const quiz = Array.from({ length: 10 }, (_, i) => makeAttempt(i, true, 'auto'));
		expect(detectSrsVsQuizGap(srs, quiz)).toBeNull();
	});
});

// ============================================================================
// B6 — composite
// ============================================================================

describe('composeSignals', () => {
	it('null si moins de 2 signaux', () => {
		const single = detectHighEasyRatio(Array.from({ length: 20 }, (_, i) => makeReview(i, 4)))!;
		expect(composeSignals([single])).toBeNull();
		expect(composeSignals([])).toBeNull();
	});

	it('composite si 2+ signaux et score > 0.7', () => {
		// burst (0.85, w=3) + srs_vs_quiz_gap (0.9, w=3)
		// = (0.85*3 + 0.9*3) / 6 = 5.25 / 6 ≈ 0.875
		const burst = detectBurst(
			Array.from({ length: 20 }, (_, i) => ({
				date: new Date(Date.UTC(2026, 5, 1, 12, 0, 0) + i * 1000).toISOString(),
				grade: 3 as const,
				elapsedDays: 1,
				retrievability: 0.9
			}))
		)!;
		const gap = detectSrsVsQuizGap(
			Array.from({ length: 20 }, (_, i) => makeAttempt(i, i < 19, 'srs')),
			Array.from({ length: 10 }, (_, i) => makeAttempt(i, i < 3, 'auto'))
		)!;
		const r = composeSignals([burst, gap]);
		expect(r?.flag_type).toBe('composite');
		expect(r?.score).toBeGreaterThan(0.7);
		expect((r?.details.signals as unknown[]).length).toBe(2);
	});

	it('null si composite score ≤ 0.7 (signaux faibles)', () => {
		// 2× high_easy_ratio fictif (score 0.5, w=1) → composite = 0.5
		const sig1 = detectHighEasyRatio(
			Array.from({ length: 20 }, (_, i) => makeReview(i, i < 19 ? 4 : 3))
		)!;
		const sig2 = { ...sig1, sample_size: sig1.sample_size + 1 };
		expect(composeSignals([sig1, sig2])).toBeNull();
	});

	it('score plafonné à 1', () => {
		const fake1 = {
			flag_type: 'burst' as const,
			severity: 4 as const,
			score: 1,
			sample_size: 20,
			details: {}
		};
		const fake2 = {
			flag_type: 'srs_vs_quiz_gap' as const,
			severity: 5 as const,
			score: 1,
			sample_size: 20,
			details: {}
		};
		const r = composeSignals([fake1, fake2]);
		expect(r?.score).toBeLessThanOrEqual(1);
	});

	it('sample_size composite = max des sample_size individuels', () => {
		const fake1 = {
			flag_type: 'burst' as const,
			severity: 4 as const,
			score: 0.85,
			sample_size: 25,
			details: {}
		};
		const fake2 = {
			flag_type: 'srs_vs_quiz_gap' as const,
			severity: 5 as const,
			score: 0.9,
			sample_size: 50,
			details: {}
		};
		const r = composeSignals([fake1, fake2]);
		expect(r?.sample_size).toBe(50);
	});
});
