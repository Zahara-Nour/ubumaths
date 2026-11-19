/**
 * La Descente de la Vistule — règles du combat de la recrue
 * =========================================================
 *
 * Phase 0 de l'étape 3, validée par David le 2026-11-18
 * (docs/wip/navadra-progress.md) :
 *
 * - un tour = 3 coups de l'élève, puis la riposte de la Bête, que la recrue
 *   esquive par une question ;
 * - un coup réussi fait 20 sur la Province sensible de la Bête, 8 ailleurs
 *   (question B) ; un coup raté ne fait rien ;
 * - l'élève a 3 cœurs (question A) ; une esquive ratée en coûte un ; plus de
 *   cœur : la Bête gagne ce combat, sans rien coûter ;
 * - la grosse Bête se replie après 4 tours en gardant ses blessures (question C) ;
 *   les Bêtes ordinaires n'ont pas de limite de tours ;
 * - le même coup peut servir plusieurs fois par tour (question D).
 *
 * Le SERVEUR tient les points de vie de la Bête (`hitDamage` y est appliqué) ;
 * la page tient le reste (tour, coups du tour, cœurs) avec `afterAttack` et
 * `afterDodge`. Une page fermée abandonne le combat sans rien perdre.
 */

import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';

// Types
export type CombatBeastKind = 'ordinary' | 'big' | 'tutorial';

/**
 * - `attack` : l'élève choisit un coup ;
 * - `dodge` : la Bête riposte, question d'esquive ;
 * - `won` : la Bête est vaincue ;
 * - `lost` : plus de cœur, la Bête gagne ce combat ;
 * - `retreat` : la grosse Bête se replie (4 tours), blessures gardées.
 */
export type CombatPhase = 'attack' | 'dodge' | 'won' | 'lost' | 'retreat';

export interface CombatState {
	kind: CombatBeastKind;
	phase: CombatPhase;
	/** Tour en cours, à partir de 1 */
	round: number;
	/** Coups déjà joués dans ce tour (0 à 3) */
	actionsThisRound: number;
	hearts: number;
	beastHp: number;
	beastMaxHp: number;
}

/** La Bête telle que la page l'affiche (rendue par le serveur à l'ouverture). */
export interface CombatBeast {
	id: string;
	kind: CombatBeastKind;
	province: ProvinceId;
	name: string;
	hp: number;
	maxHp: number;
}

export interface OpenedCombat {
	beast: CombatBeast;
	/** Provinces dont le coup est ouvert (au moins une question jouable à son niveau). */
	openProvinces: ProvinceId[];
}

// Constantes
/** Coups de l'élève par tour, avant la riposte. */
export const ACTIONS_PER_ROUND = 3;
/** Cœurs de la recrue au début d'un combat (question A). */
export const STARTING_HEARTS = 3;
/** Tours au plus d'un combat contre la grosse Bête (question C). */
export const BIG_ROUND_LIMIT = 4;
/** Dégâts d'un coup réussi : Province sensible de la Bête, autre Province (question B). */
export const HIT_ON_SENSITIVE = 20;
export const HIT_ELSEWHERE = 8;

// Functions
/** Dégâts d'un coup RÉUSSI de cette Province contre une Bête sensible à `beastProvince`. */
export function hitDamage(moveProvince: ProvinceId, beastProvince: ProvinceId): number {
	return moveProvince === beastProvince ? HIT_ON_SENSITIVE : HIT_ELSEWHERE;
}

/** Points de vie après un coup réussi, jamais sous 0. */
export function hpAfterHit(hp: number, damage: number): number {
	return Math.max(0, hp - damage);
}

/** Début d'un combat : la Bête telle que le serveur la rend (grosse Bête blessée comprise). */
export function startCombat(input: {
	kind: CombatBeastKind;
	beastHp: number;
	beastMaxHp: number;
}): CombatState {
	return {
		kind: input.kind,
		phase: 'attack',
		round: 1,
		actionsThisRound: 0,
		hearts: STARTING_HEARTS,
		beastHp: input.beastHp,
		beastMaxHp: input.beastMaxHp
	};
}

/**
 * Après un coup : `beastHp` est celui que rend le serveur (inchangé si le coup
 * est raté). Bête à 0 : victoire ; troisième coup du tour : riposte.
 */
export function afterAttack(state: CombatState, beastHp: number): CombatState {
	if (state.phase !== 'attack') return state;
	const hp = Math.max(0, Math.min(state.beastMaxHp, beastHp));
	if (hp === 0) return { ...state, beastHp: 0, phase: 'won' };

	const actions = state.actionsThisRound + 1;
	return {
		...state,
		beastHp: hp,
		actionsThisRound: actions,
		phase: actions >= ACTIONS_PER_ROUND ? 'dodge' : 'attack'
	};
}

/**
 * Après l'esquive : ratée, un cœur de moins ; plus de cœur, la Bête gagne ce
 * combat. Sinon, tour suivant, ou repli de la grosse Bête après son 4e tour.
 */
export function afterDodge(state: CombatState, dodged: boolean): CombatState {
	if (state.phase !== 'dodge') return state;
	const hearts = dodged ? state.hearts : state.hearts - 1;
	if (hearts <= 0) return { ...state, hearts: 0, phase: 'lost' };

	if (state.kind === 'big' && state.round >= BIG_ROUND_LIMIT) {
		return { ...state, hearts, phase: 'retreat' };
	}
	return { ...state, hearts, round: state.round + 1, actionsThisRound: 0, phase: 'attack' };
}

/** Le combat est-il fini ? */
export function isCombatOver(state: CombatState): boolean {
	return state.phase === 'won' || state.phase === 'lost' || state.phase === 'retreat';
}
