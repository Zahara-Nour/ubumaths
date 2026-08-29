/**
 * Agrégations famille B (compétences math) au niveau classe.
 *
 * 2 fonctions exposées :
 *   - getClassCompetenceGrid           → Widget F (grille élève × 6 compétences math)
 *   - getClassTopObservablesToConsolidate → Widget G (top observables % minus)
 *
 * Performance : approche batchée (1-3 queries par fonction).
 * Cf. `docs/ref/teacher-analytics.md` §4.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { MathCompetenceLevel } from '$lib/types/skills';
import type { ClassStudent } from './class-knowledge';

type SB = SupabaseClient<Database>;

// ===========================================================================
// Types publics
// ===========================================================================

export interface MathCompetence {
	id: string;
	code: string;
	name: string;
	display_order: number;
}

export interface ClassCompetenceGrid {
	students: ClassStudent[];
	competences: MathCompetence[];
	/** Map clé `${studentId}:${competenceId}` → niveau ou null si pas de row. */
	cells: Record<string, MathCompetenceLevel | null>;
	/** % `satisfaisante` + `tres_bonne` par compétence. */
	columnSatisfaitPct: Record<string, number>;
	/** Date ISO de la dernière saisie sur l'ensemble de la classe (ou null). */
	last_saisie_at: string | null;
}

export interface TopObservableToConsolidate {
	observable_id: string;
	observable_code: string | null;
	observable_name: string;
	subdimension_letter: string | null;
	subdimension_name: string | null;
	competence_code: string | null;
	students_concerned: {
		student_id: string;
		display_name: string;
		last_attempt_at: string | null;
	}[];
	minus_pct: number;
}

// ===========================================================================
// Widget F — Grille compétence × classe
// ===========================================================================

export async function getClassCompetenceGrid(
	supabase: SB,
	classId: string
): Promise<ClassCompetenceGrid> {
	const { data: members, error: membersErr } = await supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, firstname, lastname)')
		.eq('class_id', classId)
		.eq('status', 'active');

	if (membersErr) {
		console.error('[class-competence] class_members lookup failed:', membersErr);
		return {
			students: [],
			competences: [],
			cells: {},
			columnSatisfaitPct: {},
			last_saisie_at: null
		};
	}

	type MemberRow = {
		student_id: string;
		profiles: { id: string; firstname: string | null; lastname: string | null } | null;
	};
	const memberRows = (members ?? []) as unknown as MemberRow[];
	const students: ClassStudent[] = memberRows
		.filter((m) => m.profiles)
		.map((m) => ({
			id: m.student_id,
			display_name: formatName(m.profiles!.firstname, m.profiles!.lastname)
		}))
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	const { data: compRows } = await supabase
		.from('math_competences')
		.select('id, code, name, display_order')
		.order('display_order', { ascending: true });

	const competences: MathCompetence[] = (compRows ?? []).map((c) => ({
		id: c.id,
		code: c.code,
		name: c.name,
		display_order: c.display_order
	}));

	if (students.length === 0 || competences.length === 0) {
		return {
			students,
			competences,
			cells: {},
			columnSatisfaitPct: {},
			last_saisie_at: null
		};
	}

	const studentIds = students.map((s) => s.id);

	const { data: levelRows, error: levelErr } = await supabase
		.from('student_competence_level')
		.select('student_id, math_competence_id, niveau, last_recalc_at')
		.in('student_id', studentIds);

	if (levelErr) {
		console.error('[class-competence] student_competence_level lookup failed:', levelErr);
	}

	type LevelRow = {
		student_id: string;
		math_competence_id: string;
		niveau: string;
		last_recalc_at: string;
	};
	const levels = (levelRows ?? []) as LevelRow[];

	const cells: Record<string, MathCompetenceLevel | null> = {};
	let lastSaisieIso: string | null = null;
	for (const s of students) {
		for (const c of competences) {
			cells[`${s.id}:${c.id}`] = null;
		}
	}
	for (const row of levels) {
		cells[`${row.student_id}:${row.math_competence_id}`] = row.niveau as MathCompetenceLevel;
		if (!lastSaisieIso || row.last_recalc_at > lastSaisieIso) {
			lastSaisieIso = row.last_recalc_at;
		}
	}

	const columnSatisfaitPct: Record<string, number> = {};
	for (const c of competences) {
		let satisfait = 0;
		for (const s of students) {
			const lvl = cells[`${s.id}:${c.id}`];
			if (lvl === 'satisfaisante' || lvl === 'tres_bonne') satisfait += 1;
		}
		columnSatisfaitPct[c.id] = Math.round((satisfait / students.length) * 100);
	}

	return {
		students,
		competences,
		cells,
		columnSatisfaitPct,
		last_saisie_at: lastSaisieIso
	};
}

// ===========================================================================
// Widget G — Top observables à consolider
// ===========================================================================

export async function getClassTopObservablesToConsolidate(
	supabase: SB,
	classId: string,
	topN = 10
): Promise<TopObservableToConsolidate[]> {
	const { data: members } = await supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, firstname, lastname)')
		.eq('class_id', classId)
		.eq('status', 'active');

	type MemberRow = {
		student_id: string;
		profiles: { id: string; firstname: string | null; lastname: string | null } | null;
	};
	const memberRows = (members ?? []) as unknown as MemberRow[];

	const studentById = new Map<string, ClassStudent>();
	for (const m of memberRows) {
		if (!m.profiles) continue;
		studentById.set(m.student_id, {
			id: m.student_id,
			display_name: formatName(m.profiles.firstname, m.profiles.lastname)
		});
	}

	const studentIds = [...studentById.keys()];
	if (studentIds.length === 0) return [];

	const { data: stateRows, error: stateErr } = await supabase
		.from('student_observable_state')
		.select('student_id, observable_id, count_minus, count_plus, last_attempt_at')
		.in('student_id', studentIds);

	if (stateErr) {
		console.error('[class-competence] student_observable_state lookup failed:', stateErr);
		return [];
	}

	type StateRow = {
		student_id: string;
		observable_id: string;
		count_minus: number;
		count_plus: number;
		last_attempt_at: string | null;
	};
	const rows = (stateRows ?? []) as StateRow[];

	const observableStats = new Map<
		string,
		{
			minusStudents: { id: string; last_attempt_at: string | null }[];
			seenStudents: Set<string>;
		}
	>();

	for (const r of rows) {
		const total = r.count_minus + r.count_plus;
		if (total === 0) continue;
		const entry = observableStats.get(r.observable_id) ?? {
			minusStudents: [],
			seenStudents: new Set<string>()
		};
		entry.seenStudents.add(r.student_id);
		if (r.count_minus > r.count_plus) {
			entry.minusStudents.push({ id: r.student_id, last_attempt_at: r.last_attempt_at });
		}
		observableStats.set(r.observable_id, entry);
	}

	const observedObservableIds = [...observableStats.keys()];
	if (observedObservableIds.length === 0) return [];

	const { data: observableRows } = await supabase
		.from('observables')
		.select(
			'id, name, observable_code, subdimension_id, math_competence_subdimensions(letter, name, math_competence_id, math_competences(code))'
		)
		.in('id', observedObservableIds);

	type ObservableRow = {
		id: string;
		name: string;
		observable_code: string;
		subdimension_id: string;
		math_competence_subdimensions: {
			letter: string;
			name: string;
			math_competence_id: string;
			math_competences: { code: string } | null;
		} | null;
	};
	const observables = (observableRows ?? []) as unknown as ObservableRow[];

	const result: TopObservableToConsolidate[] = observables.map((sk) => {
		const stats = observableStats.get(sk.id);
		const minusList = stats?.minusStudents ?? [];
		const observedCount = stats?.seenStudents.size ?? 0;
		const concerned = minusList
			.map((m) => ({
				student_id: m.id,
				display_name: studentById.get(m.id)?.display_name ?? '?',
				last_attempt_at: m.last_attempt_at
			}))
			.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

		return {
			observable_id: sk.id,
			observable_code: sk.observable_code,
			observable_name: sk.name,
			subdimension_letter: sk.math_competence_subdimensions?.letter ?? null,
			subdimension_name: sk.math_competence_subdimensions?.name ?? null,
			competence_code: sk.math_competence_subdimensions?.math_competences?.code ?? null,
			students_concerned: concerned,
			minus_pct: observedCount > 0 ? Math.round((minusList.length / observedCount) * 100) : 0
		};
	});

	return result
		.filter((r) => r.minus_pct > 0)
		.sort((a, b) => b.minus_pct - a.minus_pct)
		.slice(0, topN);
}

// ===========================================================================
// Helpers internes
// ===========================================================================

function formatName(first: string | null, last: string | null): string {
	const f = (first ?? '').trim();
	const l = (last ?? '').trim();
	return [f, l].filter(Boolean).join(' ') || 'Élève sans nom';
}
