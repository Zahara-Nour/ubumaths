/**
 * Teacher — Programme (curriculum tree editor) — server load.
 *
 * Loads the Thème → Item → Point tree for the selected grade (?grade=, default
 * '6'). Mutations happen client-side via the /api/teacher/curriculum endpoints.
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { gradeCodeSchema } from '$lib/server/validation/grades';
import { getCurriculumTree } from '$lib/server/curriculum';
import { GRADE_CODES, GRADES } from '$lib/types/grades';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const rawGrade = url.searchParams.get('grade') ?? '6';
	const grade = gradeCodeSchema.safeParse(rawGrade).success ? rawGrade : '6';

	const tree = await getCurriculumTree(locals.supabase, grade);

	return {
		grade,
		gradeOptions: GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].shortName })),
		tree
	};
};
