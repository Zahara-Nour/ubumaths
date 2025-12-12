/**
 * Worksheet Assignments API Endpoint
 * ====================================
 *
 * GET: List assignments for a worksheet
 * POST: Create a new assignment for a worksheet (supports multi-class)
 *
 * Multi-Class Assignment Support (Dec 2024):
 * - Accepts class_ids[] array for assigning to multiple classes
 * - Accepts student_ids[] array for individual student assignments
 * - Backward compatible: still accepts single class_id (deprecated)
 * - Uses worksheet_assignment_classes junction table
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { CORRECTION_RELEASE_MODES, ASSIGNMENT_STATUSES } from '$lib/types/worksheets';
import { getCorrectionReleaseStatus } from '$lib/server/worksheets/correction-release';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a worksheet assignment.
 * Supports both legacy single class_id and new multi-class class_ids.
 *
 * Business Rules:
 * - At least one of class_ids or student_ids must be provided and non-empty
 * - If class_id is provided (legacy), it's converted to class_ids internally
 * - class_ids max 50 classes, student_ids max 500 students
 */
const createAssignmentSchema = z
	.object({
		// Legacy single class (deprecated, backward compat)
		class_id: z.string().uuid().optional(),
		// New multi-class support
		class_ids: z
			.array(z.string().uuid())
			.max(50, 'Maximum 50 classes per assignment')
			.optional()
			.default([]),
		// Individual students (in addition to class members)
		student_ids: z
			.array(z.string().uuid())
			.max(500, 'Maximum 500 individual students per assignment')
			.optional()
			.default([]),
		title: z.string().max(255).nullable().optional(),
		instructions: z.string().max(5000).nullable().optional(),
		individualized: z.boolean().optional().default(true),
		available_from: z.string().datetime().optional(),
		closes_at: z.string().datetime().nullable().optional(),
		correction_release_mode: z.enum(CORRECTION_RELEASE_MODES).optional().default('manual'),
		correction_release_at: z.string().datetime().nullable().optional(),
		show_corrections: z.boolean().optional().default(false),
		status: z.enum(ASSIGNMENT_STATUSES).optional().default('active')
	})
	.refine(
		(data) => {
			// Convert legacy class_id to class_ids if provided
			const classIds = data.class_id ? [data.class_id, ...data.class_ids] : data.class_ids;
			// At least one recipient is required
			return classIds.length > 0 || data.student_ids.length > 0;
		},
		{
			message: 'Au moins une classe ou un eleve doit etre specifie',
			path: ['class_ids']
		}
	);

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

		// Build query - include multi-class data
		let query = locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
				class:classes(id, name),
				worksheet:worksheets(id, title, type),
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
			.eq('worksheet_id', worksheetId)
			.order('created_at', { ascending: false });

		if (status) {
			query = query.eq('status', status);
		}

		// Filter by class_id in junction table if provided
		if (classId) {
			// Need to filter assignments that have this class in the junction table
			const { data: assignmentIds } = await locals.supabase
				.from('worksheet_assignment_classes')
				.select('assignment_id')
				.eq('class_id', classId);

			if (assignmentIds && assignmentIds.length > 0) {
				query = query.in(
					'id',
					assignmentIds.map((a) => a.assignment_id)
				);
			} else {
				// Also check legacy class_id column for backward compat
				query = query.eq('class_id', classId);
			}
		}

		const { data: assignments, error: fetchError } = await query;

		if (fetchError) {
			console.error('[API] Fetch error:', fetchError);
			throw error(500, 'Erreur lors de la recuperation des assignations');
		}

		// Transform assignments to include classes array
		const transformedAssignments = (assignments || []).map((assignment) => {
			// Extract classes from junction table
			const classes = (assignment.worksheet_assignment_classes || [])
				.map((wac: { classes: { id: string; name: string } | null }) => wac.classes)
				.filter(Boolean);

			// Extract individual students
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

			return {
				...rest,
				classes, // New: array of all assigned classes
				assigned_students // New: array of individually assigned students
			};
		});

		// Get correction status for each assignment
		const assignmentsWithStatus = [];
		for (const assignment of transformedAssignments) {
			try {
				const correctionStatus = await getCorrectionReleaseStatus(locals.supabase, assignment.id);
				assignmentsWithStatus.push({
					...assignment,
					correctionStatus
				});
			} catch (statusErr) {
				console.error('[API] Error getting correction status for', assignment.id, statusErr);
				assignmentsWithStatus.push({
					...assignment,
					correctionStatus: null
				});
			}
		}

		return json({
			success: true,
			assignments: assignmentsWithStatus
		});
	} catch (err) {
		console.error('Error fetching assignments:', err);
		if (err instanceof Error) {
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la recuperation des assignations');
	}
};

// ============================================================================
// POST HANDLER - Create new assignment (supports multi-class)
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

	const data = validation.data;

	// Merge legacy class_id into class_ids array (deduplicate)
	const classIds = data.class_id
		? [...new Set([data.class_id, ...data.class_ids])]
		: data.class_ids;
	const studentIds = data.student_ids;

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

		// Verify all classes exist and user has access to them
		if (classIds.length > 0) {
			const { data: classesData, error: classesError } = await locals.supabase
				.from('classes')
				.select('id, name, teacher_id')
				.in('id', classIds);

			if (classesError) {
				console.error('Error fetching classes:', classesError);
				throw error(500, 'Erreur lors de la verification des classes');
			}

			// Verify all classes were found
			const foundIds = new Set(classesData?.map((c) => c.id) || []);
			const missingIds = classIds.filter((id) => !foundIds.has(id));
			if (missingIds.length > 0) {
				throw error(404, `Classes non trouvees: ${missingIds.length} classe(s) invalide(s)`);
			}

			// Verify user has access to all classes
			if (profile?.role !== 'admin') {
				const unauthorizedClasses = classesData?.filter((c) => c.teacher_id !== user.id) || [];
				if (unauthorizedClasses.length > 0) {
					throw error(
						403,
						`Acces non autorise a ${unauthorizedClasses.length} classe(s): ${unauthorizedClasses.map((c) => c.name).join(', ')}`
					);
				}
			}
		}

		// Verify all students exist and are actually students
		if (studentIds.length > 0) {
			const { data: studentsData, error: studentsError } = await locals.supabase
				.from('profiles')
				.select('id')
				.in('id', studentIds)
				.eq('role', 'student');

			if (studentsError) {
				console.error('Error fetching students:', studentsError);
				throw error(500, 'Erreur lors de la verification des eleves');
			}

			const foundStudentIds = new Set(studentsData?.map((s) => s.id) || []);
			const invalidStudentIds = studentIds.filter((id) => !foundStudentIds.has(id));
			if (invalidStudentIds.length > 0) {
				throw error(
					400,
					`Eleves invalides: ${invalidStudentIds.length} eleve(s) non trouve(s) ou non eleves`
				);
			}
		}

		// Create assignment - store first class_id for backward compat (or null if individual only)
		const { data: assignment, error: createError } = await locals.supabase
			.from('worksheet_assignments')
			.insert({
				worksheet_id: worksheetId,
				class_id: classIds[0] || null, // Backward compat: first class or null
				title: data.title,
				instructions: data.instructions,
				individualized: data.individualized,
				available_from: data.available_from || new Date().toISOString(),
				closes_at: data.closes_at,
				correction_release_mode: data.correction_release_mode,
				correction_release_at: data.correction_release_at,
				show_corrections: data.show_corrections,
				status: data.status,
				created_by: user.id
			})
			.select('*')
			.single();

		if (createError) {
			console.error('Error creating assignment:', createError);
			throw error(500, "Erreur lors de la creation de l'assignation");
		}

		// Insert into junction table: worksheet_assignment_classes
		if (classIds.length > 0) {
			const classInserts = classIds.map((class_id) => ({
				assignment_id: assignment.id,
				class_id
			}));

			const { error: classInsertError } = await locals.supabase
				.from('worksheet_assignment_classes')
				.insert(classInserts);

			if (classInsertError) {
				console.error('Error inserting class assignments:', classInsertError);
				// Rollback: delete the assignment
				await locals.supabase.from('worksheet_assignments').delete().eq('id', assignment.id);
				throw error(500, "Erreur lors de l'assignation aux classes");
			}
		}

		// Insert individual student assignments
		if (studentIds.length > 0) {
			const studentInserts = studentIds.map((student_id) => ({
				assignment_id: assignment.id,
				student_id
			}));

			const { error: studentInsertError } = await locals.supabase
				.from('worksheet_assignment_students')
				.insert(studentInserts);

			if (studentInsertError) {
				console.error('Error inserting student assignments:', studentInsertError);
				// Rollback: delete the assignment (cascade will clean up classes)
				await locals.supabase.from('worksheet_assignments').delete().eq('id', assignment.id);
				throw error(500, "Erreur lors de l'assignation aux eleves");
			}
		}

		// Fetch the complete assignment with relations for response
		const { data: fullAssignment, error: fetchError } = await locals.supabase
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
			.eq('id', assignment.id)
			.single();

		if (fetchError) {
			console.error('Error fetching created assignment:', fetchError);
			// Assignment was created, just return basic data
			return json({
				success: true,
				message: 'Assignation creee avec succes',
				assignment
			});
		}

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
			message: 'Assignation creee avec succes',
			assignment: {
				...rest,
				classes,
				assigned_students
			}
		});
	} catch (err) {
		console.error('Error creating assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de la creation de l'assignation");
	}
};
