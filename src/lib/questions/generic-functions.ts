/**
 * Fonctions génériques déclarées par un modèle de question
 * ========================================================
 *
 * `shared.genericFunctions: ["P", "C"]` : dans tout le modèle (énoncé, réponses,
 * correction, réponse de l'élève), `P(x)` est une FONCTION et `P'(2)` sa dérivée
 * en 2, au lieu d'un produit `P × (x)` et d'une écriture illisible.
 *
 * La liste COMPLÈTE celle du parseur (f, g, h, u, v, w, F, G, H) — différence voulue
 * avec les exercices (`generic_functions`), dont la liste remplace les défauts : un
 * modèle qui déclare `P` garde `f`. Dérivées et réciproque sont permises.
 *
 * Source unique : génération, validation, affichage et PDF passent par
 * `templateGenericFunctions`, qui rend `undefined` sans déclaration — les appels
 * gardent alors exactement les défauts du parseur (aucun changement de comportement).
 */

import { z } from 'zod';
// Types du parseur seuls (aucune logique) : le schéma reste léger pour l'éditeur
import {
	DEFAULT_GENERIC_FUNCTION_NAMES,
	type GenericFunctionConfig
} from '$lib/mathAST/parser/types';

// Constantes

/** Au plus 10 fonctions déclarées : une question n'en nomme jamais autant */
export const MAX_TEMPLATE_GENERIC_FUNCTIONS = 10;

/**
 * Une lettre ASCII seule : le parseur ne reconnaît une fonction générique que sur
 * une lettre (pas d'indice `C_1`, pas de nom `PQ`).
 */
const FUNCTION_NAME_REGEX = /^[A-Za-z]$/;

/** `e` (Euler) et `i` (imaginaire) sont des constantes : jamais des fonctions */
const RESERVED_LETTERS: ReadonlySet<string> = new Set(['e', 'i']);

// Schémas

/** Nom d'une fonction déclarée : une lettre, hors constantes */
export const genericFunctionNameSchema = z
	.string()
	.regex(FUNCTION_NAME_REGEX, 'Une fonction se nomme par une seule lettre (ex. P, C)')
	.refine((name) => !RESERVED_LETTERS.has(name), {
		message: '« e » et « i » sont des constantes, pas des fonctions'
	});

/** Liste déclarée par `shared.genericFunctions` : sans doublon, au plus 10 noms */
export const genericFunctionNamesSchema = z
	.array(genericFunctionNameSchema)
	.max(MAX_TEMPLATE_GENERIC_FUNCTIONS, `Au plus ${MAX_TEMPLATE_GENERIC_FUNCTIONS} fonctions`)
	.refine((names) => new Set(names).size === names.length, {
		message: 'Une fonction est déclarée deux fois'
	});

// Fonctions

/** Nom recevable (même règle que le schéma), pour filtrer une valeur lue en base */
function isValidName(name: unknown): name is string {
	return typeof name === 'string' && genericFunctionNameSchema.safeParse(name).success;
}

/**
 * Noms déclarés et recevables, sans doublon ; `undefined` s'il n'en reste aucun.
 * Défensif : `shared` est un jsonb, une valeur écrite hors de l'éditeur est filtrée.
 */
export function declaredGenericFunctions(names: unknown): string[] | undefined {
	if (!Array.isArray(names)) return undefined;
	const valid = [...new Set(names.filter(isValidName))].slice(0, MAX_TEMPLATE_GENERIC_FUNCTIONS);
	return valid.length > 0 ? valid : undefined;
}

/**
 * Configuration du parseur pour un modèle : défauts ∪ noms déclarés, dérivées et
 * réciproque permises. `undefined` sans déclaration : défauts du parseur, inchangés.
 */
export function templateGenericFunctions(
	names: readonly string[] | null | undefined
): GenericFunctionConfig | undefined {
	const declared = declaredGenericFunctions(names);
	if (!declared) return undefined;
	const extra = declared.filter((name) => !DEFAULT_GENERIC_FUNCTION_NAMES.includes(name));
	return {
		names: [...DEFAULT_GENERIC_FUNCTION_NAMES, ...extra],
		allowDerivatives: true,
		allowInverse: true
	};
}

/**
 * Champ « Fonctions » de l'éditeur (`P, C`) → liste. Séparateurs : virgule,
 * point-virgule, espaces. Aucun filtrage : un nom invalide reste, pour que le
 * schéma le refuse avec son message plutôt que de disparaître en silence.
 */
export function parseGenericFunctionNames(text: string): string[] {
	return text
		.split(/[\s,;]+/)
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

/** Liste déclarée → texte du champ « Fonctions » (`P, C`) */
export function formatGenericFunctionNames(names: readonly string[] | null | undefined): string {
	return (names ?? []).join(', ');
}
