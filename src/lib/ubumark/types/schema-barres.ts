/**
 * Bloc ```schema-barres — types
 * =============================
 *
 * Schéma en barres (pré-algèbre, 6e ; CM1-063, CM2-066) : des barres l'une sous
 * l'autre, découpées en segments dont la longueur est écrite par le prof, avec
 * accolades. Affichage seulement (phase 0 : `docs/wip/schema-barres-progress.md`).
 *
 * ```schema-barres
 * Or : ? (4) ; 70 (2)
 * Argent : ? (4)
 * Bronze : ? (2,5) ; -80 (1,5)
 * total : 320 €
 * ```
 *
 * Le nœud porte les barres ; le dessin est calculé par
 * `utils/schema-barres-scene.ts`, partagé écran / PDF.
 *
 * @module ubumark/types/schema-barres
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Nombre de barres d'un schéma */
export const SCHEMA_BARRES_BARS = { min: 1, max: 6 } as const;

/** Nombre de segments d'une barre */
export const SCHEMA_BARRES_SEGMENTS = { min: 1, max: 12 } as const;

/** Longueur d'un segment, en unités */
export const SCHEMA_BARRES_LENGTH = { min: 0.1, max: 50 } as const;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const SCHEMA_BARRES_UNAVAILABLE = 'Schéma en barres indisponible';

// ============================================================================
// NŒUD
// ============================================================================

export interface SchemaBarresSegment {
	/** Texte écrit au centre du segment (`?`, `70`, `70 €`), sans le signe `-` d'une partie manquante */
	label: string;
	/** Longueur en unités (1 par défaut) */
	length: number;
	/** Partie manquante : rectangle en pointillés, sans fond */
	missing: boolean;
}

export interface SchemaBarresBar {
	/** Nom écrit à gauche (peut être vide) */
	name: string;
	segments: SchemaBarresSegment[];
	/** Texte de l'accolade sous la barre (`= 9 €`), sans le signe `=` */
	brace?: string;
}

export interface SchemaBarresSpec {
	bars: SchemaBarresBar[];
	/** Texte de l'accolade verticale à droite de toutes les barres (`total : 320 €`) */
	total?: string;
}

export interface SchemaBarresNode extends BaseNode {
	type: 'schema-barres';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: SchemaBarresSpec | null;
	/** Phrases pour l'AUTEUR (jamais montrées à l'élève), « Ligne N : … » */
	errors: string[];
}

export interface SchemaBarresBlockRange {
	startIndex: number;
	endIndex: number;
}
