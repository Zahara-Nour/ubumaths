/**
 * Web REPL Types
 *
 * Type definitions specific to the browser-based REPL interface.
 */

import type { MathNode } from '../../types';

// =============================================================================
// Execution Results
// =============================================================================

/**
 * Result of executing a REPL input (command or expression).
 *
 * Contains the plain text output, with the AST and LaTeX for display.
 */
export interface ReplExecutionResult {
	/** Whether execution succeeded */
	readonly success: boolean;

	/** Plain text output (always present) */
	readonly output: string;

	/** LaTeX representation for MathLive rendering */
	readonly latex?: string;

	/** Parsed AST for tree viewer */
	readonly ast?: MathNode;

	/**
	 * La **réponse brute** de la ligne, en LaTeX, seule (ni rappel de la
	 * question, ni étapes, ni valeur approchée) : `(x+1)\exponentialE^x`,
	 * `S = \left\{ -2 \,;\, 2 \right\}`, `D = \mathbb{R}`. C'est ce que
	 * l'Atelier, `pnpm math` et la calculatrice montrent tous (chantier
	 * `registre-reference`, D1) ; le corpus `tests/fixtures/mathast/registre-corpus.ts`
	 * en est le contrat. Absente : la commande n'a pas encore de réponse déclarée.
	 * Exacte dans les deux modes : le mode décimal (`.decimal`) est un choix
	 * d'affichage de l'outil, qui lit `decimal` (décision B du lot 2).
	 * ⚠️ L'égalité tapée seule (`2=2`, pas de champ) et l'expression non évaluée
	 * (`x+1` recopiée) seront tranchées par les PR suivantes du lot 2.
	 */
	readonly answer?: string;

	/**
	 * L'**écriture décimale** de la réponse d'un calcul, rendue À CÔTÉ de
	 * `answer` (décisions A et B du lot 2) : au point, en LaTeX comme `answer`
	 * (unité `\unit{…}`), sans `=` ni `≈` devant (le moins d'un négatif, lui,
	 * reste), arrondie selon Q3 (4 décimales ; `8.7700 \times 10^{9}` hors de
	 * [10⁻⁶ ; 10⁹[ ; un entier jusqu'à 15 chiffres) — `0.25`, `-3`,
	 * `0.3333~\unit{km}`. Présente dans les DEUX modes, même pour un nombre
	 * déjà écrit (`3` → `3`) et pour une écriture gardée (sans `answer`).
	 * Absente sans valeur décimale (lettres, comparaison, valeur non réelle,
	 * durée en h-min-s). L'outil pose `=` / `≈`, la virgule, le `×`.
	 */
	readonly decimal?: string;

	/** `true` : `decimal` est la valeur exacte (`=`) ; `false` : un arrondi (`≈`). Avec `decimal`. */
	readonly decimalExact?: boolean;

	/** Error details if execution failed */
	readonly error?: {
		readonly code: string;
		readonly message: string;
		readonly position?: number;
	};

	/**
	 * Le résultat exact aurait ce nombre de caractères (environ) : trop long, il garde
	 * l'écriture tapée (option A de David, 2026-10-12, seuil 1 000) — `ast` est alors
	 * l'écriture, à ne pas développer (`tidy` la recalculerait).
	 */
	readonly exactTooLong?: number;

	/**
	 * La valeur approchée d'un résultat exact (`\approx 0.7071`, `= 0.25`),
	 * pour le bouton ≈ de l'atelier — mode exact seulement
	 * (`approximation.ts`).
	 */
	readonly approximateLatex?: string;

	/** La valeur exacte d'un calcul fait en mode décimal, en LaTeX. */
	readonly exactLatex?: string;

	/**
	 * La grandeur EXACTE d'une réponse, quand l'arbre affiché en est une autre
	 * écriture (`2 h 30 min` juxtaposées) : c'est elle que « Garder » range.
	 */
	readonly quantityAst?: MathNode;
}

// =============================================================================
// Function State Exposure
// =============================================================================

/**
 * Information about a user-defined function for web display.
 *
 * Exposes function state from EvalState for UI components like
 * function palettes and autocomplete.
 */
export interface WebFunctionInfo {
	/** Function name (e.g., 'f', 'g') */
	readonly name: string;

	/** Parameter names in order (e.g., ['x'] or ['x', 'y']) */
	readonly parameters: readonly string[];

	/** Function body as custom syntax string (e.g., 'x^2 + 1') */
	readonly expression: string;

	/** Derivative expression as custom syntax string, if defined */
	readonly derivative?: string;

	/** Inverse expression as custom syntax string, if defined */
	readonly inverse?: string;
}
