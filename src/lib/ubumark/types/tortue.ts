/**
 * Bloc ```tortue — types
 * ======================
 *
 * Question « programme tortue » (chantier `blockly`, PR 4 ; journal
 * `docs/archive/wip/blockly-progress.md`) : l'élève assemble des blocs tortue, sa réponse est son
 * programme, jugé sur le tracé.
 *
 * ```tortue
 * attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]
 * montrer: oui
 * comparer: forme
 * ```
 *
 * @module ubumark/types/tortue
 */

import type { BaseNode } from './ast';
import type { ComparaisonTortue } from '#lib/shared/blockly/tortue/jugement.ts';
import type { NiveauTortue } from '#lib/shared/blockly/tortue/interpreteur.ts';
import type { Segment } from '#lib/shared/blockly/tortue/segments.ts';

// ============================================================================
// VALEURS
// ============================================================================

/** Segments au plus dans la figure d'un énoncé masqué (`figure:`). */
export const TORTUE_FIGURE_MAX_SEGMENTS = 500;

/** `blocs:` au plus (un programme fait au plus 2 000 caractères) */
export const TORTUE_BLOCS_MAX = 500;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const TORTUE_UNAVAILABLE = 'Programme tortue indisponible';

// ============================================================================
// NŒUD
// ============================================================================

export interface TortueSpec {
	/**
	 * Programme de référence, en notation texte (`notation.ts`) ; null dans l'énoncé d'une
	 * évaluation notée (`attendu: ?`, `masked-statement.ts`)
	 */
	attendu: string | null;
	/** `montrer: oui` : la figure à reproduire est dessinée en gris sur le quadrillage */
	montrer: boolean;
	comparer: ComparaisonTortue;
	/**
	 * Figure à reproduire (`montrer: oui`) : tracé de `attendu:`, ou, dans un énoncé masqué,
	 * les segments de `figure:` ; null sinon
	 */
	modele: Segment[] | null;
	/** Programme de départ, posé dans l'espace de travail de l'élève (`départ:`) ; null sinon */
	depart: string | null;
	/**
	 * Nombre maximal de blocs (`blocs:`) : au-delà, le programme est faux ; null : sans limite.
	 * Une consigne, pas la réponse : gardée dans l'énoncé d'une évaluation notée
	 */
	blocsMax: number | null;
	/**
	 * Blocs proposés et admis (`niveau: 4e | 3e`) : variables et calculs en 4e, « si » et
	 * conditions en plus en 3e ; `base` sans `niveau:`
	 */
	niveau: NiveauTortue;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface TortueIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```tortue */
	line?: number;
}

export interface TortueNode extends BaseNode {
	type: 'tortue';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: TortueSpec | null;
	errors: TortueIssue[];
	/** Sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
}

export interface TortueBlockRange {
	startIndex: number;
	endIndex: number;
}
