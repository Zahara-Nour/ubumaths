/**
 * Atelier — nommage des objets
 *
 * Un nom est unique dans TOUT l'atelier, tous types confondus (décision D1) :
 * sinon `f` valeur et `f` fonction coexistent, et `f(2)` devient ambigu.
 *
 * Spécification : `docs/wip/atelier-recherche-eleve-phase0.md` §1 et §2.2.
 *
 * @module atelier/names
 */

import type { ObjectKind } from './types';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Noms refusés à tout objet.
 *
 * `x` et `n` sont les variables des fonctions et des suites ; `e`, `pi` et `i`
 * sont des constantes. Repris de `RESERVED_PARAMETER_NAMES` du grapheur, qui
 * porte déjà exactement cet ensemble.
 */
export const RESERVED_NAMES: ReadonlySet<string> = new Set(['x', 'n', 'e', 'pi', 'i']);

/** Lettres proposées d'abord, par type, dans l'ordre des usages scolaires. */
export const PREFERRED_NAMES: Readonly<Record<ObjectKind, readonly string[]>> = {
	value: ['a', 'b', 'c', 'k', 'm', 'p', 'q', 'r'],
	function: ['f', 'g', 'h'],
	sequence: ['u', 'v', 'w'],
	list: ['L', 'M', 'N']
};

// =============================================================================
// Types
// =============================================================================

/** Pourquoi un nom est refusé. L'appelant en tire le message français. */
export type NameRejection = 'reserved' | 'malformed' | 'taken';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Vérifier qu'un nom est acceptable dans un atelier donné.
 *
 * @param name - Le nom proposé
 * @param taken - Les noms déjà utilisés, TOUS types confondus (décision D1)
 * @returns La raison du refus, ou `null` si le nom est acceptable
 */
export function validateName(name: string, taken: readonly string[]): NameRejection | null {
	void name;
	void taken;
	throw new Error('validateName : non implémenté');
}

/**
 * Proposer le premier nom libre pour un nouvel objet de ce type.
 *
 * ⚠️ Ne rend JAMAIS un nom déjà pris. Quand les lettres préférées sont toutes
 * prises, passe aux indices (`a_1`, `a_2`, …) — le grapheur, lui, retombe
 * aujourd'hui sur la première lettre (`nextParameterName`), ce qui écraserait
 * un objet nommé.
 *
 * @param kind - Le type de l'objet à créer
 * @param taken - Les noms déjà utilisés, tous types confondus
 */
export function nextName(kind: ObjectKind, taken: readonly string[]): string {
	void kind;
	void taken;
	throw new Error('nextName : non implémenté');
}

/**
 * Le message français correspondant à un refus de nom.
 *
 * @param rejection - La raison rendue par `validateName`
 * @param name - Le nom refusé, cité dans le message
 */
export function nameRejectionMessage(rejection: NameRejection, name: string): string {
	void rejection;
	void name;
	throw new Error('nameRejectionMessage : non implémenté');
}
