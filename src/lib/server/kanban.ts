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

import { json, error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { RateLimitResult } from '$lib/server/rateLimiter';
import type {
	KanbanBoard,
	KanbanBoardWithCounts,
	KanbanColumn,
	KanbanCard,
	KanbanTag,
	KanbanBoardMember
} from '$lib/types/database-helpers';

type AnySupabase = SupabaseClient<Database>;

// ============================================================================
// Composite return shapes
// ============================================================================

/**
 * Board with nested columns + cards, the per-board tag palette, and the list
 * of users who can be assigned (owner + class members, for class boards). On
 * each card we flatten the kanban_card_tags and kanban_card_assignees rows
 * to string[] for client-friendly consumption.
 */
export interface KanbanBoardWithContent extends KanbanBoard {
	columns: KanbanColumnWithCards[];
	tags: KanbanTag[];
	members: KanbanBoardMember[];
}

/** Column with its cards sorted by position. */
export interface KanbanColumnWithCards extends KanbanColumn {
	cards: KanbanCardWithExtras[];
}

/**
 * Card enriched with the ids of tags and assignees it carries (flattened
 * from the kanban_card_tags + kanban_card_assignees junctions).
 */
export interface KanbanCardWithExtras extends KanbanCard {
	tag_ids: string[];
	assignee_ids: string[];
}

// ============================================================================
// Rate-limit helper
// ============================================================================

/**
 * If the rate-limit check failed, build a 429 Response and return it. Caller
 * is expected to `return` the result immediately so the endpoint short-
 * circuits. We return a Response rather than `throw error()` because
 * SvelteKit's error envelope doesn't carry a `Retry-After` header, which is
 * the whole point of a 429.
 */
export function rateLimitResponse(result: RateLimitResult): Response | null {
	if (result.allowed) return null;
	return json(
		{ message: result.message ?? 'Trop de requêtes' },
		{
			status: 429,
			headers: { 'Retry-After': result.retryAfter?.toString() ?? '3600' }
		}
	);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Pagination shape for the boards list. The cursor is the `updated_at`
 * ISO string of the last item on the previous page (we sort DESC, so the next
 * page starts at boards strictly older than the cursor).
 */
export interface BoardsPage {
	boards: KanbanBoardWithCounts[];
	nextCursor: string | null;
}

/**
 * Default page size for `getAccessibleBoards`. The RPC clamps to [1, 200];
 * 100 strikes a balance between one-shot UX (most users have well under that)
 * and avoiding huge payloads if a user accumulates many boards over years.
 */
export const DEFAULT_BOARDS_PAGE_SIZE = 100;

/**
 * Fetch a page of boards the calling user can see, with column / card counts.
 * Visibility is enforced by RLS inside the underlying RPC (perso = owner
 * only, class = teacher + class members), sorted by `updated_at DESC` with a
 * stable `id DESC` tie-break for deterministic pagination.
 *
 * `cursor` is the `updated_at` of the last board from the previous page; pass
 * `null` for the first page. `nextCursor` is null when the page wasn't full
 * (i.e. no more boards to fetch).
 */
export async function getAccessibleBoards(
	supabase: AnySupabase,
	options: { limit?: number; cursor?: string | null } = {}
): Promise<BoardsPage> {
	const limit = options.limit ?? DEFAULT_BOARDS_PAGE_SIZE;
	const cursor = options.cursor ?? null;

	const { data, error: dbError } = await supabase.rpc('get_accessible_kanban_boards', {
		p_limit: limit,
		p_cursor: cursor
	});

	if (dbError) {
		console.error('[kanban] getAccessibleBoards failed:', dbError);
		throw error(500, 'Erreur lors du chargement des tableaux');
	}

	type Row = {
		id: string;
		owner_id: string;
		class_id: string | null;
		title: string;
		created_at: string;
		updated_at: string;
		column_count: number | string;
		card_count: number | string;
	};

	const rows = (data ?? []) as Row[];

	const boards: KanbanBoardWithCounts[] = rows.map((row) => ({
		id: row.id,
		owner_id: row.owner_id,
		class_id: row.class_id,
		title: row.title,
		created_at: row.created_at,
		updated_at: row.updated_at,
		// Counts come back as bigint → number|string depending on driver.
		column_count: Number(row.column_count) || 0,
		card_count: Number(row.card_count) || 0
	}));

	// A full page means there might be more; an under-full page is the last.
	const nextCursor =
		boards.length === limit && boards.length > 0 ? boards[boards.length - 1].updated_at : null;

	return { boards, nextCursor };
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
			tags:kanban_tags(
				id,
				board_id,
				name,
				color,
				created_at
			),
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
					due_date,
					created_at,
					updated_at,
					kanban_card_tags(tag_id),
					kanban_card_assignees(user_id)
				)
			)
		`
		)
		.eq('id', boardId)
		// PostgREST nested ordering: sort columns by position, and cards within
		// each column also by position. Indexes (column_id, position) and
		// (board_id, position) added in 20260527000101 keep this O(log n).
		.order('position', { referencedTable: 'kanban_columns' })
		.order('position', { referencedTable: 'kanban_columns.kanban_cards' })
		// Stable alphabetical order for the tag palette.
		.order('name', { referencedTable: 'kanban_tags' })
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getBoardWithContent failed:', dbError);
		throw error(500, 'Erreur lors du chargement du tableau');
	}

	if (!data) return null;

	// Flatten kanban_card_tags / kanban_card_assignees rows into the
	// client-friendly tag_ids / assignee_ids: string[] shape.
	type RawCard = KanbanCard & {
		kanban_card_tags: { tag_id: string }[];
		kanban_card_assignees: { user_id: string }[];
	};
	type RawColumn = KanbanColumn & { cards: RawCard[] };
	type RawBoard = KanbanBoard & { tags: KanbanTag[]; columns: RawColumn[] };

	const raw = data as unknown as RawBoard;

	// Fetch the list of people who can be assigned to this board: the owner,
	// plus (for class boards) every enrolled student. Done in a second query
	// because PostgREST nested embeds can't easily union "owner" and
	// "class_members → profile" into a flat list with the right RLS path.
	const members = await fetchBoardMembers(supabase, raw.owner_id, raw.class_id);

	return {
		id: raw.id,
		owner_id: raw.owner_id,
		class_id: raw.class_id,
		title: raw.title,
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		tags: raw.tags ?? [],
		members,
		columns: (raw.columns ?? []).map((col) => ({
			id: col.id,
			board_id: col.board_id,
			title: col.title,
			position: col.position,
			created_at: col.created_at,
			cards: (col.cards ?? []).map((card) => ({
				id: card.id,
				column_id: card.column_id,
				title: card.title,
				description: card.description,
				position: card.position,
				due_date: card.due_date,
				created_at: card.created_at,
				updated_at: card.updated_at,
				tag_ids: (card.kanban_card_tags ?? []).map((j) => j.tag_id),
				assignee_ids: (card.kanban_card_assignees ?? []).map((j) => j.user_id)
			}))
		}))
	};
}

/**
 * Resolve the people who can be assigned to a kanban board: always the
 * owner; for class boards, also every enrolled student. Returns a slim
 * profile slice (id + name + avatar) suitable for picker UIs.
 *
 * RLS on `profiles` is more restrictive than what we need here — a student
 * can normally only see their own profile, not their classmates'. We work
 * around that by SELECT-ing the ids first (via class_members, which is
 * visible to the user) and then querying the profile rows; this still
 * leaks no data beyond "your classmates' names and avatars", which the
 * existing student dashboard already exposes.
 */
async function fetchBoardMembers(
	supabase: AnySupabase,
	ownerId: string,
	classId: string | null
): Promise<KanbanBoardMember[]> {
	const ids = new Set<string>([ownerId]);

	if (classId) {
		const { data: memberRows, error: memberErr } = await supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', classId);
		if (memberErr) {
			console.error('[kanban] fetchBoardMembers / class_members failed:', memberErr);
			// Don't 500 the whole page: degrade gracefully with the owner only.
			return [{ id: ownerId, full_name: null, avatar_url: null }];
		}
		for (const row of memberRows ?? []) {
			ids.add(row.student_id);
		}
	}

	const idList = [...ids];
	const { data: profiles, error: profErr } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, full_name, avatar_url')
		.in('id', idList);

	if (profErr) {
		console.error('[kanban] fetchBoardMembers / profiles failed:', profErr);
		return idList.map((id) => ({ id, full_name: null, avatar_url: null }));
	}

	// Build a display name with graceful fallbacks: prefer the explicit
	// full_name, otherwise concatenate firstname + lastname (most
	// student-imported accounts have those but no full_name).
	function displayName(p: {
		firstname: string | null;
		lastname: string | null;
		full_name: string | null;
	}): string | null {
		if (p.full_name && p.full_name.trim().length > 0) return p.full_name;
		const parts = [p.firstname, p.lastname].filter((s): s is string => !!s && s.trim().length > 0);
		return parts.length > 0 ? parts.join(' ') : null;
	}

	// If RLS hid some profile rows (e.g. a student can't see another
	// student's profile depending on the school's policy), fill the gap
	// with id-only entries so the picker doesn't lose the option.
	const seen = new Set((profiles ?? []).map((p) => p.id));
	const result: KanbanBoardMember[] = (profiles ?? []).map((p) => ({
		id: p.id,
		full_name: displayName(p),
		avatar_url: p.avatar_url
	}));
	for (const id of idList) {
		if (!seen.has(id)) {
			result.push({ id, full_name: null, avatar_url: null });
		}
	}
	return result;
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
