/**
 * Teacher — Programme (curriculum tree editor) — server load.
 *
 * Loads the Thème → Item → Point tree for the selected grade (?grade=, default
 * '6'). Mutations happen client-side via the /api/teacher/curriculum endpoints.
 *
 * This is the one page that asks for archived points: everywhere else they are
 * meant to be invisible, here they must be seen to be restored.
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

	// Les deux requêtes partent ensemble ; les `await` séparés (plutôt qu'un
	// Promise.all déstructuré) gardent le typage du retour RPC.
	const treeQuery = getCurriculumTree(locals.supabase, grade, { includeArchived: true });
	// Quels points ne peuvent plus être supprimés sans perte. Une seule requête
	// pour tout le niveau : les interroger un par un ferait 153 allers-retours.
	const referencedQuery = locals.supabase.rpc('curriculum_referenced_points', { p_grade: grade });

	const tree = await treeQuery;
	// `locals.supabase` est déclaré sans le générique `Database` (app.d.ts) : les
	// retours RPC arrivent en `any`, on les renarrow ici comme ailleurs.
	const { data: referenced } = await referencedQuery;
	const referencedRows = (referenced ?? []) as { point_id: string }[];

	return {
		grade,
		gradeOptions: GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].shortName })),
		tree,
		referencedPointIds: referencedRows.map((r) => r.point_id)
	};
};
