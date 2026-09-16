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

import type { Provenance } from './parse';

// =============================================================================
// Types
// =============================================================================

/** Les quatre types du v1. La géométrie (v2) et Python (v3) en ajouteront. */
export type ObjectKind = 'value' | 'function' | 'sequence' | 'list';

/**
 * L'état d'un objet. Décision D9.
 *
 * Priorité : `error` > `pending` > `incomplete` > `ok`. Une définition qu'on ne
 * sait pas lire ne peut rien promettre, donc l'erreur prime sur l'attente.
 */
export type ObjectStatus = 'ok' | 'incomplete' | 'pending' | 'error';

/**
 * Un nom cité par une définition et que l'atelier ne connaît pas.
 *
 * `as` vient de la grammaire, pas d'une devinette : un identifiant suivi d'une
 * parenthèse est une fonction, une lettre seule est une valeur — et seule la
 * seconde peut recevoir une offre de curseur (§2.5 N3 et L4).
 */
export interface MissingReference {
	readonly name: string;
	readonly as: 'value' | 'function';
}

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
	/** Où en est cet objet. Voir `ObjectStatus`. */
	readonly status: ObjectStatus;
	/**
	 * Message en français, présent pour `error` et `pending`.
	 *
	 * L'objet existe et porte son état : l'atelier reste utilisable (§2.1 E2).
	 */
	readonly message?: string;
	/**
	 * L'objet est-il affiché dans la vue Graphe ?
	 *
	 * C'est un état d'AFFICHAGE, pas une propriété mathématique : il vit sur
	 * l'objet parce que l'atelier détient l'état (décision figée n° 1), et la
	 * vue n'en est qu'une projection.
	 */
	readonly plotted?: boolean;
	/**
	 * Ce qui manque, pour `pending` seulement.
	 *
	 * Se vide tout seul dès que les objets nommés apparaissent : une attente se
	 * répare sans que l'élève ait à y revenir (§2.5 N2).
	 */
	readonly missing?: readonly MissingReference[];
	/**
	 * D'où vient la définition — décision D10 : c'est la provenance qui choisit
	 * le parseur, jamais le contenu.
	 *
	 * ⚠️ Elle vit SUR l'objet parce que `recomputeAll` repart toujours de
	 * `parseDefinition` : sans mémoire, une définition LaTeX serait relue en
	 * texte au premier recalcul, donc dès qu'un autre objet change.
	 */
	readonly provenance?: Provenance;
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
	/**
	 * Le nom de la liste qui sert d'ORDONNÉES quand celle-ci est tracée.
	 *
	 * ⚠️ État d'affichage, comme `plotted`, et il vit ici pour la même raison :
	 * c'est l'atelier qui détient l'état. Sans lui, la synchronisation
	 * recalculerait « la suivante du panneau » et ignorerait le choix que
	 * l'élève vient de faire en cliquant « Nuage avec N ».
	 */
	readonly plottedWith?: string;
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
