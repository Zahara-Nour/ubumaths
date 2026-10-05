/**
 * Notation factorielle `n!` et coefficient binomial `\binom{n}{k}` (2026-10-05)
 *
 * Partagé par les quatre parseurs (LaTeX et maison, Pratt et RD) : la notation
 * produit le MÊME nœud que l'appel `factorial(n)` / `binom(n, k)` (#821), donc
 * l'évaluation, l'équivalence et l'affichage ne connaissent qu'un seul concept.
 *
 * Priorité : `!` s'applique à ce qui le précède immédiatement sur la ligne, comme
 * à l'écran — `2^3!` = (2³)!, `2^{3!}` = 2^(3!), `n!^2` = (n!)², `-3!` = −(3!).
 * `3!!` (double factorielle) est refusé : jamais lu en silence comme (3!)!.
 *
 * @module mathAST/parser/factorial-notation
 */

import { MathAST } from '../factory';
import { isDelimiter } from '../guards';
import type { FunctionNode, MathNode } from '../types';

/** Message d'erreur de `3!!` */
export const DOUBLE_FACTORIAL_ERROR =
	'Double factorielle non prise en charge : écrire (n!)! pour la factorielle d’une factorielle';

/** Commandes LaTeX du coefficient binomial */
export const BINOM_COMMANDS: ReadonlySet<string> = new Set(['binom', 'dbinom', 'tbinom']);

/**
 * `operand!` → `factorial(operand)`. Les parenthèses de groupement de l'opérande
 * (`(n+1)!`) ne sont qu'une écriture : l'argument est le contenu, comme dans
 * `factorial(n+1)`.
 */
export function factorialOf(operand: MathNode): FunctionNode {
	const argument =
		isDelimiter(operand) && (operand.semantic === undefined || operand.semantic === 'grouping')
			? operand.content
			: operand;
	return MathAST.func('factorial', [argument]);
}

/** `\binom{n}{k}` → `binom(n, k)` */
export function binomOf(top: MathNode, bottom: MathNode): FunctionNode {
	return MathAST.func('binom', [top, bottom]);
}
