/**
 * GET/POST /api/cron/daily-summaries-and-rewards
 *
 * Daily cron job that processes summaries and rewards for all classes:
 * 1. Daily Summaries: For each class that had a lesson yesterday, generates a daily summary
 *    for each student showing their activity (gidouilles, bonuses, warnings, VIP cards)
 * 2. Weekly Rewards: On the last day of the week (based on school's week_config), awards
 *    1 gidouille to each student who had zero warnings during the previous week
 *
 * Scheduled to run daily at 1:00 AM UTC via Vercel cron.
 * Vercel cron jobs use GET requests, but POST is also supported for manual triggers.
 *
 * @returns JSON with success status and detailed results for each operation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { verifyCronAuth } from '$lib/server/auth/cron';
import {
	getYesterdayInTimezone,
	getCurrentDayOfWeekInTimezone,
	checkClassSchedule,
	generateDailySummary,
	isWeeklyRewardsDay,
	generateWeeklyRewards
} from '$lib/server/summaries';
import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';
import type { WeekConfig } from '$lib/server/summaries/database-types';

interface ClassData {
	id: string;
	name: string;
	teacher_id: string;
	school_id: string;
	created_at: string;
	updated_at: string;
	schools: {
		timezone: string;
		timetable: {
			week_config?: WeekConfig;
		} | null;
	} | null;
}

interface ProcessingResults {
	success: boolean;
	classesProcessed: number;
	dailySummaries: {
		success: boolean;
		count: number;
		classesProcessed: number;
		errors: string[];
	};
	weeklyRewards: {
		success: boolean;
		count: number;
		classesProcessed: number;
		errors: string[];
	};
	weeklyBestBonuses: {
		success: boolean;
		count: number;
		errors: string[];
	};
	// NOTE: minesweeperReferenceTimes moved to pg_cron job (run_recalculate_minesweeper_ref_times)
}

/**
 * Shared handler for both GET and POST requests
 * Authenticates request before executing summary/reward generation logic
 */
const cronHandler: RequestHandler = async ({ request }) => {
	// SECURITY: Verify CRON authentication BEFORE any processing
	// Throws 401 error if token is invalid or missing
	verifyCronAuth(request);

	// Create service role client for system operations (bypasses RLS)
	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	const results: ProcessingResults = {
		success: true,
		classesProcessed: 0,
		dailySummaries: {
			success: true,
			count: 0,
			classesProcessed: 0,
			errors: []
		},
		weeklyRewards: {
			success: true,
			count: 0,
			classesProcessed: 0,
			errors: []
		},
		weeklyBestBonuses: {
			success: true,
			count: 0,
			errors: []
		}
		// NOTE: minesweeperReferenceTimes moved to pg_cron job
	};

	try {
		// Start job run tracking
		const { data: startData, error: startError } = await serviceClient.rpc('start_job_run', {
			p_job_name: 'daily_summaries_and_rewards',
			p_metadata: {}
		});

		if (startError) {
			console.error('[Cron] Failed to start job run:', startError);
			// Continue anyway - processing should still happen even if tracking fails
		} else {
			runId = startData;
		}

		console.log('[Cron] Starting daily summaries and weekly rewards processing');

		// ============================================================
		// STEP 1: Fetch all active classes with school information
		// ============================================================
		const { data: classes, error: classesError } = await serviceClient
			.from('classes')
			.select(
				'id, name, teacher_id, school_id, created_at, updated_at, schools(timezone, timetable)'
			)
			.eq('is_active', true);

		if (classesError) {
			throw new Error(`Failed to fetch classes: ${classesError.message}`);
		}

		if (!classes || classes.length === 0) {
			console.log('[Cron] No active classes found');
			return json({
				timestamp: new Date().toISOString(),
				message: 'No active classes to process',
				...results
			});
		}

		console.log(`[Cron] Processing ${classes.length} active classes`);
		results.classesProcessed = classes.length;

		// ============================================================
		// STEP 2: Process each class
		// ============================================================
		for (const classData of classes as ClassData[]) {
			try {
				// Extract timezone and week_config from school
				const timezone = classData.schools?.timezone || 'Europe/Paris';
				const weekConfig = classData.schools?.timetable?.week_config || DEFAULT_WEEK_CONFIG;

				console.log(
					`[Cron] Processing class ${classData.name} (${classData.id}) in timezone ${timezone}`
				);

				// Get yesterday in school's timezone
				const yesterday = getYesterdayInTimezone(timezone);

				// Check if there was a class scheduled yesterday
				const hadClass = await checkClassSchedule(serviceClient, classData.id, yesterday);

				if (hadClass) {
					console.log(
						`[Cron] Class ${classData.name} had lessons yesterday, generating daily summaries`
					);

					// Generate daily summary for all students in this class
					const summariesCount = await generateDailySummary(
						serviceClient,
						classData,
						yesterday,
						timezone
					);

					results.dailySummaries.count += summariesCount;
					results.dailySummaries.classesProcessed++;

					console.log(
						`[Cron] Generated ${summariesCount} daily summaries for class ${classData.name}`
					);
				} else {
					console.log(
						`[Cron] Class ${classData.name} had no lessons yesterday, skipping daily summary`
					);
				}

				// Check if today is the weekly rewards day (last day of week)
				const currentDayOfWeek = getCurrentDayOfWeekInTimezone(timezone);

				if (isWeeklyRewardsDay(weekConfig, currentDayOfWeek)) {
					console.log(
						`[Cron] Today is weekly rewards day for class ${classData.name}, processing rewards`
					);

					// Generate weekly rewards for students with no warnings
					const rewardsCount = await generateWeeklyRewards(
						serviceClient,
						classData,
						weekConfig,
						timezone
					);

					results.weeklyRewards.count += rewardsCount;
					results.weeklyRewards.classesProcessed++;

					console.log(`[Cron] Awarded ${rewardsCount} weekly rewards for class ${classData.name}`);
				}
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Unknown error';
				const errorLog = `Class ${classData.id} (${classData.name}): ${errorMsg}`;

				console.error(`[Cron] Error processing class ${classData.id}:`, err);

				// Track errors for both operations (we don't know which one failed)
				results.dailySummaries.errors.push(errorLog);
				results.weeklyRewards.errors.push(errorLog);
				results.success = false;

				// Continue processing other classes
			}
		}

		// ============================================================
		// STEP 3: Award Weekly Best Game Bonuses (on weekly rewards day)
		// ============================================================
		// This awards the best theoretical game reward of the previous week
		// to each student who played at least one game
		{
			// Get unique school week configs to process
			const schoolsProcessed = new Set<string>();

			for (const classData of classes as ClassData[]) {
				const schoolId = classData.school_id;
				if (schoolsProcessed.has(schoolId)) continue;
				schoolsProcessed.add(schoolId);

				try {
					const timezone = classData.schools?.timezone || 'Europe/Paris';
					const weekConfig = classData.schools?.timetable?.week_config || DEFAULT_WEEK_CONFIG;
					const currentDayOfWeek = getCurrentDayOfWeekInTimezone(timezone);

					if (isWeeklyRewardsDay(weekConfig, currentDayOfWeek)) {
						// Import helper to calculate previous week range
						const { getWeekRangeInTimezone } = await import('$lib/server/summaries/timezone-utils');
						const { format } = await import('date-fns');

						const { start: weekStart, end: weekEnd } = getWeekRangeInTimezone(timezone, weekConfig);

						console.log(
							`[Cron] Awarding weekly best bonuses for week ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`
						);

						// Type assertion: award_weekly_best_bonuses is defined in migration 20260101200000
						// Types will be regenerated after migration is applied
						const { data: bonusCount, error: bonusError } = await (
							serviceClient.rpc as unknown as (
								fn: 'award_weekly_best_bonuses',
								params: { p_week_start: string; p_week_end: string }
							) => Promise<{ data: number | null; error: { message: string } | null }>
						)('award_weekly_best_bonuses', {
							p_week_start: format(weekStart, 'yyyy-MM-dd'),
							p_week_end: format(weekEnd, 'yyyy-MM-dd')
						});

						if (bonusError) {
							throw new Error(`RPC error: ${bonusError.message}`);
						}

						results.weeklyBestBonuses.count += bonusCount || 0;
						console.log(`[Cron] Awarded ${bonusCount || 0} weekly best bonuses`);
					}
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : 'Unknown error';
					results.weeklyBestBonuses.errors.push(`School ${schoolId}: ${errorMsg}`);
					console.error(`[Cron] Error awarding weekly best bonuses:`, err);
				}
			}
		}

		// NOTE: Minesweeper Reference Times recalculation moved to pg_cron job
		// (run_recalculate_minesweeper_ref_times, runs Sundays at 01:30 UTC)

		// ============================================================
		// STEP 4: Determine overall status
		// ============================================================
		results.dailySummaries.success = results.dailySummaries.errors.length === 0;
		results.weeklyRewards.success = results.weeklyRewards.errors.length === 0;
		results.weeklyBestBonuses.success = results.weeklyBestBonuses.errors.length === 0;
		results.success =
			results.dailySummaries.success &&
			results.weeklyRewards.success &&
			results.weeklyBestBonuses.success;

		const status = results.success ? 'success' : 'partial_failure';
		const metadata = {
			classes_processed: results.classesProcessed,
			daily_summaries_generated: results.dailySummaries.count,
			daily_summaries_classes: results.dailySummaries.classesProcessed,
			weekly_rewards_awarded: results.weeklyRewards.count,
			weekly_rewards_classes: results.weeklyRewards.classesProcessed,
			weekly_best_bonuses_awarded: results.weeklyBestBonuses.count,
			daily_summaries_errors: results.dailySummaries.errors.length,
			weekly_rewards_errors: results.weeklyRewards.errors.length,
			weekly_best_bonuses_errors: results.weeklyBestBonuses.errors.length
		};

		// Complete job run with results
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: status,
				p_metadata: metadata
			});
		}

		console.log('[Cron] Processing complete:', {
			classes: results.classesProcessed,
			dailySummaries: results.dailySummaries.count,
			weeklyRewards: results.weeklyRewards.count,
			errors: results.dailySummaries.errors.length + results.weeklyRewards.errors.length
		});

		// Return results (200 OK even with partial errors)
		return json(
			{
				success: results.success,
				timestamp: new Date().toISOString(),
				classesProcessed: results.classesProcessed,
				dailySummaries: {
					generated: results.dailySummaries.count,
					classesProcessed: results.dailySummaries.classesProcessed,
					errors:
						results.dailySummaries.errors.length > 0 ? results.dailySummaries.errors : undefined
				},
				weeklyRewards: {
					awarded: results.weeklyRewards.count,
					classesProcessed: results.weeklyRewards.classesProcessed,
					errors: results.weeklyRewards.errors.length > 0 ? results.weeklyRewards.errors : undefined
				},
				weeklyBestBonuses: {
					awarded: results.weeklyBestBonuses.count,
					errors:
						results.weeklyBestBonuses.errors.length > 0
							? results.weeklyBestBonuses.errors
							: undefined
				}
				// NOTE: minesweeperReferenceTimes moved to pg_cron (run_recalculate_minesweeper_ref_times)
			},
			{
				status: results.success ? 200 : 207 // 207 Multi-Status for partial success
			}
		);
	} catch (err) {
		// Complete job run (failed)
		const errorMsg = err instanceof Error ? err.message : 'Unknown error';

		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: errorMsg,
				p_metadata: {
					classes_processed: results.classesProcessed,
					daily_summaries_generated: results.dailySummaries.count,
					weekly_rewards_awarded: results.weeklyRewards.count
				}
			});
		}

		console.error('[Cron] Critical failure:', err);

		return json(
			{
				success: false,
				error: errorMsg,
				timestamp: new Date().toISOString(),
				classesProcessed: results.classesProcessed,
				dailySummaries: {
					generated: results.dailySummaries.count,
					classesProcessed: results.dailySummaries.classesProcessed
				},
				weeklyRewards: {
					awarded: results.weeklyRewards.count,
					classesProcessed: results.weeklyRewards.classesProcessed
				},
				weeklyBestBonuses: {
					awarded: results.weeklyBestBonuses.count
				}
			},
			{ status: 500 }
		);
	}
};

// Export for both GET (Vercel cron) and POST (manual triggers)
export const GET = cronHandler;
export const POST = cronHandler;
