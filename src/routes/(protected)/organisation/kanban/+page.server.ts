/**
 * Kanban Boards List - Server Load
 * =================================
 *
 * Loads the boards accessible to the current user along with the classes they
 * teach (used by the create-board dialog for the "class board" option).
 *
 * Defensive note: the kanban_* tables may not yet exist in the database (the
 * migration may not have been pushed). In that case `getAccessibleBoards` will
 * throw a 500 — we catch it here and return an empty list rather than break
 * the entire page. The dialog will still let the user attempt creation, and
 * the API will surface the underlying error in the toast.
 */

import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { getAccessibleBoards } from '$lib/server/kanban';
import type { KanbanBoardWithCounts } from '$lib/types/database-helpers';

export interface TeacherClassOption {
	id: string;
	name: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await requireAuth(locals);

	// 1. Boards. We only catch errors from `getAccessibleBoards` itself (typically
	// missing migration in dev) so the page renders empty rather than 500-ing.
	// Upstream auth errors from `requireAuth` are intentionally NOT caught — they
	// must propagate so the framework can redirect to login.
	let boards: KanbanBoardWithCounts[] = [];
	try {
		boards = await getAccessibleBoards(locals.supabase);
	} catch (err) {
		console.error('[organisation/kanban] failed to load boards:', err);
		boards = [];
	}

	// 2. Classes for the create dialog (teachers only - students never create
	//    class boards). For teachers, list classes they own.
	let teacherClasses: TeacherClassOption[] = [];
	if (profile.role === 'teacher') {
		const { data: classRows, error: classError } = await locals.supabase
			.from('classes')
			.select('id, name')
			.eq('teacher_id', user.id)
			.order('name', { ascending: true });

		if (classError) {
			console.error('[organisation/kanban] failed to load classes:', classError);
		} else {
			teacherClasses = (classRows ?? []) as TeacherClassOption[];
		}
	}

	return {
		boards,
		classes: teacherClasses,
		role: profile.role,
		userId: user.id
	};
};
