/**
 * Atelier — la lettre d'une fonction : `f(t) = t^2`, `v(t) = 3t + 1`.
 *
 * Décision de David (2026-10-06) : la CARTE garde la lettre de l'élève, mais
 * l'atelier RANGE la fonction en x. La définition rangée (`definition`) est
 * donc toujours en x — graphique, commandes, composition `f(2x)`, dérivée et
 * variations la lisent sans rien savoir de `t`. La lettre (`letter`) ne sert
 * qu'à l'AFFICHAGE : carte, champ de saisie, préfixe `f(t) =`.
 *
 * ⚠️ Le renommage t → x n'est sûr que si la définition tapée ne contient PAS
 * déjà x : `f(t) = t + x` deviendrait `x + x` en silence. On la refuse.
 *
 * @module atelier/letter
 */

import type { AtelierObject } from './types';
import { astOf, renameInDefinition, type Provenance } from './parse';
import { RESERVED_NAMES, derivativeOf } from './names';
import { getVariables } from '$lib/mathAST/eval/substitute';

// =============================================================================
// Types
// =============================================================================

/** Ce dont la lecture de la lettre a besoin de l'atelier. */
interface LetterSource {
	get(name: string): AtelierObject | undefined;
}

export type InternalDefinition =
	| { readonly ok: true; readonly definition: string }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/** La variable dans laquelle l'atelier range toutes ses fonctions. */
export const INTERNAL_LETTER = 'x';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * La lettre que l'élève a choisie pour cette fonction (`x` par défaut).
 *
 * Une carte dérivée `f′` n'a pas de lettre à elle : elle suit celle de `f`, qui
 * peut changer si `f` est redéfinie.
 */
export function typedLetterOf(atelier: LetterSource, object: AtelierObject): string {
	const derivative = derivativeOf(object.name);
	const owner = derivative === null ? object : atelier.get(derivative.base);
	if (owner?.kind !== 'function') return object.kind === 'sequence' ? 'n' : INTERNAL_LETTER;
	return owner.letter ?? INTERNAL_LETTER;
}

/** La définition telle que l'élève la lit : rangée en x, rendue dans sa lettre. */
export function studentDefinitionOf(atelier: LetterSource, object: AtelierObject): string {
	const letter = typedLetterOf(atelier, object);
	return letter === INTERNAL_LETTER || object.kind !== 'function'
		? object.definition
		: renameInDefinition(object.definition, INTERNAL_LETTER, letter);
}

/**
 * Pourquoi cette lettre ne peut pas être la variable de `functionName`, ou `null`.
 *
 * @param others - Les noms des AUTRES objets de l'atelier
 */
export function letterRejection(
	letter: string,
	functionName: string,
	others: readonly string[]
): string | null {
	if (letter === INTERNAL_LETTER) return null;
	if (RESERVED_NAMES.has(letter)) {
		return `« ${letter} » est réservé (c'est une constante) : il ne peut pas être la variable de ${functionName}. Choisis une autre lettre, par exemple t.`;
	}
	if (letter === functionName) {
		return `La variable de ${functionName} ne peut pas porter son nom : écris par exemple ${functionName}(t) = …`;
	}
	if (others.includes(letter)) {
		return `« ${letter} » est déjà un objet de l'atelier : il ne peut pas être la variable de ${functionName}. Choisis une autre lettre, ou renomme « ${letter} ».`;
	}
	return null;
}

/**
 * La définition à RANGER (en x) pour ce que l'élève a tapé dans sa lettre.
 *
 * Refusée quand le renommage changerait le sens :
 * - x figure déjà dans la définition (`f(t) = t + x`) : il deviendrait la
 *   variable elle-même ;
 * - la lettre est collée à un mot (`tcos(t)` → `tcos`) et le renommage ne
 *   l'atteint pas : elle resterait libre, « en attente ».
 */
export function internalDefinition(
	typed: string,
	letter: string,
	functionName: string,
	provenance: Provenance,
	functionNames: readonly string[]
): InternalDefinition {
	if (letter === INTERNAL_LETTER || typed.trim() === '') return { ok: true, definition: typed };

	const read = astOf(typed, provenance, functionNames);
	if (read !== null && getVariables(read).has(INTERNAL_LETTER)) {
		return {
			ok: false,
			message: `${functionName}(${letter}) est une fonction de ${letter} : x n'y a pas de sens. Écris tout en ${letter}, ou définis ${functionName}(x) = …`
		};
	}

	const definition = renameInDefinition(typed, letter, INTERNAL_LETTER);
	const converted = astOf(definition, provenance, functionNames);
	if (converted !== null && getVariables(converted).has(letter)) {
		return {
			ok: false,
			message: `Je ne lis pas ${letter} partout dans cette définition : sépare-le par un signe de multiplication (${letter}*cos(${letter}) plutôt que ${letter}cos(${letter})).`
		};
	}
	return { ok: true, definition };
}
