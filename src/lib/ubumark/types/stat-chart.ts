/**
 * Blocs statistiques (```barres, ```circulaire) — types
 * =====================================================
 *
 * Un seul nœud interne `stat-chart` pour tous les diagrammes statistiques
 * (décision Q17 du 2026-10-01) : l'auteur tape `barres` ou `circulaire`, et
 * plus tard `histogramme`, `frequences-cumulees` ; le câblage (parseur,
 * renderer, listes, Typst, éditeur riche) n'est fait qu'une fois.
 *
 * Comme ```courbe, le nœud porte toujours son texte source et, en cas
 * d'erreur, ses messages situés : une erreur ne fait PAS disparaître le bloc
 * (décision Q48).
 *
 * @module ubumark/types/stat-chart
 */

import type { BaseNode } from './ast';
import type { CourbeColor, CourbeSize } from './courbe';

// ============================================================================
// VALEURS
// ============================================================================

/** Noms de blocs, tels que l'auteur les tape après ``` */
export const STAT_CHART_KINDS = ['barres', 'circulaire'] as const;
export type StatChartKind = (typeof STAT_CHART_KINDS)[number];

/** Ce qu'affiche la légende d'un diagramme circulaire (`étiquettes:`) */
export const STAT_CHART_LABELS = ['pourcentages', 'effectifs', 'angles', 'aucune'] as const;
export type StatChartLabels = (typeof STAT_CHART_LABELS)[number];

/** Effectifs entiers, ou pourcentages (`35 %`) — jamais mélangés (Q10) */
export type StatChartUnit = 'effectifs' | 'pourcentages';

/** Une catégorie et son effectif (ou son pourcentage). */
export interface StatChartDatum {
	label: string;
	value: number;
	/** Ligne du bloc (1 = première ligne après la clôture d'ouverture) */
	line: number;
}

/** Diagramme complet, valide : tout ce qu'il faut pour construire la scène. */
export interface StatChartSpec {
	kind: StatChartKind;
	/** Dans l'ordre écrit par l'auteur */
	data: StatChartDatum[];
	unit: StatChartUnit;
	title: string | null;
	/** Titres des axes (barres) ; null = titre par défaut */
	axes: { x: string | null; y: string | null };
	description: string | null;
	size: CourbeSize;
	/** Barres : effectif écrit au-dessus de chaque barre (Q19) */
	showValues: boolean;
	/** Barres : une seule couleur (Q21) */
	color: CourbeColor;
	/** Circulaire : contenu de la légende (Q18) */
	labels: StatChartLabels;
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève). */
export interface StatChartIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```barres */
	line?: number;
	/** Contenu de la ligne fautive */
	content?: string;
}

// ============================================================================
// NŒUD
// ============================================================================

/**
 * Nœud ```barres / ```circulaire.
 *
 * `spec` est null dès qu'il y a une erreur : le diagramme n'est pas dessiné,
 * le renderer affiche le message (prof) ou « Figure indisponible » (élève).
 */
export interface StatChartNode extends BaseNode {
	type: 'stat-chart';
	kind: StatChartKind;
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	spec: StatChartSpec | null;
	errors: StatChartIssue[];
	warnings: StatChartIssue[];
}

export interface StatChartBlockRange {
	kind: StatChartKind;
	startIndex: number;
	endIndex: number;
	/** false : clôture ``` absente */
	closed?: boolean;
}

// ============================================================================
// BUDGET
// ============================================================================

/**
 * Plafonds : le bloc est aussi rendu dans le chat élève et le tableau blanc.
 * L'analyse REFUSE au-delà, avec un message situé.
 */
export const STAT_CHART_LIMITS = {
	/** Catégories d'un diagramme en barres */
	barCategories: 30,
	/** Secteurs d'un diagramme circulaire */
	pieSectors: 12,
	/** Caractères d'un nom de catégorie */
	labelLength: 40,
	/** Caractères d'un titre ou d'une description */
	textLength: 300,
	/** Valeur absolue maximale d'un effectif */
	maxValue: 1e9,
	/** Écart toléré entre la somme des pourcentages et 100 (Q22) */
	percentTolerance: 0.5
} as const;
