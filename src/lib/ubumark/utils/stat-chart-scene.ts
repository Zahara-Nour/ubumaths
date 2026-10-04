/**
 * Blocs statistiques (barres, circulaire, histogramme, polygone) — scène pure
 * ===========================================================================
 *
 * La MÊME scène sert l'écran (`StatChart.svelte`, SVG) et le PDF
 * (`stat-chart-typst.ts`, cetz) : mêmes barres, mêmes secteurs, mêmes
 * étiquettes. Aucun des deux ne recalcule quoi que ce soit.
 *
 * Coordonnées abstraites, indépendantes du support :
 * - barres : x en « catégories » (la i-ème occupe [i ; i + 1]), y dans
 *   l'unité des données, de 0 à `yMax` ;
 * - circulaire : repère mathématique (y vers le HAUT), centre (0 ; 0),
 *   rayon 1 ; angles en degrés depuis midi, dans le sens horaire (Q18).
 *
 * Les fréquences viennent de `src/lib/statistics/` (une seule source de calcul).
 *
 * @module ubumark/utils/stat-chart-scene
 */

import type {
	DensityQuery,
	LawData,
	LawThreshold,
	StatChartDatum,
	StatChartDirection,
	StatChartLabels,
	SimulationData,
	SimulatedNamedLaw,
	StatChartIndicator,
	StatChartSpec,
	StatChartUnit
} from '../types/stat-chart';
import { STAT_CHART_LIMITS } from '../types/stat-chart';
import type { CourbeColor } from '../types/courbe';
import type { ContentLocale } from '$lib/types/locale';
import { computeGridStep } from '$lib/geometry-core/viewport/grid';
import { categoryFrequencies, describeList, summarizeTable } from '$lib/statistics/describe';
import {
	estimateClassQuantile,
	summarizeClasses,
	type ClassSummary,
	type StatClass
} from '$lib/statistics/classes';
import { COURBE_PIXEL_WIDTH, formatTick } from './courbe-scene';
import { carreauGrid, usesCarreaux } from './stat-chart-carreaux';
import { crossTable } from '$lib/statistics/cross-table';
import {
	formatApproxValue,
	formatFraction,
	formatLawIndicators,
	formatStatNumber
} from '$lib/statistics/format';
import { Fraction } from '$lib/statistics/fraction';
import { randomVariable, type RandomVariableLaw } from '$lib/statistics/random-variable';
import {
	discreteSampler,
	exponentialSampler,
	geometricSampler,
	simulateCounts,
	simulateDraws,
	simulateLawRunningMean,
	simulateLawSamples,
	uniformDensitySampler,
	uniformSampler,
	type LawSampler
} from '$lib/statistics/simulation';
// ⚠️ Import circulaire (simulation-scene construit ses histogrammes par
// `buildStatChartScene`) : sans risque, rien n'y est appelé au chargement
import { buildRunningMeanScene, buildSampleMeansScene } from './simulation-scene';
import { buildComparisonScene } from './comparison-scene';
import { STAT_TEXT, type IndicatorRowId } from './stat-chart-text';
import { createRandomSource } from '$lib/utils/random';
import {
	binomialDistribution,
	binomialInterval,
	binomialMoments,
	binomialProbability,
	binomialThreshold,
	roundExact,
	type BinomialDistribution
} from '$lib/statistics/binomial';
import {
	geometricConditional,
	geometricMoments,
	GEOMETRIC_MAX_K,
	geometricProbability,
	geometricThreshold
} from '$lib/statistics/geometric';
import type { ThresholdResult } from '$lib/statistics/threshold';
import { uniformMoments, uniformProbability } from '$lib/statistics/uniform';
import {
	exponentialDensity,
	exponentialMoments,
	exponentialProbability,
	uniformDensityMoments,
	uniformDensityProbability
} from '$lib/statistics/density';

// ============================================================================
// TYPES
// ============================================================================

export interface ScenePoint {
	x: number;
	y: number;
}

export interface SceneTick {
	value: number;
	label: string;
}

interface SceneCommon {
	/** Titre affiché au-dessus du diagramme (celui de l'auteur), ou null */
	title: string | null;
	/**
	 * Titre accessible (`<title>`) : le GENRE du diagramme. Le titre de l'auteur
	 * est déjà lu dans `<figcaption>` : le répéter le ferait annoncer deux fois
	 * (audit a11y du lot 2).
	 */
	accessibleTitle: string;
	/** Description accessible (`<desc>`) : celle de l'auteur, sinon automatique */
	description: string;
	/** Taille du cadre de dessin, en px à l'écran */
	pixelSize: { width: number; height: number };
	/**
	 * Ligne d'indicateurs sous la figure (Q28), dans l'ordre de l'auteur. Texte
	 * visible : pas répétée dans `description`, sinon lue deux fois.
	 */
	indicators: string[];
	/**
	 * `série:` (Q106) : la série brute écrite au-dessus de la figure, prête à
	 * afficher ; absente ou null sans `série:` (et dans les scènes de l'atelier)
	 */
	series?: string | null;
	/** `série: seule` : la série sans la figure ni les indicateurs */
	seriesOnly?: boolean;
	/**
	 * Lignes d'indicateurs à exposants (lois à densité, « e^(−1) ») : une par
	 * ligne de `indicators`, découpée en texte / exposant, et sa lecture pour le
	 * lecteur d'écran ; absente sans exposant
	 */
	indicatorParts?: IndicatorLine[];
}

/** Une ligne d'indicateurs à exposants : `e` puis `<sup>−1</sup>` */
export interface IndicatorLine {
	segments: { text: string; exponent: boolean }[];
	/** « e puissance −1 », « e puissance (−0,5 × 2) » */
	spoken: string;
}

export interface SceneBar {
	label: string;
	/** Deux séries (Q115) : 1 pour la seconde, hachurée ; absente sinon */
	series?: 0 | 1;
	/** Loi binomiale avec `intervalle:` : false hors de I (gris) ; absente sinon */
	highlighted?: boolean;
	value: number;
	/** Valeur écrite au-dessus de la barre (`valeurs: oui`) */
	valueLabel: string;
	/** Bords de la barre, en catégories */
	left: number;
	right: number;
}

export interface BarScene extends SceneCommon {
	kind: 'barres';
	bars: SceneBar[];
	/** Haut de l'axe vertical, multiple du pas */
	yMax: number;
	ticks: SceneTick[];
	axisTitles: { x: string | null; y: string };
	color: CourbeColor;
	showValues: boolean;
	/** Noms de catégories inclinés (trop nombreux ou trop longs pour tenir à plat) */
	rotateLabels: boolean;
	/** Caractères du nom le plus long : place à réserver sous l'axe s'il est incliné */
	longestLabel: number;
	/** Une étiquette par catégorie, au centre de sa bande (une ou deux barres) */
	labels: { text: string; center: number }[];
	/** Deux séries (Q115) : leurs noms, pour la légende ; null sinon */
	legend: string[] | null;
	/** Couleur de la seconde série, hachurée (Q117) ; null avec une seule série */
	secondColor: CourbeColor | null;
	/** Deux séries + `indicateurs:` (Q118) : le tableau, une colonne par série */
	indicatorTable: ComparisonScene | null;
}

export interface SceneSector {
	label: string;
	/** Degrés depuis midi, sens horaire */
	startAngle: number;
	endAngle: number;
	/** Contour fermé : centre, puis l'arc échantillonné (disque entier : l'arc seul) */
	polygon: ScenePoint[];
	colorIndex: number;
	/**
	 * Numéro de la ligne de légende (1 = première catégorie écrite) : relie le
	 * secteur à sa légende sans passer par la couleur (Q23, daltonisme et
	 * impression en noir et blanc)
	 */
	marker: number;
	/** Centre du repère : dans le secteur, ou hors du disque s'il est trop petit */
	markerPosition: ScenePoint;
	/**
	 * Trait vers un repère placé dehors, sinon null : il part du milieu du
	 * secteur, sort à l'aplomb, puis rejoint le repère (coudé : un repère
	 * écarté de ses voisins, Q54, aurait sinon un trait qui coupe le disque)
	 */
	leader: ScenePoint[] | null;
}

export interface SceneLegendItem {
	label: string;
	/** Ligne affichée : « Bus — 46,7 % » selon `étiquettes:` */
	text: string;
	colorIndex: number;
	marker: number;
}

export interface PieScene extends SceneCommon {
	kind: 'circulaire';
	sectors: SceneSector[];
	legend: SceneLegendItem[];
}

export interface SceneRect {
	label: string;
	lower: number;
	upper: number;
	/** Effectif (mode `axe`) ou nombre de carreaux (mode `carreaux`) */
	height: number;
	/** Effectif écrit dans le rectangle (`valeurs: oui`) */
	valueLabel: string;
	/**
	 * Classe mise en valeur : dans l'intervalle μ ± 2σ/√n de l'histogramme des
	 * moyennes d'échantillons (atelier, Q82). Absent ailleurs.
	 */
	highlighted?: boolean;
}

export interface HistogramScene extends SceneCommon {
	kind: 'histogramme';
	xMin: number;
	xMax: number;
	rects: SceneRect[];
	/**
	 * `axe` : amplitudes égales, axe « Effectif » gradué ; `carreaux` :
	 * amplitudes inégales (ou `légende:`), quadrillage et légende d'aire (Q26)
	 */
	mode: 'axe' | 'carreaux';
	/** Haut de l'axe vertical, dans l'unité de `height` */
	yMax: number;
	/** Graduations verticales (mode `axe` seulement) */
	ticks: SceneTick[];
	/** Graduations horizontales : les bornes des classes */
	xTicks: SceneTick[];
	/** Carreau du quadrillage : largeur en unités de x, valeur, légende */
	carreau: { width: number; value: number; legend: string } | null;
	/** Lignes du quadrillage (x en unités de x, y dans l'unité de `height`) */
	grid: { xs: number[]; ys: number[] };
	axisTitles: { x: string | null; y: string | null };
	color: CourbeColor;
	showValues: boolean;
	/** Deux séries (lot 5 PR c) : le nom écrit au-dessus de cet histogramme */
	seriesName?: string;
	/** Seconde série : rectangles hachurés (Q117), dans `hatchColor` */
	hatched?: boolean;
	hatchColor?: CourbeColor;
	/** Le second histogramme, même classes, même échelle, dessiné dessous */
	second?: HistogramScene;
	/** `indicateurs:` à deux séries (Q118) : le tableau, une colonne par série */
	indicatorTable?: ComparisonScene | null;
	/**
	 * Tirages d'une loi à densité (```simulation, manche 14) : hauteurs en
	 * densité, et la courbe de la loi superposée — celle du bloc ```loi
	 */
	densityCurve?: { points: ScenePoint[]; color: CourbeColor };
}

export interface SceneReading {
	name: 'Q1' | 'Me' | 'Q3';
	/** Ordonnée de lecture, en % */
	percent: number;
	/** Abscisse lue sur le polygone */
	x: number;
	/** `Me ≈ 14,44` */
	text: string;
}

export interface CumulativeScene extends SceneCommon {
	kind: 'frequences-cumulees';
	xMin: number;
	xMax: number;
	/** Sommets du polygone : x en unités de x, y en % */
	points: ScenePoint[];
	xTicks: SceneTick[];
	/** Graduations verticales, de 0 à 100 % */
	ticks: SceneTick[];
	readings: SceneReading[];
	direction: StatChartDirection;
	axisTitles: { x: string | null; y: string };
	color: CourbeColor;
	/** Deux séries (lot 5 PR c) : leurs noms, pour la légende */
	legend?: string[];
	/** Le second polygone, sur les mêmes axes, en pointillés */
	second?: { points: ScenePoint[]; readings: SceneReading[]; color: CourbeColor };
	indicatorTable?: ComparisonScene | null;
}

export interface SceneCell {
	/** Texte affiché ; vide si la case est à compléter */
	text: string;
	/** Case à compléter (`masquer:`, ou `?` et les totaux qui en dépendent) */
	hidden: boolean;
	/** Ce que lit le lecteur d'écran à la place de `text` (« — » est muet), sinon null */
	srText: string | null;
}

export interface CrossTableScene extends SceneCommon {
	kind: 'tableau-croise';
	/** Coin haut-gauche, ou null */
	corner: string | null;
	/** Le coin tel que le lit un lecteur d'écran : `Sexe \ Régime` → « lignes : Sexe, colonnes : Régime » */
	cornerSpoken: string | null;
	/** Ce qu'annonce une case à compléter, dans la langue du document */
	hiddenLabel: string;
	/** En-têtes des colonnes, `Total` compris */
	columnHeaders: string[];
	/** Lignes, `Total` comprise : en-tête et cases */
	rows: { header: string; cells: SceneCell[] }[];
}

export interface LawScene extends SceneCommon {
	kind: 'loi';
	/** Lettre de la variable (`G`) : en-têtes `gᵢ` et `P(G = gᵢ)` */
	variable: string;
	/** Valeurs telles qu'écrites, vrai signe moins, séparateur selon la langue */
	values: string[];
	/** Probabilités telles qu'écrites ; vides et marquées si à compléter */
	probabilities: SceneCell[];
	/** Ce qu'annonce une case à compléter, dans la langue du document */
	hiddenLabel: string;
	/** Loi binomiale de plus de 30 valeurs (Q138) : pas de tableau, les lignes seulement */
	tableHidden?: boolean;
	/** Loi binomiale trop large pour une ligne : tableau vertical (k, P(X = k)) */
	vertical?: boolean;
	/** Loi binomiale, `diagramme: oui` : les bâtons de la loi (I en couleur, Q140) */
	chart?: BarScene;
	/** Loi géométrique, `diagramme: oui` : « valeurs suivantes non représentées » */
	chartNote?: string;
	/** Loi à densité, `diagramme: oui` : la courbe et l'aire hachurée (PR b) */
	densityChart?: DensityScene;
}

/**
 * Tableau d'effectifs (```effectifs, Q125-Q129) : une ligne des valeurs, une
 * ligne par grandeur ; vertical au-delà de 12 valeurs (`vertical`).
 */
export interface FrequencyTableScene extends SceneCommon {
	kind: 'effectifs';
	/** Légende du tableau : le titre de l'auteur, sinon « Tableau des effectifs » */
	caption: string;
	/** « Valeur » ou « Classe » */
	valueHeader: string;
	/** Les valeurs (ou classes), puis « Total » si la colonne est là */
	columns: string[];
	/** Une ligne par grandeur ; une case vide pour le total d'un cumul ; `hidden` : à compléter */
	rows: { header: string; cells: string[]; hidden: boolean[] }[];
	/** Ce qu'annonce une case à compléter (`masquer:`, Q130) */
	hiddenLabel: string;
	vertical: boolean;
	/** Ce que lit le lecteur d'écran dans une case vide (« sans objet ») */
	emptyLabel: string;
}

/**
 * Comparer deux séries (atelier, `.comparer`, v2 lot 5, Q112) : une ligne par
 * indicateur, une colonne par série. Jamais produite par un bloc (pour l'instant).
 */
export interface ComparisonScene extends SceneCommon {
	kind: 'comparaison';
	/** Noms des séries : en-têtes des colonnes */
	columns: string[];
	/** `groupStart` : première ligne d'un groupe (moyenne, médiane, minimum) */
	rows: { id: IndicatorRowId; header: string; cells: string[]; groupStart: boolean }[];
}

/** Une valeur simulée : une ligne du tableau */
export interface SimulationRow {
	/** Valeur telle qu'écrite, vrai signe moins, séparateur selon la langue */
	value: string;
	/** Effectif observé */
	count: string;
	/** Fréquence observée, au millième */
	frequency: string;
	/** Probabilité telle qu'écrite */
	probability: string;
}

/**
 * Bloc ```simulation, mode `tirages` (v2, lot 3) : effectifs et fréquences
 * observés à côté des probabilités. La graine fixe les tirages : l'écran et le
 * PDF montrent les mêmes nombres.
 */
export interface SimulationScene extends SceneCommon {
	kind: 'simulation';
	/** Lettre de la variable (`G`) : en-tête `gᵢ` */
	variable: string;
	/** « Simulation de 600 tirages (graine 42) » */
	caption: string;
	/** En-têtes des trois colonnes après celle des valeurs */
	headers: { count: string; frequency: string; probability: string };
	rows: SimulationRow[];
}

/**
 * Moyenne des tirages selon leur nombre (atelier, `.fréquence`, Q81) : la loi
 * des grands nombres. Jamais produite par un bloc ubumark.
 */
export interface MeanScene extends SceneCommon {
	kind: 'moyenne-selon-n';
	/** 1 et le nombre de tirages */
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
	/** Moyenne des x premiers tirages ; au plus `RUNNING_MEAN_MAX_POINTS` points */
	points: ScenePoint[];
	xTicks: SceneTick[];
	/** Graduations verticales, de `yMin` à `yMax` */
	ticks: SceneTick[];
	/** La droite y = E(X), en pointillés */
	reference: { value: number; label: string };
	axisTitles: { x: string; y: string };
	color: CourbeColor;
}

/**
 * Courbe de densité (lois à densité, manche 13, PR b), en unités de la loi :
 * x de `xMin` à `xMax`, y de 0 à `yMax` ; l'aire hachurée est un polygone fermé.
 */
export interface DensityScene extends SceneCommon {
	kind: 'densite';
	xMin: number;
	xMax: number;
	yMax: number;
	points: ScenePoint[];
	/** L'aire de la probabilité choisie, ou null */
	area: ScenePoint[] | null;
	xTicks: SceneTick[];
	ticks: SceneTick[];
	axisTitles: { x: string | null; y: string };
	color: CourbeColor;
}

export type StatChartScene =
	| DensityScene
	| FrequencyTableScene
	| ComparisonScene
	| SimulationScene
	| MeanScene
	| LawScene
	| BarScene
	| PieScene
	| HistogramScene
	| CumulativeScene
	| CrossTableScene;

export interface StatChartSceneOptions {
	/** Langue du document : séparateur décimal */
	locale?: ContentLocale;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Couleurs des secteurs, dans cet ordre, reprises au-delà (Q21) */
export const PIE_PALETTE_SIZE = 7;

/** Hauteur / largeur du cadre des barres : partagé avec le Typst */
export const STAT_CHART_ASPECT_RATIO = 3 / 4;

/** Écart visé entre deux graduations, en px */
const TICK_TARGET_PX = 40;

/** Largeur d'une barre, en part de sa catégorie */
const BAR_WIDTH = 0.6;

/** Au-delà, les noms de catégories sont inclinés */
const FLAT_LABELS_MAX = 6;

/**
 * Largeur moyenne d'un caractère à 11 px, pour savoir si un nom tient à plat ;
 * partagée avec `StatChart.svelte`, qui en déduit la place d'un nom incliné.
 */
export const STAT_CHART_CHAR_PX = 6.5;

/** En dessous de cet angle, le repère d'un secteur est placé hors du disque */
const MARKER_INSIDE_MIN_DEGREES = 20;

/** Distance au centre d'un repère intérieur, extérieur, et bout du trait (rayon = 1) */
const MARKER_INSIDE_RADIUS = 0.62;
const MARKER_OUTSIDE_RADIUS = 1.2;
const LEADER_ELBOW_RADIUS = 1.05;

/** Rayon d'un repère numéroté : à l'écran (px), dans le PDF (cm) */
export const PIE_MARKER_PX = 9;
export const PIE_MARKER_CM = 0.17;

/**
 * Le même, en rayons du disque, ARRONDI AU-DESSUS du plus grand des rendus :
 * 0,17 cm sur un disque de 1,35 cm (PDF, petite taille) ≈ 0,126 ; 9 px sur
 * 105 px (écran, petite taille) ≈ 0,086. Un test le recalcule depuis les tailles.
 */
export const PIE_MARKER_RADIUS = 0.13;

/** Pas d'échantillonnage des arcs, en degrés */
const ARC_STEP_DEGREES = 3;

// Titres des genres de blocs : `STAT_TEXT[locale].kind` (stat-chart-text.ts)

/** Nom de la ligne et de la colonne des totaux */
const TOTAL = 'Total';

/** Textes lus par le lecteur d'écran d'un tableau croisé, selon la langue du document */
const CROSS_TABLE_SPOKEN: Record<
	ContentLocale,
	{ title: string; hidden: string; undefined: string; rows: string; columns: string }
> = {
	fr: {
		title: 'Tableau croisé',
		hidden: 'case à compléter',
		undefined: 'non définie',
		rows: 'lignes',
		columns: 'colonnes'
	},
	en: {
		// Q122 : « Two-way table », le nom du dictionnaire
		title: STAT_TEXT.en.kind['tableau-croise'],
		hidden: 'blank cell',
		undefined: 'undefined',
		rows: 'rows',
		columns: 'columns'
	}
};

// ============================================================================
// FORMATAGE
// ============================================================================

/** Arrondi à `decimals` décimales, zéros inutiles retirés, séparateur selon la langue. */
function formatRounded(value: number, decimals: number, locale: ContentLocale): string {
	const factor = 10 ** decimals;
	return formatTick(Math.round(value * factor) / factor, locale);
}

/** `= 15,75` / `≈ 14,44` : la règle du module statistique (Q13) */
function formatIndicatorValue(value: number, locale: ContentLocale): string {
	return formatApproxValue(value, locale);
}

/** Valeur telle qu'écrite par l'auteur : effectif, ou pourcentage. */
function formatValue(value: number, unit: StatChartUnit, locale: ContentLocale): string {
	const text = formatTick(value, locale);
	return unit === 'pourcentages' ? `${text}${STAT_TEXT[locale].percent}` : text;
}

// ============================================================================
// BARRES
// ============================================================================

/** Lignes du tableau d'indicateurs d'un bloc à deux séries, dans l'ordre de l'auteur */
const INDICATOR_ROWS: Record<StatChartIndicator, IndicatorRowId[]> = {
	effectif: ['count'],
	moyenne: ['mean'],
	mediane: ['median'],
	quartiles: ['q1', 'q3'],
	'ecart-interquartile': ['iqr'],
	etendue: ['range'],
	'ecart-type': ['deviation'],
	'classe-mediane': []
};

function buildBarScene(spec: StatChartSpec, locale: ContentLocale): BarScene {
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const height = width * STAT_CHART_ASPECT_RATIO;
	const two = spec.twoSeries;
	const count = spec.data.length;

	// Deux séries (Q116) : effectifs, ou fréquences en % au dixième
	const unit: StatChartUnit = two?.display === 'fréquences' ? 'pourcentages' : spec.unit;
	const shown = (series: 0 | 1, i: number): number => {
		if (two === null) return spec.data[i].value;
		const c = two.counts[series][i];
		if (two.display === 'effectifs') return c;
		const total = two.counts[series].reduce((a, b) => a + b, 0);
		return total === 0 ? 0 : Math.round((1000 * c) / total) / 10;
	};
	const seriesList: (0 | 1)[] = two === null ? [0] : [0, 1];
	const values = seriesList.flatMap((s) => spec.data.map((_, i) => shown(s, i)));
	const maxValue = Math.max(...values) || 1;

	const { yMax, ticks } = valueAxis(maxValue, height, unit, locale);

	const margin = (1 - BAR_WIDTH) / 2;
	const barWidth = BAR_WIDTH / seriesList.length;
	const bars: SceneBar[] = spec.data.flatMap((d, i) =>
		seriesList.map((s) => {
			const left = i + margin + s * barWidth;
			const value = shown(s, i);
			return {
				label: shownLabel(d.label, locale),
				...(two !== null && { series: s }),
				value,
				valueLabel: formatValue(value, unit, locale),
				left,
				right: left + barWidth
			};
		})
	);
	const labels = spec.data.map((d, i) => ({ text: shownLabel(d.label, locale), center: i + 0.5 }));

	const bandPx = width / count;
	const longest = Math.max(...spec.data.map((d) => d.label.length));
	const rotateLabels = count > FLAT_LABELS_MAX || longest * STAT_CHART_CHAR_PX > bandPx;

	const listed = spec.data.map((d, i) =>
		two === null
			? `${shownLabel(d.label, locale)} ${formatValue(d.value, spec.unit, locale)}`
			: `${shownLabel(d.label, locale)} — ${two.names[0]} ${formatValue(shown(0, i), unit, locale)}, ${two.names[1]} ${formatValue(shown(1, i), unit, locale)}`
	);

	let indicatorTable: ComparisonScene | null = null;
	if (two !== null && two.values !== null && spec.indicators.length > 0) {
		const summaries = two.values.map((v, s) => ({
			name: two.names[s],
			summary: describeList(v)
		}));
		if (summaries.every((s) => s.summary !== null)) {
			indicatorTable = buildComparisonScene(
				summaries.map((s) => ({ name: s.name, summary: s.summary! })),
				locale,
				spec.indicators.flatMap((indicator) => INDICATOR_ROWS[indicator])
			);
		}
	}

	return {
		kind: 'barres',
		title: spec.title,
		accessibleTitle: STAT_TEXT[locale].kind.barres,
		description:
			spec.description ??
			`${STAT_TEXT[locale].kind.barres}${STAT_TEXT[locale].colon}${listed.join(two === null ? ', ' : ' ; ')}.`,
		pixelSize: { width, height },
		bars,
		yMax,
		ticks,
		axisTitles: {
			x: spec.axes.x,
			y:
				spec.axes.y ??
				(unit === 'pourcentages' ? STAT_TEXT[locale].axis.relative : STAT_TEXT[locale].axis.count)
		},
		color: spec.color,
		showValues: spec.showValues,
		rotateLabels,
		longestLabel: longest,
		labels,
		legend: two === null ? null : [...two.names],
		// La seconde série dans une autre teinte, hachurée (Q117)
		secondColor: two === null ? null : spec.color === 'orange' ? 'bleu' : 'orange',
		indicatorTable,
		indicators: two === null ? barIndicators(spec, locale) : []
	};
}

/** Axe vertical depuis 0, au pas automatique ; entier pour des effectifs. */
function valueAxis(
	maxValue: number,
	heightPx: number,
	unit: StatChartUnit,
	locale: ContentLocale
): { yMax: number; ticks: SceneTick[] } {
	const automatic = computeGridStep(heightPx / maxValue, { targetPx: TICK_TARGET_PX }).major;
	// Un effectif est entier : un axe « Effectif » gradué en 0,5 serait faux
	// (revue du lot 2). Les pas automatiques valent 1, 2 ou 5 × 10^k : au moins 1 reste propre.
	const step = unit === 'effectifs' ? Math.max(1, automatic || 1) : automatic || maxValue;
	const tickCount = Math.ceil(maxValue / step - 1e-9);
	const ticks = Array.from({ length: tickCount + 1 }, (_, i) => ({
		value: i * step,
		label: formatTick(i * step, locale)
	}));
	return { yMax: tickCount * step, ticks };
}

/** Indicateurs d'une série à effectifs dont les catégories sont des nombres (Q28). */
function barIndicators(spec: StatChartSpec, locale: ContentLocale): string[] {
	if (spec.indicators.length === 0) return [];
	// Fraction.parse lit `0,5` comme `1/3` : la moyenne part des valeurs EXACTES ;
	// au-delà de 15 chiffres, il renonce et la lecture décimale prend le relais
	const values = spec.data.map(
		(d) => Fraction.parse(d.label)?.toNumber() ?? Number(d.label.replace(',', '.'))
	);
	const outcome = summarizeTable(
		values,
		spec.data.map((d) => d.value)
	);
	// Le parseur a vérifié les catégories numériques ; une défaillance ici est un bug
	if (outcome === null || !outcome.ok) return [];
	const s = outcome.value.summary;
	const v = (value: number) => formatIndicatorValue(value, locale);
	return spec.indicators.flatMap((indicator) => {
		switch (indicator) {
			case 'effectif':
				return [STAT_TEXT[locale].total(formatTick(s.count, locale))];
			case 'moyenne':
				return [`${STAT_TEXT[locale].rows.mean} ${v(s.mean)}`];
			case 'mediane':
				return [`${STAT_TEXT[locale].rows.median} ${v(s.median)}`];
			case 'quartiles':
				return [`Q1 ${v(s.q1)}`, `Q3 ${v(s.q3)}`];
			case 'ecart-interquartile':
				return [`${STAT_TEXT[locale].rows.iqr} ${v(s.iqr)}`];
			case 'etendue':
				return [`${STAT_TEXT[locale].rows.range} ${v(s.range)}`];
			case 'ecart-type':
				return [`${STAT_TEXT[locale].rows.deviation} ${v(s.deviation)}`];
			case 'classe-mediane':
				return [];
		}
	});
}

// ============================================================================
// CIRCULAIRE
// ============================================================================

/** Point du cercle unité à `degrees` depuis midi, sens horaire (y vers le haut). */
function onCircle(degrees: number): ScenePoint {
	const radians = (degrees * Math.PI) / 180;
	return { x: Math.sin(radians), y: Math.cos(radians) };
}

function sectorPolygon(start: number, end: number): ScenePoint[] {
	const steps = Math.max(1, Math.ceil((end - start) / ARC_STEP_DEGREES));
	const arc = Array.from({ length: steps + 1 }, (_, i) =>
		onCircle(start + ((end - start) * i) / steps)
	);
	// Un disque entier n'a pas de rayon : passer par le centre tracerait un
	// trait de bordure du centre vers midi
	return end - start >= 360 ? arc : [{ x: 0, y: 0 }, ...arc];
}

/** Valeur affichée par la légende selon `étiquettes:`, ou null (`aucune`). */
function shownValue(
	labels: StatChartLabels,
	value: string,
	percent: string,
	angle: string
): string | null {
	switch (labels) {
		case 'aucune':
			return null;
		case 'effectifs':
			return value;
		case 'angles':
			return angle;
		case 'pourcentages':
			return percent;
	}
}

function scaled(point: ScenePoint, radius: number): ScenePoint {
	return { x: point.x * radius, y: point.y * radius };
}

/**
 * Couleurs des secteurs dessinés, dans l'ordre de la palette, sans que deux
 * voisins se ressemblent — le dernier touche le premier, à midi (Q23).
 */
function sectorColors(count: number): number[] {
	const colors: number[] = [];
	for (let k = 0; k < count; k++) {
		const forbidden = new Set<number>();
		if (k > 0) forbidden.add(colors[k - 1]);
		if (k === count - 1 && k > 0) forbidden.add(colors[0]);
		let color = k % PIE_PALETTE_SIZE;
		while (forbidden.has(color)) color = (color + 1) % PIE_PALETTE_SIZE;
		colors.push(color);
	}
	return colors;
}

/**
 * Écarter les repères extérieurs voisins (Q54) : deux petits secteurs
 * consécutifs plaçaient leurs repères l'un sur l'autre.
 *
 * Chaque groupe de repères trop proches est étalé à pas constant autour de la
 * moyenne de ses angles, dans l'ordre des secteurs ; deux groupes qui se
 * touchent alors fusionnent. Le parcours commence après le plus grand vide,
 * pour qu'un groupe à cheval sur midi ne soit pas coupé en deux.
 *
 * @param angles milieux des secteurs, en degrés depuis midi, croissants
 * @returns les angles des repères, dans le même ordre
 */
function spreadOutsideMarkers(angles: readonly number[]): number[] {
	const n = angles.length;
	if (n < 2) return [...angles];
	// Corde voulue entre deux centres : un diamètre de repère, et un peu d'air
	const chord = 2 * PIE_MARKER_RADIUS * 1.05;
	const wanted = (2 * Math.asin(chord / (2 * MARKER_OUTSIDE_RADIUS)) * 180) / Math.PI;
	// Trop de repères pour le tour : répartis régulièrement, au mieux
	const step = Math.min(wanted, 360 / n);

	let first = 0;
	let widest = -1;
	for (let i = 0; i < n; i++) {
		const gap = (angles[i] - angles[(i + n - 1) % n] + 360) % 360 || 360;
		if (gap > widest) [widest, first] = [gap, i];
	}
	// Le tour, déplié en angles croissants à partir du plus grand vide
	const sequence = Array.from({ length: n }, (_, k) => {
		const index = (first + k) % n;
		const angle = angles[index] < angles[first] ? angles[index] + 360 : angles[index];
		return { index, angle };
	});

	type Cluster = { members: typeof sequence; center: number };
	const half = (c: Cluster) => ((c.members.length - 1) / 2) * step;
	const pack = (items: typeof sequence): Cluster[] => {
		const clusters: Cluster[] = [];
		for (const item of items) {
			clusters.push({ members: [item], center: item.angle });
			while (clusters.length > 1) {
				const [previous, last] = clusters.slice(-2);
				if (last.center - half(last) - (previous.center + half(previous)) >= step - 1e-9) break;
				const members = [...previous.members, ...last.members];
				const center = members.reduce((sum, m) => sum + m.angle, 0) / members.length;
				clusters.splice(-2, 2, { members, center });
			}
		}
		return clusters;
	};

	// La jonction du tour (dernier groupe → premier + 360°) n'est pas revérifiée :
	// au plus 12 catégories (parseur), elle ne se chevauche jamais — un fuzz sur
	// de vrais disques le prouve (scene.test.ts). Au-delà de 15 repères, si.
	const clusters = pack(sequence);

	const result = new Array<number>(n);
	for (const cluster of clusters) {
		cluster.members.forEach((m, j) => {
			const angle = cluster.center + (j - (cluster.members.length - 1) / 2) * step;
			result[m.index] = ((angle % 360) + 360) % 360;
		});
	}
	return result;
}

function buildPieScene(spec: StatChartSpec, locale: ContentLocale): PieScene {
	const width = COURBE_PIXEL_WIDTH[spec.size] * STAT_CHART_ASPECT_RATIO;
	const outcome = categoryFrequencies(spec.data.map((d) => d.value));
	// Le parseur garantit un total > 0 ; une défaillance ici est un bug
	if (outcome === null || !outcome.ok) {
		throw new Error(
			`Diagramme circulaire sans fréquences : ${outcome?.ok === false ? outcome.message : 'vide'}`
		);
	}
	const frequencies = outcome.value;

	const drawn = spec.data.filter((d) => d.value > 0).length;
	const colors = sectorColors(drawn);
	const sectors: SceneSector[] = [];
	const legend: SceneLegendItem[] = [];
	const listed: string[] = [];
	const outsideAngles: { index: number; angle: number }[] = [];
	let start = 0;

	spec.data.forEach((d, i) => {
		const marker = i + 1;
		// Une catégorie sans secteur garde une pastille, sans voisin à éviter
		const colorIndex = d.value > 0 ? colors[sectors.length] : i % PIE_PALETTE_SIZE;
		const sweep = frequencies[i] * 360;
		// Le dernier secteur non nul ferme le cercle exactement
		const isLastNonZero = frequencies.slice(i + 1).every((f) => f === 0);
		const end = isLastNonZero ? 360 : start + sweep;

		const value = formatValue(d.value, spec.unit, locale);
		const percent =
			spec.unit === 'pourcentages'
				? value
				: `${formatRounded(frequencies[i] * 100, 1, locale)}${STAT_TEXT[locale].percent}`;
		const angle = `${formatRounded(sweep, 0, locale)}°`;

		if (d.value > 0) {
			const middle = onCircle((start + end) / 2);
			const inside = end - start >= MARKER_INSIDE_MIN_DEGREES;
			sectors.push({
				label: shownLabel(d.label, locale),
				startAngle: start,
				endAngle: end,
				polygon: sectorPolygon(start, end),
				colorIndex,
				marker,
				markerPosition: scaled(middle, inside ? MARKER_INSIDE_RADIUS : MARKER_OUTSIDE_RADIUS),
				leader: inside ? null : [middle, scaled(middle, LEADER_ELBOW_RADIUS)]
			});
			if (!inside) outsideAngles.push({ index: sectors.length - 1, angle: (start + end) / 2 });
			start = end;
		}

		// Q24 : la description dit ce que la légende affiche, jamais une valeur cachée
		const shown = shownValue(spec.labels, value, percent, angle);
		legend.push({
			label: shownLabel(d.label, locale),
			text:
				shown === null ? shownLabel(d.label, locale) : `${shownLabel(d.label, locale)} — ${shown}`,
			colorIndex,
			marker
		});
		listed.push(
			shown === null ? shownLabel(d.label, locale) : `${shownLabel(d.label, locale)} ${shown}`
		);
	});

	// Les repères extérieurs écartés ; le trait part toujours du milieu du secteur
	const spread = spreadOutsideMarkers(outsideAngles.map((o) => o.angle));
	outsideAngles.forEach(({ index }, k) => {
		const sector = sectors[index];
		const toward = onCircle(spread[k]);
		sector.markerPosition = scaled(toward, MARKER_OUTSIDE_RADIUS);
		sector.leader = [...sector.leader!, sector.markerPosition];
	});

	return {
		kind: 'circulaire',
		title: spec.title,
		accessibleTitle: STAT_TEXT[locale].kind.circulaire,
		description:
			spec.description ??
			`${STAT_TEXT[locale].kind.circulaire}${STAT_TEXT[locale].colon}${listed.join(', ')}.`,
		pixelSize: { width, height: width },
		sectors,
		legend,
		indicators: []
	};
}

// ============================================================================
// CLASSES (histogramme, polygone)
// ============================================================================

function classesOf(data: readonly StatChartDatum[]): StatClass[] {
	return data.map((d) => ({
		lower: d.interval?.lower ?? 0,
		upper: d.interval?.upper ?? 0,
		count: d.value
	}));
}

/** Résumé d'une série en classes : le parseur l'a déjà validée. */
function classSummaryOf(spec: StatChartSpec): ClassSummary {
	const outcome = summarizeClasses(classesOf(spec.data));
	if (outcome === null || !outcome.ok) {
		throw new Error(
			`Série en classes invalide : ${outcome?.ok === false ? outcome.message : 'vide'}`
		);
	}
	return outcome.value;
}

function boundTicks(spec: StatChartSpec, locale: ContentLocale): SceneTick[] {
	const bounds = [
		spec.data[0].interval?.lower ?? 0,
		...spec.data.map((d) => d.interval?.upper ?? 0)
	];
	return bounds.map((value) => ({ value, label: formatTick(value, locale) }));
}

/** Indicateurs d'une série en classes (Q28). */
function classIndicators(
	spec: StatChartSpec,
	summary: ClassSummary,
	locale: ContentLocale
): string[] {
	const v = (value: number) => formatIndicatorValue(value, locale);
	// Série brute connue (`données:`, Q105) : moyenne et médiane EXACTES ; sinon
	// estimées à partir des classes (centres, interpolation)
	const exact = spec.rawValues === null ? null : describeList(spec.rawValues);
	// Q109 : série brute connue, la classe médiane est celle qui CONTIENT la
	// médiane exacte (`4 ; 6` en [0 ; 5[, [5 ; 10[ : médiane 5, classe [5 ; 10[) ;
	// la règle des 50 % la plaçait dans [0 ; 5[, contredisant « Médiane = 5 »
	const containing =
		exact === null
			? -1
			: spec.data.findIndex(
					(d) =>
						d.interval !== null &&
						exact.median >= d.interval.lower &&
						exact.median < d.interval.upper
				);
	const medianClass = containing === -1 ? summary.medianClassIndex : containing;
	return spec.indicators.flatMap((indicator) => {
		switch (indicator) {
			case 'effectif':
				return [STAT_TEXT[locale].total(formatTick(summary.total, locale))];
			case 'moyenne':
				return [`${STAT_TEXT[locale].rows.mean} ${v(exact?.mean ?? summary.mean)}`];
			case 'classe-mediane':
				return [STAT_TEXT[locale].medianClass(shownLabel(spec.data[medianClass].label, locale))];
			case 'mediane':
				return [`${STAT_TEXT[locale].rows.median} ${v(exact?.median ?? summary.estimatedMedian)}`];
			default:
				return [];
		}
	});
}

function buildHistogramScene(spec: StatChartSpec, locale: ContentLocale): HistogramScene {
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const height = width * STAT_CHART_ASPECT_RATIO;
	const summary = classSummaryOf(spec);
	const xMin = summary.classes[0].lower;
	const xMax = summary.classes[summary.classes.length - 1].upper;
	const mode = usesCarreaux(summary.classes, spec.areaLegend !== null) ? 'carreaux' : 'axe';

	const valueLabel = (count: number) => formatValue(count, spec.unit, locale);
	const common = {
		kind: 'histogramme' as const,
		title: spec.title,
		accessibleTitle: STAT_TEXT[locale].kind.histogramme,
		pixelSize: { width, height },
		xMin,
		xMax,
		xTicks: boundTicks(spec, locale),
		color: spec.color,
		showValues: spec.showValues,
		indicators: classIndicators(spec, summary, locale)
	};

	if (mode === 'axe') {
		const maxCount = Math.max(...summary.classes.map((c) => c.count)) || 1;
		const { yMax, ticks } = valueAxis(maxCount, height, spec.unit, locale);
		const listed = spec.data.map((d) => `${shownLabel(d.label, locale)} ${valueLabel(d.value)}`);
		return {
			...common,
			description:
				spec.description ??
				`${STAT_TEXT[locale].kind.histogramme}${STAT_TEXT[locale].colon}${listed.join(', ')}.`,
			rects: summary.classes.map((c, i) => ({
				label: shownLabel(spec.data[i].label, locale),
				lower: c.lower,
				upper: c.upper,
				height: c.count,
				valueLabel: valueLabel(c.count)
			})),
			mode,
			yMax,
			ticks,
			carreau: null,
			grid: { xs: [], ys: ticks.map((t) => t.value) },
			axisTitles: {
				x: spec.axes.x,
				y:
					spec.axes.y ??
					(spec.unit === 'pourcentages'
						? STAT_TEXT[locale].axis.relative
						: STAT_TEXT[locale].axis.count)
			}
		};
	}

	// Amplitudes inégales : l'AIRE porte l'effectif (Q26) — règle partagée avec le parseur
	const outcome = carreauGrid(summary.classes, spec.areaLegend?.value ?? null);
	// Le parseur a refusé un quadrillage démesuré ; une défaillance ici est un bug
	if (!outcome.ok) throw new Error(`Quadrillage refusé : ${outcome.message}`);
	const { width: carreauWidth, value, heights, columns, rows: yMax } = outcome.grid;
	const unitWord =
		spec.areaLegend?.unit ??
		(spec.areaLegend === null && spec.unit === 'pourcentages' ? '%' : null);
	const legend = `${STAT_TEXT[locale].square}${formatTick(value, locale)}${unitWord ? ` ${unitWord}` : ''}`;

	const described = summary.classes.map((c, i) => {
		const across = Math.round(c.width / carreauWidth);
		// Un rectangle très plat ne fait pas « 0 de haut »
		const tall =
			heights[i] > 0 && heights[i] < 0.005
				? STAT_TEXT[locale].lessThan(formatTick(0.01, locale))
				: formatRounded(heights[i], 2, locale);
		const size = STAT_TEXT[locale].squareSize(across, tall);
		return spec.showValues
			? `${shownLabel(spec.data[i].label, locale)}${STAT_TEXT[locale].colon}${valueLabel(c.count)}, ${size}`
			: `${shownLabel(spec.data[i].label, locale)}${STAT_TEXT[locale].colon}${size}`;
	});

	return {
		...common,
		// Q30 : les dimensions visibles, pas les effectifs (sauf `valeurs: oui`)
		description:
			spec.description ??
			`${STAT_TEXT[locale].kind.histogramme}${STAT_TEXT[locale].colon}${described.join(' ; ')} ; ${legend}.`,
		rects: summary.classes.map((c, i) => ({
			label: shownLabel(spec.data[i].label, locale),
			lower: c.lower,
			upper: c.upper,
			height: heights[i],
			valueLabel: valueLabel(c.count)
		})),
		mode,
		yMax,
		ticks: [],
		carreau: { width: carreauWidth, value, legend },
		grid: {
			xs: Array.from({ length: columns + 1 }, (_, i) => xMin + i * carreauWidth),
			ys: Array.from({ length: yMax + 1 }, (_, i) => i)
		},
		axisTitles: { x: spec.axes.x, y: null }
	};
}

// ============================================================================
// DEUX SÉRIES EN CLASSES (lot 5 PR c)
// ============================================================================

/** Couleur de la seconde série : une autre teinte que celle du bloc (Q117) */
function secondColorOf(color: CourbeColor): CourbeColor {
	return color === 'orange' ? 'bleu' : 'orange';
}

/**
 * La spec d'UNE des deux séries : ses effectifs (ou fréquences en % au dixième,
 * Q116) dans les classes communes, sans titre, sans indicateurs.
 */
function seriesSpec(
	spec: StatChartSpec,
	series: 0 | 1,
	frequencies = spec.twoSeries!.display === 'fréquences'
): StatChartSpec {
	const two = spec.twoSeries!;
	const counts = two.counts[series];
	const total = counts.reduce((a, b) => a + b, 0);
	return {
		...spec,
		data: spec.data.map((d, i) => ({
			...d,
			value: frequencies
				? total === 0
					? 0
					: Math.round((1000 * counts[i]) / total) / 10
				: counts[i]
		})),
		unit: frequencies ? 'pourcentages' : 'effectifs',
		title: null,
		description: null,
		indicators: [],
		twoSeries: null,
		rawValues: two.values?.[series] ?? null,
		series: null
	};
}

/**
 * Tableau d'indicateurs de deux séries en classes (Q118) : ceux de `.comparer`
 * (moyenne, médiane EXACTES), et la classe médiane — celle qui contient la
 * médiane (Q109) — dans l'ordre de l'auteur.
 */
function classIndicatorTable(spec: StatChartSpec, locale: ContentLocale): ComparisonScene | null {
	const two = spec.twoSeries!;
	if (spec.indicators.length === 0 || two.values === null) return null;
	const summaries = two.values.map((values) => describeList(values));
	if (summaries.some((s) => s === null)) return null;
	const named = summaries.map((summary, i) => ({ name: two.names[i], summary: summary! }));
	const table = buildComparisonScene(
		named,
		locale,
		spec.indicators.flatMap((indicator) => INDICATOR_ROWS[indicator])
	);
	const medianClass = named.map(({ summary }) => {
		const found = spec.data.find(
			(d) =>
				d.interval !== null &&
				summary.median >= d.interval.lower &&
				summary.median < d.interval.upper
		);
		return found ? shownLabel(found.label, locale) : '';
	});
	const rows = spec.indicators.flatMap((indicator) =>
		indicator === 'classe-mediane'
			? [
					{
						id: 'medianClass' as const,
						header: STAT_TEXT[locale].rows.medianClass,
						cells: medianClass,
						groupStart: false
					}
				]
			: table.rows.filter((row) => INDICATOR_ROWS[indicator].includes(row.id))
	);
	return { ...table, rows };
}

/** Deux histogrammes l'un au-dessus de l'autre : mêmes classes, même échelle */
function buildTwoHistograms(spec: StatChartSpec, locale: ContentLocale): HistogramScene {
	const two = spec.twoSeries!;
	const [a, b] = ([0, 1] as const).map((s) => buildHistogramScene(seriesSpec(spec, s), locale));
	// Même échelle verticale : celle du plus haut des deux
	const top = a.yMax >= b.yMax ? a : b;
	const scale = { yMax: top.yMax, ticks: top.ticks, grid: top.grid };
	// Chaque histogramme nomme et décrit SA série (revue a11y : B était lu deux
	// fois, la seconde sans son nom)
	const named = (scene: HistogramScene, name: string) => ({
		accessibleTitle: `${STAT_TEXT[locale].kind.histogramme} — ${name}`,
		description: `${scene.description.replace(/\.$/, '')} (${name}).`
	});
	return {
		...a,
		...scale,
		...named(a, two.names[0]),
		...(spec.description !== null && { description: spec.description }),
		title: spec.title,
		seriesName: two.names[0],
		second: {
			...b,
			...scale,
			...named(b, two.names[1]),
			seriesName: two.names[1],
			hatched: true,
			hatchColor: secondColorOf(spec.color)
		},
		indicatorTable: classIndicatorTable(spec, locale),
		indicators: []
	};
}

/** Deux polygones sur les mêmes axes, le second en pointillés */
function buildTwoPolygons(spec: StatChartSpec, locale: ContentLocale): CumulativeScene {
	const two = spec.twoSeries!;
	// Effectifs bruts : le polygone normalise lui-même ; des fréquences arrondies
	// au dixième déplaçaient les lectures selon la série voisine (revue)
	const [a, b] = ([0, 1] as const).map((s) =>
		buildCumulativeScene(seriesSpec(spec, s, false), locale)
	);
	return {
		...a,
		title: spec.title,
		description:
			spec.description ??
			`${a.description.replace(/\.$/, '')} (${two.names[0]}) ; ${b.description.replace(/\.$/, '')} (${two.names[1]}).`,
		legend: [...two.names],
		second: { points: b.points, readings: b.readings, color: secondColorOf(spec.color) },
		indicatorTable: classIndicatorTable(spec, locale),
		indicators: []
	};
}

function buildCumulativeScene(spec: StatChartSpec, locale: ContentLocale): CumulativeScene {
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const height = width * STAT_CHART_ASPECT_RATIO;
	const summary = classSummaryOf(spec);
	const rows = summary.classes;
	const xMin = rows[0].lower;
	const xMax = rows[rows.length - 1].upper;
	const increasing = spec.direction === 'croissantes';

	// Croissantes : bornes droites depuis (première borne ; 0) ; décroissantes :
	// bornes gauches jusqu'à (dernière borne ; 0) (Q27)
	const points: ScenePoint[] = increasing
		? [{ x: xMin, y: 0 }, ...rows.map((r) => ({ x: r.upper, y: r.cumulativeFrequency * 100 }))]
		: [
				...rows.map((r) => ({ x: r.lower, y: r.decreasingCumulativeFrequency * 100 })),
				{ x: xMax, y: 0 }
			];

	const wanted: { name: SceneReading['name']; percent: number }[] =
		spec.reading === 'quartiles'
			? [
					{ name: 'Q1', percent: 25 },
					{ name: 'Me', percent: 50 },
					{ name: 'Q3', percent: 75 }
				]
			: spec.reading === 'médiane'
				? [{ name: 'Me', percent: 50 }]
				: [];
	const classes = classesOf(spec.data);
	const readings = wanted.flatMap(({ name, percent }) => {
		const outcome = estimateClassQuantile(classes, percent);
		if (outcome === null || !outcome.ok) return [];
		return [
			{
				name,
				// Sur le polygone décroissant, Q1 laisse 75 % des données au-dessus
				percent: increasing ? percent : 100 - percent,
				x: outcome.value,
				text: `${STAT_TEXT[locale].reading[name]} ${formatIndicatorValue(outcome.value, locale)}`
			}
		];
	});

	const listed = points.map((p) =>
		STAT_TEXT[locale].vertex(formatRounded(p.y, 1, locale), formatTick(p.x, locale))
	);
	// « Me » est prononcé « mé » par les lecteurs d'écran : en toutes lettres ici
	const spoken = readings.map((r) =>
		r.name === 'Me' ? r.text.replace(/^\S+/, STAT_TEXT[locale].medianSpoken) : r.text
	);
	const read = spoken.length > 0 ? ` ${spoken.join(', ')}.` : '';
	const title = STAT_TEXT[locale].polygonTitle(spec.direction);

	return {
		kind: 'frequences-cumulees',
		title: spec.title,
		accessibleTitle: STAT_TEXT[locale].kind['frequences-cumulees'],
		description:
			spec.description ?? `${title}${STAT_TEXT[locale].colon}${listed.join(', ')}.${read}`,
		pixelSize: { width, height },
		xMin,
		xMax,
		points,
		xTicks: boundTicks(spec, locale),
		ticks: Array.from({ length: 11 }, (_, i) => ({
			value: i * 10,
			label: formatTick(i * 10, locale)
		})),
		readings,
		direction: spec.direction,
		axisTitles: { x: spec.axes.x, y: spec.axes.y ?? STAT_TEXT[locale].axis.cumulative },
		color: spec.color,
		indicators: classIndicators(spec, summary, locale)
	};
}

// ============================================================================
// TABLEAU CROISÉ
// ============================================================================

function buildCrossTableScene(spec: StatChartSpec, locale: ContentLocale): CrossTableScene {
	const table = spec.table;
	if (table === null) throw new Error('Tableau croisé sans données');
	const { rows, columns, cells, showTotals, display } = table;

	// `?` vaut 0 pour le calcul ; les totaux qui en dépendent seront cachés
	const outcome = crossTable(
		cells.map((row) => row.map((value) => value ?? 0)),
		display
	);
	// Le parseur a vérifié le tableau ; une défaillance ici est un bug
	if (outcome === null || !outcome.ok) {
		throw new Error(
			`Tableau croisé invalide : ${outcome?.ok === false ? outcome.message : 'vide'}`
		);
	}
	const values = outcome.value;

	const unknownInRow = cells.map((row) => row.some((value) => value === null));
	const unknownInColumn = columns.map((_, j) => cells.some((row) => row[j] === null));
	const anyUnknown = unknownInRow.some(Boolean);
	const isMasked = (row: string, column: string) =>
		table.masked.some((m) => m.row === row && m.column === column);

	const spoken = CROSS_TABLE_SPOKEN[locale];
	const cell = (row: string, column: string, value: number | null, unknown: boolean): SceneCell => {
		if (unknown || isMasked(row, column)) return { text: '', hidden: true, srText: null };
		// Fréquence non définie (ligne ou colonne toute nulle) : « — » est muet
		if (value === null) return { text: '—', hidden: false, srText: spoken.undefined };
		const text =
			display === 'effectifs'
				? formatValue(value, spec.unit, locale)
				: `${formatRounded(value * 100, 1, locale)}${STAT_TEXT[locale].percent}`;
		return { text, hidden: false, srText: null };
	};
	// `Sexe \ Régime` : le « \ » serait lu « barre oblique inversée »
	const cornerParts = table.corner?.split('\\').map((part) => part.trim()) ?? [];
	const cornerSpoken =
		table.corner === null
			? null
			: cornerParts.length === 2 && cornerParts.every((part) => part !== '')
				? `${spoken.rows}${STAT_TEXT[locale].colon}${cornerParts[0]}, ${spoken.columns}${STAT_TEXT[locale].colon}${cornerParts[1]}`
				: table.corner;

	const bodyRows = rows.map((name, i) => {
		const line = columns.map((column, j) =>
			cell(name, column, values.cells[i][j], cells[i][j] === null)
		);
		if (showTotals) line.push(cell(name, TOTAL, values.rowTotals[i], unknownInRow[i]));
		return { header: name, cells: line };
	});
	if (showTotals) {
		const totals = columns.map((column, j) =>
			cell(TOTAL, column, values.columnTotals[j], unknownInColumn[j])
		);
		totals.push(cell(TOTAL, TOTAL, values.total, anyUnknown));
		bodyRows.push({ header: TOTAL, cells: totals });
	}

	return {
		kind: 'tableau-croise',
		title: spec.title,
		accessibleTitle: spoken.title,
		// Un <table> se décrit lui-même (en-têtes de lignes et de colonnes)
		description: spec.description ?? spoken.title,
		pixelSize: { width: 0, height: 0 },
		indicators: [],
		corner: table.corner,
		cornerSpoken,
		hiddenLabel: spoken.hidden,
		columnHeaders: showTotals ? [...columns, TOTAL] : [...columns],
		rows: bodyRows
	};
}

// ============================================================================
// LOI D'UNE VARIABLE ALÉATOIRE
// ============================================================================

/** Un nombre seul, ou une fraction d'entiers, tel qu'une catégorie peut l'écrire */
const NUMERIC_LABEL = /^[-−]?\d+(?:[.,]\d+)?$|^[-−]?\d+\/\d+$/;

/** `[−5 ; 2,5[` : une classe, ses deux bornes */
const CLASS_LABEL = /^\[(.+) ; (.+)\[$/;

/**
 * Nom de catégorie AFFICHÉ (Q110) : un nombre ou une classe s'écrit selon la
 * langue du document (séparateur décimal, vrai signe moins), comme le tableau
 * d'une loi ; un mot reste tel quel. Les données (et les indicateurs, qui
 * relisent les noms) ne changent pas.
 */
function shownLabel(label: string, locale: ContentLocale): string {
	const number = (text: string) => asWritten(text.replace('−', '-'), locale);
	if (NUMERIC_LABEL.test(label)) return number(label);
	const bounds = CLASS_LABEL.exec(label);
	if (bounds && NUMERIC_LABEL.test(bounds[1]) && NUMERIC_LABEL.test(bounds[2])) {
		return `[${number(bounds[1])} ; ${number(bounds[2])}[`;
	}
	return label;
}

/** Un nombre tel qu'écrit par l'auteur : vrai signe moins, séparateur selon la langue. */
function asWritten(text: string, locale: ContentLocale): string {
	const minus = text.replace(/^-/, '−');
	if (minus.includes('/')) return minus;
	return locale === 'en' ? minus.replace(',', '.') : minus.replace('.', ',');
}

/**
 * Une fraction de dénominateur 2^a·5^b écrite en décimal EXACT (np, np(1 − p)
 * pour un p décimal), selon la langue.
 */
function exactDecimal(value: Fraction, locale: ContentLocale): string {
	// Le moins de décimales qui tombe juste (au plus 40 : un p décimal en a 15)
	let places = 0;
	while (places < 40 && (value.num * 10n ** BigInt(places)) % value.den !== 0n) places++;
	const magnitude = value.num < 0n ? -value.num : value.num;
	// En chaîne, sans flottant : un V à 27 chiffres garde tous ses chiffres
	const { digits } = roundExact(magnitude, value.den, places);
	const text = locale === 'en' ? digits : digits.replace('.', ',');
	return value.num < 0n ? `−${text}` : text;
}

/** Caractères d'une ligne horizontale de loi binomiale au plus (valeurs × « 0,028 ») */
const BINOMIAL_ROW_CHARACTERS = 40;

/** Un arrondi exact écrit selon la langue ; exact : sans zéros inutiles (`0,5`) */
function roundedText(num: bigint, den: bigint, places: number, locale: ContentLocale) {
	const { digits, exact } = roundExact(num, den, places);
	const text = exact ? formatStatNumber(Number(digits), locale) : digits;
	return { text: locale === 'en' ? text : text.replace('.', ','), exact };
}

/** Le niveau d'un intervalle et α/2, en fractions */
function intervalParts(binomial: NonNullable<LawData['binomial']>) {
	const level = Fraction.parse(binomial.interval ?? '') ?? Fraction.ONE;
	return { level, half: Fraction.ONE.sub(level).mul(new Fraction(1n, 2n)) };
}

/** `intervalle:` (Q140) : I et P(X ∈ I), puis la règle qui a choisi a et b */
function intervalLines(
	distribution: BinomialDistribution,
	binomial: NonNullable<LawData['binomial']>,
	variable: string,
	locale: ContentLocale
): string[] {
	if (binomial.interval === null) return [];
	const { level, half } = intervalParts(binomial);
	const { a, b, num, den } = binomialInterval(distribution, level);
	const shownLevel = exactDecimal(level, locale);
	// Au moins les décimales du niveau : « ≈ 0,97 ⩾ 0,971 » se lisait faux (revue)
	const levelPlaces = shownLevel.split(/[.,]/)[1]?.length ?? 0;
	const { text, exact } = roundedText(num, den, Math.max(binomial.places, levelPlaces), locale);
	const sign = exact ? '=' : '≈';
	const shownHalf = exactDecimal(half, locale);
	return locale === 'en'
		? [
				`I = [${a}, ${b}]: P(${variable} ∈ I) ${sign} ${text} ⩾ ${shownLevel}`,
				`a and b chosen so that P(${variable} < a) ⩽ ${shownHalf} and P(${variable} > b) ⩽ ${shownHalf}`
			]
		: [
				`I = [${a} ; ${b}] : P(${variable} ∈ I) ${sign} ${text} ⩾ ${shownLevel}`,
				`a et b choisis pour que P(${variable} < a) ⩽ ${shownHalf} et P(${variable} > b) ⩽ ${shownHalf}`
			];
}

/** `seuil:` (Q140, surréservation) : le plus petit (ou le plus grand) k */
function thresholdLines(
	distribution: BinomialDistribution,
	binomial: NonNullable<LawData['binomial']>,
	variable: string,
	locale: ContentLocale
): string[] {
	const threshold = binomial.threshold;
	if (threshold === null) return [];
	const alpha = Fraction.parse(threshold.alpha) ?? Fraction.ZERO;
	const result = binomialThreshold(distribution, threshold.event, threshold.comparison, alpha);
	return [thresholdLine(threshold, result, String(binomial.n), variable, binomial.places, locale)];
}

/** Un entier avec séparateur de milliers : « 1 000 » / « 1,000 » (espace ordinaire) */
function thousands(value: number, locale: ContentLocale): string {
	const text = value.toLocaleString('en-US');
	return locale === 'en' ? text : text.replace(/,/g, ' ');
}

/**
 * La ligne d'un seuil, toutes lois (binomiale, géométrique) : « plus petit k
 * tel que … : k = 14 (P(X > 14) ≈ 0,044) », ou « aucun k de 0 à `last` … »
 */
function thresholdLine(
	threshold: LawThreshold,
	{ k, smallest, num, den, beyond }: ThresholdResult,
	last: string,
	variable: string,
	places: number,
	locale: ContentLocale
): string {
	const shownAlpha = asWritten(threshold.alpha, locale);
	const condition = `P(${variable} ${threshold.event} k) ${threshold.comparison} ${shownAlpha}`;
	// Tous les k cherchés conviennent : le plus grand est au-delà (loi géométrique, revue)
	if (beyond) {
		return locale === 'en'
			? `every k from 0 to ${last} satisfies ${condition} (the largest is beyond ${last})`
			: `tous les k de 0 à ${last} vérifient ${condition} (le plus grand est au-delà de ${last})`;
	}
	if (k === null) {
		return locale === 'en'
			? `no k from 0 to ${last} satisfies ${condition}`
			: `aucun k de 0 à ${last} ne vérifie ${condition}`;
	}
	const { text, exact } = roundedText(num, den, places, locale);
	const reached = `P(${variable} ${threshold.event} ${k}) ${exact ? '=' : '≈'} ${text}`;
	return locale === 'en'
		? `${smallest ? 'smallest' : 'largest'} k such that ${condition}: k = ${k} (${reached})`
		: `plus ${smallest ? 'petit' : 'grand'} k tel que ${condition} : k = ${k} (${reached})`;
}

/**
 * Les bâtons d'une loi (binomiale, géométrique, uniforme), hauteur P(X = k),
 * une probabilité EXACTE par valeur, arrondie seulement pour la description
 */
function lawBars(
	spec: StatChartSpec,
	labels: readonly string[],
	exact: readonly { num: bigint; den: bigint }[],
	places: number,
	variable: string,
	locale: ContentLocale
): BarScene {
	const chartSpec: StatChartSpec = {
		...spec,
		kind: 'barres',
		data: exact.map(({ num, den }, i) => ({
			label: labels[i],
			value: new Fraction(num, den).toNumber() || Number(num) / Number(den),
			interval: null,
			line: 0
		})),
		unit: 'effectifs',
		title: null,
		description: null,
		axes: { x: null, y: locale === 'en' ? 'Probability' : 'Probabilité' },
		showValues: false,
		indicators: [],
		law: null,
		twoSeries: null,
		series: null,
		rawValues: null
	};
	const built = buildBarScene(chartSpec, locale);
	// Un axe de PROBABILITÉS : gradué en décimaux (celui des barres, fait pour des
	// effectifs entiers, montait à 1 et écrasait les bâtons — fiche compilée)
	const max = Math.max(...built.bars.map((bar) => bar.value)) || 1;
	// `pourcentages` : seulement pour lever le pas minimal de 1 des effectifs (pas de « % »)
	const { yMax, ticks } = valueAxis(max, built.pixelSize.height, 'pourcentages', locale);
	// Des numéros courts tiennent à plat, même nombreux
	const longest = Math.max(...labels.map((label) => label.length));
	const bandPx = built.pixelSize.width / built.labels.length;
	// « P(X = 3) ≈ 0,267 » : lu sans ambiguïté (« 3 0,267, 4 0,200 » mêlait les virgules, revue)
	const shown = exact.map(({ num, den }, i) => {
		const { text, exact: isExact } = roundedText(num, den, places, locale);
		return `P(${variable} = ${labels[i]}) ${isExact ? '=' : '≈'} ${text}`;
	});
	return {
		...built,
		yMax,
		ticks,
		rotateLabels: longest * STAT_CHART_CHAR_PX > bandPx,
		description: `${STAT_TEXT[locale].kind.barres}${STAT_TEXT[locale].colon}${shown.join(' ; ')}.`
	};
}

/**
 * `diagramme: oui` : les bâtons de la loi, hauteur P(X = k) ; avec
 * `intervalle:`, ceux de I en couleur, les autres en gris (Q140)
 */
function binomialChart(
	spec: StatChartSpec,
	distribution: BinomialDistribution,
	binomial: NonNullable<LawData['binomial']>,
	variable: string,
	locale: ContentLocale
): BarScene {
	const scene = lawBars(
		spec,
		distribution.numerators.map((_, k) => String(k)),
		distribution.numerators.map((num) => ({ num, den: distribution.denominator })),
		binomial.places,
		variable,
		locale
	);
	if (binomial.interval === null) return scene;
	const { a, b } = binomialInterval(distribution, intervalParts(binomial).level);
	return {
		...scene,
		bars: scene.bars.map((bar, k) => ({ ...bar, highlighted: k >= a && k <= b }))
	};
}

/**
 * Loi binomiale (`X ~ B(n ; p)`, manche 11) : le tableau P(X = k) arrondi,
 * E / V / σ par les formules, puis les lignes `probabilités:` — tout en
 * valeurs exactes, arrondies à l'affichage seulement.
 */
function buildBinomialScene(spec: StatChartSpec, law: LawData, locale: ContentLocale): LawScene {
	const binomial = law.binomial!;
	const p = Fraction.parse(binomial.p) ?? Fraction.ZERO;
	const distribution = binomialDistribution(binomial.n, p);
	const shownP = asWritten(binomial.p, locale);
	const tableHidden = law.values.length > STAT_CHART_LIMITS.binomialTableValues;
	const text = STAT_TEXT[locale].law;
	const name = text.binomial(binomial.n, shownP);
	// B(1 ; p) : la loi de Bernoulli (manche 13)
	const title = text.title(law.variable, binomial.n === 1 ? `${name} (${text.bernoulli})` : name);
	const moments = binomialMoments(distribution);
	// p écrit en décimal : E et V aussi, sans fraction géante (revue : « 6172839450617/50000000000 »)
	const decimalP = /[.,]/.test(binomial.p);
	const momentLine = (indicator: (typeof law.indicators)[number]): string => {
		if (!decimalP || indicator === 'ecart-type') {
			return formatLawIndicators(law.variable, moments, locale, [indicator])[0];
		}
		const value = indicator === 'esperance' ? moments.expectation : moments.variance;
		const name = indicator === 'esperance' ? 'E' : 'V';
		return `${name}(${law.variable}) = ${exactDecimal(value, locale)}`;
	};
	const indicators = [
		...law.indicators.map(momentLine),
		...intervalLines(distribution, binomial, law.variable, locale),
		...thresholdLines(distribution, binomial, law.variable, locale),
		...binomial.queries.map((query) =>
			queryLine(
				query.display,
				binomialProbability(distribution, (k) => k >= query.low && k <= query.high),
				binomial.places,
				locale
			)
		)
	];
	return {
		kind: 'loi',
		title: spec.title,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators,
		variable: law.variable,
		values: law.values,
		// Pas de tableau au-delà de 30 valeurs : rien à arrondir (revue)
		probabilities: (tableHidden ? [] : distribution.numerators).map((num, k) =>
			law.masked.includes(k)
				? { text: '', hidden: true, srText: null }
				: {
						text: roundedText(num, distribution.denominator, binomial.places, locale).text,
						hidden: false,
						srText: null
					}
		),
		hiddenLabel: CROSS_TABLE_SPOKEN[locale].hidden,
		tableHidden,
		...(binomial.chart &&
			!tableHidden && { chart: binomialChart(spec, distribution, binomial, law.variable, locale) }),
		// À l'horizontale, une ligne doit tenir dans une colonne de fiche : la
		// largeur compte, pas seulement le nombre de valeurs (« 0,0156 » × 7
		// débordait, B(10 ; p) au millième aussi — mesuré sur la fiche compilée)
		vertical: law.values.length * (binomial.places + 3) > BINOMIAL_ROW_CHARACTERS
	};
}

/** Une ligne de `probabilités:` : le texte normalisé selon la langue, = ou ≈ */
function queryLine(
	display: string,
	{ num, den }: { num: bigint; den: bigint },
	places: number,
	locale: ContentLocale
): string {
	const { text, exact } = roundedText(num, den, places, locale);
	const shown = locale === 'en' ? display.replace(/,/g, '.') : display.replace(/\./g, ',');
	return `${shown} ${exact ? '=' : '≈'} ${text}`;
}

/**
 * E, V, σ d'une loi nommée : p écrit en fraction → la fraction (formatLawIndicators) ;
 * p écrit en décimal → le décimal exact s'il tombe juste (comme la loi
 * binomiale), sinon la valeur approchée SEULE : pas de fraction géante
 * (« 50000000000000/6172839450617 », revue)
 */
function namedMomentLines(
	law: LawData,
	moments: RandomVariableLaw,
	decimal: boolean,
	locale: ContentLocale
): string[] {
	return law.indicators.map((indicator) => {
		const value =
			indicator === 'esperance'
				? moments.expectation
				: indicator === 'variance'
					? moments.variance
					: null;
		if (!decimal || value === null) {
			return formatLawIndicators(law.variable, moments, locale, [indicator])[0];
		}
		const name = indicator === 'esperance' ? 'E' : 'V';
		if (!value.isDecimal()) {
			// Toujours ≈ : formatApproxValue dirait « = 8,1 » pour 8,1000000000006
			return `${name}(${law.variable}) ≈ ${formatStatNumber(Math.round(value.toNumber() * 100) / 100, locale)}`;
		}
		return `${name}(${law.variable}) = ${exactDecimal(value, locale)}`;
	});
}

/** Les cases P(X = k) arrondies d'une loi nommée ; `masquer:` les vide */
function namedCells(
	law: LawData,
	exact: readonly { num: bigint; den: bigint }[],
	places: number,
	locale: ContentLocale
): SceneCell[] {
	return exact.map(({ num, den }, i) =>
		law.masked.includes(i)
			? { text: '', hidden: true, srText: null }
			: { text: roundedText(num, den, places, locale).text, hidden: false, srText: null }
	);
}

/**
 * Loi géométrique (`X ~ G(p)`, manche 13) : le tableau k = 1 à `jusqu'à:`,
 * puis « … » ; E par défaut ; probabilités exactes, P(X > a | X > b) compris ;
 * les bâtons coupés au même k, avec la mention des valeurs non représentées.
 */
function buildGeometricScene(spec: StatChartSpec, law: LawData, locale: ContentLocale): LawScene {
	const geometric = law.geometric!;
	const p = Fraction.parse(geometric.p) ?? Fraction.ONE;
	const text = STAT_TEXT[locale].law;
	const title = text.title(law.variable, text.geometric(asWritten(geometric.p, locale)));
	const exact = law.values.map((_, i) => geometricProbability(p, i + 1, i + 1));
	const queries = geometric.queries.map((query) => {
		const exactValue =
			query.given === null
				? geometricProbability(p, query.low, query.high)
				: // P(X ⩾ low | X ⩾ given) = q^(low − given) : la loi est sans mémoire
					geometricConditional(p, query.low, query.given);
		return queryLine(query.display, exactValue, geometric.places, locale);
	});
	const ellipsis: SceneCell = { text: '…', hidden: false, srText: null };
	return {
		kind: 'loi',
		title: spec.title,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators: [
			...namedMomentLines(law, geometricMoments(p), /[.,%]/.test(geometric.p), locale),
			// `seuil:` (manche 14) : k cherché de 0 à 1 000
			...(geometric.threshold === null
				? []
				: [
						thresholdLine(
							geometric.threshold,
							geometricThreshold(
								p,
								geometric.threshold.event,
								geometric.threshold.comparison,
								Fraction.parse(geometric.threshold.alpha) ?? Fraction.ZERO
							),
							thousands(GEOMETRIC_MAX_K, locale),
							law.variable,
							geometric.places,
							locale
						)
					]),
			...queries
		],
		variable: law.variable,
		values: [...law.values, '…'],
		probabilities: [...namedCells(law, exact, geometric.places, locale), ellipsis],
		hiddenLabel: CROSS_TABLE_SPOKEN[locale].hidden,
		tableHidden: false,
		...(geometric.chart && {
			chart: lawBars(spec, law.values, exact, geometric.places, law.variable, locale),
			chartNote: text.notShown
		}),
		vertical: (law.values.length + 1) * (geometric.places + 3) > BINOMIAL_ROW_CHARACTERS
	};
}

/** `{1, …, 6}` ; deux ou trois valeurs : toutes (`{0, 1}`) */
function uniformSet(a: number, b: number, locale: ContentLocale): string {
	const shown = (k: number) => asWritten(String(k), locale);
	const listed =
		b - a <= 2
			? Array.from({ length: b - a + 1 }, (_, i) => shown(a + i))
			: [shown(a), '…', shown(b)];
	return `{${listed.join(', ')}}`;
}

/** Loi uniforme (`X ~ U(a ; b)`, manche 13) : comme la loi binomiale, valeurs a à b */
function buildUniformScene(spec: StatChartSpec, law: LawData, locale: ContentLocale): LawScene {
	const uniform = law.uniform!;
	const text = STAT_TEXT[locale].law;
	const title = text.title(law.variable, text.uniform(uniformSet(uniform.a, uniform.b, locale)));
	const tableHidden = law.values.length > STAT_CHART_LIMITS.binomialTableValues;
	const one = uniformProbability(uniform.a, uniform.b, uniform.a, uniform.a);
	const exact = tableHidden ? [] : law.values.map(() => one);
	const values = law.values.map((v) => asWritten(v, locale));
	return {
		kind: 'loi',
		title: spec.title,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators: [
			...namedMomentLines(law, uniformMoments(uniform.a, uniform.b), false, locale),
			...uniform.queries.map((query) =>
				queryLine(
					query.display,
					uniformProbability(uniform.a, uniform.b, query.low, query.high),
					uniform.places,
					locale
				)
			)
		],
		variable: law.variable,
		values,
		probabilities: namedCells(law, exact, uniform.places, locale),
		hiddenLabel: CROSS_TABLE_SPOKEN[locale].hidden,
		tableHidden,
		...(uniform.chart &&
			!tableHidden && {
				chart: lawBars(spec, values, exact, uniform.places, law.variable, locale)
			}),
		vertical:
			values.reduce((width, v) => width + Math.max(v.length, uniform.places + 2) + 1, 0) >
			BINOMIAL_ROW_CHARACTERS
	};
}

// ============================================================================
// LOIS À DENSITÉ (manche 13, PR b)
// ============================================================================

/** Points de la courbe exponentielle, et de son aire */
const DENSITY_SAMPLES = 60;

/** Arrondi « joli » vers le haut : 1, 2, 2,5 ou 5 × 10^k (9,2 → 10) */
function niceCeil(value: number): number {
	const power = 10 ** Math.floor(Math.log10(value));
	const factor = [1, 2, 2.5, 5, 10].find((m) => m * power >= value - 1e-9) ?? 10;
	return Number((factor * power).toPrecision(12));
}

/** Une fraction positive écrite : décimal exact (`1,5`), sinon `2/3` */
function fractionText(value: Fraction, locale: ContentLocale): string {
	return value.isDecimal() ? exactDecimal(value, locale) : formatFraction(value);
}

/** Le texte d'un événement selon la langue (`P(X > 7,5)` / `P(X > 7.5)`) */
function shownEvent(display: string, locale: ContentLocale): string {
	return locale === 'en' ? display.replace(/,/g, '.') : display.replace(/\./g, ',');
}

/** « = 3/10 = 0,3 », « = 1/3 ≈ 0,333 », « = 0 » */
function exactProbabilityText(value: Fraction, places: number, locale: ContentLocale): string {
	if (value.den === 1n) return `= ${value.num}`;
	if (value.isDecimal()) return `= ${formatFraction(value)} = ${exactDecimal(value, locale)}`;
	return `= ${formatFraction(value)} ≈ ${roundedText(value.num, value.den, places, locale).text}`;
}

/** Une valeur approchée de l'exponentielle, arrondie une seule fois */
function approxText(value: number, places: number, locale: ContentLocale): string {
	if (value <= 0) return '= 0';
	if (value >= 1) return '= 1';
	const text = value.toFixed(places);
	return `≈ ${locale === 'en' ? text : text.replace('.', ',')}`;
}

/** Bornes numériques d'un événement de loi à densité ; la conditionnelle : {X > a} */
function eventBounds(query: DensityQuery): { low: number; high: number } {
	const read = (text: string | null, fallback: number) =>
		text === null ? fallback : (Fraction.parse(text)?.toNumber() ?? fallback);
	return { low: read(query.low, -Infinity), high: read(query.high, Infinity) };
}

/**
 * Une ligne écrite avec `e^(…)` découpée en texte / exposant (parenthèses
 * imbriquées comprises : « e^(−0,5 × (5 − 2)) »), et sa lecture
 */
function exponentParts(line: string, locale: ContentLocale): IndicatorLine {
	const segments: IndicatorLine['segments'] = [];
	let spoken = '';
	let rest = line;
	for (let start = rest.indexOf('e^('); start !== -1; start = rest.indexOf('e^(')) {
		let depth = 1;
		let end = start + 3;
		for (; end < rest.length && depth > 0; end++) {
			if (rest[end] === '(') depth++;
			else if (rest[end] === ')') depth--;
		}
		const before = rest.slice(0, start + 1);
		const exponent = rest.slice(start + 3, end - 1);
		segments.push({ text: before, exponent: false }, { text: exponent, exponent: true });
		const read = exponent.includes(' ') ? `(${exponent})` : exponent;
		spoken += `${before} ${STAT_TEXT[locale].law.power} ${read}`;
		rest = rest.slice(end);
	}
	if (rest !== '') segments.push({ text: rest, exponent: false });
	return { segments, spoken: spoken + rest };
}

/**
 * Une ligne de l'exponentielle : la forme exacte, puis la valeur approchée
 * (« P(X ⩽ 2) = 1 − e^(−0,5 × 2) = 1 − e^(−1) ≈ 0,632 »).
 */
function exponentialLine(
	query: DensityQuery,
	lambdaText: string,
	variable: string,
	places: number,
	locale: ContentLocale
): string {
	const display = shownEvent(query.display, locale);
	if (query.point) return `${display} = 0 (${STAT_TEXT[locale].law.pointZero(variable)})`;
	const lambda = Fraction.parse(lambdaText) ?? Fraction.ONE;
	const shownLambda = asWritten(lambdaText, locale);
	const showProduct = !lambda.equals(Fraction.ONE);
	const positive = (text: string | null) => {
		const value = text === null ? null : Fraction.parse(text);
		return value === null || value.isNegative() ? Fraction.ZERO : value;
	};
	// e^(−λt) : le produit écrit, puis l'exposant calculé
	const term = (written: string, t: Fraction) => ({
		product: `e^(−${shownLambda} × ${asWritten(written, locale)})`,
		simple: `e^(−${fractionText(lambda.mul(t), locale)})`
	});
	const join = (parts: { product: string; simple: string }[], ones: boolean) => {
		const prefix = ones ? '1 − ' : '';
		const glue = (key: 'product' | 'simple') => prefix + parts.map((p) => p[key]).join(' − ');
		return showProduct ? `${glue('product')} = ${glue('simple')}` : glue('simple');
	};

	if (query.given !== null) {
		const a = positive(query.low);
		const b = positive(query.given);
		// Condition toujours vraie (b ⩽ 0) : c'est P(X > a), écrit comme tel
		// (« e^(−0,5 × (3 − −1)) » donnait une égalité fausse, revue)
		if (b.equals(Fraction.ZERO)) {
			return exponentialLine({ ...query, given: null }, lambdaText, variable, places, locale);
		}
		const value = Math.exp(-lambda.toNumber() * a.sub(b).toNumber());
		if (!a.greaterThan(b)) return `${display} = 1`;
		const difference = `(${asWritten(query.low!, locale)} − ${asWritten(query.given, locale)})`;
		const simple = `e^(−${fractionText(lambda.mul(a.sub(b)), locale)})`;
		const exact = showProduct ? `e^(−${shownLambda} × ${difference}) = ${simple}` : simple;
		return `${display} = ${exact} ${approxText(value, places, locale)}`;
	}

	const low = positive(query.low);
	const high = query.high === null ? null : Fraction.parse(query.high);
	const value = exponentialProbability(lambda.toNumber(), low.toNumber(), high?.toNumber() ?? null);
	if (high !== null && !high.greaterThan(low)) return `${display} = 0`;
	const startsAtZero = low.equals(Fraction.ZERO);
	if (startsAtZero && high === null) return `${display} = 1`;
	const parts: { product: string; simple: string }[] = [];
	if (!startsAtZero) parts.push(term(query.low!, low));
	if (high !== null) parts.push(term(query.high!, high));
	return `${display} = ${join(parts, startsAtZero)} ${approxText(value, places, locale)}`;
}

/** F d'une loi uniforme : « (x − 2)/3 », « x/10 » */
function uniformCdf(a: Fraction, b: Fraction, locale: ContentLocale): string {
	const length = b.sub(a);
	const shift = a.isNegative() ? new Fraction(-a.num, a.den) : a;
	const numerator = a.equals(Fraction.ZERO)
		? 'x'
		: `x ${a.isNegative() ? '+' : '−'} ${fractionText(shift, locale)}`;
	if (length.equals(Fraction.ONE)) return numerator;
	const top = numerator === 'x' ? 'x' : `(${numerator})`;
	const bottom = fractionText(length, locale);
	return `${top}/${bottom.includes('/') ? `(${bottom})` : bottom}`;
}

/** F d'une exponentielle : l'exposant « −0,5x », « −x », « −(1/3)x » */
function exponentialCdf(lambdaText: string, locale: ContentLocale): string {
	const lambda = Fraction.parse(lambdaText) ?? Fraction.ONE;
	if (lambda.equals(Fraction.ONE)) return '−x';
	const shown = asWritten(lambdaText, locale);
	return shown.includes('/') ? `−(${shown})x` : `−${shown}x`;
}

/**
 * L'événement hachuré et sa valeur, pour le lecteur d'écran : une
 * conditionnelle hachure {X > a} (« P(X > 5) ≈ 0,082 », revue)
 */
function areaEvent(density: NonNullable<LawData['density']>, locale: ContentLocale): string {
	const area = density.area!;
	const event: DensityQuery = { ...area, given: null };
	const display = shownEvent(
		area.given === null ? area.display : `${area.display.slice(0, area.display.indexOf(' |'))})`,
		locale
	);
	if (area.point) return `${display} = 0`;
	const read = (value: string | null) => (value === null ? null : Fraction.parse(value));
	if (density.law.family === 'uniform') {
		const a = Fraction.parse(density.law.a) ?? Fraction.ZERO;
		const b = Fraction.parse(density.law.b) ?? Fraction.ONE;
		const value = uniformDensityProbability(a, b, read(event.low), read(event.high));
		return `${display} ${exactProbabilityText(value, density.places, locale)}`;
	}
	const lambda = Fraction.parse(density.law.lambda)?.toNumber() ?? 1;
	const value = exponentialProbability(
		lambda,
		read(event.low)?.toNumber() ?? null,
		read(event.high)?.toNumber() ?? null
	);
	return `${display} ${approxText(value, density.places, locale)}`;
}

/** La courbe de densité et l'aire hachurée, en unités de la loi */
function densityChart(
	spec: StatChartSpec,
	density: NonNullable<LawData['density']>,
	variable: string,
	locale: ContentLocale
): DensityScene {
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const height = width * STAT_CHART_ASPECT_RATIO;
	const law = density.law;
	let xMin: number;
	let xMax: number;
	let top: number;
	let points: ScenePoint[];
	let support: { low: number; high: number };
	let curve: (x: number) => number;
	if (law.family === 'uniform') {
		const a = Fraction.parse(law.a)?.toNumber() ?? 0;
		const b = Fraction.parse(law.b)?.toNumber() ?? 1;
		top = 1 / (b - a);
		const margin = (b - a) * 0.2;
		// Un peu de marge de part et d'autre ; pas sous 0 pour une loi qui part de 0 ou plus
		xMin = a >= 0 && a - margin < 0 ? 0 : a - margin;
		xMax = b + margin;
		points = [
			...(xMin < a ? [{ x: xMin, y: 0 }] : []),
			{ x: a, y: 0 },
			{ x: a, y: top },
			{ x: b, y: top },
			{ x: b, y: 0 },
			{ x: xMax, y: 0 }
		];
		support = { low: a, high: b };
		curve = () => top;
	} else {
		const lambda = Fraction.parse(law.lambda)?.toNumber() ?? 1;
		top = lambda;
		xMin = 0;
		// Coupée où il reste moins de 1 % : x = ln(100)/λ, arrondi joliment vers le haut
		xMax = niceCeil(Math.log(100) / lambda);
		points = Array.from({ length: DENSITY_SAMPLES + 1 }, (_, i) => {
			const x = (i / DENSITY_SAMPLES) * xMax;
			return { x, y: exponentialDensity(lambda, x) };
		});
		support = { low: 0, high: Infinity };
		curve = (x) => exponentialDensity(lambda, x);
	}
	const { yMax, ticks } = valueAxis(top, height, 'pourcentages', locale);
	const step =
		computeGridStep(width / (xMax - xMin), { targetPx: TICK_TARGET_PX }).major || xMax - xMin;
	const first = Math.ceil(xMin / step - 1e-9);
	const xTicks: SceneTick[] = [];
	for (let k = first; k * step <= xMax + 1e-9; k++) {
		const value = Number((k * step).toPrecision(12));
		xTicks.push({ value, label: formatTick(value, locale) });
	}

	let area: ScenePoint[] | null = null;
	if (density.area !== null && !density.area.point) {
		const { low, high } = eventBounds(density.area);
		const from = Math.max(low, support.low, xMin);
		const to = Math.min(high, support.high, xMax);
		if (to > from) {
			const count = law.family === 'uniform' ? 1 : Math.ceil(DENSITY_SAMPLES / 2);
			const edge = Array.from({ length: count + 1 }, (_, i) => {
				const x = from + ((to - from) * i) / count;
				return { x, y: curve(x) };
			});
			area = [{ x: from, y: 0 }, ...edge, { x: to, y: 0 }];
		}
	}

	const text = STAT_TEXT[locale];
	const shaded =
		density.area === null ? '' : ` ; ${text.law.shadedArea(areaEvent(density, locale))}`;
	return {
		kind: 'densite',
		title: null,
		accessibleTitle: text.law.densityCurve,
		description: `${text.law.densityCurve} (${variable})${shaded}.`,
		pixelSize: { width, height },
		indicators: [],
		xMin,
		xMax,
		yMax,
		points,
		area,
		xTicks,
		ticks,
		axisTitles: { x: null, y: text.law.density },
		color: spec.color
	};
}

/**
 * Loi à densité (`X ~ U([a ; b])`, `X ~ E(λ)`, manche 13, PR b) : pas de
 * tableau ; E par défaut, F sur demande, puis les probabilités ; la courbe.
 */
function buildDensityScene(spec: StatChartSpec, law: LawData, locale: ContentLocale): LawScene {
	const density = law.density!;
	const text = STAT_TEXT[locale].law;
	let name: string;
	let moments: RandomVariableLaw;
	let decimal: boolean;
	let cdf: string;
	let lines: string[];
	if (density.law.family === 'uniform') {
		const { a: aText, b: bText } = density.law;
		const a = Fraction.parse(aText) ?? Fraction.ZERO;
		const b = Fraction.parse(bText) ?? Fraction.ONE;
		const interval =
			locale === 'en'
				? `[${asWritten(aText, locale)}, ${asWritten(bText, locale)}]`
				: `[${asWritten(aText, locale)} ; ${asWritten(bText, locale)}]`;
		name = text.uniformDensity(interval);
		moments = uniformDensityMoments(a, b);
		// Bornes écrites en décimal : E et V aussi, comme l'exponentielle et la binomiale (revue)
		decimal = /[.,]/.test(aText + bText);
		cdf = text.cdfUniform(uniformCdf(a, b, locale), interval);
		const read = (value: string | null) => (value === null ? null : Fraction.parse(value));
		lines = density.queries.map((query) => {
			const display = shownEvent(query.display, locale);
			if (query.point) return `${display} = 0 (${text.pointZero(law.variable)})`;
			const event = uniformDensityProbability(a, b, read(query.low), read(query.high));
			const value =
				query.given === null
					? event
					: event.mul(
							((given) => new Fraction(given.den, given.num))(
								uniformDensityProbability(a, b, read(query.given), null)
							)
						);
			return `${display} ${exactProbabilityText(value, density.places, locale)}`;
		});
	} else {
		const lambdaText = density.law.lambda;
		const lambda = Fraction.parse(lambdaText) ?? Fraction.ONE;
		name = text.exponential(asWritten(lambdaText, locale));
		moments = exponentialMoments(lambda);
		decimal = /[.,%]/.test(lambdaText);
		cdf = text.cdfExponential(exponentialCdf(lambdaText, locale));
		lines = density.queries.map((query) =>
			exponentialLine(query, lambdaText, law.variable, density.places, locale)
		);
	}
	const title = text.title(law.variable, name);
	const indicators = [
		...namedMomentLines(law, moments, decimal, locale),
		...(density.cdf ? [cdf] : []),
		...lines
	];
	return {
		kind: 'loi',
		title: spec.title,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators,
		// De vrais exposants à l'écran et dans le PDF (fiche compilée : « e^(−1) » en clair)
		...(indicators.some((line) => line.includes('e^(')) && {
			indicatorParts: indicators.map((line) => exponentParts(line, locale))
		}),
		variable: law.variable,
		values: [],
		probabilities: [],
		hiddenLabel: CROSS_TABLE_SPOKEN[locale].hidden,
		tableHidden: true,
		...(density.chart && { densityChart: densityChart(spec, density, law.variable, locale) })
	};
}

function buildLawScene(spec: StatChartSpec, locale: ContentLocale): LawScene {
	const law = spec.law;
	if (law === null) throw new Error('Loi sans données');
	if (law.binomial !== null) return buildBinomialScene(spec, law, locale);
	if (law.geometric !== null) return buildGeometricScene(spec, law, locale);
	if (law.uniform !== null) return buildUniformScene(spec, law, locale);
	if (law.density !== null) return buildDensityScene(spec, law, locale);
	const spoken = CROSS_TABLE_SPOKEN[locale];

	let indicators: string[] = [];
	if (law.indicators.length > 0) {
		// Le parseur a refusé les indicateurs avec une probabilité « ? »
		const values = law.values.map((v) => Fraction.parse(v) ?? Fraction.ZERO);
		const probabilities = law.probabilities.map((p) => Fraction.parse(p ?? '') ?? Fraction.ZERO);
		const outcome = randomVariable(values, probabilities);
		if (outcome === null || !outcome.ok) {
			throw new Error(`Loi invalide : ${outcome?.ok === false ? outcome.message : 'vide'}`);
		}
		indicators = formatLawIndicators(law.variable, outcome.value, locale, law.indicators);
	}

	const title = locale === 'en' ? `Distribution of ${law.variable}` : `Loi de ${law.variable}`;
	return {
		kind: 'loi',
		title: spec.title,
		accessibleTitle: title,
		description: title,
		pixelSize: { width: 0, height: 0 },
		indicators,
		variable: law.variable,
		values: law.values.map((v) => asWritten(v, locale)),
		probabilities: law.probabilities.map((p, i) =>
			p === null || law.masked.includes(i)
				? { text: '', hidden: true, srText: null }
				: { text: asWritten(p, locale), hidden: false, srText: null }
		),
		hiddenLabel: spoken.hidden
	};
}

// ============================================================================
// TABLEAU D'EFFECTIFS (Q125-Q129)
// ============================================================================

/** Au-delà, le tableau passe à la verticale (Q127) */
const FREQUENCY_TABLE_MAX_COLUMNS = 12;
/** … ou au-delà de 60 caractères de libellés en tout */
const FREQUENCY_TABLE_MAX_CHARACTERS = 60;

function buildFrequencyTableScene(spec: StatChartSpec, locale: ContentLocale): FrequencyTableScene {
	const table = spec.frequencyTable;
	if (table === null) throw new Error('Tableau d’effectifs sans lignes');
	const text = STAT_TEXT[locale];
	const counts = spec.data.map((d) => d.value);
	const total = counts.reduce((a, b) => a + b, 0);
	const increasing = table.direction === 'croissantes';

	// Cumuls : croissants depuis la première valeur, décroissants depuis la dernière
	const running: number[] = [];
	counts.reduce((sum, c) => (running.push(sum + c), sum + c), 0);
	const cumulated = increasing ? running : counts.map((_, i) => total - (running[i - 1] ?? 0));

	const frequency = (part: number) => {
		const f = total === 0 ? 0 : part / total;
		// « Au centième » : toujours deux décimales (0,50), une colonne alignée (revue)
		return table.decimals
			? f.toFixed(2).replace('.', locale === 'en' ? '.' : ',')
			: `${formatRounded(f * 100, 1, locale)}${text.percent}`;
	};
	const totalCell = (row: (typeof table.rows)[number]): string => {
		if (row === 'effectifs') return formatTick(total, locale);
		if (row === 'fréquences') {
			return table.decimals ? (locale === 'en' ? '1.00' : '1,00') : `100${text.percent}`;
		}
		return '';
	};
	const rows = table.rows.map((row) => {
		const cells = counts.map((c, i) => {
			switch (row) {
				case 'effectifs':
					return formatTick(c, locale);
				case 'fréquences':
					return frequency(c);
				case 'effectifs cumulés':
					return formatTick(cumulated[i], locale);
				case 'fréquences cumulées':
					return frequency(cumulated[i]);
			}
		});
		const all = table.showTotals ? [...cells, totalCell(row)] : cells;
		const hidden = all.map((_, i) =>
			table.masked.some(
				(m) => m.row === row && (m.column === 'total' ? i === counts.length : m.column === i)
			)
		);
		return {
			header: text.frequencyTable.row(row, table.direction),
			cells: all.map((cell, i) => (hidden[i] ? '' : cell)),
			hidden
		};
	});

	const labels = spec.data.map((d) => shownLabel(d.label, locale));
	const columns = table.showTotals ? [...labels, text.frequencyTable.total] : labels;
	return {
		kind: 'effectifs',
		title: spec.title,
		accessibleTitle: text.frequencyTable.title,
		description: spec.description ?? text.frequencyTable.title,
		pixelSize: { width: 0, height: 0 },
		// Q131 : la ligne sous le tableau, comme les barres ou l'histogramme
		indicators:
			spec.indicators.length === 0
				? []
				: table.classes
					? classIndicators(spec, classSummaryOf(spec), locale)
					: barIndicators(spec, locale),
		hiddenLabel: CROSS_TABLE_SPOKEN[locale].hidden,
		caption: spec.title ?? text.frequencyTable.title,
		valueHeader: table.classes ? text.frequencyTable.classes : text.frequencyTable.value,
		columns,
		rows,
		// Vertical au-delà de 12 valeurs, ou si les libellés ne tiendraient pas en
		// largeur (ils ne se coupent pas : classes « [1000 ; 1200[ », revue)
		vertical:
			labels.length > FREQUENCY_TABLE_MAX_COLUMNS ||
			labels.reduce((sum, l) => sum + l.length, 0) > FREQUENCY_TABLE_MAX_CHARACTERS,
		emptyLabel: text.frequencyTable.notApplicable
	};
}

// ============================================================================
// SIMULATION
// ============================================================================

const SIMULATION_TEXT: Record<
	ContentLocale,
	{
		caption: (draws: string, plural: boolean, seed: number) => string;
		headers: SimulationScene['headers'];
	}
> = {
	fr: {
		caption: (draws, plural, seed) =>
			`Simulation de ${draws} tirage${plural ? 's' : ''} (graine ${seed})`,
		headers: { count: 'Effectif', frequency: 'Fréquence observée', probability: 'Probabilité' }
	},
	en: {
		caption: (draws, plural, seed) =>
			`Simulation of ${draws} draw${plural ? 's' : ''} (seed ${seed})`,
		// Q122 : *frequency* = effectif, *relative frequency* = fréquence
		headers: {
			count: 'Frequency',
			frequency: 'Observed relative frequency',
			probability: 'Probability'
		}
	}
};

/** 10000 → « 10 000 » (espace insécable) ou « 10,000 » */
function groupedCount(value: number, locale: ContentLocale): string {
	const separator = locale === 'en' ? ',' : '\u00a0';
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Un réel au millième, écrit selon la langue (moyennes, σ, marge) */
function thousandth(value: number, locale: ContentLocale): string {
	// `Math.round`, pas `toFixed` : 287/80 = 3,5875 donnait 3,587 (revue)
	return formatStatNumber(Math.round(value * 1000) / 1000, locale);
}

/** Ligne écrite sous la figure : la graine qui refait les mêmes tirages */
function seedLine(seed: number, locale: ContentLocale): string {
	return locale === 'en' ? `seed ${seed}` : `graine ${seed}`;
}

/**
 * Mode `moyenne` (lot 3 PR b) : la moyenne des tirages selon leur nombre et la
 * droite E(X) — le graphique de `.fréquence` dans l'atelier.
 */
function buildSimulatedMeanScene(
	spec: StatChartSpec,
	simulation: SimulationData,
	sampler: LawSampler,
	locale: ContentLocale
): MeanScene {
	const n = simulation.draws;
	const outcome = simulateLawRunningMean(sampler, n, createRandomSource(simulation.seed));
	if (!outcome.ok) throw new Error(`Simulation impossible : ${outcome.message}`);
	const { means, expectation } = outcome.value;
	const exact = formatFraction(expectation);
	const last = thousandth(means[n - 1], locale);
	const count = groupedCount(n, locale);
	const summary =
		locale === 'en'
			? `${n === 1 ? 'mean of the single draw' : `mean of the ${count} draws`}: ${last}; expectation E(${simulation.variable}) = ${exact}`
			: `${n === 1 ? 'moyenne du seul tirage' : `moyenne des ${count} tirages`} : ${last} ; espérance E(${simulation.variable}) = ${exact}`;
	return {
		...buildRunningMeanScene(means, expectation.toNumber(), exact, locale),
		title: spec.title,
		indicators: [summary, seedLine(simulation.seed, locale)]
	};
}

/**
 * Mode `échantillons` (lot 3 PR b) : l'histogramme des moyennes de N
 * échantillons de taille n, classes de μ ± 2σ/√n en couleur — le graphique de
 * `.échantillons` dans l'atelier.
 */
function buildSimulatedSamplesScene(
	spec: StatChartSpec,
	simulation: SimulationData,
	sampler: LawSampler,
	locale: ContentLocale
): HistogramScene {
	const N = simulation.samples;
	const outcome = simulateLawSamples(
		sampler,
		N,
		simulation.sampleSize,
		createRandomSource(simulation.seed)
	);
	if (!outcome.ok) throw new Error(`Simulation impossible : ${outcome.message}`);
	const { means, expectation, deviation, margin, within } = outcome.value;
	const exact = formatFraction(expectation);
	const sigma = thousandth(deviation, locale);
	const gap = thousandth(margin, locale);
	const total = groupedCount(N, locale);
	const k = groupedCount(within, locale);
	const interval = '[μ − 2σ/√n ; μ + 2σ/√n]';
	const lines =
		locale === 'en'
			? [
					`μ = ${exact}; σ ≈ ${sigma}; 2σ/√n ≈ ${gap}`,
					`${k} ${within === 1 ? 'sample' : 'samples'} out of ${total} ${within === 1 ? 'has' : 'have'} a mean in ${interval}`
				]
			: [
					`μ = ${exact} ; σ ≈ ${sigma} ; 2σ/√n ≈ ${gap}`,
					// 0 et 1 au singulier, en français
					`${k} ${within > 1 ? 'échantillons' : 'échantillon'} sur ${total} ${within > 1 ? 'ont' : 'a'} une moyenne dans ${interval}`
				];
	return {
		...buildSampleMeansScene(means, expectation.toNumber(), margin, locale),
		title: spec.title,
		indicators: [...lines, seedLine(simulation.seed, locale)]
	};
}

/** Une loi nommée (manche 14) : son tirage par inversion, et E, V, σ */
function namedSampler(named: SimulatedNamedLaw): LawSampler {
	const read = (text: string, fallback: Fraction) => Fraction.parse(text) ?? fallback;
	switch (named.family) {
		case 'geometric':
			return geometricSampler(read(named.p, Fraction.ONE));
		case 'uniform':
			return uniformSampler(named.a, named.b);
		case 'uniform-density':
			return uniformDensitySampler(read(named.a, Fraction.ZERO), read(named.b, Fraction.ONE));
		case 'exponential':
			return exponentialSampler(read(named.lambda, Fraction.ONE));
	}
}

/** Le tableau du mode `tirages` : une ligne par valeur (effectif, fréquence, probabilité) */
function simulationTable(
	spec: StatChartSpec,
	simulation: SimulationData,
	rows: { value: string; count: number; probability: string }[],
	locale: ContentLocale
): SimulationScene {
	const text = SIMULATION_TEXT[locale];
	const n = simulation.draws;
	const caption = text.caption(groupedCount(n, locale), n > 1, simulation.seed);
	// Toujours trois décimales : une colonne de fréquences se lit alignée.
	// Arrondi en millièmes ENTIERS : `toFixed` sur 3/80 = 0,0375 rendait 0,037
	// (le flottant est un peu sous le demi), revue de la PR
	const frequency = (count: number) => {
		const thousandths = Math.round((count * 1000) / n);
		const fraction = String(thousandths % 1000).padStart(3, '0');
		return `${Math.floor(thousandths / 1000)}${locale === 'en' ? '.' : ','}${fraction}`;
	};
	return {
		kind: 'simulation',
		title: spec.title,
		accessibleTitle: caption,
		description: caption,
		pixelSize: { width: 0, height: 0 },
		indicators: [],
		variable: simulation.variable,
		caption,
		headers: text.headers,
		rows: rows.map((row) => ({
			value: row.value,
			count: groupedCount(row.count, locale),
			frequency: frequency(row.count),
			probability: row.probability
		}))
	};
}

/**
 * G(p) et U(a ; b) en mode `tirages` (manche 14) : les effectifs des tirages
 * par inversion ; G s'arrête à `jusqu'à:` puis « 11 ou plus », de probabilité
 * EXACTE (1 − p)^10 arrondie au millième.
 */
function namedDiscreteTable(
	spec: StatChartSpec,
	simulation: SimulationData,
	named: Extract<SimulatedNamedLaw, { family: 'geometric' | 'uniform' }>,
	sampler: LawSampler,
	locale: ContentLocale
): SimulationScene {
	const outcome = simulateDraws(sampler, simulation.draws, createRandomSource(simulation.seed));
	if (!outcome.ok) throw new Error(`Simulation impossible : ${outcome.message}`);
	const draws = outcome.value;
	const probability = ({ num, den }: { num: bigint; den: bigint }) =>
		roundedText(num, den, 3, locale).text;
	if (named.family === 'uniform') {
		const { a, b } = named;
		const counts = new Array<number>(b - a + 1).fill(0);
		for (const x of draws) counts[x - a]++;
		return simulationTable(
			spec,
			simulation,
			counts.map((count, i) => ({
				value: asWritten(String(a + i), locale),
				count,
				probability: probability(uniformProbability(a, b, a + i, a + i))
			})),
			locale
		);
	}
	const p = Fraction.parse(named.p) ?? Fraction.ONE;
	const counts = new Array<number>(named.upTo + 1).fill(0);
	for (const x of draws) counts[Math.min(x, named.upTo + 1) - 1]++;
	return simulationTable(
		spec,
		simulation,
		counts.map((count, i) => {
			const k = i + 1;
			const last = k > named.upTo;
			return {
				value: last ? STAT_TEXT[locale].simulation.orMore(String(k)) : String(k),
				count,
				probability: probability(geometricProbability(p, k, last ? null : k))
			};
		}),
		locale
	);
}

/**
 * U([a ; b]) et E(λ) en mode `tirages` (manche 14) : l'histogramme des tirages
 * EN DENSITÉ (fréquence / amplitude, aire totale 1), en classes égales — U : de
 * a à b ; E : de 0 à la borne de l'axe de la courbe, la dernière classe prenant
 * tout ce qui dépasse — et la courbe de densité du bloc ```loi par-dessus.
 */
function buildDensityDrawsScene(
	spec: StatChartSpec,
	simulation: SimulationData,
	named: Extract<SimulatedNamedLaw, { family: 'uniform-density' | 'exponential' }>,
	sampler: LawSampler,
	locale: ContentLocale
): HistogramScene {
	const n = simulation.draws;
	const outcome = simulateDraws(sampler, n, createRandomSource(simulation.seed));
	if (!outcome.ok) throw new Error(`Simulation impossible : ${outcome.message}`);
	const draws = outcome.value;
	const uniform = named.family === 'uniform-density';
	// La courbe du bloc ```loi : mêmes points, même cadre, même couleur
	const curve = densityChart(
		spec,
		{
			law: uniform
				? { family: 'uniform', a: named.a, b: named.b }
				: { family: 'exponential', lambda: named.lambda },
			places: 3,
			queries: [],
			chart: true,
			area: null,
			cdf: false
		},
		simulation.variable,
		locale
	);
	const low = uniform ? (Fraction.parse(named.a)?.toNumber() ?? 0) : 0;
	const high = uniform ? (Fraction.parse(named.b)?.toNumber() ?? 1) : curve.xMax;
	const classes = named.classes;
	const width = (high - low) / classes;
	const counts = new Array<number>(classes).fill(0);
	for (const x of draws) {
		counts[Math.min(classes - 1, Math.max(0, Math.floor((x - low) / width)))]++;
	}
	const bound = (i: number) => (i === classes ? high : Number((low + i * width).toPrecision(12)));
	const rects: SceneRect[] = counts.map((count, i) => {
		const [lower, upper] = [bound(i), bound(i + 1)];
		const last = i === classes - 1;
		const closing = !last
			? `${formatTick(upper, locale)}[`
			: uniform
				? `${formatTick(upper, locale)}]`
				: '+∞[';
		return {
			label: `[${formatTick(lower, locale)} ; ${closing}`,
			lower,
			upper,
			// Hauteur = fréquence / amplitude : l'aire du rectangle est la fréquence
			height: count / n / (upper - lower),
			valueLabel: groupedCount(count, locale)
		};
	});

	const { yMax, ticks } = valueAxis(
		Math.max(...curve.points.map((p) => p.y), ...rects.map((r) => r.height)),
		curve.pixelSize.height,
		'pourcentages',
		locale
	);
	const text = STAT_TEXT[locale];
	const mean = draws.reduce((sum, x) => sum + x, 0) / n;
	const beyond = draws.filter((x) => x > high).length;
	return {
		kind: 'histogramme',
		title: spec.title,
		accessibleTitle: text.simulation.histogram,
		description: text.simulation.histogramDescription(
			groupedCount(n, locale),
			rects.map((r) => `${r.label} ${thousandth(r.height, locale)}`).join(', ')
		),
		pixelSize: curve.pixelSize,
		indicators: [
			text.simulation.summary(
				groupedCount(n, locale),
				n > 1,
				thousandth(mean, locale),
				simulation.variable,
				fractionText(sampler.law.expectation, locale)
			),
			...(uniform ? [] : [text.simulation.overflow(formatTick(high, locale), String(beyond))]),
			seedLine(simulation.seed, locale)
		],
		xMin: curve.xMin,
		xMax: curve.xMax,
		rects,
		mode: 'axe',
		yMax,
		ticks,
		xTicks: curve.xTicks,
		carreau: null,
		grid: { xs: [], ys: ticks.map((t) => t.value) },
		axisTitles: { x: null, y: text.law.density },
		color: spec.color,
		showValues: false,
		densityCurve: { points: curve.points, color: curve.color }
	};
}

function buildSimulationScene(spec: StatChartSpec, locale: ContentLocale): StatChartScene {
	const simulation = spec.simulation;
	if (simulation === null) throw new Error('Simulation sans données');
	const named = simulation.named;
	// Loi binomiale (PR b) : les probabilités exactes, sans passer par du texte
	// (leurs dénominateurs dépassent les 15 chiffres de `Fraction.parse`)
	const binomial =
		simulation.binomial === null
			? null
			: binomialDistribution(
					simulation.binomial.n,
					Fraction.parse(simulation.binomial.p) ?? Fraction.ZERO
				);
	const law = {
		values: simulation.values.map((v) => Fraction.parse(v) ?? Fraction.ZERO),
		probabilities:
			binomial === null
				? simulation.probabilities.map((p) => Fraction.parse(p) ?? Fraction.ZERO)
				: binomial.numerators.map((num) => new Fraction(num, binomial.denominator))
	};
	if (simulation.mode !== 'tirages') {
		// Lois nommées (manche 14) : tirées par inversion ; les autres, par leurs probabilités
		const discrete = named === null ? discreteSampler(law.values, law.probabilities) : null;
		if (discrete !== null && !discrete.ok) {
			throw new Error(`Simulation impossible : ${discrete.message}`);
		}
		const sampler = discrete === null ? namedSampler(named!) : discrete.value;
		return simulation.mode === 'moyenne'
			? buildSimulatedMeanScene(spec, simulation, sampler, locale)
			: buildSimulatedSamplesScene(spec, simulation, sampler, locale);
	}
	if (named !== null) {
		const sampler = namedSampler(named);
		return named.family === 'geometric' || named.family === 'uniform'
			? namedDiscreteTable(spec, simulation, named, sampler, locale)
			: buildDensityDrawsScene(spec, simulation, named, sampler, locale);
	}
	const outcome = simulateCounts(
		law.values,
		law.probabilities,
		simulation.draws,
		createRandomSource(simulation.seed)
	);
	if (!outcome.ok) throw new Error(`Simulation impossible : ${outcome.message}`);
	return simulationTable(
		spec,
		simulation,
		simulation.values.map((value, i) => ({
			value: asWritten(value, locale),
			count: outcome.value.counts[i],
			probability:
				binomial === null
					? asWritten(simulation.probabilities[i], locale)
					: roundedText(binomial.numerators[i], binomial.denominator, 3, locale).text
		})),
		locale
	);
}

// ============================================================================
// SCÈNE
// ============================================================================

/**
 * `série:` (Q106) : « Série : 12 ; −3 ; 12,5 », les nombres écrits selon la
 * langue (vrai signe moins, séparateur décimal), les mots tels quels.
 */
function seriesText(spec: StatChartSpec, locale: ContentLocale): string | null {
	if (spec.series === null) return null;
	// Une ligne par série (deux séries, Q118) ; espace insécable avant « ; » (et
	// « : ») : une ligne ne commence jamais par « ; »
	return spec.series.lines
		.map((line) => {
			const values = line.values.map((v) =>
				v.numeric ? asWritten(v.text.replaceAll('−', '-'), locale) : v.text
			);
			const name = line.name ?? (locale === 'en' ? 'Data' : 'Série');
			return `${name}${locale === 'en' ? ': ' : '\u00a0: '}${values.join('\u00a0; ')}`;
		})
		.join('\n');
}

export function buildStatChartScene(
	spec: StatChartSpec,
	options: StatChartSceneOptions = {}
): StatChartScene {
	const locale = options.locale ?? 'fr';
	const scene = buildKindScene(spec, locale);
	// `série: seule` : l'énoncé — la série, ni figure ni indicateurs
	const seriesOnly = spec.series?.mode === 'seule';
	return {
		...scene,
		series: seriesText(spec, locale),
		seriesOnly,
		indicators: seriesOnly ? [] : scene.indicators
	};
}

function buildKindScene(spec: StatChartSpec, locale: ContentLocale): StatChartScene {
	switch (spec.kind) {
		case 'barres':
			return buildBarScene(spec, locale);
		case 'circulaire':
			return buildPieScene(spec, locale);
		case 'histogramme':
			return spec.twoSeries === null
				? buildHistogramScene(spec, locale)
				: buildTwoHistograms(spec, locale);
		case 'frequences-cumulees':
			return spec.twoSeries === null
				? buildCumulativeScene(spec, locale)
				: buildTwoPolygons(spec, locale);
		case 'tableau-croise':
			return buildCrossTableScene(spec, locale);
		case 'loi':
			return buildLawScene(spec, locale);
		case 'simulation':
			return buildSimulationScene(spec, locale);
		case 'effectifs':
			return buildFrequencyTableScene(spec, locale);
	}
}
