/**
 * Bloc ```courbe — scène
 * ======================
 *
 * Transforme une `CourbeSpec` en primitives géométriques en COORDONNÉES
 * MATHÉMATIQUES : polylignes coupées aux discontinuités et aux bords de la
 * fenêtre, disques de bornes, termes de suites, points, asymptotes, polygones d'aire, grille,
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
	CourbeSequence,
	CourbeSize,
	CourbeSpec,
	CourbeWindow
} from '../types/courbe';
import { COURBE_LIMITS, courbeRangeProblem } from '../types/courbe';
import type { ContentLocale } from '$lib/types/locale';
import { createSafeEvaluator } from '$lib/mathAST/eval/compile';
import { sampleFunction } from '$lib/geometry-core/viewport/sampler';
import { computeGridStep } from '$lib/geometry-core/viewport/grid';
import { computeCobwebPath, createRecurrenceFunctionEvaluator } from '$lib/grapheur/sequence';

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

/** Escalier d'une récurrence, dans le repère (u_n ; u_{n+1}) */
export interface SceneStaircase {
	/** Courbe de la relation f, découpée à la fenêtre */
	curve: ScenePoint[][];
	/** Noir pour un escalier seul ; couleur de l'escalier s'il y en a plusieurs (sinon indiscernables) */
	relationColor: CourbeColor;
	/** Droite y = x, découpée à la fenêtre */
	diagonal: ScenePoint[][];
	/** Escalier (u_0 ; 0) → (u_0 ; u_1) → (u_1 ; u_1) → …, découpé à la fenêtre */
	steps: ScenePoint[][];
	/** Option `termes` : rappels de (u_k ; u_k) à l'axe des abscisses, k ≥ 1 */
	guides: { from: ScenePoint; to: ScenePoint }[];
	/** Option `termes` : étiquettes u_k sous l'axe, sans chevauchement */
	termLabels: { n: number; x: number }[];
}

/** Suite : un disque par terme visible (n ; u_n), points non reliés — ou un escalier */
export interface SceneSequence {
	name: string;
	color: CourbeColor;
	/** Termes visibles, par rang croissant (vide pour un escalier) */
	terms: ScenePoint[];
	staircase: SceneStaircase | null;
}

/** Tangente : droite en pointillés découpée à la fenêtre et point de contact */
export interface SceneTangent {
	functionName: string;
	color: CourbeColor;
	point: ScenePoint;
	slope: number;
	line: ScenePoint[][];
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
	sequences: SceneSequence[];
	points: { name: string; x: number; y: number }[];
	asymptotes: { from: ScenePoint; to: ScenePoint }[];
	areas: { color: CourbeColor; polygon: ScenePoint[] }[];
	tangents: SceneTangent[];
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

/**
 * Écart minimal entre deux étiquettes u_k de l'escalier, en fraction de la
 * largeur : une étiquette fait ~16 px à l'écran, ~0,3 cm dans le PDF, donc une
 * part plus grande d'une petite figure.
 */
const TERM_LABEL_GAP: Record<CourbeSize, number> = {
	petite: 0.07,
	moyenne: 0.05,
	grande: 0.04
};

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

/** Plus grand dénominateur reconnu pour un pas multiple de π (π/12 au plus fin) */
const MAX_PI_DENOMINATOR = 12;

/**
 * Pas multiple rationnel de π (`pi/2`, `2*pi/3`) : la fraction p/q telle que
 * pas = (p/q)·π, sinon null (pas ordinaire, graduations décimales).
 */
function piRatio(step: number): { p: number; q: number } | null {
	const ratio = step / Math.PI;
	for (let q = 1; q <= MAX_PI_DENOMINATOR; q++) {
		const p = Math.round(ratio * q);
		if (p !== 0 && Math.abs(ratio * q - p) < 1e-9) return { p, q };
	}
	return null;
}

function gcd(a: number, b: number): number {
	return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Étiquette de la k-ième graduation d'un pas (p/q)·π : « −π », « π/2 », « 3π/2 », « 2π ». */
function piTickLabel(k: number, ratio: { p: number; q: number }): string {
	let num = k * ratio.p;
	let den = ratio.q;
	if (num === 0) return '0';
	const g = gcd(num, den);
	num /= g;
	den /= g;
	const sign = num < 0 ? '−' : '';
	const n = Math.abs(num);
	const head = n === 1 ? 'π' : `${n}π`;
	return den === 1 ? `${sign}${head}` : `${sign}${head}/${den}`;
}

/** Multiples entiers du pas compris dans [min ; max] */
function multiples(step: number, min: number, max: number): number[] {
	if (!(step > 0) || !Number.isFinite(step) || !Number.isFinite(min) || !Number.isFinite(max)) {
		return [];
	}
	const first = Math.ceil(min / step - EPSILON);
	const last = Math.floor(max / step + EPSILON);
	// Au-delà de 2^53, `k++` ne fait plus avancer k : la boucle ne finirait jamais.
	if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return [];
	if (last - first + 1 > COURBE_LIMITS.gridLines + 1) return [];
	const values: number[] = [];
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
	return samplePieces(evaluatorOf(fn), interval[0], interval[1], w);
}

/** Courbe d'un évaluateur sur [xMin ; xMax], coupée aux discontinuités et à la fenêtre. */
function samplePieces(
	evaluate: (x: number) => number | null,
	xMin: number,
	xMax: number,
	w: CourbeWindow
): ScenePoint[][] {
	const sampled = sampleFunction(
		evaluate,
		{ xMin, xMax, yMin: w.yMin, yMax: w.yMax },
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
// ESCALIER
// ============================================================================

/**
 * Escalier d'une récurrence : chemin du grapheur (`computeCobwebPath`),
 * courbe de f, droite y = x et, avec `termes`, rappels et étiquettes.
 * @returns l'escalier, et s'il sort de la fenêtre (avertissement)
 */
function staircaseOf(
	seq: CourbeSequence,
	terms: CourbeSequence['terms'],
	w: CourbeWindow,
	xAxisY: number,
	size: CourbeSize,
	withDiagonal: boolean,
	relationColor: CourbeColor,
	inside: (x: number, y: number) => boolean
): { staircase: SceneStaircase; clipped: boolean } {
	const relation = seq.staircase!.relation;
	// Le chemin du grapheur part de (u0 ; 0) : ici, de l'axe tel qu'il est dessiné
	const path = computeCobwebPath(terms).map((p, i) => ({
		x: clean(p.x),
		y: i === 0 ? xAxisY : clean(p.y)
	}));
	const curve = samplePieces(createRecurrenceFunctionEvaluator(relation), w.xMin, w.xMax, w);
	const lo = Math.max(w.xMin, w.yMin);
	const hi = Math.min(w.xMax, w.yMax);
	const diagonal =
		withDiagonal && lo < hi
			? [
					[
						{ x: lo, y: lo },
						{ x: hi, y: hi }
					]
				]
			: [];

	const guides: SceneStaircase['guides'] = [];
	const termLabels: SceneStaircase['termLabels'] = [];
	if (seq.staircase!.showTerms) {
		const gap = (TERM_LABEL_GAP[size] ?? TERM_LABEL_GAP.moyenne) * (w.xMax - w.xMin);
		terms.forEach((t, k) => {
			const v = clean(t.value);
			if (k > 0 && inside(v, v)) guides.push({ from: { x: v, y: v }, to: { x: v, y: xAxisY } });
			const onAxis = v >= w.xMin - EPSILON && v <= w.xMax + EPSILON;
			if (onAxis && termLabels.every((l) => Math.abs(l.x - v) >= gap)) {
				termLabels.push({ n: t.n, x: v });
			}
		});
	}

	return {
		staircase: {
			curve,
			relationColor,
			diagonal,
			steps: clipPolyline(path, w),
			guides,
			termLabels
		},
		clipped: path.some((p) => !inside(p.x, p.y))
	};
}

// ============================================================================
// AIRES
// ============================================================================

function areaPolygon(fn: CourbeFunction, a: number, b: number, w: CourbeWindow): ScenePoint[] {
	const evaluate = evaluatorOf(fn);
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
	const sequences = spec.sequences ?? [];
	const cloudNames = sequences.filter((s) => !s.staircase).map((s) => s.name);
	const staircaseNames = sequences.filter((s) => s.staircase).map((s) => s.name);
	const parts: string[] = [];
	if (names.length > 0) {
		parts.push(`${names.length === 1 ? 'courbe de' : 'courbes de'} ${joinNames(names)}`);
	}
	if (cloudNames.length > 0) {
		parts.push(`${cloudNames.length === 1 ? 'suite' : 'suites'} ${joinNames(cloudNames)}`);
	}
	if (staircaseNames.length > 0) {
		parts.push(
			`${staircaseNames.length === 1 ? 'escalier de la suite' : 'escaliers des suites'} ${joinNames(staircaseNames)}`
		);
	}
	const tangentNames = [...new Set((spec.tangents ?? []).map((t) => t.functionName))];
	if (tangentNames.length > 0) {
		parts.push(
			`${(spec.tangents ?? []).length === 1 ? 'tangente à la courbe de' : 'tangentes aux courbes de'} ${joinNames(tangentNames)}`
		);
	}
	if (parts.length === 0) return `Repère, ${range}`;
	const text = parts.join(' et ');
	return `${text[0].toUpperCase()}${text.slice(1)}, ${range}`;
}

// ============================================================================
// SCÈNE
// ============================================================================

/** Scène vide : fenêtre inutilisable (spécification qui n'est pas passée par l'analyse). */
function emptyScene(spec: CourbeSpec, width: number, height: number, message: string): CourbeScene {
	return {
		window: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
		pixelSize: { width, height },
		grid: { xStep: 0, yStep: 0, xs: [], ys: [] },
		axes: { xAxisY: 0, yAxisX: 0 },
		originVisible: false,
		ticks: { x: [], y: [] },
		curves: [],
		endpoints: [],
		sequences: [],
		points: [],
		asymptotes: [],
		areas: [],
		tangents: [],
		curveLabels: [],
		ariaLabel: spec.description ?? 'Figure indisponible',
		warnings: [{ message }]
	};
}

/**
 * Construire la scène. Budget borné QUELLES QUE SOIENT les entrées : fenêtre
 * vérifiée, listes tronquées aux plafonds, grille plafonnée, échantillonnage
 * à nombre de points fixe.
 */
export function buildCourbeScene(input: CourbeSpec, options: CourbeSceneOptions = {}): CourbeScene {
	const locale = options.locale ?? 'fr';
	const width = COURBE_PIXEL_WIDTH[input.size] ?? COURBE_PIXEL_WIDTH.moyenne;
	const height = width * ASPECT_RATIO;
	const w = input.window;
	const problem = courbeRangeProblem(w.xMin, w.xMax) ?? courbeRangeProblem(w.yMin, w.yMax);
	if (problem) return emptyScene(input, width, height, `Fenêtre inutilisable : ${problem}`);

	const spec: CourbeSpec = {
		...input,
		functions: input.functions.slice(0, COURBE_LIMITS.functions),
		points: input.points.slice(0, COURBE_LIMITS.points),
		asymptotes: input.asymptotes.slice(0, COURBE_LIMITS.asymptotes),
		areas: input.areas.slice(0, COURBE_LIMITS.areas)
	};
	const warnings: CourbeIssue[] = [];

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
		// Pas multiple de π (`grille: pi/2`) : graduations en π, pas « 1,5707963… »
		const ratio = piRatio(step);
		return values
			.filter((v) => !originVisible || Math.abs(v - axisCross) > EPSILON)
			.filter((v) => Math.round(v / step) % stride === 0)
			.map((value) => ({
				value,
				label: ratio ? piTickLabel(Math.round(value / step), ratio) : formatTick(value, locale)
			}));
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

	// Suites : termes tronqués aux plafonds (spécification forgée), puis à la fenêtre.
	const sequences: SceneSequence[] = [];
	let termsLeft: number = COURBE_LIMITS.totalSequenceTerms;
	for (const seq of (input.sequences ?? []).slice(0, COURBE_LIMITS.sequences)) {
		const terms = seq.terms.slice(0, Math.min(COURBE_LIMITS.sequenceTerms, termsLeft));
		termsLeft -= terms.length;
		if (seq.staircase) {
			const severalStaircases =
				(input.sequences ?? []).filter((s) => s.staircase !== null).length > 1;
			// Une seule droite y = x, même avec plusieurs escaliers
			const withDiagonal = !sequences.some((s) => s.staircase !== null);
			const { staircase, clipped } = staircaseOf(
				seq,
				terms,
				w,
				xAxisY,
				input.size,
				withDiagonal,
				severalStaircases ? seq.color : 'noir',
				inside
			);
			if (staircase.curve.length === 0) {
				warnings.push({
					message: `Ligne ${seq.line} : la courbe de la relation de ${seq.name} n'apparaît pas dans la fenêtre`,
					line: seq.line
				});
			}
			if (clipped) {
				warnings.push({
					message: `Ligne ${seq.line} : l'escalier de ${seq.name} sort de la fenêtre, il est coupé au bord`,
					line: seq.line
				});
			}
			sequences.push({ name: seq.name, color: seq.color, terms: [], staircase });
			// Nom : sur la courbe de la relation, de sa couleur
			const anchor = seq.label ? labelAnchor(staircase.curve, points, w) : null;
			if (seq.label && anchor)
				curveLabels.push({
					label: seq.label,
					x: anchor.x,
					y: anchor.y,
					color: staircase.relationColor
				});
			continue;
		}
		const visible: ScenePoint[] = [];
		const hidden: number[] = [];
		for (const t of terms) {
			if (inside(t.n, t.value)) visible.push({ x: t.n, y: clean(t.value) });
			else hidden.push(t.n);
		}
		if (hidden.length > 0) {
			const ranks = hidden.slice(0, 3).join(', ') + (hidden.length > 3 ? '…' : '');
			warnings.push({
				message:
					hidden.length === 1
						? `Ligne ${seq.line} : 1 terme de ${seq.name} (rang ${ranks}) est hors de la fenêtre, il n'est pas dessiné`
						: `Ligne ${seq.line} : ${hidden.length} termes de ${seq.name} (rangs ${ranks}) sont hors de la fenêtre, ils ne sont pas dessinés`,
				line: seq.line
			});
		}
		sequences.push({ name: seq.name, color: seq.color, terms: visible, staircase: null });
		// Nom de la suite : près du dernier terme visible
		const last = visible[visible.length - 1];
		if (seq.label && last)
			curveLabels.push({ label: seq.label, x: last.x, y: last.y, color: seq.color });
	}

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
		// Aire restreinte à [a ; b] ∩ domaine de f ∩ fenêtre
		const from = Math.max(area.from, fn.domain?.min ?? -Infinity);
		const to = Math.min(area.to, fn.domain?.max ?? Infinity);
		if (!(from < to)) {
			warnings.push({
				message: `Ligne ${area.line} : l'aire est hors du domaine de ${fn.name}, elle n'est pas dessinée`,
				line: area.line
			});
			continue;
		}
		if (from > area.from || to < area.to) {
			warnings.push({
				message: `Ligne ${area.line} : aire restreinte au domaine de ${fn.name}, de ${formatTick(from, locale)} à ${formatTick(to, locale)}`,
				line: area.line
			});
		}
		const polygon = areaPolygon(fn, Math.max(from, w.xMin), Math.min(to, w.xMax), w);
		if (polygon.length === 0) {
			warnings.push({
				message: `Ligne ${area.line} : aire invisible dans la fenêtre`,
				line: area.line
			});
			continue;
		}
		areas.push({ color: fn.color, polygon });
	}

	// Tangentes : point de contact dans la fenêtre, droite découpée aux bords
	const tangents: SceneTangent[] = [];
	for (const t of (input.tangents ?? []).slice(0, COURBE_LIMITS.tangents)) {
		const fn = spec.functions.find((f) => f.name === t.functionName);
		if (!fn || !Number.isFinite(t.slope)) continue;
		if (!inside(t.x, t.y)) {
			warnings.push({
				message: `Ligne ${t.line} : le point de contact de la tangente à ${t.functionName} est hors de la fenêtre, elle n'est pas dessinée`,
				line: t.line
			});
			continue;
		}
		const at = (x: number) => ({ x, y: clean(t.slope * (x - t.x) + t.y) });
		tangents.push({
			functionName: t.functionName,
			color: fn.color,
			point: { x: clean(t.x), y: clean(t.y) },
			slope: t.slope,
			line: clipPolyline([at(w.xMin), at(w.xMax)], w)
		});
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
		sequences,
		points,
		asymptotes,
		areas,
		tangents,
		curveLabels,
		ariaLabel: spec.description ?? defaultAriaLabel(spec),
		warnings
	};
}
