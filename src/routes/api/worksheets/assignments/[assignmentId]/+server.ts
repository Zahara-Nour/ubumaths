/**
 * Worksheet Assignment API Endpoint
 * ==================================
 *
 * GET: Get assignment details (includes multi-class and individual students)
 * PATCH: Update assignment settings (including class_ids and student_ids)
 * DELETE: Delete an assignment (draft only)
 *
 * Multi-Class Assignment Support (Dec 2024):
 * - GET returns classes[] and assigned_students[] arrays
 * - PATCH accepts class_ids[] and student_ids[] for updates
 * - Uses worksheet_assignment_classes junction table
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

/**
 * Schema for updating a worksheet assignment.
 * Supports updating class_ids and student_ids for multi-class management.
 */
const updateAssignmentSchema = z.object({
	title: z.string().max(255).nullable().optional(),
	instructions: z.string().max(5000).nullable().optional(),
	available_from: z.string().datetime().optional(),
	closes_at: z.string().datetime().nullable().optional(),
	correction_release_mode: z.enum(CORRECTION_RELEASE_MODES).optional(),
	correction_release_at: z.string().datetime().nullable().optional(),
	show_corrections: z.boolean().optional(),
	status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
	// Multi-class support: update assigned classes
	class_ids: z.array(z.string().uuid()).max(50, 'Maximum 50 classes per assignment').optional(),
	// Individual students support
	student_ids: z
		.array(z.string().uuid())
		.max(500, 'Maximum 500 individual students per assignment')
		.optional()
});

const actionSchema = z.object({
	action: z.enum(['release_corrections', 'revoke_corrections'])
});

// ============================================================================
// GET HANDLER - Get assignment details (includes multi-class data)
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
		// Fetch assignment with relations including multi-class data
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
				),
				worksheet_assignment_classes(
					id,
					class_id,
					classes(id, name)
				),
				worksheet_assignment_students(
					id,
					student_id,
					profiles(id, firstname, lastname)
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

		// Transform response to include classes and assigned_students arrays
		const classes = (assignment.worksheet_assignment_classes || [])
			.map((wac: { classes: { id: string; name: string } | null }) => wac.classes)
			.filter(Boolean);

		const assigned_students = (assignment.worksheet_assignment_students || [])
			.map(
				(was: {
					profiles: { id: string; firstname: string | null; lastname: string | null } | null;
				}) =>
					was.profiles
						? {
								id: was.profiles.id,
								first_name: was.profiles.firstname,
								last_name: was.profiles.lastname
							}
						: null
			)
			.filter(Boolean);

		// Clean up the response
		const {
			worksheet_assignment_classes: _wac,
			worksheet_assignment_students: _was,
			...rest
		} = assignment;

		return json({
			success: true,
			assignment: {
				...rest,
				classes, // New: array of all assigned classes
				assigned_students // New: array of individually assigned students
			},
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
// PATCH HANDLER - Update assignment settings (supports class_ids/student_ids)
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

	const { class_ids, student_ids, ...assignmentUpdates } = validation.data;

	// Type for updates including optional class_id for backward compat
	const updateData: Record<string, unknown> = { ...assignmentUpdates };

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

		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (assignment.created_by !== user.id && profile?.role !== 'admin') {
			throw error(403, 'Non autorise a modifier cette assignation');
		}

		// Handle class_ids update if provided
		if (class_ids !== undefined) {
			// Verify all classes exist and user has access
			if (class_ids.length > 0) {
				const { data: classesData, error: classesError } = await locals.supabase
					.from('classes')
					.select('id, name, teacher_id')
					.in('id', class_ids);

				if (classesError) {
					console.error('Error fetching classes:', classesError);
					throw error(500, 'Erreur lors de la verification des classes');
				}

				// Verify all classes were found
				const foundIds = new Set(classesData?.map((c) => c.id) || []);
				const missingIds = class_ids.filter((id) => !foundIds.has(id));
				if (missingIds.length > 0) {
					throw error(404, `Classes non trouvees: ${missingIds.length} classe(s) invalide(s)`);
				}

				// Verify user has access to all classes
				if (profile?.role !== 'admin') {
					const unauthorizedClasses = classesData?.filter((c) => c.teacher_id !== user.id) || [];
					if (unauthorizedClasses.length > 0) {
						throw error(403, `Acces non autorise a ${unauthorizedClasses.length} classe(s)`);
					}
				}
			}

			// Get current class assignments
			const { data: currentClasses } = await locals.supabase
				.from('worksheet_assignment_classes')
				.select('class_id')
				.eq('assignment_id', assignmentId);

			const currentClassIds = new Set(currentClasses?.map((c) => c.class_id) || []);
			const newClassIds = new Set(class_ids);

			// Compute diff
			const toAdd = class_ids.filter((id) => !currentClassIds.has(id));
			const toRemove = [...currentClassIds].filter((id) => !newClassIds.has(id));

			// Remove classes no longer assigned
			if (toRemove.length > 0) {
				const { error: deleteError } = await locals.supabase
					.from('worksheet_assignment_classes')
					.delete()
					.eq('assignment_id', assignmentId)
					.in('class_id', toRemove);

				if (deleteError) {
					console.error('Error removing class assignments:', deleteError);
					throw error(500, 'Erreur lors de la mise a jour des classes');
				}
			}

			// Add new class assignments
			if (toAdd.length > 0) {
				const classInserts = toAdd.map((class_id) => ({
					assignment_id: assignmentId,
					class_id
				}));

				const { error: insertError } = await locals.supabase
					.from('worksheet_assignment_classes')
					.insert(classInserts);

				if (insertError) {
					console.error('Error adding class assignments:', insertError);
					throw error(500, 'Erreur lors de la mise a jour des classes');
				}
			}

			// Update legacy class_id for backward compat (first class or null)
			updateData.class_id = class_ids[0] || null;
		}

		// Handle student_ids update if provided
		if (student_ids !== undefined) {
			// Verify all students exist and are students
			if (student_ids.length > 0) {
				const { data: studentsData, error: studentsError } = await locals.supabase
					.from('profiles')
					.select('id')
					.in('id', student_ids)
					.eq('role', 'student');

				if (studentsError) {
					console.error('Error fetching students:', studentsError);
					throw error(500, 'Erreur lors de la verification des eleves');
				}

				const foundStudentIds = new Set(studentsData?.map((s) => s.id) || []);
				const invalidStudentIds = student_ids.filter((id) => !foundStudentIds.has(id));
				if (invalidStudentIds.length > 0) {
					throw error(
						400,
						`Eleves invalides: ${invalidStudentIds.length} eleve(s) non trouve(s) ou non eleves`
					);
				}
			}

			// Get current student assignments
			const { data: currentStudents } = await locals.supabase
				.from('worksheet_assignment_students')
				.select('student_id')
				.eq('assignment_id', assignmentId);

			const currentStudentIds = new Set(currentStudents?.map((s) => s.student_id) || []);
			const newStudentIds = new Set(student_ids);

			// Compute diff
			const toAddStudents = student_ids.filter((id) => !currentStudentIds.has(id));
			const toRemoveStudents = [...currentStudentIds].filter((id) => !newStudentIds.has(id));

			// Remove students no longer assigned
			if (toRemoveStudents.length > 0) {
				const { error: deleteError } = await locals.supabase
					.from('worksheet_assignment_students')
					.delete()
					.eq('assignment_id', assignmentId)
					.in('student_id', toRemoveStudents);

				if (deleteError) {
					console.error('Error removing student assignments:', deleteError);
					throw error(500, 'Erreur lors de la mise a jour des eleves');
				}
			}

			// Add new student assignments
			if (toAddStudents.length > 0) {
				const studentInserts = toAddStudents.map((student_id) => ({
					assignment_id: assignmentId,
					student_id
				}));

				const { error: insertError } = await locals.supabase
					.from('worksheet_assignment_students')
					.insert(studentInserts);

				if (insertError) {
					console.error('Error adding student assignments:', insertError);
					throw error(500, 'Erreur lors de la mise a jour des eleves');
				}
			}
		}

		// Update assignment fields (if any besides class/student changes)
		const hasFieldUpdates = Object.keys(updateData).length > 0;
		let updated = null;

		if (hasFieldUpdates) {
			const { data: updatedData, error: updateError } = await locals.supabase
				.from('worksheet_assignments')
				.update({
					...updateData,
					updated_at: new Date().toISOString()
				})
				.eq('id', assignmentId)
				.select()
				.single();

			if (updateError) {
				console.error('Error updating assignment:', updateError);
				throw error(500, "Erreur lors de la mise a jour de l'assignation");
			}
			updated = updatedData;
		} else {
			// Just update timestamp if only class/student changes
			const { data: updatedData, error: updateError } = await locals.supabase
				.from('worksheet_assignments')
				.update({ updated_at: new Date().toISOString() })
				.eq('id', assignmentId)
				.select()
				.single();

			if (updateError) {
				console.error('Error updating assignment timestamp:', updateError);
			}
			updated = updatedData;
		}

		// Fetch complete assignment with relations for response
		const { data: fullAssignment } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
				class:classes(id, name),
				worksheet_assignment_classes(
					id,
					class_id,
					classes(id, name)
				),
				worksheet_assignment_students(
					id,
					student_id,
					profiles(id, firstname, lastname)
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (fullAssignment) {
			// Transform response
			const classes = (fullAssignment.worksheet_assignment_classes || [])
				.map((wac: { classes: { id: string; name: string } | null }) => wac.classes)
				.filter(Boolean);

			const assigned_students = (fullAssignment.worksheet_assignment_students || [])
				.map(
					(was: {
						profiles: { id: string; firstname: string | null; lastname: string | null } | null;
					}) =>
						was.profiles
							? {
									id: was.profiles.id,
									first_name: was.profiles.firstname,
									last_name: was.profiles.lastname
								}
							: null
				)
				.filter(Boolean);

			const {
				worksheet_assignment_classes: _wac,
				worksheet_assignment_students: _was,
				...rest
			} = fullAssignment;

			return json({
				success: true,
				message: 'Assignation mise a jour',
				assignment: {
					...rest,
					classes,
					assigned_students
				}
			});
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
