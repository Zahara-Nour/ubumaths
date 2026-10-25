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
