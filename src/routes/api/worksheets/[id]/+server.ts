/**
 * API Route: /api/worksheets/[id]
 * GET - Get worksheet with sections and exercises
 * PUT - Update worksheet
 * DELETE - Delete worksheet (draft only)
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { loadStyleTemplate } from '#lib/server/worksheets/worksheet-styles.ts';
import { fetchResourceTagNames, syncResourceTags } from '#lib/server/resource-tags.ts';
import {
	applyClassification,
	loadWorksheetClassifications,
	prepareClassification,
	type ClassificationFields
} from '#lib/server/worksheets/worksheet-classification.ts';
import {
	validateUpdateWorksheet,
	worksheetDetailResponseSchema,
	deleteWorksheetResponseSchema
} from '#lib/server/validation/worksheets.ts';
import { uuidSchema } from '#lib/server/validation/common.ts';
import { validateJsonResponse } from '#lib/server/validation/response-utils.ts';
import type { TablesUpdate } from '#lib/types/database.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { WORKSHEET_LINE_VERSION, withLineVersion } from '#lib/server/exercise-versions.ts';

const logger = createServerLogger('api/worksheets/[id]/+server');

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify worksheet exists and user has permission to access it
 * Returns the worksheet if found and authorized
 */
async function getWorksheetWithAuth(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	userId: string,
	role: string,
	schoolId: string | null
) {
	// Validate UUID format
	const idValidation = uuidSchema.safeParse(worksheetId);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de fiche invalide');
	}

	// Fetch worksheet
	const { data: worksheet, error: dbError } = await supabase
		.from('worksheets')
		.select('*')
		.eq('id', worksheetId)
		.single();

	if (dbError || !worksheet) {
		throw error(404, 'Fiche introuvable');
	}

	// Verify ownership/authorization
	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Accès réservé à l’auteur de la fiche');
	}

	if (role === 'admin' && schoolId && worksheet.school_id !== schoolId) {
		throw error(403, 'Cette fiche appartient à une autre école');
	}

	return worksheet;
}

/**
 * GET /api/worksheets/[id]
 * Get worksheet with sections, exercises and template
 * Teachers and admins only
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const worksheet = await getWorksheetWithAuth(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Fetch sections
	const { data: sections, error: sectionsError } = await locals.supabase
		.from('worksheet_sections')
		.select('*')
		.eq('worksheet_id', worksheet.id)
		.order('position', { ascending: true });

	if (sectionsError) {
		logger.error('Failed to fetch sections:', sectionsError);
		throw error(500, 'Impossible de charger les sections de la fiche');
	}

	// Fetch exercises with joined exercise data
	const { data: exerciseLines, error: exercisesError } = await locals.supabase
		.from('worksheet_exercises')
		.select(
			`
			*,
			exercise:exercises (
				id,
				title,
				translations,
				variables,
				topic
			),
			${WORKSHEET_LINE_VERSION}
		`
		)
		.eq('worksheet_id', worksheet.id)
		.order('position', { ascending: true });

	if (exercisesError) {
		logger.error('Failed to fetch exercises:', exercisesError);
		throw error(500, 'Impossible de charger les exercices de la fiche');
	}
	// Contenu : la version choisie par la fiche (ADR 0044), pas la dernière
	const exercises = (exerciseLines ?? []).map((line) => withLineVersion(line));

	// La fiche d'un style du prof, pour le PDF ; `null` pour un style de
	// Chiphre (Typst dans le code) ou un style illisible (style par défaut).
	const template = await loadStyleTemplate(locals.supabase, worksheet);

	// Les étiquettes ne sont plus une colonne de `worksheets` (migration
	// 20260908180000). Sans cette lecture, `tags` vaut `undefined` et le schéma
	// rejette toute la réponse — la fiche devient illisible.
	const tags = await fetchResourceTagNames(locals.supabase, 'worksheet', worksheet.id).catch(
		() => []
	);

	// Les notions de la fiche avec leur nom (ADR 0041) : l'éditeur et le PDF
	const classifications = await loadWorksheetClassifications(locals.supabase, worksheet.id).catch(
		(cause: unknown) => {
			logger.error('Failed to fetch classifications:', cause);
			throw error(500, 'Impossible de charger les notions de la fiche');
		}
	);

	// Validate response
	const validated = validateJsonResponse(
		worksheetDetailResponseSchema,
		{
			worksheet: {
				...worksheet,
				tags,
				classifications,
				sections: sections ?? [],
				exercises,
				template
			}
		},
		'GET /api/worksheets/[id]'
	);

	return Response.json(validated);
};

/**
 * PUT /api/worksheets/[id]
 * Update worksheet
 * Teachers and admins only
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet exists and user has permission
	const existingWorksheet = await getWorksheetWithAuth(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = validateUpdateWorksheet(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const data = validation.data;

	// Build update object with only provided fields
	const updateData: TablesUpdate<'worksheets'> = {};

	if (data.title !== undefined) updateData.title = data.title;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.translations !== undefined) updateData.translations = data.translations;
	if (data.type !== undefined) updateData.type = data.type;
	if (data.config !== undefined) updateData.config = data.config;
	if (data.style_id !== undefined) updateData.style_id = data.style_id;
	if (data.estimated_duration_minutes !== undefined)
		updateData.estimated_duration_minutes = data.estimated_duration_minutes;
	if (data.total_points !== undefined) updateData.total_points = data.total_points;
	if (data.grades !== undefined) updateData.grades = data.grades;
	// `tags` ne va plus dans la colonne : voir la synchronisation plus bas.

	// Handle status changes with timestamps
	if (data.status !== undefined) {
		updateData.status = data.status;

		if (data.status === 'published' && existingWorksheet.status !== 'published') {
			updateData.published_at = new Date().toISOString();
		}

		if (data.status === 'archived' && existingWorksheet.status !== 'archived') {
			updateData.archived_at = new Date().toISOString();
		}
	}

	// Catégorie, titre libre, notions (ADR 0041) : règle du nombre de notions
	// et titre composé, décidés avant toute écriture
	const plan = await prepareClassification(
		locals.supabase,
		{
			id: existingWorksheet.id,
			type: existingWorksheet.type,
			category: existingWorksheet.category,
			custom_title: existingWorksheet.custom_title
		},
		{
			type: data.type,
			category: data.category,
			custom_title: data.custom_title,
			notions: data.notions,
			title: data.title
		}
	).catch((cause: unknown) => {
		logger.error('Failed to prepare classification:', cause);
		throw error(500, 'Impossible de lire les notions de la fiche');
	});
	if (!plan.ok) throw error(400, plan.message);
	// Le titre composé remplace celui envoyé : sans titre libre, il fait foi
	Object.assign(updateData, plan.update);

	// Only proceed if there are fields to update
	if (Object.keys(updateData).length === 0 && plan.notions === null && data.tags === undefined) {
		throw error(400, 'Aucune modification demandée');
	}

	// Deux écritures de la fiche : d'abord les champs sans rapport avec les
	// notions (un refus, style d'un autre auteur par exemple, arrive AVANT que
	// la moindre notion soit retirée) ; puis type, catégorie, case, titre composé
	// ET notions, en une transaction (`save_worksheet_classification`, L86)
	const CLASSIFICATION_FIELDS = ['type', 'category', 'custom_title', 'title'] as const;
	const classificationUpdate: ClassificationFields = {};
	const otherUpdate: TablesUpdate<'worksheets'> = { ...updateData };
	for (const field of CLASSIFICATION_FIELDS) {
		if (field in updateData) {
			Object.assign(classificationUpdate, { [field]: updateData[field] });
			delete otherUpdate[field];
		}
	}

	let worksheet: Awaited<ReturnType<typeof getWorksheetWithAuth>> = existingWorksheet;
	async function writeWorksheet(fields: TablesUpdate<'worksheets'>): Promise<void> {
		if (Object.keys(fields).length === 0) return;
		const { data: updated, error: dbError } = await locals.supabase
			.from('worksheets')
			.update(fields)
			.eq('id', params.id)
			.select()
			.single();

		if (dbError || !updated) {
			// Trigger de `worksheets.style_id` : style d'un autre auteur
			if (dbError?.code === '42501') {
				throw error(403, 'Ce style n’est pas disponible pour cette fiche');
			}
			logger.error('Failed to update worksheet:', dbError);
			throw error(500, 'Impossible de modifier la fiche');
		}
		worksheet = updated;
	}

	await writeWorksheet(otherUpdate);
	// Rien à classer (ni colonne, ni notions) : aucune écriture
	if (Object.keys(classificationUpdate).length > 0 || plan.notions !== null) {
		try {
			worksheet = await applyClassification(locals.supabase, params.id, plan, classificationUpdate);
		} catch (cause) {
			logger.error('Failed to save classification:', cause);
			// La fiche ou ses notions : la transaction a tout annulé
			throw error(500, 'Impossible d’enregistrer la fiche et ses notions');
		}
	}

	// `undefined` signifie « champ absent de la requête » : on ne touche alors pas
	// aux tags, contrairement à un tableau vide qui, lui, les efface.
	if (data.tags !== undefined) {
		await syncResourceTags(locals.supabase, 'worksheet', params.id, data.tags);
	}

	const tags = await fetchResourceTagNames(locals.supabase, 'worksheet', params.id).catch(() => []);
	// Sans les notions relues, l'éditeur réafficherait celles d'avant : 500, le
	// prof réenregistre (même résultat)
	const classifications = await loadWorksheetClassifications(locals.supabase, params.id).catch(
		(cause: unknown) => {
			logger.error('Failed to reread classifications:', cause);
			throw error(500, 'Fiche enregistrée, mais ses notions n’ont pas pu être relues');
		}
	);

	return Response.json({ worksheet: { ...worksheet, tags, classifications } });
};

/**
 * DELETE /api/worksheets/[id]
 * Delete worksheet (draft only)
 * Teachers and admins only
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet exists and user has permission
	const worksheet = await getWorksheetWithAuth(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Only draft worksheets can be deleted
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Impossible de supprimer cette fiche (statut « ${worksheet.status} ») : seul un brouillon peut être supprimé.`
		);
	}

	// Delete worksheet (cascade will handle sections and exercises)
	const { error: dbError } = await locals.supabase.from('worksheets').delete().eq('id', params.id);

	if (dbError) {
		logger.error('Failed to delete worksheet:', dbError);
		throw error(500, 'Impossible de supprimer la fiche');
	}

	// Validate response
	const validated = validateJsonResponse(
		deleteWorksheetResponseSchema,
		{
			success: true as const,
			message: 'Fiche supprimée'
		},
		'DELETE /api/worksheets/[id]'
	);

	return Response.json(validated);
};
