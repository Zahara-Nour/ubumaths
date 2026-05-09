/**
 * Teacher dashboard: results for a single Python exercise.
 *
 * Composes four DB sources into a flat StudentRow[]:
 *   - python_exercise_assignments (class- or student-targeted)
 *   - class_members of the teacher's classes
 *   - python_exercise_submissions (per student, sorted desc by created_at)
 *   - python_exercise_mastery (sticky 'mastered' or 'needs_review')
 *
 * The set of students rendered is `(members of teacher's classes)
 *  ∪ (directly-assigned students by this teacher)`. Free-practice users
 * outside this set are intentionally excluded.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

export type MasteryStatus = 'mastered' | 'in_progress' | 'not_started';

export interface StudentRow {
	student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		email: string | null;
	};
	mastery_status: MasteryStatus;
	total_attempts: number;
	last_attempt_at: string | null;
	last_attempt_correct: boolean | null;
}

export interface TeacherClass {
	id: string;
	name: string;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/auth/signin');

	const exerciseId = validateUuidParam(params.id);
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

	// 2. Exercise
	const { data: exercise, error: exerciseErr } = await supabase
		.from('python_exercises')
		.select('id, title, author_id')
		.eq('id', exerciseId)
		.single();

	if (exerciseErr && exerciseErr.code !== 'PGRST116') {
		// PGRST116 = no rows; treat as 404 below. Anything else is a real DB error.
		console.error('Failed to fetch exercise:', exerciseErr);
		throw error(500, "Erreur lors de la récupération de l'exercice");
	}
	if (!exercise) throw error(404, 'Exercice introuvable');

	// 3. Authz: author OR has assigned this exercise himself.
	// IMPORTANT: the .eq('assigned_by', user.id) below is the SOLE authz gate for
	// non-authors. RLS on python_exercise_assignments allows a teacher to read
	// rows for any class they own (incl. assignments created by colleagues), so
	// without this filter a teacher could pass authz on exercises they did not
	// assign themselves. Do not remove.
	const { data: ownAssignments } = await supabase
		.from('python_exercise_assignments')
		.select('id, class_id, student_id, due_date')
		.eq('exercise_id', exerciseId)
		.eq('assigned_by', user.id);

	const isAuthor = exercise.author_id === user.id;
	const hasAssignedIt = (ownAssignments ?? []).length > 0;
	if (!isAuthor && !hasAssignedIt) {
		throw error(403, 'Non autorisé');
	}

	// 4. Teacher's classes (for the class-filter dropdown + scoping students)
	const { data: teacherClassesRaw } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id);
	const teacherClasses: TeacherClass[] = teacherClassesRaw ?? [];
	const teacherClassIds = teacherClasses.map((c) => c.id);

	// 5. Class members of those classes
	const { data: classMembersRaw } =
		teacherClassIds.length > 0
			? await supabase
					.from('class_members')
					.select('student_id, class_id')
					.in('class_id', teacherClassIds)
					.eq('status', 'active')
			: { data: [] };

	// 6. Build the set of students in scope: class members + students directly assigned.
	const studentIds = new Set<string>();
	for (const m of classMembersRaw ?? []) {
		if (m.student_id) studentIds.add(m.student_id);
	}
	for (const a of ownAssignments ?? []) {
		if (a.student_id) studentIds.add(a.student_id);
	}

	const studentIdsArr = Array.from(studentIds);

	if (studentIdsArr.length === 0) {
		// No students in scope → empty table; still return the shell.
		return {
			exercise,
			rows: [] as StudentRow[],
			teacherClasses
		};
	}

	// 7. Profiles for those students
	const { data: profilesRaw } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email')
		.in('id', studentIdsArr);
	const profilesById = new Map((profilesRaw ?? []).map((p) => [p.id, p as StudentRow['student']]));

	// 8. Submissions for those students on this exercise (desc by created_at, so [0] is latest)
	const { data: submissionsRaw } = await supabase
		.from('python_exercise_submissions')
		.select('student_id, is_correct, attempt_number, created_at')
		.eq('exercise_id', exerciseId)
		.in('student_id', studentIdsArr)
		.order('created_at', { ascending: false });

	const submissionsByStudent = new Map<
		string,
		Array<{ is_correct: boolean; created_at: string; attempt_number: number }>
	>();
	for (const sub of submissionsRaw ?? []) {
		const sid = sub.student_id;
		if (!sid) continue;
		const arr = submissionsByStudent.get(sid) ?? [];
		arr.push({
			is_correct: sub.is_correct,
			created_at: sub.created_at,
			attempt_number: sub.attempt_number
		});
		submissionsByStudent.set(sid, arr);
	}

	// 9. Mastery rows (sticky 'mastered' or 'needs_review')
	const { data: masteryRaw } = await supabase
		.from('python_exercise_mastery')
		.select('student_id, status')
		.eq('exercise_id', exerciseId)
		.in('student_id', studentIdsArr);
	type DbMasteryStatus = 'mastered' | 'needs_review';
	const masteryByStudent = new Map<string, DbMasteryStatus>(
		(masteryRaw ?? []).map((m) => [m.student_id, m.status as DbMasteryStatus])
	);

	// 10. Merge.
	// We deliberately collapse the DB's `needs_review` into the applicative
	// `in_progress` bucket: the dashboard surfaces three statuses to the teacher
	// (mastered / in_progress / not_started). Any sticky non-mastered DB row
	// + any in-flight attempts both read as "in_progress" — the prof sees a
	// student who has tried, regardless of whether the trigger has stamped
	// needs_review. If we ever need to distinguish "tried and failed" from
	// "currently working", introduce a 4th value here.
	const rows: StudentRow[] = studentIdsArr.flatMap((sid) => {
		const prof = profilesById.get(sid);
		if (!prof) return [];
		const subs = submissionsByStudent.get(sid) ?? [];
		const mastery = masteryByStudent.get(sid);
		const status: MasteryStatus =
			mastery === 'mastered'
				? 'mastered'
				: subs.length > 0 || mastery === 'needs_review'
					? 'in_progress'
					: 'not_started';
		const last = subs[0];
		return [
			{
				student: prof,
				mastery_status: status,
				total_attempts: subs.length,
				last_attempt_at: last?.created_at ?? null,
				last_attempt_correct: last?.is_correct ?? null
			}
		];
	});

	return { exercise, rows, teacherClasses };
};
