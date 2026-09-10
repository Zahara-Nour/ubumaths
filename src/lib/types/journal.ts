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
	entryDate: string; // DATE format YYYY-MM-DD
	lessonContent: string | null;
	homeworkContent: string | null;
	homeworkDueDate: string | null; // DATE format YYYY-MM-DD
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * One piece of work to do, attached to a session.
 *
 * A session carries a list of these: an exercise for the next lesson and a
 * longer assignment for the week after are two entries, two deadlines — not one
 * block of text under a single date.
 *
 * `dueDate` is null when the server had no next lesson to resolve an absent
 * deadline to: a class whose timetable was never entered — the common case —
 * or a session written so late in the year that none is left before it ends.
 */
export interface JournalHomeworkItem {
	id: string;
	content: string;
	dueDate: string | null; // DATE format YYYY-MM-DD
}

/**
 * Journal entry with additional class information (for teacher views)
 */
export interface JournalEntryWithClass extends ClassJournalEntry {
	className: string;
	classGrade: string | null;
}

/**
 * Upcoming homework item (for student view)
 */
export interface UpcomingHomework {
	/**
	 * Id du TRAVAIL, pas de la séance.
	 *
	 * Une séance en porte plusieurs : garder l'id de séance ferait deux clés
	 * identiques dans une liste `{#each}`, et Svelte ne rendrait qu'une carte.
	 */
	id: string;
	/** Séance qui porte ce travail — c'est vers elle que la carte navigue. */
	entryId: string;
	classId: string;
	className: string;
	classGrade: string | null;
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
	/**
	 * Combien de travaux à faire cette séance porte.
	 *
	 * Un compte et non un booléen : la grille dit « 2 devoirs », ce qu'un
	 * `homeworkContent` non nul ne pouvait pas exprimer.
	 */
	homeworkCount?: number;
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
	classGrade: string | null;
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
