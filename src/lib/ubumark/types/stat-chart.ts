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
export const STAT_CHART_KINDS = [
	'barres',
	'circulaire',
	'histogramme',
	'frequences-cumulees',
	'tableau-croise',
	'loi'
] as const;
export type StatChartKind = (typeof STAT_CHART_KINDS)[number];

/** Blocs dont les données sont des classes `[a ; b[` */
export const CLASS_CHART_KINDS: readonly StatChartKind[] = ['histogramme', 'frequences-cumulees'];

/** Sens du polygone des fréquences cumulées (Q27) */
export const STAT_CHART_DIRECTIONS = ['croissantes', 'décroissantes'] as const;
export type StatChartDirection = (typeof STAT_CHART_DIRECTIONS)[number];

/** Lectures graphiques sur le polygone (Q27) */
export const STAT_CHART_READINGS = ['aucune', 'médiane', 'quartiles'] as const;
export type StatChartReading = (typeof STAT_CHART_READINGS)[number];

/** Ce qu'affichent les cases d'un tableau croisé (Q33) */
export const CROSS_TABLE_DISPLAYS = [
	'effectifs',
	'fréquences',
	'fréquences par ligne',
	'fréquences par colonne'
] as const;
export type CrossTableDisplay = (typeof CROSS_TABLE_DISPLAYS)[number];

/** Tableau croisé (lot 4) : l'auteur écrit toutes les valeurs, et masque des cases (Q32). */
export interface CrossTableData {
	rows: string[];
	columns: string[];
	/** `null` : case `?`, inconnue et cachée */
	cells: (number | null)[][];
	showTotals: boolean;
	display: CrossTableDisplay;
	/** Cases à compléter ; `Total` désigne la ligne ou la colonne des totaux */
	masked: { row: string; column: string }[];
	/** Coin haut-gauche (`coin: Sexe \ Régime`) */
	corner: string | null;
}

/** Indicateurs d'une variable aléatoire (lot 6) */
export type LawIndicator = 'esperance' | 'variance' | 'ecart-type';

/**
 * Loi d'une variable aléatoire finie (lot 6, Q41) : valeurs et probabilités
 * TELLES QU'ÉCRITES par l'auteur (`1/6` reste `1/6`).
 */
export interface LawData {
	/** Une lettre majuscule, autre que P */
	variable: string;
	values: string[];
	/** `null` : probabilité `?`, inconnue et cachée */
	probabilities: (string | null)[];
	/** Indices des valeurs dont la probabilité est à compléter (`masquer:`) */
	masked: number[];
	indicators: LawIndicator[];
}

/** Indicateurs affichables sous la figure (Q28) */
export const STAT_CHART_INDICATORS = [
	'effectif',
	'moyenne',
	'mediane',
	'quartiles',
	'ecart-interquartile',
	'etendue',
	'ecart-type',
	'classe-mediane'
] as const;
export type StatChartIndicator = (typeof STAT_CHART_INDICATORS)[number];

/** Indicateurs disponibles pour une série en classes */
export const CLASS_INDICATORS: readonly StatChartIndicator[] = [
	'effectif',
	'moyenne',
	'classe-mediane',
	'mediane'
];

/** Ce qu'affiche la légende d'un diagramme circulaire (`étiquettes:`) */
export const STAT_CHART_LABELS = ['pourcentages', 'effectifs', 'angles', 'aucune'] as const;
export type StatChartLabels = (typeof STAT_CHART_LABELS)[number];

/** Effectifs entiers, ou pourcentages (`35 %`) — jamais mélangés (Q10) */
export type StatChartUnit = 'effectifs' | 'pourcentages';

/** Une catégorie et son effectif (ou son pourcentage). */
export interface StatChartDatum {
	/** Nom de la catégorie ; pour une classe, `[0 ; 10[` récrit proprement */
	label: string;
	value: number;
	/** Bornes d'une classe `[lower ; upper[`, sinon null */
	interval: { lower: number; upper: number } | null;
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
	/** Histogramme : `légende: 1 carreau = 2 élèves`, sinon automatique (Q26) */
	areaLegend: { value: number; unit: string | null } | null;
	/** Polygone : sens des fréquences cumulées (Q27) */
	direction: StatChartDirection;
	/** Polygone : lectures graphiques (Q27) */
	reading: StatChartReading;
	/** Indicateurs sous la figure, dans l'ordre de l'auteur (Q28) */
	indicators: StatChartIndicator[];
	/** Tableau croisé : ses lignes, colonnes et cases (`data` reste vide), sinon null */
	table: CrossTableData | null;
	/** Loi d'une variable aléatoire (`data` reste vide), sinon null */
	law: LawData | null;
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
	/** Classes d'un histogramme ou d'un polygone (Q29) */
	classes: 20,
	/** Lignes, et colonnes, d'un tableau croisé (Q34) */
	tableSize: 8,
	/** Valeurs d'une variable aléatoire (Q41) */
	lawValues: 12,
	/** Caractères d'un nom de catégorie */
	labelLength: 40,
	/** Caractères d'un titre ou d'une description */
	textLength: 300,
	/** Valeur absolue maximale d'un effectif */
	maxValue: 1e9,
	/** Écart toléré entre la somme des pourcentages et 100 (Q22) */
	percentTolerance: 0.5
} as const;
