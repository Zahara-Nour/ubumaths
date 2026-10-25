/**
 * Bloc ```operation — types
 * =========================
 *
 * Opération posée en colonnes (addition, soustraction au lot 1 ; phase 0 :
 * `docs/wip/operations-posees-progress.md`) :
 *
 * ```operation
 * calcul: 245 + 437
 * cases: résultat
 * retenues: oui
 * ```
 *
 * Le nœud porte les termes lus et les réglages ; le calcul (résultat,
 * retenues) et la grille sont faits par `utils/operation-scene.ts`, partagé
 * écran / PDF. L'auteur n'écrit jamais le résultat.
 *
 * @module ubumark/types/operation
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Chiffres d'un terme : avant la virgule, après la virgule */
export const OPERATION_MAX_DIGITS = { integer: 10, decimal: 3 } as const;

/** Nombre de termes : 2 ou 3 pour une addition, 2 pour une soustraction */
export const OPERATION_MAX_TERMS = { '+': 3, '-': 2 } as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const OPERATION_UNAVAILABLE = 'Opération indisponible';

/** Nom accessible de la grille : il ne dit JAMAIS le résultat */
export const OPERATION_ARIA_LABEL = 'Opération posée en colonnes';

export const OPERATION_CELLS = ['résultat', 'aucune'] as const;
export const OPERATION_METHODS = ['compensation', 'cassage'] as const;

export type OperationCells = (typeof OPERATION_CELLS)[number];
export type OperationMethod = (typeof OPERATION_METHODS)[number];

/** Opérateurs du lot 1 (`×` et `÷` : lots 2 et 3) */
export type OperationOperator = '+' | '-';

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
	/** 2 ou 3 termes, dans l'ordre de la ligne `calcul:` */
	terms: OperationTerm[];
	/** `résultat` : cases à remplir ; `aucune` : opération résolue */
	cells: OperationCells;
	/** Cases de retenue (à remplir) ou retenues écrites (résolue) */
	carries: boolean;
	/** Soustraction seulement ; `compensation` pour une addition (sans effet) */
	method: OperationMethod;
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
