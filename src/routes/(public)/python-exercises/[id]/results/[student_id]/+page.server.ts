/**
 * Drill-down: a teacher views one student's submissions for one exercise.
 *
 * Auth mirrors the parent /results page (author OR has assigned), with an
 * additional scope check: the student must be a member of one of the
 * teacher's active classes OR have been assigned this exercise directly
 * by this teacher. We don't want a teacher to see submissions of arbitrary
 * students just because they happen to be the exercise's author.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

export interface DrillDownStudent {
	id: string;
	firstname: string | null;
	lastname: string | null;
	email: string | null;
}

export interface DrillDownSubmission {
	id: string;
	code: string;
	validation_result: unknown;
	is_correct: boolean;
	attempt_number: number;
	assignment_id: string | null;
	execution_time_ms: number | null;
	created_at: string;
}

const SUBMISSIONS_LIMIT = 50;

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/auth/signin');

	const exerciseId = validateUuidParam(params.id);
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

	// 2. Exercise
	const { data: exercise, error: exerciseErr } = await supabase
		.from('python_exercises')
		.select('id, title, author_id')
		.eq('id', exerciseId)
		.single();

	if (exerciseErr && exerciseErr.code !== 'PGRST116') {
		console.error('Failed to fetch exercise:', exerciseErr);
		throw error(500, "Erreur lors de la récupération de l'exercice");
	}
	if (!exercise) throw error(404, 'Exercice introuvable');

	// 3. Authz: author OR has assigned this exercise himself.
	// Same comment applies as in /results: the .eq('assigned_by', user.id)
	// is the sole authz gate for non-authors.
	const { data: ownAssignments } = await supabase
		.from('python_exercise_assignments')
		.select('id, class_id, student_id')
		.eq('exercise_id', exerciseId)
		.eq('assigned_by', user.id);

	const isAuthor = exercise.author_id === user.id;
	const hasAssignedIt = (ownAssignments ?? []).length > 0;
	if (!isAuthor && !hasAssignedIt) {
		throw error(403, 'Non autorisé');
	}

	// 4. Build the teacher's student scope.
	const { data: teacherClassesRaw } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id);
	const teacherClassIds = (teacherClassesRaw ?? []).map((c) => c.id);

	const scope = new Set<string>();
	if (teacherClassIds.length > 0) {
		const { data: classMembersRaw } = await supabase
			.from('class_members')
			.select('student_id')
			.in('class_id', teacherClassIds)
			.eq('status', 'active');
		for (const m of classMembersRaw ?? []) {
			if (m.student_id) scope.add(m.student_id);
		}
	}
	for (const a of ownAssignments ?? []) {
		if (a.student_id) scope.add(a.student_id);
	}

	if (!scope.has(studentId)) {
		throw error(403, "Cet élève n'est pas dans votre périmètre");
	}

	// 5. Student profile
	const { data: studentRaw, error: studentErr } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email')
		.eq('id', studentId)
		.single();

	if (studentErr || !studentRaw) {
		throw error(404, 'Élève introuvable');
	}
	const student: DrillDownStudent = studentRaw;

	// 6. Submissions on this exercise by this student (full payload).
	// Capped at SUBMISSIONS_LIMIT — beyond that we'd ship megabytes of code to
	// the page for negligible pedagogical value (V2 if needed).
	const { data: submissionsRaw, error: subsErr } = await supabase
		.from('python_exercise_submissions')
		.select(
			'id, code, validation_result, is_correct, attempt_number, assignment_id, execution_time_ms, created_at'
		)
		.eq('exercise_id', exerciseId)
		.eq('student_id', studentId)
		.order('created_at', { ascending: false })
		.limit(SUBMISSIONS_LIMIT);

	if (subsErr) {
		console.error('Failed to fetch submissions:', subsErr);
		throw error(500, 'Erreur lors de la récupération des soumissions');
	}

	const submissions: DrillDownSubmission[] = (submissionsRaw ?? []) as DrillDownSubmission[];

	return { exercise, student, submissions };
};
