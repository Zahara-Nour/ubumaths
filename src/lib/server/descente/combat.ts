/**
 * La Descente de la Vistule — combat de la recrue (serveur)
 * =========================================================
 *
 * Phase 0 de l'étape 3, validée par David le 2026-11-18
 * (docs/wip/navadra-progress.md). Règles pures : `#lib/descente/combat-rules.ts`.
 *
 * Le serveur tient les points de vie de la Bête ; la page tient le tour, les
 * coups du tour et les cœurs (une page fermée abandonne le combat sans rien
 * perdre). Quatre opérations :
 *
 * - `openCombat` : la Bête (vivante, à l'élève), remise en pleine forme si elle
 *   est ordinaire (la grosse Bête garde ses blessures), et les coups ouverts ;
 * - `drawCombatQuestion` : une question courte de la Province du coup, ou du point
 *   de la Bête (coup sensible, esquive) ; revérifiée après génération ;
 * - `recordCombatAnswer` : la réponse comptée comme partout (trace au lieu
 *   `descente`, FSRS, deck Programme), puis les dégâts d'un coup réussi ;
 * - `claimBeastVictory` : Bête à 0 → défaite marquée, gidouilles plafonnées.
 *
 * Droits : lectures au client de L'ÉLÈVE (ses Bêtes : RLS « Students can view
 * their own beasts » ; programme et modèles publiés : tout connecté). Écritures
 * au client SERVICE (l'élève n'écrit ni ses Bêtes ni une trace `descente`),
 * toujours après `assertSessionStudent` : l'identifiant écrit est celui de la
 * session, jamais une entrée client. La Bête est relue à chaque opération :
 * une Bête d'un autre élève est invisible (RLS), donc « introuvable ».
 *
 * Triche : la correction se fait côté client (ADR 0001), comme partout ; une
 * réponse « juste » forgée ne fait rien de plus qu'une trace forgée par
 * `/api/skill-attempts`, et les gidouilles restent plafonnées (4 sur 24 h).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { generateInstance } from '#lib/questions/index.ts';
import { toQuestionTemplate } from '#lib/types/question-template.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { recordStudentAttempt } from '#lib/server/skill-attempts/record-attempt.ts';
import { BESTIARY } from '#lib/descente/bestiary.ts';
import { isCombatInstance } from '#lib/descente/combat-templates.ts';
import {
	hitDamage,
	hpAfterHit,
	type CombatBeastKind,
	type OpenedCombat
} from '#lib/descente/combat-rules.ts';
import { isProvinceId, PROVINCE_IDS } from '#lib/descente/moves.ts';
import {
	assertSessionStudent,
	loadGrade,
	loadGradePoints,
	loadPlayableTemplates,
	loadTree,
	provinceOfPoint,
	type GradePoint
} from '#lib/server/descente/program.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// ============================================================================
// Types
// ============================================================================

type SB = SupabaseClient<Database>;

export type { CombatBeast, OpenedCombat } from '#lib/descente/combat-rules.ts';

export type CombatPurpose = 'attack' | 'dodge';

/** Pourquoi un combat ne peut pas avoir lieu (ou plus continuer). */
export type CombatErrorCode =
	'not_found' | 'defeated' | 'gone' | 'no_grade' | 'move_closed' | 'no_question' | 'not_won';

export class CombatError extends Error {
	constructor(
		readonly code: CombatErrorCode,
		message: string
	) {
		super(message);
		this.name = 'CombatError';
	}
}

export interface DrawnQuestion {
	instance: QuestionInstance;
}

export interface CombatAnswerInput {
	beastId: string;
	purpose: CombatPurpose;
	/** Province du coup (attaque) ; ignorée pour l'esquive */
	province: ProvinceId;
	templateId: string;
	success: boolean;
	seed?: number;
	answerParts: string[] | null;
	partVerdicts: boolean[] | null;
}

export interface VictoryReward {
	paid: number;
	capReached: boolean;
}

export interface CombatAnswerResult {
	beastHp: number;
	/** La réponse a-t-elle été enregistrée comme travail ? */
	recorded: boolean;
	/** Bête vaincue par ce coup ; `null` si elle tient, ou si la victoire est à renvoyer */
	victory: VictoryReward | null;
}

interface BeastRow {
	id: string;
	kind: CombatBeastKind;
	province: ProvinceId;
	pointId: string | null;
	beastKey: string;
	hp: number;
	maxHp: number;
}

// ============================================================================
// Constantes
// ============================================================================

const logger = createServerLogger('server/descente/combat');

/** Questions générées au plus avant de renoncer (variation trop longue, échec). */
const MAX_DRAW_TRIES = 8;

/** Essais de l'écriture des PV (deux réponses presque simultanées). */
const MAX_HP_WRITES = 3;

const BEAST_KINDS: readonly CombatBeastKind[] = ['ordinary', 'big', 'tutorial'];

/** Nom d'une Bête absente du bestiaire (clé d'un code plus récent). */
const FALLBACK_BEAST_NAME = 'Bête imprévue';

// ============================================================================
// Functions
// ============================================================================

/**
 * Ouvre le combat : la Bête, remise en pleine forme si elle est ordinaire (un
 * combat perdu ou abandonné ne coûte rien), et les coups ouverts.
 */
export async function openCombat(
	supabase: SB,
	studentId: string,
	beastId: string,
	now: Date = new Date()
): Promise<OpenedCombat> {
	// Garde d'abord : un autre identifiant lève avant toute lecture
	await assertSessionStudent(supabase, studentId);
	const [grade, beast] = await Promise.all([
		loadGrade(supabase, studentId),
		loadLivingBeast(supabase, studentId, beastId, now)
	]);
	if (!grade) throw new CombatError('no_grade', 'Élève sans niveau scolaire');

	// À 0 sans défaite (victoire pas encore enregistrée) : la page la renvoie
	let hp = beast.hp;
	if (beast.kind !== 'big' && beast.hp > 0 && beast.hp !== beast.maxHp) {
		await writeHp(studentId, beast.id, beast.hp, beast.maxHp);
		hp = beast.maxHp;
	}

	const pools = await loadProvincePools(supabase, grade);
	const open = new Set<ProvinceId>(pools.keys());
	// Le coup de la Province sensible tire du point de la Bête, jouable à sa naissance
	open.add(beast.province);

	return {
		beast: {
			id: beast.id,
			kind: beast.kind,
			province: beast.province,
			name: beastName(beast),
			hp,
			maxHp: beast.maxHp
		},
		openProvinces: PROVINCE_IDS.filter((p) => open.has(p))
	};
}

/**
 * Tire une question courte :
 * - esquive, ou coup de la Province sensible : du point de la Bête ; à défaut
 *   (modèle dépublié depuis), d'un autre point de cette Province à son niveau ;
 * - autre coup : d'un point de son niveau dans cette Province, en préférant les
 *   non acquis.
 * Chaque question générée est revérifiée (`isCombatInstance`) : une variation
 * plus longue que la première est écartée et une autre est tirée.
 *
 * @param recentTemplateIds modèles déjà posés dans ce combat, tirés en dernier
 */
export async function drawCombatQuestion(
	supabase: SB,
	studentId: string,
	input: {
		beastId: string;
		purpose: CombatPurpose;
		province: ProvinceId;
		recentTemplateIds: string[];
	},
	now: Date = new Date(),
	random: () => number = Math.random
): Promise<DrawnQuestion> {
	// Garde d'abord : un autre identifiant lève avant toute lecture
	await assertSessionStudent(supabase, studentId);
	const [grade, beast] = await Promise.all([
		loadGrade(supabase, studentId),
		loadLivingBeast(supabase, studentId, input.beastId, now)
	]);
	if (!grade) throw new CombatError('no_grade', 'Élève sans niveau scolaire');

	const fromBeastPoint = input.purpose === 'dodge' || input.province === beast.province;
	const province = fromBeastPoint ? beast.province : input.province;

	const candidates: string[] = [];
	if (fromBeastPoint && beast.pointId) {
		const playable = await loadPlayableTemplates(supabase, [beast.pointId]);
		candidates.push(...ordered(playable.get(beast.pointId) ?? [], input.recentTemplateIds, random));
	}

	const pool = (await loadProvincePools(supabase, grade)).get(province) ?? [];
	if (!fromBeastPoint && pool.length === 0) {
		throw new CombatError('move_closed', 'Aucune question de cette Province à ce niveau');
	}
	const others = fromBeastPoint ? pool.filter((p) => p.point.id !== beast.pointId) : pool;
	const preferred = await preferNotAcquired(supabase, studentId, others, random);
	for (const entry of preferred) {
		candidates.push(...ordered(entry.templateIds, input.recentTemplateIds, random));
	}

	const instance = await generateFirstShort(supabase, [...new Set(candidates)]);
	if (!instance) throw new CombatError('no_question', 'Aucune question courte à poser');
	return { instance };
}

/**
 * Enregistre une réponse en combat, puis applique les dégâts d'un coup réussi.
 * Une trace qui n'a pas pu être écrite n'arrête pas le combat (`recorded: false`) ;
 * un modèle inconnu, si : rien n'est compté.
 */
export async function recordCombatAnswer(
	supabase: SB,
	studentId: string,
	input: CombatAnswerInput,
	now: Date = new Date()
): Promise<CombatAnswerResult> {
	// Garde d'abord : un autre identifiant lève avant toute lecture
	await assertSessionStudent(supabase, studentId);
	const beast = await loadLivingBeast(supabase, studentId, input.beastId, now);

	// Lieu `descente` : écrit au client service, la policy élève le refuse
	const attempt = await recordStudentAttempt(
		supabase,
		{
			studentId,
			templateId: input.templateId,
			success: input.success,
			withHelp: false,
			place: 'descente',
			seed: input.seed,
			answerParts: input.answerParts,
			partVerdicts: input.partVerdicts
		},
		createServiceRoleClient()
	);
	if (!attempt.ok && attempt.reason === 'template_not_found') {
		throw new CombatError('not_found', 'Question inconnue');
	}
	if (!attempt.ok) logger.warn(`[descente] réponse non enregistrée (${attempt.reason})`);

	let hp = beast.hp;
	if (input.purpose === 'attack' && input.success && hp > 0) {
		hp = await applyHit(studentId, beast, hitDamage(input.province, beast.province));
	}

	let victory: VictoryReward | null = null;
	if (hp === 0) {
		try {
			victory = await payVictory(studentId, beast);
		} catch (err) {
			if (err instanceof CombatError && err.code === 'defeated') {
				// Une autre réponse (autre onglet) l'a achevée et payée : rien à refaire
				logger.warn('[descente] victoire déjà enregistrée par une autre réponse');
			} else {
				// La page renverra la victoire (`claimBeastVictory`)
				logger.error('[descente] victoire non enregistrée :', err);
			}
		}
	}
	return { beastHp: hp, recorded: attempt.ok, victory };
}

/** Renvoi de la victoire : la Bête doit être à 0 et pas encore vaincue. */
export async function claimBeastVictory(
	supabase: SB,
	studentId: string,
	beastId: string,
	now: Date = new Date()
): Promise<VictoryReward> {
	// Garde d'abord : un autre identifiant lève avant toute lecture
	await assertSessionStudent(supabase, studentId);
	const beast = await loadLivingBeast(supabase, studentId, beastId, now);
	if (beast.hp > 0) throw new CombatError('not_won', 'La Bête tient encore debout');
	return payVictory(studentId, beast);
}

// ----------------------------------------------------------------------------
// Bête
// ----------------------------------------------------------------------------

/** La Bête, lue aux droits de l'élève : à lui, ni vaincue ni repartie. */
async function loadLivingBeast(
	supabase: SB,
	studentId: string,
	beastId: string,
	now: Date
): Promise<BeastRow> {
	const { data, error } = await supabase
		.from('student_beasts')
		.select('id, kind, province, point_id, beast_key, hp, max_hp, defeated_at, leaves_at')
		.eq('id', beastId)
		.eq('student_id', studentId)
		.maybeSingle();
	if (error) throw new Error(`Bête illisible : ${error.message}`);
	// Bête d'un autre élève : invisible (RLS), donc introuvable
	if (!data) throw new CombatError('not_found', 'Bête introuvable');
	if (data.defeated_at) throw new CombatError('defeated', 'Bête déjà vaincue');
	if (data.leaves_at && new Date(data.leaves_at) <= now) {
		throw new CombatError('gone', 'Bête repartie');
	}
	if (!isProvinceId(data.province)) throw new Error(`Province inconnue : ${data.province}`);

	return {
		id: data.id,
		kind: (BEAST_KINDS as readonly string[]).includes(data.kind)
			? (data.kind as CombatBeastKind)
			: 'ordinary',
		province: data.province,
		pointId: data.point_id,
		beastKey: data.beast_key,
		hp: data.hp,
		maxHp: data.max_hp
	};
}

function beastName(beast: Pick<BeastRow, 'province' | 'beastKey'>): string {
	const entry = BESTIARY[beast.province].find((b) => b.key === beast.beastKey);
	return entry?.name ?? FALLBACK_BEAST_NAME;
}

/** Écrit les PV si la Bête a encore `expected` (sinon 0 ligne). */
async function writeHp(
	studentId: string,
	beastId: string,
	expected: number,
	next: number
): Promise<boolean> {
	const { data, error } = await createServiceRoleClient()
		.from('student_beasts')
		.update({ hp: next })
		.eq('id', beastId)
		.eq('student_id', studentId)
		.eq('hp', expected)
		.is('defeated_at', null)
		.select('id');
	if (error) throw new Error(`PV non écrits : ${error.message}`);
	return (data ?? []).length === 1;
}

/**
 * Retire les dégâts ; deux réponses presque simultanées ne s'écrasent pas :
 * l'écriture n'a lieu que si les PV n'ont pas bougé, sinon on relit et refait.
 */
async function applyHit(studentId: string, beast: BeastRow, damage: number): Promise<number> {
	let current = beast.hp;
	for (let attempt = 0; attempt < MAX_HP_WRITES; attempt++) {
		const next = hpAfterHit(current, damage);
		if (await writeHp(studentId, beast.id, current, next)) return next;

		const { data, error } = await createServiceRoleClient()
			.from('student_beasts')
			.select('hp, defeated_at')
			.eq('id', beast.id)
			.eq('student_id', studentId)
			.maybeSingle();
		if (error) throw new Error(`Bête illisible : ${error.message}`);
		if (!data || data.defeated_at) throw new CombatError('defeated', 'Bête déjà vaincue');
		current = data.hp;
	}
	throw new Error('PV non écrits : la Bête change sans cesse');
}

/** Défaite marquée et gidouilles plafonnées (`record_beast_victory`, serveur seul). */
async function payVictory(studentId: string, beast: BeastRow): Promise<VictoryReward> {
	const { data, error } = await createServiceRoleClient().rpc('record_beast_victory', {
		p_student_id: studentId,
		p_beast_id: beast.id,
		p_beast_name: beastName(beast)
	});
	if (error) {
		// 55000 : déjà vaincue (une autre réponse l'a achevée) ou repartie
		if (error.code === '55000') throw new CombatError('defeated', 'Bête déjà vaincue');
		throw new Error(`Victoire non enregistrée : ${error.message}`);
	}
	const row = Array.isArray(data) ? data[0] : null;
	if (!row) throw new Error('Victoire non enregistrée : aucune ligne rendue');
	return { paid: row.paid, capReached: row.cap_reached };
}

// ----------------------------------------------------------------------------
// Questions
// ----------------------------------------------------------------------------

interface PoolEntry {
	point: GradePoint;
	templateIds: string[];
}

/**
 * Points jouables de SON niveau (pas des niveaux précédents), par Province. Une
 * Province absente n'a aucune question à son niveau : coup fermé.
 */
async function loadProvincePools(
	supabase: SB,
	grade: string
): Promise<Map<ProvinceId, PoolEntry[]>> {
	const points = await loadGradePoints(supabase, [grade]);
	const playable = await loadPlayableTemplates(
		supabase,
		points.map((p) => p.id)
	);
	const playablePoints = points.filter((p) => playable.has(p.id));
	const pools = new Map<ProvinceId, PoolEntry[]>();
	if (playablePoints.length === 0) return pools;

	const nodes = await loadTree(supabase, playablePoints);
	for (const point of playablePoints) {
		const province = provinceOfPoint(point.nodeId, nodes);
		if (!province) continue;
		const entry = { point, templateIds: playable.get(point.id) ?? [] };
		const list = pools.get(province);
		if (list) list.push(entry);
		else pools.set(province, [entry]);
	}
	return pools;
}

/** Les points non acquis d'abord (au hasard), puis les autres (au hasard). */
async function preferNotAcquired(
	supabase: SB,
	studentId: string,
	entries: PoolEntry[],
	random: () => number
): Promise<PoolEntry[]> {
	if (entries.length === 0) return [];
	const { data, error } = await supabase
		.from('student_point_state')
		.select('point_id')
		.eq('student_id', studentId)
		.eq('is_acquired', true)
		.in(
			'point_id',
			entries.map((e) => e.point.id)
		);
	// États illisibles : on tire au hasard sans préférence, le combat continue
	if (error) logger.warn(`[descente] états illisibles : ${error.message}`);
	const acquired = new Set((data ?? []).map((row) => row.point_id));
	return [
		...shuffle(
			entries.filter((e) => !acquired.has(e.point.id)),
			random
		),
		...shuffle(
			entries.filter((e) => acquired.has(e.point.id)),
			random
		)
	];
}

/** Modèles au hasard, ceux déjà posés dans ce combat en dernier. */
function ordered(templateIds: string[], recent: string[], random: () => number): string[] {
	const seen = new Set(recent);
	return [
		...shuffle(
			templateIds.filter((id) => !seen.has(id)),
			random
		),
		...shuffle(
			templateIds.filter((id) => seen.has(id)),
			random
		)
	];
}

/** Génère les modèles dans l'ordre jusqu'à une question courte. */
async function generateFirstShort(
	supabase: SB,
	templateIds: string[]
): Promise<QuestionInstance | null> {
	let tries = 0;
	for (const templateId of templateIds) {
		if (tries >= MAX_DRAW_TRIES) break;
		tries += 1;

		const { data, error } = await supabase
			.from('question_templates')
			.select('*')
			.eq('id', templateId)
			.eq('status', 'published')
			.maybeSingle();
		if (error) throw new Error(`Modèle illisible : ${error.message}`);
		if (!data) continue;

		const result = generateInstance(toQuestionTemplate(data));
		if (!result.success) {
			logger.warn(`[descente] modèle ${templateId} non généré : ${result.errors.join(' ; ')}`);
			continue;
		}
		if (isCombatInstance(result.instance)) return result.instance;
	}
	return null;
}

function shuffle<T>(items: T[], random: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}
