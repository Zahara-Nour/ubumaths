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

/** Une lettre latine, éventuellement suivie d'un indice numérique. */
const NAME_SHAPE = /^[A-Za-z](?:_\d+)?$/;

/** Borne de la recherche d'un nom indicé — garde-fou, jamais atteinte. */
const MAX_INDEX = 999;

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
	// Les réservés d'abord : `pi` est réservé ET mal formé, et c'est « réservé »
	// qui explique le refus à l'élève.
	if (RESERVED_NAMES.has(name)) return 'reserved';
	if (!NAME_SHAPE.test(name)) return 'malformed';
	if (taken.includes(name)) return 'taken';
	return null;
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
	const used = new Set(taken);
	const free = (name: string) => !used.has(name) && !RESERVED_NAMES.has(name);

	const preferred = PREFERRED_NAMES[kind];
	for (const name of preferred) {
		if (free(name)) return name;
	}

	// Lettres épuisées : on indice la première, plutôt que de rendre un nom pris.
	const base = preferred[0];
	for (let i = 1; i <= MAX_INDEX; i++) {
		const name = `${base}_${i}`;
		if (free(name)) return name;
	}

	// Inatteignable en pratique : MAX_INDEX dépasse de loin le plafond d'objets.
	throw new Error(`Aucun nom libre pour un objet de type « ${kind} »`);
}

/**
 * Le message français correspondant à un refus de nom.
 *
 * @param rejection - La raison rendue par `validateName`
 * @param name - Le nom refusé, cité dans le message
 */
export function nameRejectionMessage(rejection: NameRejection, name: string): string {
	switch (rejection) {
		case 'reserved':
			return `« ${name} » est réservé : c'est le nom d'une variable ou d'une constante. Choisis une autre lettre.`;
		case 'taken':
			return `« ${name} » est déjà utilisé par un autre objet de l'atelier.`;
		case 'malformed':
			return `« ${name} » n'est pas un nom valide : une lettre, éventuellement suivie d'un indice (a, f, L, u_1).`;
	}
}
