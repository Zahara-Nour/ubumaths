/**
 * Bloc ```monnaie à construire — la construction de l'élève
 * =========================================================
 *
 * Calcul pur, partagé par l'écran (`MonnaieConstruire.svelte`), le PDF
 * (`monnaie-typst.ts`) et le parseur (somme faisable avec la réserve) ;
 * chantier `docs/wip/construire-progress.md` § 3, 6.
 *
 * L'élève pose des coupures de la réserve sur un plan vide. Seule la SOMME
 * posée est jugée (Q5) : 20 + 10 + 5 € ou 3 × 10 + 2 + 2 + 1 € valent 35 €.
 * Plan vide → réponse vide (Q6). Les coupures se rangent d'office (Q2) :
 * billets en haut, pièces dessous, la plus grande d'abord — la scène de la
 * monnaie, en `rangé`.
 *
 * @module ubumark/utils/monnaie-construire
 */

import {
	MONNAIE_DEFAULT_RESERVE,
	MONNAIE_LIMITS,
	MONNAIE_NOTES,
	type MonnaieSet
} from '../types/monnaie';
import { buildMonnaieScene, type MonnaieScene } from './monnaie-scene';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Plafonds du plan (ceux d'un ensemble du bloc) : au-delà, le bouton « Ajouter » se grise */
export const BUILD_LIMITS = MONNAIE_LIMITS;

/** Coupures permises sans `réserve:` */
export const DEFAULT_RESERVE: readonly number[] = MONNAIE_DEFAULT_RESERVE;

/** Plan vide */
export const EMPTY_BUILD: MonnaieSet = { notes: [], coins: [] };

// ============================================================================
// FONCTIONS
// ============================================================================

const isNote = (value: number) => (MONNAIE_NOTES as readonly number[]).includes(value);

const descending = (values: number[]) => [...values].sort((a, b) => b - a);

/** Somme posée, en euros */
export function buildValue(build: MonnaieSet): number {
	return [...build.notes, ...build.coins].reduce((sum, value) => sum + value, 0);
}

/** Réponse de la case : la somme en chiffres, '' si le plan est vide */
export function buildAnswer(build: MonnaieSet): string {
	const value = buildValue(build);
	return value === 0 ? '' : String(value);
}

/** Une coupure de plus tient-elle dans les plafonds (100 €, 30 objets) ? */
export function canAdd(build: MonnaieSet, value: number): boolean {
	return (
		buildValue(build) + value <= BUILD_LIMITS.total &&
		build.notes.length + build.coins.length < BUILD_LIMITS.objects
	);
}

/** Une coupure de plus, rangée à sa place ; jamais au-delà des plafonds */
export function addToBuild(build: MonnaieSet, value: number): MonnaieSet {
	if (!canAdd(build, value)) return build;
	return isNote(value)
		? { ...build, notes: descending([...build.notes, value]) }
		: { ...build, coins: descending([...build.coins, value]) };
}

/** Une coupure de cette valeur en moins (aucune posée : inchangé) */
export function removeFromBuild(build: MonnaieSet, value: number): MonnaieSet {
	const key = isNote(value) ? 'notes' : 'coins';
	const index = build[key].indexOf(value);
	if (index === -1) return build;
	return { ...build, [key]: build[key].filter((_, i) => i !== index) };
}

/**
 * Le moins d'objets pour faire `value` avec les coupures de la réserve, chacune
 * autant de fois qu'on veut ; Infinity si c'est impossible. Programmation
 * dynamique, pas l'algorithme glouton : avec 2 et 5 €, 6 € = 3 × 2 €.
 */
function fewestCoupures(value: number, reserve: readonly number[]): number[] {
	// last[s] : la dernière coupure prise pour faire s au mieux (0 : impossible)
	const fewest: number[] = [0];
	const last: number[] = [0];
	for (let s = 1; s <= value; s++) {
		fewest[s] = Infinity;
		last[s] = 0;
		for (const coupure of reserve) {
			if (coupure <= s && fewest[s - coupure] + 1 < fewest[s]) {
				fewest[s] = fewest[s - coupure] + 1;
				last[s] = coupure;
			}
		}
	}
	if (fewest[value] === Infinity) return [];
	const values: number[] = [];
	for (let s = value; s > 0; s -= last[s]) values.push(last[s]);
	return values;
}

/** Le moins d'objets pour faire `value` avec la réserve ; Infinity si c'est impossible */
export function fewestObjects(value: number, reserve: readonly number[]): number {
	if (value === 0) return 0;
	const values = fewestCoupures(value, reserve);
	return values.length === 0 ? Infinity : values.length;
}

/**
 * Construction juste, le moins d'objets AVEC la réserve (Q8) ; null si la somme
 * ne se fait pas avec ses coupures en 30 objets au plus.
 */
export function solutionBuild(value: number, reserve: readonly number[]): MonnaieSet | null {
	const values = fewestCoupures(value, reserve);
	if (values.length > BUILD_LIMITS.objects || (value > 0 && values.length === 0)) return null;
	return {
		notes: descending(values.filter(isNote)),
		coins: descending(values.filter((v) => !isNote(v)))
	};
}

/**
 * Construction redessinée depuis une réponse seule (composant remonté) : le
 * moins d'objets avec la réserve ; réponse vide, illisible ou infaisable → plan vide
 */
export function buildFromAnswer(answer: string, reserve: readonly number[]): MonnaieSet {
	const text = answer.trim();
	if (!/^\d+$/.test(text) || Number(text) > BUILD_LIMITS.total) return EMPTY_BUILD;
	return solutionBuild(Number(text), reserve) ?? EMPTY_BUILD;
}

/** La scène du plan : les coupures posées, rangées */
export function buildScene(build: MonnaieSet): MonnaieScene {
	return buildMonnaieScene({ sets: [build], captions: null, layout: 'rangé', sizeCm: null }, 0);
}

/** La réserve dessinée : une coupure de chaque */
export function reserveScene(reserve: readonly number[]): MonnaieScene {
	return buildScene({
		notes: descending(reserve.filter(isNote)),
		coins: descending(reserve.filter((v) => !isNote(v)))
	});
}
