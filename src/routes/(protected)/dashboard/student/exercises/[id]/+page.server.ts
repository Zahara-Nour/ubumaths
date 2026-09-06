import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';
import { toExercise } from '$lib/types/exercise-row';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const exerciseId = validateUuidParam(params.id);

	// Check access
	const accessResponse = await fetch(`/api/exercises/${exerciseId}/access`);
	const accessData = await accessResponse.json();

	if (!accessData.has_access) {
		throw error(403, "Vous n'avez pas accès à cet exercice");
	}

	// Fetch exercise
	const { data: exercise, error: exerciseError } = await locals.supabase
		.from('exercises')
		// Les étiquettes ne sont pas une colonne d'`exercises` : elles vivent dans
		// la table de jonction `exercise_tags`. La page les affichait via
		// `exercise.tags`, qui valait donc toujours `undefined`. Même forme que
		// `$lib/server/exercises.ts`, pour éviter une seconde requête.
		.select('*, exercise_tags(tags(name))')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercice non trouvé');
	}

	// Fetch assignment (if any)
	const { data: assignment, error: assignmentError } = await locals.supabase
		.from('exercise_assignments')
		.select('*')
		.eq('exercise_id', exerciseId)
		.or(`student_id.eq.${user.id},assigned_to_type.eq.public`)
		.maybeSingle();

	// Élément de contexte : le repli d'affichage existe déjà, mais son absence
	// ne doit pas se confondre avec une donnée réellement vide.
	if (assignmentError && assignmentError.code !== 'PGRST116') {
		console.error('Contexte illisible :', assignmentError);
	}

	// Fetch completion
	const { data: completion, error: completionError } = await locals.supabase
		.from('exercise_completions')
		.select('*')
		.eq('exercise_id', exerciseId)
		.eq('student_id', user.id)
		.maybeSingle();

	// Élément de contexte : le repli d'affichage existe déjà, mais son absence
	// ne doit pas se confondre avec une donnée réellement vide.
	if (completionError && completionError.code !== 'PGRST116') {
		console.error('Contexte illisible :', completionError);
	}

	// Get student's active classes (for per_group mode)
	const { data: classMemberships, error: classMembershipsError } = await locals.supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', user.id)
		.eq('status', 'active');

	// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
	// panne doit se distinguer d'un refus mérité.
	if (classMembershipsError && classMembershipsError.code !== 'PGRST116') {
		console.error('Contrôle d’accès impossible :', classMembershipsError);
		throw error(500, 'Impossible de vérifier votre accès');
	}

	const classIds = classMemberships?.map((cm) => cm.class_id) || [];

	return {
		exercise: toExercise(
			exercise,
			(exercise.exercise_tags ?? []).map((et) => et.tags?.name).filter((n) => n !== undefined)
		),
		assignment,
		completion,
		classIds,
		userId: user.id
	};
};
