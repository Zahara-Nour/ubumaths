import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const exerciseId = params.id;

	// Check access
	const accessResponse = await fetch(`/api/exercises/${exerciseId}/access`);
	const accessData = await accessResponse.json();

	if (!accessData.has_access) {
		throw error(403, "Vous n'avez pas accès à cet exercice");
	}

	// Fetch exercise
	const { data: exercise, error: exerciseError } = await locals.supabase
		.from('exercises')
		.select('*')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercice non trouvé');
	}

	// Fetch assignment (if any)
	const { data: assignment } = await locals.supabase
		.from('exercise_assignments')
		.select('*')
		.eq('exercise_id', exerciseId)
		.or(`student_id.eq.${session.user.id},assigned_to_type.eq.public`)
		.maybeSingle();

	// Fetch completion
	const { data: completion } = await locals.supabase
		.from('exercise_completions')
		.select('*')
		.eq('exercise_id', exerciseId)
		.eq('student_id', session.user.id)
		.maybeSingle();

	// Get student's classes (for per_group mode)
	const { data: classMemberships } = await locals.supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', session.user.id);

	const classIds = classMemberships?.map((cm) => cm.class_id) || [];

	return {
		exercise,
		assignment,
		completion,
		classIds,
		userId: session.user.id
	};
};
