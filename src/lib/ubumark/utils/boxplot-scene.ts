/**
 * Boîtes à moustaches (```boite-a-moustaches) — scène pure
 * =========================================================
 *
 * La MÊME scène sert l'écran (`BoxPlotChart.svelte`) et le PDF
 * (`stat-chart-typst.ts`) : mêmes bornes, mêmes graduations, mêmes rangées
 * d'étiquettes. Les cinq valeurs viennent du parseur (écrites par l'auteur, ou
 * calculées par `describe.ts` pour `données:`) : rien n'est recalculé ici.
 * Une boîte à construire (`placer:`, palier 2) est marquée `toPlace` : chaque
 * support n'en dessine que le nom.
 *
 * Coordonnées : x dans l'unité des données, de `xMin` à `xMax` ; chaque
 * support place lui-même ses boîtes en hauteur.
 *
 * @module ubumark/utils/boxplot-scene
 */

import type { StatChartSpec } from '../types/stat-chart';
import type { ContentLocale } from '$lib/types/locale';
import { COURBE_PIXEL_WIDTH } from './courbe-scene';
import { STAT_TEXT } from './stat-chart-text';
// ⚠️ Import circulaire (stat-chart-scene appelle `buildBoxPlotScene`) : sans
// risque, rien n'y est appelé au chargement
import {
	SCATTER_LABEL_CHAR_PX,
	scatterAxis,
	scatterTick,
	type BoxPlotBand,
	type BoxPlotScene,
	type BoxPlotSceneBox,
	type SceneTick
} from './stat-chart-scene';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Air entre deux étiquettes de valeurs d'une même rangée, en px */
const VALUE_LABEL_GAP_PX = 4;

/**
 * Hauteurs d'une bande (une boîte), en px à l'écran ; le PDF les met à
 * l'échelle de sa largeur : le même dessin. Le nom est au-dessus à gauche, les
 * valeurs (`valeurs: oui`) en rangées sous la boîte.
 */
const LAYOUT = {
	/** Air au-dessus de la première bande */
	top: 6,
	/** Ligne du nom (seulement si une boîte au moins a un nom) */
	name: 16,
	box: 22,
	/** Une rangée d'étiquettes de valeurs */
	valueRow: 13,
	/** Air sous chaque bande */
	gap: 12
} as const;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Graduations d'un axe écrit (`axe: 25 à 60, de 5 en 5`) */
function writtenTicks(
	axis: { min: number; max: number; step: number },
	locale: ContentLocale
): SceneTick[] {
	const count = Math.round((axis.max - axis.min) / axis.step);
	return Array.from({ length: count + 1 }, (_, k) =>
		scatterTick(Number((axis.min + k * axis.step).toPrecision(12)), locale)
	);
}

/**
 * Rangée de chaque étiquette : la plus proche de la boîte où elle ne touche pas
 * sa voisine de gauche (valeurs croissantes : seule la dernière posée compte).
 */
function valueRows(xs: readonly number[], labels: readonly string[]): number[] {
	const lastOnRow: { x: number; width: number }[] = [];
	return xs.map((x, i) => {
		const width = labels[i].length * SCATTER_LABEL_CHAR_PX;
		let row = lastOnRow.findIndex(
			(last) => x - last.x >= (last.width + width) / 2 + VALUE_LABEL_GAP_PX
		);
		if (row === -1) row = lastOnRow.length;
		lastOnRow[row] = { x, width };
		return row;
	});
}

export function buildBoxPlotScene(spec: StatChartSpec, locale: ContentLocale): BoxPlotScene {
	// Le parseur ne rend une spec de ce genre qu'avec ses boîtes
	const plot = spec.boxPlot!;
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const text = STAT_TEXT[locale].boxPlot;
	const axis =
		plot.axis !== null
			? { min: plot.axis.min, max: plot.axis.max, ticks: writtenTicks(plot.axis, locale) }
			: scatterAxis(
					plot.boxes.flatMap((box) => box.values),
					width,
					false,
					'x',
					locale
				);
	const pixelsPerUnit = width / (axis.max - axis.min || 1);

	const toPlace = new Set(plot.toPlace ?? []);
	const boxes: BoxPlotSceneBox[] = plot.boxes.map((box, i) => {
		const labels = box.values.map((value) => scatterTick(value, locale).label);
		return {
			name: box.name,
			values: [...box.values],
			labels,
			valueRows: valueRows(
				box.values.map((value) => (value - axis.min) * pixelsPerUnit),
				labels
			),
			...(toPlace.has(i) && { toPlace: true as const })
		};
	});

	// Bandes, de haut en bas : nom, boîte, rangées de valeurs
	const withNames = boxes.some((box) => box.name !== null);
	const rows = plot.showValues
		? Math.max(...boxes.map((box) => Math.max(...box.valueRows) + 1))
		: 0;
	let y = LAYOUT.top;
	const bands: BoxPlotBand[] = boxes.map(() => {
		const nameY = withNames ? y + LAYOUT.name - 4 : null;
		const top = y + (withNames ? LAYOUT.name : 0);
		const bottom = top + LAYOUT.box;
		const valueY = Array.from({ length: rows }, (_, r) => bottom + (r + 1) * LAYOUT.valueRow - 2);
		y = bottom + rows * LAYOUT.valueRow + LAYOUT.gap;
		return { nameY, top, bottom, valueY };
	});

	// Boîte à construire : ses valeurs sont l'attendu, jamais dites avant la correction
	const spoken = boxes.map((box) =>
		box.toPlace ? text.toBuild(box.name) : text.sentence(box.name, box.labels)
	);
	return {
		kind: 'boite-a-moustaches',
		title: spec.title,
		accessibleTitle: text.title,
		description: spec.description ?? spoken.join(' '),
		pixelSize: { width, height: y },
		indicators: [],
		xMin: axis.min,
		xMax: axis.max,
		xTicks: axis.ticks,
		axisTitle: plot.axisTitle,
		boxes,
		showValues: plot.showValues,
		bands,
		color: spec.color
	};
}
