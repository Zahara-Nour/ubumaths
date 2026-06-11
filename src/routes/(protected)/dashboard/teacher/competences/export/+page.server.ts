/**
 * Teacher view: consolidated competence levels for a class + CSV export.
 *
 * Classes and academic periods come from the parent teacher layout
 * (`+layout.server.ts`) — no extra query. The selected class drives a
 * server reload via the `?class=<uuid>` URL param; its export rows are loaded
 * with the same helper the export endpoint uses, so screen and CSV match.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { loadClassCompetenceExport } from '$lib/server/competences/load-export-data';
import type { ExportCompetence, ExportStudentRow } from '$lib/server/competences/export-csv';

export interface CompetencesExportPageData {
	classes: { id: string; name: string }[];
	periods: { id: string; name: string }[];
	currentPeriodId: string | null;
	selectedClassId: string | null;
	competences: ExportCompetence[];
	rows: ExportStudentRow[];
}

export const load: PageServerLoad = async ({
	locals,
	parent,
	url
}): Promise<CompetencesExportPageData> => {
	await requireRole(locals, 'teacher');
	const parentData = await parent();

	const classes = (parentData.classes ?? []).map((c) => ({ id: c.id, name: c.name }));
	const periods = (parentData.allPeriods ?? []).map((p) => ({ id: p.id, name: p.name }));
	const currentPeriodId = parentData.currentPeriod?.id ?? null;

	const requested = url.searchParams.get('class');
	const selectedClassId =
		requested && classes.some((c) => c.id === requested) ? requested : (classes[0]?.id ?? null);

	let competences: ExportCompetence[] = [];
	let rows: ExportStudentRow[] = [];
	if (selectedClassId) {
		const cls = classes.find((c) => c.id === selectedClassId);
		const data = await loadClassCompetenceExport(locals.supabase, selectedClassId, cls?.name ?? '');
		competences = data.competences;
		rows = data.rows;
	}

	return { classes, periods, currentPeriodId, selectedClassId, competences, rows };
};
