/**
 * La Descente de la Vistule — apparition des Bêtes (serveur)
 * ==========================================================
 *
 * Appelé quand l'élève ouvre la carte (étape 4) : rattrape le temps passé et fait
 * naître ses Bêtes. Règles et choix : `#lib/descente/spawn-logic.ts` ; phase 0 de
 * l'étape 2 dans docs/wip/navadra-progress.md (validée le 2026-11-18).
 *
 * Lectures au client de L'ÉLÈVE (RLS) : ses Bêtes (« Students can view their own
 * beasts »), son état par point et ses cartes de révision ; parcours, points,
 * tags, modèles publiés et arbre sont lisibles par tout connecté. ⚠️ Un refus RLS
 * rend zéro ligne en silence : sur les points, aucune Bête ne naît (sans gravité) ;
 * sur les Bêtes VIVANTES, la carte se croirait vide et dépasserait les 5. Les deux
 * lectures sont prouvées en intégration (tests/integration/descente-apparition.test.ts :
 * carte pleine, Bête repartie).
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
import type { Database } from '#lib/types/database.ts';
import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';
import { computePointBadges } from '#lib/server/srs/curriculum-point-badge.ts';
import { fetchInChunks } from '#lib/server/utils/chunked-in.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import {
	assertSessionStudent,
	loadGrade,
	loadGradePoints,
	loadPathGrades,
	loadPlayableTemplates,
	loadTree,
	provinceOfPoint,
	type GradePoint
} from '#lib/server/descente/program.ts';
import {
	chooseBeasts,
	spawnQuota,
	type BeastKind,
	type LivingBeast,
	type NeedTier,
	type NewBeast,
	type SpawnCandidate,
	type SpawnState
} from '#lib/descente/spawn-logic.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// ============================================================================
// Types
// ============================================================================

type SB = SupabaseClient<Database>;

export interface SpawnResult {
	/** Bêtes nées à cette visite (0 dans le cas courant). */
	created: number;
}

// ============================================================================
// Constantes
// ============================================================================

const logger = createServerLogger('server/descente/spawn');

const PROVINCE_IDS: readonly ProvinceId[] = [
	'nombrilie',
	'bedonstan',
	'yoyolande',
	'pifometrie',
	'glitchistan',
	'patatovie'
];

const BEAST_KINDS: readonly BeastKind[] = ['ordinary', 'big', 'tutorial'];

// ============================================================================
// Functions
// ============================================================================

/**
 * Fait naître les Bêtes dues de l'élève de la session.
 *
 * Le niveau est lu dans le profil de l'élève, jamais reçu de l'appelant : une
 * route ne peut pas laisser l'élève choisir le niveau de ses Bêtes.
 *
 * @param studentId l'élève de la SESSION (jamais une entrée client)
 * @throws si une lecture ou l'écriture échoue : l'appelant affiche la carte avec
 *   les Bêtes déjà là et réessaiera à la visite suivante.
 */
export async function spawnBeasts(
	supabase: SB,
	studentId: string,
	now: Date = new Date(),
	random: () => number = Math.random
): Promise<SpawnResult> {
	const [, grade, state] = await Promise.all([
		assertSessionStudent(supabase, studentId),
		loadGrade(supabase, studentId),
		loadSpawnState(supabase, studentId, now)
	]);
	// Sans niveau scolaire : aucune Bête (la carte dira « vois avec ton professeur »)
	if (!grade) return { created: 0 };

	const quota = spawnQuota(state);
	if (quota.ordinary === 0 && !quota.big) return { created: 0 };

	const candidates = await loadCandidates(supabase, studentId, grade);
	const beasts = chooseBeasts(quota, candidates, state, random);
	if (beasts.length === 0) return { created: 0 };

	await insertBeasts(studentId, beasts);
	return { created: beasts.length };
}

/** Bêtes vivantes, dernières apparitions (ordinaire, grosse) et arrivée de l'élève. */
async function loadSpawnState(supabase: SB, studentId: string, now: Date): Promise<SpawnState> {
	const nowIso = now.toISOString();
	const edgeOf = (kind: 'ordinary' | 'big', latest: boolean) =>
		supabase
			.from('student_beasts')
			.select('appeared_at')
			.eq('student_id', studentId)
			.eq('kind', kind)
			.order('appeared_at', { ascending: !latest })
			.limit(1);

	const [livingResult, lastOrdinaryResult, lastBigResult, firstOrdinaryResult] = await Promise.all([
		supabase
			.from('student_beasts')
			.select('kind, beast_key, province, point_id')
			.eq('student_id', studentId)
			.is('defeated_at', null)
			.or(`leaves_at.is.null,leaves_at.gt.${nowIso}`),
		edgeOf('ordinary', true),
		edgeOf('big', true),
		edgeOf('ordinary', false)
	]);
	if (livingResult.error) throw new Error(`Bêtes illisibles : ${livingResult.error.message}`);
	if (lastOrdinaryResult.error) {
		throw new Error(`Dernière Bête illisible : ${lastOrdinaryResult.error.message}`);
	}
	if (firstOrdinaryResult.error) {
		throw new Error(`Première Bête illisible : ${firstOrdinaryResult.error.message}`);
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
		lastBigAt: dateOf(lastBigResult.data),
		firstOrdinaryAt: dateOf(firstOrdinaryResult.data)
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

	const playable = await loadPlayableTemplates(
		supabase,
		points.map((p) => p.id)
	);
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

/** Écrit les Bêtes au client service ; vérifie le nombre de lignes rendues. */
async function insertBeasts(studentId: string, beasts: NewBeast[]): Promise<void> {
	const rows = beasts.map((beast) => ({
		student_id: studentId,
		beast_key: beast.beastKey,
		kind: beast.kind,
		province: beast.province,
		point_id: beast.pointId,
		max_hp: beast.maxHp,
		hp: beast.maxHp,
		appeared_at: beast.appearedAt.toISOString(),
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
