/**
 * Load function for teacher error reports page
 *
 * Loads worksheet and assignment info for the page header.
 * The ErrorReportsPanel component handles fetching the actual reports.
 */
import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid();

export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Validate UUIDs
	const worksheetIdValidation = uuidSchema.safeParse(params.id);
	const assignmentIdValidation = uuidSchema.safeParse(params.assignmentId);

	if (!worksheetIdValidation.success) {
		throw error(400, 'ID de feuille invalide');
	}
	if (!assignmentIdValidation.success) {
		throw error(400, "ID d'assignation invalide");
	}

	// Fetch worksheet info (includes access check)
	const worksheetResponse = await fetch(`/api/worksheets/${params.id}`);

	if (!worksheetResponse.ok) {
		if (worksheetResponse.status === 404) {
			throw error(404, 'Feuille non trouvee');
		}
		if (worksheetResponse.status === 403) {
			throw error(403, 'Acces refuse');
		}
		throw error(500, 'Erreur lors du chargement de la feuille');
	}

	const worksheetData = await worksheetResponse.json();

	// Fetch assignments to get assignment info
	const assignmentsResponse = await fetch(`/api/worksheets/${params.id}/assignments`);

	if (!assignmentsResponse.ok) {
		throw error(500, 'Erreur lors du chargement des assignations');
	}

	const assignmentsData = await assignmentsResponse.json();

	// Find the specific assignment
	interface AssignmentData {
		id: string;
		title?: string;
		classes?: { name: string }[];
	}
	const assignment = assignmentsData.assignments?.find(
		(a: AssignmentData) => a.id === params.assignmentId
	);

	if (!assignment) {
		throw error(404, 'Assignation non trouvee');
	}

	return {
		worksheet: worksheetData.worksheet,
		assignment,
		worksheetId: params.id,
		assignmentId: params.assignmentId,
		user
	};
};
