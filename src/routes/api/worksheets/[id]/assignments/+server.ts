/**
 * Worksheet Assignments API Endpoint
 * ====================================
 *
 * GET: List assignments for a worksheet
 * POST: Create a new assignment for a worksheet
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { CORRECTION_RELEASE_MODES, ASSIGNMENT_STATUSES } from '$lib/types/worksheets';
import { getCorrectionReleaseStatus } from '$lib/server/worksheets/correction-release';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createAssignmentSchema = z.object({
	class_id: z.string().uuid(),
	title: z.string().max(255).nullable().optional(),
	instructions: z.string().max(5000).nullable().optional(),
	individualized: z.boolean().optional().default(true),
	available_from: z.string().datetime().optional(),
	due_at: z.string().datetime().nullable().optional(),
	closes_at: z.string().datetime().nullable().optional(),
	correction_release_mode: z.enum(CORRECTION_RELEASE_MODES).optional().default('manual'),
	correction_release_at: z.string().datetime().nullable().optional(),
	show_solutions_before_due: z.boolean().optional().default(false),
	allow_late_submission: z.boolean().optional().default(true),
	max_attempts: z.number().int().min(1).max(10).optional().default(1),
	time_limit_minutes: z.number().int().min(1).max(600).nullable().optional(),
	status: z.enum(ASSIGNMENT_STATUSES).optional().default('draft')
});

// ============================================================================
// GET HANDLER - List assignments for worksheet
// ============================================================================

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const worksheetId = params.id;
	if (!worksheetId) {
		throw error(400, 'ID de la feuille requis');
	}

	// Optional filters
	const status = url.searchParams.get('status');
	const classId = url.searchParams.get('classId');

	try {
		// Verify user owns the worksheet or is admin
		const { data: worksheet, error: worksheetError } = await locals.supabase
			.from('worksheets')
			.select('id, created_by')
			.eq('id', worksheetId)
			.single();

		if (worksheetError || !worksheet) {
			throw error(404, 'Feuille non trouvee');
		}

		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (worksheet.created_by !== user.id && profile?.role !== 'admin') {
			throw error(403, 'Acces non autorise');
		}

		// Build query
		let query = locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
				class:classes(id, name),
				worksheet:worksheets(id, title, type)
			`
			)
			.eq('worksheet_id', worksheetId)
			.order('created_at', { ascending: false });

		if (status) {
			query = query.eq('status', status);
		}

		if (classId) {
			query = query.eq('class_id', classId);
		}

		const { data: assignments, error: fetchError } = await query;

		if (fetchError) {
			throw error(500, 'Erreur lors de la recuperation des devoirs');
		}

		// Get correction status for each assignment
		const assignmentsWithStatus = await Promise.all(
			(assignments || []).map(async (assignment) => {
				const correctionStatus = await getCorrectionReleaseStatus(locals.supabase, assignment.id);
				return {
					...assignment,
					correctionStatus
				};
			})
		);

		return json({
			success: true,
			assignments: assignmentsWithStatus
		});
	} catch (err) {
		console.error('Error fetching assignments:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la recuperation des devoirs');
	}
};

// ============================================================================
// POST HANDLER - Create new assignment
// ============================================================================

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const worksheetId = params.id;
	if (!worksheetId) {
		throw error(400, 'ID de la feuille requis');
	}

	// Parse and validate body
	const body = await request.json().catch(() => null);
	const validation = createAssignmentSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	try {
		// Verify worksheet exists and user owns it
		const { data: worksheet, error: worksheetError } = await locals.supabase
			.from('worksheets')
			.select('id, created_by, status')
			.eq('id', worksheetId)
			.single();

		if (worksheetError || !worksheet) {
			throw error(404, 'Feuille non trouvee');
		}

		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (worksheet.created_by !== user.id && profile?.role !== 'admin') {
			throw error(403, 'Acces non autorise');
		}

		// Verify worksheet is published
		if (worksheet.status !== 'published') {
			throw error(400, 'La feuille doit etre publiee avant de pouvoir etre assignee');
		}

		// Verify class exists and user has access
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select('id, name, teacher_id')
			.eq('id', validation.data.class_id)
			.single();

		if (classError || !classData) {
			throw error(404, 'Classe non trouvee');
		}

		if (classData.teacher_id !== user.id && profile?.role !== 'admin') {
			throw error(403, 'Acces non autorise a cette classe');
		}

		// Create assignment
		const { data: assignment, error: createError } = await locals.supabase
			.from('worksheet_assignments')
			.insert({
				worksheet_id: worksheetId,
				class_id: validation.data.class_id,
				title: validation.data.title,
				instructions: validation.data.instructions,
				individualized: validation.data.individualized,
				available_from: validation.data.available_from || new Date().toISOString(),
				due_at: validation.data.due_at,
				closes_at: validation.data.closes_at,
				correction_release_mode: validation.data.correction_release_mode,
				correction_release_at: validation.data.correction_release_at,
				show_solutions_before_due: validation.data.show_solutions_before_due,
				allow_late_submission: validation.data.allow_late_submission,
				max_attempts: validation.data.max_attempts,
				time_limit_minutes: validation.data.time_limit_minutes,
				status: validation.data.status,
				created_by: user.id
			})
			.select(
				`
				*,
				class:classes(id, name)
			`
			)
			.single();

		if (createError) {
			console.error('Error creating assignment:', createError);
			throw error(500, 'Erreur lors de la creation du devoir');
		}

		return json({
			success: true,
			message: 'Devoir cree avec succes',
			assignment
		});
	} catch (err) {
		console.error('Error creating assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la creation du devoir');
	}
};
