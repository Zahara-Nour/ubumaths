/**
 * Angle de mesure donnée, au rapporteur (chantier `controles-figure`, lot 5)
 * ========================================================================
 *
 * `verifier: angle AOy = 50` : le côté [OA) est donné. L'élève pose le
 * rapporteur (centre O, base le long de [OA)), place un repère à la graduation
 * voulue (`repere(…)`), puis trace au segment le côté [Oy), de O au repère.
 * Juste : un segment partant de O dont l'autre bout est CONSTRUIT (repère d'un
 * rapporteur centré en O, ou point construit, `constructionOf`) et qui fait avec [OA) un
 * angle de la mesure donnée, d'un côté ou de l'autre de (OA). Phase 0 validée
 * par David le 2026-11-03 (`docs/wip/controles-figure-progress.md` § 16).
 *
 * @module questions/construction/angle
 */

import type { AngleCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject } from './answer';
import { basePointsOf, constructionOf, isBuiltMark, isInFrame, repereAt } from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import { tolerance } from './polygon';
import type { FigureShapes } from './symmetry';

/**
 * Rayon du rapporteur : cette part du plus petit côté de la fenêtre (décision de
 * David du 2026-11-03, § 18). Le même pour l'écran (`FigureACompleterView`) et
 * pour le refus à la publication : l'élève doit voir toutes les graduations.
 */
export const PROTRACTOR_WINDOW_RATIO = 0.35;

/** Rayon par défaut sans fenêtre (unités de la figure) */
const PROTRACTOR_DEFAULT_RADIUS = 3;

/** Rayon du rapporteur pour cette fenêtre, en unités de la figure */
export function protractorRadiusOf(window: FigureShapes['window']): number {
	if (!window) return PROTRACTOR_DEFAULT_RADIUS;
	return PROTRACTOR_WINDOW_RATIO * Math.min(window.xMax - window.xMin, window.yMax - window.yMin);
}

/**
 * Fenêtre au plus deux fois plus large que haute (ou l'inverse) pour un angle,
 * à construire ou à mesurer (décision de David, M1 du § 18) : au-delà, sur un
 * petit écran, le rapporteur (part du plus petit côté) devient illisible
 */
export const PROTRACTOR_WINDOW_MAX_RATIO = 2;

/** Ce qui ne va pas dans la fenêtre pour poser un rapporteur ; null si elle convient */
export function protractorWindowError(window: FigureShapes['window']): string | null {
	if (!window) return null;
	const width = window.xMax - window.xMin;
	const height = window.yMax - window.yMin;
	if (Math.max(width / height, height / width) <= PROTRACTOR_WINDOW_MAX_RATIO) return null;
	return `fenêtre trop allongée pour le rapporteur (${PROTRACTOR_WINDOW_MAX_RATIO} fois plus large que haute au plus, ou l’inverse) : il serait illisible sur un petit écran`;
}

/**
 * Le demi-rapporteur posé en `o`, base le long de [OA) (direction unitaire `u`),
 * corps du côté `sens`, tient-il entier dans la fenêtre ? (sa barre, de l'autre
 * côté de la base, peut dépasser)
 */
export function protractorFits(
	o: Position,
	u: Position,
	sens: 1 | -1,
	radius: number,
	window: FigureShapes['window']
): boolean {
	if (!window) return true;
	const eps = tolerance(o);
	// Pour chaque bord : jusqu'où le demi-disque s'étend vers lui (1 si la direction du bord est
	// du côté du corps, sinon le plus loin des deux bouts de la base)
	const reach = (e: Position) => {
		const inside = sens * (u.x * e.y - u.y * e.x) >= 0;
		return inside ? 1 : Math.abs(u.x * e.x + u.y * e.y);
	};
	return (
		o.x + radius * reach({ x: 1, y: 0 }) <= window.xMax + eps &&
		o.x - radius * reach({ x: -1, y: 0 }) >= window.xMin - eps &&
		o.y + radius * reach({ x: 0, y: 1 }) <= window.yMax + eps &&
		o.y - radius * reach({ x: 0, y: -1 }) >= window.yMin - eps
	);
}

/** Écart admis sur la mesure (degrés) : un repère arrive exact, au calcul flottant près */
const MEASURE_EPSILON = 1e-6;

/** Mesure lue à l'élève : entière, sinon au dixième (virgule) */
function degrees(value: number): string {
	const tenth = Math.round(value * 10) / 10;
	return `${String(tenth).replace('.', ',')}°`;
}

export const missingAngleSideFeedback = (o: string, side: string) =>
	`Trace le côté [${o}${side}) de l’angle, depuis le sommet ${o}.`;
export const angleEyeballedFeedback = () =>
	'Ton côté est tracé à l’œil : place un repère avec le rapporteur.';
export const wrongScaleFeedback = (measured: number, expected: number) =>
	`Ton angle mesure ${degrees(measured)} au lieu de ${degrees(expected)} : tu as lu la mauvaise graduation du rapporteur.`;
export const wrongAngleFeedback = (measured: number, expected: number) =>
	`Ton angle mesure ${degrees(measured)} au lieu de ${degrees(expected)}.`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class AngleAuthorError extends Error {}

/** Ce que l'auteur a écrit, calculé */
interface AngleSetting {
	o: Position;
	a: Position;
	/** Directions (unitaires) des deux côtés [Oy) possibles qui ont la place dans la fenêtre */
	sides: { direction: Position; sens: 1 | -1; room: number }[];
	/** Rayon du rapporteur */
	radius: number;
}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);

function labelOf(check: AngleCheck): string {
	return `verifier: angle ${check.points[0]}${check.points[1]}${check.side} = ${check.measure}`;
}

/** Direction de [OA) tournée de `measure` degrés dans le sens `sens` */
function rotated(o: Position, a: Position, measure: number, sens: 1 | -1): Position {
	const angle = Math.atan2(a.y - o.y, a.x - o.x) + (sens * measure * Math.PI) / 180;
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Longueur de la demi-droite issue de `o`, de direction `d`, dans la fenêtre (Infinity sans fenêtre) */
function roomAlong(o: Position, d: Position, window: FigureShapes['window']): number {
	if (!window) return Infinity;
	let exit = Infinity;
	if (d.x > 0) exit = Math.min(exit, (window.xMax - o.x) / d.x);
	if (d.x < 0) exit = Math.min(exit, (window.xMin - o.x) / d.x);
	if (d.y > 0) exit = Math.min(exit, (window.yMax - o.y) / d.y);
	if (d.y < 0) exit = Math.min(exit, (window.yMin - o.y) / d.y);
	return Math.max(0, exit);
}

/** Sommet, point du côté donné et côtés possibles ; erreur d'AUTEUR si l'angle ne se construit pas */
function settingOf(
	check: AngleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): AngleSetting {
	const label = labelOf(check);
	if (!shapes) {
		throw new AngleAuthorError('Case « figure » : traits de la figure non fournis au juge (angle)');
	}
	if (shapes.grid) throw new AngleAuthorError(`${label} : l’angle se construit sur papier uni`);
	const windowError = protractorWindowError(shapes.window);
	if (windowError) throw new AngleAuthorError(`${label} : ${windowError}`);
	const [nameA, nameO] = check.points;
	const [a, o] = [nameA, nameO].map((name) => {
		const at = points.get(name);
		if (!at) throw new AngleAuthorError(`${label} : le point ${name} n’existe pas dans la figure`);
		if (!shapes.visiblePoints.has(name)) {
			throw new AngleAuthorError(
				`${label} : ${name} n’est pas visible (l’élève ne peut pas y poser le rapporteur)`
			);
		}
		if (shapes.window && !isInFrame(at, shapes.window)) {
			throw new AngleAuthorError(`${label} : ${name} est hors de la fenêtre`);
		}
		return at;
	});
	if (distance(a, o) <= tolerance(a, o)) {
		throw new AngleAuthorError(`${label} : ${nameA} et ${nameO} sont au même endroit`);
	}
	if (points.has(check.side)) {
		throw new AngleAuthorError(
			`${label} : le point ${check.side} existe déjà dans la figure (le côté [${nameO}${check.side}) est à tracer)`
		);
	}
	// Côtés possibles : ceux où le demi-rapporteur posé en O tient dans la fenêtre (son
	// repère, à son bord, y est donc aussi)
	const radius = protractorRadiusOf(shapes.window);
	const length = distance(o, a);
	const u = { x: (a.x - o.x) / length, y: (a.y - o.y) / length };
	const sides = ([1, -1] as const).flatMap((sens) => {
		if (!protractorFits(o, u, sens, radius, shapes.window)) return [];
		const direction = rotated(o, a, check.measure, sens);
		return [{ direction, sens, room: roomAlong(o, direction, shapes.window) }];
	});
	return { o, a, sides, radius };
}

/** Les vérifications sont-elles faisables ? Erreur d'AUTEUR sinon */
export function assertAngle(
	check: AngleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	const { sides } = settingOf(check, points, shapes);
	if (sides.length === 0) {
		throw new AngleAuthorError(
			`${labelOf(check)} : le rapporteur posé en ${check.points[1]} sort de la figure, d’un côté de (${check.points[1]}${check.points[0]}) comme de l’autre : éloigner ${check.points[1]} du bord ou agrandir la fenêtre`
		);
	}
}

/** Angle (degrés, 0..180) entre [OA) et [OP) */
function angleBetween(o: Position, a: Position, p: Position): number {
	const u = { x: a.x - o.x, y: a.y - o.y };
	const v = { x: p.x - o.x, y: p.y - o.y };
	return (Math.atan2(Math.abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y) * 180) / Math.PI;
}

/** L'autre bout d'un segment qui part de `o`, sinon null */
function farEnd(line: DrawnLine, o: Position, eps: number): Position | null {
	const p = { x: line.x1, y: line.y1 };
	const q = { x: line.x2, y: line.y2 };
	if (distance(p, o) <= eps) return q;
	if (distance(q, o) <= eps) return p;
	return null;
}

/**
 * Verdict : un côté (segment partant de O, autre bout construit) à la mesure
 * donnée. Plusieurs côtés : juste si l'un convient ; sinon le message du premier
 * côté construit. Le côté donné repassé n'est pas un côté ; un point, une droite
 * ou un cercle (sans leur outil) : réponse forgée.
 */
export function judgeAngle(
	check: AngleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const { o, a } = settingOf(check, points, shapes);
	const figure = shapes as FigureShapes;
	if (objects.some((obj) => obj.kind !== 'segment' && obj.kind !== 'repere')) {
		return { status: 'incorrect' };
	}
	const segments = objects.filter((obj): obj is DrawnLine => obj.kind === 'segment');
	const ends = segments.flatMap((s) => farEnd(s, o, tolerance(o, a)) ?? []);
	// Le côté donné repassé : angle nul, pas un second côté
	const sides = ends.filter((p) => angleBetween(o, a, p) > MEASURE_EPSILON);
	if (sides.length === 0) {
		return {
			status: 'incorrect',
			feedback: missingAngleSideFeedback(check.points[1], check.side)
		};
	}
	const construction = constructionOf(
		objects,
		basePointsOf(points, figure.segments),
		figure.traits
	);
	// Repères d'un rapporteur centré en O : leur direction depuis O est construite (revue)
	const eps = tolerance(o, a);
	const marks = objects.flatMap((m) =>
		m.kind === 'repere' && distance({ x: m.vx, y: m.vy }, o) <= eps && isBuiltMark(m, construction)
			? [repereAt(m)]
			: []
	);
	const built = sides.filter(
		(p) => construction.isBuilt(p) || marks.some((q) => distance(p, q) <= tolerance(p, q))
	);
	if (built.length === 0) return { status: 'incorrect', feedback: angleEyeballedFeedback() };
	const measures = built.map((p) => angleBetween(o, a, p));
	if (measures.some((m) => Math.abs(m - check.measure) <= MEASURE_EPSILON)) {
		return { status: 'correct' };
	}
	const measured = measures[0];
	if (Math.abs(measured - (180 - check.measure)) <= MEASURE_EPSILON) {
		return { status: 'incorrect', feedback: wrongScaleFeedback(measured, check.measure) };
	}
	return { status: 'incorrect', feedback: wrongAngleFeedback(measured, check.measure) };
}

/**
 * Le côté de la correction : du côté de (OA) où l'élève a tracé (premier
 * segment partant de O hors de (OA)), sinon un côté où le rapporteur tient ;
 * null si l'angle ne se construit pas
 */
function correctionSide(
	check: AngleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): { o: Position; a: Position; end: Position; sens: 1 | -1 } | null {
	let setting: AngleSetting;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return null;
	}
	const { o, a, sides, radius } = setting;
	if (sides.length === 0) return null;
	const eps = tolerance(o, a);
	const u = { x: a.x - o.x, y: a.y - o.y };
	const drawnSens = drawn.flatMap((obj): (1 | -1)[] => {
		if (obj.kind !== 'segment') return [];
		const p = farEnd(obj, o, eps);
		if (!p) return [];
		const cross = u.x * (p.y - o.y) - u.y * (p.x - o.x);
		if (Math.abs(cross) <= eps * distance(o, p)) return [];
		return [cross > 0 ? 1 : -1];
	})[0];
	// Le côté où l'élève a tracé, même si le rapporteur n'y tient pas (son côté y est juste,
	// revue de #2305) ; sinon un côté où il tient
	const drawnDirection = drawnSens ? rotated(o, a, check.measure, drawnSens) : null;
	const drawnRoom = drawnDirection ? roomAlong(o, drawnDirection, shapes?.window ?? null) : 0;
	const side =
		drawnSens && drawnDirection && drawnRoom > eps
			? { direction: drawnDirection, sens: drawnSens, room: drawnRoom }
			: (sides.find((s) => s.sens === drawnSens) ?? sides[0]);
	const length = Math.min(Math.max(distance(o, a), radius), side.room);
	const end = { x: o.x + side.direction.x * length, y: o.y + side.direction.y * length };
	return { o, a, end, sens: side.sens };
}

/** La correction : le côté [Oy) en segment */
export function angleSolution(
	check: AngleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnLine[] {
	const side = correctionSide(check, points, shapes, drawn);
	if (!side) return [];
	return [{ kind: 'segment', x1: side.o.x, y1: side.o.y, x2: side.end.x, y2: side.end.y }];
}

/** Codage de la correction : l'arc de l'angle, de [OA) à [Oy), et sa mesure */
export interface AngleCorrection {
	center: Position;
	/** Un point de [OA) et un point de [Oy) */
	from: Position;
	to: Position;
	measure: number;
	/** Sens de [OA) vers [Oy) : 1 trigonométrique */
	sens: 1 | -1;
}

export function angleCorrection(
	check: AngleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): AngleCorrection | null {
	const side = correctionSide(check, points, shapes, drawn);
	if (!side) return null;
	return { center: side.o, from: side.a, to: side.end, measure: check.measure, sens: side.sens };
}
