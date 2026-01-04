/**
 * GET/POST /api/cron/daily-summaries-and-rewards
 *
 * Daily cron job that generates daily summaries for all classes:
 * For each class that had a lesson yesterday, generates a daily summary
 * for each student showing their activity (gidouilles, bonuses, warnings, VIP cards)
 *
 * NOTE: Weekly Rewards moved to pg_cron (run_weekly_rewards)
 *
 * Scheduled to run daily at 1:00 AM UTC via Vercel cron.
 * Vercel cron jobs use GET requests, but POST is also supported for manual triggers.
 *
 * @returns JSON with success status and detailed results
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { verifyCronAuth } from '$lib/server/auth/cron';
import {
	getYesterdayInTimezone,
	checkClassSchedule,
	generateDailySummary
} from '$lib/server/summaries';

interface ClassData {
	id: string;
	name: string;
	teacher_id: string;
	school_id: string;
	created_at: string;
	updated_at: string;
	schools: {
		timezone: string;
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
	// NOTE: weeklyRewards moved to pg_cron (run_weekly_rewards)
	// NOTE: minesweeperReferenceTimes moved to pg_cron (run_recalculate_minesweeper_ref_times)
	// NOTE: weeklyBestBonuses moved to pg_cron (run_weekly_best_bonuses)
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
		}
		// NOTE: weeklyRewards, minesweeperReferenceTimes, weeklyBestBonuses moved to pg_cron
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

		console.log('[Cron] Starting daily summaries processing');

		// ============================================================
		// STEP 1: Fetch all active classes with school information
		// ============================================================
		const { data: classes, error: classesError } = await serviceClient
			.from('classes')
			.select('id, name, teacher_id, school_id, created_at, updated_at, schools(timezone)')
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
				// Extract timezone from school
				const timezone = classData.schools?.timezone || 'Europe/Paris';

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

				// NOTE: Weekly rewards moved to pg_cron (run_weekly_rewards)
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Unknown error';
				const errorLog = `Class ${classData.id} (${classData.name}): ${errorMsg}`;

				console.error(`[Cron] Error processing class ${classData.id}:`, err);

				results.dailySummaries.errors.push(errorLog);
				results.success = false;

				// Continue processing other classes
			}
		}

		// NOTE: Weekly Rewards moved to pg_cron (run_weekly_rewards)
		// NOTE: Weekly Best Game Bonuses moved to pg_cron (run_weekly_best_bonuses)
		// NOTE: Minesweeper Reference Times moved to pg_cron (run_recalculate_minesweeper_ref_times)

		// ============================================================
		// STEP 3: Determine overall status
		// ============================================================
		results.dailySummaries.success = results.dailySummaries.errors.length === 0;
		results.success = results.dailySummaries.success;

		const status = results.success ? 'success' : 'partial_failure';
		const metadata = {
			classes_processed: results.classesProcessed,
			daily_summaries_generated: results.dailySummaries.count,
			daily_summaries_classes: results.dailySummaries.classesProcessed,
			daily_summaries_errors: results.dailySummaries.errors.length
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
			errors: results.dailySummaries.errors.length
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
				}
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
					daily_summaries_generated: results.dailySummaries.count
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
				}
			},
			{ status: 500 }
		);
	}
};

// Export for both GET (Vercel cron) and POST (manual triggers)
export const GET = cronHandler;
export const POST = cronHandler;
