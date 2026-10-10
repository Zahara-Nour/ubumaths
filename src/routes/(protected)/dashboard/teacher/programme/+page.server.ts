/**
 * Teacher — Programme — server load.
 *
 * Consultation du programme d'un niveau (?grade=, '6' par défaut) dans la
 * génération NEUVE des points (ADR 0020) : branche > notion > points, dans
 * l'ordre du BO. Seuls renommer et archiver un point restent possibles (via
 * PATCH /api/teacher/curriculum/points/[pointId]).
 *
 * C'est la seule page qui demande les points archivés : ailleurs ils sont
 * invisibles, ici ils doivent se voir pour être restaurés.
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { gradeCodeSchema } from '$lib/server/validation/grades';
import { getProgrammeTree } from '$lib/server/programme-tree';
import { GRADE_CODES, GRADES } from '$lib/types/grades';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsedGrade = gradeCodeSchema.safeParse(url.searchParams.get('grade') ?? '6');
	const grade = parsedGrade.success ? parsedGrade.data : '6';

	return {
		grade,
		gradeOptions: GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].shortName })),
		tree: await getProgrammeTree(locals.supabase, grade, { includeArchived: true })
	};
};
