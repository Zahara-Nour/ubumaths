import { withLatestVersion } from '#lib/server/exercise-versions.ts';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { toExercise } from '#lib/types/exercise-row.ts';
import { fetchResourceTagNames } from '#lib/server/resource-tags.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { pickStudentAssignment } from '#lib/server/exercise-assignments.ts';

const logger = createServerLogger('(protected)/dashboard/student/exercises/[id]/+page.server');

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Connexion requise');
	}

	const exerciseId = validateUuidParam(params.id);

	// Check access
	const accessResponse = await fetch(`/api/exercises/${exerciseId}/access`);
	const accessData = await accessResponse.json();

	if (!accessData.has_access) {
		throw error(403, 'Accès refusé à cet exercice');
	}

	// Fetch exercise
	const { data: exerciseRow, error: exerciseError } = await locals.supabase
		.from('exercises')
		// Les étiquettes ne sont pas une colonne d'`exercises` : elles vivent dans
		// `resource_tags`, lue juste après. La jointure PostgREST précédente visait
		// `exercise_tags`, supprimée depuis — et une jointure est une CHAÎNE, donc
		// invisible au typecheck.
		.select('*')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exerciseRow) {
		throw error(404, 'Exercice non trouvé');
	}
	// Contenu : la DERNIÈRE version (hors fiche, ADR 0044)
	const exercise = await withLatestVersion(locals.supabase, exerciseRow);

	const tags = await fetchResourceTagNames(locals.supabase, 'exercise', exerciseId).catch(() => []);

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
		logger.error('Contexte illisible :', completionError);
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
		logger.error('Contrôle d’accès impossible :', classMembershipsError);
		throw error(500, 'Impossible de vérifier l’accès');
	}

	const classIds = classMemberships?.map((cm) => cm.class_id) || [];

	// Affectation hors fiche (s'il y en a une) : celle de l'élève, sinon celle d'une de ses
	// classes. La RLS ne rend que les lignes qui le concernent ; plusieurs lignes possibles
	// (élève ET classe), d'où une liste et un choix, jamais `maybeSingle()`.
	const { data: assignmentRows, error: assignmentError } = await locals.supabase
		.from('exercise_assignments')
		.select('*')
		.eq('exercise_id', exerciseId)
		.eq('is_active', true)
		.in('assigned_to_type', ['student', 'class']);

	// Élément de contexte : le repli d'affichage existe déjà, mais son absence
	// ne doit pas se confondre avec une donnée réellement vide.
	if (assignmentError) {
		logger.error('Contexte illisible :', assignmentError);
	}
	const assignment = pickStudentAssignment(assignmentRows ?? [], user.id, classIds);

	return {
		exercise: toExercise(exercise, tags),
		assignment,
		completion,
		classIds,
		userId: user.id
	};
};
