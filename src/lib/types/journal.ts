/**
 * Class Journal Types
 * ===================
 *
 * Types for the class journal (cahier de texte) feature.
 * Teachers create daily entries documenting what was taught and assigning homework.
 * Students can view published entries up to the current date.
 *
 * @module types/journal
 */

import type { Database } from './database';

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Class journal entry from database
 */
export type DbClassJournalEntry = Database['public']['Tables']['class_journal_entries']['Row'];

/**
 * Insert type for creating journal entries
 */
export type DbClassJournalEntryInsert =
	Database['public']['Tables']['class_journal_entries']['Insert'];

/**
 * Update type for modifying journal entries
 */
export type DbClassJournalEntryUpdate =
	Database['public']['Tables']['class_journal_entries']['Update'];

// ============================================================================
// APPLICATION TYPES
// ============================================================================

/**
 * Class journal entry (application format)
 *
 * A journal entry represents what happened in a class on a specific date:
 * - lesson_content: What was covered during the session (Ubumark format)
 * - homework_content: Homework assignment (Ubumark format)
 * - homework_due_date: Optional deadline for homework
 * - is_published: Whether students can see this entry (they also need entry_date <= today)
 */
export interface ClassJournalEntry {
	id: string;
	classId: string;
	teacherId: string;
	entryDate: string; // DATE format YYYY-MM-DD
	lessonContent: string | null;
	homeworkContent: string | null;
	homeworkDueDate: string | null; // DATE format YYYY-MM-DD
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Journal entry with additional class information (for teacher views)
 */
export interface JournalEntryWithClass extends ClassJournalEntry {
	className: string;
	classLevel: string;
}

/**
 * Upcoming homework item (for student view)
 */
export interface UpcomingHomework {
	id: string;
	classId: string;
	className: string;
	classLevel: string;
	entryDate: string; // When it was assigned
	homeworkContent: string;
	homeworkDueDate: string; // When it's due
	daysUntilDue: number;
}

// ============================================================================
// WEEK VIEW TYPES
// ============================================================================

/**
 * Represents one day in the week view
 */
export interface JournalWeekDay {
	/** Date object for this day */
	date: Date;
	/** Day of week (0 = Sunday, 6 = Saturday) */
	dayOfWeek: number;
	/** Is this today? */
	isToday: boolean;
	/** Is this a weekend day? */
	isWeekend: boolean;
	/** The journal entry for this day (if it exists) */
	entry?: ClassJournalEntry;
	/** Does this class have a scheduled session on this day? (from class_schedules) */
	hasScheduledClass?: boolean;
}

/**
 * Week view for a specific class
 * Used by teachers to see/edit entries for the current week
 */
export interface JournalWeekView {
	/** Start of the week (Monday) */
	weekStart: Date;
	/** End of the week (Sunday) */
	weekEnd: Date;
	/** Days of the week with entries */
	days: JournalWeekDay[];
	/** Class information */
	classId: string;
	className: string;
	classLevel: string;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Simplified day view with basic entry info (for student views)
 */
export interface JournalDayView {
	/** Date object for this day */
	date: Date;
	/** Day of week short name (lun, mar, etc.) */
	dayOfWeek: string;
	/** Is this today? */
	isToday: boolean;
	/** Entry summaries for this day (can be from multiple classes) */
	entries: JournalDayEntry[];
}

/**
 * Entry summary for day view
 */
export interface JournalDayEntry {
	id: string;
	hasLesson: boolean;
	hasHomework: boolean;
	homeworkDueDate: string | null;
	isPublished: boolean;
	className: string;
	classId: string;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Statistics for journal entries (teacher dashboard)
 */
export interface JournalStatistics {
	/** Total number of entries for this class */
	totalEntries: number;
	/** Number of published entries */
	publishedEntries: number;
	/** Number of entries with homework */
	entriesWithHomework: number;
	/** Last entry date */
	lastEntryDate: string | null;
	/** Number of entries this month */
	entriesThisMonth: number;
	/** Number of entries this week */
	entriesThisWeek: number;
}
