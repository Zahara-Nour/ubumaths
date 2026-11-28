/**
 * Teacher — Avancement du programme (coverage heatmap) — server load.
 *
 * For a class, shows how many times each curriculum point was worked on during
 * the current school year (count from journal_entry_points), rolled up to
 * notions and branches of the programme tree. Read-only. Un point archivé
 * n'apparaît que s'il a été travaillé cette année, et ne compte pas dans le
 * « vus / total » (`coverageStats`, B3).
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { getProgrammeTreeKeeping } from '#lib/server/programme-tree.ts';
import type { ProgrammeBranch } from '#lib/utils/programme-tree.ts';
import { error } from '@sveltejs/kit';
import { currentSchoolYear, type SchoolYearSpan } from '#lib/server/school-year.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('(protected)/dashboard/teacher/avancement/+page.server');

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const { data: classesRaw, error: classesRawError } = await locals.supabase
		.from('classes')
		.select('id, name, grade, school_id')
		.order('name', { ascending: true });

	if (classesRawError) {
		logger.error('Lecture impossible :', classesRawError);
		throw error(500, 'Impossible de charger les données');
	}
	const classes = (classesRaw ?? []) as {
		id: string;
		name: string;
		grade: string | null;
		school_id: string | null;
	}[];

	const requested = url.searchParams.get('class');
	const selected = classes.find((c) => c.id === requested) ?? classes[0] ?? null;

	// Année scolaire en cours (L38) : dates de l'école, sinon 1er sept. → 31 août
	let schoolYear: SchoolYearSpan;
	try {
		schoolYear = await currentSchoolYear(locals.supabase, selected?.school_id ?? null);
	} catch {
		throw error(500, 'Impossible de charger les données');
	}

	let tree: ProgrammeBranch[] = [];
	const counts: Record<string, number> = {};

	if (selected?.grade) {
		const { data: entries, error: entriesError } = await locals.supabase
			.from('class_journal_entries')
			.select('id')
			.eq('class_id', selected.id)
			.gte('entry_date', schoolYear.start)
			.lte('entry_date', schoolYear.end);

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
		schoolYearLabel: `${schoolYear.start.slice(0, 4)}–${schoolYear.end.slice(0, 4)}`,
		tree,
		counts
	};
};
