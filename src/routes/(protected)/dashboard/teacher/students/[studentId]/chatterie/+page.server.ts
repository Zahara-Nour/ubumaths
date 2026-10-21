/**
 * La Chatterie d'un élève, vue par le professeur (lecture seule)
 * ==============================================================
 *
 * Même calcul que la page de l'élève (`readMathouCollection`), au client du
 * prof, sans JAMAIS écrire la mémoire : les nouveautés de fin de séance de
 * l'élève restent intactes.
 *
 * SÉCURITÉ :
 * - prof ou admin (`requireRoles`) ;
 * - l'élève doit être un élève du prof (`verifyTeacherStudentWithRole`) AVANT
 *   toute lecture : `readMathouCollection` n'a pas de garde, seule la RLS borne
 *   ce qu'elle lit.
 *
 * Une lecture en échec ne se montre pas comme une Chatterie vide : la page
 * reçoit `unavailable` et le dit.
 *
 * Phase 0 : docs/wip/mathoux-prof-progress.md · doc : docs/systeme/mathoux.md
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { readMathouCollection } from '$lib/server/mathoux/collection';
import type { MathouCollection } from '$lib/mathoux/collection-logic';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/students/[studentId]/chatterie/+page.server'
);

const paramsSchema = z.object({
	studentId: z.string().uuid('Identifiant d’élève invalide')
});

const EMPTY_COLLECTION: MathouCollection = {
	races: [],
	counts: { born: 0, napping: 0, toDiscover: 0 }
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	const parsed = paramsSchema.safeParse(params);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}
	const { studentId } = parsed.data;

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'Chatterie réservée aux élèves du professeur');
	}

	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, full_name, firstname, lastname, grade')
		.eq('id', studentId)
		.maybeSingle();
	if (studentError || !student) {
		if (studentError) logger.error('Élève illisible :', studentError);
		throw error(404, 'Élève non trouvé');
	}

	const fullName =
		student.full_name || `${student.firstname ?? ''} ${student.lastname ?? ''}`.trim() || 'Élève';
	const base = { student: { id: student.id, fullName }, hasGrade: student.grade !== null };

	try {
		const collection = await readMathouCollection(supabase, studentId, student.grade);
		return { ...base, collection, unavailable: false };
	} catch (err) {
		logger.error('Chatterie illisible :', err);
		return { ...base, collection: EMPTY_COLLECTION, unavailable: true };
	}
};
