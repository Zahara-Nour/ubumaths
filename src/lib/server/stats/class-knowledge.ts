/**
 * Agrégations par point du programme (knowledge / FSRS) au niveau classe.
 *
 * 3 fonctions exposées :
 *   - getClassCurriculumPointGrid          → Widget A (grille élève × point du programme)
 *   - getClassTopCurriculumPointsToRemediate → Widget E (top à remédier)
 *   - getStudentRetentionCurve      → Widget B (8 semaines, stability moyenne par branche)
 * (Widget C, activité élève × jour, remplacé par la grille de régularité :
 *  `class-regularity.ts`, chantier `regularite`.)
 * (Widget D, histogramme des notes 1-4, retiré : deux boutons « Pas réussi /
 * Réussi » depuis le chantier `formes-de-serie`.)
 *
 * Performance : approche batchée (1-3 queries par fonction, pas N×queries).
 * Cf. `docs/systeme/analytique-prof.md` §3.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { fetchInChunks } from '$lib/server/utils/chunked-in';
import { keepLinksOfGrade } from '$lib/server/curriculum-grade';
import { PROGRAMME_POINT_COLS, loadNodesWithAncestors } from '$lib/server/programme-tree';
import { placeOfNode, type ProgrammePointRow } from '$lib/utils/programme-tree';
import {
	templateToBadge,
	BADGE_PRIORITY,
	type CurriculumPointBadge
} from '$lib/server/srs/curriculum-point-badge';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/stats/class-knowledge');

type SB = SupabaseClient<Database>;

type CardState = 'new' | 'learning' | 'review' | 'relearning';

// ===========================================================================
// Types publics
// ===========================================================================

export interface ClassStudent {
	id: string;
	display_name: string;
}

/** Colonne de la grille : un point neuf du programme, étiqueté par sa notion. */
export interface ClassCurriculumPoint {
	id: string;
	name: string;
	/** `null` si le point n'a pas pu être placé dans l'arbre (nœud illisible). */
	notion_name: string | null;
}

/** Point rangé dans l'arbre : sa notion et sa branche (`null` si nœud illisible). */
export interface PlacedCurriculumPoint extends ClassCurriculumPoint {
	/** Identifiant de la notion (`null` si nœud illisible) : deux notions peuvent porter le même nom. */
	notion_id: string | null;
	branch_name: string | null;
}

export interface ClassCurriculumPointGrid {
	students: ClassStudent[];
	points: ClassCurriculumPoint[];
	/** Map clé `${studentId}:${pointId}` → badge. */
	cells: Record<string, CurriculumPointBadge>;
	/** Stats colonne : pointId → { acquise_pct, remediate_pct }. */
	columnStats: Record<string, { acquise_pct: number; remediate_pct: number }>;
}

export interface TopCurriculumPointToRemediate {
	point_id: string;
	point_name: string;
	notion_name: string | null;
	students_concerned: { student_id: string; display_name: string; badge: CurriculumPointBadge }[];
	remediate_pct: number;
}

export interface RetentionPoint {
	week_start: string;
	retrievability_avg: number;
	review_count: number;
}

// ===========================================================================
// Points du programme : filtre et rangement dans l'arbre
// ===========================================================================

/** Point d'un niveau, non archivé : le seul qui a sa place dans l'analytique. */
export function isLivePoint(p: ProgrammePointRow): boolean {
	return p.grade !== null && p.archived_at === null;
}

/**
 * Colonnes dans l'ordre de l'arbre : branche, notion, puis ordre du BO.
 * Un point qu'on ne sait pas placer (nœud illisible) garde sa colonne, en
 * dernier et sans étiquette, plutôt que de disparaître en silence.
 */
export async function placeInTree(
	supabase: SB,
	points: ProgrammePointRow[]
): Promise<PlacedCurriculumPoint[]> {
	const nodeIds = points.map((p) => p.node_id);
	const nodes = await loadNodesWithAncestors(supabase, nodeIds);
	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	const placed = points.map((p) => ({ point: p, place: placeOfNode(p.node_id, nodeById) }));
	placed.sort((a, b) => {
		if (!a.place || !b.place) {
			if (a.place) return -1;
			if (b.place) return 1;
			return a.point.name.localeCompare(b.point.name, 'fr');
		}
		return (
			a.place.branch.position - b.place.branch.position ||
			a.place.branch.name.localeCompare(b.place.branch.name, 'fr') ||
			a.place.notion.position - b.place.notion.position ||
			a.place.notion.name.localeCompare(b.place.notion.name, 'fr') ||
			a.point.display_order - b.point.display_order ||
			a.point.code.localeCompare(b.point.code, 'fr')
		);
	});

	return placed.map(({ point, place }) => ({
		id: point.id,
		name: point.name,
		notion_id: place?.notion.id ?? null,
		notion_name: place?.notion.name ?? null,
		branch_name: place?.branch.name ?? null
	}));
}

// ===========================================================================
// Widget A — Grille point du programme × classe
// ===========================================================================

interface GetClassCurriculumPointGridOpts {
	/** Si true, inclut tous les points du cycle, même ceux sans skill_attempts. */
	includeAllCycle?: boolean;
}

export async function getClassCurriculumPointGrid(
	supabase: SB,
	classId: string,
	opts: GetClassCurriculumPointGridOpts = {}
): Promise<ClassCurriculumPointGrid> {
	const { data: members, error: membersErr } = await supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, firstname, lastname)')
		.eq('class_id', classId)
		.eq('status', 'active');

	if (membersErr) {
		logger.error('[class-knowledge] class_members lookup failed:', membersErr);
		return { students: [], points: [], cells: {}, columnStats: {} };
	}

	type MemberRow = {
		student_id: string;
		profiles: { id: string; firstname: string | null; lastname: string | null } | null;
	};
	const studentRows = (members ?? []) as unknown as MemberRow[];
	const students: ClassStudent[] = studentRows
		.filter((m) => m.profiles)
		.map((m) => ({
			id: m.student_id,
			display_name: formatName(m.profiles!.firstname, m.profiles!.lastname)
		}))
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	if (students.length === 0) {
		return { students: [], points: [], cells: {}, columnStats: {} };
	}

	const studentIds = students.map((s) => s.id);

	// Niveau de la classe, lu une seule fois : il sert à la fois à filtrer les
	// points des cartes partagées entre deux référentiels, et à l'option « Tout
	// le cycle ». Sans lui, le bouton « Tout le cycle » n'étendrait rien : le
	// professeur croirait avoir tout affiché alors qu'il ne voit que les
	// points déjà travaillés.
	const { data: classRow, error: classRowError } = await supabase
		.from('classes')
		.select('grade')
		.eq('id', classId)
		.maybeSingle();

	if (classRowError) {
		logger.error('[getClassCurriculumPointGrid] Niveau de classe illisible :', classRowError);
		throw new Error(classRowError.message);
	}
	const classGrade = classRow?.grade ?? null;

	const { data: attemptsRaw, error: attErr } = await supabase
		.from('skill_attempts')
		.select('student_id, template_id')
		// `studentIds` est borné par la taille d'une classe (quelques dizaines) :
		// pas de découpage nécessaire, contrairement aux listes de templates.
		.in('student_id', studentIds)
		.not('template_id', 'is', null);

	if (attErr) {
		logger.error('[class-knowledge] skill_attempts lookup failed:', attErr);
		return { students, points: [], cells: {}, columnStats: {} };
	}

	const templateIds = [...new Set((attemptsRaw ?? []).map((a) => a.template_id as string))];

	let points: ClassCurriculumPoint[] = [];
	const templateToPointIds = new Map<string, string[]>();
	// Points retenus (lignes complètes) : on les range dans l'arbre après coup.
	const pointById = new Map<string, ProgrammePointRow>();

	if (templateIds.length > 0) {
		// `templateIds` grossit avec l'usage de la classe, sans borne : découpé.
		// Pas de `!inner` : un point masqué ferait disparaître sa ligne en silence ;
		// les anciens points et les archivés sont écartés ici, en mémoire.
		const { data: tagRows, error: tagErr } = await fetchInChunks(templateIds, (batch) =>
			supabase
				.from('question_template_points')
				.select(`template_id, point_id, curriculum_points(${PROGRAMME_POINT_COLS})`)
				.in('template_id', batch)
		);

		if (tagErr) {
			logger.error('[class-knowledge] question_template_points lookup failed:', tagErr);
		}

		type TagRow = {
			template_id: string;
			point_id: string;
			curriculum_points: ProgrammePointRow | null;
		};
		const liveTags = ((tagRows ?? []) as unknown as TagRow[]).filter(
			(r) => r.curriculum_points !== null && isLivePoint(r.curriculum_points)
		);
		// Carte partagée entre deux référentiels (ex. T_SPE et T_COMP) : seuls
		// les points du niveau de la classe font une colonne. Sinon le même
		// point apparaît deux fois, une fois par programme.
		const tagged = keepLinksOfGrade(liveTags, classGrade, (r) => ({
			template_id: r.template_id,
			grade: r.curriculum_points?.grade ?? null
		}));

		for (const r of tagged) {
			pointById.set(r.point_id, r.curriculum_points!);
			const list = templateToPointIds.get(r.template_id) ?? [];
			list.push(r.point_id);
			templateToPointIds.set(r.template_id, list);
		}
	}

	if (opts.includeAllCycle && classGrade) {
		// Bouton « Tout le niveau » : on étend aux points du niveau de la
		// classe, même non touchés.
		const { data: gradePoints, error: gradePointsError } = await supabase
			.from('curriculum_points')
			.select(PROGRAMME_POINT_COLS)
			.eq('grade', classGrade)
			.is('archived_at', null);

		if (gradePointsError) {
			logger.error('[getClassCurriculumPointGrid] Points du niveau illisibles :', gradePointsError);
			throw new Error(gradePointsError.message);
		}

		for (const p of (gradePoints ?? []) as ProgrammePointRow[]) {
			if (isLivePoint(p) && !pointById.has(p.id)) pointById.set(p.id, p);
		}
	}

	if (pointById.size > 0) {
		// La grille ne montre pas la branche : sa forme reste celle d'avant.
		points = (await placeInTree(supabase, [...pointById.values()])).map((p) => ({
			id: p.id,
			name: p.name,
			notion_name: p.notion_name
		}));
	}

	// Deux `.in()` dans la même requête : seul `templateIds` est découpé.
	// `studentIds` est borné par la taille d'une classe (quelques dizaines), et
	// découper les deux ferait un produit cartésien de lots.
	const { data: fsrsRows, error: fsrsErr } = await fetchInChunks(templateIds, (batch) =>
		supabase
			.from('srs_card_stats')
			.select('user_id, card_reference_id, state, next_review')
			.in('user_id', studentIds)
			.eq('card_reference_type', 'template')
			.in('card_reference_id', batch)
	);

	if (fsrsErr) {
		logger.error('[class-knowledge] srs_card_stats lookup failed:', fsrsErr);
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
	const cells: Record<string, CurriculumPointBadge> = {};
	for (const student of students) {
		const tplSeen = studentTemplateIds.get(student.id) ?? new Set<string>();
		for (const point of points) {
			const taggedTemplates = [...tplSeen].filter((tplId) =>
				(templateToPointIds.get(tplId) ?? []).includes(point.id)
			);
			let badge: CurriculumPointBadge = 'non_commencee';
			if (taggedTemplates.length > 0) {
				const subBadges: CurriculumPointBadge[] = taggedTemplates.map((tplId) => {
					const fsrs = stateByStudentTpl.get(`${student.id}:${tplId}`);
					if (!fsrs) return 'en_apprentissage';
					return templateToBadge(fsrs.state, fsrs.next_review, now);
				});
				badge = subBadges.reduce<CurriculumPointBadge>(
					(acc, b) => (BADGE_PRIORITY[b] > BADGE_PRIORITY[acc] ? b : acc),
					'non_commencee'
				);
			}
			cells[`${student.id}:${point.id}`] = badge;
		}
	}

	const columnStats: Record<string, { acquise_pct: number; remediate_pct: number }> = {};
	for (const point of points) {
		let acquise = 0;
		let remediate = 0;
		for (const s of students) {
			const b = cells[`${s.id}:${point.id}`];
			if (b === 'acquise_en_memoire') acquise += 1;
			if (b === 'a_remedier' || b === 'a_renforcer') remediate += 1;
		}
		columnStats[point.id] = {
			acquise_pct: Math.round((acquise / students.length) * 100),
			remediate_pct: Math.round((remediate / students.length) * 100)
		};
	}

	return { students, points, cells, columnStats };
}

// ===========================================================================
// Widget E — Top points du programme à remédier
// ===========================================================================

export async function getClassTopCurriculumPointsToRemediate(
	supabase: SB,
	classId: string,
	topN = 10
): Promise<TopCurriculumPointToRemediate[]> {
	const grid = await getClassCurriculumPointGrid(supabase, classId);
	if (grid.students.length === 0 || grid.points.length === 0) return [];

	const rows: TopCurriculumPointToRemediate[] = grid.points.map((point) => {
		const studentsConcerned = grid.students
			.map((s) => ({
				student_id: s.id,
				display_name: s.display_name,
				badge: grid.cells[`${s.id}:${point.id}`]
			}))
			.filter((r) => r.badge === 'a_remedier' || r.badge === 'a_renforcer');

		return {
			point_id: point.id,
			point_name: point.name,
			notion_name: point.notion_name,
			students_concerned: studentsConcerned,
			remediate_pct: grid.columnStats[point.id]?.remediate_pct ?? 0
		};
	});

	return rows
		.filter((r) => r.remediate_pct > 0)
		.sort((a, b) => b.remediate_pct - a.remediate_pct)
		.slice(0, topN);
}

// ===========================================================================
// Widget B — Courbe rétention par élève × branche
// ===========================================================================

/** Branche de l'arbre, lue dans le programme d'un niveau. */
export interface RetentionScope {
	branchId: string;
	grade: string;
}

export async function getStudentRetentionCurve(
	supabase: SB,
	studentId: string,
	{ branchId, grade }: RetentionScope,
	weeks = 8
): Promise<RetentionPoint[]> {
	const { data: pointRows, error: pointRowsError } = await supabase
		.from('curriculum_points')
		.select(PROGRAMME_POINT_COLS)
		.eq('grade', grade)
		.is('archived_at', null);

	// Une courbe de rétention vide se lit « cet élève ne révise pas ». Mieux vaut
	// que le widget dise qu'il n'a pas pu lire.
	if (pointRowsError) {
		logger.error('[getStudentRetentionCurve] Points illisibles :', pointRowsError);
		throw new Error(pointRowsError.message);
	}

	// La branche d'un point se lit en remontant l'arbre (sous-notion → notion → branche).
	const livePoints = ((pointRows ?? []) as ProgrammePointRow[]).filter(isLivePoint);
	const nodeIds = livePoints.map((p) => p.node_id);
	const nodeById = new Map((await loadNodesWithAncestors(supabase, nodeIds)).map((n) => [n.id, n]));
	const pointIds = livePoints
		.filter((p) => placeOfNode(p.node_id, nodeById)?.branch.id === branchId)
		.map((p) => p.id);
	if (pointIds.length === 0) return [];

	// `pointIds` = les points d'une branche d'un niveau : quelques dizaines.
	const { data: tagRows, error: tagRowsError } = await fetchInChunks(pointIds, (batch) =>
		supabase.from('question_template_points').select('template_id').in('point_id', batch)
	);

	if (tagRowsError) {
		logger.error('[getStudentRetentionCurve] Étiquetage illisible :', tagRowsError);
		throw new Error(tagRowsError.message);
	}

	const templateIds = [...new Set((tagRows ?? []).map((r) => r.template_id))];
	if (templateIds.length === 0) return [];

	const cutoffMs = Date.now() - weeks * 7 * 24 * 3600 * 1000;

	const { data: stats, error: statsError } = await fetchInChunks(templateIds, (batch) =>
		supabase
			.from('srs_card_stats')
			.select('review_history')
			.eq('user_id', studentId)
			.eq('card_reference_type', 'template')
			.in('card_reference_id', batch)
	);

	if (statsError) {
		logger.error('[getStudentRetentionCurve] Historique de révision illisible :', statsError);
		throw new Error(statsError.message);
	}

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
// Helpers internes
// ===========================================================================

function formatName(first: string | null, last: string | null): string {
	const f = (first ?? '').trim();
	const l = (last ?? '').trim();
	return [f, l].filter(Boolean).join(' ') || 'Élève sans nom';
}

function startOfWeekUTC(d: Date): Date {
	const day = d.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	const result = new Date(d);
	result.setUTCDate(result.getUTCDate() + diff);
	result.setUTCHours(0, 0, 0, 0);
	return result;
}
