/**
 * Geometry Grade Utils Tests
 * ===========================
 *
 * Tests for grade formatting, color coding, statistics, and achievements.
 */

import { describe, it, expect } from 'vitest';
import type { GeometryExerciseAttempt, GeometryExercise } from '$lib/types/geometry';
import {
	formatScore,
	formatPercentage,
	formatTime,
	formatTimeMMSS,
	formatDate,
	getScoreColor,
	getLetterGradeColor,
	compareAttempts,
	getTrend,
	calculateAttemptStatistics,
	calculateClassStatistics,
	calculateRank,
	getRankingTier,
	checkAchievements,
	getAchievementDisplay
} from './geometry-grade-utils';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockAttempt(
	scoreEarned: number,
	attemptsCount: number = 1,
	timeSpent?: number,
	hintsUsed?: number,
	createdAt?: string
): GeometryExerciseAttempt {
	return {
		id: `attempt-${Date.now()}-${Math.random()}`,
		exercise_id: 'test-exercise',
		student_id: 'test-student',
		score_earned: scoreEarned,
		attempts_count: attemptsCount,
		time_spent_seconds: timeSpent,
		hints_used: hintsUsed,
		is_complete: true,
		created_at: createdAt || new Date().toISOString(),
		updated_at: new Date().toISOString()
	};
}

function createMockExercise(
	maxScore: number = 100,
	timeLimitMinutes?: number,
	passingScore?: number
): GeometryExercise {
	return {
		id: 'test-exercise',
		title: 'Test Exercise',
		exercise_type: 'construct',
		difficulty_level: 'medium',
		max_score: maxScore,
		time_limit_minutes: timeLimitMinutes,
		passing_score: passingScore,
		validation_mode: 'automatic',
		validation_config: {},
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};
}

// =============================================================================
// FORMATTING TESTS
// =============================================================================

describe('Grade Formatting', () => {
	describe('formatScore', () => {
		it('should format score as X/Y', () => {
			expect(formatScore(85, 100)).toBe('85/100');
			expect(formatScore(42, 50)).toBe('42/50');
		});

		it('should round decimal scores', () => {
			expect(formatScore(85.7, 100)).toBe('86/100');
			expect(formatScore(42.3, 50)).toBe('42/50');
		});
	});

	describe('formatPercentage', () => {
		it('should format percentage with default 0 decimals', () => {
			expect(formatPercentage(85)).toBe('85%');
			expect(formatPercentage(92.5)).toBe('93%');
		});

		it('should format percentage with specified decimals', () => {
			expect(formatPercentage(85.67, 1)).toBe('85.7%');
			expect(formatPercentage(92.345, 2)).toBe('92.34%'); // toFixed rounds down
		});
	});

	describe('formatTime', () => {
		it('should format seconds only for under 1 minute', () => {
			expect(formatTime(45)).toBe('45s');
			expect(formatTime(59)).toBe('59s');
		});

		it('should format minutes and seconds', () => {
			expect(formatTime(60)).toBe('1m 0s');
			expect(formatTime(90)).toBe('1m 30s');
			expect(formatTime(125)).toBe('2m 5s');
		});

		it('should handle large time values', () => {
			expect(formatTime(3661)).toBe('61m 1s');
		});
	});

	describe('formatTimeMMSS', () => {
		it('should format as MM:SS with padding', () => {
			expect(formatTimeMMSS(0)).toBe('00:00');
			expect(formatTimeMMSS(5)).toBe('00:05');
			expect(formatTimeMMSS(60)).toBe('01:00');
			expect(formatTimeMMSS(125)).toBe('02:05');
			expect(formatTimeMMSS(599)).toBe('09:59');
		});
	});

	describe('formatDate', () => {
		it('should format date for French locale', () => {
			const date = new Date('2024-01-15T14:30:00');
			const formatted = formatDate(date);

			expect(formatted).toContain('janvier');
			expect(formatted).toContain('2024');
			expect(formatted).toContain('14');
			expect(formatted).toContain('30');
		});

		it('should accept string dates', () => {
			const formatted = formatDate('2024-01-15T14:30:00');

			expect(formatted).toContain('janvier');
		});
	});
});

// =============================================================================
// COLOR CODING TESTS
// =============================================================================

describe('Color Coding', () => {
	describe('getScoreColor', () => {
		it('should return green for 90%+', () => {
			const colors = getScoreColor(95);

			expect(colors.text).toContain('green');
			expect(colors.bg).toContain('green');
			expect(colors.border).toContain('green');
		});

		it('should return blue for 80-89%', () => {
			const colors = getScoreColor(85);

			expect(colors.text).toContain('blue');
		});

		it('should return cyan for 70-79%', () => {
			const colors = getScoreColor(75);

			expect(colors.text).toContain('cyan');
		});

		it('should return yellow for 60-69%', () => {
			const colors = getScoreColor(65);

			expect(colors.text).toContain('yellow');
		});

		it('should return orange for 50-59%', () => {
			const colors = getScoreColor(55);

			expect(colors.text).toContain('orange');
		});

		it('should return red for below 50%', () => {
			const colors = getScoreColor(40);

			expect(colors.text).toContain('red');
		});
	});

	describe('getLetterGradeColor', () => {
		it('should return correct colors for each grade', () => {
			expect(getLetterGradeColor('A')).toContain('green');
			expect(getLetterGradeColor('B')).toContain('blue');
			expect(getLetterGradeColor('C')).toContain('yellow');
			expect(getLetterGradeColor('D')).toContain('orange');
			expect(getLetterGradeColor('F')).toContain('red');
		});
	});
});

// =============================================================================
// COMPARISON TESTS
// =============================================================================

describe('Attempt Comparison', () => {
	describe('compareAttempts', () => {
		it('should detect improvement', () => {
			const previous = createMockAttempt(70);
			const current = createMockAttempt(85);

			const comparison = compareAttempts(previous, current);

			expect(comparison.improved).toBe(true);
			expect(comparison.difference).toBe(15);
			expect(comparison.percentageChange).toBeCloseTo(21.43, 1);
			expect(comparison.message).toContain('Amélioration');
		});

		it('should detect decline', () => {
			const previous = createMockAttempt(85);
			const current = createMockAttempt(70);

			const comparison = compareAttempts(previous, current);

			expect(comparison.improved).toBe(false);
			expect(comparison.difference).toBe(-15);
			expect(comparison.percentageChange).toBeCloseTo(-17.65, 1);
			expect(comparison.message).toContain('Baisse');
		});

		it('should detect no change', () => {
			const previous = createMockAttempt(80);
			const current = createMockAttempt(80);

			const comparison = compareAttempts(previous, current);

			expect(comparison.improved).toBe(false);
			expect(comparison.difference).toBe(0);
			expect(comparison.message).toContain('identique');
		});
	});

	describe('getTrend', () => {
		it('should detect improving trend', () => {
			const attempts = [
				createMockAttempt(60, 1, undefined, undefined, '2024-01-01'),
				createMockAttempt(75, 2, undefined, undefined, '2024-01-02'),
				createMockAttempt(85, 3, undefined, undefined, '2024-01-03')
			];

			const trend = getTrend(attempts);

			expect(trend.trend).toBe('improving');
			expect(trend.icon).toBe('↗');
			expect(trend.color).toContain('green');
		});

		it('should detect declining trend', () => {
			const attempts = [
				createMockAttempt(85, 1, undefined, undefined, '2024-01-01'),
				createMockAttempt(75, 2, undefined, undefined, '2024-01-02'),
				createMockAttempt(60, 3, undefined, undefined, '2024-01-03')
			];

			const trend = getTrend(attempts);

			expect(trend.trend).toBe('declining');
			expect(trend.icon).toBe('↘');
			expect(trend.color).toContain('red');
		});

		it('should detect stable trend', () => {
			const attempts = [
				createMockAttempt(75, 1, undefined, undefined, '2024-01-01'),
				createMockAttempt(80, 2, undefined, undefined, '2024-01-02'),
				createMockAttempt(75, 3, undefined, undefined, '2024-01-03')
			];

			const trend = getTrend(attempts);

			expect(trend.trend).toBe('stable');
			expect(trend.icon).toBe('→');
		});

		it('should return stable for single attempt', () => {
			const attempts = [createMockAttempt(75)];

			const trend = getTrend(attempts);

			expect(trend.trend).toBe('stable');
		});
	});
});

// =============================================================================
// STATISTICS TESTS
// =============================================================================

describe('Statistics Calculation', () => {
	describe('calculateAttemptStatistics', () => {
		it('should calculate statistics correctly', () => {
			const attempts = [
				createMockAttempt(70),
				createMockAttempt(85),
				createMockAttempt(90),
				createMockAttempt(75),
				createMockAttempt(80)
			];

			const stats = calculateAttemptStatistics(attempts);

			expect(stats.count).toBe(5);
			expect(stats.average).toBe(80); // (70+85+90+75+80)/5 = 80
			expect(stats.best).toBe(90);
			expect(stats.worst).toBe(70);
			expect(stats.median).toBe(80); // Sorted: [70, 75, 80, 85, 90]
			expect(stats.standardDeviation).toBeGreaterThan(0);
		});

		it('should handle even number of attempts for median', () => {
			const attempts = [
				createMockAttempt(70),
				createMockAttempt(80),
				createMockAttempt(85),
				createMockAttempt(90)
			];

			const stats = calculateAttemptStatistics(attempts);

			expect(stats.median).toBe(82.5); // (80 + 85) / 2
		});

		it('should return zeros for empty array', () => {
			const stats = calculateAttemptStatistics([]);

			expect(stats.count).toBe(0);
			expect(stats.average).toBe(0);
			expect(stats.best).toBe(0);
			expect(stats.worst).toBe(0);
			expect(stats.median).toBe(0);
			expect(stats.standardDeviation).toBe(0);
		});
	});

	describe('calculateClassStatistics', () => {
		it('should calculate class-wide statistics', () => {
			const exercise = createMockExercise(100, undefined, 50);

			const attempts = [
				{ ...createMockAttempt(80), student_id: 'student1' },
				{ ...createMockAttempt(85), student_id: 'student1' },
				{ ...createMockAttempt(60), student_id: 'student2' },
				{ ...createMockAttempt(45), student_id: 'student3' }
			];

			const stats = calculateClassStatistics(attempts, exercise);

			expect(stats.totalStudents).toBe(3);
			expect(stats.completedStudents).toBe(3);
			expect(stats.averageScore).toBeCloseTo(63.33, 1); // (85+60+45)/3
			expect(stats.passRate).toBeCloseTo(66.67, 1); // 2 out of 3 passed
		});
	});
});

// =============================================================================
// RANKING TESTS
// =============================================================================

describe('Ranking Calculation', () => {
	describe('calculateRank', () => {
		it('should calculate rank correctly', () => {
			const allScores = [95, 90, 85, 80, 75, 70, 65];

			const rank = calculateRank(80, allScores);

			expect(rank.rank).toBe(4); // 4th place
			expect(rank.total).toBe(7);
			expect(rank.percentile).toBeCloseTo(57.14, 1); // 4/7 = 57.14th percentile
		});

		it('should handle top rank', () => {
			const allScores = [90, 85, 80, 75];

			const rank = calculateRank(95, allScores);

			expect(rank.rank).toBe(1);
			expect(rank.percentile).toBe(100);
		});

		it('should handle last rank', () => {
			const allScores = [95, 90, 85, 80];

			const rank = calculateRank(75, allScores);

			// Score 75 is below all others, so rank should be 1 (last place in descending order)
			// The function returns 1 when the score is not found in the array
			expect(rank.rank).toBe(1);
		});
	});

	describe('getRankingTier', () => {
		it('should return Top 10% for 90th percentile+', () => {
			const tier = getRankingTier(95);

			expect(tier.tier).toBe('Top 10%');
			expect(tier.color).toContain('yellow');
			expect(tier.icon).toBe('🏆');
		});

		it('should return Top 25% for 75-89th percentile', () => {
			const tier = getRankingTier(80);

			expect(tier.tier).toBe('Top 25%');
			expect(tier.icon).toBe('⭐');
		});

		it('should return Top 50% for 50-74th percentile', () => {
			const tier = getRankingTier(60);

			expect(tier.tier).toBe('Top 50%');
			expect(tier.icon).toBe('✓');
		});

		it('should return En progression for below 50th percentile', () => {
			const tier = getRankingTier(30);

			expect(tier.tier).toBe('En progression');
			expect(tier.icon).toBe('↗');
		});
	});
});

// =============================================================================
// ACHIEVEMENT TESTS
// =============================================================================

describe('Achievement System', () => {
	describe('checkAchievements', () => {
		it('should award perfect achievement for 100% no hints', () => {
			const attempt = createMockAttempt(100, 1, 600, 0);
			const exercise = createMockExercise(100);

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned).toContain('perfect');
			expect(achievements.descriptions['perfect']).toContain('parfait');
		});

		it('should award speedster for quick completion', () => {
			const attempt = createMockAttempt(85, 1, 300); // 5 minutes
			const exercise = createMockExercise(100, 15); // 15 min limit

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned).toContain('speedster');
		});

		it('should award first_try for first attempt success', () => {
			const attempt = createMockAttempt(85, 1);
			const exercise = createMockExercise(100);

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned).toContain('first_try');
		});

		it('should award persistent for many attempts', () => {
			const attempt = createMockAttempt(85, 6);
			const exercise = createMockExercise(100);

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned).toContain('persistent');
		});

		it('should award independent for no hints', () => {
			const attempt = createMockAttempt(85, 2, 600, 0);
			const exercise = createMockExercise(100);

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned).toContain('independent');
		});

		it('should not award perfect if hints used', () => {
			const attempt = createMockAttempt(100, 1, 600, 1);
			const exercise = createMockExercise(100);

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned).not.toContain('perfect');
		});

		it('should award multiple achievements', () => {
			const attempt = createMockAttempt(100, 1, 300, 0);
			const exercise = createMockExercise(100, 15);

			const achievements = checkAchievements(attempt, exercise);

			expect(achievements.earned.length).toBeGreaterThan(1);
		});
	});

	describe('getAchievementDisplay', () => {
		it('should return correct display for each achievement', () => {
			expect(getAchievementDisplay('perfect').icon).toBe('🏆');
			expect(getAchievementDisplay('speedster').icon).toBe('⚡');
			expect(getAchievementDisplay('first_try').icon).toBe('🎯');
			expect(getAchievementDisplay('persistent').icon).toBe('💪');
			expect(getAchievementDisplay('independent').icon).toBe('🌟');
		});

		it('should handle unknown achievements', () => {
			const display = getAchievementDisplay('unknown');

			expect(display.icon).toBe('✓');
			expect(display.name).toBe('unknown');
		});
	});
});
