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
import type { Database, TablesUpdate } from '$lib/types/database';
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
		entryDate: db.entry_date,
		lessonContent: db.lesson_content,
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
 * @param _teacherId - Unused (kept for API stability); ownership is role-based via RLS
 * @param input - Journal entry data
 * @returns Created journal entry
 */
export async function createJournalEntry(
	supabase: SupabaseClient<Database>,
	_teacherId: string,
	input: CreateJournalEntryInput
): Promise<OperationResult<ClassJournalEntry>> {
	// Mono-teacher: the sole teacher/admin owns every class. RLS enforces write
	// access on class_journal_entries; we just verify the class exists.
	const { data: classData, error: classError } = await supabase
		.from('classes')
		.select('id')
		.eq('id', input.classId)
		.single();

	if (classError || !classData) {
		console.error('[createJournalEntry] Class not found:', classError);
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
			entry_date: input.entryDate,
			lesson_content: input.lessonContent ?? null,
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
 * @param _teacherId - Unused (kept for API stability); ownership is role-based via RLS
 * @param input - Update data
 * @returns Updated journal entry
 */
export async function updateJournalEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	_teacherId: string,
	input: UpdateJournalEntryInput
): Promise<OperationResult<ClassJournalEntry>> {
	// Build update object
	const updateData: TablesUpdate<'class_journal_entries'> = {};

	if (input.entryDate !== undefined) updateData.entry_date = input.entryDate;
	if (input.lessonContent !== undefined) updateData.lesson_content = input.lessonContent;
	if (input.isPublished !== undefined) updateData.is_published = input.isPublished;

	// Update (RLS scopes access to teacher/admin; mono-teacher: entries have no per-teacher owner)
	const { data: entry, error } = await supabase
		.from('class_journal_entries')
		.update(updateData)
		.eq('id', entryId)
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
 * @param _teacherId - Unused (kept for API stability); ownership is role-based via RLS
 * @returns Success status
 */
export async function deleteJournalEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	_teacherId: string
): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('class_journal_entries').delete().eq('id', entryId);

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
	const { data: schedules, error: schedulesError } = await supabase
		.from('class_schedules')
		.select('day_of_week')
		.eq('class_id', classId);

	// Sans l'emploi du temps, aucun jour n'est « jour de cours » : le cahier de
	// texte se présente vide, comme si la classe n'avait jamais eu lieu.
	if (schedulesError) {
		console.error('[journal] Emploi du temps illisible :', schedulesError);
		throw new Error(schedulesError.message);
	}

	const scheduledDays = new Set((schedules || []).map((s) => s.day_of_week));

	// Combien de travaux par séance de la semaine. Lu à part : l'indicateur de la
	// grille se fondait sur l'ancienne colonne unique, aujourd'hui supprimée —
	// sans ce compte, la mention « devoir » disparaîtrait du calendrier du prof.
	const entryIds = (entries ?? []).map((e) => e.id);
	const homeworkCounts = new Map<string, number>();
	if (entryIds.length > 0) {
		const { data: travaux, error: travauxError } = await supabase
			.from('journal_entry_homework')
			.select('entry_id')
			.in('entry_id', entryIds);

		if (travauxError) {
			console.error('[journal] Travaux illisibles :', travauxError.message);
			throw new Error(travauxError.message);
		}

		for (const row of travaux ?? []) {
			homeworkCounts.set(row.entry_id, (homeworkCounts.get(row.entry_id) ?? 0) + 1);
		}
	}

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
			hasScheduledClass: scheduledDays.has(dayOfWeek),
			homeworkCount: entry ? (homeworkCounts.get(entry.id) ?? 0) : 0
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
 * @param _teacherId - Unused (kept for API stability); ownership is role-based via RLS
 * @param classId - Optional class ID filter
 * @param limit - Max number of entries to return
 * @returns List of journal entries with class info
 */
export async function getTeacherJournalEntries(
	supabase: SupabaseClient<Database>,
	_teacherId: string,
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

	// Le travail à faire vit dans sa propre table. Compter l'ancienne colonne
	// unique aurait rendu 0 pour toujours — pire qu'une statistique absente,
	// puisque ça laisse croire que le professeur ne donne jamais de devoir.
	const entryIds = (entries ?? []).map((e) => e.id);
	let entriesWithHomework = 0;
	if (entryIds.length > 0) {
		const { data: travaux, error: travauxError } = await supabase
			.from('journal_entry_homework')
			.select('entry_id')
			.in('entry_id', entryIds);

		if (travauxError) {
			console.error('[getJournalStatistics] Travaux illisibles :', travauxError.message);
			return { data: null, error: new Error(travauxError.message) };
		}

		entriesWithHomework = new Set((travaux ?? []).map((t) => t.entry_id)).size;
	}

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday

	const stats: JournalStatistics = {
		totalEntries: entries?.length || 0,
		publishedEntries: entries?.filter((e) => e.is_published).length || 0,
		entriesWithHomework,
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
	// « Aujourd'hui » en UTC, comme la base.
	//
	// L'ancien calcul faisait `setHours(0,0,0,0)` — minuit LOCAL — puis
	// `toISOString()`, qui rend en UTC : à l'est de Greenwich, minuit local est la
	// VEILLE en UTC, et la date obtenue reculait d'un jour. Une séance écrite le
	// jour même était alors exclue par le filtre `entry_date <= today`, et son
	// devoir n'apparaissait pas dans « à venir » avant le lendemain.
	//
	// L'UTC n'est pas un choix arbitraire : la RLS de `journal_entry_homework`
	// compare avec `current_date`, évalué en UTC côté Supabase. Filtrer dans la
	// même référence évite de réclamer des lignes que la RLS refuse.
	const maintenant = new Date();
	const todayUtc = Date.UTC(
		maintenant.getUTCFullYear(),
		maintenant.getUTCMonth(),
		maintenant.getUTCDate()
	);
	const endUtc = todayUtc + daysAhead * 86_400_000;

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

	const todayStr = new Date(todayUtc).toISOString().slice(0, 10);
	const endStr = new Date(endUtc).toISOString().slice(0, 10);

	// Un travail par ligne, et non plus un par séance : c'est toute la raison
	// d'être de la table fille. Les filtres sur la séance sont posés
	// explicitement bien que la RLS les impose déjà — la même fonction sert au
	// professeur, dont la RLS, elle, ne filtre rien.
	const { data: rows, error: rowsError } = await supabase
		.from('journal_entry_homework')
		.select(
			`
			id,
			content,
			due_date,
			entry:class_journal_entries!inner(
				id,
				class_id,
				entry_date,
				is_published,
				class:classes!inner(name, grade)
			)
		`
		)
		.in('entry.class_id', classIds)
		.eq('entry.is_published', true)
		.lte('entry.entry_date', todayStr)
		.not('due_date', 'is', null)
		.gte('due_date', todayStr)
		.lte('due_date', endStr)
		.order('due_date', { ascending: true });

	if (rowsError) {
		console.error('[getUpcomingHomework] Error fetching homework:', rowsError);
		return { data: [], error: new Error(rowsError.message), count: 0 };
	}

	// Deux minuits UTC exacts : la division tombe juste, `Math.round` absorbe le
	// flottant sans jamais décaler d'un jour comme le faisait `Math.ceil` sur des
	// bornes de fuseaux différents.
	const joursRestants = (due: string) =>
		Math.round((Date.parse(`${due}T00:00:00Z`) - todayUtc) / 86_400_000);

	const homework: UpcomingHomework[] = (rows ?? []).map((row) => ({
		id: row.id,
		entryId: row.entry.id,
		classId: row.entry.class_id,
		className: row.entry.class.name,
		classGrade: row.entry.class.grade,
		entryDate: row.entry.entry_date,
		homeworkContent: row.content,
		homeworkDueDate: row.due_date as string,
		daysUntilDue: joursRestants(row.due_date as string)
	}));

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
