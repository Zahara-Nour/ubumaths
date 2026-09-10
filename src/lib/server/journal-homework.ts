/**
 * Journal Homework — several pieces of work per session
 * =====================================================
 *
 * A cahier de texte session carries a list of things to do, each with its own
 * deadline. This module holds the rule that makes those deadlines meaningful:
 * a deadline is a day the class actually meets.
 *
 * The picker only ever offers valid dates, but a forged request can carry any
 * date at all — so the rule is enforced HERE, on the way in, not only in the
 * interface that displays it.
 *
 * @module server/journal-homework
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { JournalHomeworkItem } from '$lib/types/journal';
import { computeSessionDates, isSessionDate } from '$lib/utils/class-sessions';
import {
	getClassSessionCalendar,
	toSessionOptions,
	type ClassSessionCalendar
} from './class-sessions';

// ============================================================================
// TYPES
// ============================================================================

/** One piece of work as the page sends it, before any resolution. */
export interface HomeworkItemInput {
	content: string;
	dueDate: string | null;
}

export interface ResolvedHomework {
	/** What to write, in order, deadlines resolved. */
	items: HomeworkItemInput[];
	/**
	 * Deadlines refused because they fall on a day the class does not meet.
	 *
	 * A list rather than a first failure: the teacher fixes their whole entry in
	 * one go instead of discovering the mistakes one save at a time.
	 */
	refusees: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Elements that carry meaning without carrying text.
 *
 * A piece of work can legitimately be nothing but a formula or a picture.
 * Judging those "blank" by their stripped text would silently drop the
 * teacher's work — the worst possible failure for a save button.
 */
const CONTENU_SANS_TEXTE = /<(img|iframe|video|audio)\b|data-math-(inline|block)/i;

// ============================================================================
// FUNCTIONS — pure
// ============================================================================

/**
 * Is this rich-text content empty?
 *
 * The SQL constraint `btrim(content) <> ''` does NOT catch this: an untouched
 * TipTap editor renders `<p></p>`, which is not a blank string. Without this
 * check the pupil would see a bullet with a deadline and nothing to do.
 */
export function estContenuVide(html: string | null | undefined): boolean {
	if (!html) return true;
	if (CONTENU_SANS_TEXTE.test(html)) return false;

	const texte = html
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.trim();

	return texte === '';
}

/**
 * Prepare a list of homework for writing: drop the empty ones, resolve missing
 * deadlines, refuse the impossible ones.
 *
 * An absent deadline means "next lesson" — the rule the teacher asked for — so
 * it is resolved to a real date here rather than stored as NULL and reinterpreted
 * at every read. A stored date keeps its meaning when the timetable later
 * changes; a NULL would silently move.
 *
 * A class with no timetable is the majority case today: nothing can be
 * resolved and nothing can be refused, so whatever date was typed is kept.
 */
export function resolveHomeworkItems(
	items: HomeworkItemInput[],
	options: { entryDate: string; calendar: ClassSessionCalendar }
): ResolvedHomework {
	const { entryDate, calendar } = options;

	// Computed once, not per item: the whole list shares one calendar.
	const sessionOptions = toSessionOptions(calendar, entryDate);
	const prochainCours = calendar.hasSchedule
		? (computeSessionDates({ ...sessionOptions, limit: 1 })[0] ?? null)
		: null;

	const resolus: HomeworkItemInput[] = [];
	const refusees: string[] = [];

	for (const item of items) {
		// Dropped BEFORE its deadline is checked: a piece of work we are throwing
		// away must not fail the save because of a date left in a field nobody
		// will keep.
		if (estContenuVide(item.content)) continue;

		const demandee = item.dueDate?.trim() || null;

		if (demandee === null) {
			resolus.push({ content: item.content, dueDate: prochainCours });
			continue;
		}

		if (!calendar.hasSchedule) {
			resolus.push({ content: item.content, dueDate: demandee });
			continue;
		}

		if (!isSessionDate(demandee, sessionOptions)) {
			refusees.push(demandee);
			continue;
		}

		resolus.push({ content: item.content, dueDate: demandee });
	}

	// Nothing is written when a deadline is refused — the caller turns this into
	// a 400. Writing the acceptable ones and dropping the rest would leave the
	// teacher with a half-saved session and no way to tell.
	return { items: refusees.length > 0 ? [] : resolus, refusees };
}

// ============================================================================
// FUNCTIONS — database
// ============================================================================

/**
 * The homework attached to a session, in display order.
 */
export async function getHomeworkForEntry(
	supabase: SupabaseClient<Database>,
	entryId: string
): Promise<JournalHomeworkItem[]> {
	const { data, error } = await supabase
		.from('journal_entry_homework')
		.select('id, content, due_date, display_order')
		.eq('entry_id', entryId)
		.order('display_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) {
		console.error('[journal-homework] Travaux illisibles :', error);
		throw new Error(error.message);
	}

	return (data ?? []).map((row) => ({
		id: row.id,
		content: row.content,
		dueDate: row.due_date
	}));
}

/**
 * Replace the whole list of homework for a session.
 *
 * Goes through `set_journal_entry_homework` rather than a delete followed by an
 * insert: the Supabase client has no transaction, and a network failure between
 * the two would erase the session's work without writing it back.
 */
export async function setHomeworkForEntry(
	supabase: SupabaseClient<Database>,
	entryId: string,
	items: HomeworkItemInput[]
): Promise<{ error: Error | null }> {
	const { error } = await supabase.rpc('set_journal_entry_homework', {
		p_entry_id: entryId,
		p_items: items.map((item) => ({ content: item.content, due_date: item.dueDate ?? '' }))
	});

	if (error) {
		console.error('[journal-homework] Écriture des travaux impossible :', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Read a class's calendar, then prepare a list for writing.
 *
 * The two steps live together because they are never useful apart: resolving a
 * deadline without the class's timetable is guesswork.
 */
export async function prepareHomeworkForEntry(
	supabase: SupabaseClient<Database>,
	classId: string,
	entryDate: string,
	items: HomeworkItemInput[]
): Promise<ResolvedHomework> {
	const calendar = await getClassSessionCalendar(supabase, classId, entryDate);
	return resolveHomeworkItems(items, { entryDate, calendar });
}
