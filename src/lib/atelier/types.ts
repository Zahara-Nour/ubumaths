/**
 * Atelier — modèle d'objet
 *
 * Un objet de l'atelier = un nom + une définition + un état d'affichage.
 * C'est l'unité que les trois vues (Calcul, Graphe, Données) se partagent.
 *
 * Spécification : `docs/wip/atelier-recherche-eleve-phase0.md` §1.
 *
 * @module atelier/types
 */

// =============================================================================
// Types
// =============================================================================

/** Les quatre types du v1. La géométrie (v2) et Python (v3) en ajouteront. */
export type ObjectKind = 'value' | 'function' | 'sequence' | 'list';

/**
 * Bornes et pas d'un curseur.
 *
 * Décision D3 : toute valeur numérique libre est pilotable par un curseur,
 * bornes [-10 ; 10] par défaut, ajustables.
 */
export interface Slider {
	readonly min: number;
	readonly max: number;
	readonly step: number;
}

interface AtelierObjectBase {
	/** Une lettre latine, éventuellement suivie d'un indice numérique. Unique. */
	readonly name: string;
	readonly kind: ObjectKind;
	/**
	 * La définition telle que l'élève l'a saisie.
	 *
	 * Vide = objet « incomplet » : il existe, rien n'est tracé, et ce n'est
	 * PAS une erreur (§2.1 L2).
	 */
	readonly definition: string;
	/**
	 * Message en français quand la définition n'est pas exploitable.
	 *
	 * L'objet existe et porte son erreur : l'atelier reste utilisable (§2.1 E2).
	 */
	readonly error?: string;
}

export interface ValueObject extends AtelierObjectBase {
	readonly kind: 'value';
	/** Unité, quand la valeur est une grandeur. Décision D4 : pas de curseur. */
	readonly unit?: string;
	readonly slider?: Slider;
}

export interface FunctionObject extends AtelierObjectBase {
	readonly kind: 'function';
	/** Décision D2 : `x` seulement en v1 — `createEvaluator` la code en dur. */
	readonly variable: 'x';
}

export interface SequenceObject extends AtelierObjectBase {
	readonly kind: 'sequence';
	/** Décision D2 : `n` seulement en v1. */
	readonly variable: 'n';
}

export interface ListObject extends AtelierObjectBase {
	readonly kind: 'list';
	/** Les valeurs analysées. Les entrées non numériques sont écartées (§4 E1). */
	readonly values: readonly number[];
	/** Nombre d'entrées écartées, pour pouvoir le signaler (§4 E1). */
	readonly skipped: number;
}

export type AtelierObject = ValueObject | FunctionObject | SequenceObject | ListObject;

// =============================================================================
// Constantes
// =============================================================================

/**
 * Plafonds de la décision D8.
 *
 * Choisis pour qu'un atelier complet tienne sous les 2 000 caractères d'URL
 * qui passent partout — ce ne sont pas les navigateurs qui tronquent, ce sont
 * les messageries et les ENT.
 */
export const MAX_LIST_VALUES = 200;
export const MAX_LISTS = 8;

// =============================================================================
// Gardes de type
// =============================================================================

export function isValue(o: AtelierObject): o is ValueObject {
	return o.kind === 'value';
}

export function isFunction(o: AtelierObject): o is FunctionObject {
	return o.kind === 'function';
}

export function isSequence(o: AtelierObject): o is SequenceObject {
	return o.kind === 'sequence';
}

export function isList(o: AtelierObject): o is ListObject {
	return o.kind === 'list';
}
