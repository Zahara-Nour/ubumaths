/**
 * Atelier — rendre un résultat lisible
 *
 * §3 et §6 ter. Aujourd'hui ni `/calc` ni `/cas` ne rendent le résultat en
 * mathématiques : l'un affiche le texte brut en `font-mono` — le commentaire
 * « will be replaced by proper LaTeX rendering » est toujours dans le code —
 * l'autre du HTML échappé. Et le champ `latex` de `ReplExecutionResult`, qui
 * existe pourtant, n'est **jamais rempli** par aucun chemin.
 *
 * ⚠️ Règle qui tient tout ce module : **on ne reparse jamais la sortie texte.**
 * Mesuré le 2026-09-16 — `(x^2-1)/(x+1)` rend « (x^2-1):/(x+1)  (variables: x) »,
 * et reparser cette chaîne donne « v a r \imaginaryI a b l \exponentialE s » :
 * le mot « variables » lu comme un produit de lettres.
 *
 * @module atelier/render
 */

import type { ReplExecutionResult } from '$lib/mathAST/cli/web/types';
import { toLatex } from '$lib/mathAST/latex-generator';

// =============================================================================
// Types
// =============================================================================

/** Un résultat prêt à afficher. */
export interface RenderedResult {
	/** Le rendu mathématique, quand il y en a un de sûr. */
	readonly latex?: string;
	/** Ce qu'on affiche sinon — et ce qu'on copie toujours. */
	readonly text: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** La ligne « LaTeX: 2 x » que les commandes ajoutent : une sortie de terminal. */
const LATEX_LINE = /^\s*LaTeX\s*:/;

/** L'annotation « (variables: x) » collée après une expression littérale. */
const VARIABLES_NOTE = /\s*\(\s*variables\s*:[^)]*\)\s*/g;

/** Une commande LaTeX dans le texte — le moteur en mêle aux résultats en unités. */
const HAS_LATEX_COMMAND = /\\[a-zA-Z]+/;

// =============================================================================
// Fonctions
// =============================================================================

/** Le texte débarrassé de ce qui ne regarde pas l'élève. */
function cleanText(output: string): string {
	return output
		.split('\n')
		.filter((line) => !LATEX_LINE.test(line))
		.join('\n')
		.replace(VARIABLES_NOTE, ' ')
		.trim();
}

/**
 * Rendre un résultat du moteur.
 *
 * ⚠️ `fromCommand` n'est pas un détail : pour une **expression**, `result.ast`
 * porte le RÉSULTAT (`1/3 + 1/6` donne l'arbre de `1/2`, mesuré), tandis que
 * pour une **commande** il porte l'ENTRÉE. Rendre l'arbre d'une commande
 * afficherait donc `x^2` là où `.dériver x^2` répond `2x` — un résultat faux,
 * joliment composé.
 */
export function renderResult(
	result: ReplExecutionResult,
	options?: { readonly fromCommand?: boolean }
): RenderedResult {
	const text = cleanText(result.output);

	// Une erreur s'affiche en français, jamais en mathématiques.
	if (!result.success) return { text };

	// Le moteur mêle déjà du LaTeX au texte pour les grandeurs
	// (« \dfrac{123}{10} km »). C'est le seul endroit où l'unité survit :
	// l'arbre, lui, l'a perdue et ne rend que \dfrac{123}{10}.
	if (HAS_LATEX_COMMAND.test(text) && !text.includes('\n')) {
		return { latex: text, text };
	}

	if (options?.fromCommand === true) return { text };

	if (result.ast !== undefined) {
		return { latex: toLatex(result.ast), text };
	}

	return { text };
}
