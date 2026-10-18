/**
 * Chatterie de Faustroll — chargement de la collection (Mathoux v1)
 * =================================================================
 *
 * Aucune table : la collection se CALCULE à chaque affichage depuis
 *   - le PARCOURS de l'élève : son niveau et ses niveaux antérieurs
 *     (`grade_ancestors`, clôture transitive de `grade_predecessors`),
 *   - `curriculum_points` de ces niveaux (non archivés, rattachés à un nœud),
 *   - `question_template_points` (un point est travaillable s'il est tagué par
 *     au moins un modèle PUBLIÉ : un brouillon ne fait jamais naître un Mathou),
 *   - `classification_nodes` (branches et notions non archivées, sous-notions
 *     référencées),
 *   - `student_point_state` (acquisition, réussites),
 *   - les badges FSRS (`computePointBadges`) pour la sieste.
 *
 * Tout est lu avec le client de L'ÉLÈVE (RLS) : `grade_predecessors` (via la
 * fonction, SECURITY INVOKER) et les trois tables suivantes sont lisibles par
 * tout utilisateur connecté, `student_point_state` et
 * `srs_card_stats` par l'élève lui-même. ⚠️ Un refus RLS rendrait zéro ligne,
 * donc une Chatterie vide, sans erreur : le cas suspect (des points, aucun nœud)
 * est tracé. Prouvé en intégration : `tests/integration/mathoux-collection.test.ts`.
 *
 * Coût, en 5 allers-retours : 1 appel (parcours) ; une requête de points PAR
 * NIVEAU en parallèle (chacune sous le plafond de 1 000 lignes de PostgREST, que
 * le parcours entier d'une Terminale dépasserait) ; tags (par lots de 100
 * points, chaque lot lu par pages de 1 000 lignes), branches et notions,
 * sous-notions référencées ; puis, sur les seuls points travaillables, les états
 * et les 2 lectures de `computePointBadges`. Chiffres mesurés : docs/systeme/mathoux.md.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { computePointBadges } from '$lib/server/srs/capacity-badge';
import { fetchInChunks } from '$lib/server/utils/chunked-in';
import {
	buildMathouCollection,
	type CollectionNodeKind,
	type CollectionTreeNode,
	type MathouCollection,
	type PointProgress,
	type WorkablePoint
} from '$lib/mathoux/collection-logic';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/mathoux/collection');

type SB = SupabaseClient<Database>;

const EMPTY_COLLECTION: MathouCollection = {
	races: [],
	counts: { born: 0, napping: 0, toDiscover: 0 }
};

/** Plafond `max_rows` de PostgREST (supabase/config.toml). */
const TAG_PAGE_SIZE = 1000;

const NODE_KINDS: readonly CollectionNodeKind[] = ['branch', 'notion', 'subnotion'];

function isNodeKind(kind: string): kind is CollectionNodeKind {
	return (NODE_KINDS as readonly string[]).includes(kind);
}

/**
 * Collection de Mathoux de l'élève pour son niveau.
 *
 * @param studentId l'élève de la SESSION (jamais une entrée client).
 * @param grade `profiles.grade`. NULL → collection vide, aucune requête.
 * @throws si une lecture échoue : une panne ne doit pas se lire « Chatterie vide ».
 */
export async function loadMathouCollection(
	supabase: SB,
	studentId: string,
	grade: string | null
): Promise<MathouCollection> {
	if (!grade) return EMPTY_COLLECTION;

	// 1. Parcours : le niveau et ses niveaux antérieurs
	const grades = await loadPathGrades(supabase, grade);

	// 2. Points de chaque niveau rattachés à un nœud (une requête par niveau)
	const pointResults = await Promise.all(
		grades.map((g) =>
			supabase
				.from('curriculum_points')
				.select('id, node_id, grade')
				.eq('grade', g)
				.is('archived_at', null)
				.not('node_id', 'is', null)
		)
	);

	const gradePoints: WorkablePoint[] = [];
	for (const result of pointResults) {
		if (result.error) throw new Error(`Points du parcours illisibles : ${result.error.message}`);
		for (const row of result.data ?? []) {
			if (row.node_id && row.grade) {
				gradePoints.push({ id: row.id, nodeId: row.node_id, grade: row.grade });
			}
		}
	}
	if (gradePoints.length === 0) return EMPTY_COLLECTION;

	const pointIds = gradePoints.map((p) => p.id);
	const subnotionCandidateIds = [...new Set(gradePoints.map((p) => p.nodeId))];

	// 3. Tags par un modèle publié, arbre (branches + notions, puis nœuds référencés), en parallèle
	const [tagsResult, treeResult, referencedResult] = await Promise.all([
		fetchInChunks(pointIds, (batch) => fetchPublishedTagPages(supabase, batch)),
		supabase
			.from('classification_nodes')
			.select('id, kind, parent_id, name, position')
			.in('kind', ['branch', 'notion'])
			.is('archived_at', null),
		fetchInChunks(subnotionCandidateIds, (batch) =>
			supabase
				.from('classification_nodes')
				.select('id, kind, parent_id, name, position')
				.eq('kind', 'subnotion')
				.is('archived_at', null)
				.in('id', batch)
		)
	]);

	if (tagsResult.error) throw new Error(`Tags illisibles : ${tagsResult.error.message}`);
	if (treeResult.error) throw new Error(`Arbre illisible : ${treeResult.error.message}`);
	if (referencedResult.error) {
		throw new Error(`Sous-notions illisibles : ${referencedResult.error.message}`);
	}

	const taggedPointIds = new Set((tagsResult.data ?? []).map((row) => row.point_id));
	const workablePoints = gradePoints.filter((p) => taggedPointIds.has(p.id));
	if (workablePoints.length === 0) return EMPTY_COLLECTION;

	const nodes: CollectionTreeNode[] = [];
	for (const row of [...(treeResult.data ?? []), ...(referencedResult.data ?? [])]) {
		if (!isNodeKind(row.kind)) continue;
		nodes.push({
			id: row.id,
			kind: row.kind,
			parentId: row.parent_id,
			name: row.name,
			position: row.position
		});
	}

	// ⚠️ Des points travaillables mais aucun nœud : l'arbre est lisible par tout
	// connecté, donc c'est un refus RLS ou un arbre vidé — pas une Chatterie vide.
	if (nodes.length === 0) {
		logger.warn(
			`[mathoux] ${workablePoints.length} points travaillables pour "${grade}" (parcours) mais aucun nœud lu — RLS ?`
		);
	}

	// 4. États et sieste, sur les seuls points travaillables (≈ 30 en Tle spé, pas 1 600)
	const workableIds = workablePoints.map((p) => p.id);
	const [statesResult, badges] = await Promise.all([
		fetchInChunks(workableIds, (batch) =>
			supabase
				.from('student_point_state')
				.select('point_id, is_acquired, total_successes, last_success_at')
				.eq('student_id', studentId)
				.in('point_id', batch)
		),
		// Sieste : badge FSRS « à revoir », sur un point de n'importe quel niveau
		computePointBadges(supabase, studentId, workableIds)
	]);
	if (statesResult.error) throw new Error(`États illisibles : ${statesResult.error.message}`);

	const progress = new Map<string, PointProgress>();
	for (const row of statesResult.data ?? []) {
		progress.set(row.point_id, {
			isAcquired: row.is_acquired,
			hasSuccess: row.total_successes > 0 || row.last_success_at !== null
		});
	}

	const nappingPointIds = new Set<string>();
	for (const [pointId, badge] of badges) {
		if (badge === 'a_renforcer' || badge === 'a_remedier') nappingPointIds.add(pointId);
	}

	return buildMathouCollection({ points: workablePoints, nodes, progress, nappingPointIds });
}

/**
 * Le niveau de l'élève puis ses niveaux antérieurs, sans doublon.
 *
 * `grade_ancestors` rend un ensemble de textes ; PostgREST le sérialise en
 * tableau de chaînes. Une forme inattendue lève plutôt que de réduire le
 * parcours en silence au seul niveau courant.
 */
async function loadPathGrades(supabase: SB, grade: string): Promise<string[]> {
	const { data, error } = await supabase.rpc('grade_ancestors', { p_grade: grade });
	if (error) throw new Error(`Parcours illisible : ${error.message}`);
	const ancestors: unknown = data ?? [];
	if (!Array.isArray(ancestors) || !ancestors.every((g) => typeof g === 'string')) {
		throw new Error('Parcours illisible : réponse inattendue de grade_ancestors');
	}
	return [...new Set([grade, ...ancestors])];
}

/**
 * Tags d'un lot de points par un modèle PUBLIÉ, lus par pages de 1 000 lignes.
 *
 * Un lot de 100 points peut porter plus de 1 000 tags (14 au plus par point en
 * prod, le 2026-10-18) : PostgREST tronquerait alors en silence au plafond
 * `max_rows`. L'ordre (point, modèle) rend les pages stables.
 *
 * Jointure `!inner` voulue : un modèle invisible à l'élève est un brouillon
 * (« Students can view published templates »), et un brouillon ne rend pas un
 * point travaillable.
 */
async function fetchPublishedTagPages(
	supabase: SB,
	pointIds: string[]
): Promise<{ data: { point_id: string }[]; error: { message: string } | null }> {
	const rows: { point_id: string }[] = [];
	for (let from = 0; ; from += TAG_PAGE_SIZE) {
		const { data, error } = await supabase
			.from('question_template_points')
			.select('point_id, template_id, question_templates!inner(status)')
			.eq('question_templates.status', 'published')
			.in('point_id', pointIds)
			.order('point_id')
			.order('template_id')
			.range(from, from + TAG_PAGE_SIZE - 1);
		if (error) return { data: [], error };
		const page = data ?? [];
		rows.push(...page);
		if (page.length < TAG_PAGE_SIZE) return { data: rows, error: null };
	}
}
