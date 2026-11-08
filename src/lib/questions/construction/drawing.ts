/**
 * Tracé de l'élève dans une case « figure » (bloc ```figure-a-completer)
 * ==================================================================
 *
 * Logique PURE de l'écran : toucher un point puis un autre trace une droite ;
 * près d'un point de la figure, le toucher est aimanté sur lui ; outil point :
 * un toucher place un point ; équerre : une droite choisie (`guide`), puis un
 * point → la perpendiculaire ; compas : le centre, puis un point du cercle
 * (lot 2b, aimantation des instruments : `instruments.ts`) ; report : deux
 * touchers prennent l'écartement (`span`), chaque toucher suivant pique un
 * cercle de ce rayon (lot 4) ; rapporteur : le centre, puis un point de la base
 * le posent (`protractor`), chaque toucher suivant place un repère au degré
 * entier le plus proche, ‹ › le décalent, Retourner change de côté (lot 5) ; règle
 * graduée : le 0, puis la direction la posent (`regle(…)` dans la réponse), le
 * segment s'arrête sur ses graduations du mm, ‹ › décalent son bout d'1 mm,
 * Retourner change son bord (chantier `regle-graduee`, ADR 0036) ; « Effacer »
 * enlève le départ ou la droite en attente, sinon le dernier objet. Comportements validés
 * par David le 2026-10-25 (`docs/wip/geometrie-validation-progress.md` § 5).
 *
 * Aucune dépendance à geometry-core : les positions des points sont données
 * par l'appelant (la scène déjà calculée pour dessiner la figure).
 *
 * @module questions/construction/drawing
 */

import type { ConstructionCheck, ConstructionTool } from '$lib/ubumark/types/construction';
import type { FigureStep } from '$lib/ubumark/types/figure';
import {
	CONSTRUCTION_ANSWER_LIMITS,
	isDrawnLine,
	serializeConstructionAnswer,
	type DrawnLine,
	type DrawnObject,
	type DrawnRegle,
	type DrawnRepere
} from './answer';
import type { Position } from './judge';
import {
	perpendicularThrough,
	rulerGraduation,
	rulerGraduationOf,
	rulerMaxMm,
	snapInstrument,
	type SnapTargets,
	type StraightTrait
} from './instruments';
import { isPointCheck, pointSolution, type ExpectedPoints, type PointSolution } from './point';
import {
	bissectriceCorrections,
	isLineCheck,
	lineCodages,
	lineSolution,
	type BissectriceCorrection,
	type LineCodage
} from './line';
import { circleLengthRulers, circleSolution, isCircleCheck, type CircleSolution } from './circle';
import { polygonSolution } from './polygon';
import { triangleCorrection, triangleSolution, type TriangleCorrection } from './triangle';
import { angleCorrection, angleSolution, type AngleCorrection } from './angle';
import { measureCorrection } from './measure';
import { segmentLengthRuler, segmentLengthSolution } from './segment-length';
import { symmetrySolution, type FigureShapes } from './symmetry';

/** Rayon d'aimantation, en pixels À L'ÉCRAN (un doigt d'enfant sur tablette) */
export const SNAP_RADIUS_PX = 24;

/** Toucher hors d'un point : arrondi au centième d'unité (réponse courte, ~0,4 px) */
const FREE_TAP_DECIMALS = 2;

/** Deux touchers plus proches que ça : le même endroit (pas de droite) */
const SAME_TAP_EPSILON = 1e-9;

/** Case « figure » d'une question, telle que l'écran la passe à la figure */
export interface ConstructionAnswerInput {
	/** Réponse déjà tracée (`droite(…)|…`), '' sinon */
	value: string;
	/** true juste, false faux, null pas encore corrigé */
	isCorrect: boolean | null;
	disabled: boolean;
	onChange: (value: string) => void;
}

/**
 * Ce que l'élève a tracé ou placé, le départ d'un trait (ou le centre du
 * compas) en attente du second toucher, et la droite choisie pour l'équerre
 */
export interface Drawing {
	objects: DrawnObject[];
	start: Position | null;
	guide?: StraightTrait | null;
	/** Report : l'écartement pris (deux points), gardé d'un cercle à l'autre */
	span?: { a: Position; b: Position } | null;
	/** Rapporteur posé (lot 5), gardé d'un repère à l'autre */
	protractor?: Protractor | null;
}

/**
 * Rapporteur posé : centre, point de la base (le 0 de la graduation est sur la
 * demi-droite [centre, base)), côté du corps (1 : sens trigonométrique), rayon
 * (unités de la figure, choisi par l'écran)
 */
export interface Protractor {
	center: Position;
	base: Position;
	sens: 1 | -1;
	radius: number;
}

/** Réglages de l'écran pour un toucher */
export interface TapOptions {
	/** Rayon du rapporteur à poser, en unités de la figure */
	protractorRadius?: number;
}

export interface FigureWindow {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

function round(value: number): number {
	const factor = 10 ** FREE_TAP_DECIMALS;
	// `+ 0` : jamais de « -0 » dans la réponse
	return Math.round(value * factor) / factor + 0;
}

/**
 * Endroit retenu pour un toucher : le point de la figure le plus proche dans
 * le rayon (position exacte), sinon l'endroit touché, arrondi.
 *
 * @param radius - Rayon d'aimantation, en unités de la figure
 */
export function snapTap(
	tap: Position,
	points: ReadonlyMap<string, Position>,
	radius: number
): Position {
	let best: Position | null = null;
	let bestDistance = Infinity;
	for (const position of points.values()) {
		const distance = Math.hypot(position.x - tap.x, position.y - tap.y);
		if (distance <= radius && distance < bestDistance) {
			best = position;
			bestDistance = distance;
		}
	}
	return best ? { x: best.x, y: best.y } : { x: round(tap.x), y: round(tap.y) };
}

/** Avec des instruments (papier uni) : point, intersection, trait, sinon toucher libre arrondi */
export function snapWithInstruments(tap: Position, targets: SnapTargets, radius: number): Position {
	return snapInstrument(tap, targets, radius) ?? { x: round(tap.x), y: round(tap.y) };
}

/**
 * Quadrillage avec l'outil segment (CP-060) : chaque toucher va au nœud le
 * plus proche (plus de toucher libre, verdict du conseil § 2).
 */
export function snapToGrid(tap: Position, grid: FigureStep, window?: FigureWindow): Position {
	const node = (value: number, step: number, min: number, max: number) => {
		let n = Math.round(value / step) * step;
		// Bord de fenêtre hors des nœuds : rester sur un nœud de la fenêtre
		if (n < min - 1e-9) n += step;
		else if (n > max + 1e-9) n -= step;
		// `+ 0` : jamais de « -0 » dans la réponse
		return n + 0;
	};
	return {
		x: node(tap.x, grid.x, window?.xMin ?? -Infinity, window?.xMax ?? Infinity),
		y: node(tap.y, grid.y, window?.yMin ?? -Infinity, window?.yMax ?? Infinity)
	};
}

/**
 * L'objet ajouté, sauf au-delà des plafonds du juge (il rendrait la réponse
 * illisible) ; l'écartement du report est gardé
 */
function withObject(drawing: Drawing, object: DrawnObject): Drawing {
	const objects = [...drawing.objects, object];
	const kept = keptOf(drawing);
	if (
		objects.length > CONSTRUCTION_ANSWER_LIMITS.objects ||
		serializeConstructionAnswer(objects).length > CONSTRUCTION_ANSWER_LIMITS.chars
	) {
		return { objects: drawing.objects, start: null, ...kept };
	}
	return { objects, start: null, ...kept };
}

/** Ce qui reste pris d'un objet à l'autre : l'écartement du report, le rapporteur posé */
function keptOf(drawing: Drawing): Pick<Drawing, 'span' | 'protractor'> {
	return {
		...(drawing.span && { span: drawing.span }),
		...(drawing.protractor && { protractor: drawing.protractor })
	};
}

/**
 * Graduation (degré entier, 0..180) que vise un toucher, comptée depuis la base
 * dans le sens du rapporteur ; null au centre ou de l'autre côté de la base
 */
export function markDegree(protractor: Protractor, position: Position): number | null {
	const { center, base, sens } = protractor;
	const dx = position.x - center.x;
	const dy = position.y - center.y;
	if (Math.hypot(dx, dy) <= SAME_TAP_EPSILON) return null;
	const ux = base.x - center.x;
	const uy = base.y - center.y;
	const signed = (Math.atan2(ux * dy - uy * dx, ux * dx + uy * dy) * 180) / Math.PI;
	const deg = Math.round(sens * signed);
	// -180 et 180 : la même direction, côté graduations
	if (deg === -180) return 180;
	return deg >= 0 && deg <= 180 ? deg : null;
}

/** Le repère que pose ce rapporteur à cette graduation */
function markOf(protractor: Protractor, deg: number): DrawnRepere {
	const { center, base, sens, radius } = protractor;
	return {
		kind: 'repere',
		vx: center.x,
		vy: center.y,
		ax: base.x,
		ay: base.y,
		r: radius,
		deg,
		sens
	};
}

/** Le dernier objet est-il un repère de ce rapporteur (même pose, retourné ou non) ? */
function lastIsMarkOf(drawing: Drawing): boolean {
	const last = drawing.objects.at(-1);
	const p = drawing.protractor;
	if (!p || last?.kind !== 'repere') return false;
	return (
		last.vx === p.center.x &&
		last.vy === p.center.y &&
		last.ax === p.base.x &&
		last.ay === p.base.y &&
		last.r === p.radius
	);
}

/** Retourner : le corps du rapporteur passe de l'autre côté de sa base */
export function flipProtractor(drawing: Drawing): Drawing {
	const p = drawing.protractor;
	if (!p) return drawing;
	return { ...drawing, protractor: { ...p, sens: p.sens === 1 ? -1 : 1 } };
}

/**
 * ‹ › (et flèches au clavier) : décale de `delta` degrés le dernier repère de ce
 * rapporteur, borné à 0..180 ; sans repère, en pose un à la graduation 0 décalée
 */
export function nudgeMark(drawing: Drawing, delta: number): Drawing {
	const p = drawing.protractor;
	if (!p) return drawing;
	const clamp = (deg: number) => Math.min(180, Math.max(0, deg));
	const last = drawing.objects.at(-1);
	// Après Retourner, le repère d'avant reste où il est : ‹ › en posent un du nouveau côté (revue)
	if (lastIsMarkOf(drawing) && last?.kind === 'repere' && last.sens === p.sens) {
		const deg = clamp(last.deg + delta);
		if (deg === last.deg) return drawing;
		return { ...drawing, objects: [...drawing.objects.slice(0, -1), { ...last, deg }] };
	}
	return withObject(drawing, markOf(p, clamp(delta)));
}

/** La règle graduée posée : la dernière de la réponse ; null sans règle */
export function currentRuler(drawing: Pick<Drawing, 'objects'>): DrawnRegle | null {
	for (let i = drawing.objects.length - 1; i >= 0; i--) {
		const object = drawing.objects[i];
		if (object.kind === 'regle') return object;
	}
	return null;
}

/** Retourner : le corps de la règle posée passe de l'autre côté de son bord gradué */
export function flipRuler(drawing: Drawing): Drawing {
	const ruler = currentRuler(drawing);
	if (!ruler) return drawing;
	const flipped: DrawnRegle = { ...ruler, sens: ruler.sens === 1 ? -1 : 1 };
	return {
		...drawing,
		objects: drawing.objects.map((o) => (o === ruler ? flipped : o))
	};
}

/** Réglages de l'écran pour décaler le bout le long de la règle */
export interface RulerOptions {
	/** Longueur de la règle, en cm (`rulerLengthOf`) */
	rulerLength: number;
	window?: FigureWindow | null;
	/** Sans trait le long de la règle, ‹ › en tracent un : segment (défaut) ou cercle (compas, PR 3) */
	shape?: 'segment' | 'cercle';
}

/**
 * Le dernier objet est-il un segment le long de la règle posée (un bout à son 0,
 * l'autre sur une graduation), ou un cercle piqué au 0, ouvert sur une
 * graduation (PR 3 ; `end` = 2 : son point d'ouverture) ? Rend la graduation et
 * le bout qui la porte
 */
function lastAlongRuler(
	drawing: Drawing,
	ruler: DrawnRegle,
	rulerLength: number
): { mm: number; end: 1 | 2 } | null {
	const last = drawing.objects.at(-1);
	const atZero = (x: number, y: number) => x === ruler.ox && y === ruler.oy;
	if (last?.kind === 'cercle') {
		if (!atZero(last.cx, last.cy)) return null;
		const mm = rulerGraduationOf({ x: last.x, y: last.y }, ruler, rulerLength);
		return mm === null || mm === 0 ? null : { mm, end: 2 };
	}
	if (last?.kind !== 'segment') return null;
	const end = atZero(last.x1, last.y1) ? 2 : atZero(last.x2, last.y2) ? 1 : null;
	if (end === null) return null;
	const p = end === 2 ? { x: last.x2, y: last.y2 } : { x: last.x1, y: last.y1 };
	const mm = rulerGraduationOf(p, ruler, rulerLength);
	return mm === null ? null : { mm, end };
}

/** Longueur (mm) du segment le long de la règle posée, s'il est le dernier tracé ; null sinon */
export function rulerSegmentMm(drawing: Drawing, rulerLength: number): number | null {
	const ruler = currentRuler(drawing);
	return ruler ? (lastAlongRuler(drawing, ruler, rulerLength)?.mm ?? null) : null;
}

/**
 * ‹ › (et flèches) : décale de `delta` mm le bout du dernier segment le long de
 * la règle posée (ou l'ouverture du dernier cercle piqué au 0, PR 3), entre 1 mm
 * et la dernière graduation dans la fenêtre ; sans ce trait, en trace un
 * (`options.shape`) depuis le 0 jusqu'à la graduation `delta` (1 mm au moins)
 */
export function nudgeRulerEnd(drawing: Drawing, delta: number, options: RulerOptions): Drawing {
	const ruler = currentRuler(drawing);
	if (!ruler) return drawing;
	const max = rulerMaxMm(ruler, options.rulerLength, options.window);
	if (max < 1) return drawing;
	const clamp = (mm: number) => Math.min(max, Math.max(1, mm));
	const along = lastAlongRuler(drawing, ruler, options.rulerLength);
	if (along) {
		const mm = clamp(along.mm + delta);
		if (mm === along.mm) return drawing;
		const p = rulerGraduation(ruler, mm);
		const previous = drawing.objects.at(-1);
		if (previous?.kind === 'cercle') {
			const turned = { ...previous, x: p.x, y: p.y };
			return { ...drawing, objects: [...drawing.objects.slice(0, -1), turned] };
		}
		const last = previous as DrawnLine;
		const moved: DrawnLine =
			along.end === 2 ? { ...last, x2: p.x, y2: p.y } : { ...last, x1: p.x, y1: p.y };
		return { ...drawing, objects: [...drawing.objects.slice(0, -1), moved] };
	}
	const p = rulerGraduation(ruler, clamp(delta));
	if (options.shape === 'cercle') {
		return withObject(drawing, { kind: 'cercle', cx: ruler.ox, cy: ruler.oy, x: p.x, y: p.y });
	}
	return withObject(drawing, {
		kind: 'segment',
		x1: ruler.ox,
		y1: ruler.oy,
		x2: p.x,
		y2: p.y
	});
}

/** Équerre, premier toucher : la droite à longer (le départ éventuel est oublié) */
export function chooseGuide(drawing: Drawing, guide: StraightTrait): Drawing {
	return { objects: drawing.objects, start: null, guide };
}

/** Changer d'outil : le départ, la droite et l'écartement en attente sont oubliés */
export function cancelPending(drawing: Drawing): Drawing {
	return { objects: drawing.objects, start: null };
}

/**
 * Un toucher : outil point → le point (rien s'il y est déjà) ; sinon premier → départ ; second → la
 * droite (ou le segment, qui s'arrête à ses deux bouts). Toucher le départ une
 * seconde fois ne fait rien.
 */
export function addTap(
	drawing: Drawing,
	position: Position,
	tool: ConstructionTool = 'droite',
	options: TapOptions = {}
): Drawing {
	if (tool === 'rapporteur' && drawing.protractor) {
		const deg = markDegree(drawing.protractor, position);
		return deg === null ? drawing : withObject(drawing, markOf(drawing.protractor, deg));
	}
	if (tool === 'equerre') {
		// Sans droite choisie, l'écran appelle `chooseGuide` : un toucher seul ne trace rien
		if (!drawing.guide) return drawing;
		return withObject(drawing, perpendicularThrough(drawing.guide, position));
	}
	if (tool === 'point') {
		// Toucher un point déjà posé (double toucher) ne fait rien, comme le départ d'un trait
		const placed = drawing.objects.some(
			(o) =>
				o.kind === 'point' && Math.hypot(o.x - position.x, o.y - position.y) <= SAME_TAP_EPSILON
		);
		if (placed) return { objects: drawing.objects, start: null };
		return withObject(drawing, { kind: 'point', x: position.x, y: position.y });
	}
	if (tool === 'report' && drawing.span) {
		const { a, b } = drawing.span;
		return withObject(drawing, {
			kind: 'report',
			cx: position.x,
			cy: position.y,
			ax: a.x,
			ay: a.y,
			bx: b.x,
			by: b.y
		});
	}
	const { start } = drawing;
	if (!start) return { objects: drawing.objects, start: position };
	if (Math.hypot(position.x - start.x, position.y - start.y) <= SAME_TAP_EPSILON) return drawing;
	if (tool === 'report') {
		return { objects: drawing.objects, start: null, span: { a: start, b: position } };
	}
	if (tool === 'regle') {
		// Reposer la règle sans rien tracer depuis : elle remplace la précédente
		const ruler: DrawnRegle = {
			kind: 'regle',
			ox: start.x,
			oy: start.y,
			bx: position.x,
			by: position.y,
			sens: 1
		};
		const unused = drawing.objects.at(-1)?.kind === 'regle';
		const base = unused ? { ...drawing, objects: drawing.objects.slice(0, -1) } : drawing;
		return withObject(base, ruler);
	}
	if (tool === 'rapporteur') {
		// Rayon par défaut : la longueur de la base (l'écran donne le sien)
		const radius =
			options.protractorRadius ?? Math.hypot(position.x - start.x, position.y - start.y);
		return {
			objects: drawing.objects,
			start: null,
			protractor: { center: start, base: position, sens: 1, radius }
		};
	}
	if (tool === 'compas') {
		return withObject(drawing, {
			kind: 'cercle',
			cx: start.x,
			cy: start.y,
			x: position.x,
			y: position.y
		});
	}
	return withObject(drawing, {
		kind: tool,
		x1: start.x,
		y1: start.y,
		x2: position.x,
		y2: position.y
	});
}

/** Le dernier objet est-il un cercle piqué avec cet écartement ? */
function lastUsesSpan(drawing: Drawing): boolean {
	const last = drawing.objects.at(-1);
	const span = drawing.span;
	if (!span || last?.kind !== 'report') return false;
	return (
		last.ax === span.a.x && last.ay === span.a.y && last.bx === span.b.x && last.by === span.b.y
	);
}

/**
 * « Effacer » : le départ ou la droite en attente ; un écartement sans cercle
 * piqué depuis ; sinon le dernier objet (l'écartement reste pris)
 */
export function eraseLast(drawing: Drawing): Drawing {
	if (drawing.start || drawing.guide) return cancelPending(drawing);
	if (drawing.span && !lastUsesSpan(drawing)) return cancelPending(drawing);
	// Rapporteur posé : ses repères d'abord, puis lui
	if (drawing.protractor && !lastIsMarkOf(drawing)) return cancelPending(drawing);
	return { objects: drawing.objects.slice(0, -1), start: null, ...keptOf(drawing) };
}

export function canErase(drawing: Drawing): boolean {
	return (
		drawing.start !== null ||
		Boolean(drawing.guide) ||
		Boolean(drawing.span) ||
		Boolean(drawing.protractor) ||
		drawing.objects.length > 0
	);
}

/**
 * La bonne figure : une droite par vérification `droite_par`, par ses deux
 * points ; carré / rectangle : les côtés qui manquent (carré : du côté où
 * l'élève a le plus tracé, d'où `drawn`) ; symétrique : l'image, sans ce que
 * la figure de départ trace déjà (`shapes`) ; droite à construire : la droite
 * attendue (`expected`).
 */
export function solutionLines(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	drawn: readonly DrawnObject[] = [],
	shapes?: FigureShapes,
	expected?: ExpectedPoints
): DrawnLine[] {
	return checks.flatMap((check): DrawnLine[] => {
		if (check.kind === 'point' || check.kind === 'cercle' || check.kind === 'mesure') return [];
		if (check.kind === 'droite') return lineSolution([check], expected);
		if (check.kind === 'symetrique') return symmetrySolution(check, points, shapes);
		if (check.kind === 'triangle') return triangleSolution(check, points, shapes, drawn);
		if (check.kind === 'angle') return angleSolution(check, points, shapes, drawn);
		if (check.kind === 'segment') return segmentLengthSolution(check, points, shapes, drawn);
		if (check.kind !== 'droite_par')
			return polygonSolution(check, points, drawn.filter(isDrawnLine));
		const a = points.get(check.points[0]);
		const b = points.get(check.points[1]);
		if (!a || !b) return [];
		return [{ kind: 'droite', x1: a.x, y1: a.y, x2: b.x, y2: b.y }];
	});
}

/** Le codage des médiatrices à construire (angle droit au milieu, moitiés égales) */
export function solutionCodages(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>
): LineCodage[] {
	return lineCodages(checks.filter(isLineCheck), points);
}

/** Les bissectrices à construire (lot 9) : demi-angles codés, arcs de la construction */
export function solutionBissectrices(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>
): BissectriceCorrection[] {
	return bissectriceCorrections(checks.filter(isLineCheck), points);
}

/** Les cercles à construire (lot 3b) : le cercle, son centre, deux médiatrices */
export function solutionCircles(
	checks: readonly ConstructionCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes?: FigureShapes
): CircleSolution[] {
	return circleSolution(checks.filter(isCircleCheck), expected, points, shapes);
}

/** Le triangle à construire (lot 4) : arcs de report et codage des longueurs ; null sinon */
export function solutionTriangle(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): TriangleCorrection | null {
	const check = checks.find((c) => c.kind === 'triangle');
	return check ? triangleCorrection(check, points, shapes, drawn) : null;
}

/** L'angle à construire (lot 5) : l'arc codé de sa mesure ; null sinon */
export function solutionAngle(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): AngleCorrection | null {
	// Angle à mesurer (lot 6) : son arc, codé de la mesure de la figure
	const measure = checks.find((c) => c.kind === 'mesure');
	if (measure) return measureCorrection(measure, points, shapes);
	const check = checks.find((c) => c.kind === 'angle');
	return check ? angleCorrection(check, points, shapes, drawn) : null;
}

/**
 * La règle graduée de la correction : posée en A (segment de longueur donnée) ou
 * au centre O (cercle de rayon donné en cm, PR 3) ; null sinon
 */
export function solutionRuler(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnRegle | null {
	return solutionRulers(checks, points, shapes, drawn)[0] ?? null;
}

/** Toutes les règles graduées de la correction (cercles de rayon donné en cm : une par centre) */
export function solutionRulers(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnRegle[] {
	const check = checks.find((c) => c.kind === 'segment');
	if (check) {
		const ruler = segmentLengthRuler(check, points, shapes, drawn);
		return ruler ? [ruler] : [];
	}
	return circleLengthRulers(checks.filter(isCircleCheck), points, drawn);
}

/** Les points à placer : où ils vont, avec leur nom (vérifications `point`) */
export function solutionPoints(
	checks: readonly ConstructionCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>
): PointSolution[] {
	return pointSolution(checks.filter(isPointCheck), expected, points);
}

/**
 * La droite, découpée aux bords de la fenêtre (elle « dépasse des deux
 * côtés ») ; null si elle ne traverse pas la fenêtre.
 */
export function clipLineToWindow(
	line: DrawnLine,
	window: FigureWindow
): { x1: number; y1: number; x2: number; y2: number } | null {
	const dx = line.x2 - line.x1;
	const dy = line.y2 - line.y1;
	let tMin = -Infinity;
	let tMax = Infinity;
	// Liang-Barsky, sur la droite entière (t de -∞ à +∞)
	const sides: [number, number][] = [
		[-dx, line.x1 - window.xMin],
		[dx, window.xMax - line.x1],
		[-dy, line.y1 - window.yMin],
		[dy, window.yMax - line.y1]
	];
	for (const [p, q] of sides) {
		if (p === 0) {
			if (q < 0) return null;
			continue;
		}
		const t = q / p;
		if (p < 0) tMin = Math.max(tMin, t);
		else tMax = Math.min(tMax, t);
	}
	if (tMin > tMax || !Number.isFinite(tMin) || !Number.isFinite(tMax)) return null;
	return {
		x1: line.x1 + tMin * dx,
		y1: line.y1 + tMin * dy,
		x2: line.x1 + tMax * dx,
		y2: line.y1 + tMax * dy
	};
}
