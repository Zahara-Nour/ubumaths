/**
 * La Descente de la Vistule — apparition des Bêtes (logique pure)
 * ===============================================================
 *
 * Règles validées par David le 2026-11-18 (docs/wip/navadra-progress.md, phase 0
 * de l'étape 2) :
 *   - pas de tâche planifiée : à chaque visite, on RATTRAPE le temps passé, une
 *     Bête ordinaire toutes les 8 heures, sans dépasser 5 Bêtes ordinaires en
 *     attente sur la carte (première visite : 3, la part d'un jour) ;
 *   - chaque Bête naît d'un point, par priorité : à remédier, puis non acquis du
 *     niveau, puis à revoir ; au hasard dans un même rang, en préférant une
 *     Province absente de la carte ; jamais deux Bêtes vivantes sur le même point ;
 *   - une Bête ordinaire repart au bout de 3 jours ; celle d'un point à remédier
 *     reste jusqu'à sa défaite ;
 *   - une grosse Bête tous les 7 jours, la première 7 jours après l'arrivée
 *     (première Bête de l'élève ; choix de David du 2026-11-18), née du point le
 *     plus prioritaire ; elle
 *     reste 7 jours et ne compte pas dans les 5 ;
 *   - le tutoriel ne compte pour rien ici.
 *
 * Le serveur (`#lib/server/descente/spawn.ts`) lit la base, appelle ces fonctions
 * et écrit les Bêtes. Deux visites simultanées peuvent en créer quelques-unes de
 * trop, une fois : accepté (question E) ; la carte redescend d'elle-même sous 5.
 */

import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';
import { BESTIARY } from './bestiary';

// ============================================================================
// Types
// ============================================================================

/** Rang du besoin qui fait naître une Bête, du plus prioritaire au moins. */
export type NeedTier = 'remediation' | 'not_acquired' | 'review';

export type BeastKind = 'ordinary' | 'big' | 'tutorial';

/** Un point qui peut faire naître une Bête. */
export interface SpawnCandidate {
	pointId: string;
	province: ProvinceId;
	tier: NeedTier;
}

/** Une Bête vivante de l'élève (ni vaincue ni repartie). */
export interface LivingBeast {
	kind: BeastKind;
	beastKey: string;
	province: ProvinceId;
	pointId: string | null;
}

/** Ce que l'élève a déjà, pour décider combien de Bêtes faire naître. */
export interface SpawnState {
	now: Date;
	living: LivingBeast[];
	/** Apparition de sa dernière Bête ordinaire (vivante ou non) ; `null` : jamais. */
	lastOrdinaryAt: Date | null;
	/** Apparition de sa dernière grosse Bête ; `null` : jamais. */
	lastBigAt: Date | null;
	/** Apparition de sa toute première Bête ordinaire (son arrivée) ; `null` : jamais. */
	firstOrdinaryAt: Date | null;
}

export interface SpawnQuota {
	ordinary: number;
	big: boolean;
	/**
	 * Date d'apparition de chaque Bête ordinaire (autant que `ordinary`). Le
	 * rattrapage garde le reste : la k-ième Bête due est datée de la dernière
	 * apparition + k × 8 h, pour qu'un élève qui vient toutes les 12 heures ait bien
	 * 3 Bêtes par jour. Carte pleine (plus de Bêtes dues que de places) : `now`,
	 * le dû au-delà des 5 est perdu, comme le veut la phase 0.
	 */
	ordinaryAppearedAt: Date[];
}

/** Une Bête à écrire en base. */
export interface NewBeast {
	kind: 'ordinary' | 'big';
	beastKey: string;
	province: ProvinceId;
	pointId: string;
	maxHp: number;
	appearedAt: Date;
	/** `null` : reste jusqu'à sa défaite (point à remédier). */
	leavesAt: Date | null;
}

// ============================================================================
// Constantes
// ============================================================================

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Une Bête ordinaire toutes les 8 heures : 3 par jour (question B). */
export const SPAWN_INTERVAL_MS = 8 * HOUR_MS;
/** Bêtes ordinaires en attente sur la carte, au plus. */
export const MAX_WAITING_ORDINARY = 5;
/** Première visite : la part d'un jour. */
export const FIRST_VISIT_COUNT = 3;
/** Séjour d'une Bête ordinaire (question C). */
export const ORDINARY_STAY_MS = 3 * DAY_MS;
/** Une grosse Bête tous les 7 jours, qui reste 7 jours (question C). */
export const BIG_INTERVAL_MS = 7 * DAY_MS;
export const BIG_STAY_MS = 7 * DAY_MS;

/**
 * Points de vie de départ (phase 0 de l'étape 3, question B) : avec 20 par coup
 * réussi sur la Province sensible (`combat-rules.ts`), une Bête ordinaire tombe
 * en 3 tours ; la grosse Bête, qui se replie après 4 tours, en 3 combats.
 */
export const ORDINARY_MAX_HP = 120;
export const BIG_MAX_HP = 360;

const TIER_ORDER: readonly NeedTier[] = ['remediation', 'not_acquired', 'review'];

// ============================================================================
// Functions
// ============================================================================

/** Combien de Bêtes faire naître maintenant. Aucune lecture de points si 0. */
export function spawnQuota(state: SpawnState): SpawnQuota {
	const { now } = state;
	const livingOrdinary = state.living.filter((b) => b.kind === 'ordinary').length;
	const room = Math.max(0, MAX_WAITING_ORDINARY - livingOrdinary);

	const last = state.lastOrdinaryAt;
	const due =
		last === null
			? FIRST_VISIT_COUNT
			: Math.max(0, Math.floor((now.getTime() - last.getTime()) / SPAWN_INTERVAL_MS));
	const ordinary = Math.min(due, room);
	const keepsRemainder = last !== null && due <= room;
	const ordinaryAppearedAt = Array.from({ length: ordinary }, (_, k) =>
		keepsRemainder ? new Date(last.getTime() + (k + 1) * SPAWN_INTERVAL_MS) : now
	);

	// Grosse Bête : 7 jours après la précédente ; la première, 7 jours après
	// l'arrivée (jamais à la première visite, déjà chargée)
	const hasLivingBig = state.living.some((b) => b.kind === 'big');
	const bigClock = state.lastBigAt ?? state.firstOrdinaryAt;
	const big =
		!hasLivingBig && bigClock !== null && now.getTime() - bigClock.getTime() >= BIG_INTERVAL_MS;

	return { ordinary, big, ordinaryAppearedAt };
}

/**
 * Choisit les Bêtes à faire naître, selon le quota. La grosse Bête d'abord : elle
 * prend le point le plus prioritaire. Moins de candidats que de places : moins de
 * Bêtes (une Province sans point jouable n'en a jamais).
 *
 * @param random tirage dans [0, 1[ (injecté pour les tests)
 */
export function chooseBeasts(
	quota: SpawnQuota,
	candidates: SpawnCandidate[],
	state: Pick<SpawnState, 'now' | 'living'>,
	random: () => number = Math.random
): NewBeast[] {
	const usedPoints = new Set<string>();
	const presentProvinces = new Set<ProvinceId>();
	const usedKeys = new Set<string>();
	for (const beast of state.living) {
		// Le tutoriel ne compte pour rien dans l'apparition
		if (beast.kind === 'tutorial') continue;
		if (beast.pointId) usedPoints.add(beast.pointId);
		presentProvinces.add(beast.province);
		usedKeys.add(beast.beastKey);
	}

	const created: NewBeast[] = [];
	const plan: Array<{ kind: 'big' | 'ordinary'; appearedAt: Date }> = [
		...(quota.big ? [{ kind: 'big' as const, appearedAt: state.now }] : []),
		...quota.ordinaryAppearedAt.map((appearedAt) => ({ kind: 'ordinary' as const, appearedAt }))
	];

	for (const { kind, appearedAt } of plan) {
		const candidate = pickCandidate(candidates, usedPoints, presentProvinces, random);
		if (!candidate) break;
		usedPoints.add(candidate.pointId);
		presentProvinces.add(candidate.province);

		const beastKey = pickBeastKey(candidate.province, usedKeys, random);
		usedKeys.add(beastKey);

		created.push({
			kind,
			beastKey,
			province: candidate.province,
			pointId: candidate.pointId,
			maxHp: kind === 'big' ? BIG_MAX_HP : ORDINARY_MAX_HP,
			appearedAt,
			leavesAt: leavesAtFor(kind, candidate.tier, state.now)
		});
	}
	return created;
}

/** Départ prévu : la Bête d'un point à remédier reste, sauf la grosse Bête. */
function leavesAtFor(kind: 'ordinary' | 'big', tier: NeedTier, now: Date): Date | null {
	if (kind === 'big') return new Date(now.getTime() + BIG_STAY_MS);
	if (tier === 'remediation') return null;
	return new Date(now.getTime() + ORDINARY_STAY_MS);
}

/**
 * Le rang le plus prioritaire qui a un point libre ; dans ce rang, au hasard, en
 * préférant une Province absente de la carte.
 */
function pickCandidate(
	candidates: SpawnCandidate[],
	usedPoints: Set<string>,
	presentProvinces: Set<ProvinceId>,
	random: () => number
): SpawnCandidate | null {
	for (const tier of TIER_ORDER) {
		const free = candidates.filter((c) => c.tier === tier && !usedPoints.has(c.pointId));
		if (free.length === 0) continue;
		const absent = free.filter((c) => !presentProvinces.has(c.province));
		return pickOne(absent.length > 0 ? absent : free, random);
	}
	return null;
}

/** Une Bête du bestiaire de la Province, de préférence pas déjà sur la carte. */
function pickBeastKey(province: ProvinceId, usedKeys: Set<string>, random: () => number): string {
	const entries = BESTIARY[province];
	const unused = entries.filter((entry) => !usedKeys.has(entry.key));
	return pickOne(unused.length > 0 ? unused : entries, random).key;
}

function pickOne<T>(items: readonly T[], random: () => number): T {
	const index = Math.min(items.length - 1, Math.floor(random() * items.length));
	return items[index];
}
