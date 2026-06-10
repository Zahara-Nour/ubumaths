/**
 * Agrégations famille A (knowledge / FSRS) au niveau classe.
 *
 * 5 fonctions exposées :
 *   - getClassCapacityGrid          → Widget A (grille élève × capacité)
 *   - getClassTopCapacitiesToRemediate → Widget E (top à remédier)
 *   - getStudentRetentionCurve      → Widget B (8 semaines, stability moyenne par thème)
 *   - getClassActivityHeatmap       → Widget C (30 jours × élèves, reviews/jour)
 *   - getStudentGradeHistogram      → Widget D (7 jours, distribution {1,2,3,4})
 *
 * Performance : approche batchée (1-3 queries par fonction, pas N×queries).
 * Cf. `docs/ref/teacher-analytics.md` §3.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	templateToBadge,
	BADGE_PRIORITY,
	type CapacityBadge
} from '$lib/server/srs/capacity-badge';

type SB = SupabaseClient<Database>;

type CardState = 'new' | 'learning' | 'review' | 'relearning';

// ===========================================================================
// Types publics
// ===========================================================================

export interface ClassStudent {
	id: string;
	display_name: string;
}

export interface ClassCapacity {
	id: string;
	name: string;
	theme_code: string | null;
	theme_name: string | null;
}

export interface ClassCapacityGrid {
	students: ClassStudent[];
	capacities: ClassCapacity[];
	/** Map clé `${studentId}:${capacityId}` → badge. */
	cells: Record<string, CapacityBadge>;
	/** Stats colonne : skillId → { acquise_pct, remediate_pct }. */
	columnStats: Record<string, { acquise_pct: number; remediate_pct: number }>;
}

export interface TopCapacityToRemediate {
	skill_id: string;
	skill_name: string;
	theme_code: string | null;
	students_concerned: { student_id: string; display_name: string; badge: CapacityBadge }[];
	remediate_pct: number;
}

export interface RetentionPoint {
	week_start: string;
	retrievability_avg: number;
	review_count: number;
}

export interface HeatmapCell {
	student_id: string;
	day: string;
	review_count: number;
	success_pct: number;
}

export interface HeatmapStudent {
	id: string;
	display_name: string;
	days_since_last_review: number | null;
	is_alert: boolean;
}

export interface GradeHistogramBucket {
	grade: 1 | 2 | 3 | 4;
	count: number;
	avg_stability_after: number;
}

// ===========================================================================
// Widget A — Grille capacité × classe
// ===========================================================================

interface GetClassCapacityGridOpts {
	/** Si true, inclut toutes les capacités du cycle, même celles sans skill_attempts. */
	includeAllCycle?: boolean;
}

export async function getClassCapacityGrid(
	supabase: SB,
	classId: string,
	opts: GetClassCapacityGridOpts = {}
): Promise<ClassCapacityGrid> {
	const { data: members, error: membersErr } = await supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, first_name, last_name)')
		.eq('class_id', classId)
		.eq('status', 'active');

	if (membersErr) {
		console.error('[class-knowledge] class_members lookup failed:', membersErr);
		return { students: [], capacities: [], cells: {}, columnStats: {} };
	}

	type MemberRow = {
		student_id: string;
		profiles: { id: string; first_name: string | null; last_name: string | null } | null;
	};
	const studentRows = (members ?? []) as unknown as MemberRow[];
	const students: ClassStudent[] = studentRows
		.filter((m) => m.profiles)
		.map((m) => ({
			id: m.student_id,
			display_name: formatName(m.profiles!.first_name, m.profiles!.last_name)
		}))
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	if (students.length === 0) {
		return { students: [], capacities: [], cells: {}, columnStats: {} };
	}

	const studentIds = students.map((s) => s.id);

	const { data: attemptsRaw, error: attErr } = await supabase
		.from('skill_attempts')
		.select('student_id, template_id')
		.in('student_id', studentIds)
		.not('template_id', 'is', null);

	if (attErr) {
		console.error('[class-knowledge] skill_attempts lookup failed:', attErr);
		return { students, capacities: [], cells: {}, columnStats: {} };
	}

	const templateIds = [...new Set((attemptsRaw ?? []).map((a) => a.template_id as string))];

	let capacities: ClassCapacity[] = [];
	const templateToSkillIds = new Map<string, string[]>();

	if (templateIds.length > 0) {
		const { data: tagRows, error: tagErr } = await supabase
			.from('question_template_skills')
			.select(
				'template_id, skill_id, skills!inner(id, name, family, objective_id, skill_objectives(theme_id, skill_themes(name, bo_reference)))'
			)
			.in('template_id', templateIds)
			.eq('skills.family', 'knowledge');

		if (tagErr) {
			console.error('[class-knowledge] question_template_skills lookup failed:', tagErr);
		}

		type TagRow = {
			template_id: string;
			skill_id: string;
			skills: {
				id: string;
				name: string;
				family: string | null;
				objective_id: string | null;
				skill_objectives: {
					theme_id: string;
					skill_themes: { name: string; bo_reference: string | null } | null;
				} | null;
			} | null;
		};
		const tagged = (tagRows ?? []) as unknown as TagRow[];

		const capById = new Map<string, ClassCapacity>();
		for (const r of tagged) {
			if (!r.skills) continue;
			capById.set(r.skill_id, {
				id: r.skill_id,
				name: r.skills.name,
				theme_code: r.skills.skill_objectives?.skill_themes?.bo_reference ?? null,
				theme_name: r.skills.skill_objectives?.skill_themes?.name ?? null
			});
			const list = templateToSkillIds.get(r.template_id) ?? [];
			list.push(r.skill_id);
			templateToSkillIds.set(r.template_id, list);
		}
		capacities = [...capById.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	}

	if (opts.includeAllCycle) {
		// Toggle "Tout le cycle" : on étend aux capacités du même niveau scolaire
		// que la classe, même non touchées. Cf. plan §Phase 0 #2.
		const { data: classRow } = await supabase
			.from('classes')
			.select('grade')
			.eq('id', classId)
			.maybeSingle();

		if (classRow?.grade) {
			const { data: cycleSkills } = await supabase
				.from('skills')
				.select(
					'id, name, objective_id, skill_objectives(theme_id, skill_themes(name, bo_reference))'
				)
				.eq('family', 'knowledge')
				.eq('niveau_scolaire', classRow.grade);

			type CycleRow = {
				id: string;
				name: string;
				objective_id: string | null;
				skill_objectives: {
					theme_id: string;
					skill_themes: { name: string; bo_reference: string | null } | null;
				} | null;
			};
			const existing = new Set(capacities.map((c) => c.id));
			for (const s of ((cycleSkills ?? []) as unknown as CycleRow[]).filter(
				(s) => !existing.has(s.id)
			)) {
				capacities.push({
					id: s.id,
					name: s.name,
					theme_code: s.skill_objectives?.skill_themes?.bo_reference ?? null,
					theme_name: s.skill_objectives?.skill_themes?.name ?? null
				});
			}
			capacities.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
		}
	}

	const { data: fsrsRows, error: fsrsErr } =
		templateIds.length > 0
			? await supabase
					.from('srs_card_stats')
					.select('user_id, card_reference_id, state, next_review')
					.in('user_id', studentIds)
					.eq('card_reference_type', 'template')
					.in('card_reference_id', templateIds)
			: { data: [], error: null };

	if (fsrsErr) {
		console.error('[class-knowledge] srs_card_stats lookup failed:', fsrsErr);
	}

	type FsrsRow = {
		user_id: string;
		card_reference_id: string;
		state: CardState;
		next_review: string;
	};
	const stateByStudentTpl = new Map<string, FsrsRow>();
	for (const r of (fsrsRows ?? []) as FsrsRow[]) {
		stateByStudentTpl.set(`${r.user_id}:${r.card_reference_id}`, r);
	}

	const studentTemplateIds = new Map<string, Set<string>>();
	for (const a of attemptsRaw ?? []) {
		const set = studentTemplateIds.get(a.student_id) ?? new Set();
		set.add(a.template_id as string);
		studentTemplateIds.set(a.student_id, set);
	}

	const now = Date.now();
	const cells: Record<string, CapacityBadge> = {};
	for (const student of students) {
		const tplSeen = studentTemplateIds.get(student.id) ?? new Set<string>();
		for (const cap of capacities) {
			const taggedTemplates = [...tplSeen].filter((tplId) =>
				(templateToSkillIds.get(tplId) ?? []).includes(cap.id)
			);
			let badge: CapacityBadge = 'non_commencee';
			if (taggedTemplates.length > 0) {
				const subBadges: CapacityBadge[] = taggedTemplates.map((tplId) => {
					const fsrs = stateByStudentTpl.get(`${student.id}:${tplId}`);
					if (!fsrs) return 'en_apprentissage';
					return templateToBadge(fsrs.state, fsrs.next_review, now);
				});
				badge = subBadges.reduce<CapacityBadge>(
					(acc, b) => (BADGE_PRIORITY[b] > BADGE_PRIORITY[acc] ? b : acc),
					'non_commencee'
				);
			}
			cells[`${student.id}:${cap.id}`] = badge;
		}
	}

	const columnStats: Record<string, { acquise_pct: number; remediate_pct: number }> = {};
	for (const cap of capacities) {
		let acquise = 0;
		let remediate = 0;
		for (const s of students) {
			const b = cells[`${s.id}:${cap.id}`];
			if (b === 'acquise_en_memoire') acquise += 1;
			if (b === 'a_remedier' || b === 'a_renforcer') remediate += 1;
		}
		columnStats[cap.id] = {
			acquise_pct: Math.round((acquise / students.length) * 100),
			remediate_pct: Math.round((remediate / students.length) * 100)
		};
	}

	return { students, capacities, cells, columnStats };
}

// ===========================================================================
// Widget E — Top capacités à remédier
// ===========================================================================

export async function getClassTopCapacitiesToRemediate(
	supabase: SB,
	classId: string,
	topN = 10
): Promise<TopCapacityToRemediate[]> {
	const grid = await getClassCapacityGrid(supabase, classId);
	if (grid.students.length === 0 || grid.capacities.length === 0) return [];

	const rows: TopCapacityToRemediate[] = grid.capacities.map((cap) => {
		const studentsConcerned = grid.students
			.map((s) => ({
				student_id: s.id,
				display_name: s.display_name,
				badge: grid.cells[`${s.id}:${cap.id}`]
			}))
			.filter((r) => r.badge === 'a_remedier' || r.badge === 'a_renforcer');

		return {
			skill_id: cap.id,
			skill_name: cap.name,
			theme_code: cap.theme_code,
			students_concerned: studentsConcerned,
			remediate_pct: grid.columnStats[cap.id]?.remediate_pct ?? 0
		};
	});

	return rows
		.filter((r) => r.remediate_pct > 0)
		.sort((a, b) => b.remediate_pct - a.remediate_pct)
		.slice(0, topN);
}

// ===========================================================================
// Widget B — Courbe rétention par élève × thème
// ===========================================================================

export async function getStudentRetentionCurve(
	supabase: SB,
	studentId: string,
	themeBoReference: string,
	weeks = 8
): Promise<RetentionPoint[]> {
	const { data: skillRows } = await supabase
		.from('skills')
		.select('id, skill_objectives!inner(skill_themes!inner(bo_reference))')
		.eq('family', 'knowledge')
		.eq('skill_objectives.skill_themes.bo_reference', themeBoReference);

	type SkillRow = { id: string };
	const skillIds = ((skillRows ?? []) as unknown as SkillRow[]).map((s) => s.id);
	if (skillIds.length === 0) return [];

	const { data: tagRows } = await supabase
		.from('question_template_skills')
		.select('template_id')
		.in('skill_id', skillIds);

	const templateIds = [...new Set((tagRows ?? []).map((r) => r.template_id))];
	if (templateIds.length === 0) return [];

	const cutoffMs = Date.now() - weeks * 7 * 24 * 3600 * 1000;

	const { data: stats } = await supabase
		.from('srs_card_stats')
		.select('review_history')
		.eq('user_id', studentId)
		.eq('card_reference_type', 'template')
		.in('card_reference_id', templateIds);

	type ReviewEntry = {
		date: string;
		grade: number;
		elapsedDays: number;
		retrievability: number;
		timeSpent?: number;
	};
	type StatRow = { review_history: ReviewEntry[] | null };

	const buckets = new Map<string, { sum: number; count: number }>();
	for (let i = 0; i < weeks; i += 1) {
		const start = startOfWeekUTC(new Date(Date.now() - (weeks - 1 - i) * 7 * 24 * 3600 * 1000));
		buckets.set(start.toISOString(), { sum: 0, count: 0 });
	}

	for (const row of (stats ?? []) as unknown as StatRow[]) {
		const history = Array.isArray(row.review_history) ? row.review_history : [];
		for (const entry of history) {
			if (!entry?.date) continue;
			const entryMs = new Date(entry.date).getTime();
			if (entryMs < cutoffMs) continue;
			const weekStart = startOfWeekUTC(new Date(entry.date)).toISOString();
			const bucket = buckets.get(weekStart);
			if (!bucket) continue;
			if (typeof entry.retrievability === 'number') {
				bucket.sum += entry.retrievability;
				bucket.count += 1;
			}
		}
	}

	const result: RetentionPoint[] = [];
	for (const [weekStart, { sum, count }] of buckets) {
		result.push({
			week_start: weekStart,
			retrievability_avg: count > 0 ? sum / count : 0,
			review_count: count
		});
	}
	return result.sort((a, b) => a.week_start.localeCompare(b.week_start));
}

// ===========================================================================
// Widget C — Heatmap activité classe
// ===========================================================================

export interface ClassActivityHeatmap {
	days: string[];
	students: HeatmapStudent[];
	cells: HeatmapCell[];
}

export async function getClassActivityHeatmap(
	supabase: SB,
	classId: string,
	days = 30,
	alertThresholdDays = 5
): Promise<ClassActivityHeatmap> {
	const { data: members, error: membersErr } = await supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, first_name, last_name)')
		.eq('class_id', classId)
		.eq('status', 'active');

	if (membersErr) {
		console.error('[class-knowledge] heatmap class_members lookup failed:', membersErr);
		return { days: [], students: [], cells: [] };
	}

	type MemberRow = {
		student_id: string;
		profiles: { id: string; first_name: string | null; last_name: string | null } | null;
	};
	const memberRows = (members ?? []) as unknown as MemberRow[];

	const studentIds = memberRows.map((m) => m.student_id);
	if (studentIds.length === 0) return { days: [], students: [], cells: [] };

	const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

	const { data: attempts } = await supabase
		.from('skill_attempts')
		.select('student_id, created_at, success, source')
		.in('student_id', studentIds)
		.gte('created_at', cutoff);

	type AttRow = {
		student_id: string;
		created_at: string;
		success: boolean | null;
		source: string;
	};
	const rows = (attempts ?? []) as AttRow[];

	const dayKeys: string[] = [];
	for (let i = 0; i < days; i += 1) {
		dayKeys.push(toDayKey(new Date(Date.now() - (days - 1 - i) * 24 * 3600 * 1000)));
	}

	const cellMap = new Map<string, { count: number; successCount: number }>();
	const lastReviewByStudent = new Map<string, string>();
	for (const r of rows) {
		const dayKey = toDayKey(new Date(r.created_at));
		const key = `${r.student_id}:${dayKey}`;
		const cell = cellMap.get(key) ?? { count: 0, successCount: 0 };
		cell.count += 1;
		if (r.success) cell.successCount += 1;
		cellMap.set(key, cell);

		const last = lastReviewByStudent.get(r.student_id);
		if (!last || r.created_at > last) lastReviewByStudent.set(r.student_id, r.created_at);
	}

	const nowMs = Date.now();
	const studentsOut: HeatmapStudent[] = memberRows
		.filter((m) => m.profiles)
		.map((m) => {
			const last = lastReviewByStudent.get(m.student_id);
			const daysSince = last
				? Math.floor((nowMs - new Date(last).getTime()) / (24 * 3600 * 1000))
				: null;
			return {
				id: m.student_id,
				display_name: formatName(m.profiles!.first_name, m.profiles!.last_name),
				days_since_last_review: daysSince,
				is_alert: daysSince === null || daysSince > alertThresholdDays
			};
		})
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	const cells: HeatmapCell[] = [];
	for (const s of studentsOut) {
		for (const day of dayKeys) {
			const cell = cellMap.get(`${s.id}:${day}`) ?? { count: 0, successCount: 0 };
			cells.push({
				student_id: s.id,
				day,
				review_count: cell.count,
				success_pct: cell.count > 0 ? Math.round((cell.successCount / cell.count) * 100) : 0
			});
		}
	}

	return { days: dayKeys, students: studentsOut, cells };
}

// ===========================================================================
// Widget D — Histogramme grades par élève
// ===========================================================================

export async function getStudentGradeHistogram(
	supabase: SB,
	studentId: string,
	days = 7
): Promise<GradeHistogramBucket[]> {
	const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

	const { data: rows } = await supabase
		.from('skill_attempts')
		.select('grade, created_at, template_id')
		.eq('student_id', studentId)
		.gte('created_at', cutoff)
		.not('grade', 'is', null);

	type AttRow = { grade: number | null; created_at: string; template_id: string | null };
	const attempts = (rows ?? []) as AttRow[];

	const buckets: Record<1 | 2 | 3 | 4, { count: number; stabSum: number; stabCount: number }> = {
		1: { count: 0, stabSum: 0, stabCount: 0 },
		2: { count: 0, stabSum: 0, stabCount: 0 },
		3: { count: 0, stabSum: 0, stabCount: 0 },
		4: { count: 0, stabSum: 0, stabCount: 0 }
	};

	for (const a of attempts) {
		const g = a.grade;
		if (g === 1 || g === 2 || g === 3 || g === 4) buckets[g].count += 1;
	}

	const templateIds = [...new Set(attempts.map((a) => a.template_id).filter(Boolean))] as string[];
	if (templateIds.length > 0) {
		const { data: stats } = await supabase
			.from('srs_card_stats')
			.select('card_reference_id, stability')
			.eq('user_id', studentId)
			.eq('card_reference_type', 'template')
			.in('card_reference_id', templateIds);

		type StatRow = { card_reference_id: string; stability: number | null };
		const stabByTpl = new Map<string, number>();
		for (const s of (stats ?? []) as StatRow[]) {
			if (s.stability != null) stabByTpl.set(s.card_reference_id, s.stability);
		}
		for (const a of attempts) {
			const g = a.grade;
			if ((g === 1 || g === 2 || g === 3 || g === 4) && a.template_id) {
				const stab = stabByTpl.get(a.template_id);
				if (stab != null) {
					buckets[g].stabSum += stab;
					buckets[g].stabCount += 1;
				}
			}
		}
	}

	return ([1, 2, 3, 4] as const).map((g) => ({
		grade: g,
		count: buckets[g].count,
		avg_stability_after: buckets[g].stabCount > 0 ? buckets[g].stabSum / buckets[g].stabCount : 0
	}));
}

// ===========================================================================
// Helpers internes
// ===========================================================================

function formatName(first: string | null, last: string | null): string {
	const f = (first ?? '').trim();
	const l = (last ?? '').trim();
	return [f, l].filter(Boolean).join(' ') || 'Élève sans nom';
}

function toDayKey(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function startOfWeekUTC(d: Date): Date {
	const day = d.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	const result = new Date(d);
	result.setUTCDate(result.getUTCDate() + diff);
	result.setUTCHours(0, 0, 0, 0);
	return result;
}
