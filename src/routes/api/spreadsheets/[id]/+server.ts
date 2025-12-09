/**
 * API Route: /api/spreadsheets/:id
 * GET - Get single spreadsheet with full data
 * PUT - Update spreadsheet
 * DELETE - Delete spreadsheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { updateSpreadsheetSchema } from '$lib/server/validation/spreadsheet';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * GET /api/spreadsheets/:id
 * Get a single spreadsheet with full data
 * Users can only access their own spreadsheets
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'student');

	// Fetch spreadsheet with explicit user_id check (in addition to RLS)
	const { data, error: dbError } = await locals.supabase
		.from('spreadsheets')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id) // Explicit ownership check
		.single();

	if (dbError || !data) {
		throw error(404, 'Feuille de calcul non trouvée');
	}

	return json({ spreadsheet: data });
};

/**
 * PUT /api/spreadsheets/:id
 * Update a spreadsheet (name, description, or data)
 * Users can only update their own spreadsheets
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'student');

	// Parse and validate request body
	const body = await request.json();
	const validation = updateSpreadsheetSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Build update object with only provided fields
	const updates: Record<string, unknown> = {};
	if (validation.data.name !== undefined) updates.name = validation.data.name;
	if (validation.data.description !== undefined) updates.description = validation.data.description;
	if (validation.data.data !== undefined) updates.data = validation.data.data;

	// Check if there are any updates to apply
	if (Object.keys(updates).length === 0) {
		throw error(400, 'Aucune modification fournie');
	}

	// Update spreadsheet
	const { data, error: dbError } = await locals.supabase
		.from('spreadsheets')
		.update(updates)
		.eq('id', id)
		.eq('user_id', user.id) // Explicit ownership check
		.select()
		.single();

	if (dbError || !data) {
		throw error(404, 'Feuille de calcul non trouvée');
	}

	return json({ spreadsheet: data });
};

/**
 * DELETE /api/spreadsheets/:id
 * Delete a spreadsheet
 * Users can only delete their own spreadsheets
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'student');

	// Delete spreadsheet
	const { error: dbError } = await locals.supabase
		.from('spreadsheets')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id); // Explicit ownership check

	if (dbError) {
		console.error('Error deleting spreadsheet:', dbError);
		throw error(500, 'Erreur lors de la suppression de la feuille de calcul');
	}

	return json({ success: true });
};
