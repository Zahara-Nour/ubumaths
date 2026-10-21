/**
 * Bloc ```qr — types
 * ==================
 *
 * QR code placé par l'auteur dans un document (lot 2 des QR codes,
 * `docs/wip/qr-codes-phase0.md`) :
 *
 * ```qr
 * https://www.chiph.re/glossaire
 * légende: Le glossaire en ligne
 * taille: 3cm
 * ```
 *
 * Le nœud ne porte que l'adresse complète et les réglages : la matrice est
 * calculée au rendu (écran, PDF), pour garder `uqr` hors du parseur.
 *
 * @module ubumark/types/qr
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Côté du QR, en cm (marge blanche comprise) */
export const QR_SIZE_CM = { min: 2.5, max: 6, default: 3 } as const;

/** Longueur maximale d'une légende, en caractères */
export const QR_CAPTION_MAX = 120;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const QR_UNAVAILABLE = 'QR code indisponible';

// ============================================================================
// NŒUD
// ============================================================================

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève, Q48) */
export interface QrIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```qr */
	line?: number;
}

export interface QrNode extends BaseNode {
	type: 'qr';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** Adresse complète que porte le QR ; null si elle manque ou est refusée */
	url: string | null;
	caption: string | null;
	sizeCm: number;
	errors: QrIssue[];
}

export interface QrBlockRange {
	startIndex: number;
	endIndex: number;
}
