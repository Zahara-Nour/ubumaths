/**
 * Student dashboard: my progression across all Python exercises I have a
 * trace on (submitted, has a mastery row, or assigned to me directly or via
 * one of my classes).
 *
 * Auth: students only — teachers are redirected to /python-exercises/mine
 * (their own toolset). Anonymous callers are sent to /auth/signin.
 *
 * RLS does most of the heavy lifting: each query is filtered by `student_id
 * = me` (or the public catalog for the final exo-details lookup), and
 * Supabase policies guarantee the student can read those rows.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export type MasteryStatus = 'mastered' | 'needs_review' | 'not_started';

export interface ExerciseSummary {
	id: string;
	title: string;
	level: string | null;
}

export interface ExerciseRow {
	exercise: ExerciseSummary;
	mastery_status: MasteryStatus;
	total_attempts: number;
	last_attempt_at: string | null;
	last_attempt_correct: boolean | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/auth/signin');

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
	if (!profile || profile.role !== 'student') {
		throw redirect(303, '/python-exercises/mine');
	}

	// 2. My classes (active membership) — for the assignment scope below
	const { data: myClassesRaw } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', user.id)
		.eq('status', 'active');
	const myClassIds = (myClassesRaw ?? []).map((m) => m.class_id as string);

	// 3. Assignments touching me: directly OR via one of my classes.
	const orFilter =
		myClassIds.length > 0
			? `student_id.eq.${user.id},class_id.in.(${myClassIds.join(',')})`
			: `student_id.eq.${user.id}`;
	const { data: assignmentsRaw } = await supabase
		.from('python_exercise_assignments')
		.select('id, exercise_id, class_id, student_id')
		.or(orFilter);
	const assignedExoIds = new Set(
		(assignmentsRaw ?? []).map((a) => a.exercise_id as string).filter(Boolean)
	);

	// 4. My submissions across all exos (group + count + last in JS).
	const { data: submissionsRaw } = await supabase
		.from('python_exercise_submissions')
		.select('exercise_id, is_correct, attempt_number, created_at')
		.eq('student_id', user.id)
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
	const submittedExoIds = new Set(submissionsByExo.keys());

	// 5. My mastery rows
	const { data: masteryRaw } = await supabase
		.from('python_exercise_mastery')
		.select('exercise_id, status')
		.eq('student_id', user.id);

	type DbMasteryStatus = 'mastered' | 'needs_review';
	const masteryByExo = new Map<string, DbMasteryStatus>(
		(masteryRaw ?? []).map((m) => [m.exercise_id as string, m.status as DbMasteryStatus])
	);
	const masteryExoIds = new Set(masteryByExo.keys());

	// 6. Union — any exo with a trace.
	const unionExoIds = new Set<string>([...assignedExoIds, ...submittedExoIds, ...masteryExoIds]);

	if (unionExoIds.size === 0) {
		return { rows: [] as ExerciseRow[] };
	}

	// 7. Fetch exo details in one round-trip.
	const { data: exosRaw } = await supabase
		.from('python_exercises')
		.select('id, title, level')
		.in('id', Array.from(unionExoIds));
	const exoById = new Map<string, ExerciseSummary>(
		(exosRaw ?? []).map((e) => [e.id as string, e as ExerciseSummary])
	);

	// 8. Compose rows.
	const rows: ExerciseRow[] = Array.from(unionExoIds).flatMap((exoId) => {
		const exercise = exoById.get(exoId);
		if (!exercise) return []; // RLS could have hidden the exo (e.g. private + no assignment)
		const subs = submissionsByExo.get(exoId) ?? [];
		const mastery = masteryByExo.get(exoId);
		const status: MasteryStatus =
			mastery === 'mastered'
				? 'mastered'
				: mastery === 'needs_review' || subs.length > 0
					? 'needs_review'
					: 'not_started';
		const last = subs[0];
		return [
			{
				exercise,
				mastery_status: status,
				total_attempts: subs.length,
				last_attempt_at: last?.created_at ?? null,
				last_attempt_correct: last?.is_correct ?? null
			}
		];
	});

	return { rows };
};
