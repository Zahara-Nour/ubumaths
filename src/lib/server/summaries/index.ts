/**
 * Server-side helper functions for daily/weekly summaries system
 *
 * This module provides utilities for:
 * - Timezone calculations for multi-timezone schools
 * - Daily activity aggregation and summary generation
 * - Weekly reward processing for students with no warnings
 * - Notification creation and formatting
 *
 * @module summaries
 */

// Timezone utilities
export {
	getYesterdayInTimezone,
	getCurrentDayOfWeekInTimezone,
	getWeekRangeInTimezone,
	formatDateForDisplay,
	isDateInRange,
	getDayBoundariesInTimezone
} from './timezone-utils';

// Daily summary functions
export {
	checkClassSchedule,
	aggregateDailyChanges,
	generateDailySummary,
	hasAnyChanges
} from './daily';

// Weekly reward functions
export {
	checkNoWarningsInWeek,
	generateWeeklyRewards,
	isWeeklyRewardsDay,
	getWeeklyRewardRecipients
} from './weekly';

// Notification functions
export {
	createDailySummaryNotification,
	createWeeklyRewardNotification,
	formatDailySummary,
	formatWeeklyReward,
	getNotificationsSummary
} from './notifications';

// Types
export type {
	DailyChanges,
	ClassWithSchool,
	DailySummaryResult,
	WeeklyRewardResult,
	ClassMember,
	NotificationInsert
} from './types';

// Manual type definitions (TEMPORARY - until migrations are applied)
export type {
	DailySummaryInsert,
	WeeklyRewardInsert,
	GidouillesHistoryRow,
	BonusHistoryRow,
	VipCardsActivityRow,
	StudentWarningWithSoftDelete,
	DailySummaryRow,
	WeeklyRewardRow,
	UpdateStudentGidouillesParams,
	UpdateStudentBonusParams
} from './database-types';
