/**
 * Taux de réussite de la classe par point et par notion (chantier
 * `taux-par-point`, besoin P3). Cf. `docs/systeme/analytique-prof.md`.
 *
 * Règles (décisions de David, 2026-11-14) :
 *   - Q2 : seul le PROUVÉ compte (sources `auto` + `teacher` : l'appli ou un
 *     adulte a jugé) ; le déclaré (`srs`, `student_self`) n'entre pas dans le
 *     taux, il ne donne qu'une mention « seulement déclaré » ;
 *   - Q3 : chaque élève pèse autant : taux de chaque élève, puis moyenne des
 *     élèves qui ont au moins une réponse prouvée ;
 *   - Q4 : depuis la rentrée (règle de la régularité) ;
 *   - Q5 : moins de 3 élèves → pas de taux (« pas assez de réponses »).
 *
 * La base compte, par élève actif × modèle (`class_template_success`) ; le
 * regroupement par point et par notion se fait ici. Au niveau de la notion,
 * chaque modèle compte une fois : un modèle lié à deux points de la même
 * notion ne double pas les réponses de l'élève.
 *
 * Le serveur n'envoie ni nom d'élève ni date : des taux et des effectifs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { fetchInChunks } from '$lib/server/utils/chunked-in';
import { keepLinksOfGrade } from '$lib/server/curriculum-grade';
import { PROGRAMME_POINT_COLS } from '$lib/server/programme-tree';
import type { ProgrammePointRow } from '$lib/utils/programme-tree';
import {
	isLivePoint,
	placeInTree,
	type PlacedCurriculumPoint
} from '$lib/server/stats/class-knowledge';
import { readSchoolYearOfSchool, regularityFirstDay } from '$lib/server/stats/class-regularity';

// Types

type SB = SupabaseClient<Database>;

/** Une ligne de `class_template_success` : un élève, un modèle */
export interface TemplateSuccessCount {
	student_id: string;
	template_id: string;
	proved_done: number;
	proved_succeeded: number;
	declared_done: number;
}

export interface SuccessTemplateLink {
	template_id: string;
	point_id: string;
	curriculum_points: ProgrammePointRow | null;
}

export interface SuccessRate {
	/** Moyenne des taux des élèves, entre 0 et 1 ; `null` sous le seuil */
	rate: number | null;
	/** Élèves qui ont au moins une réponse prouvée */
	students: number;
	/** Aucune réponse prouvée, mais du déclaré */
	onlyDeclared: boolean;
}

export interface PointSuccessRate extends SuccessRate {
	id: string;
	name: string;
}

export interface NotionSuccessRate extends SuccessRate {
	/** `null` : points qu'on ne sait pas placer dans l'arbre (en dernier) */
	id: string | null;
	name: string | null;
	branch_name: string | null;
	points: PointSuccessRate[];
}

export interface ClassSuccessRates {
	notions: NotionSuccessRate[];
}

interface StudentTally {
	done: number;
	succeeded: number;
}

// Constantes

/** Sous ce nombre d'élèves, pas de taux (Q5) */
export const MIN_STUDENTS_FOR_RATE = 3;

/** Plafond `max_rows` de PostgREST : les comptes sont lus par pages */
const PAGE_SIZE = 1000;

// Functions

/**
 * Liens modèle → points : points vivants seulement, et, pour un modèle partagé
 * entre deux référentiels, ceux du niveau de la classe (règle de la grille A).
 */
export function pointsOfTemplates(
	links: readonly SuccessTemplateLink[],
	grade: string | null
): { pointsByTemplate: Map<string, string[]>; points: ProgrammePointRow[] } {
	const live = links.filter(
		(l) => l.curriculum_points !== null && isLivePoint(l.curriculum_points)
	);
	const kept = keepLinksOfGrade(live, grade, (l) => ({
		template_id: l.template_id,
		grade: l.curriculum_points?.grade ?? null
	}));

	const pointsByTemplate = new Map<string, string[]>();
	const pointById = new Map<string, ProgrammePointRow>();
	for (const l of kept) {
		const list = pointsByTemplate.get(l.template_id) ?? [];
		if (!list.includes(l.point_id)) list.push(l.point_id);
		pointsByTemplate.set(l.template_id, list);
		pointById.set(l.point_id, l.curriculum_points!);
	}
	return { pointsByTemplate, points: [...pointById.values()] };
}

/** Taux d'un groupe de lignes (un point, ou une notion) */
function rateOf(rows: readonly TemplateSuccessCount[]): SuccessRate {
	const byStudent = new Map<string, StudentTally>();
	let declared = 0;
	for (const row of rows) {
		declared += row.declared_done;
		if (row.proved_done <= 0) continue;
		const tally = byStudent.get(row.student_id) ?? { done: 0, succeeded: 0 };
		tally.done += row.proved_done;
		tally.succeeded += row.proved_succeeded;
		byStudent.set(row.student_id, tally);
	}

	const students = byStudent.size;
	let rate: number | null = null;
	if (students >= MIN_STUDENTS_FOR_RATE) {
		let sum = 0;
		for (const t of byStudent.values()) sum += t.succeeded / t.done;
		rate = sum / students;
	}
	return { rate, students, onlyDeclared: students === 0 && declared > 0 };
}

function hasAnswer(row: TemplateSuccessCount): boolean {
	return row.proved_done > 0 || row.declared_done > 0;
}

/**
 * Pure : comptes par élève × modèle → taux par point et par notion, dans
 * l'ordre de `placed` (celui de l'arbre). Un point sans réponse comptée
 * n'apparaît pas ; une notion sans point non plus.
 */
export function buildClassSuccessRates(input: {
	counts: readonly TemplateSuccessCount[];
	pointsByTemplate: ReadonlyMap<string, readonly string[]>;
	placed: readonly PlacedCurriculumPoint[];
}): ClassSuccessRates {
	const { counts, pointsByTemplate, placed } = input;

	// Lignes de chaque point (une ligne = un élève × un modèle)
	const rowsOfPoint = new Map<string, TemplateSuccessCount[]>();
	for (const row of counts) {
		if (!hasAnswer(row)) continue;
		for (const pointId of pointsByTemplate.get(row.template_id) ?? []) {
			const list = rowsOfPoint.get(pointId) ?? [];
			list.push(row);
			rowsOfPoint.set(pointId, list);
		}
	}

	// Notions dans l'ordre de leur premier point ; points non placés en dernier
	const groups: { placed: PlacedCurriculumPoint; points: PlacedCurriculumPoint[] }[] = [];
	const groupByKey = new Map<string, (typeof groups)[number]>();
	for (const p of placed) {
		if (!rowsOfPoint.has(p.id)) continue;
		const key = p.notion_id ?? '';
		let group = groupByKey.get(key);
		if (!group) {
			group = { placed: p, points: [] };
			groupByKey.set(key, group);
			groups.push(group);
		}
		group.points.push(p);
	}
	const unplaced = groupByKey.get('');
	const ordered = unplaced ? [...groups.filter((g) => g !== unplaced), unplaced] : groups;

	return {
		notions: ordered.map(({ placed: first, points }) => {
			// Une ligne par élève × modèle, une seule fois dans la notion
			const notionRows = new Set<TemplateSuccessCount>();
			for (const p of points) for (const row of rowsOfPoint.get(p.id)!) notionRows.add(row);
			return {
				id: first.notion_id,
				name: first.notion_name,
				branch_name: first.branch_name,
				...rateOf([...notionRows]),
				points: points.map((p) => ({ id: p.id, name: p.name, ...rateOf(rowsOfPoint.get(p.id)!) }))
			};
		})
	};
}

/** Comptes de la classe depuis `firstDay`, lus par pages (ordre stable) */
async function readCounts(
	supabase: SB,
	classId: string,
	firstDay: string
): Promise<TemplateSuccessCount[]> {
	const rows: TemplateSuccessCount[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.rpc('class_template_success', { p_class_id: classId, p_first_day: firstDay })
			.order('student_id')
			.order('template_id')
			.range(from, from + PAGE_SIZE - 1);
		if (error) throw new Error(`Comptes de réponses illisibles : ${error.message}`);
		const page = data ?? [];
		rows.push(...page);
		if (page.length < PAGE_SIZE) break;
	}
	return rows;
}

/**
 * @throws si une lecture échoue : une liste vide dirait « rien n'a été
 * travaillé », un jugement et non une absence de donnée (E1).
 */
export async function getClassSuccessRates(
	supabase: SB,
	classId: string,
	now = new Date()
): Promise<ClassSuccessRates> {
	const { data: classRow, error: classError } = await supabase
		.from('classes')
		.select('school_id, grade')
		.eq('id', classId)
		.maybeSingle();
	if (classError) throw new Error(`Classe illisible : ${classError.message}`);

	const { start } = await readSchoolYearOfSchool(supabase, classRow?.school_id ?? null, now);
	const firstDay = regularityFirstDay(start, now);

	const counts = await readCounts(supabase, classId, firstDay);
	const templateIds = [...new Set(counts.filter(hasAnswer).map((c) => c.template_id))];
	if (templateIds.length === 0) return { notions: [] };

	const { data: linkRows, error: linkError } = await fetchInChunks(templateIds, (batch) =>
		supabase
			.from('question_template_points')
			.select(`template_id, point_id, curriculum_points(${PROGRAMME_POINT_COLS})`)
			.in('template_id', batch)
	);
	if (linkError) throw new Error(`Points des modèles illisibles : ${linkError.message}`);

	const { pointsByTemplate, points } = pointsOfTemplates(
		(linkRows ?? []) as unknown as SuccessTemplateLink[],
		classRow?.grade ?? null
	);
	if (points.length === 0) return { notions: [] };

	const placed = await placeInTree(supabase, points);
	return buildClassSuccessRates({ counts, pointsByTemplate, placed });
}
