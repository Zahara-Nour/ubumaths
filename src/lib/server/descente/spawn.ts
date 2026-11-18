/**
 * La Descente de la Vistule — apparition des Bêtes (serveur)
 * ==========================================================
 *
 * Appelé quand l'élève ouvre la carte (étape 4) : rattrape le temps passé et fait
 * naître ses Bêtes. Règles et choix : `$lib/descente/spawn-logic.ts` ; phase 0 de
 * l'étape 2 dans docs/wip/navadra-progress.md (validée le 2026-11-18).
 *
 * Lectures au client de L'ÉLÈVE (RLS) : ses Bêtes (« Students can view their own
 * beasts »), son état par point et ses cartes de révision ; parcours, points,
 * tags, modèles publiés et arbre sont lisibles par tout connecté. ⚠️ Un refus RLS
 * rendrait zéro ligne en silence, donc « aucune Bête à faire naître » : sans
 * gravité ici (rien n'est écrit), et prouvé en intégration
 * (tests/integration/descente-apparition.test.ts).
 *
 * Écriture au client SERVICE : l'élève n'écrit jamais ses Bêtes (aucun droit
 * INSERT, étape 1). L'identifiant écrit est celui de la SESSION, vérifié avant
 * toute écriture (`assertSessionStudent`), jamais une entrée client.
 *
 * Coût : 3 lectures légères (Bêtes vivantes, dernières apparitions) à chaque
 * visite ; le reste seulement quand une Bête est due (au plus toutes les 8 heures,
 * ou une fois par semaine pour la grosse Bête) : parcours, points par niveau,
 * tags avec la première variation de chaque modèle publié, arbre, états, badges.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ProvinceId } from '$lib/kingdom-tour/tour';
import { computePointBadges } from '$lib/server/srs/curriculum-point-badge';
import { fetchInChunks } from '$lib/server/utils/chunked-in';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { isCombatTemplate } from '$lib/descente/combat-templates';
import { provinceOfBranch } from '$lib/descente/provinces';
import {
	chooseBeasts,
	spawnQuota,
	type BeastKind,
	type LivingBeast,
	type NeedTier,
	type NewBeast,
	type SpawnCandidate,
	type SpawnState
} from '$lib/descente/spawn-logic';
import { createServerLogger } from '$lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

type SB = SupabaseClient<Database>;

export interface SpawnResult {
	/** Bêtes nées à cette visite (0 dans le cas courant). */
	created: number;
}

interface GradePoint {
	id: string;
	nodeId: string;
	grade: string;
}

interface TreeNode {
	kind: string;
	parentId: string | null;
	name: string;
}

/** Ligne de tag lue : le point, le modèle et sa première variation. */
interface CombatTagRow {
	point_id: string;
	template_id: string;
	question_templates: { blanks: unknown; statement: unknown } | null;
}

// ============================================================================
// Constantes
// ============================================================================

const logger = createServerLogger('server/descente/spawn');

/** Plafond `max_rows` de PostgREST (supabase/config.toml). */
const TAG_PAGE_SIZE = 1000;

const PROVINCE_IDS: readonly ProvinceId[] = [
	'nombrilie',
	'bedonstan',
	'yoyolande',
	'pifometrie',
	'glitchistan',
	'patatovie'
];

const BEAST_KINDS: readonly BeastKind[] = ['ordinary', 'big', 'tutorial'];

/** Profondeur de l'arbre : sous-notion → notion → branche. */
const MAX_TREE_DEPTH = 3;

// ============================================================================
// Functions
// ============================================================================

/**
 * Fait naître les Bêtes dues de l'élève de la session.
 *
 * @param studentId l'élève de la SESSION (jamais une entrée client)
 * @param grade `profiles.grade`. NULL → aucune Bête, aucune requête.
 * @throws si une lecture ou l'écriture échoue : l'appelant affiche la carte avec
 *   les Bêtes déjà là et réessaiera à la visite suivante.
 */
export async function spawnBeasts(
	supabase: SB,
	studentId: string,
	grade: string | null,
	now: Date = new Date(),
	random: () => number = Math.random
): Promise<SpawnResult> {
	if (!grade) return { created: 0 };

	const [, state] = await Promise.all([
		assertSessionStudent(supabase, studentId),
		loadSpawnState(supabase, studentId, now)
	]);

	const quota = spawnQuota(state);
	if (quota.ordinary === 0 && !quota.big) return { created: 0 };

	const candidates = await loadCandidates(supabase, studentId, grade);
	const beasts = chooseBeasts(quota, candidates, state, random);
	if (beasts.length === 0) return { created: 0 };

	await insertBeasts(studentId, beasts, now);
	return { created: beasts.length };
}

/**
 * Les Bêtes sont écrites au client service : `studentId` DOIT être l'utilisateur
 * du client passé, sinon on lève avant toute écriture.
 */
async function assertSessionStudent(supabase: SB, studentId: string): Promise<void> {
	const { data, error } = await supabase.auth.getUser();
	if (error || data.user?.id !== studentId) {
		throw new Error('Descente : l’élève demandé n’est pas l’utilisateur de la session');
	}
}

/** Bêtes vivantes et dernières apparitions (ordinaire, grosse). */
async function loadSpawnState(supabase: SB, studentId: string, now: Date): Promise<SpawnState> {
	const nowIso = now.toISOString();
	const lastOf = (kind: 'ordinary' | 'big') =>
		supabase
			.from('student_beasts')
			.select('appeared_at')
			.eq('student_id', studentId)
			.eq('kind', kind)
			.order('appeared_at', { ascending: false })
			.limit(1);

	const [livingResult, lastOrdinaryResult, lastBigResult] = await Promise.all([
		supabase
			.from('student_beasts')
			.select('kind, beast_key, province, point_id')
			.eq('student_id', studentId)
			.is('defeated_at', null)
			.or(`leaves_at.is.null,leaves_at.gt.${nowIso}`),
		lastOf('ordinary'),
		lastOf('big')
	]);
	if (livingResult.error) throw new Error(`Bêtes illisibles : ${livingResult.error.message}`);
	if (lastOrdinaryResult.error) {
		throw new Error(`Dernière Bête illisible : ${lastOrdinaryResult.error.message}`);
	}
	if (lastBigResult.error) {
		throw new Error(`Dernière grosse Bête illisible : ${lastBigResult.error.message}`);
	}

	const living: LivingBeast[] = [];
	for (const row of livingResult.data ?? []) {
		// La base contraint ces valeurs ; une valeur inconnue serait une Bête d'un
		// code plus récent : on la compte quand même, comme ordinaire, pour ne pas
		// dépasser les 5
		living.push({
			kind: isBeastKind(row.kind) ? row.kind : 'ordinary',
			beastKey: row.beast_key,
			province: isProvinceId(row.province) ? row.province : 'nombrilie',
			pointId: row.point_id
		});
	}

	const dateOf = (rows: { appeared_at: string }[] | null) =>
		rows && rows.length > 0 ? new Date(rows[0].appeared_at) : null;

	return {
		now,
		living,
		lastOrdinaryAt: dateOf(lastOrdinaryResult.data),
		lastBigAt: dateOf(lastBigResult.data)
	};
}

/**
 * Points qui peuvent faire naître une Bête, avec leur rang de besoin :
 *   - à remédier : point de son parcours (son niveau et les précédents) marqué
 *     à remédier ;
 *   - non acquis : point de SON niveau, pas encore acquis ;
 *   - à revoir : point de son parcours dont une carte de révision est due.
 * Seulement les points jouables (un modèle publié jouable en combat) et rattachés
 * à une branche connue.
 */
async function loadCandidates(
	supabase: SB,
	studentId: string,
	grade: string
): Promise<SpawnCandidate[]> {
	const grades = await loadPathGrades(supabase, grade);
	const points = await loadGradePoints(supabase, grades);
	if (points.length === 0) return [];

	const { data: tags, error: tagsError } = await fetchInChunks(
		points.map((p) => p.id),
		(batch) => fetchCombatTagPages(supabase, batch)
	);
	if (tagsError) throw new Error(`Tags illisibles : ${tagsError.message}`);

	const playable = new Set<string>();
	for (const row of tags) {
		const template = row.question_templates;
		if (!template) continue;
		if (
			isCombatTemplate({
				id: row.template_id,
				blanks: template.blanks,
				statement: template.statement
			})
		) {
			playable.add(row.point_id);
		}
	}
	const playablePoints = points.filter((p) => playable.has(p.id));
	if (playablePoints.length === 0) return [];

	const playableIds = playablePoints.map((p) => p.id);
	const [nodes, statesResult, badges] = await Promise.all([
		loadTree(supabase, playablePoints),
		fetchInChunks(playableIds, (batch) =>
			supabase
				.from('student_point_state')
				.select('point_id, is_acquired, needs_remediation')
				.eq('student_id', studentId)
				.in('point_id', batch)
		),
		computePointBadges(supabase, studentId, playableIds, { onError: 'throw' })
	]);
	if (statesResult.error) throw new Error(`États illisibles : ${statesResult.error.message}`);

	const stateByPoint = new Map(statesResult.data.map((row) => [row.point_id, row]));
	const candidates: SpawnCandidate[] = [];
	let unknownBranch = 0;

	for (const point of playablePoints) {
		const state = stateByPoint.get(point.id);
		const badge = badges.get(point.id);
		const tier = needTier(point, grade, state, badge === 'a_remedier' || badge === 'a_renforcer');
		if (!tier) continue;

		const province = provinceOfPoint(point.nodeId, nodes);
		if (!province) {
			unknownBranch += 1;
			continue;
		}
		candidates.push({ pointId: point.id, province, tier });
	}

	if (unknownBranch > 0) {
		logger.warn(
			`[descente] ${unknownBranch} points sans Province (branche inconnue ou arbre illisible)`
		);
	}
	return candidates;
}

/** Rang de besoin d'un point, ou `null` s'il ne fait naître aucune Bête. */
function needTier(
	point: GradePoint,
	grade: string,
	state: { is_acquired: boolean; needs_remediation: boolean } | undefined,
	dueForReview: boolean
): NeedTier | null {
	if (state?.needs_remediation) return 'remediation';
	if (point.grade === grade && !state?.is_acquired) return 'not_acquired';
	if (dueForReview) return 'review';
	return null;
}

/** Province d'un point : celle de la branche, en remontant l'arbre. */
function provinceOfPoint(nodeId: string, nodes: Map<string, TreeNode>): ProvinceId | null {
	let current = nodes.get(nodeId);
	for (let depth = 0; current && depth < MAX_TREE_DEPTH; depth++) {
		if (current.kind === 'branch') return provinceOfBranch(current.name);
		current = current.parentId ? nodes.get(current.parentId) : undefined;
	}
	return null;
}

/** Le niveau de l'élève puis ses niveaux antérieurs (comme la Chatterie). */
async function loadPathGrades(supabase: SB, grade: string): Promise<string[]> {
	const { data, error } = await supabase.rpc('grade_ancestors', { p_grade: grade });
	if (error) throw new Error(`Parcours illisible : ${error.message}`);
	const ancestors: unknown = data ?? [];
	if (!Array.isArray(ancestors) || !ancestors.every((g) => typeof g === 'string')) {
		throw new Error('Parcours illisible : réponse inattendue de grade_ancestors');
	}
	return [...new Set([grade, ...ancestors])];
}

/** Points non archivés de ces niveaux, une requête par niveau (plafond de 1 000 lignes). */
async function loadGradePoints(supabase: SB, grades: string[]): Promise<GradePoint[]> {
	const results = await Promise.all(
		grades.map((g) =>
			supabase
				.from('curriculum_points')
				.select('id, node_id, grade')
				.eq('grade', g)
				.is('archived_at', null)
		)
	);
	const points: GradePoint[] = [];
	for (const result of results) {
		if (result.error) throw new Error(`Points du parcours illisibles : ${result.error.message}`);
		for (const row of result.data ?? []) {
			if (row.grade) points.push({ id: row.id, nodeId: row.node_id, grade: row.grade });
		}
	}
	return points;
}

/**
 * Tags d'un lot de points par un modèle PUBLIÉ, avec les cases et le sujet de sa
 * première variation, par pages de 1 000 lignes (ordre stable). Jointure `!inner`
 * voulue : un brouillon (invisible à l'élève) ne rend pas un point jouable.
 */
async function fetchCombatTagPages(
	supabase: SB,
	pointIds: string[]
): Promise<{ data: CombatTagRow[]; error: { message: string } | null }> {
	const rows: CombatTagRow[] = [];
	for (let from = 0; ; from += TAG_PAGE_SIZE) {
		const { data, error } = await supabase
			.from('question_template_points')
			.select(
				'point_id, template_id, question_templates!inner(blanks:variations->0->blanks, statement:variations->0->>statement)'
			)
			.eq('question_templates.status', 'published')
			.in('point_id', pointIds)
			.order('point_id')
			.order('template_id')
			.range(from, from + TAG_PAGE_SIZE - 1);
		if (error) return { data: [], error };
		const page: CombatTagRow[] = (data ?? []).map((row) => ({
			point_id: row.point_id,
			template_id: row.template_id,
			question_templates: row.question_templates as CombatTagRow['question_templates']
		}));
		rows.push(...page);
		if (page.length < TAG_PAGE_SIZE) return { data: rows, error: null };
	}
}

/** Branches et notions non archivées, et les nœuds référencés par les points. */
async function loadTree(supabase: SB, points: GradePoint[]): Promise<Map<string, TreeNode>> {
	const referenced = [...new Set(points.map((p) => p.nodeId))];
	const [treeResult, referencedResult] = await Promise.all([
		supabase
			.from('classification_nodes')
			.select('id, kind, parent_id, name')
			.in('kind', ['branch', 'notion'])
			.is('archived_at', null),
		fetchInChunks(referenced, (batch) =>
			supabase.from('classification_nodes').select('id, kind, parent_id, name').in('id', batch)
		)
	]);
	if (treeResult.error) throw new Error(`Arbre illisible : ${treeResult.error.message}`);
	if (referencedResult.error)
		throw new Error(`Nœuds illisibles : ${referencedResult.error.message}`);

	const nodes = new Map<string, TreeNode>();
	for (const row of [...(treeResult.data ?? []), ...referencedResult.data]) {
		nodes.set(row.id, { kind: row.kind, parentId: row.parent_id, name: row.name });
	}
	return nodes;
}

/** Écrit les Bêtes au client service ; vérifie le nombre de lignes rendues. */
async function insertBeasts(studentId: string, beasts: NewBeast[], now: Date): Promise<void> {
	const rows = beasts.map((beast) => ({
		student_id: studentId,
		beast_key: beast.beastKey,
		kind: beast.kind,
		province: beast.province,
		point_id: beast.pointId,
		max_hp: beast.maxHp,
		hp: beast.maxHp,
		appeared_at: now.toISOString(),
		leaves_at: beast.leavesAt ? beast.leavesAt.toISOString() : null
	}));
	const { data, error } = await createServiceRoleClient()
		.from('student_beasts')
		.insert(rows)
		.select('id');
	if (error) throw new Error(`Bêtes non écrites : ${error.message}`);
	if ((data ?? []).length !== rows.length) {
		throw new Error(`Bêtes écrites : ${(data ?? []).length} sur ${rows.length}`);
	}
}

function isBeastKind(value: string): value is BeastKind {
	return (BEAST_KINDS as readonly string[]).includes(value);
}

function isProvinceId(value: string): value is ProvinceId {
	return (PROVINCE_IDS as readonly string[]).includes(value);
}
