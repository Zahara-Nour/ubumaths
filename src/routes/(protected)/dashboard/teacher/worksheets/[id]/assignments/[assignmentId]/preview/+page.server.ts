/**
 * Teacher Assignment Preview Page Server
 * =======================================
 *
 * Loads the list of students for the assignment preview selector.
 * The actual worksheet data is fetched client-side via API.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface StudentItem {
	id: string;
	first_name: string | null;
	last_name: string | null;
	class_name: string | null;
}

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const { id: worksheetId, assignmentId } = params;

	// Fetch students for this assignment (for the selector)
	const studentsResponse = await fetch(`/api/worksheets/assignments/${assignmentId}/students`);

	if (!studentsResponse.ok) {
		// If we can't access students, user probably doesn't have permission
		if (studentsResponse.status === 403 || studentsResponse.status === 404) {
			throw error(studentsResponse.status, 'Assignation non trouvee ou acces refuse');
		}
		throw error(500, 'Erreur lors du chargement des eleves');
	}

	const studentsData = await studentsResponse.json();

	// Map to simpler structure for the selector
	const students: StudentItem[] = (studentsData.students || []).map(
		(s: {
			id: string;
			first_name: string | null;
			last_name: string | null;
			class_name: string | null;
		}) => ({
			id: s.id,
			first_name: s.first_name,
			last_name: s.last_name,
			class_name: s.class_name
		})
	);

	return {
		worksheetId,
		assignmentId,
		students
	};
};
