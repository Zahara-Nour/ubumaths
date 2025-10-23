import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

/**
 * Load riddle statistics for teacher
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Overview stats
	const { data: riddles } = await supabase
		.from('riddles')
		.select('id, status')
		.eq('created_by', session.user.id);

	const totalRiddles = riddles?.length || 0;
	const publishedRiddles = riddles?.filter((r) => r.status === 'published').length || 0;

	// Pending validations count
	const { data: pendingValidations } = await supabase
		.from('riddle_attempts')
		.select(
			`
			id,
			riddle:riddles!inner(created_by)
		`
		)
		.is('is_correct', null)
		.eq('riddles.created_by', session.user.id);

	const pendingCount = pendingValidations?.length || 0;

	// Stats per riddle
	const { data: riddleStats } = await supabase
		.from('riddle_stats')
		.select('*')
		.eq('created_by', session.user.id)
		.order('total_attempts', { ascending: false });

	// Top students for this teacher's riddles
	const { data: studentStats } = await supabase
		.from('riddle_attempts')
		.select(
			`
			student_id,
			is_correct,
			attempt_number,
			gidouilles_awarded,
			riddle:riddles!inner(created_by),
			student:profiles!riddle_attempts_student_id_fkey(id, firstname, lastname, avatar_url)
		`
		)
		.eq('riddles.created_by', session.user.id)
		.eq('is_correct', true);

	// Aggregate by student
	const studentMap = new Map();
	(studentStats || []).forEach((attempt: any) => {
		const studentId = attempt.student_id;
		if (!studentMap.has(studentId)) {
			studentMap.set(studentId, {
				student: attempt.student,
				totalSuccess: 0,
				totalGidouilles: 0,
				firstAttemptSuccess: 0
			});
		}
		const stats = studentMap.get(studentId);
		stats.totalSuccess++;
		stats.totalGidouilles += attempt.gidouilles_awarded || 0;
		if (attempt.attempt_number === 1) {
			stats.firstAttemptSuccess++;
		}
	});

	const topStudents = Array.from(studentMap.values())
		.sort((a, b) => b.totalGidouilles - a.totalGidouilles)
		.slice(0, 10);

	// Total gidouilles distributed
	const totalGidouilles = (studentStats || []).reduce(
		(sum: number, a: any) => sum + (a.gidouilles_awarded || 0),
		0
	);

	return {
		overview: {
			totalRiddles,
			publishedRiddles,
			draftRiddles: totalRiddles - publishedRiddles,
			pendingValidations: pendingCount,
			totalGidouillesDistributed: totalGidouilles
		},
		riddleStats: riddleStats || [],
		topStudents
	};
};
