/**
 * Helper functions for weekly rewards
 * Awards gidouilles to students with no warnings during the week
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, WeekConfig } from '$lib/types/database';
import { format } from 'date-fns';
import type { ClassWithSchool } from './types';
import { getWeekRangeInTimezone } from './timezone-utils';
import { createWeeklyRewardNotification } from './notifications';
import type {
	UpdateStudentGidouillesParams,
	WeeklyRewardInsert,
	WeeklyRewardRow
} from './database-types';

type DbClient = SupabaseClient<Database>;

/**
 * Check if student has zero warnings in the specified week
 * Only counts warnings where deleted_at IS NULL (active warnings)
 *
 * @param supabase - Supabase client
 * @param studentId - Student UUID
 * @param classId - Class UUID
 * @param weekStart - Start of week (inclusive)
 * @param weekEnd - End of week (inclusive)
 * @returns True if student has no active warnings in this week
 */
export async function checkNoWarningsInWeek(
	supabase: DbClient,
	studentId: string,
	classId: string,
	weekStart: Date,
	weekEnd: Date
): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from('student_warnings')
			.select('id')
			.eq('student_id', studentId)
			.eq('class_id', classId)
			.is('deleted_at', null) // Only count active warnings
			.gte('created_at', weekStart.toISOString())
			.lte('created_at', weekEnd.toISOString())
			.limit(1);

		if (error) {
			console.error('[checkNoWarningsInWeek] Database error:', error);
			throw error;
		}

		// Return true if no warnings found
		return (data?.length ?? 0) === 0;
	} catch (error) {
		console.error('[checkNoWarningsInWeek] Error:', error);
		throw error;
	}
}

/**
 * Process weekly rewards for a class
 * Awards 1 gidouille per student with no warnings in the previous week
 *
 * @param supabase - Supabase client
 * @param classData - Class data with school_id
 * @param weekConfig - Week configuration (first_day, last_day)
 * @param timezone - School's timezone
 * @returns Count of rewards awarded
 */
export async function generateWeeklyRewards(
	supabase: DbClient,
	classData: ClassWithSchool,
	weekConfig: WeekConfig,
	timezone: string
): Promise<number> {
	try {
		let rewardsAwarded = 0;

		// Calculate previous week range in the school's timezone
		const { start: weekStart, end: weekEnd } = getWeekRangeInTimezone(timezone, weekConfig);

		console.log(
			`[generateWeeklyRewards] Processing week ${weekStart.toISOString()} to ${weekEnd.toISOString()} for class ${classData.name}`
		);

		// Get all active students in the class
		const { data: members, error: membersError } = await supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', classData.id)
			.eq('is_test', false) // Skip test students
			.eq('status', 'active'); // Only active members

		if (membersError) {
			console.error('[generateWeeklyRewards] Failed to fetch class members:', membersError);
			throw membersError;
		}

		if (!members || members.length === 0) {
			console.log(`[generateWeeklyRewards] No active students in class ${classData.id}`);
			return 0;
		}

		console.log(
			`[generateWeeklyRewards] Processing ${members.length} students in class ${classData.name}`
		);

		// Process each student
		for (const member of members) {
			try {
				// Check if student has no warnings in the week
				const noWarnings = await checkNoWarningsInWeek(
					supabase,
					member.student_id,
					classData.id,
					weekStart,
					weekEnd
				);

				if (!noWarnings) {
					console.log(
						`[generateWeeklyRewards] Student ${member.student_id} had warnings, skipping reward`
					);
					continue;
				}

				// Award 1 gidouille using the RPC function
				// CRITICAL: Phase 1 migrations changed signature - p_class_id is now REQUIRED
				const rpcParams: UpdateStudentGidouillesParams = {
					p_student_id: member.student_id,
					p_class_id: classData.id, // NOW REQUIRED (was optional before Phase 1)
					p_delta: 1,
					p_reason: 'weekly_no_warning',
					p_created_by: null // System-generated reward
				};

				// Type assertion needed until migrations are applied and types regenerated
				const { error: rpcError } = await (
					supabase.rpc as unknown as (
						fn: 'update_student_gidouilles',
						params: UpdateStudentGidouillesParams
					) => Promise<{ error: unknown }>
				)('update_student_gidouilles', rpcParams);

				if (rpcError) {
					console.error(
						`[generateWeeklyRewards] Failed to update gidouilles for student ${member.student_id}:`,
						rpcError
					);
					// Continue processing other students
					continue;
				}

				// Insert into weekly_rewards table
				const rewardRecord: WeeklyRewardInsert = {
					student_id: member.student_id,
					class_id: classData.id,
					week_start: format(weekStart, 'yyyy-MM-dd'),
					week_end: format(weekEnd, 'yyyy-MM-dd'),
					gidouilles_awarded: 1
				};

				const { error: insertError } = await (
					supabase as unknown as {
						from(table: 'weekly_rewards'): {
							insert(record: WeeklyRewardInsert): Promise<{ error: unknown }>;
						};
					}
				)
					.from('weekly_rewards')
					.insert(rewardRecord);

				if (insertError) {
					console.error('[generateWeeklyRewards] Failed to insert reward record:', insertError);
					// Continue processing other students
					continue;
				}

				// Create notification
				await createWeeklyRewardNotification(
					supabase,
					member.student_id,
					classData.name,
					weekStart,
					weekEnd
				);

				rewardsAwarded++;
				console.log(
					`[generateWeeklyRewards] Awarded weekly reward to student ${member.student_id}`
				);
			} catch (studentError) {
				console.error(
					`[generateWeeklyRewards] Error processing student ${member.student_id}:`,
					studentError
				);
				// Continue processing other students
			}
		}

		console.log(
			`[generateWeeklyRewards] Awarded ${rewardsAwarded} weekly rewards for class ${classData.name}`
		);
		return rewardsAwarded;
	} catch (error) {
		console.error('[generateWeeklyRewards] Error:', error);
		throw error;
	}
}

/**
 * Check if today is the configured weekly rewards day for a school
 * Used by the cron job to determine if weekly rewards should run
 *
 * @param weekConfig - Week configuration
 * @param currentDayOfWeek - Current day of week (0-6, 0 = Sunday)
 * @returns True if today is the day after the last day of the week
 */
export function isWeeklyRewardsDay(weekConfig: WeekConfig, currentDayOfWeek: number): boolean {
	const { last_day } = weekConfig;

	// Weekly rewards run on the day after the last day of the week
	// For example, if week ends on Saturday (6), rewards run on Sunday (0)
	const rewardsDay = (last_day + 1) % 7;

	return currentDayOfWeek === rewardsDay;
}

/**
 * Get all students who earned weekly rewards for a specific week
 * Useful for analytics and reporting
 *
 * @param supabase - Supabase client
 * @param classId - Class UUID
 * @param weekStart - Start of week
 * @param weekEnd - End of week
 * @returns Array of student IDs who earned rewards
 */
export async function getWeeklyRewardRecipients(
	supabase: DbClient,
	classId: string,
	weekStart: Date,
	weekEnd: Date
): Promise<string[]> {
	try {
		const weekStartStr = format(weekStart, 'yyyy-MM-dd');
		const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

		const { data, error } = await (
			supabase as unknown as {
				from(table: 'weekly_rewards'): {
					select(columns: 'student_id'): {
						eq(
							column: string,
							value: string
						): {
							eq(
								column: string,
								value: string
							): {
								eq(
									column: string,
									value: string
								): Promise<{
									data: Pick<WeeklyRewardRow, 'student_id'>[] | null;
									error: unknown;
								}>;
							};
						};
					};
				};
			}
		)
			.from('weekly_rewards')
			.select('student_id')
			.eq('class_id', classId)
			.eq('week_start', weekStartStr)
			.eq('week_end', weekEndStr);

		if (error) {
			console.error('[getWeeklyRewardRecipients] Database error:', error);
			throw error;
		}

		return data?.map((record) => record.student_id) ?? [];
	} catch (error) {
		console.error('[getWeeklyRewardRecipients] Error:', error);
		throw error;
	}
}
