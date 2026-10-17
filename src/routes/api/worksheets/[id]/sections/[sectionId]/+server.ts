/**
 * API Route: /api/worksheets/[id]/sections/[sectionId]
 * GET - Get a specific section
 * PUT - Update a section
 * DELETE - Delete a section
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateUpdateWorksheetSection,
	worksheetSectionResponseSchema
} from '$lib/server/validation/worksheets';
import { uuidSchema } from '$lib/server/validation/common';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import type { TablesUpdate } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/[id]/sections/[sectionId]/+server');

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify worksheet and section exist and user has permission
 */
async function verifyAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	sectionId: string,
	userId: string,
	role: string,
	schoolId: string | null
) {
	// Validate UUID formats
	const worksheetIdValidation = uuidSchema.safeParse(worksheetId);
	if (!worksheetIdValidation.success) {
		throw error(400, 'Identifiant de fiche invalide');
	}

	const sectionIdValidation = uuidSchema.safeParse(sectionId);
	if (!sectionIdValidation.success) {
		throw error(400, 'Identifiant de section invalide');
	}

	// Fetch worksheet
	const { data: worksheet, error: worksheetError } = await supabase
		.from('worksheets')
		.select('id, created_by, school_id, status')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Fiche introuvable');
	}

	// Verify ownership/authorization
	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Accès réservé à l’auteur de la fiche');
	}

	if (role === 'admin' && schoolId && worksheet.school_id !== schoolId) {
		throw error(403, 'Cette fiche appartient à une autre école');
	}

	// Fetch section
	const { data: section, error: sectionError } = await supabase
		.from('worksheet_sections')
		.select('*')
		.eq('id', sectionId)
		.eq('worksheet_id', worksheetId)
		.single();

	if (sectionError || !section) {
		throw error(404, 'Section introuvable');
	}

	return { worksheet, section };
}

/**
 * GET /api/worksheets/[id]/sections/[sectionId]
 * Get a specific section
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { section } = await verifyAccess(
		locals.supabase,
		params.id,
		params.sectionId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	const validated = validateJsonResponse(
		worksheetSectionResponseSchema,
		section,
		'GET /api/worksheets/[id]/sections/[sectionId]'
	);

	return json({ section: validated });
};

/**
 * PUT /api/worksheets/[id]/sections/[sectionId]
 * Update a section
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheet } = await verifyAccess(
		locals.supabase,
		params.id,
		params.sectionId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Impossible de modifier les sections de cette fiche (statut « ${worksheet.status} ») : seul un brouillon peut être modifié.`
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = validateUpdateWorksheetSection(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const data = validation.data;

	// Build update object
	const updateData: TablesUpdate<'worksheet_sections'> = {};
	if (data.title !== undefined) updateData.title = data.title;
	if (data.instructions !== undefined) updateData.instructions = data.instructions;
	if (data.translations !== undefined) updateData.translations = data.translations;
	if (data.position !== undefined) updateData.position = data.position;
	if (data.points_total !== undefined) updateData.points_total = data.points_total;

	// Update section
	const { data: section, error: dbError } = await locals.supabase
		.from('worksheet_sections')
		.update(updateData)
		.eq('id', params.sectionId)
		.eq('worksheet_id', params.id)
		.select()
		.single();

	if (dbError) {
		logger.error('Failed to update section:', dbError);
		throw error(500, 'Impossible de modifier la section');
	}

	const validated = validateJsonResponse(
		worksheetSectionResponseSchema,
		section,
		'PUT /api/worksheets/[id]/sections/[sectionId]'
	);

	return json({ section: validated });
};

/**
 * DELETE /api/worksheets/[id]/sections/[sectionId]
 * Delete a section (moves exercises to unsectioned)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheet, section } = await verifyAccess(
		locals.supabase,
		params.id,
		params.sectionId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Impossible de supprimer une section de cette fiche (statut « ${worksheet.status} ») : seul un brouillon peut être modifié.`
		);
	}

	// Sortir les exercices de la section vers « Sans section », APRÈS ceux qui y
	// sont déjà. `position` redémarre à 1 dans chaque groupe, et l'index unique
	// `idx_worksheet_exercises_unique_position` met tous les exercices hors
	// section dans le même groupe : garder leur rang heurtait celui des autres
	// (23505), et la suppression échouait.
	const { data: rows, error: readError } = await locals.supabase
		.from('worksheet_exercises')
		.select('id, section_id, position')
		.eq('worksheet_id', params.id);

	if (readError) {
		logger.error('Failed to read exercises:', readError);
		throw error(500, 'Impossible de lire les exercices de la fiche');
	}

	// Comparé à l'identifiant RENDU par la base (`verifyAccess`), pas au paramètre :
	// un UUID reçu en majuscules ne correspondrait à aucune ligne, et la FK
	// (`ON DELETE SET NULL`) sortirait ensuite les exercices à leur ancien rang.
	const toMove = rows
		.filter((r) => r.section_id === section.id)
		.sort((a, b) => a.position - b.position);
	let nextPosition = Math.max(
		0,
		...rows.filter((r) => r.section_id === null).map((r) => r.position)
	);

	// Un par un : chaque rang visé est libre (au-delà du dernier hors section).
	// La RLS échoue en silence : on vérifie la ligne rendue.
	for (const row of toMove) {
		nextPosition += 1;
		const { data: moved, error: moveError } = await locals.supabase
			.from('worksheet_exercises')
			.update({ section_id: null, position: nextPosition })
			.eq('id', row.id)
			.eq('worksheet_id', params.id)
			.select('id');

		if (moveError || moved?.length !== 1) {
			logger.error('Failed to move exercise:', moveError ?? 'no row updated');
			throw error(500, 'Impossible de sortir les exercices de la section');
		}
	}

	// Delete the section
	const { data: deleted, error: deleteError } = await locals.supabase
		.from('worksheet_sections')
		.delete()
		.eq('id', section.id)
		.eq('worksheet_id', params.id)
		.select('id');

	if (deleteError || deleted?.length !== 1) {
		logger.error('Failed to delete section:', deleteError ?? 'no row deleted');
		throw error(500, 'Impossible de supprimer la section');
	}

	return json({ success: true, message: 'Section supprimée' });
};
