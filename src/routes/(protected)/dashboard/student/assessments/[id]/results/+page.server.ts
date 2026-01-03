import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	const id = validateUuidParam(params.id);

	// Verify user is a student
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'student') {
		throw redirect(303, '/dashboard');
	}

	// Fetch assignment details
	const { data: assignment, error: assignmentError } = await locals.supabase
		.from('assessment_assignments')
		.select(
			`
			*,
			assessment:assessments(*)
		`
		)
		.eq('id', id)
		.single();

	if (assignmentError || !assignment) {
		throw error(404, 'Assignation introuvable');
	}

	// Verify student has access to this assignment
	// Check if directly assigned or assigned via class
	const isDirectlyAssigned = assignment.student_id === user.id;

	let isAssignedViaClass = false;
	if (assignment.class_id) {
		const { data: membership } = await locals.supabase
			.from('class_members')
			.select('id')
			.eq('class_id', assignment.class_id)
			.eq('student_id', user.id)
			.eq('status', 'active')
			.single();

		isAssignedViaClass = !!membership;
	}

	if (!isDirectlyAssigned && !isAssignedViaClass) {
		throw error(403, 'Non autorisé');
	}

	// Fetch all attempts for this assignment
	const { data: attempts, error: attemptsError } = await locals.supabase
		.from('test_sessions')
		.select('*')
		.eq('assignment_id', id)
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (attemptsError) {
		console.error('Failed to fetch attempts:', attemptsError);
		return {
			assignment,
			attempts: []
		};
	}

	return {
		assignment,
		attempts: attempts || []
	};
};
