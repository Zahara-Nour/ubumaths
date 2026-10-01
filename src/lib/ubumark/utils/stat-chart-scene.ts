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
	StatChartDatum,
	StatChartDirection,
	StatChartLabels,
	StatChartSpec,
	StatChartUnit
} from '../types/stat-chart';
import type { CourbeColor } from '../types/courbe';
import type { ContentLocale } from '$lib/types/locale';
import { computeGridStep } from '$lib/geometry-core/viewport/grid';
import { categoryFrequencies, summarizeTable } from '$lib/statistics/describe';
import {
	estimateClassQuantile,
	summarizeClasses,
	type ClassSummary,
	type StatClass
} from '$lib/statistics/classes';
import { COURBE_PIXEL_WIDTH, formatTick } from './courbe-scene';
import { carreauGrid, usesCarreaux } from './stat-chart-carreaux';
import { crossTable } from '$lib/statistics/cross-table';

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
}

export interface SceneBar {
	label: string;
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
	/** Trait du bord du disque vers un repère placé dehors, sinon null */
	leader: [ScenePoint, ScenePoint] | null;
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

export type StatChartScene =
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
const LEADER_END_RADIUS = 1.1;

/** Pas d'échantillonnage des arcs, en degrés */
const ARC_STEP_DEGREES = 3;

const KIND_TITLE = {
	barres: 'Diagramme en barres',
	circulaire: 'Diagramme circulaire',
	histogramme: 'Histogramme',
	'frequences-cumulees': 'Polygone des fréquences cumulées',
	'tableau-croise': 'Tableau croisé'
} as const;

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
		title: 'Contingency table',
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

/** `= 15,75` si la valeur est exacte à 2 décimales, sinon `≈ 14,44` (Q13). */
function formatIndicatorValue(value: number, locale: ContentLocale): string {
	const rounded = Math.round(value * 100) / 100;
	const exact = Math.abs(rounded - value) <= 1e-9 * Math.max(1, Math.abs(value));
	return `${exact ? '=' : '≈'} ${formatTick(rounded, locale)}`;
}

/** Valeur telle qu'écrite par l'auteur : effectif, ou pourcentage. */
function formatValue(value: number, unit: StatChartUnit, locale: ContentLocale): string {
	const text = formatTick(value, locale);
	return unit === 'pourcentages' ? `${text} %` : text;
}

// ============================================================================
// BARRES
// ============================================================================

function buildBarScene(spec: StatChartSpec, locale: ContentLocale): BarScene {
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const height = width * STAT_CHART_ASPECT_RATIO;
	const values = spec.data.map((d) => d.value);
	const maxValue = Math.max(...values) || 1;

	const { yMax, ticks } = valueAxis(maxValue, height, spec.unit, locale);

	const margin = (1 - BAR_WIDTH) / 2;
	const bars = spec.data.map((d, i) => ({
		label: d.label,
		value: d.value,
		valueLabel: formatValue(d.value, spec.unit, locale),
		left: i + margin,
		right: i + 1 - margin
	}));

	const bandPx = width / spec.data.length;
	const longest = Math.max(...spec.data.map((d) => d.label.length));
	const rotateLabels = spec.data.length > FLAT_LABELS_MAX || longest * STAT_CHART_CHAR_PX > bandPx;

	const listed = spec.data.map((d) => `${d.label} ${formatValue(d.value, spec.unit, locale)}`);

	return {
		kind: 'barres',
		title: spec.title,
		accessibleTitle: KIND_TITLE.barres,
		description: spec.description ?? `${KIND_TITLE.barres} : ${listed.join(', ')}.`,
		pixelSize: { width, height },
		bars,
		yMax,
		ticks,
		axisTitles: {
			x: spec.axes.x,
			y: spec.axes.y ?? (spec.unit === 'pourcentages' ? 'Fréquence (%)' : 'Effectif')
		},
		color: spec.color,
		showValues: spec.showValues,
		rotateLabels,
		longestLabel: longest,
		indicators: barIndicators(spec, locale)
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
	const values = spec.data.map((d) => Number(d.label.replace(',', '.')));
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
				return [`Effectif total : ${formatTick(s.count, locale)}`];
			case 'moyenne':
				return [`Moyenne ${v(s.mean)}`];
			case 'mediane':
				return [`Médiane ${v(s.median)}`];
			case 'quartiles':
				return [`Q1 ${v(s.q1)}`, `Q3 ${v(s.q3)}`];
			case 'ecart-interquartile':
				return [`Écart interquartile ${v(s.iqr)}`];
			case 'etendue':
				return [`Étendue ${v(s.range)}`];
			case 'ecart-type':
				return [`Écart type ${v(s.deviation)}`];
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
			spec.unit === 'pourcentages' ? value : `${formatRounded(frequencies[i] * 100, 1, locale)} %`;
		const angle = `${formatRounded(sweep, 0, locale)}°`;

		if (d.value > 0) {
			const middle = onCircle((start + end) / 2);
			const inside = end - start >= MARKER_INSIDE_MIN_DEGREES;
			sectors.push({
				label: d.label,
				startAngle: start,
				endAngle: end,
				polygon: sectorPolygon(start, end),
				colorIndex,
				marker,
				markerPosition: scaled(middle, inside ? MARKER_INSIDE_RADIUS : MARKER_OUTSIDE_RADIUS),
				leader: inside ? null : [middle, scaled(middle, LEADER_END_RADIUS)]
			});
			start = end;
		}

		// Q24 : la description dit ce que la légende affiche, jamais une valeur cachée
		const shown = shownValue(spec.labels, value, percent, angle);
		legend.push({
			label: d.label,
			text: shown === null ? d.label : `${d.label} — ${shown}`,
			colorIndex,
			marker
		});
		listed.push(shown === null ? d.label : `${d.label} ${shown}`);
	});

	return {
		kind: 'circulaire',
		title: spec.title,
		accessibleTitle: KIND_TITLE.circulaire,
		description: spec.description ?? `${KIND_TITLE.circulaire} : ${listed.join(', ')}.`,
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
	return spec.indicators.flatMap((indicator) => {
		switch (indicator) {
			case 'effectif':
				return [`Effectif total : ${formatTick(summary.total, locale)}`];
			case 'moyenne':
				return [`Moyenne ${v(summary.mean)}`];
			case 'classe-mediane':
				return [`Classe médiane : ${spec.data[summary.medianClassIndex].label}`];
			case 'mediane':
				return [`Médiane ${v(summary.estimatedMedian)}`];
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
		accessibleTitle: KIND_TITLE.histogramme,
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
		const listed = spec.data.map((d) => `${d.label} ${valueLabel(d.value)}`);
		return {
			...common,
			description: spec.description ?? `${KIND_TITLE.histogramme} : ${listed.join(', ')}.`,
			rects: summary.classes.map((c, i) => ({
				label: spec.data[i].label,
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
				y: spec.axes.y ?? (spec.unit === 'pourcentages' ? 'Fréquence (%)' : 'Effectif')
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
	const legend = `1 carreau = ${formatTick(value, locale)}${unitWord ? ` ${unitWord}` : ''}`;

	const described = summary.classes.map((c, i) => {
		const across = Math.round(c.width / carreauWidth);
		// Un rectangle très plat ne fait pas « 0 de haut »
		const tall =
			heights[i] > 0 && heights[i] < 0.005
				? `moins de ${formatTick(0.01, locale)}`
				: formatRounded(heights[i], 2, locale);
		const size = `${across} carreau${across > 1 ? 'x' : ''} de large, ${tall} de haut`;
		return spec.showValues
			? `${spec.data[i].label} : ${valueLabel(c.count)}, ${size}`
			: `${spec.data[i].label} : ${size}`;
	});

	return {
		...common,
		// Q30 : les dimensions visibles, pas les effectifs (sauf `valeurs: oui`)
		description:
			spec.description ?? `${KIND_TITLE.histogramme} : ${described.join(' ; ')} ; ${legend}.`,
		rects: summary.classes.map((c, i) => ({
			label: spec.data[i].label,
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
				text: `${name} ${formatIndicatorValue(outcome.value, locale)}`
			}
		];
	});

	const listed = points.map(
		(p) => `${formatRounded(p.y, 1, locale)} % en ${formatTick(p.x, locale)}`
	);
	// « Me » est prononcé « mé » par les lecteurs d'écran : en toutes lettres ici
	const spoken = readings.map((r) => (r.name === 'Me' ? r.text.replace(/^Me/, 'Médiane') : r.text));
	const read = spoken.length > 0 ? ` ${spoken.join(', ')}.` : '';
	const title = `${KIND_TITLE['frequences-cumulees']} ${spec.direction}`;

	return {
		kind: 'frequences-cumulees',
		title: spec.title,
		accessibleTitle: KIND_TITLE['frequences-cumulees'],
		description: spec.description ?? `${title} : ${listed.join(', ')}.${read}`,
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
		axisTitles: { x: spec.axes.x, y: spec.axes.y ?? 'Fréquence cumulée (%)' },
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
				: `${formatRounded(value * 100, 1, locale)} %`;
		return { text, hidden: false, srText: null };
	};
	// `Sexe \ Régime` : le « \ » serait lu « barre oblique inversée »
	const cornerParts = table.corner?.split('\\').map((part) => part.trim()) ?? [];
	const cornerSpoken =
		table.corner === null
			? null
			: cornerParts.length === 2 && cornerParts.every((part) => part !== '')
				? `${spoken.rows} : ${cornerParts[0]}, ${spoken.columns} : ${cornerParts[1]}`
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
// SCÈNE
// ============================================================================

export function buildStatChartScene(
	spec: StatChartSpec,
	options: StatChartSceneOptions = {}
): StatChartScene {
	const locale = options.locale ?? 'fr';
	switch (spec.kind) {
		case 'barres':
			return buildBarScene(spec, locale);
		case 'circulaire':
			return buildPieScene(spec, locale);
		case 'histogramme':
			return buildHistogramScene(spec, locale);
		case 'frequences-cumulees':
			return buildCumulativeScene(spec, locale);
		case 'tableau-croise':
			return buildCrossTableScene(spec, locale);
	}
}
