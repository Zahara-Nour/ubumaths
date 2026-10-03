/**
 * Scènes des simulations de l'atelier
 * ===================================
 *
 * Outils statistiques v2, PR (c) (Q80-Q82, 2026-10-02). Les graphiques de
 * `.fréquence` et `.échantillons` se dessinent sous la ligne de la commande,
 * avec le même composant SVG que les blocs (`StatChart.svelte`), à partir
 * d'une scène construite ici. Le bloc ```simulation (modes `moyenne` et
 * `échantillons`, lot 3) les reprend.
 *
 * @module ubumark/utils/simulation-scene
 */

import type { ContentLocale } from '$lib/types/locale';
import type { StatChartDatum, StatChartSpec } from '../types/stat-chart';
import { computeGridStep } from '$lib/geometry-core/viewport/grid';
import { COURBE_PIXEL_WIDTH, formatTick } from './courbe-scene';
import {
	STAT_CHART_ASPECT_RATIO,
	buildStatChartScene,
	type HistogramScene,
	type MeanScene,
	type ScenePoint,
	type SceneTick
} from './stat-chart-scene';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Points dessinés de la courbe au plus : invisible à l'œil, léger (Q81) */
export const RUNNING_MEAN_MAX_POINTS = 500;

/** Textes des deux graphiques, selon la langue du document (bloc ```simulation) */
const TEXT = {
	fr: {
		sampleAxis: 'Moyenne de l’échantillon',
		countAxis: 'Effectif',
		samplesDescription: (count: string, classes: string) =>
			`Histogramme des ${count} moyennes d’échantillons ; en couleur, les classes entre μ − 2σ/√n et μ + 2σ/√n : ${classes}.`,
		meanTitle: 'Moyenne des tirages selon leur nombre',
		meanFirst: (first: string, e: string) =>
			`Moyenne du premier tirage : ${first}, pour une espérance de ${e}.`,
		meanMany: (n: string, first: string, last: string, e: string) =>
			`Moyenne des ${n} premiers tirages : elle passe de ${first} à ${last}, pour une espérance de ${e}.`,
		expectation: (e: string) => `espérance ${e}`,
		meanAxes: { x: 'Nombre de tirages', y: 'Moyenne' }
	},
	en: {
		sampleAxis: 'Sample mean',
		// Q122 : *frequency* = effectif
		countAxis: 'Frequency',
		samplesDescription: (count: string, classes: string) =>
			`Histogram of the ${count} sample means; in colour, the classes between μ − 2σ/√n and μ + 2σ/√n: ${classes}.`,
		meanTitle: 'Mean of the draws by their number',
		meanFirst: (first: string, e: string) =>
			`Mean of the first draw: ${first}, for an expectation of ${e}.`,
		meanMany: (n: string, first: string, last: string, e: string) =>
			`Mean of the first ${n} draws: it goes from ${first} to ${last}, for an expectation of ${e}.`,
		expectation: (e: string) => `expectation ${e}`,
		meanAxes: { x: 'Number of draws', y: 'Mean' }
	}
} as const;

/** Écart visé entre deux graduations, en px (comme les diagrammes) */
const TICK_TARGET_PX = 40;

// ============================================================================
// FONCTIONS
// ============================================================================

/** 5000 → « 5 000 », ou « 5,000 » dans un document anglais */
function grouped(value: number, locale: ContentLocale = 'fr'): string {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'en' ? ',' : ' ');
}

/** Un réel arrondi au millième, écrit selon la langue */
function rounded(value: number, locale: ContentLocale, decimals = 3): string {
	// `Math.round`, pas `toFixed` : 3,5875 donnait 3,587 (revue)
	const factor = 10 ** decimals;
	return formatTick(Math.round(value * factor) / factor, locale);
}

/**
 * Décimales des bornes : au moins trois, assez pour que deux bornes voisines
 * restent distinctes quand l'amplitude est minuscule (σ = 0,005, revue).
 */
function boundDecimals(width: number): number {
	return Math.min(10, Math.max(3, Math.ceil(-Math.log10(width)) + 1));
}

/** Une borne de classe sans bruit flottant (3,3299999 → 3,33) */
function clean(value: number): number {
	return Number(value.toPrecision(12));
}

/** Graduations de `from` à `to` au pas `step`, multiples du pas */
function ticksBetween(from: number, to: number, step: number, locale: ContentLocale): SceneTick[] {
	const ticks: SceneTick[] = [];
	for (let k = Math.ceil(from / step - 1e-9); k * step <= to + 1e-9; k++) {
		const value = clean(k * step);
		ticks.push({ value, label: formatTick(value, locale) });
	}
	return ticks;
}

/**
 * Histogramme des moyennes d'échantillons (Q82) : classes de même amplitude,
 * la moitié de 2σ/√n, ALIGNÉES sur μ — les bornes μ ± 2σ/√n sont des bornes
 * de classes ; les classes entre elles sont mises en valeur.
 */
export function buildSampleMeansScene(
	means: readonly number[],
	mu: number,
	margin: number,
	locale: ContentLocale
): HistogramScene {
	// σ = 0 : toutes les moyennes valent μ, une classe d'amplitude 1 autour
	const width = margin > 0 ? margin / 2 : 1;
	const origin = margin > 0 ? mu : mu - 0.5;
	// ⚠️ Classes fermées du côté de μ : `[a ; b[` à gauche, `]a ; b]` à droite
	// (revue). Une moyenne PILE sur μ + 2σ/√n est comptée « à moins de la
	// marge » par le texte : en `[a ; b[`, elle tombait dans une classe grisée,
	// et le dessin contredisait le texte (pièce, n = 4 : 50 sur 50 annoncés,
	// 48 en couleur). μ lui-même va dans la première classe à droite, [μ ; μ + w].
	const indexOf = (m: number) => {
		const t = (m - origin) / width;
		return margin > 0 && t > 1e-9 ? Math.ceil(t - 1e-9) - 1 : Math.floor(t + 1e-9);
	};

	const decimals = boundDecimals(width);
	const first = Math.min(...means.map(indexOf));
	const last = Math.max(...means.map(indexOf));
	const counts = new Array<number>(last - first + 1).fill(0);
	for (const m of means) counts[indexOf(m) - first]++;

	const data: StatChartDatum[] = counts.map((count, i) => {
		const lower = clean(origin + (first + i) * width);
		const upper = clean(origin + (first + i + 1) * width);
		const rightOfMu = margin > 0 && first + i >= 0 && lower > mu;
		const opening = rightOfMu ? ']' : '[';
		const closing = rightOfMu || (margin > 0 && first + i === 0) ? ']' : '[';
		// Bornes au millième : μ ± k·σ/√n n'est presque jamais décimal, et
		// « 2,53390821692 » rendait l'axe illisible (fiche compilée, lot 3 PR b)
		return {
			label: `${opening}${rounded(lower, locale, decimals)} ; ${rounded(upper, locale, decimals)}${closing}`,
			value: count,
			interval: { lower, upper },
			line: i + 1
		};
	});

	const spec: StatChartSpec = {
		kind: 'histogramme',
		data,
		unit: 'effectifs',
		title: null,
		axes: { x: TEXT[locale].sampleAxis, y: TEXT[locale].countAxis },
		// Les classes et leurs effectifs, comme la description d'un bloc (revue a11y)
		description: TEXT[locale].samplesDescription(
			grouped(means.length, locale),
			data.map((d) => `${d.label} ${d.value}`).join(', ')
		),
		size: 'moyenne',
		showValues: false,
		color: 'bleu',
		labels: 'effectifs',
		areaLegend: null,
		direction: 'croissantes',
		reading: 'aucune',
		indicators: [],
		table: null,
		law: null,
		simulation: null,
		rawValues: null,
		series: null,
		twoSeries: null
	};
	const scene = buildStatChartScene(spec, { locale }) as HistogramScene;

	const inside = (lower: number, upper: number) =>
		margin > 0
			? lower >= mu - margin - 1e-9 && upper <= mu + margin + 1e-9
			: lower <= mu && mu < upper;
	return {
		...scene,
		xTicks: scene.xTicks.map((tick) => ({
			...tick,
			label: rounded(tick.value, locale, decimals)
		})),
		rects: scene.rects.map((rect) => ({ ...rect, highlighted: inside(rect.lower, rect.upper) }))
	};
}

/**
 * Moyenne des k premiers tirages selon k (Q81), avec la droite y = E(X).
 *
 * @param expectationText l'espérance telle qu'on l'écrit (`1/2`, `7/2`)
 */
export function buildRunningMeanScene(
	means: readonly number[],
	expectation: number,
	expectationText: string,
	locale: ContentLocale
): MeanScene {
	const n = means.length;
	const width = COURBE_PIXEL_WIDTH.moyenne;
	const height = width * STAT_CHART_ASPECT_RATIO;

	// Points régulièrement espacés, le premier et le dernier tirage compris
	const indices =
		n <= RUNNING_MEAN_MAX_POINTS
			? means.map((_, i) => i)
			: Array.from({ length: RUNNING_MEAN_MAX_POINTS }, (_, k) =>
					Math.round((k * (n - 1)) / (RUNNING_MEAN_MAX_POINTS - 1))
				);
	const points: ScenePoint[] = indices.map((i) => ({ x: i + 1, y: means[i] }));

	const low = Math.min(expectation, ...means);
	const high = Math.max(expectation, ...means);
	const span = high - low || 1;
	const yStep = computeGridStep(height / span, { targetPx: TICK_TARGET_PX }).major || span;
	const yMin = clean(Math.floor(low / yStep - 1e-9) * yStep);
	const yMax = clean(Math.ceil(high / yStep + 1e-9) * yStep);

	// Une seule abscisse (n = 1) : le cadre va jusqu'à 2, sinon 0/0 dans le SVG (revue)
	const xMax = Math.max(n, 2);
	const xStep = Math.max(
		1,
		computeGridStep(width / Math.max(1, n - 1), { targetPx: TICK_TARGET_PX * 2 }).major || 1
	);

	return {
		kind: 'moyenne-selon-n',
		title: null,
		accessibleTitle: TEXT[locale].meanTitle,
		description:
			n === 1
				? TEXT[locale].meanFirst(rounded(means[0], locale), expectationText)
				: TEXT[locale].meanMany(
						grouped(n, locale),
						rounded(means[0], locale),
						rounded(means[n - 1], locale),
						expectationText
					),
		pixelSize: { width, height },
		indicators: [],
		xMin: 1,
		xMax,
		yMin,
		yMax,
		points,
		// Abscisses entières : groupées comme le texte (« 10 000 »)
		xTicks: ticksBetween(1, xMax, xStep, locale).map((t) => ({
			...t,
			label: grouped(t.value, locale)
		})),
		ticks: ticksBetween(yMin, yMax, yStep, locale),
		reference: { value: expectation, label: TEXT[locale].expectation(expectationText) },
		axisTitles: { ...TEXT[locale].meanAxes },
		color: 'bleu'
	};
}
