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
 * - Backward compatible: still accepts a single `class_id` in the BODY (deprecated);
 *   it is merged into `class_ids` and stored only in the junction table
 * - Uses worksheet_assignment_classes junction table
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { CORRECTION_RELEASE_MODES, ASSIGNMENT_STATUSES } from '$lib/types/worksheets';
import { getCorrectionReleaseStatus } from '$lib/server/worksheets/correction-release';
import { guidanceLevelSchema } from '$lib/server/validation/worksheets';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/[id]/assignments/+server');

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
			.max(50, '50 classes au maximum par affectation')
			.optional()
			.default([]),
		// Individual students (in addition to class members)
		student_ids: z
			.array(z.string().uuid())
			.max(500, '500 élèves au maximum par affectation')
			.optional()
			.default([]),
		title: z.string().max(255).nullable().optional(),
		instructions: z.string().max(5000).nullable().optional(),
		individualized: z.boolean().optional().default(true),
		// Niveau de guidage des versions distribuées (ADR 0023) : guidé par défaut
		guidance_level: guidanceLevelSchema.optional().default('guided'),
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
			message: 'Choisir au moins une classe ou un élève',
			path: ['class_ids']
		}
	);

// ============================================================================
// GET HANDLER - List assignments for worksheet
// ============================================================================

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Connexion requise');
	}

	const worksheetId = params.id;
	if (!worksheetId) {
		throw error(400, 'Identifiant de fiche requis');
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
			throw error(404, 'Fiche introuvable');
		}

		const { data: profile, error: profileError } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		// PGRST116 = pas de profil, et le refus qui suit est légitime. Toute AUTRE
		// panne produisait le même refus, indiscernable d'un refus mérité.
		if (profileError && profileError.code !== 'PGRST116') {
			logger.error('Rôle illisible :', profileError);
			throw error(500, 'Impossible de vérifier les droits d’accès');
		}

		if (worksheet.created_by !== user.id && profile?.role !== 'admin') {
			throw error(403, 'Accès refusé');
		}

		// Build query - include multi-class data
		let query = locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
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
			const { data: assignmentIds, error: assignmentIdsError } = await locals.supabase
				.from('worksheet_assignment_classes')
				.select('assignment_id')
				.eq('class_id', classId);

			// Cette liste borne la portée du classement. Vidée par une panne, elle
			// affiche un classement amputé sans le dire.
			if (assignmentIdsError) {
				logger.error('Périmètre illisible :', assignmentIdsError);
				throw error(500, 'Impossible de déterminer le périmètre');
			}

			// Aucun repli sur la colonne historique : la jonction est la seule source.
			// Le repli renvoyait les affectations dont cette classe était la PREMIÈRE
			// — un sous-ensemble de ce que la jonction dit déjà.
			query = query.in(
				'id',
				(assignmentIds ?? []).map((a) => a.assignment_id)
			);
		}

		const { data: assignments, error: fetchError } = await query;

		if (fetchError) {
			logger.error('[API] Fetch error:', fetchError);
			throw error(500, 'Impossible de charger les affectations');
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
				logger.error('[API] Error getting correction status for', assignment.id, statusErr);
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
		logger.error('Error fetching assignments:', err);
		if (err instanceof Error) {
			logger.error('Error message:', err.message);
			logger.error('Error stack:', err.stack);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Impossible de charger les affectations');
	}
};

// ============================================================================
// POST HANDLER - Create new assignment (supports multi-class)
// ============================================================================

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Connexion requise');
	}

	const worksheetId = params.id;
	if (!worksheetId) {
		throw error(400, 'Identifiant de fiche requis');
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
			throw error(404, 'Fiche introuvable');
		}

		const { data: profile, error: profileError } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		// PGRST116 = pas de profil, et le refus qui suit est légitime. Toute AUTRE
		// panne produisait le même refus, indiscernable d'un refus mérité.
		if (profileError && profileError.code !== 'PGRST116') {
			logger.error('Rôle illisible :', profileError);
			throw error(500, 'Impossible de vérifier les droits d’accès');
		}

		if (worksheet.created_by !== user.id && profile?.role !== 'admin') {
			throw error(403, 'Accès refusé');
		}

		// Verify worksheet is published
		if (worksheet.status !== 'published') {
			throw error(400, 'La fiche doit être publiée avant d’être distribuée');
		}

		// Verify all classes exist and user has access to them
		if (classIds.length > 0) {
			const { data: classesData, error: classesError } = await locals.supabase
				.from('classes')
				.select('id, name, is_active')
				.in('id', classIds);

			if (classesError) {
				logger.error('Error fetching classes:', classesError);
				throw error(500, 'Impossible de vérifier les classes');
			}

			// Verify all classes were found
			const foundIds = new Set(classesData?.map((c) => c.id) || []);
			const missingIds = classIds.filter((id) => !foundIds.has(id));
			if (missingIds.length > 0) {
				throw error(404, `Classes introuvables : ${missingIds.length}`);
			}

			// Une classe fermée ne reçoit plus rien. Personne n'y est en cours
			// d'année, donc la distribution ne servirait aucun élève actif — mais
			// elle ÉLARGIRAIT la lecture rétroactive de ses anciens membres, qui
			// se relit sur la fenêtre de l'année et non sur la date de fermeture.
			// L'interface ne propose que des classes actives
			// (`get_teacher_classes_with_data` filtre sur `is_active`) : ce garde
			// ne ferme rien d'atteignable, il empêche la dérive.
			const fermees = (classesData ?? []).filter((c) => !c.is_active);
			if (fermees.length > 0) {
				throw error(
					400,
					`Classe fermée : ${fermees.map((c) => c.name).join(', ')} ne peut plus recevoir de fiche`
				);
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
				logger.error('Error fetching students:', studentsError);
				throw error(500, 'Impossible de vérifier les élèves');
			}

			const foundStudentIds = new Set(studentsData?.map((s) => s.id) || []);
			const invalidStudentIds = studentIds.filter((id) => !foundStudentIds.has(id));
			if (invalidStudentIds.length > 0) {
				throw error(400, `Élèves introuvables : ${invalidStudentIds.length}`);
			}
		}

		const { data: assignment, error: createError } = await locals.supabase
			.from('worksheet_assignments')
			.insert({
				worksheet_id: worksheetId,
				title: data.title,
				instructions: data.instructions,
				individualized: data.individualized,
				guidance_level: data.guidance_level,
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
			logger.error('Error creating assignment:', createError);
			throw error(500, 'Impossible de créer l’affectation');
		}

		// La RLS refuse en silence : la ligne rendue doit porter ce qu'on a écrit
		if (!assignment || assignment.guidance_level !== data.guidance_level) {
			logger.error('Affectation non écrite telle que demandée :', assignment?.id);
			throw error(500, 'Impossible de créer l’affectation');
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
				logger.error('Error inserting class assignments:', classInsertError);
				// Rollback: delete the assignment
				await locals.supabase.from('worksheet_assignments').delete().eq('id', assignment.id);
				throw error(500, 'Impossible d’affecter la fiche aux classes');
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
				logger.error('Error inserting student assignments:', studentInsertError);
				// Rollback: delete the assignment (cascade will clean up classes)
				await locals.supabase.from('worksheet_assignments').delete().eq('id', assignment.id);
				throw error(500, 'Impossible d’affecter la fiche aux élèves');
			}
		}

		// Fetch the complete assignment with relations for response
		const { data: fullAssignment, error: fetchError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
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
			logger.error('Error fetching created assignment:', fetchError);
			// Assignment was created, just return basic data
			return json({
				success: true,
				message: 'Affectation créée',
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
			message: 'Affectation créée',
			assignment: {
				...rest,
				classes,
				assigned_students
			}
		});
	} catch (err) {
		logger.error('Error creating assignment:', err);

		// `error()` de SvelteKit lève un `HttpError`, qui n'étend PAS `Error` :
		// `err instanceof Error` y est faux, et tout 4xx délibéré ressortait en 500.
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Impossible de créer l’affectation');
	}
};
