/**
 * Blocs ```barres et ```circulaire — scène pure
 * =============================================
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

import type { StatChartLabels, StatChartSpec, StatChartUnit } from '../types/stat-chart';
import type { CourbeColor } from '../types/courbe';
import type { ContentLocale } from '$lib/types/locale';
import { computeGridStep } from '$lib/geometry-core/viewport/grid';
import { categoryFrequencies } from '$lib/statistics/describe';
import { COURBE_PIXEL_WIDTH, formatTick } from './courbe-scene';

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
}

export interface SceneLegendItem {
	label: string;
	/** Ligne affichée : « Bus — 46,7 % » selon `étiquettes:` */
	text: string;
	colorIndex: number;
}

export interface PieScene extends SceneCommon {
	kind: 'circulaire';
	sectors: SceneSector[];
	legend: SceneLegendItem[];
}

export type StatChartScene = BarScene | PieScene;

export interface StatChartSceneOptions {
	/** Langue du document : séparateur décimal */
	locale?: ContentLocale;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Couleurs des secteurs, dans cet ordre, reprises au-delà (Q21) */
export const PIE_PALETTE_SIZE = 7;

const ASPECT_RATIO = 3 / 4;

/** Écart visé entre deux graduations, en px */
const TICK_TARGET_PX = 40;

/** Largeur d'une barre, en part de sa catégorie */
const BAR_WIDTH = 0.6;

/** Au-delà, les noms de catégories sont inclinés */
const FLAT_LABELS_MAX = 6;

/** Largeur moyenne d'un caractère à 11 px, pour savoir si un nom tient à plat */
const CHAR_PX = 6.5;

/** Pas d'échantillonnage des arcs, en degrés */
const ARC_STEP_DEGREES = 3;

const KIND_TITLE = {
	barres: 'Diagramme en barres',
	circulaire: 'Diagramme circulaire'
} as const;

// ============================================================================
// FORMATAGE
// ============================================================================

/** Arrondi à `decimals` décimales, zéros inutiles retirés, séparateur selon la langue. */
function formatRounded(value: number, decimals: number, locale: ContentLocale): string {
	const factor = 10 ** decimals;
	return formatTick(Math.round(value * factor) / factor, locale);
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
	const height = width * ASPECT_RATIO;
	const values = spec.data.map((d) => d.value);
	const maxValue = Math.max(...values) || 1;

	const step = computeGridStep(height / maxValue, { targetPx: TICK_TARGET_PX }).major || maxValue;
	const tickCount = Math.ceil(maxValue / step - 1e-9);
	const yMax = tickCount * step;
	const ticks: SceneTick[] = Array.from({ length: tickCount + 1 }, (_, i) => ({
		value: i * step,
		label: formatTick(i * step, locale)
	}));

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
	const rotateLabels = spec.data.length > FLAT_LABELS_MAX || longest * CHAR_PX > bandPx;

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
		longestLabel: longest
	};
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

function legendText(
	label: string,
	labels: StatChartLabels,
	value: string,
	percent: string,
	angle: string
): string {
	switch (labels) {
		case 'aucune':
			return label;
		case 'effectifs':
			return `${label} — ${value}`;
		case 'angles':
			return `${label} — ${angle}`;
		case 'pourcentages':
			return `${label} — ${percent}`;
	}
}

function buildPieScene(spec: StatChartSpec, locale: ContentLocale): PieScene {
	const width = COURBE_PIXEL_WIDTH[spec.size] * ASPECT_RATIO;
	const outcome = categoryFrequencies(spec.data.map((d) => d.value));
	// Le parseur garantit un total > 0 ; une défaillance ici est un bug
	if (outcome === null || !outcome.ok) {
		throw new Error(
			`Diagramme circulaire sans fréquences : ${outcome?.ok === false ? outcome.message : 'vide'}`
		);
	}
	const frequencies = outcome.value;

	const sectors: SceneSector[] = [];
	const legend: SceneLegendItem[] = [];
	const listed: string[] = [];
	let start = 0;

	spec.data.forEach((d, i) => {
		const colorIndex = i % PIE_PALETTE_SIZE;
		const sweep = frequencies[i] * 360;
		// Le dernier secteur non nul ferme le cercle exactement
		const isLastNonZero = frequencies.slice(i + 1).every((f) => f === 0);
		const end = isLastNonZero ? 360 : start + sweep;

		const value = formatValue(d.value, spec.unit, locale);
		const percent =
			spec.unit === 'pourcentages' ? value : `${formatRounded(frequencies[i] * 100, 1, locale)} %`;
		const angle = `${formatRounded(sweep, 0, locale)}°`;

		if (d.value > 0) {
			sectors.push({
				label: d.label,
				startAngle: start,
				endAngle: end,
				polygon: sectorPolygon(start, end),
				colorIndex
			});
			start = end;
		}
		legend.push({
			label: d.label,
			text: legendText(d.label, spec.labels, value, percent, angle),
			colorIndex
		});
		listed.push(
			spec.unit === 'pourcentages' ? `${d.label} ${value}` : `${d.label} ${value} (${percent})`
		);
	});

	return {
		kind: 'circulaire',
		title: spec.title,
		accessibleTitle: KIND_TITLE.circulaire,
		description: spec.description ?? `${KIND_TITLE.circulaire} : ${listed.join(', ')}.`,
		pixelSize: { width, height: width },
		sectors,
		legend
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
	return spec.kind === 'barres' ? buildBarScene(spec, locale) : buildPieScene(spec, locale);
}
