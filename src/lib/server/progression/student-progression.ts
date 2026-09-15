/**
 * Progression de l'élève — source UNIQUE des deux axes
 * ====================================================
 *
 * Deux axes orthogonaux, volontairement distincts :
 *   · « Ce que je sais faire »        → arbre `curriculum_*` du niveau de l'élève
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
 * Spec : docs/wip/progression-eleve-progress.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { computePointBadges, worstBadge, type CapacityBadge } from '$lib/server/srs/capacity-badge';
import {
	objectiveLevel,
	type MathCompetenceCode,
	type MathCompetenceLevel,
	type ObjectiveLevel
} from '$lib/types/skills';

type SB = SupabaseClient<Database>;

// ============================================================================
// Types
// ============================================================================

export interface ObjectiveSummary {
	id: string;
	name: string;
	theme_id: string;
	theme_name: string;
	display_order: number;
	/** true si l'objectif porte une échelle descriptive (points rangés 1-4). */
	has_scale: boolean;
	/** Rang max acquis. Toujours 0 quand `has_scale` est false. */
	rang_max_acquired: ObjectiveLevel;
	acquired_count: number;
	total_count: number;
	has_remediation: boolean;
	/** Pire badge FSRS parmi les points (priorité a_remedier > a_renforcer > ...). */
	fsrs_badge: CapacityBadge;
}

export interface ThemeWithObjectives {
	id: string;
	name: string;
	display_order: number;
	objectives: ObjectiveSummary[];
}

export interface ObjectivesStats {
	total: number;
	mastery: number; // ✨
	atteint: number; // 🟢
	en_cours: number; // 🟠
	non_commence: number; // ◯
	remediation_count: number;
	to_reinforce_count: number;
}

export interface ObjectivesProgression {
	/**
	 * false quand le référentiel ne couvre pas le niveau de l'élève (ou qu'il
	 * n'a pas de niveau). À distinguer d'un élève qui n'a simplement rien
	 * commencé : l'UI doit dire « pas encore disponible », pas « 0 sur 0 ».
	 */
	hasReferentiel: boolean;
	grade: string | null;
	themes: ThemeWithObjectives[];
	stats: ObjectivesStats;
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
	/** Nombre de compétences réellement évaluées (niveau calculé non nul). */
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

const EMPTY_OBJECTIVE_STATS: ObjectivesStats = {
	total: 0,
	mastery: 0,
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
 * Compte les objectifs par niveau atteint.
 *
 * Le niveau vient de `objectiveLevel()` (`$lib/types/skills`), partagée avec
 * l'UI : c'est ce partage qui empêche la tuile et la page de diverger.
 */
export function aggregateObjectiveStats(objectives: ObjectiveSummary[]): ObjectivesStats {
	const stats: ObjectivesStats = { ...EMPTY_OBJECTIVE_STATS };

	for (const objective of objectives) {
		stats.total += 1;

		switch (objectiveLevel(objective)) {
			case 4:
				stats.mastery += 1;
				break;
			case 3:
				stats.atteint += 1;
				break;
			case 2:
			case 1:
				stats.en_cours += 1;
				break;
			default:
				stats.non_commence += 1;
		}

		// La remédiation prime : un objectif à remédier n'est pas « à renforcer ».
		if (objective.has_remediation || objective.fsrs_badge === 'a_remedier') {
			stats.remediation_count += 1;
		} else if (objective.fsrs_badge === 'a_renforcer') {
			stats.to_reinforce_count += 1;
		}
	}

	return stats;
}

// ============================================================================
// Axe 1 — « Ce que je sais faire » (contenus du programme)
// ============================================================================

/**
 * Charge l'arbre Thème → Objectif → Point du niveau de l'élève, croisé avec son
 * état d'acquisition et ses badges FSRS.
 *
 * @param grade `profiles.grade`. NULL → aucune requête, `hasReferentiel` false.
 */
export async function getObjectivesProgression(
	supabase: SB,
	studentId: string,
	grade: string | null
): Promise<ObjectivesProgression> {
	// Pas de niveau renseigné → rien à montrer, et rien à demander à la base.
	if (!grade) {
		return { hasReferentiel: false, grade: null, themes: [], stats: { ...EMPTY_OBJECTIVE_STATS } };
	}

	const [themesResult, stateResult] = await Promise.all([
		supabase
			.from('curriculum_themes')
			.select(
				`
				id,
				name,
				display_order,
				curriculum_objectives (
					id,
					name,
					display_order,
					theme_id,
					curriculum_points (
						id,
						rang,
						archived_at
					)
				)
			`
			)
			.eq('grade', grade)
			.order('display_order', { ascending: true }),
		supabase
			.from('student_point_state_v')
			.select('point_id, is_acquired, needs_remediation')
			.eq('student_id', studentId)
	]);

	if (themesResult.error) {
		throw new Error(`Chargement du référentiel impossible : ${themesResult.error.message}`);
	}
	if (stateResult.error) {
		throw new Error(`Chargement de l'état impossible : ${stateResult.error.message}`);
	}

	const themesData = themesResult.data ?? [];

	// Le référentiel ne couvre pas ce niveau (cas de 1_GEN et T_SPE en prod).
	if (themesData.length === 0) {
		return { hasReferentiel: false, grade, themes: [], stats: { ...EMPTY_OBJECTIVE_STATS } };
	}

	const stateByPoint = new Map<string, { is_acquired: boolean; needs_remediation: boolean }>();
	for (const row of stateResult.data ?? []) {
		if (!row.point_id) continue;
		stateByPoint.set(row.point_id, {
			is_acquired: row.is_acquired ?? false,
			needs_remediation: row.needs_remediation ?? false
		});
	}

	// Badges FSRS sur l'ensemble des points actifs, en un seul aller-retour.
	const activePointIds: string[] = [];
	for (const theme of themesData) {
		for (const objective of theme.curriculum_objectives ?? []) {
			for (const point of objective.curriculum_points ?? []) {
				if (!point.archived_at) activePointIds.push(point.id);
			}
		}
	}
	const badges = await computePointBadges(supabase, studentId, activePointIds);

	const themes: ThemeWithObjectives[] = themesData.map((theme) => {
		const objectives: ObjectiveSummary[] = (theme.curriculum_objectives ?? []).map((objective) => {
			const points = (objective.curriculum_points ?? []).filter((p) => !p.archived_at);
			// Un objectif « à échelle » est celui dont au moins un point porte un rang.
			const has_scale = points.some((p) => p.rang !== null);

			let rang_max: ObjectiveLevel = 0;
			let acquired_count = 0;
			let has_remediation = false;
			const objectiveBadges: CapacityBadge[] = [];

			for (const point of points) {
				const state = stateByPoint.get(point.id);
				if (state?.is_acquired) {
					acquired_count += 1;
					const rang = point.rang;
					if (rang !== null && rang >= 1 && rang <= 4 && rang > rang_max) {
						rang_max = rang as ObjectiveLevel;
					}
				}
				if (state?.needs_remediation) has_remediation = true;
				const badge = badges.get(point.id);
				if (badge) objectiveBadges.push(badge);
			}

			return {
				id: objective.id,
				name: objective.name,
				theme_id: objective.theme_id,
				theme_name: theme.name,
				display_order: objective.display_order,
				has_scale,
				rang_max_acquired: has_scale ? rang_max : 0,
				acquired_count,
				total_count: points.length,
				has_remediation,
				fsrs_badge: worstBadge(objectiveBadges)
			};
		});

		objectives.sort((a, b) => a.display_order - b.display_order);

		return {
			id: theme.id,
			name: theme.name,
			display_order: theme.display_order,
			objectives
		};
	});

	const allObjectives = themes.flatMap((theme) => theme.objectives);

	return {
		hasReferentiel: true,
		grade,
		themes,
		stats: aggregateObjectiveStats(allObjectives)
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
		// `niveau` NULL = compétence jamais observée : on ne l'enregistre pas,
		// pour qu'elle ne soit pas comptée dans `with_data`.
		if (!level.math_competence_id || !level.niveau) continue;
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

	for (const item of items) {
		if (!levelByCompetenceId.has(item.id)) continue;
		stats.with_data += 1;
		stats[item.niveau] += 1;
	}

	return { items, stats };
}
