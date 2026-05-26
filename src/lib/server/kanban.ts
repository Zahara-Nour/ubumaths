/**
 * Kanban Server Utilities
 * =======================
 *
 * Server-side helpers for the kanban_boards / kanban_columns / kanban_cards
 * stack. Authorization is enforced by RLS at the DB level (see migration
 * `20260526190624_create_kanban_tables.sql`), but the API layer also runs
 * explicit checks via the `assertBoard*` helpers below so we can surface
 * clear 403/404 responses rather than RLS silently filtering rows.
 *
 * All functions take a SupabaseClient parameter so they can be used from
 * either the user-scoped request client (`locals.supabase`) or the service-
 * role client when needed.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	KanbanBoard,
	KanbanBoardWithCounts,
	KanbanColumn,
	KanbanCard
} from '$lib/types/database-helpers';

type AnySupabase = SupabaseClient<Database>;

// ============================================================================
// Composite return shapes
// ============================================================================

/** Board with nested columns (each with its cards), all sorted by position. */
export interface KanbanBoardWithContent extends KanbanBoard {
	columns: KanbanColumnWithCards[];
}

/** Column with its cards sorted by position. */
export interface KanbanColumnWithCards extends KanbanColumn {
	cards: KanbanCard[];
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch every board the calling user can see (RLS does the heavy lifting:
 * owned boards + class boards for classes where the user is teacher or
 * member). Returns each board enriched with column / card counts.
 *
 * Sorted by `updated_at DESC` so the most recently touched boards come first.
 */
export async function getAccessibleBoards(supabase: AnySupabase): Promise<KanbanBoardWithCounts[]> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select(
			`
			id,
			owner_id,
			class_id,
			title,
			created_at,
			updated_at,
			kanban_columns(count),
			kanban_cards:kanban_columns(kanban_cards(count))
		`
		)
		.order('updated_at', { ascending: false });

	if (dbError) {
		console.error('[kanban] getAccessibleBoards failed:', dbError);
		throw error(500, 'Erreur lors du chargement des tableaux');
	}

	type RawBoard = KanbanBoard & {
		kanban_columns: { count: number }[];
		kanban_cards: { kanban_cards: { count: number }[] }[];
	};

	const rows = (data ?? []) as unknown as RawBoard[];

	return rows.map((row) => {
		const columnCount = row.kanban_columns?.[0]?.count ?? 0;
		// Sum the per-column card counts. Each entry of `row.kanban_cards`
		// represents one column, and inside `.kanban_cards[0].count` is the
		// number of cards in that column.
		const cardCount = (row.kanban_cards ?? []).reduce((sum, col) => {
			return sum + (col.kanban_cards?.[0]?.count ?? 0);
		}, 0);

		return {
			id: row.id,
			owner_id: row.owner_id,
			class_id: row.class_id,
			title: row.title,
			created_at: row.created_at,
			updated_at: row.updated_at,
			column_count: columnCount,
			card_count: cardCount
		};
	});
}

/**
 * Fetch a single board with its columns and cards, both already sorted by
 * `position ASC`. Returns null when the board doesn't exist OR is invisible to
 * the calling user (RLS).
 */
export async function getBoardWithContent(
	supabase: AnySupabase,
	boardId: string
): Promise<KanbanBoardWithContent | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select(
			`
			id,
			owner_id,
			class_id,
			title,
			created_at,
			updated_at,
			columns:kanban_columns(
				id,
				board_id,
				title,
				position,
				created_at,
				cards:kanban_cards(
					id,
					column_id,
					title,
					description,
					position,
					created_at,
					updated_at
				)
			)
		`
		)
		.eq('id', boardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getBoardWithContent failed:', dbError);
		throw error(500, 'Erreur lors du chargement du tableau');
	}

	if (!data) return null;

	const board = data as unknown as KanbanBoardWithContent;

	// Sort columns and cards by position client-side: PostgREST does not
	// always preserve order through nested selects.
	const columns = [...(board.columns ?? [])]
		.sort((a, b) => a.position - b.position)
		.map((col) => ({
			...col,
			cards: [...(col.cards ?? [])].sort((a, b) => a.position - b.position)
		}));

	return {
		id: board.id,
		owner_id: board.owner_id,
		class_id: board.class_id,
		title: board.title,
		created_at: board.created_at,
		updated_at: board.updated_at,
		columns
	};
}

/**
 * Fetch a column's `board_id`, or null when invisible / missing. Used by
 * cross-board move guards.
 */
export async function getColumnBoardId(
	supabase: AnySupabase,
	columnId: string
): Promise<string | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_columns')
		.select('board_id')
		.eq('id', columnId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getColumnBoardId failed:', dbError);
		throw error(500, 'Erreur lors de la lecture de la colonne');
	}

	const row = data as { board_id: string } | null;
	return row?.board_id ?? null;
}

/**
 * Fetch a card's `column_id`, or null when invisible / missing.
 */
export async function getCardColumnId(
	supabase: AnySupabase,
	cardId: string
): Promise<string | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_cards')
		.select('column_id')
		.eq('id', cardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getCardColumnId failed:', dbError);
		throw error(500, 'Erreur lors de la lecture de la carte');
	}

	const row = data as { column_id: string } | null;
	return row?.column_id ?? null;
}

// ============================================================================
// Authorization helpers (defensive checks on top of RLS)
// ============================================================================

/**
 * Throws 404 if the board doesn't exist OR is invisible to the user.
 * Throws 403 if it exists / is visible but the user is not the owner.
 * Returns the loaded board on success.
 */
export async function assertBoardOwner(
	supabase: AnySupabase,
	boardId: string,
	userId: string
): Promise<KanbanBoard> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select('id, owner_id, class_id, title, created_at, updated_at')
		.eq('id', boardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] assertBoardOwner failed:', dbError);
		throw error(500, 'Erreur lors de la vérification du propriétaire');
	}

	if (!data) {
		throw error(404, 'Tableau introuvable');
	}

	const board = data as unknown as KanbanBoard;
	if (board.owner_id !== userId) {
		throw error(403, 'Action réservée au propriétaire du tableau');
	}

	return board;
}

/**
 * Throws 404 if the board doesn't exist OR is invisible to the user. Returns
 * the loaded board on success. Use when the action only requires read-level
 * access (e.g. creating a card on a board the user is a member of).
 */
export async function assertBoardAccess(
	supabase: AnySupabase,
	boardId: string
): Promise<KanbanBoard> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select('id, owner_id, class_id, title, created_at, updated_at')
		.eq('id', boardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] assertBoardAccess failed:', dbError);
		throw error(500, 'Erreur lors de la vérification du tableau');
	}

	if (!data) {
		throw error(404, 'Tableau introuvable');
	}

	return data as unknown as KanbanBoard;
}

/**
 * Verify that `userId` is the teacher of `classId`. Returns true/false; the
 * handler decides whether to throw 403 (when creating a class board) or
 * return a different code (e.g. 404 to mask existence).
 */
export async function isClassTeacher(
	supabase: AnySupabase,
	classId: string,
	userId: string
): Promise<boolean> {
	const { data, error: dbError } = await supabase
		.from('classes')
		.select('teacher_id')
		.eq('id', classId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] isClassTeacher failed:', dbError);
		throw error(500, 'Erreur lors de la vérification de la classe');
	}

	if (!data) return false;
	return (data as { teacher_id: string }).teacher_id === userId;
}
