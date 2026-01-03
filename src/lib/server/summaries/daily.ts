/**
 * Helper functions for daily summary aggregation
 * Processes student activity data and generates daily summary notifications
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getDay, format } from 'date-fns';
import type { DailyChanges, ClassWithSchool } from './types';
import { createDailySummaryNotification } from './notifications';
import { getDayBoundariesInTimezone } from './timezone-utils';
import type {
	GidouillesActivityRow,
	BonusHistoryRow,
	VipCardsActivityRow,
	DailySummaryInsert
} from './database-types';

type DbClient = SupabaseClient<Database>;

/**
 * Check if a class had a scheduled lesson on a specific date
 * Returns true if class_schedules has an entry for this class on this day of week
 *
 * @param supabase - Supabase client
 * @param classId - Class UUID
 * @param date - Date to check
 * @returns True if class was scheduled on this day
 */
export async function checkClassSchedule(
	supabase: DbClient,
	classId: string,
	date: Date
): Promise<boolean> {
	try {
		const dayOfWeek = getDay(date);

		const { data, error } = await supabase
			.from('class_schedules')
			.select('id')
			.eq('class_id', classId)
			.eq('day_of_week', dayOfWeek)
			.limit(1);

		if (error) {
			console.error('[checkClassSchedule] Database error:', error);
			throw error;
		}

		return (data?.length ?? 0) > 0;
	} catch (error) {
		console.error('[checkClassSchedule] Error:', error);
		throw error;
	}
}

/**
 * Check if any changes occurred (not all zeros)
 * Used to skip sending summaries when nothing happened
 *
 * @param changes - Daily changes object
 * @returns True if at least one change is non-zero
 */
export function hasAnyChanges(changes: DailyChanges): boolean {
	return (
		changes.gidouilles_gained > 0 ||
		changes.gidouilles_lost > 0 ||
		changes.bonus_gained > 0 ||
		changes.bonus_used > 0 ||
		changes.warnings_issued > 0 ||
		changes.warnings_removed > 0 ||
		changes.vip_cards_gained > 0 ||
		changes.vip_cards_used > 0
	);
}

/**
 * Aggregate all daily changes for a student in a class on a specific date
 * Queries multiple history tables and counts activity
 *
 * @param supabase - Supabase client
 * @param studentId - Student UUID
 * @param classId - Class UUID
 * @param date - Date to aggregate (should be start of day in the school's timezone)
 * @param timezone - School's timezone for day boundary calculation
 * @returns Object with all change counts
 */
export async function aggregateDailyChanges(
	supabase: DbClient,
	studentId: string,
	classId: string,
	date: Date,
	timezone: string
): Promise<DailyChanges> {
	try {
		// Get day boundaries in the school's timezone
		const { start: dayStart, end: dayEnd } = getDayBoundariesInTimezone(date, timezone);

		// Initialize result
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		// 1. Aggregate gidouilles changes
		const { data: gidouillesData, error: gidouillesError } = await (
			supabase as unknown as {
				from(table: 'gidouilles_activity'): {
					select(columns: 'delta'): {
						eq(
							column: 'student_id',
							value: string
						): {
							eq(
								column: 'class_id',
								value: string
							): {
								gte(
									column: 'created_at',
									value: string
								): {
									lte(
										column: 'created_at',
										value: string
									): Promise<{
										data: Pick<GidouillesActivityRow, 'delta'>[] | null;
										error: unknown;
									}>;
								};
							};
						};
					};
				};
			}
		)
			.from('gidouilles_activity')
			.select('delta')
			.eq('student_id', studentId)
			.eq('class_id', classId)
			.gte('created_at', dayStart.toISOString())
			.lte('created_at', dayEnd.toISOString());

		if (gidouillesError) {
			console.error('[aggregateDailyChanges] Gidouilles query error:', gidouillesError);
			throw gidouillesError;
		}

		if (gidouillesData) {
			for (const record of gidouillesData) {
				if (record.delta > 0) {
					changes.gidouilles_gained += record.delta;
				} else if (record.delta < 0) {
					changes.gidouilles_lost += Math.abs(record.delta);
				}
			}
		}

		// 2. Aggregate bonus changes
		const { data: bonusData, error: bonusError } = await (
			supabase as unknown as {
				from(table: 'bonus_history'): {
					select(columns: 'delta'): {
						eq(
							column: 'student_id',
							value: string
						): {
							eq(
								column: 'class_id',
								value: string
							): {
								gte(
									column: 'created_at',
									value: string
								): {
									lte(
										column: 'created_at',
										value: string
									): Promise<{
										data: Pick<BonusHistoryRow, 'delta'>[] | null;
										error: unknown;
									}>;
								};
							};
						};
					};
				};
			}
		)
			.from('bonus_history')
			.select('delta')
			.eq('student_id', studentId)
			.eq('class_id', classId)
			.gte('created_at', dayStart.toISOString())
			.lte('created_at', dayEnd.toISOString());

		if (bonusError) {
			console.error('[aggregateDailyChanges] Bonus query error:', bonusError);
			throw bonusError;
		}

		if (bonusData) {
			for (const record of bonusData) {
				if (record.delta > 0) {
					changes.bonus_gained += record.delta;
				} else if (record.delta < 0) {
					changes.bonus_used += Math.abs(record.delta);
				}
			}
		}

		// 3. Count VIP card activities
		// Note: VIP cards are student-wide, not class-specific (no class_id column in vip_cards_activity)
		const { data: vipData, error: vipError } = await (
			supabase as unknown as {
				from(table: 'vip_cards_activity'): {
					select(columns: 'action'): {
						eq(
							column: string,
							value: string
						): {
							gte(
								column: string,
								value: string
							): {
								lte(
									column: string,
									value: string
								): Promise<{
									data: Pick<VipCardsActivityRow, 'action'>[] | null;
									error: unknown;
								}>;
							};
						};
					};
				};
			}
		)
			.from('vip_cards_activity')
			.select('action')
			.eq('student_id', studentId)
			.gte('created_at', dayStart.toISOString())
			.lte('created_at', dayEnd.toISOString());

		if (vipError) {
			console.error('[aggregateDailyChanges] VIP cards query error:', vipError);
			throw vipError;
		}

		if (vipData) {
			for (const record of vipData) {
				switch (record.action) {
					case 'gained':
						changes.vip_cards_gained++;
						break;
					case 'used':
						changes.vip_cards_used++;
						break;
					// Note: 'removed' action exists in table but not tracked in summaries (no column)
				}
			}
		}

		// 4. Count warnings issued on this date
		const { data: warningsIssuedData, error: warningsIssuedError } = await supabase
			.from('student_warnings')
			.select('id')
			.eq('student_id', studentId)
			.eq('class_id', classId)
			.gte('created_at', dayStart.toISOString())
			.lte('created_at', dayEnd.toISOString());

		if (warningsIssuedError) {
			console.error('[aggregateDailyChanges] Warnings issued query error:', warningsIssuedError);
			throw warningsIssuedError;
		}

		changes.warnings_issued = warningsIssuedData?.length ?? 0;

		// 5. Count warnings removed on this date (but created before this date)
		// This prevents double-counting warnings that were both created and removed same day
		const { data: warningsRemovedData, error: warningsRemovedError } = await supabase
			.from('student_warnings')
			.select('id')
			.eq('student_id', studentId)
			.eq('class_id', classId)
			.not('deleted_at', 'is', null)
			.lt('created_at', dayStart.toISOString()) // Created before this day
			.gte('deleted_at', dayStart.toISOString()) // Deleted during this day
			.lte('deleted_at', dayEnd.toISOString());

		if (warningsRemovedError) {
			console.error('[aggregateDailyChanges] Warnings removed query error:', warningsRemovedError);
			throw warningsRemovedError;
		}

		changes.warnings_removed = warningsRemovedData?.length ?? 0;

		return changes;
	} catch (error) {
		console.error('[aggregateDailyChanges] Error:', error);
		throw error;
	}
}

/**
 * Generate daily summaries for all active students in a class
 * Creates daily_summaries records and sends notifications
 *
 * @param supabase - Supabase client
 * @param classData - Class data with school_id
 * @param yesterday - Yesterday's date (start of day in school's timezone)
 * @param timezone - School's timezone
 * @returns Count of summaries sent
 */
export async function generateDailySummary(
	supabase: DbClient,
	classData: ClassWithSchool,
	yesterday: Date,
	timezone: string
): Promise<number> {
	try {
		let summariesSent = 0;

		// Get all active students in the class
		const { data: members, error: membersError } = await supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', classData.id)
			.eq('status', 'active') // Only active members
			.eq('is_test', false); // Skip test students

		if (membersError) {
			console.error('[generateDailySummary] Failed to fetch class members:', membersError);
			throw membersError;
		}

		if (!members || members.length === 0) {
			console.log(`[generateDailySummary] No active students in class ${classData.id}`);
			return 0;
		}

		console.log(
			`[generateDailySummary] Processing ${members.length} students in class ${classData.name}`
		);

		// Process each student
		for (const member of members) {
			try {
				// Aggregate changes for this student
				const changes = await aggregateDailyChanges(
					supabase,
					member.student_id,
					classData.id,
					yesterday,
					timezone
				);

				// Skip if no changes
				if (!hasAnyChanges(changes)) {
					console.log(
						`[generateDailySummary] No changes for student ${member.student_id}, skipping`
					);
					continue;
				}

				// Insert into daily_summaries table
				const summaryRecord: DailySummaryInsert = {
					student_id: member.student_id,
					class_id: classData.id,
					summary_date: format(yesterday, 'yyyy-MM-dd'),
					gidouilles_gained: changes.gidouilles_gained,
					gidouilles_lost: changes.gidouilles_lost,
					bonus_gained: changes.bonus_gained,
					bonus_used: changes.bonus_used,
					warnings_issued: changes.warnings_issued,
					warnings_removed: changes.warnings_removed,
					vip_cards_gained: changes.vip_cards_gained,
					vip_cards_used: changes.vip_cards_used
				};

				const { error: insertError } = await (
					supabase as unknown as {
						from(table: 'daily_summaries'): {
							insert(record: DailySummaryInsert): Promise<{ error: unknown }>;
						};
					}
				)
					.from('daily_summaries')
					.insert(summaryRecord);

				if (insertError) {
					console.error('[generateDailySummary] Failed to insert summary:', insertError);
					// Continue processing other students
					continue;
				}

				// Create notification
				await createDailySummaryNotification(
					supabase,
					member.student_id,
					classData.name,
					yesterday,
					changes
				);

				summariesSent++;
			} catch (studentError) {
				console.error(
					`[generateDailySummary] Error processing student ${member.student_id}:`,
					studentError
				);
				// Continue processing other students
			}
		}

		console.log(
			`[generateDailySummary] Sent ${summariesSent} summaries for class ${classData.name}`
		);
		return summariesSent;
	} catch (error) {
		console.error('[generateDailySummary] Error:', error);
		throw error;
	}
}
