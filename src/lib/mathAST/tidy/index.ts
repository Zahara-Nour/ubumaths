/**
 * `tidy()` — la mise au propre sans développement.
 *
 * Contrat : `docs/wip/tidy-phase0.md`, §A. AST en entrée, AST en sortie.
 *
 * - **valeur conservée** : `areEquivalent(tidy(x), x)` ;
 * - **idempotent** : `tidy(tidy(x))` est structurellement égal à `tidy(x)` ;
 * - **jamais de développement ni de factorisation** : `(x+1)²` reste `(x+1)²`,
 *   `x(x+1)` reste `x(x+1)`, `x²+x` reste `x²+x` ;
 * - **ne lève jamais d'exception** : ce qu'il ne sait pas traiter ressort tel
 *   quel.
 *
 * @module mathAST/tidy
 */

import type { MathNode } from '../types';
import { stripUnnecessaryBrackets } from '../transforms';
import { tidyNode } from './collect';
import type { TidyOptions } from './step-recorder';

/**
 * Met une expression au propre.
 *
 * Étape 2 du contrat — les parenthèses que la priorité rend inutiles — passe
 * par `stripUnnecessaryBrackets` en pré-traitement ; celles qui restent
 * nécessaires sont **réécrites** par la construction (`build.ts`), pas
 * conservées.
 *
 * @param node - L'expression à mettre au propre
 * @param options - `recorder` pour écouter les étapes ; absent, rien n'est construit en trop
 * @returns Une nouvelle expression, l'entrée inchangée en cas d'imprévu
 */
export function tidy(node: MathNode, options?: TidyOptions): MathNode {
	try {
		return tidyNode(stripUnnecessaryBrackets(node), options);
	} catch (error) {
		// Seul un débordement de pile (expression pathologiquement profonde) est
		// rattrapé : toute autre exception est un bug de `tidy` et doit remonter.
		if (error instanceof RangeError) return node;
		throw error;
	}
}
