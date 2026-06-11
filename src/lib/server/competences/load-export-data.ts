/**
 * Loads the competence-export data for a class: the ordered list of math
 * competences and one `ExportStudentRow` per active student (last/first name,
 * level + task_count + last observation per competence).
 *
 * Shared by the export endpoint (`/api/teacher/competences/export`) and the
 * teacher view page so both render strictly the same data. RLS is enforced by
 * the caller's authenticated `locals.supabase` (policy
 * `student_competence_level_select_teacher`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { MathCompetenceLevel } from '$lib/types/skills';
import type { ExportCompetence, ExportStudentRow } from './export-csv';

type SB = SupabaseClient<Database>;

export interface ClassCompetenceExportData {
	competences: ExportCompetence[];
	rows: ExportStudentRow[];
}

interface ProfileJoin {
	id: string;
	firstname: string | null;
	lastname: string | null;
}

function unwrapProfile(p: ProfileJoin | ProfileJoin[] | null): ProfileJoin | null {
	if (!p) return null;
	return Array.isArray(p) ? (p[0] ?? null) : p;
}

export async function loadClassCompetenceExport(
	supabase: SB,
	classId: string,
	className: string
): Promise<ClassCompetenceExportData> {
	// 1. Active students of the class with their names.
	const { data: members } = await supabase
		.from('class_members')
		.select('student_id, profiles:student_id (id, firstname, lastname)')
		.eq('class_id', classId)
		.eq('status', 'active');

	// 2. The six math competences, in display order.
	const { data: compRows } = await supabase
		.from('math_competences')
		.select('id, code, name, display_order')
		.order('display_order', { ascending: true });

	const competenceIdToCode = new Map<string, string>();
	const competences: ExportCompetence[] = (compRows ?? []).map((c) => {
		competenceIdToCode.set(c.id, c.code);
		return { code: c.code, name: c.name };
	});

	const students = (members ?? [])
		.map((m) => {
			const p = unwrapProfile(m.profiles as ProfileJoin | ProfileJoin[] | null);
			return p ? { id: p.id, firstName: p.firstname ?? '', lastName: p.lastname ?? '' } : null;
		})
		.filter((s): s is { id: string; firstName: string; lastName: string } => s !== null);

	if (students.length === 0 || competences.length === 0) {
		return { competences, rows: [] };
	}

	// 3. Current levels for those students.
	const studentIds = students.map((s) => s.id);
	const { data: levelRows } = await supabase
		.from('student_competence_level')
		.select('student_id, math_competence_id, niveau, task_count, last_recalc_at')
		.in('student_id', studentIds);

	const rowByStudent = new Map<string, ExportStudentRow>();
	for (const s of students) {
		rowByStudent.set(s.id, {
			lastName: s.lastName,
			firstName: s.firstName,
			className,
			levels: {},
			taskCounts: {},
			lastObservations: {}
		});
	}

	for (const lvl of levelRows ?? []) {
		const row = rowByStudent.get(lvl.student_id);
		const code = competenceIdToCode.get(lvl.math_competence_id);
		if (!row || !code) continue;
		row.levels[code] = lvl.niveau as MathCompetenceLevel;
		row.taskCounts![code] = lvl.task_count;
		row.lastObservations![code] = lvl.last_recalc_at;
	}

	return { competences, rows: [...rowByStudent.values()] };
}
