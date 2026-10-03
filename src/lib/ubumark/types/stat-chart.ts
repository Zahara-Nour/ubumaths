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
import type { NamedColor } from '$lib/theme/named-colors';
import type { LawIndicator } from '$lib/statistics/format';

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
	'loi',
	'simulation',
	'effectifs'
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

/** Indicateurs d'une variable aléatoire (lot 6) : le type du module statistique */
export type { LawIndicator };

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

/** Lignes d'un tableau d'effectifs (Q128), dans l'ordre de l'auteur */
export const FREQUENCY_TABLE_ROWS = [
	'effectifs',
	'fréquences',
	'effectifs cumulés',
	'fréquences cumulées'
] as const;
export type FrequencyTableRow = (typeof FREQUENCY_TABLE_ROWS)[number];

/** Ce que simule un bloc ```simulation (v2, lot 3) */
export const SIMULATION_MODES = ['tirages', 'moyenne', 'échantillons'] as const;
export type SimulationMode = (typeof SIMULATION_MODES)[number];

/**
 * Simulation d'une loi (v2, lot 3) : la loi telle qu'écrite, et de quoi refaire
 * les MÊMES tirages à l'écran et sur le PDF (graine fixe, Q70).
 */
export interface SimulationData {
	/** Une lettre majuscule, autre que P */
	variable: string;
	values: string[];
	/** Toutes connues : une probabilité « ? » ne se simule pas */
	probabilities: string[];
	mode: SimulationMode;
	/** Nombre de tirages (modes `tirages` et `moyenne`) */
	draws: number;
	/** Mode `échantillons` : N échantillons… */
	samples: number;
	/** … de taille n */
	sampleSize: number;
	seed: number;
}

/**
 * `série:` (Q106) : la série brute écrite au-dessus de la figure, triée, ou
 * seule (l'énoncé, sans la figure ni les indicateurs)
 */
export const SERIES_MODES = ['affichée', 'triée', 'seule'] as const;
export type SeriesMode = (typeof SERIES_MODES)[number];

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
	/** Bloc ```simulation : la loi et les tirages */
	simulation: SimulationData | null;
	/**
	 * Série en classes écrite en `données:` (lot 4 PR b) : les valeurs brutes,
	 * pour une moyenne et une médiane EXACTES (Q105) ; sinon null.
	 */
	rawValues: number[] | null;
	/** Bloc ```effectifs (Q125-Q129) : ses lignes et leur écriture ; `data` porte les valeurs */
	frequencyTable: {
		rows: FrequencyTableRow[];
		/** `fréquences: décimales` : au centième ; sinon en % au dixième */
		decimals: boolean;
		showTotals: boolean;
		direction: StatChartDirection;
		/** Des classes [a ; b[ (première ligne « Classe ») */
		classes: boolean;
	} | null;
	/** `série:` (lot 4 PR c, Q106) : la série brute écrite dans la fiche, sinon null */
	series: {
		mode: SeriesMode;
		/** Une ligne par série ; `name` null pour la série unique d'un `données:` */
		lines: { name: string | null; values: { text: string; numeric: boolean }[] }[];
	} | null;
	/**
	 * Deux séries nommées (`données Garçons: …`, lot 5 PR b, Q115) : barres
	 * groupées. `data` porte les catégories (valeurs réunies), sinon null.
	 */
	twoSeries: {
		names: [string, string];
		/** Effectif de chaque catégorie de `data`, série par série */
		counts: [number[], number[]];
		/** Q116 : fréquences si les effectifs totaux diffèrent, sinon effectifs ; `afficher:` force */
		display: 'effectifs' | 'fréquences';
		/** Valeurs brutes, pour les indicateurs (null pour des mots) */
		values: [number[], number[]] | null;
	} | null;
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
	/** Tirages d'un bloc ```simulation (rendu instantané, effectifs lisibles) */
	simulationDraws: 10_000,
	/** Graine d'un bloc ```simulation : au plus 9 chiffres */
	simulationSeed: 999_999_999,
	/** Échantillons, et taille d'un échantillon, d'un bloc ```simulation */
	simulationSamples: 1000,
	/** Tirages en tout du mode `échantillons` (N × n) */
	simulationSampleDraws: 100_000,
	/** Valeurs différentes de deux séries : deux barres chacune (30 barres, Q115) */
	twoSeriesCategories: 15,
	/** Valeurs d'une série brute (`données:`, Q101) */
	rawValues: 500,
	/** Caractères d'un nom de catégorie */
	labelLength: 40,
	/** Caractères d'un titre ou d'une description */
	textLength: 300,
	/** Valeur absolue maximale d'un effectif */
	maxValue: 1e9,
	/** Écart toléré entre la somme des pourcentages et 100 (Q22) */
	percentTolerance: 0.5
} as const;

/**
 * Couleurs des secteurs d'un diagramme circulaire, dans l'ordre, puisées dans la
 * palette commune des figures. Partagé par l'écran (`StatChart.svelte`) et le
 * PDF (`stat-chart-typst.ts`) : un seul ordre, une seule source.
 */
export const PIE_COLOR_SEQUENCE: readonly NamedColor[] = [
	'bleu',
	'orange',
	'vert',
	'rouge',
	'violet',
	'cyan',
	'gris'
];
