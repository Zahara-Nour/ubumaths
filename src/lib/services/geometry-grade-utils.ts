/**
 * Geometry Grading Utilities
 *
 * Helper functions for grade formatting, display, and statistics calculation.
 * Provides utilities for:
 * - **Formatting** - Scores, percentages, time, dates
 * - **Color coding** - Visual indicators for score ranges
 * - **Statistics** - Averages, trends, achievements
 * - **Display** - Grade badges, progress bars, feedback messages
 *
 * @module geometry-grade-utils
 *
 * @example Format grade for display
 * ```typescript
 * import { formatScore, formatPercentage, getLetterGradeEmoji } from '$lib/services/geometry-grade-utils';
 *
 * const scoreText = formatScore(85, 100);  // "85/100"
 * const percentText = formatPercentage(85, 1);  // "85.0%"
 * const emoji = getLetterGradeEmoji('B');  // "🌟"
 * ```
 *
 * @example Get color coding for score
 * ```typescript
 * import { getScoreColor } from '$lib/services/geometry-grade-utils';
 *
 * const colors = getScoreColor(92);
 * // { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500' }
 * ```
 */

import type { GeometryExerciseAttempt, GeometryExercise } from '$lib/types/geometry';

// ============================================================================
// GRADE FORMATTING
// ============================================================================

/**
 * Format score as "X/Y"
 */
export function formatScore(score: number, maxScore: number): string {
	return `${Math.round(score)}/${maxScore}`;
}

/**
 * Format percentage with symbol
 */
export function formatPercentage(percentage: number, decimals: number = 0): string {
	return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format time in seconds as "Xm Ys"
 */
export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;

	if (mins === 0) {
		return `${secs}s`;
	}

	return `${mins}m ${secs}s`;
}

/**
 * Format time in seconds as "MM:SS"
 */
export function formatTimeMMSS(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date for French locale
 */
export function formatDate(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('fr-FR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

// ============================================================================
// GRADE COLOR CODING
// ============================================================================

/**
 * Get color class for score percentage
 */
export function getScoreColor(percentage: number): {
	text: string;
	bg: string;
	border: string;
} {
	if (percentage >= 90) {
		return {
			text: 'text-green-600 dark:text-green-400',
			bg: 'bg-green-100 dark:bg-green-900',
			border: 'border-green-500'
		};
	} else if (percentage >= 80) {
		return {
			text: 'text-blue-600 dark:text-blue-400',
			bg: 'bg-blue-100 dark:bg-blue-900',
			border: 'border-blue-500'
		};
	} else if (percentage >= 70) {
		return {
			text: 'text-cyan-600 dark:text-cyan-400',
			bg: 'bg-cyan-100 dark:bg-cyan-900',
			border: 'border-cyan-500'
		};
	} else if (percentage >= 60) {
		return {
			text: 'text-yellow-600 dark:text-yellow-400',
			bg: 'bg-yellow-100 dark:bg-yellow-900',
			border: 'border-yellow-500'
		};
	} else if (percentage >= 50) {
		return {
			text: 'text-orange-600 dark:text-orange-400',
			bg: 'bg-orange-100 dark:bg-orange-900',
			border: 'border-orange-500'
		};
	} else {
		return {
			text: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-100 dark:bg-red-900',
			border: 'border-red-500'
		};
	}
}

/**
 * Get letter grade color
 */
export function getLetterGradeColor(grade: string): string {
	switch (grade) {
		case 'A':
			return 'text-green-600 dark:text-green-400';
		case 'B':
			return 'text-blue-600 dark:text-blue-400';
		case 'C':
			return 'text-yellow-600 dark:text-yellow-400';
		case 'D':
			return 'text-orange-600 dark:text-orange-400';
		case 'F':
			return 'text-red-600 dark:text-red-400';
		default:
			return 'text-muted-foreground';
	}
}

// ============================================================================
// GRADE COMPARISON
// ============================================================================

/**
 * Compare two attempts and return improvement info
 */
export function compareAttempts(
	previous: GeometryExerciseAttempt,
	current: GeometryExerciseAttempt
): {
	improved: boolean;
	difference: number;
	percentageChange: number;
	message: string;
} {
	const prevScore = previous.score_earned ?? 0;
	const currScore = current.score_earned ?? 0;
	const difference = currScore - prevScore;
	const percentageChange = prevScore > 0 ? (difference / prevScore) * 100 : 0;

	let message = '';
	if (difference > 0) {
		message = `Amélioration de +${Math.round(difference)} points (+${Math.round(percentageChange)}%)`;
	} else if (difference < 0) {
		message = `Baisse de ${Math.round(Math.abs(difference))} points (${Math.round(percentageChange)}%)`;
	} else {
		message = 'Score identique';
	}

	return {
		improved: difference > 0,
		difference,
		percentageChange,
		message
	};
}

/**
 * Get trend indicator (improving, declining, stable)
 */
export function getTrend(attempts: GeometryExerciseAttempt[]): {
	trend: 'improving' | 'declining' | 'stable';
	icon: string;
	color: string;
} {
	if (attempts.length < 2) {
		return {
			trend: 'stable',
			icon: '→',
			color: 'text-muted-foreground'
		};
	}

	const sorted = [...attempts].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);

	const lastThree = sorted.slice(-3);
	const scores = lastThree.map((a) => a.score_earned ?? 0);

	// Check if improving (each score higher than previous)
	const isImproving = scores.every((score, i) => i === 0 || score >= scores[i - 1]);

	// Check if declining
	const isDeclining = scores.every((score, i) => i === 0 || score <= scores[i - 1]);

	if (isImproving && scores[scores.length - 1] > scores[0]) {
		return {
			trend: 'improving',
			icon: '↗',
			color: 'text-green-600 dark:text-green-400'
		};
	} else if (isDeclining && scores[scores.length - 1] < scores[0]) {
		return {
			trend: 'declining',
			icon: '↘',
			color: 'text-red-600 dark:text-red-400'
		};
	} else {
		return {
			trend: 'stable',
			icon: '→',
			color: 'text-muted-foreground'
		};
	}
}

// ============================================================================
// GRADE STATISTICS
// ============================================================================

/**
 * Calculate statistics from multiple attempts
 */
export function calculateAttemptStatistics(attempts: GeometryExerciseAttempt[]): {
	count: number;
	average: number;
	best: number;
	worst: number;
	median: number;
	standardDeviation: number;
} {
	if (attempts.length === 0) {
		return {
			count: 0,
			average: 0,
			best: 0,
			worst: 0,
			median: 0,
			standardDeviation: 0
		};
	}

	const scores = attempts.map((a) => a.score_earned ?? 0);
	const count = scores.length;

	// Average
	const average = scores.reduce((sum, score) => sum + score, 0) / count;

	// Best and worst
	const best = Math.max(...scores);
	const worst = Math.min(...scores);

	// Median
	const sorted = [...scores].sort((a, b) => a - b);
	const median =
		count % 2 === 0
			? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
			: sorted[Math.floor(count / 2)];

	// Standard deviation
	const squaredDiffs = scores.map((score) => Math.pow(score - average, 2));
	const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / count;
	const standardDeviation = Math.sqrt(variance);

	return {
		count,
		average,
		best,
		worst,
		median,
		standardDeviation
	};
}

/**
 * Calculate class statistics
 */
export function calculateClassStatistics(
	allAttempts: GeometryExerciseAttempt[],
	exercise: GeometryExercise
): {
	totalStudents: number;
	completedStudents: number;
	averageScore: number;
	passRate: number;
	averageAttempts: number;
	averageTime: number;
} {
	if (allAttempts.length === 0) {
		return {
			totalStudents: 0,
			completedStudents: 0,
			averageScore: 0,
			passRate: 0,
			averageAttempts: 0,
			averageTime: 0
		};
	}

	// Group by student
	const byStudent = new Map<string, GeometryExerciseAttempt[]>();
	allAttempts.forEach((attempt) => {
		if (!byStudent.has(attempt.student_id)) {
			byStudent.set(attempt.student_id, []);
		}
		byStudent.get(attempt.student_id)!.push(attempt);
	});

	const totalStudents = byStudent.size;

	// Count completed students (at least one attempt marked complete)
	let completedStudents = 0;
	let totalScore = 0;
	let totalPassed = 0;
	let totalAttempts = 0;
	let totalTime = 0;

	const passingScore = exercise.passing_score ?? (exercise.max_score ?? 100) * 0.5;

	for (const [studentId, attempts] of byStudent) {
		// Get best attempt for this student
		const bestAttempt = attempts.reduce((best, current) => {
			return (current.score_earned ?? 0) > (best.score_earned ?? 0) ? current : best;
		});

		if (bestAttempt.is_complete) {
			completedStudents++;
		}

		totalScore += bestAttempt.score_earned ?? 0;
		totalAttempts += attempts.length;
		totalTime += bestAttempt.time_spent_seconds ?? 0;

		if ((bestAttempt.score_earned ?? 0) >= passingScore) {
			totalPassed++;
		}
	}

	return {
		totalStudents,
		completedStudents,
		averageScore: totalStudents > 0 ? totalScore / totalStudents : 0,
		passRate: totalStudents > 0 ? (totalPassed / totalStudents) * 100 : 0,
		averageAttempts: totalStudents > 0 ? totalAttempts / totalStudents : 0,
		averageTime: totalStudents > 0 ? totalTime / totalStudents : 0
	};
}

// ============================================================================
// GRADE RANKING
// ============================================================================

/**
 * Calculate student rank in class
 */
export function calculateRank(
	studentScore: number,
	allScores: number[]
): {
	rank: number;
	total: number;
	percentile: number;
} {
	if (allScores.length === 0) {
		return { rank: 1, total: 1, percentile: 100 };
	}

	// Sort scores descending
	const sorted = [...allScores].sort((a, b) => b - a);

	// Find rank (1-indexed)
	const rank = sorted.findIndex((score) => score <= studentScore) + 1;

	// Calculate percentile
	const percentile = ((sorted.length - rank + 1) / sorted.length) * 100;

	return {
		rank: rank || 1,
		total: sorted.length,
		percentile
	};
}

/**
 * Get ranking tier
 */
export function getRankingTier(percentile: number): {
	tier: string;
	color: string;
	icon: string;
} {
	if (percentile >= 90) {
		return {
			tier: 'Top 10%',
			color: 'text-yellow-600 dark:text-yellow-400',
			icon: '🏆'
		};
	} else if (percentile >= 75) {
		return {
			tier: 'Top 25%',
			color: 'text-blue-600 dark:text-blue-400',
			icon: '⭐'
		};
	} else if (percentile >= 50) {
		return {
			tier: 'Top 50%',
			color: 'text-green-600 dark:text-green-400',
			icon: '✓'
		};
	} else {
		return {
			tier: 'En progression',
			color: 'text-muted-foreground',
			icon: '↗'
		};
	}
}

// ============================================================================
// GRADE BADGES & ACHIEVEMENTS
// ============================================================================

/**
 * Check for achievements based on performance
 */
export function checkAchievements(attempt: GeometryExerciseAttempt, exercise: GeometryExercise): {
	earned: string[];
	descriptions: Record<string, string>;
} {
	const earned: string[] = [];
	const descriptions: Record<string, string> = {};

	const percentage = ((attempt.score_earned ?? 0) / (exercise.max_score ?? 100)) * 100;

	// Perfect score
	if (percentage === 100 && (attempt.hints_used ?? 0) === 0) {
		earned.push('perfect');
		descriptions['perfect'] = 'Score parfait sans indice!';
	}

	// Quick completion
	const timeLimit = exercise.time_limit_minutes ? exercise.time_limit_minutes * 60 : Infinity;
	if ((attempt.time_spent_seconds ?? Infinity) < timeLimit * 0.5) {
		earned.push('speedster');
		descriptions['speedster'] = 'Complété en moins de la moitié du temps!';
	}

	// First attempt success
	if (attempt.attempts_count === 1 && percentage >= 80) {
		earned.push('first_try');
		descriptions['first_try'] = 'Réussi du premier coup!';
	}

	// Perseverance (many attempts but finally succeeded)
	if (attempt.attempts_count >= 5 && percentage >= 80) {
		earned.push('persistent');
		descriptions['persistent'] = 'Persévérance récompensée!';
	}

	// No hints
	if ((attempt.hints_used ?? 0) === 0 && percentage >= 80) {
		earned.push('independent');
		descriptions['independent'] = 'Résolu sans aide!';
	}

	return {
		earned,
		descriptions
	};
}

/**
 * Get achievement icon and color
 */
export function getAchievementDisplay(achievement: string): {
	icon: string;
	color: string;
	name: string;
} {
	switch (achievement) {
		case 'perfect':
			return {
				icon: '🏆',
				color: 'text-yellow-600 dark:text-yellow-400',
				name: 'Parfait'
			};
		case 'speedster':
			return {
				icon: '⚡',
				color: 'text-blue-600 dark:text-blue-400',
				name: 'Rapide'
			};
		case 'first_try':
			return {
				icon: '🎯',
				color: 'text-green-600 dark:text-green-400',
				name: 'Premier essai'
			};
		case 'persistent':
			return {
				icon: '💪',
				color: 'text-purple-600 dark:text-purple-400',
				name: 'Persévérant'
			};
		case 'independent':
			return {
				icon: '🌟',
				color: 'text-cyan-600 dark:text-cyan-400',
				name: 'Autonome'
			};
		default:
			return {
				icon: '✓',
				color: 'text-muted-foreground',
				name: achievement
			};
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GradeUtils = {
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
};
