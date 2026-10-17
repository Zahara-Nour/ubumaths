/**
 * API Route: /api/worksheets/[id]/duplicate
 * POST - Duplicate a worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchResourceTagNames, syncResourceTags } from '$lib/server/resource-tags';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateWorksheetId,
	createWorksheetResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/[id]/duplicate/+server');

/**
 * POST /api/worksheets/[id]/duplicate
 * Duplicate an existing worksheet
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate URL parameter
	const paramValidation = validateWorksheetId(params);
	if (!paramValidation.success) {
		throw error(400, 'Identifiant de fiche invalide');
	}

	const { id: worksheetId } = paramValidation.data;

	// Get the original worksheet
	const { data: original, error: fetchError } = await locals.supabase
		.from('worksheets')
		.select('*')
		.eq('id', worksheetId)
		.single();

	if (fetchError || !original) {
		throw error(404, 'Fiche introuvable');
	}

	// Verify access (user must be creator or admin from same school)
	if (original.created_by !== user.id) {
		if (profile.role !== 'admin' || original.school_id !== profile.school_id) {
			throw error(403, 'Accès refusé');
		}
	}

	// Lire TOUT le contenu avant d'écrire quoi que ce soit : une lecture qui
	// échoue s'arrête ici, sans copie à nettoyer.
	const { data: sections, error: sectionsError } = await locals.supabase
		.from('worksheet_sections')
		.select('*')
		.eq('worksheet_id', worksheetId)
		.order('position');

	const { data: exercises, error: exercisesError } = await locals.supabase
		.from('worksheet_exercises')
		.select('*')
		.eq('worksheet_id', worksheetId)
		.order('position');

	// Une section ou un exercice illisible sortirait de la copie sans le dire.
	if (sectionsError || exercisesError) {
		logger.error('Contenu à dupliquer illisible :', sectionsError ?? exercisesError);
		throw error(500, 'Impossible de dupliquer la fiche');
	}

	// Ce que la copie recopie : tout ce qui définit le contenu (fiche, sections,
	// exercices, traductions comprises). Ce qu'elle NE recopie PAS, volontairement :
	// - `id`, `created_at`, `updated_at` : propres à chaque ligne ;
	// - fiche : `status` (toujours brouillon), `version` (repart à 1),
	//   `published_at` et `archived_at` (une copie neuve n'est ni publiée ni
	//   archivée), `created_by` / `school_id` (la copie appartient à qui duplique),
	//   `title` (suffixé « (copie) » ; la traduction du titre reste celle d'origine) ;
	// - sections et exercices : `worksheet_id` (la copie) et `section_id`
	//   (remappé vers la section copiée).
	// Test colonne par colonne : tests/integration/duplication-fiche-complete.test.ts.
	const { data: duplicate, error: createError } = await locals.supabase
		.from('worksheets')
		.insert({
			title: `${original.title} (copie)`,
			description: original.description,
			translations: original.translations,
			type: original.type,
			config: original.config,
			status: 'draft',
			version: 1,
			template_id: original.template_id,
			// Le style suit la copie (le trigger laisse l'admin prendre le style du prof)
			style_id: original.style_id,
			estimated_duration_minutes: original.estimated_duration_minutes,
			total_points: original.total_points,
			grades: original.grades,
			created_by: user.id,
			school_id: profile.school_id
		})
		.select()
		.single();

	if (createError || !duplicate) {
		logger.error('Failed to duplicate worksheet:', createError);
		throw error(500, 'Impossible de dupliquer la fiche');
	}

	const copyId = duplicate.id;

	/**
	 * Copie incomplète : on supprime la fiche créée par CETTE requête (jamais
	 * l'original ; sections et exercices partent en cascade), puis 500. La RLS
	 * échouant en silence, le nettoyage vérifie qu'il a bien supprimé la ligne.
	 */
	async function abortCopy(step: string, cause: unknown): Promise<never> {
		logger.error(`Duplication interrompue (${step}) :`, cause);
		const { data: deleted, error: deleteError } = await locals.supabase
			.from('worksheets')
			.delete()
			.eq('id', copyId)
			.select('id');
		if (deleteError || !deleted || deleted.length !== 1) {
			logger.error('Duplication : copie incomplète non supprimée', {
				copyId: copyId,
				error: deleteError
			});
		}
		throw error(500, 'Impossible de dupliquer la fiche : la copie incomplète a été annulée');
	}

	// Sections, une à une pour connaître l'id de chaque section copiée
	const sectionMapping: Record<string, string> = {};
	for (const section of sections ?? []) {
		const { data: newSection, error: newSectionError } = await locals.supabase
			.from('worksheet_sections')
			.insert({
				worksheet_id: duplicate.id,
				title: section.title,
				instructions: section.instructions,
				translations: section.translations,
				position: section.position,
				points_total: section.points_total
			})
			.select('id')
			.single();

		if (newSectionError || !newSection) {
			await abortCopy('section', newSectionError);
		} else {
			sectionMapping[section.id] = newSection.id;
		}
	}

	// Exercices, en une insertion ; chaque ligne doit revenir
	if (exercises && exercises.length > 0) {
		const exerciseInserts = exercises.map((ex) => ({
			worksheet_id: duplicate.id,
			exercise_id: ex.exercise_id,
			section_id: ex.section_id ? (sectionMapping[ex.section_id] ?? null) : null,
			position: ex.position,
			points: ex.points,
			variant_mode: ex.variant_mode,
			variant_config: ex.variant_config,
			variation_index: ex.variation_index,
			custom_instructions: ex.custom_instructions,
			translations: ex.translations,
			is_essential: ex.is_essential,
			correction_visible: ex.correction_visible,
			// Les cadres de réponse réglés par le prof suivent la copie (ADR 0030, lot 4)
			answer_frame_lines: ex.answer_frame_lines
		}));

		const { data: insertedExercises, error: insertExercisesError } = await locals.supabase
			.from('worksheet_exercises')
			.insert(exerciseInserts)
			.select('id');

		if (
			insertExercisesError ||
			!insertedExercises ||
			insertedExercises.length !== exerciseInserts.length
		) {
			await abortCopy(
				'exercices',
				insertExercisesError ?? {
					expected: exerciseInserts.length,
					received: insertedExercises?.length ?? 0
				}
			);
		}
	}

	// Les étiquettes de la fiche d'origine suivent la copie. Elles ne sont plus
	// une colonne (migration 20260908180000), donc le `insert` qui duplique la
	// ligne ne les emporte plus : sans cette recopie explicite, dupliquer une
	// fiche perdrait silencieusement ses étiquettes.
	const tags = await fetchResourceTagNames(locals.supabase, 'worksheet', worksheetId).catch(
		() => []
	);
	if (tags.length > 0) {
		await syncResourceTags(locals.supabase, 'worksheet', duplicate.id, tags);
	}

	// Validate response
	const validated = validateJsonResponse(
		createWorksheetResponseSchema,
		{ worksheet: { ...duplicate, tags } },
		'POST /api/worksheets/[id]/duplicate'
	);

	return json(validated, { status: 201 });
};
