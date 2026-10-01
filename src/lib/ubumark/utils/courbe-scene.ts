/**
 * Bloc ```courbe — scène
 * ======================
 *
 * Transforme une `CourbeSpec` en primitives géométriques en COORDONNÉES
 * MATHÉMATIQUES : polylignes coupées aux discontinuités et aux bords de la
 * fenêtre, disques de bornes, points, asymptotes, polygones d'aire, grille,
 * graduations et étiquettes.
 *
 * Module PUR, sans DOM ni store : l'écran (`Courbe.svelte`) et le PDF
 * (`courbe-typst.ts`) dessinent la MÊME scène, chacun avec sa projection.
 *
 * Socle : les briques pures du grapheur (`sampleFunction`, `createSafeEvaluator`,
 * `computeGridStep`), pas `courbe()` de geometry-core (repère isotrope).
 *
 * @module ubumark/utils/courbe-scene
 */

import type {
	CourbeColor,
	CourbeFunction,
	CourbeIssue,
	CourbeLabel,
	CourbeSize,
	CourbeSpec,
	CourbeWindow
} from '../types/courbe';
import type { ContentLocale } from '$lib/types/locale';
import { createSafeEvaluator } from '$lib/mathAST/eval/compile';
import { sampleFunction } from '$lib/geometry-core/viewport/sampler';
import { computeGridStep } from '$lib/geometry-core/viewport/grid';

// ============================================================================
// TYPES
// ============================================================================

export interface ScenePoint {
	x: number;
	y: number;
}

export interface SceneCurve {
	functionName: string;
	color: CourbeColor;
	dashed: boolean;
	/** Morceaux continus, déjà découpés à la fenêtre */
	polylines: ScenePoint[][];
}

export interface SceneEndpoint extends ScenePoint {
	/** Borne exclue : disque vide */
	open: boolean;
	color: CourbeColor;
}

export interface SceneTick {
	value: number;
	label: string;
}

export interface CourbeScene {
	window: CourbeWindow;
	/** Dimensions nominales du dessin à l'écran, en px (rapport 4:3) */
	pixelSize: { width: number; height: number };
	grid: { xStep: number; yStep: number; xs: number[]; ys: number[] };
	/** Position des axes : 0 s'il est dans la fenêtre, sinon le bord le plus proche */
	axes: { xAxisY: number; yAxisX: number };
	/** Origine visible : étiquette « O » */
	originVisible: boolean;
	ticks: { x: SceneTick[]; y: SceneTick[] };
	curves: SceneCurve[];
	endpoints: SceneEndpoint[];
	points: { name: string; x: number; y: number }[];
	asymptotes: { from: ScenePoint; to: ScenePoint }[];
	areas: { color: CourbeColor; polygon: ScenePoint[] }[];
	curveLabels: { label: CourbeLabel; x: number; y: number; color: CourbeColor }[];
	ariaLabel: string;
	warnings: CourbeIssue[];
}

export interface CourbeSceneOptions {
	/** Séparateur décimal des graduations : virgule en français (défaut), point en anglais */
	locale?: ContentLocale;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Largeur à l'écran par taille, en px ; la hauteur suit en 4:3. */
export const COURBE_PIXEL_WIDTH: Record<CourbeSize, number> = {
	petite: 280,
	moyenne: 400,
	grande: 560
};

const ASPECT_RATIO = 3 / 4;

/** Écart visé entre deux lignes de grille automatiques, en px */
const AUTO_GRID_TARGET_PX = 40;

/** Au-delà, une graduation sur deux (puis sur cinq…) reçoit son étiquette */
const MAX_LABELS_PER_AXIS = 12;

/** Points d'échantillonnage par courbe (le sampler raffine au besoin) */
const SAMPLE_COUNT = 300;

/** Points d'une aire (frontière supérieure) */
const AREA_SAMPLES = 120;

const EPSILON = 1e-9;

// ============================================================================
// NOMBRES
// ============================================================================

/** Retire le bruit flottant : 0.30000000000000004 → 0.3 */
function clean(value: number): number {
	const rounded = Number(value.toPrecision(12));
	return Object.is(rounded, -0) ? 0 : rounded;
}

/** Étiquette de graduation : vrai signe moins, séparateur selon la langue. */
export function formatTick(value: number, locale: ContentLocale = 'fr'): string {
	const v = clean(value);
	const text = String(Math.abs(v));
	const decimal = locale === 'en' ? text : text.replace('.', ',');
	return v < 0 ? `−${decimal}` : decimal;
}

/** Multiples entiers du pas compris dans [min ; max] */
function multiples(step: number, min: number, max: number): number[] {
	const values: number[] = [];
	const first = Math.ceil(min / step - EPSILON);
	const last = Math.floor(max / step + EPSILON);
	for (let k = first; k <= last; k++) values.push(clean(k * step));
	return values;
}

// ============================================================================
// DÉCOUPAGE À LA FENÊTRE
// ============================================================================

/**
 * Segment [p ; q] découpé au rectangle (Liang-Barsky).
 * @returns les paramètres t0 ≤ t1 de la partie visible, ou null
 */
function clipSegment(p: ScenePoint, q: ScenePoint, w: CourbeWindow): [number, number] | null {
	const dx = q.x - p.x;
	const dy = q.y - p.y;
	let t0 = 0;
	let t1 = 1;
	const checks: [number, number][] = [
		[-dx, p.x - w.xMin],
		[dx, w.xMax - p.x],
		[-dy, p.y - w.yMin],
		[dy, w.yMax - p.y]
	];
	for (const [pk, qk] of checks) {
		if (pk === 0) {
			if (qk < 0) return null;
			continue;
		}
		const r = qk / pk;
		if (pk < 0) {
			if (r > t1) return null;
			if (r > t0) t0 = r;
		} else {
			if (r < t0) return null;
			if (r < t1) t1 = r;
		}
	}
	return t0 <= t1 ? [t0, t1] : null;
}

const lerp = (p: ScenePoint, q: ScenePoint, t: number): ScenePoint => ({
	x: p.x + (q.x - p.x) * t,
	y: p.y + (q.y - p.y) * t
});

/** Une polyligne découpée à la fenêtre : autant de morceaux qu'elle y rentre de fois. */
export function clipPolyline(points: ScenePoint[], w: CourbeWindow): ScenePoint[][] {
	const pieces: ScenePoint[][] = [];
	let current: ScenePoint[] = [];
	const flush = () => {
		if (current.length >= 2) pieces.push(current);
		current = [];
	};
	for (let i = 1; i < points.length; i++) {
		const p = points[i - 1];
		const q = points[i];
		const clip = clipSegment(p, q, w);
		if (clip === null) {
			flush();
			continue;
		}
		const [t0, t1] = clip;
		const a = t0 === 0 ? p : lerp(p, q, t0);
		const b = t1 === 1 ? q : lerp(p, q, t1);
		if (current.length === 0 || t0 > 0) {
			flush();
			current.push(a);
		}
		current.push(b);
		if (t1 < 1) flush();
	}
	flush();
	return pieces;
}

// ============================================================================
// COURBES
// ============================================================================

function evaluatorOf(fn: CourbeFunction): (x: number) => number | null {
	return createSafeEvaluator(fn.ast, 'x');
}

/** Intervalle effectivement tracé : domaine ∩ fenêtre, ou null s'il est vide. */
function drawnInterval(fn: CourbeFunction, w: CourbeWindow): [number, number] | null {
	const min = Math.max(w.xMin, fn.domain?.min ?? -Infinity);
	const max = Math.min(w.xMax, fn.domain?.max ?? Infinity);
	return min < max ? [min, max] : null;
}

function sampleCurve(fn: CourbeFunction, w: CourbeWindow): ScenePoint[][] {
	const interval = drawnInterval(fn, w);
	if (interval === null) return [];
	const evaluate = evaluatorOf(fn);
	const sampled = sampleFunction(
		evaluate,
		{ xMin: interval[0], xMax: interval[1], yMin: w.yMin, yMax: w.yMax },
		SAMPLE_COUNT
	);
	// Coupe aux discontinuités repérées par le sampler…
	const breaks = [0, ...sampled.discontinuityIndices, sampled.points.length];
	const pieces: ScenePoint[][] = [];
	for (let i = 1; i < breaks.length; i++) {
		const piece = sampled.points.slice(breaks[i - 1], breaks[i]).map((p) => ({ x: p.x, y: p.y }));
		// … puis aux bords de la fenêtre.
		if (piece.length >= 2) pieces.push(...clipPolyline(piece, w));
	}
	return pieces;
}

/**
 * Valeur prise à une borne du domaine ; pour une borne exclue où la fonction
 * n'est pas définie (`ln` en 0), la limite approchée de l'intérieur.
 */
function valueAtBound(fn: CourbeFunction, x: number, inward: 1 | -1): number | null {
	const evaluate = evaluatorOf(fn);
	const direct = evaluate(x);
	if (direct !== null) return direct;
	const width = (fn.domain?.max ?? x + 1) - (fn.domain?.min ?? x - 1);
	const near = evaluate(x + inward * width * 1e-9);
	return near;
}

function endpointsOf(fn: CourbeFunction, w: CourbeWindow): SceneEndpoint[] {
	if (fn.domain === null) return [];
	const result: SceneEndpoint[] = [];
	const bounds: [number, boolean, 1 | -1][] = [
		[fn.domain.min, fn.domain.minOpen, 1],
		[fn.domain.max, fn.domain.maxOpen, -1]
	];
	for (const [x, open, inward] of bounds) {
		if (x < w.xMin - EPSILON || x > w.xMax + EPSILON) continue;
		const y = valueAtBound(fn, x, inward);
		if (y === null || y < w.yMin - EPSILON || y > w.yMax + EPSILON) continue;
		result.push({ x, y: clean(y), open, color: fn.color });
	}
	return result;
}

/** Positions essayées le long du plus long morceau, dans l'ordre de préférence */
const LABEL_POSITIONS = [0.8, 0.9, 0.65, 0.2, 0.35, 0.5] as const;

/** Écart minimal à un point nommé, en fraction de la fenêtre sur chaque axe */
const LABEL_CLEARANCE = 0.08;

/**
 * Ancre du nom de courbe : vers la droite du plus long morceau visible, à
 * l'écart des points nommés (sinon « B » et « 𝒞f » se superposent).
 */
function labelAnchor(
	polylines: ScenePoint[][],
	avoid: { x: number; y: number }[],
	w: CourbeWindow
): ScenePoint | null {
	let longest: ScenePoint[] | null = null;
	for (const poly of polylines)
		if (longest === null || poly.length > longest.length) longest = poly;
	if (longest === null) return null;
	const line = longest;
	const at = (t: number) => line[Math.floor((line.length - 1) * t)];
	const clear = (p: ScenePoint) =>
		avoid.every(
			(q) =>
				Math.abs(p.x - q.x) / (w.xMax - w.xMin) > LABEL_CLEARANCE ||
				Math.abs(p.y - q.y) / (w.yMax - w.yMin) > LABEL_CLEARANCE
		);
	return LABEL_POSITIONS.map(at).find(clear) ?? at(LABEL_POSITIONS[0]);
}

// ============================================================================
// AIRES
// ============================================================================

function areaPolygon(fn: CourbeFunction, from: number, to: number, w: CourbeWindow): ScenePoint[] {
	const evaluate = evaluatorOf(fn);
	const a = Math.max(from, w.xMin);
	const b = Math.min(to, w.xMax);
	if (!(a < b)) return [];
	const base = Math.min(Math.max(0, w.yMin), w.yMax);
	const clampY = (y: number) => Math.min(w.yMax, Math.max(w.yMin, y));
	const top: ScenePoint[] = [];
	for (let i = 0; i <= AREA_SAMPLES; i++) {
		const x = a + ((b - a) * i) / AREA_SAMPLES;
		const y = evaluate(x);
		if (y === null) continue;
		top.push({ x, y: clampY(y) });
	}
	if (top.length < 2) return [];
	return [{ x: a, y: base }, ...top, { x: b, y: base }];
}

// ============================================================================
// LIBELLÉ ACCESSIBLE
// ============================================================================

function joinNames(names: string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

function defaultAriaLabel(spec: CourbeSpec): string {
	const range = `x de ${formatTick(spec.window.xMin)} à ${formatTick(spec.window.xMax)}`;
	const names = spec.functions.map((f) => f.name);
	if (names.length === 0) return `Repère, ${range}`;
	const head = names.length === 1 ? 'Courbe de' : 'Courbes de';
	return `${head} ${joinNames(names)}, ${range}`;
}

// ============================================================================
// SCÈNE
// ============================================================================

export function buildCourbeScene(spec: CourbeSpec, options: CourbeSceneOptions = {}): CourbeScene {
	const locale = options.locale ?? 'fr';
	const w = spec.window;
	const warnings: CourbeIssue[] = [];
	const width = COURBE_PIXEL_WIDTH[spec.size];
	const height = width * ASPECT_RATIO;

	// Grille : donnée par l'auteur, sinon calculée par axe (repère anisotrope).
	const xStep =
		spec.grid?.x ??
		computeGridStep(width / (w.xMax - w.xMin), { targetPx: AUTO_GRID_TARGET_PX }).major;
	const yStep =
		spec.grid?.y ??
		computeGridStep(height / (w.yMax - w.yMin), { targetPx: AUTO_GRID_TARGET_PX }).major;
	const xs = multiples(xStep, w.xMin, w.xMax);
	const ys = multiples(yStep, w.yMin, w.yMax);

	const xAxisY = w.yMin <= 0 && 0 <= w.yMax ? 0 : w.yMin > 0 ? w.yMin : w.yMax;
	const yAxisX = w.xMin <= 0 && 0 <= w.xMax ? 0 : w.xMin > 0 ? w.xMin : w.xMax;
	const originVisible = xAxisY === 0 && yAxisX === 0;

	const ticksFor = (values: number[], step: number, axisCross: number): SceneTick[] => {
		const stride = Math.max(1, Math.ceil(values.length / MAX_LABELS_PER_AXIS));
		return values
			.filter((v) => !originVisible || Math.abs(v - axisCross) > EPSILON)
			.filter((v) => Math.round(v / step) % stride === 0)
			.map((value) => ({ value, label: formatTick(value, locale) }));
	};

	const curves: SceneCurve[] = [];
	const endpoints: SceneEndpoint[] = [];
	const curveLabels: CourbeScene['curveLabels'] = [];
	for (const fn of spec.functions) {
		const polylines = sampleCurve(fn, w);
		if (polylines.length === 0) {
			warnings.push({
				message: `Ligne ${fn.line} : la courbe de ${fn.name} n'apparaît pas dans la fenêtre`,
				line: fn.line
			});
		}
		curves.push({ functionName: fn.name, color: fn.color, dashed: fn.dashed, polylines });
		endpoints.push(...endpointsOf(fn, w));
	}

	const inside = (x: number, y: number) =>
		x >= w.xMin - EPSILON &&
		x <= w.xMax + EPSILON &&
		y >= w.yMin - EPSILON &&
		y <= w.yMax + EPSILON;

	const points: CourbeScene['points'] = [];
	for (const p of spec.points) {
		if (inside(p.x, p.y)) {
			points.push({ name: p.name, x: clean(p.x), y: clean(p.y) });
		} else {
			warnings.push({
				message: `Ligne ${p.line} : le point ${p.name}(${formatTick(p.x, locale)} ; ${formatTick(p.y, locale)}) est hors de la fenêtre, il n'est pas dessiné`,
				line: p.line
			});
		}
	}

	spec.functions.forEach((fn, index) => {
		if (!fn.label) return;
		const anchor = labelAnchor(curves[index].polylines, points, w);
		if (anchor) curveLabels.push({ label: fn.label, x: anchor.x, y: anchor.y, color: fn.color });
	});

	const asymptotes: CourbeScene['asymptotes'] = [];
	for (const a of spec.asymptotes) {
		const within =
			a.kind === 'vertical'
				? a.value >= w.xMin && a.value <= w.xMax
				: a.value >= w.yMin && a.value <= w.yMax;
		if (!within) {
			warnings.push({
				message: `Ligne ${a.line} : l'asymptote ${a.kind === 'vertical' ? 'x' : 'y'} = ${formatTick(a.value, locale)} est hors de la fenêtre`,
				line: a.line
			});
			continue;
		}
		asymptotes.push(
			a.kind === 'vertical'
				? { from: { x: a.value, y: w.yMin }, to: { x: a.value, y: w.yMax } }
				: { from: { x: w.xMin, y: a.value }, to: { x: w.xMax, y: a.value } }
		);
	}

	const areas: CourbeScene['areas'] = [];
	for (const area of spec.areas) {
		const fn = spec.functions.find((f) => f.name === area.functionName);
		if (!fn) continue;
		const polygon = areaPolygon(fn, area.from, area.to, w);
		if (polygon.length === 0) {
			warnings.push({
				message: `Ligne ${area.line} : aire invisible dans la fenêtre`,
				line: area.line
			});
			continue;
		}
		areas.push({ color: fn.color, polygon });
	}

	return {
		window: { ...w },
		pixelSize: { width, height },
		grid: { xStep, yStep, xs, ys },
		axes: { xAxisY, yAxisX },
		originVisible,
		ticks: { x: ticksFor(xs, xStep, yAxisX), y: ticksFor(ys, yStep, xAxisY) },
		curves,
		endpoints,
		points,
		asymptotes,
		areas,
		curveLabels,
		ariaLabel: spec.description ?? defaultAriaLabel(spec),
		warnings
	};
}
