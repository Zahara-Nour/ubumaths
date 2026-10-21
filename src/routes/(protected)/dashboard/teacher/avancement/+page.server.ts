/**
 * Teacher — Avancement du programme (coverage heatmap) — server load.
 *
 * For a class, shows how many times each curriculum point was worked on during
 * the current school year (count from journal_entry_points), rolled up to
 * notions and branches of the programme tree. Read-only. Un point archivé
 * n'apparaît que s'il a été travaillé cette année.
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { getProgrammeTreeKeeping } from '$lib/server/programme-tree';
import type { ProgrammeBranch } from '$lib/utils/programme-tree';
import { error } from '@sveltejs/kit';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/teacher/avancement/+page.server');

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const { data: classesRaw, error: classesRawError } = await locals.supabase
		.from('classes')
		.select('id, name, grade')
		.order('name', { ascending: true });

	if (classesRawError) {
		logger.error('Lecture impossible :', classesRawError);
		throw error(500, 'Impossible de charger les données');
	}
	const classes = (classesRaw ?? []) as { id: string; name: string; grade: string | null }[];

	const requested = url.searchParams.get('class');
	const selected = classes.find((c) => c.id === requested) ?? classes[0] ?? null;

	// Current school year window: 1 Sept → 1 Sept.
	const now = new Date();
	const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
	const yearStart = `${startYear}-09-01`;
	const yearEnd = `${startYear + 1}-09-01`;

	let tree: ProgrammeBranch[] = [];
	const counts: Record<string, number> = {};

	if (selected?.grade) {
		const { data: entries, error: entriesError } = await locals.supabase
			.from('class_journal_entries')
			.select('id')
			.eq('class_id', selected.id)
			.gte('entry_date', yearStart)
			.lt('entry_date', yearEnd);

		if (entriesError) {
			logger.error('Lecture impossible :', entriesError);
			throw error(500, 'Impossible de charger les données');
		}
		const entryIds = (entries ?? []).map((e) => e.id);

		if (entryIds.length > 0) {
			const { data: cov, error: covError } = await locals.supabase
				.from('journal_entry_points')
				.select('point_id')
				.in('entry_id', entryIds);

			if (covError) {
				logger.error('Lecture impossible :', covError);
				throw error(500, 'Impossible de charger les données');
			}
			for (const row of cov ?? []) {
				counts[row.point_id] = (counts[row.point_id] ?? 0) + 1;
			}
		}

		// Arbre lu APRÈS les passages : un archivé travaillé cette année reste visible.
		tree = await getProgrammeTreeKeeping(locals.supabase, selected.grade, Object.keys(counts));
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
