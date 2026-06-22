/**
 * Teacher — Avancement du programme (coverage heatmap) — server load.
 *
 * For a class, shows how many times each curriculum point was worked on during
 * the current school year (count from journal_entry_points), rolled up to items
 * and themes. Read-only.
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { getCurriculumTree, type CurriculumTreeTheme } from '$lib/server/curriculum';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const { data: classesRaw } = await locals.supabase
		.from('classes')
		.select('id, name, grade')
		.order('name', { ascending: true });
	const classes = (classesRaw ?? []) as { id: string; name: string; grade: string | null }[];

	const requested = url.searchParams.get('class');
	const selected = classes.find((c) => c.id === requested) ?? classes[0] ?? null;

	// Current school year window: 1 Sept → 1 Sept.
	const now = new Date();
	const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
	const yearStart = `${startYear}-09-01`;
	const yearEnd = `${startYear + 1}-09-01`;

	let tree: CurriculumTreeTheme[] = [];
	const counts: Record<string, number> = {};

	if (selected?.grade) {
		tree = await getCurriculumTree(locals.supabase, selected.grade);

		const { data: entries } = await locals.supabase
			.from('class_journal_entries')
			.select('id')
			.eq('class_id', selected.id)
			.gte('entry_date', yearStart)
			.lt('entry_date', yearEnd);
		const entryIds = (entries ?? []).map((e) => e.id);

		if (entryIds.length > 0) {
			const { data: cov } = await locals.supabase
				.from('journal_entry_points')
				.select('point_id')
				.in('entry_id', entryIds);
			for (const row of cov ?? []) {
				counts[row.point_id] = (counts[row.point_id] ?? 0) + 1;
			}
		}
	}

	return {
		classOptions: classes.map((c) => ({ value: c.id, label: c.name })),
		selectedClassId: selected?.id ?? '',
		selectedGrade: selected?.grade ?? null,
		schoolYearLabel: `${startYear}–${startYear + 1}`,
		tree,
		counts
	};
};
