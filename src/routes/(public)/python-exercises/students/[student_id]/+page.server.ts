/**
 * Per-student cross-exos view (teacher).
 *
 * Lists every Python exercise that interests THIS teacher about THIS student:
 *   - exos I authored on which the student has submitted (any mode)
 *   - exos I assigned to them (directly OR via a class they belong to)
 *
 * Auth: teacher only, plus scope check — the student must be a member of
 * one of my active classes OR I must have at least one direct assignment
 * to them. Otherwise we don't expose that the student exists at all.
 *
 * Exos authored by other teachers (without my authorship and without my
 * assignment) are intentionally excluded — that's another teacher's
 * pedagogical territory.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

export type MasteryStatus = 'mastered' | 'needs_review' | 'not_started';

export interface ExerciseSummary {
	id: string;
	title: string;
	level: string | null;
	author_id: string | null;
}

export interface ExerciseRow {
	exercise: ExerciseSummary;
	mastery_status: MasteryStatus;
	total_attempts: number;
	last_attempt_at: string | null;
	last_attempt_correct: boolean | null;
}

export interface StudentSummary {
	id: string;
	firstname: string | null;
	lastname: string | null;
	email: string | null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/auth/signin');

	const studentId = validateUuidParam(params.student_id, 'student_id');
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

	// 2. Student profile (also acts as the existence check)
	const { data: studentRaw } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email')
		.eq('id', studentId)
		.single();

	if (!studentRaw) throw error(404, 'Élève introuvable');
	const student: StudentSummary = studentRaw;

	// 3. My classes
	const { data: myClassesRaw } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id);
	const myClassIds = (myClassesRaw ?? []).map((c) => c.id);

	// 4. Class members of my classes (for the scope check)
	let classesContainingStudent: string[] = [];
	if (myClassIds.length > 0) {
		const { data: classMembersRaw } = await supabase
			.from('class_members')
			.select('student_id, class_id')
			.in('class_id', myClassIds)
			.eq('status', 'active');
		classesContainingStudent = (classMembersRaw ?? [])
			.filter((m) => m.student_id === studentId)
			.map((m) => m.class_id as string);
	}
	const isInMyClasses = classesContainingStudent.length > 0;

	// 5. My direct assignments to this student (any exo)
	const { data: directAssignmentsRaw } = await supabase
		.from('python_exercise_assignments')
		.select('id, exercise_id')
		.eq('assigned_by', user.id)
		.eq('student_id', studentId);
	const directAssignedExoIds = new Set(
		(directAssignmentsRaw ?? []).map((a) => a.exercise_id as string)
	);

	// Scope check: in one of my classes OR I have at least one direct assignment
	if (!isInMyClasses && directAssignedExoIds.size === 0) {
		throw error(403, "Cet élève n'est pas dans votre périmètre");
	}

	// 6. My class-level assignments touching this student (only on classes they belong to)
	const classAssignedExoIds = new Set<string>();
	if (classesContainingStudent.length > 0) {
		const { data: classAssignmentsRaw } = await supabase
			.from('python_exercise_assignments')
			.select('id, exercise_id, class_id')
			.eq('assigned_by', user.id)
			.in('class_id', classesContainingStudent);
		for (const a of classAssignmentsRaw ?? []) {
			if (a.exercise_id) classAssignedExoIds.add(a.exercise_id as string);
		}
	}

	const assignedExoIds = new Set<string>([...directAssignedExoIds, ...classAssignedExoIds]);

	// 7. The student's submissions across all exos (we filter by author_id below).
	const { data: submissionsRaw } = await supabase
		.from('python_exercise_submissions')
		.select('exercise_id, is_correct, attempt_number, created_at')
		.eq('student_id', studentId)
		.order('created_at', { ascending: false });

	const submissionsByExo = new Map<
		string,
		Array<{ is_correct: boolean; created_at: string; attempt_number: number }>
	>();
	for (const sub of submissionsRaw ?? []) {
		const exoId = sub.exercise_id as string | null;
		if (!exoId) continue;
		const arr = submissionsByExo.get(exoId) ?? [];
		arr.push({
			is_correct: sub.is_correct,
			created_at: sub.created_at,
			attempt_number: sub.attempt_number
		});
		submissionsByExo.set(exoId, arr);
	}
	const submittedExoIds = Array.from(submissionsByExo.keys());

	// 8. Among the submitted exos, the ones I authored (with details).
	let authoredSubmittedRows: ExerciseSummary[] = [];
	if (submittedExoIds.length > 0) {
		const { data } = await supabase
			.from('python_exercises')
			.select('id, title, level, author_id')
			.in('id', submittedExoIds)
			.eq('author_id', user.id);
		authoredSubmittedRows = (data ?? []) as ExerciseSummary[];
	}

	// 9. Full rows for the assigned union (regardless of authorship).
	let assignedRows: ExerciseSummary[] = [];
	if (assignedExoIds.size > 0) {
		const { data } = await supabase
			.from('python_exercises')
			.select('id, title, level, author_id')
			.in('id', Array.from(assignedExoIds));
		assignedRows = (data ?? []) as ExerciseSummary[];
	}

	// Merge + dedupe by id.
	const exoById = new Map<string, ExerciseSummary>();
	for (const e of authoredSubmittedRows) exoById.set(e.id, e);
	for (const e of assignedRows) exoById.set(e.id, e);
	const unionExoIds = Array.from(exoById.keys());

	if (unionExoIds.length === 0) {
		return { student, rows: [] as ExerciseRow[] };
	}

	// 10. Mastery for the union × this student.
	const { data: masteryRaw } = await supabase
		.from('python_exercise_mastery')
		.select('exercise_id, status')
		.eq('student_id', studentId)
		.in('exercise_id', unionExoIds);

	type DbMasteryStatus = 'mastered' | 'needs_review';
	const masteryByExo = new Map<string, DbMasteryStatus>(
		(masteryRaw ?? []).map((m) => [m.exercise_id as string, m.status as DbMasteryStatus])
	);

	// Compose rows.
	const rows: ExerciseRow[] = unionExoIds.map((exoId) => {
		const exercise = exoById.get(exoId)!;
		const subs = submissionsByExo.get(exoId) ?? [];
		const mastery = masteryByExo.get(exoId);
		const status: MasteryStatus =
			mastery === 'mastered'
				? 'mastered'
				: mastery === 'needs_review' || subs.length > 0
					? 'needs_review'
					: 'not_started';
		const last = subs[0]; // submissions are desc-sorted globally; subs are pushed in same order
		return {
			exercise,
			mastery_status: status,
			total_attempts: subs.length,
			last_attempt_at: last?.created_at ?? null,
			last_attempt_correct: last?.is_correct ?? null
		};
	});

	return { student, rows };
};
