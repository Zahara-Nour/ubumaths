/**
 * Teacher — Programme (curriculum tree editor) — server load.
 *
 * Loads the Thème → Item → Point tree for the selected grade (?grade=, default
 * '6'). Mutations happen client-side via the /api/teacher/curriculum endpoints.
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { gradeCodeSchema } from '$lib/server/validation/grades';
import { THEME_COLS, ITEM_COLS, POINT_COLS } from '$lib/server/curriculum';
import { GRADE_CODES, GRADES } from '$lib/types/grades';
import type { CurriculumTheme, CurriculumItem, CurriculumPoint } from '$lib/types/database-helpers';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const rawGrade = url.searchParams.get('grade') ?? '6';
	const grade = gradeCodeSchema.safeParse(rawGrade).success ? rawGrade : '6';

	const { data: themes } = await locals.supabase
		.from('curriculum_themes')
		.select(THEME_COLS)
		.eq('grade', grade)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	const themeList = (themes ?? []) as CurriculumTheme[];
	const themeIds = themeList.map((t) => t.id);

	let itemList: CurriculumItem[] = [];
	let pointList: CurriculumPoint[] = [];

	if (themeIds.length > 0) {
		const { data: items } = await locals.supabase
			.from('curriculum_items')
			.select(ITEM_COLS)
			.in('theme_id', themeIds)
			.order('display_order', { ascending: true })
			.order('name', { ascending: true });
		itemList = (items ?? []) as CurriculumItem[];

		const itemIds = itemList.map((i) => i.id);
		if (itemIds.length > 0) {
			const { data: points } = await locals.supabase
				.from('curriculum_points')
				.select(POINT_COLS)
				.in('item_id', itemIds)
				.order('display_order', { ascending: true })
				.order('name', { ascending: true });
			pointList = (points ?? []) as CurriculumPoint[];
		}
	}

	const tree = themeList.map((theme) => ({
		...theme,
		items: itemList
			.filter((i) => i.theme_id === theme.id)
			.map((item) => ({
				...item,
				points: pointList.filter((p) => p.item_id === item.id)
			}))
	}));

	return {
		grade,
		gradeOptions: GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].shortName })),
		tree
	};
};
