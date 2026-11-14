/**
 * Bloc ```calcul — types
 * ======================
 *
 * Question « programme de calcul » (5e ; chantier `blockly`, PR 5 ; journal
 * `docs/wip/blockly-progress.md`) : l'élève assemble des blocs de calcul, sa réponse est son
 * programme, jugé sur ce qu'il affiche pour chaque nombre d'essai.
 *
 * ```calcul
 * attendu: afficher (nombre + 2) × 4
 * essais: -3 ; 0 ; 2,5
 * départ: afficher nombre
 * ```
 *
 * @module ubumark/types/calcul
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const CALCUL_UNAVAILABLE = 'Programme de calcul indisponible';

// ============================================================================
// NŒUD
// ============================================================================

export interface CalculSpec {
	/**
	 * Programme de référence, en notation texte (`calcul/notation.ts`) ; null dans l'énoncé
	 * d'une évaluation notée (`attendu: ?`, `masked-statement.ts`)
	 */
	attendu: string | null;
	/** Nombres sur lesquels les deux programmes sont rejoués (`essais:`, sinon le défaut) */
	essais: number[];
	/** Programme de départ, posé dans l'espace de travail de l'élève (`départ:`) ; null sinon */
	depart: string | null;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface CalculIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```calcul */
	line?: number;
}

export interface CalculNode extends BaseNode {
	type: 'calcul';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: CalculSpec | null;
	errors: CalculIssue[];
	/** Sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
}

export interface CalculBlockRange {
	startIndex: number;
	endIndex: number;
}
