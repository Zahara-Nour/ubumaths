/**
 * Teacher dashboard: per-student checkpoint results for a notebook.
 *
 * Composes four DB sources into a flat StudentRow[]:
 *   - python_notebooks (for the checkpoint cells in `content.cells[]`)
 *   - python_notebook_assignments (class-targeted; one assignment per class)
 *   - class_members of the teacher's classes
 *   - python_notebook_checkpoint_runs (per student × cell, latest only)
 *
 * The set of students rendered is `members of teacher's classes that have
 * this notebook assigned`. Public-notebook users outside the teacher's
 * classes are intentionally excluded — the dashboard is class-scoped.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';
import type { CheckpointStatus, NotebookCell, CheckpointCell } from '$lib/types/notebook';
import type { CheckpointDetail } from '$lib/types/database-helpers';

export interface CheckpointEntry {
	cell_id: string;
	title: string | null;
	mode: 'assert' | 'unit_test' | 'variable_check';
}

export interface TeacherClass {
	id: string;
	name: string;
}

export interface ClassMembership {
	student_id: string;
	class_id: string;
}

export interface StudentRow {
	student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		email: string | null;
	};
	/** Map cell_id → detail. `undefined` means the student hasn't run that checkpoint. */
	details: Record<string, CheckpointDetail>;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/auth/signin');

	const notebookId = validateUuidParam(params.id);
	const supabase = locals.supabase;

	// 1. Profile + role
	const { data: profile, error: profileErr } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileErr) {
		console.error('Failed to fetch profile:', profileErr);
		throw error(500, 'Erreur lors de la récupération du profil');
	}
	if (!profile || profile.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// 2. Notebook + content
	const { data: notebook, error: nbErr } = await supabase
		.from('python_notebooks')
		.select('id, title, author_id, content')
		.eq('id', notebookId)
		.maybeSingle();

	if (nbErr) {
		console.error('Failed to fetch notebook:', nbErr);
		throw error(500, 'Erreur lors de la récupération du notebook');
	}
	if (!notebook) throw error(404, 'Notebook introuvable');

	// 3. Authz: author OR has assigned this notebook.
	// .eq('shared_by', user.id) is the SOLE authz gate for non-authors.
	const { data: ownAssignments } = await supabase
		.from('python_notebook_assignments')
		.select('id, class_id')
		.eq('notebook_id', notebookId)
		.eq('shared_by', user.id);

	const isAuthor = notebook.author_id === user.id;
	const hasAssignedIt = (ownAssignments ?? []).length > 0;
	if (!isAuthor && !hasAssignedIt) {
		throw error(403, 'Non autorisé');
	}

	// 4. Extract checkpoint cells from the notebook content (JSONB).
	// V1: ignore mode-specific config (the dashboard only needs id/title/mode
	// to render the column header).
	const content = (notebook.content ?? {}) as { cells?: NotebookCell[] };
	const allCells = Array.isArray(content.cells) ? content.cells : [];
	const checkpoints: CheckpointEntry[] = allCells
		.filter((c): c is CheckpointCell => c.type === 'checkpoint')
		.map((c) => ({
			cell_id: c.id,
			title: c.title ?? null,
			mode: c.checkpoint.mode
		}));

	// 5. Teacher's classes (for the class-filter dropdown + scoping students)
	const { data: teacherClassesRaw } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id);
	const teacherClasses: TeacherClass[] = teacherClassesRaw ?? [];
	const teacherClassIds = teacherClasses.map((c) => c.id);

	// 6. Class members of those classes
	const { data: classMembersRaw } =
		teacherClassIds.length > 0
			? await supabase
					.from('class_members')
					.select('student_id, class_id')
					.in('class_id', teacherClassIds)
					.eq('status', 'active')
			: { data: [] };

	const studentIds = new Set<string>();
	for (const m of classMembersRaw ?? []) {
		if (m.student_id) studentIds.add(m.student_id);
	}
	const studentIdsArr = Array.from(studentIds);

	const classMembers: ClassMembership[] = (classMembersRaw ?? [])
		.filter((m): m is { student_id: string; class_id: string } =>
			Boolean(m.student_id && m.class_id)
		)
		.map((m) => ({ student_id: m.student_id, class_id: m.class_id }));

	if (studentIdsArr.length === 0 || checkpoints.length === 0) {
		// Either no students in scope, or no checkpoint cells in the notebook.
		// Both are valid early-return cases for the table.
		return {
			notebook: { id: notebook.id, title: notebook.title },
			checkpoints,
			rows: [] as StudentRow[],
			teacherClasses,
			classMembers
		};
	}

	// 7. Profiles for those students
	const { data: profilesRaw } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email')
		.in('id', studentIdsArr);
	const profilesById = new Map((profilesRaw ?? []).map((p) => [p.id, p as StudentRow['student']]));

	// 8. Checkpoint runs for those students on this notebook.
	const { data: runsRaw } = await supabase
		.from('python_notebook_checkpoint_runs')
		.select(
			'user_id, cell_id, status, attempt_count, first_attempted_at, succeeded_at, hint_revealed'
		)
		.eq('notebook_id', notebookId)
		.in('user_id', studentIdsArr);

	type Run = {
		user_id: string;
		cell_id: string;
		status: CheckpointStatus;
		attempt_count: number;
		first_attempted_at: string | null;
		succeeded_at: string | null;
		hint_revealed: boolean;
	};
	const runsByStudent = new Map<string, Run[]>();
	for (const r of (runsRaw ?? []) as Run[]) {
		const arr = runsByStudent.get(r.user_id) ?? [];
		arr.push(r);
		runsByStudent.set(r.user_id, arr);
	}

	// 9. Merge.
	const rows: StudentRow[] = studentIdsArr.flatMap((sid) => {
		const prof = profilesById.get(sid);
		if (!prof) return [];
		const runs = runsByStudent.get(sid) ?? [];
		const details: Record<string, CheckpointDetail> = {};
		for (const r of runs) {
			details[r.cell_id] = {
				status: r.status,
				attemptCount: r.attempt_count,
				firstAttemptedAt: r.first_attempted_at,
				succeededAt: r.succeeded_at,
				hintRevealed: r.hint_revealed
			};
		}
		return [{ student: prof, details }];
	});

	return {
		notebook: { id: notebook.id, title: notebook.title },
		checkpoints,
		rows,
		teacherClasses,
		classMembers
	};
};
