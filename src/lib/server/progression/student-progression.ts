/**
 * Progression de l'élève — source UNIQUE des deux axes
 * ====================================================
 *
 * Deux axes orthogonaux, volontairement distincts :
 *   · « Ce que je sais faire »        → programme de son niveau, par branche > notion
 *   · « Ma façon de faire des maths » → les 6 compétences transversales du socle
 *
 * ⚠️ POURQUOI CE MODULE EXISTE
 * Avant lui, `dashboard/+page.server.ts` ré-implémentait l'agrégation de
 * `student/objectifs/+page.server.ts`. Les deux versions ont divergé :
 *   1. le dashboard n'agrégeait que les objectifs À ÉCHELLE (`rang`), or aucun
 *      point de production n'en porte → la tuile affichait 0 en permanence,
 *      même quand la page affichait 20/20 ;
 *   2. le total était la constante `TOTAL_OBJECTIVES_6E = 18`, fausse pour tous
 *      les niveaux (20 en 6ᵉ, 14 en 2ᵈᵉ et 1ʳᵉ spé, 0 pour les niveaux non
 *      couverts par le référentiel).
 *
 * Toute surface qui affiche une progression élève passe désormais par ici.
 *
 * Spec : docs/archive/wip/progression-eleve-progress.md ; bascule sur l'arbre
 * des notions : docs/wip/arbre-notions-progress.md (C5, étape 3, PR D).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { computePointBadges, worstBadge, type CapacityBadge } from '$lib/server/srs/capacity-badge';
import { getProgrammeTree } from '$lib/server/programme-tree';
import {
	notionLevel,
	isCompetenceObserved,
	type MathCompetenceCode,
	type MathCompetenceLevel
} from '$lib/types/skills';
import { isValidGradeCode } from '$lib/utils/grades';
import { createServerLogger } from '$lib/utils/logger';
import type { ProgrammePointView } from '$lib/utils/programme-tree';

const logger = createServerLogger('server/progression/student-progression');

type SB = SupabaseClient<Database>;

// ============================================================================
// Types
// ============================================================================

export interface NotionSummary {
	id: string;
	name: string;
	branch_id: string;
	branch_name: string;
	acquired_count: number;
	/** Points actifs du niveau de l'élève sur cette notion, entraînables ou non (Q1). */
	total_count: number;
	has_remediation: boolean;
	/** Pire badge FSRS parmi les points (priorité a_remedier > a_renforcer > ...). */
	fsrs_badge: CapacityBadge;
}

export interface BranchWithNotions {
	id: string;
	name: string;
	notions: NotionSummary[];
}

export interface NotionsStats {
	total: number;
	atteint: number; // 🟢
	en_cours: number; // 🟠
	non_commence: number; // ◯
	remediation_count: number;
	to_reinforce_count: number;
}

export interface NotionsProgression {
	/**
	 * false quand l'élève n'a pas de niveau, ou que son niveau n'a aucun point
	 * actif. À distinguer d'un élève qui n'a simplement rien commencé : l'UI doit
	 * dire « pas encore disponible », pas « 0 sur 0 ».
	 */
	hasProgramme: boolean;
	grade: string | null;
	branches: BranchWithNotions[];
	stats: NotionsStats;
}

/** Un point du programme vu par l'élève, sur la page d'une notion. */
export interface NotionPointDetail {
	id: string;
	code: string;
	name: string;
	/** Sous-notion où le point est posé, `null` s'il est posé sur la notion. */
	subnotionName: string | null;
	kind: string;
	/** Niveaux dont ce point figure dans la liste des « Automatismes ». */
	automatisme_grades: string[];
	/** Au moins un modèle de question tagué : l'élève peut s'y entraîner (Q1). */
	trainable: boolean;
	is_acquired: boolean;
	needs_remediation: boolean;
	badge: CapacityBadge;
}

export interface NotionDetail {
	id: string;
	name: string;
	branch_name: string;
	points: NotionPointDetail[];
	acquired_count: number;
	total_count: number;
}

export interface CompetenceSummary {
	id: string;
	code: MathCompetenceCode;
	name: string;
	gloss_for_student: string;
	display_order: number;
	niveau: MathCompetenceLevel;
	task_count: number;
}

export interface CompetencesStats {
	tres_bonne: number;
	satisfaisante: number;
	fragile: number;
	insuffisante: number;
	/** Nombre de compétences réellement OBSERVÉES (cf. `isCompetenceObserved`). */
	with_data: number;
	total: number;
}

export interface CompetencesProgression {
	items: CompetenceSummary[];
	stats: CompetencesStats;
}

// ============================================================================
// Constantes
// ============================================================================

const EMPTY_NOTION_STATS: NotionsStats = {
	total: 0,
	atteint: 0,
	en_cours: 0,
	non_commence: 0,
	remediation_count: 0,
	to_reinforce_count: 0
};

// ============================================================================
// Agrégation (pure)
// ============================================================================

/**
 * Compte les notions par niveau atteint.
 *
 * Le niveau vient de `notionLevel()` (`$lib/types/skills`), partagée avec l'UI :
 * c'est ce partage qui empêche la tuile et la page de diverger.
 */
export function aggregateNotionStats(notions: NotionSummary[]): NotionsStats {
	const stats: NotionsStats = { ...EMPTY_NOTION_STATS };

	for (const notion of notions) {
		stats.total += 1;
		stats[notionLevel(notion)] += 1;

		// La remédiation prime : une notion à remédier n'est pas « à renforcer ».
		if (notion.has_remediation || notion.fsrs_badge === 'a_remedier') {
			stats.remediation_count += 1;
		} else if (notion.fsrs_badge === 'a_renforcer') {
			stats.to_reinforce_count += 1;
		}
	}

	return stats;
}

// ============================================================================
// Axe 1 — « Ce que je sais faire » (programme, branche > notion > points)
// ============================================================================

type PointState = { is_acquired: boolean; needs_remediation: boolean };

/**
 * État d'acquisition de l'élève sur ces points (vue `student_point_state_v`).
 *
 * Lu en entier pour l'élève, puis filtré ici : un programme compte jusqu'à
 * ~240 points, trop d'identifiants pour un `.in()` dans l'URL, alors qu'un
 * élève n'a d'état que sur les points qu'il a travaillés.
 */
async function loadPointStates(
	supabase: SB,
	studentId: string,
	pointIds: string[]
): Promise<Map<string, PointState>> {
	const stateByPoint = new Map<string, PointState>();
	if (pointIds.length === 0) return stateByPoint;

	const { data, error } = await supabase
		.from('student_point_state_v')
		.select('point_id, is_acquired, needs_remediation')
		.eq('student_id', studentId);
	if (error) throw new Error(`Chargement de l'état impossible : ${error.message}`);

	const wanted = new Set(pointIds);
	for (const row of data ?? []) {
		if (!row.point_id || !wanted.has(row.point_id)) continue;
		stateByPoint.set(row.point_id, {
			is_acquired: row.is_acquired ?? false,
			needs_remediation: row.needs_remediation ?? false
		});
	}
	return stateByPoint;
}

/** Résumé d'une notion à partir de ses points actifs. */
function summarizeNotion(
	notion: { id: string; name: string; points: ProgrammePointView[] },
	branch: { id: string; name: string },
	stateByPoint: Map<string, PointState>,
	badges: Map<string, CapacityBadge>
): NotionSummary {
	let acquired_count = 0;
	let has_remediation = false;
	const notionBadges: CapacityBadge[] = [];

	for (const point of notion.points) {
		const state = stateByPoint.get(point.id);
		if (state?.is_acquired) acquired_count += 1;
		if (state?.needs_remediation) has_remediation = true;
		const badge = badges.get(point.id);
		if (badge) notionBadges.push(badge);
	}

	return {
		id: notion.id,
		name: notion.name,
		branch_id: branch.id,
		branch_name: branch.name,
		acquired_count,
		total_count: notion.points.length,
		has_remediation,
		fsrs_badge: worstBadge(notionBadges)
	};
}

/**
 * Le programme du niveau de l'élève (points neufs actifs, rangés branche >
 * notion), croisé avec son état d'acquisition et ses badges FSRS.
 *
 * Un point sans modèle tagué compte dans le total (Q1 de la PR D) : c'est le
 * programme, pas seulement ce que l'appli sait entraîner.
 *
 * @param grade `profiles.grade`. NULL → aucune requête, `hasProgramme` false.
 */
export async function getNotionsProgression(
	supabase: SB,
	studentId: string,
	grade: string | null
): Promise<NotionsProgression> {
	if (!grade) {
		return { hasProgramme: false, grade: null, branches: [], stats: { ...EMPTY_NOTION_STATS } };
	}

	const tree = await getProgrammeTree(supabase, grade);

	// ⚠️ Zéro point, c'est AUSSI ce que rend un refus RLS ou un `grade` décalé
	// ('6e' au lieu de '6') — la RLS échoue en silence. Tous les niveaux valides
	// ont un programme depuis le seed des points neufs : un niveau valide sans
	// point est donc suspect, et le journal doit le dire.
	if (tree.length === 0) {
		if (isValidGradeCode(grade)) {
			logger.warn(
				`[progression] aucun point du programme pour le niveau "${grade}" — RLS ou code de niveau décalé ?`
			);
		}
		return { hasProgramme: false, grade, branches: [], stats: { ...EMPTY_NOTION_STATS } };
	}

	const pointIds = tree.flatMap((b) => b.notions.flatMap((n) => n.points.map((p) => p.id)));
	const [stateByPoint, badges] = await Promise.all([
		loadPointStates(supabase, studentId, pointIds),
		computePointBadges(supabase, studentId, pointIds)
	]);

	const branches: BranchWithNotions[] = tree.map((branch) => ({
		id: branch.id,
		name: branch.name,
		notions: branch.notions.map((notion) => summarizeNotion(notion, branch, stateByPoint, badges))
	}));

	return {
		hasProgramme: true,
		grade,
		branches,
		stats: aggregateNotionStats(branches.flatMap((b) => b.notions))
	};
}

/**
 * Une notion du programme de l'élève, point par point.
 *
 * `null` quand la notion n'a aucun point actif du niveau de l'élève (identifiant
 * inconnu, autre niveau, ou élève sans niveau) : la page répond 404.
 */
export async function getNotionDetail(
	supabase: SB,
	studentId: string,
	grade: string | null,
	notionId: string
): Promise<NotionDetail | null> {
	if (!grade) return null;

	const tree = await getProgrammeTree(supabase, grade);
	let found: { branchName: string; notion: (typeof tree)[number]['notions'][number] } | null = null;
	for (const branch of tree) {
		const notion = branch.notions.find((n) => n.id === notionId);
		if (notion) {
			found = { branchName: branch.name, notion };
			break;
		}
	}
	if (!found) return null;

	const pointIds = found.notion.points.map((p) => p.id);
	const [stateByPoint, badges, kindsResult, tagsResult, automatismesResult] = await Promise.all([
		loadPointStates(supabase, studentId, pointIds),
		computePointBadges(supabase, studentId, pointIds),
		supabase.from('curriculum_points').select('id, kind').in('id', pointIds),
		supabase.from('question_template_points').select('point_id').in('point_id', pointIds),
		supabase
			.from('curriculum_point_automatismes')
			.select('point_id, grade')
			.in('point_id', pointIds)
	]);
	if (kindsResult.error) throw new Error(`Points illisibles : ${kindsResult.error.message}`);
	if (tagsResult.error) throw new Error(`Tags illisibles : ${tagsResult.error.message}`);
	if (automatismesResult.error) {
		throw new Error(`Automatismes illisibles : ${automatismesResult.error.message}`);
	}

	const kindById = new Map((kindsResult.data ?? []).map((p) => [p.id, p.kind]));
	const trainable = new Set((tagsResult.data ?? []).map((t) => t.point_id));
	const automatismeGrades = new Map<string, string[]>();
	for (const row of automatismesResult.data ?? []) {
		const list = automatismeGrades.get(row.point_id) ?? [];
		list.push(row.grade);
		automatismeGrades.set(row.point_id, list);
	}

	const points: NotionPointDetail[] = found.notion.points.map((p) => {
		const state = stateByPoint.get(p.id);
		return {
			id: p.id,
			code: p.code,
			name: p.name,
			subnotionName: p.subnotionName,
			kind: kindById.get(p.id) ?? 'savoir_faire',
			automatisme_grades: automatismeGrades.get(p.id) ?? [],
			trainable: trainable.has(p.id),
			is_acquired: state?.is_acquired ?? false,
			needs_remediation: state?.needs_remediation ?? false,
			badge: badges.get(p.id) ?? 'non_commencee'
		};
	});

	return {
		id: found.notion.id,
		name: found.notion.name,
		branch_name: found.branchName,
		points,
		acquired_count: points.filter((p) => p.is_acquired).length,
		total_count: points.length
	};
}

// ============================================================================
// Axe 2 — « Ma façon de faire des maths » (6 compétences du socle)
// ============================================================================

/**
 * Les 6 compétences transversales et leur niveau, calculé côté PL/pgSQL à
 * partir des tâches à prise d'initiative saisies par le professeur.
 *
 * Une compétence sans niveau calculé n'est PAS « insuffisante » : elle n'a pas
 * encore été observée. `with_data` porte cette distinction, que l'UI doit
 * rendre — sinon l'élève lit un jugement là où il n'y a pas de mesure.
 */
export async function getCompetencesProgression(
	supabase: SB,
	studentId: string
): Promise<CompetencesProgression> {
	const [competencesResult, levelsResult] = await Promise.all([
		supabase
			.from('math_competences')
			.select('id, code, name, gloss_for_student, display_order')
			.order('display_order'),
		supabase
			.from('student_competence_level')
			.select('math_competence_id, niveau, task_count')
			.eq('student_id', studentId)
	]);

	if (competencesResult.error) {
		throw new Error(`Chargement des compétences impossible : ${competencesResult.error.message}`);
	}
	if (levelsResult.error) {
		throw new Error(`Chargement des niveaux impossible : ${levelsResult.error.message}`);
	}

	const levelByCompetenceId = new Map<
		string,
		{ niveau: MathCompetenceLevel; task_count: number }
	>();
	for (const level of levelsResult.data ?? []) {
		if (!level.math_competence_id) continue;
		levelByCompetenceId.set(level.math_competence_id, {
			niveau: level.niveau as MathCompetenceLevel,
			task_count: level.task_count ?? 0
		});
	}

	const items: CompetenceSummary[] = (competencesResult.data ?? []).map((competence) => {
		const level = levelByCompetenceId.get(competence.id);
		return {
			id: competence.id,
			code: competence.code as MathCompetenceCode,
			name: competence.name,
			gloss_for_student: competence.gloss_for_student,
			display_order: competence.display_order,
			niveau: level?.niveau ?? 'insuffisante',
			task_count: level?.task_count ?? 0
		};
	});

	const stats: CompetencesStats = {
		tres_bonne: 0,
		satisfaisante: 0,
		fragile: 0,
		insuffisante: 0,
		with_data: 0,
		total: items.length
	};

	// ⚠️ La PRÉSENCE d'une ligne ne suffit pas : `niveau` est NOT NULL et vaut
	// 'insuffisante' dès la première tâche. Le seuil vit dans
	// `isCompetenceObserved()`, appelée AUSSI par le panneau — sans quoi la
	// tuile annoncerait « 1 observée » sous une liste de « Pas encore observée ».
	for (const item of items) {
		if (!isCompetenceObserved(item)) continue;
		stats.with_data += 1;
		stats[item.niveau] += 1;
	}

	return { items, stats };
}
