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
import type { VariableChange } from '$lib/statistics/variable-change';

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
	'effectifs',
	'nuage'
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

/** `seuil: P(X > k) ⩽ 0,05` (Q140 ; loi géométrique : manche 14) */
export interface LawThreshold {
	event: '>' | '⩾' | '<' | '⩽';
	comparison: '⩽' | '⩾';
	/** α tel qu'écrit */
	alpha: string;
}

/**
 * Une probabilité P(low ⩽ X ⩽ high) d'une loi discrète ; `complement` :
 * l'événement contraire, pour `P(|X − m| > a)` (2026-10-09)
 */
export interface QueryInterval {
	display: string;
	low: number;
	high: number;
	complement?: boolean;
}

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
	/**
	 * Loi binomiale (`X ~ B(n ; p)`, manche 11) : les valeurs sont 0 à n, les
	 * probabilités calculées (exactes, affichées arrondies) ; sinon null.
	 */
	binomial: {
		n: number;
		/** p tel qu'écrit (`0,3`, `3/10`) */
		p: string;
		/** Décimales affichées (`arrondi:`, 3 par défaut) */
		places: number;
		/** `probabilités:` : P(low ⩽ X ⩽ high), et leur écriture normalisée */
		queries: QueryInterval[];
		/** `diagramme: oui` : les bâtons de la loi */
		chart: boolean;
		/** `intervalle:` : le niveau 1 − α en fraction (`19/20`), sinon null (Q140) */
		interval: string | null;
		/** `seuil: P(X > k) ⩽ 0,05` (Q140), sinon null */
		threshold: LawThreshold | null;
	} | null;
	/**
	 * Loi géométrique (`X ~ G(p)`, manche 13) : valeurs 1 à `upTo` dans le
	 * tableau, puis « … » ; probabilités exactes, affichées arrondies ; sinon null.
	 */
	geometric: {
		/** p tel qu'écrit (`0,2`, `1/5`, `20 %`) */
		p: string;
		places: number;
		/** `jusqu'à:` : dernière valeur du tableau (10 par défaut) */
		upTo: number;
		/**
		 * P(low ⩽ X ⩽ high), `high` null : pas de borne haute ; `given` :
		 * conditionnée par X ⩾ given (P(X > a | X > b)), sinon null
		 */
		queries: (Omit<QueryInterval, 'high'> & { high: number | null; given: number | null })[];
		chart: boolean;
		/** `seuil:` (manche 14), comme la loi binomiale ; sinon null */
		threshold: LawThreshold | null;
	} | null;
	/**
	 * Loi à densité (`X ~ U([a ; b])`, `X ~ E(λ)`, manche 13, PR b ;
	 * `X ~ N(μ ; σ²)`, 2026-10-09) : pas de tableau ; sinon null
	 */
	density: {
		/** Paramètres tels qu'écrits (`0,5`, `1/3`) */
		law:
			| { family: 'uniform'; a: string; b: string }
			| { family: 'exponential'; lambda: string }
			/** `X ~ N(μ ; σ²)` : μ et σ² tels qu'écrits (2026-10-09) */
			| { family: 'normal'; mu: string; variance: string };
		places: number;
		queries: DensityQuery[];
		/** `diagramme: oui` : la courbe de densité */
		chart: boolean;
		/** L'aire hachurée : la première probabilité, ou `aire:` ; null sans probabilité */
		area: DensityQuery | null;
		/** `répartition: oui` : la fonction de répartition F */
		cdf: boolean;
	} | null;
	/** Loi uniforme discrète (`X ~ U(a ; b)`, manche 13) : valeurs a à b ; sinon null */
	uniform: {
		a: number;
		b: number;
		places: number;
		queries: QueryInterval[];
		chart: boolean;
	} | null;
}

/**
 * Une probabilité d'une loi à densité, bornes TELLES QU'ÉCRITES (`null` : pas
 * de borne de ce côté) ; < et ⩽ donnent la même valeur.
 */
export interface DensityQuery {
	display: string;
	low: string | null;
	high: string | null;
	/** P(X > low | X > given), sinon null */
	given: string | null;
	/** P(X = x) : vaut 0 (loi à densité) */
	point: boolean;
	/** `P(|X − m| > a)` : 1 − P(m − a ⩽ X ⩽ m + a) (2026-10-09) */
	complement?: boolean;
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
/** Une loi nommée dans un bloc ```simulation (manche 14) ; paramètres tels qu'écrits */
export type SimulatedNamedLaw =
	| { family: 'geometric'; p: string; upTo: number }
	| { family: 'uniform'; a: number; b: number }
	| { family: 'uniform-density'; a: string; b: string; classes: number }
	| { family: 'exponential'; lambda: string; classes: number };

export interface SimulationData {
	/** Une lettre majuscule, autre que P */
	variable: string;
	values: string[];
	/** Toutes connues : une probabilité « ? » ne se simule pas */
	probabilities: string[];
	mode: SimulationMode;
	/** Nombre de tirages (modes `tirages` et `moyenne`) */
	draws: number;
	/** Loi binomiale (`X ~ B(n ; p)`) : valeurs et probabilités calculées, sinon null */
	binomial: { n: number; p: string } | null;
	/**
	 * Lois de maths complémentaires (manche 14) : G(p) (valeurs 1 à `upTo`, puis
	 * « upTo + 1 ou plus »), U(a ; b), et les lois à densité (histogramme de
	 * `classes` classes) ; sinon null
	 */
	named: SimulatedNamedLaw | null;
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

/** Indicateurs d'un nuage de points (Q168) : PAS r², le programme dit r */
export const SCATTER_INDICATORS = ['point-moyen', 'equation', 'r'] as const;
export type ScatterIndicator = (typeof SCATTER_INDICATORS)[number];

/**
 * Nuage de points (```nuage, manche 15, Q166-Q172) : les valeurs TELLES
 * QU'ÉCRITES (calculs exacts dans la scène, en fractions).
 */
export interface ScatterData {
	xs: string[];
	ys: string[];
	/** `nom x:` / `nom y:` : titres des axes ; null = « x » / « y » */
	names: { x: string | null; y: string | null };
	/** `ajustement: affine` : la droite des moindres carrés (y en x) et son équation */
	fit: boolean;
	/** Dans l'ordre de l'auteur */
	indicators: ScatterIndicator[];
	/** `prévoir: x = 4,5 ; y = 25`, valeurs telles qu'écrites */
	predictions: { axis: 'x' | 'y'; value: string }[];
	/** `arrondi:` : décimales (3 par défaut, Q172) */
	places: number;
	/** `origine: oui` : les axes partent de 0 */
	origin: boolean;
	/**
	 * Changement de variable (`ajustement: z = ln(y)`, PR b, Q170), sinon null :
	 * ajustement de (x ; z) ou (t ; y), relation retrouvée tracée en courbe
	 */
	change: VariableChange | null;
	/** `nuage: z` / `nuage: t` : le nuage transformé et sa droite */
	transformedCloud: boolean;
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
		/** Cases à compléter (`masquer:`, Q130) : indice de valeur, ou la colonne Total */
		masked: { row: FrequencyTableRow; column: number | 'total' }[];
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
	/** Bloc ```nuage (manche 15) : les deux séries et les options, sinon null */
	scatter: ScatterData | null;
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
	/** Classes de l'histogramme des tirages d'une loi à densité (`classes: N`, manche 14) */
	simulationClasses: { default: 10, min: 2, max: 50 },
	/** Valeurs différentes de deux séries : deux barres chacune (30 barres, Q115) */
	twoSeriesCategories: 15,
	/** Valeurs affichées d'une loi binomiale : au-delà, pas de tableau (Q138) */
	binomialTableValues: 30,
	/** Points d'un nuage (Q167) */
	scatterPoints: { min: 2, max: 100 },
	/** Prévisions d'un nuage (`prévoir:`) */
	scatterPredictions: 20,
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
