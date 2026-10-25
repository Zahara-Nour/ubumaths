/**
 * Bloc ```operation — types
 * =========================
 *
 * Opération posée en colonnes (addition, soustraction au lot 1,
 * multiplication au lot 2, division en potence au lot 3 ; phase 0 :
 * `docs/archive/wip/operations-posees-progress.md`) :
 *
 * ```operation
 * calcul: 245 + 437
 * cases: résultat
 * retenues: oui
 * ```
 *
 * Le nœud porte les termes lus et les réglages ; le calcul (résultat,
 * retenues) et la grille sont faits par `utils/operation-scene.ts` (division :
 * `utils/operation-division-scene.ts`), partagés écran / PDF. L'auteur
 * n'écrit jamais le résultat.
 *
 * @module ubumark/types/operation
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Chiffres d'un terme : avant la virgule, après la virgule */
export const OPERATION_MAX_DIGITS = { integer: 10, decimal: 3 } as const;

/** Nombre de termes : 2 ou 3 pour une addition, 2 pour les autres opérations */
export const OPERATION_MAX_TERMS = { '+': 3, '-': 2, '×': 2, '÷': 2 } as const;

/**
 * Multiplication : chiffres de chaque facteur, virgule ôtée (CM1-051 :
 * 3 chiffres × 3 chiffres ; en haut, de quoi poser 46,55 ou 8,76 et au-delà)
 */
export const OPERATION_MAX_FACTOR_DIGITS = { top: 6, bottom: 3 } as const;

/**
 * Division (lot 3, § 12) : chiffres du dividende (zéros de tête non comptés,
 * décimales comprises), chiffres du diviseur entier (6-123 : diviseur < 100),
 * décimales du quotient décimal (Q4 : arrêt au plus tard au millième)
 */
export const OPERATION_MAX_DIVISION = { dividend: 6, divisor: 2, quotientDecimals: 3 } as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const OPERATION_UNAVAILABLE = 'Opération indisponible';

/** Nom accessible de la grille : il ne dit JAMAIS le résultat */
export const OPERATION_ARIA_LABEL = 'Opération posée en colonnes';
export const OPERATION_DIVISION_ARIA_LABEL = 'Division posée en potence';

export const OPERATION_CELLS = ['résultat', 'aucune'] as const;
export const OPERATION_METHODS = ['compensation', 'cassage'] as const;
export const OPERATION_STEPS = ['soustractions', 'restes'] as const;
export const OPERATION_QUOTIENTS = ['entier', 'décimal'] as const;

export type OperationCells = (typeof OPERATION_CELLS)[number];
export type OperationMethod = (typeof OPERATION_METHODS)[number];
export type OperationSteps = (typeof OPERATION_STEPS)[number];
export type OperationQuotient = (typeof OPERATION_QUOTIENTS)[number];

export type OperationOperator = '+' | '-' | '×' | '÷';

// ============================================================================
// NŒUD
// ============================================================================

/**
 * Un terme, en chiffres : `56,75` → `{ integer: '56', decimal: '75' }`.
 * Jamais de nombre flottant : la grille se construit chiffre par chiffre.
 */
export interface OperationTerm {
	integer: string;
	/** '' si le terme est entier */
	decimal: string;
}

export interface OperationSpec {
	operator: OperationOperator;
	/**
	 * 2 ou 3 termes, dans l'ordre de la ligne `calcul:` ; multiplication : dans
	 * l'ordre de pose, le facteur qui a le plus de chiffres en haut (Q1) ;
	 * division : le dividende, le diviseur
	 */
	terms: OperationTerm[];
	/** `résultat` : cases à remplir ; `aucune` : opération résolue */
	cells: OperationCells;
	/** Cases de retenue (à remplir) ou retenues écrites (résolue) */
	carries: boolean;
	/** Soustraction seulement ; `compensation` pour une addition (sans effet) */
	method: OperationMethod;
	/** Division seulement (Q1) ; `soustractions` ailleurs (sans effet) */
	steps: OperationSteps;
	/**
	 * Division seulement (Q3) : `entier` = division euclidienne (quotient et
	 * reste), `décimal` = quotient décimal exact ; `entier` ailleurs (sans effet)
	 */
	quotient: OperationQuotient;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface OperationIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```operation */
	line?: number;
}

export interface OperationNode extends BaseNode {
	type: 'operation';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: OperationSpec | null;
	errors: OperationIssue[];
	/**
	 * Numéro de la case de la question (`case: N`), posé par le générateur
	 * (`assign-blank-indices.ts`) sur un bloc à remplir ; absent ailleurs.
	 */
	caseIndex?: number;
}

export interface OperationBlockRange {
	startIndex: number;
	endIndex: number;
}
