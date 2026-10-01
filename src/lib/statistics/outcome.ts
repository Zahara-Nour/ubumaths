/**
 * Statistiques — ce que rend un calcul, et comment il parle de ses nombres
 *
 * @module statistics/outcome
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Résultat d'un calcul statistique : une valeur, ou pourquoi non.
 *
 * Une entrée invalide n'est jamais une exception : l'auteur d'un bloc ou
 * l'élève de l'atelier doit lire un message en français, situé.
 */
export type Outcome<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Fonctions
// =============================================================================

export function success<T>(value: T): Outcome<T> {
	return { ok: true, value };
}

export function failure<T>(message: string): Outcome<T> {
	return { ok: false, message };
}

/** Un nombre dans un message : virgule décimale, comme l'écrit un élève. */
export function formatForMessage(value: number): string {
	return String(value).replace('.', ',');
}
