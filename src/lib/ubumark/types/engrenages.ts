/**
 * Bloc ```engrenages — types
 * ==========================
 *
 * Deux ou trois roues dentées en ligne, qui s'engrènent, chacune avec un
 * repère (outil n° 52, `docs/wip/outil-engrenages-progress.md`) :
 *
 * ```engrenages
 * roues: 12 ; 18
 * légendes: A ; B
 * taille: 8cm
 * ```
 *
 * Toutes les dents sont dessinées (l'élève peut les compter). Écrit dans la
 * correction d'un modèle, le bloc fait tourner les roues jusqu'au premier
 * retour de tous les repères à leur place ; dans l'énoncé et dans le PDF, la
 * figure est à l'arrêt.
 *
 * @module ubumark/types/engrenages
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Nombre de roues */
export const ENGRENAGES_WHEELS = { min: 2, max: 3 } as const;

/** Dents par roue : au-delà de 60, les dents ne se voient plus */
export const ENGRENAGES_TEETH = { min: 6, max: 60 } as const;

/** Largeur de la figure, en cm */
export const ENGRENAGES_SIZE_CM = { min: 4, max: 16, default: 8 } as const;

/** Longueur maximale d'une légende, en caractères */
export const ENGRENAGES_CAPTION_MAX = 20;

/** Légendes par défaut, dans l'ordre des roues */
export const ENGRENAGES_DEFAULT_LABELS = ['A', 'B', 'C'] as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const ENGRENAGES_UNAVAILABLE = 'Engrenages indisponibles';

// ============================================================================
// NŒUD
// ============================================================================

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève, Q48) */
export interface EngrenagesIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```engrenages */
	line?: number;
}

export interface EngrenagesWheel {
	/** Nombre de dents */
	teeth: number;
	label: string;
}

export interface EngrenagesNode extends BaseNode {
	type: 'engrenages';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** Roues de gauche à droite ; null si le bloc est en erreur */
	wheels: EngrenagesWheel[] | null;
	sizeCm: number;
	errors: EngrenagesIssue[];
}

export interface EngrenagesBlockRange {
	startIndex: number;
	endIndex: number;
}
