/**
 * Student Correction PDF API Endpoint
 * ====================================
 *
 * GET: Get correction PDF for a student's worksheet assignment
 *
 * Security:
 * - Verifies student is assigned this worksheet
 * - Checks if corrections are released based on assignment settings
 * - Returns personalized correction PDF matching student's variant
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
import { canAccessCorrections } from '$lib/server/worksheets/correction-release';
import type {
	WorksheetWithRelations,
	InstanceData,
	WorksheetAssignmentRow
} from '$lib/types/worksheets';

// Query parameter validation
// Note: 'pdf' format is not supported server-side (Typst.js requires browser)
// Use 'typst' to get the Typst source, then generate PDF client-side
const querySchema = z.object({
	format: z.enum(['typst', 'json']).optional().default('typst')
});

// ============================================================================
// GET HANDLER - Get student's correction PDF
// ============================================================================

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	// Validate query parameters
	const queryParams = querySchema.safeParse({
		format: url.searchParams.get('format') || 'pdf'
	});

	if (!queryParams.success) {
		throw error(400, queryParams.error.issues[0].message);
	}

	const { format } = queryParams.data;

	try {
		// Fetch assignment with worksheet details
		const { data: assignment, error: assignmentError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				*,
				worksheet:worksheets(
					*,
					worksheet_sections(*),
					worksheet_exercises(
						*,
						exercise:exercises(
							id,
							title,
							statement_md,
							solution_md,
							difficulty,
							variables,
							shared,
							variations
						)
					)
				),
				class:classes(
					id,
					name
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !assignment) {
			throw error(404, 'Assignation non trouvee');
		}

		// Check if user is a student with access to this assignment
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role, class_id')
			.eq('id', user.id)
			.single();

		const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';
		const isAssignmentCreator = assignment.created_by === user.id;
		const isStudentInClass = assignment.class_id && profile?.class_id === assignment.class_id;

		console.log('[Correction API] Access check:', {
			userId: user.id,
			role: profile?.role,
			isTeacher,
			isAssignmentCreator,
			isStudentInClass,
			assignmentCreatedBy: assignment.created_by
		});

		// Teachers/admins/creators can always access, students need to be in the class
		if (!isTeacher && !isAssignmentCreator && !isStudentInClass) {
			throw error(403, 'Acces non autorise a cette assignation');
		}

		// For students, check if corrections are released
		if (!isTeacher && !isAssignmentCreator) {
			const accessResult = canAccessCorrections(
				assignment as unknown as WorksheetAssignmentRow,
				user.id
			);

			if (!accessResult.canAccess) {
				throw error(403, accessResult.reason);
			}
		}

		// Get student's worksheet instance
		const { data: instance } = await locals.supabase
			.from('worksheet_instances')
			.select('*')
			.eq('worksheet_id', assignment.worksheet_id)
			.eq('student_id', user.id)
			.single();

		// For teachers previewing, we might not have an instance
		let instanceData: InstanceData;
		let studentName: string | undefined;

		if (instance) {
			instanceData = instance.instance_data as InstanceData;

			// Get student name
			const { data: studentProfile } = await locals.supabase
				.from('profiles')
				.select('first_name, last_name')
				.eq('id', user.id)
				.single();

			if (studentProfile) {
				studentName = formatStudentName(studentProfile);
			}
		} else if (isTeacher || isAssignmentCreator) {
			// Teacher preview - generate generic instance
			instanceData = generateSimpleInstance(assignment.worksheet as WorksheetWithRelations);
			studentName = 'Apercu enseignant';
		} else {
			throw error(404, 'Aucune instance trouvee pour cet eleve');
		}

		const worksheet = assignment.worksheet as WorksheetWithRelations;
		const className = assignment.class?.name;

		// If JSON format requested, return correction data
		if (format === 'json') {
			return json({
				success: true,
				worksheet: {
					id: worksheet.id,
					title: worksheet.title,
					type: worksheet.type
				},
				assignment: {
					id: assignment.id,
					title: assignment.title,
					closes_at: assignment.closes_at,
					correction_release_mode: assignment.correction_release_mode
				},
				exercises: instanceData.exercises.map((ex) => ({
					exercise_id: ex.exercise_id,
					position: ex.position,
					statement: ex.statement,
					solution: ex.solution
				})),
				studentName,
				className
			});
		}

		// Generate Typst content for correction
		const typstContent = generateWorksheetTypst({
			worksheet: worksheet,
			instance: instanceData,
			config: worksheet.config || {},
			mode: 'correction',
			studentName,
			className
		});

		// Return Typst source (PDF generation must be done client-side)
		const filename = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_correction${studentName ? '_' + studentName.replace(/[^a-zA-Z0-9]/g, '_') : ''}.pdf`;

		return json({
			success: true,
			typst: typstContent,
			filename,
			studentName,
			worksheetTitle: worksheet.title
		});
	} catch (err) {
		console.error('[Correction API] Error:', err);
		if (err instanceof Error) {
			console.error('[Correction API] Message:', err.message);
			console.error('[Correction API] Stack:', err.stack);
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la generation de la correction');
	}
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a simple instance from worksheet exercises (for teacher preview)
 */
function generateSimpleInstance(
	worksheet: WorksheetWithRelations & { worksheet_exercises?: WorksheetWithRelations['exercises'] }
): InstanceData {
	// Handle both property names: 'exercises' from composed response, 'worksheet_exercises' from joined query
	const exercises = worksheet.exercises || worksheet.worksheet_exercises || [];

	const sortedExercises = [...exercises].sort((a, b) => a.position - b.position);

	const resolvedExercises = sortedExercises.map((we) => ({
		exercise_id: we.exercise_id,
		title: we.exercise?.title ?? null,
		position: we.position,
		parameters: {},
		statement: we.exercise?.statement_md || '',
		solution: we.exercise?.solution_md || ''
	}));

	return {
		exercises: resolvedExercises,
		variant_info: {
			seed: Math.floor(Math.random() * 1000000),
			version: 'preview'
		}
	};
}

/**
 * Format student name
 */
function formatStudentName(student: {
	first_name: string | null;
	last_name: string | null;
}): string {
	const firstName = student.first_name || '';
	const lastName = student.last_name || '';
	return `${lastName} ${firstName}`.trim() || 'Eleve';
}
