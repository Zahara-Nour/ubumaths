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
 * ⚠️ Le renommage se fait sur l'ARBRE, dans les deux sens (revue de #905) : sur
 * le texte, `at` ou `2tcos(t)` sont des mots que l'expression régulière ne
 * découpe pas comme le parseur, et `t_1` (un autre objet) se confondait avec t.
 *
 * @module atelier/letter
 */

import type { AtelierObject } from './types';
import type { MathNode } from '$lib/mathAST/types';
import { astOf, readingMode, renameInDefinition, withPlainEuler, type Provenance } from './parse';
import { RESERVED_NAMES, derivativeOf } from './names';
import { transformAST, visitAST } from '$lib/mathAST/visitor';
import { nodesEqual } from '$lib/mathAST/normal/hash';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';

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

/**
 * L'arbre où la VARIABLE `from` devient `to`.
 *
 * ⚠️ Un nom indicé (`t_1`, `x_1`) est un autre objet : il n'est pas touché.
 * `substitute` de mathAST, lui, remplace aussi la base d'un indice.
 */
export function renameVariableIn(ast: MathNode, from: string, to: string): MathNode {
	return transformAST(ast, {
		enterSubscript: () => 'skip',
		enterVariable: (node) => (node.name === from ? { ...node, name: to } : undefined)
	});
}

/** La variable `name` est-elle libre dans l'arbre (hors noms indicés) ? */
function hasVariable(ast: MathNode, name: string): boolean {
	let found = false;
	visitAST(ast, {
		enterSubscript: () => 'skip',
		enterVariable: (node) => {
			if (node.name === name) found = true;
		}
	});
	return found;
}

/**
 * Une définition où la variable `from` devient `to`, écrite dans la syntaxe de
 * sa provenance. L'arbre décide ; le texte de l'élève est GARDÉ quand le
 * remplacement mot à mot donne le même arbre (`3t + 1` → `3x + 1`), sinon le
 * texte est régénéré (`2tcos(t)` → `2xcos(x)`).
 *
 * Une définition illisible est rendue telle quelle : elle porte déjà son
 * erreur, et l'élève doit retrouver ce qu'il a tapé.
 */
export function renameVariable(
	definition: string,
	from: string,
	to: string,
	provenance: Provenance,
	functionNames: readonly string[]
): string {
	if (from === to) return definition;
	const ast = astOf(definition, provenance, functionNames);
	if (ast === null) return definition;
	const target = renameVariableIn(ast, from, to);
	if (nodesEqual(ast, target)) return definition;

	const wordForWord = renameInDefinition(definition, from, to);
	const reread = astOf(wordForWord, provenance, functionNames);
	if (reread !== null && nodesEqual(reread, target)) return wordForWord;

	return readingMode(provenance) === 'latex' ? toLatex(target) : toCustom(withPlainEuler(target));
}

/** La définition telle que l'élève la lit : rangée en x, rendue dans sa lettre. */
export function studentDefinitionOf(
	atelier: LetterSource & { readonly functionNames: readonly string[] },
	object: AtelierObject
): string {
	const letter = typedLetterOf(atelier, object);
	return letter === INTERNAL_LETTER || object.kind !== 'function'
		? object.definition
		: renameVariable(
				object.definition,
				INTERNAL_LETTER,
				letter,
				object.provenance ?? 'url',
				atelier.functionNames
			);
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
	// Une lettre seule : `f(tt)`, `f(t_1)` ou une lettre vide relue d'un lien
	if (!/^[A-Za-z]$/.test(letter)) {
		return `La variable de ${functionName} doit être une seule lettre : écris par exemple ${functionName}(t) = …`;
	}
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
 * Refusée quand x figure déjà dans la définition (`f(t) = t + x`) : il
 * deviendrait la variable elle-même, en silence. Un nom indicé (`x_1`) est un
 * autre objet, il ne gêne pas.
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
	if (read !== null && hasVariable(read, INTERNAL_LETTER)) {
		return {
			ok: false,
			message: `${functionName}(${letter}) est une fonction de ${letter} : x n'y a pas de sens. Écris tout en ${letter}, ou définis ${functionName}(x) = …`
		};
	}
	return {
		ok: true,
		definition: renameVariable(typed, letter, INTERNAL_LETTER, provenance, functionNames)
	};
}
