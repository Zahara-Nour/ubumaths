/**
 * Class Journal Server Functions
 * ===============================
 *
 * Server-side functions for managing class journal entries (cahier de texte).
 *
 * Features:
 * - Teacher CRUD operations for journal entries
 * - Student access to published entries (up to current date only)
 * - Week view for efficient planning
 * - Upcoming homework queries
 * - Integration with class_schedules for next class date calculations
 *
 * @module server/journal
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	ClassJournalEntry,
	JournalEntryWithClass,
	UpcomingHomework,
	JournalWeekView,
	JournalWeekDay,
	JournalStatistics
} from '$lib/types/journal';
import type {
	CreateJournalEntryInput,
	UpdateJournalEntryInput
} from '$lib/server/validation/journal';

// ============================================================================
// TYPES
// ============================================================================

type DbClassJournalEntry = Database['public']['Tables']['class_journal_entries']['Row'];

/** Result type for operations */
interface OperationResult<T> {
	data: T | null;
	error: Error | null;
}

/** Result type for list operations */
interface ListResult<T> {
	data: T[];
	error: Error | null;
	count: number;
}

// ============================================================================
// CONVERTER FUNCTIONS (DB -> App)
// ============================================================================

/**
 * Convert database journal entry to application format
 */
function convertJournalEntry(db: DbClassJournalEntry): ClassJournalEntry {
	return {
		id: db.id,
		classId: db.class_id,
		teacherId: db.teacher_id,
		entryDate: db.entry_date,
		lessonContent: db.lesson_content,
		homeworkContent: db.homework_content,
		homeworkDueDate: db.homework_due_date,
		isPublished: db.is_published,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

// ============================================================================
// TEACHER FUNCTIONS - CRUD
// ============================================================================

/**
 * Create a new journal entry
 *
 * @param supabase - Supabase client
 * @param teacherId - Teacher's user ID
 * @param input - Journal entry data
 * @returns Created journal entry
 */
export async function createJournalEntry(
	supabase: SupabaseClient<Database>,
	teacherId: string,
	input: CreateJournalEntryInput
): Promise<OperationResult<ClassJournalEntry>> {
	// Verify teacher owns the class
	const { data: classData, error: classError } = await supabase
		.from('classes')
		.select('id, teacher_id')
		.eq('id', input.classId)
		.eq('teacher_id', teacherId)
		.single();

	if (classError || !classData) {
		console.error('[createJournalEntry] Teacher does not own class:', classError);
		return {
			data: null,
			error: new Error("Vous n'etes pas autorise a creer des entrees pour cette classe")
		};
	}

	// Create the entry
	const { data: entry, error } = await supabase
		.from('class_journal_entries')
		.insert({
			class_id: input.classId,
			teacher_id: teacherId,
			entry_date: input.entryDate,
			lesson_content: input.lessonContent ?? null,
			homework_content: input.homeworkContent ?? null,
			homework_due_date: input.homeworkDueDate ?? null,
			is_published: input.isPublished ?? false
		})
		.select()
		.single();

	if (error) {
		console.error('[createJournalEntry] Error:', error);
		// Check for unique constraint violation
		if (error.code === '23505') {
			return {
				data: null,
				error: new Error('Une entree existe deja pour cette classe a cette date')
			};
		}
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertJournalEntry(entry), error: null };
}

/**
 * Update an existing journal entry
 *
 * @param supabase - Supabase client
 * @param entryId - Journal entry ID
 * @param teacherId - Teacher's user ID (for authorization)
 * @param input - Update data
 * @returns Updated journal entry
 */
export async function updateJournalEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	teacherId: string,
	input: UpdateJournalEntryInput
): Promise<OperationResult<ClassJournalEntry>> {
	// Build update object
	const updateData: Record<string, unknown> = {};

	if (input.entryDate !== undefined) updateData.entry_date = input.entryDate;
	if (input.lessonContent !== undefined) updateData.lesson_content = input.lessonContent;
	if (input.homeworkContent !== undefined) updateData.homework_content = input.homeworkContent;
	if (input.homeworkDueDate !== undefined) updateData.homework_due_date = input.homeworkDueDate;
	if (input.isPublished !== undefined) updateData.is_published = input.isPublished;

	// Update (RLS policy ensures teacher owns the entry)
	const { data: entry, error } = await supabase
		.from('class_journal_entries')
		.update(updateData)
		.eq('id', entryId)
		.eq('teacher_id', teacherId)
		.select()
		.single();

	if (error) {
		console.error('[updateJournalEntry] Error:', error);
		// Check for unique constraint violation (if entry_date was changed)
		if (error.code === '23505') {
			return {
				data: null,
				error: new Error('Une entree existe deja pour cette classe a cette date')
			};
		}
		return { data: null, error: new Error(error.message) };
	}

	if (!entry) {
		return {
			data: null,
			error: new Error("Entree introuvable ou vous n'etes pas autorise a la modifier")
		};
	}

	return { data: convertJournalEntry(entry), error: null };
}

/**
 * Delete a journal entry
 *
 * @param supabase - Supabase client
 * @param entryId - Journal entry ID
 * @param teacherId - Teacher's user ID (for authorization)
 * @returns Success status
 */
export async function deleteJournalEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	teacherId: string
): Promise<{ error: Error | null }> {
	const { error } = await supabase
		.from('class_journal_entries')
		.delete()
		.eq('id', entryId)
		.eq('teacher_id', teacherId);

	if (error) {
		console.error('[deleteJournalEntry] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

// ============================================================================
// TEACHER FUNCTIONS - QUERIES
// ============================================================================

/**
 * Get journal entries for a specific week
 *
 * @param supabase - Supabase client
 * @param classId - Class ID
 * @param weekStart - Start of the week (Monday, YYYY-MM-DD)
 * @returns Week view with entries
 */
export async function getJournalEntriesForWeek(
	supabase: SupabaseClient<Database>,
	classId: string,
	weekStart: string
): Promise<OperationResult<JournalWeekView>> {
	// Calculate week end (6 days after start)
	const startDate = new Date(weekStart);
	const endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 6);

	// Get class info
	const { data: classData, error: classError } = await supabase
		.from('classes')
		.select('id, name, grade')
		.eq('id', classId)
		.single();

	if (classError || !classData) {
		console.error('[getJournalEntriesForWeek] Error fetching class:', classError);
		return { data: null, error: new Error('Classe introuvable') };
	}

	// Get entries for the week
	const { data: entries, error: entriesError } = await supabase
		.from('class_journal_entries')
		.select('*')
		.eq('class_id', classId)
		.gte('entry_date', weekStart)
		.lte('entry_date', endDate.toISOString().split('T')[0])
		.order('entry_date', { ascending: true });

	if (entriesError) {
		console.error('[getJournalEntriesForWeek] Error fetching entries:', entriesError);
		return { data: null, error: new Error(entriesError.message) };
	}

	// Get class schedule for this class (to know which days have classes)
	const { data: schedules } = await supabase
		.from('class_schedules')
		.select('day_of_week')
		.eq('class_id', classId);

	const scheduledDays = new Set((schedules || []).map((s) => s.day_of_week));

	// Build entries map
	const entriesMap = new Map<string, DbClassJournalEntry>();
	for (const entry of entries || []) {
		entriesMap.set(entry.entry_date, entry);
	}

	// Build days array
	const days: JournalWeekDay[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (let i = 0; i < 7; i++) {
		const currentDate = new Date(startDate);
		currentDate.setDate(currentDate.getDate() + i);

		const dateStr = currentDate.toISOString().split('T')[0];
		const dayOfWeek = currentDate.getDay();
		const isToday = currentDate.getTime() === today.getTime();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

		const entry = entriesMap.get(dateStr);

		days.push({
			date: currentDate,
			dayOfWeek,
			isToday,
			isWeekend,
			entry: entry ? convertJournalEntry(entry) : undefined,
			hasScheduledClass: scheduledDays.has(dayOfWeek)
		});
	}

	const weekView: JournalWeekView = {
		weekStart: startDate,
		weekEnd: endDate,
		days,
		classId: classData.id,
		className: classData.name,
		classGrade: classData.grade
	};

	return { data: weekView, error: null };
}

/**
 * Get all journal entries for a teacher, optionally filtered by class
 *
 * @param supabase - Supabase client
 * @param teacherId - Teacher's user ID
 * @param classId - Optional class ID filter
 * @param limit - Max number of entries to return
 * @returns List of journal entries with class info
 */
export async function getTeacherJournalEntries(
	supabase: SupabaseClient<Database>,
	teacherId: string,
	classId?: string,
	limit: number = 50
): Promise<ListResult<JournalEntryWithClass>> {
	let query = supabase
		.from('class_journal_entries')
		.select(
			`
			*,
			class:classes!inner(name, level)
		`
		)
		.eq('teacher_id', teacherId)
		.order('entry_date', { ascending: false })
		.limit(limit);

	if (classId) {
		query = query.eq('class_id', classId);
	}

	const { data, error } = await query;

	if (error) {
		console.error('[getTeacherJournalEntries] Error:', error);
		return { data: [], error: new Error(error.message), count: 0 };
	}

	const entries: JournalEntryWithClass[] = (data || []).map((row) => {
		const entry = convertJournalEntry(row as unknown as DbClassJournalEntry);
		const classInfo = (row as unknown as { class: { name: string; grade: string | null } }).class;
		return {
			...entry,
			className: classInfo.name,
			classGrade: classInfo.grade
		};
	});

	return { data: entries, error: null, count: entries.length };
}

/**
 * Get statistics for journal entries (for a specific class)
 *
 * @param supabase - Supabase client
 * @param classId - Class ID
 * @returns Journal statistics
 */
export async function getJournalStatistics(
	supabase: SupabaseClient<Database>,
	classId: string
): Promise<OperationResult<JournalStatistics>> {
	const { data: entries, error } = await supabase
		.from('class_journal_entries')
		.select('*')
		.eq('class_id', classId);

	if (error) {
		console.error('[getJournalStatistics] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday

	const stats: JournalStatistics = {
		totalEntries: entries?.length || 0,
		publishedEntries: entries?.filter((e) => e.is_published).length || 0,
		entriesWithHomework: entries?.filter((e) => e.homework_content).length || 0,
		lastEntryDate:
			entries && entries.length > 0
				? entries.sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0].entry_date
				: null,
		entriesThisMonth: entries?.filter((e) => new Date(e.entry_date) >= startOfMonth).length || 0,
		entriesThisWeek: entries?.filter((e) => new Date(e.entry_date) >= startOfWeek).length || 0
	};

	return { data: stats, error: null };
}

// ============================================================================
// STUDENT FUNCTIONS - QUERIES
// ============================================================================

/**
 * Get upcoming homework for a student
 *
 * @param supabase - Supabase client
 * @param studentId - Student's user ID
 * @param daysAhead - Number of days to look ahead (default: 14)
 * @returns List of upcoming homework assignments
 */
export async function getUpcomingHomework(
	supabase: SupabaseClient<Database>,
	studentId: string,
	daysAhead: number = 14
): Promise<ListResult<UpcomingHomework>> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const endDate = new Date(today);
	endDate.setDate(endDate.getDate() + daysAhead);

	// Get student's active classes only
	const { data: memberships, error: membershipError } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.eq('status', 'active');

	if (membershipError) {
		console.error('[getUpcomingHomework] Error fetching memberships:', membershipError);
		return { data: [], error: new Error(membershipError.message), count: 0 };
	}

	const classIds = (memberships || []).map((m) => m.class_id);

	if (classIds.length === 0) {
		return { data: [], error: null, count: 0 };
	}

	// Get published entries with homework due in the date range
	const { data: entries, error: entriesError } = await supabase
		.from('class_journal_entries')
		.select(
			`
			*,
			class:classes!inner(name, grade)
		`
		)
		.in('class_id', classIds)
		.eq('is_published', true)
		.lte('entry_date', today.toISOString().split('T')[0]) // Only past/today entries
		.not('homework_content', 'is', null)
		.not('homework_due_date', 'is', null)
		.gte('homework_due_date', today.toISOString().split('T')[0])
		.lte('homework_due_date', endDate.toISOString().split('T')[0])
		.order('homework_due_date', { ascending: true });

	if (entriesError) {
		console.error('[getUpcomingHomework] Error fetching entries:', entriesError);
		return { data: [], error: new Error(entriesError.message), count: 0 };
	}

	const homework: UpcomingHomework[] = (entries || []).map((row) => {
		const entry = row as unknown as DbClassJournalEntry & {
			class: { name: string; grade: string | null };
		};
		const dueDate = new Date(entry.homework_due_date!);
		const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		return {
			id: entry.id,
			classId: entry.class_id,
			className: entry.class.name,
			classGrade: entry.class.grade,
			entryDate: entry.entry_date,
			homeworkContent: entry.homework_content!,
			homeworkDueDate: entry.homework_due_date!,
			daysUntilDue
		};
	});

	return { data: homework, error: null, count: homework.length };
}

/**
 * Get the next class date for a given class after a specific date
 * Uses class_schedules to determine which days the class meets
 *
 * @param supabase - Supabase client
 * @param classId - Class ID
 * @param fromDate - Starting date (YYYY-MM-DD format, default: today)
 * @returns Next class date or null if none found in next 30 days
 */
export async function getNextClassDate(
	supabase: SupabaseClient<Database>,
	classId: string,
	fromDate?: string
): Promise<OperationResult<string>> {
	const startDate = fromDate ? new Date(fromDate) : new Date();
	startDate.setHours(0, 0, 0, 0);

	// Get class schedule
	const { data: schedules, error: scheduleError } = await supabase
		.from('class_schedules')
		.select('day_of_week')
		.eq('class_id', classId);

	if (scheduleError) {
		console.error('[getNextClassDate] Error fetching schedule:', scheduleError);
		return { data: null, error: new Error(scheduleError.message) };
	}

	if (!schedules || schedules.length === 0) {
		// No schedule defined, cannot determine next class
		return { data: null, error: null };
	}

	const scheduledDays = new Set(schedules.map((s) => s.day_of_week));

	// Look ahead up to 30 days
	for (let i = 1; i <= 30; i++) {
		const checkDate = new Date(startDate);
		checkDate.setDate(checkDate.getDate() + i);
		const dayOfWeek = checkDate.getDay();

		if (scheduledDays.has(dayOfWeek)) {
			return { data: checkDate.toISOString().split('T')[0], error: null };
		}
	}

	// No class found in next 30 days
	return { data: null, error: null };
}
