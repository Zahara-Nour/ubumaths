/**
 * Worksheet Assignment API Endpoint
 * ==================================
 *
 * GET: Get assignment details
 * PATCH: Update assignment settings (including correction configuration)
 * DELETE: Delete an assignment (draft only)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	releaseCorrections,
	revokeCorrections,
	getCorrectionReleaseStatus
} from '$lib/server/worksheets/correction-release';
import { CORRECTION_RELEASE_MODES } from '$lib/types/worksheets';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateAssignmentSchema = z.object({
	title: z.string().min(1).max(255).optional(),
	instructions: z.string().max(5000).optional(),
	available_from: z.string().datetime().optional(),
	closes_at: z.string().datetime().nullable().optional(),
	correction_release_mode: z.enum(CORRECTION_RELEASE_MODES).optional(),
	correction_release_at: z.string().datetime().nullable().optional(),
	show_corrections: z.boolean().optional(),
	status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional()
});

const actionSchema = z.object({
	action: z.enum(['release_corrections', 'revoke_corrections'])
});

// ============================================================================
// GET HANDLER - Get assignment details
// ============================================================================

export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	try {
		// Fetch assignment with relations
		const { data: assignment, error: fetchError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
				worksheet:worksheets(
					id,
					title,
					type,
					config,
					status
				),
				class:classes(
					id,
					name
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (fetchError || !assignment) {
			throw error(404, 'Assignation non trouvee');
		}

		// Check permissions
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		const isCreator = assignment.created_by === user.id;
		const isAdmin = profile?.role === 'admin';

		if (!isCreator && !isAdmin) {
			throw error(403, 'Acces non autorise');
		}

		// Get correction release status
		const correctionStatus = await getCorrectionReleaseStatus(locals.supabase, assignmentId);

		return json({
			success: true,
			assignment,
			correctionStatus
		});
	} catch (err) {
		console.error('Error fetching assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de la recuperation de l'assignation");
	}
};

// ============================================================================
// PATCH HANDLER - Update assignment settings
// ============================================================================

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	// Parse request body
	const body = await request.json().catch(() => null);
	if (!body) {
		throw error(400, 'Corps de requete invalide');
	}

	// Check if this is an action request
	const actionValidation = actionSchema.safeParse(body);
	if (actionValidation.success) {
		return handleAction(
			params.assignmentId,
			actionValidation.data.action,
			user.id,
			locals.supabase
		);
	}

	// Otherwise, validate as update request
	const validation = updateAssignmentSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	try {
		// Verify user is the creator
		const { data: assignment, error: fetchError } = await locals.supabase
			.from('worksheet_assignments')
			.select('id, created_by')
			.eq('id', assignmentId)
			.single();

		if (fetchError || !assignment) {
			throw error(404, 'Assignation non trouvee');
		}

		if (assignment.created_by !== user.id) {
			const { data: profile } = await locals.supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.single();

			if (profile?.role !== 'admin') {
				throw error(403, 'Non autorise a modifier cette assignation');
			}
		}

		// Update assignment
		const { data: updated, error: updateError } = await locals.supabase
			.from('worksheet_assignments')
			.update({
				...validation.data,
				updated_at: new Date().toISOString()
			})
			.eq('id', assignmentId)
			.select()
			.single();

		if (updateError) {
			throw error(500, "Erreur lors de la mise a jour de l'assignation");
		}

		return json({
			success: true,
			message: 'Assignation mise a jour',
			assignment: updated
		});
	} catch (err) {
		console.error('Error updating assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de la mise a jour de l'assignation");
	}
};

// ============================================================================
// POST HANDLER - Actions (release/revoke corrections)
// ============================================================================

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	// Parse and validate action
	const body = await request.json().catch(() => null);
	const validation = actionSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	return handleAction(assignmentId, validation.data.action, user.id, locals.supabase);
};

// ============================================================================
// DELETE HANDLER - Delete assignment
// ============================================================================

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	try {
		// Verify user is the creator and assignment is draft
		const { data: assignment, error: fetchError } = await locals.supabase
			.from('worksheet_assignments')
			.select('id, created_by, status')
			.eq('id', assignmentId)
			.single();

		if (fetchError || !assignment) {
			throw error(404, 'Assignation non trouvee');
		}

		if (assignment.created_by !== user.id) {
			const { data: profile } = await locals.supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.single();

			if (profile?.role !== 'admin') {
				throw error(403, 'Non autorise a supprimer cette assignation');
			}
		}

		if (assignment.status !== 'draft') {
			throw error(400, 'Seules les assignations en brouillon peuvent etre supprimees');
		}

		// Delete assignment
		const { error: deleteError } = await locals.supabase
			.from('worksheet_assignments')
			.delete()
			.eq('id', assignmentId);

		if (deleteError) {
			throw error(500, "Erreur lors de la suppression de l'assignation");
		}

		return json({
			success: true,
			message: 'Assignation supprimee'
		});
	} catch (err) {
		console.error('Error deleting assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de la suppression de l'assignation");
	}
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function handleAction(
	assignmentId: string,
	action: string,
	userId: string,
	supabase: App.Locals['supabase']
) {
	switch (action) {
		case 'release_corrections': {
			const result = await releaseCorrections(supabase, assignmentId, userId);
			if (!result.success) {
				throw error(400, result.message);
			}
			return json({
				success: true,
				message: result.message,
				affectedStudents: result.affectedStudents
			});
		}

		case 'revoke_corrections': {
			const result = await revokeCorrections(supabase, assignmentId, userId);
			if (!result.success) {
				throw error(400, result.message);
			}
			return json({
				success: true,
				message: result.message
			});
		}

		default:
			throw error(400, 'Action non reconnue');
	}
}
