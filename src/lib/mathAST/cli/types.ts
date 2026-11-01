/**
 * CLI Types for MathAST
 *
 * Type definitions for the command-line interface infrastructure.
 * All types use readonly modifiers for immutability.
 */

import type { MathNode } from '../types';
import type { EvalState } from './core/eval-state';

// =============================================================================
// Input/Output Formats
// =============================================================================

/**
 * Supported input formats for mathematical expressions
 */
export type InputFormat = 'latex' | 'custom' | 'unknown';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error codes for CLI operations
 */
export type ErrorCode =
	| 'PARSE_ERROR'
	| 'NO_AST'
	| 'UNKNOWN_COMMAND'
	| 'UNKNOWN_ERROR'
	| 'INVALID_OPTIONS'
	| 'UNSUPPORTED_FORMAT'
	| 'UNKNOWN_UNIT'
	| 'DIMENSION_MISMATCH'
	| 'MATH_ERROR'
	/** Grandeurs qui ne se combinent pas, conversion impossible : message en français, destiné à l'élève */
	| 'QUANTITY_ERROR'
	/** Ce qui suit le « ; » n'est pas une variable : message en français, destiné à l'élève */
	| 'AMBIGUOUS_VARIABLE'
	/** Mots-clés d'une commande mal écrits (`de … à`, `en x=3`, `ordre`…) : message en français, destiné à l'élève */
	| 'COMMAND_SYNTAX'
	/** Fonction usuelle sans parenthèses (`sin x`) : message en français, destiné à l'élève */
	| 'BARE_FUNCTION'
	/** `.taylor` : ordre au-delà de la limite — message en français, destiné à l'élève */
	| 'TAYLOR_ORDER'
	/** Dérivée refusée (`floor`, `abs`…) : message en français, destiné à l'élève */
	| 'NOT_DIFFERENTIABLE'
	/** Intégrale définie refusée (pôle dans [a ; b]) : message en français, destiné à l'élève */
	| 'INTEGRAL_UNDEFINED'
	/** Domaine : contrainte non résolue (refus plutôt qu'un domaine faux) — message en français, destiné à l'élève */
	| 'DOMAIN_UNRESOLVED'
	/** Inéquation lue mais pas résolue (signe inconnu) : message en français, destiné à l'élève */
	| 'INEQUALITY_UNSOLVED'
	/** Équation lue mais pas résolue (aucun solveur, ou un paramètre) : message en français, destiné à l'élève */
	| 'EQUATION_UNSOLVED'
	/** `.eval` : valeur interdite (dénominateur nul, racine d'un négatif…) — message en français, destiné à l'élève */
	| 'VALUE_FORBIDDEN';

/**
 * Structured error for command execution
 */
export interface CommandError {
	readonly code: ErrorCode;
	readonly message: string;
	readonly details?: unknown;
}

/**
 * Structured error from the parsing pipeline
 */
export interface PipelineError {
	readonly code: ErrorCode;
	readonly message: string;
	readonly position?: number;
	readonly suggestion?: string;
}

// =============================================================================
// Command System
// =============================================================================

/**
 * Context provided to command execution
 */
export interface CommandContext {
	readonly ast?: MathNode;
	readonly input: string;
	readonly format: InputFormat;
	readonly options: Record<string, unknown>;
	readonly isRepl: boolean;
	/** Evaluation state for variable bindings and mode (REPL only) */
	readonly evalState?: EvalState;
}

/**
 * Result of command execution
 */
export interface CommandResult {
	readonly output: string;
	readonly success: boolean;
	readonly error?: CommandError;
	readonly ast?: MathNode;
	/**
	 * La réponse en LaTeX, quand la commande sait l'écrire depuis ses données
	 * structurées (`.solve` : toutes les solutions, que `ast` ne porte pas —
	 * il n'en garde que la première).
	 */
	readonly latex?: string;
	/**
	 * La **réponse brute** de la commande, en LaTeX, seule (ni rappel de la
	 * question, ni étapes, ni valeur approchée) : `(x+1)\exponentialE^x`,
	 * `S = \left\{ -2 \,;\, 2 \right\}`, `D = \mathbb{R}`. C'est ce que
	 * l'Atelier, `pnpm math` et la calculatrice montrent tous (chantier
	 * `registre-reference`, D1) ; le corpus `tests/fixtures/mathast/registre-corpus.ts`
	 * en est le contrat. Absente : la commande n'a pas encore de réponse déclarée.
	 * ⚠️ Défini et jugé en mode exact seulement (corpus, lot 1) : le mode décimal
	 * (`.decimal`), l'égalité tapée seule (`2=2`, pas de champ) et l'expression
	 * non évaluée (`x+1` recopiée) seront tranchés avec le lot 2 du corpus.
	 */
	readonly answer?: string;
	// Toggle support for exact/decimal display (like eval results)
	/** Exact representation (e.g., "x = -1", "x = sqrt(2)") */
	readonly exactOutput?: string;
	/** Decimal representation (e.g., "x ≈ -1.00000", "x ≈ 1.41421") */
	readonly decimalOutput?: string;
	/** Whether user can toggle between exact and decimal display */
	readonly canToggle?: boolean;

	/** Initial display mode (true = show decimal first, false = show exact first) */
	readonly showDecimalInitially?: boolean;

	/**
	 * Les solutions en valeurs approchées (`.solve` : `S \approx \{…\}`), pour
	 * le bouton ≈ de l'atelier (`solutionsApproximationLatex`).
	 */
	readonly approximateLatex?: string;
}

// =============================================================================
// Detection and Pipeline
// =============================================================================

/**
 * Result of input format detection
 */
export interface DetectionResult {
	readonly format: InputFormat;
	readonly confidence: number;
}

/**
 * Result of the parsing pipeline
 */
export interface PipelineResult {
	readonly ast?: MathNode;
	readonly errors: readonly PipelineError[];
	readonly inputFormat: InputFormat;
}
