/**
 * Teacher Assignment Preview Page Server
 * =======================================
 *
 * Loads the list of students for the assignment preview selector.
 * The actual worksheet data is fetched client-side via API.
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

interface StudentItem {
	id: string;
	first_name: string | null;
	last_name: string | null;
	class_name: string | null;
}

const studentIdSchema = z.string().uuid();

export const load: PageServerLoad = async ({ params, locals, fetch, url }) => {
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

	// Élève présélectionné, lu dans l'adresse (lien « Voir la copie de… » d'un
	// signalement, D6) : retenu seulement s'il est dans la liste de
	// l'affectation, que le prof voit déjà ; sinon, vue prof.
	const requestedParam = url.searchParams.get('studentId');
	const requested = studentIdSchema.safeParse(requestedParam);
	const initialStudentId =
		requested.success && students.some((s) => s.id === requested.data) ? requested.data : null;
	// Élève demandé puis écarté (a quitté la classe, identifiant invalide) :
	// l'écran le dit, plutôt que de montrer en silence une autre copie
	const discardedStudent = requestedParam !== null && initialStudentId === null;

	return {
		worksheetId,
		assignmentId,
		students,
		initialStudentId,
		discardedStudent
	};
};
