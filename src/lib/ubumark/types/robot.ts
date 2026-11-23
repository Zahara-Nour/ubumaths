/**
 * Bloc ```robot — types
 * =====================
 *
 * Robot sur un quadrillage de cases (chantier `suite-fleches`, journal
 * `docs/wip/suite-fleches-progress.md`). Affiché seul, ou, avec `produire: oui`, une question :
 * l'élève compose le code qui mène le robot à la case verte (CE1-080, « produire une suite
 * d'instructions qui codent un déplacement »).
 *
 * ```robot
 * quadrillage: 8 x 5
 * codage: avance-pivote
 * départ: 2, 1, droite
 * arrivée: 6, 4
 * interdites: 4, 1 ; 4, 2
 * produire: oui
 * ```
 *
 * @module ubumark/types/robot
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Instructions au plus dans un code (BO du CE1 : « au maximum quinze instructions ») */
export const ROBOT_MAX_INSTRUCTIONS = 15;

/** Virages au plus dans le code le plus court d'une question (BO du CE1 : « dont quatre virages ») */
export const ROBOT_MAX_VIRAGES = 4;

/** Pas d'un « avance de » : 1 à 9 */
export const ROBOT_MAX_AVANCE = 9;

/** Colonnes et lignes d'un quadrillage : 2 à 12 */
export const ROBOT_MIN_COTE = 2;
export const ROBOT_MAX_COTE = 12;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const ROBOT_UNAVAILABLE = 'Robot indisponible';

// ============================================================================
// SCÈNE
// ============================================================================

/** Sens du robot, vu sur le dessin (haut = vers le haut de l'écran) */
export type Sens = 'haut' | 'droite' | 'bas' | 'gauche';

export const SENS: readonly Sens[] = ['haut', 'droite', 'bas', 'gauche'];

/** `flèches` : chaque flèche avance d'une case ; `avance-pivote` : codage relatif au robot */
export type Codage = 'flèches' | 'avance-pivote';

export const CODAGES: readonly Codage[] = ['flèches', 'avance-pivote'];

/** Une case : colonne et ligne, (1, 1) = case en bas à gauche */
export interface Case {
	col: number;
	ligne: number;
}

export interface RobotScene {
	colonnes: number;
	lignes: number;
	codage: Codage;
	depart: Case;
	/** Sens de départ : en avance-pivote seulement */
	sens: Sens | null;
	/** Case verte ; null : aucune (bloc d'affichage) */
	arrivee: Case | null;
	/** Cases grises, où le robot ne peut pas aller */
	interdites: Case[];
}

/** Une instruction d'un code */
export type Instruction =
	| { kind: 'flèche'; sens: Sens }
	| { kind: 'avance'; pas: number }
	| { kind: 'pivote'; cote: 'gauche' | 'droite' };

// ============================================================================
// NŒUD
// ============================================================================

export interface RobotSpec extends RobotScene {
	/** `produire: oui` : une question, l'élève compose le code */
	produire: boolean;
	/** Un code le plus court jusqu'à l'arrivée (question seulement) ; null sinon */
	solution: Instruction[] | null;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface RobotIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```robot */
	line?: number;
}

export interface RobotNode extends BaseNode {
	type: 'robot';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: RobotSpec | null;
	errors: RobotIssue[];
	/** Sa case, posée par le générateur (`case: N`), question seulement */
	caseIndex?: number;
}

export interface RobotBlockRange {
	startIndex: number;
	endIndex: number;
}
