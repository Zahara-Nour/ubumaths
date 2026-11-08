/**
 * Segment de longueur donnée, à la règle graduée (chantier `regle-graduee`, CE2-039)
 * ===============================================================================
 *
 * `verifier: segment AB = 6 cm` : A est un point de la figure. L'élève pose la
 * règle graduée (le 0 en A, puis la direction : `regle(…)` dans la réponse), puis
 * trace au segment de A jusqu'à une graduation du millimètre. Juste : un segment
 * d'un bout en A, de la longueur exacte, l'autre bout sur une graduation d'une
 * règle posée avec son 0 en A (ou un point construit, `constructionOf`) ; sinon
 * « tracé à l'œil ». 1 unité de la figure = 1 cm, la règle est graduée à
 * l'échelle de la figure (ADR 0036). Comportements validés par David le
 * 2026-11-08 (`docs/wip/regle-graduee-progress.md` § 2). Direction libre ; le
 * long d'une demi-droite donnée (Q7) : plus tard, avec CE2-070.
 *
 * @module questions/construction/segment-length
 */

import type { LengthUnit, SegmentLengthCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject, DrawnRegle } from './answer';
import {
	basePointsOf,
	constructionOf,
	isInFrame,
	rulerDirection,
	rulerGraduationOf
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import { tolerance } from './polygon';
import type { FigureShapes } from './symmetry';

/**
 * Longueur de la règle graduée (cm entiers) : le plus grand côté de la fenêtre,
 * arrondi au cm inférieur, 20 cm au plus (le double décimètre de l'école). La
 * même pour l'écran (`FigureACompleterView`) et pour le refus à la publication.
 */
export const RULER_MAX_LENGTH = 20;

export function rulerLengthOf(window: FigureShapes['window']): number {
	if (!window) return RULER_MAX_LENGTH;
	const side = Math.max(window.xMax - window.xMin, window.yMax - window.yMin);
	return Math.max(1, Math.min(RULER_MAX_LENGTH, Math.floor(side + 1e-9)));
}

/** Écart admis (relatif) sur la longueur : une graduation arrive exacte, au calcul flottant près */
const LENGTH_EPSILON = 1e-9;

/** Une longueur (mm entiers) dans l'unité de l'auteur : « 5,8 cm », « 5 cm 8 mm », « 58 mm » */
export function formatLength(mm: number, unit: LengthUnit): string {
	if (unit === 'mm') return `${mm} mm`;
	if (unit === 'cm') return `${String(mm / 10).replace('.', ',')} cm`;
	const cm = Math.floor(mm / 10);
	const rest = mm % 10;
	if (cm === 0) return `${rest} mm`;
	return rest === 0 ? `${cm} cm` : `${cm} cm ${rest} mm`;
}

export const missingSegmentFeedback = (a: string, b: string) =>
	`Trace le segment [${a}${b}] depuis le point ${a}.`;
export const segmentEyeballedFeedback = () =>
	'Ton segment est tracé à l’œil : arrête-le sur une graduation de la règle.';
export const wrongLengthFeedback = (
	measured: number,
	check: Pick<SegmentLengthCheck, 'length' | 'unit'>
) =>
	`Ton segment mesure ${formatLength(measured, check.unit)} au lieu de ${formatLength(check.length, check.unit)}.`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class SegmentLengthAuthorError extends Error {}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);

function labelOf(check: SegmentLengthCheck): string {
	return `verifier: segment ${check.point}${check.end} = ${formatLength(check.length, check.unit)}`;
}

/** Longueur de la demi-droite issue de `o`, de direction `d` (unitaire), dans la fenêtre */
function roomAlong(o: Position, d: Position, window: FigureShapes['window']): number {
	if (!window) return Infinity;
	let exit = Infinity;
	if (d.x > 0) exit = Math.min(exit, (window.xMax - o.x) / d.x);
	if (d.x < 0) exit = Math.min(exit, (window.xMin - o.x) / d.x);
	if (d.y > 0) exit = Math.min(exit, (window.yMax - o.y) / d.y);
	if (d.y < 0) exit = Math.min(exit, (window.yMin - o.y) / d.y);
	return Math.max(0, exit);
}

/** Le coin de la fenêtre le plus loin de `a` (le segment le plus long qui y tient part vers lui) */
function farthestCorner(a: Position, window: NonNullable<FigureShapes['window']>): Position {
	const corners = [
		{ x: window.xMin, y: window.yMin },
		{ x: window.xMax, y: window.yMin },
		{ x: window.xMin, y: window.yMax },
		{ x: window.xMax, y: window.yMax }
	];
	return corners.reduce((best, c) => (distance(a, c) > distance(a, best) ? c : best));
}

/** Le point de départ, la longueur (unités) et la règle ; erreur d'AUTEUR si le segment ne se trace pas */
function settingOf(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): { a: Position; length: number; rulerLength: number } {
	const label = labelOf(check);
	if (!shapes) {
		throw new SegmentLengthAuthorError(
			'Case « figure » : traits de la figure non fournis au juge (segment de longueur donnée)'
		);
	}
	if (shapes.grid) {
		throw new SegmentLengthAuthorError(`${label} : la règle graduée sert sur papier uni`);
	}
	const { window } = shapes;
	if (!window) {
		throw new SegmentLengthAuthorError(
			`${label} : écrire la fenêtre (fenetre:) : la règle et la longueur se règlent sur elle`
		);
	}
	const a = points.get(check.point);
	if (!a) {
		throw new SegmentLengthAuthorError(
			`${label} : le point ${check.point} n’existe pas dans la figure`
		);
	}
	if (!shapes.visiblePoints.has(check.point)) {
		throw new SegmentLengthAuthorError(
			`${label} : ${check.point} n’est pas visible (l’élève ne peut pas y poser la règle)`
		);
	}
	if (!isInFrame(a, window)) {
		throw new SegmentLengthAuthorError(`${label} : ${check.point} est hors de la fenêtre`);
	}
	if (points.has(check.end)) {
		throw new SegmentLengthAuthorError(
			`${label} : le point ${check.end} existe déjà dans la figure (le segment [${check.point}${check.end}] est à tracer)`
		);
	}
	const length = check.length / 10;
	const rulerLength = rulerLengthOf(window);
	if (length > rulerLength) {
		throw new SegmentLengthAuthorError(
			`${label} : plus long que la règle (${rulerLength} cm : le plus grand côté de la fenêtre, ${RULER_MAX_LENGTH} cm au plus) ; agrandir la fenêtre`
		);
	}
	if (distance(a, farthestCorner(a, window)) < length - tolerance(a)) {
		throw new SegmentLengthAuthorError(
			`${label} : le segment ne tient pas dans la fenêtre depuis ${check.point}, dans aucune direction ; éloigner ${check.point} du bord ou agrandir la fenêtre`
		);
	}
	return { a, length, rulerLength };
}

/** La vérification est-elle faisable ? Erreur d'AUTEUR sinon */
export function assertSegmentLength(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/** L'autre bout d'un segment qui part de `a`, sinon null */
function farEnd(line: DrawnLine, a: Position, eps: number): Position | null {
	const p = { x: line.x1, y: line.y1 };
	const q = { x: line.x2, y: line.y2 };
	if (distance(p, a) <= eps) return q;
	if (distance(q, a) <= eps) return p;
	return null;
}

/**
 * Verdict : un segment partant de A, l'autre bout sur une graduation d'une règle
 * posée avec son 0 en A (ou construit), de la longueur donnée. Plusieurs
 * segments : juste si l'un convient ; sinon le message du premier bout construit.
 * Une droite, un point (sans leur outil), un bout hors de la fenêtre (l'écran
 * ne l'atteint pas) : réponse forgée.
 */
export function judgeSegmentLength(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const { a, length, rulerLength } = settingOf(check, points, shapes);
	const figure = shapes as FigureShapes;
	if (objects.some((obj) => obj.kind !== 'segment' && obj.kind !== 'regle')) {
		return { status: 'incorrect' };
	}
	const eps = tolerance(a);
	const segments = objects.filter((obj): obj is DrawnLine => obj.kind === 'segment');
	const ends = segments.flatMap((s) => farEnd(s, a, eps) ?? []);
	if (ends.length === 0) {
		return { status: 'incorrect', feedback: missingSegmentFeedback(check.point, check.end) };
	}
	const window = figure.window;
	if (window && ends.some((p) => !isInFrame(p, window))) {
		return { status: 'incorrect' };
	}
	// Règles posées avec leur 0 en A : leurs graduations sont des bouts construits
	const rulers = objects.filter(
		(obj): obj is DrawnRegle => obj.kind === 'regle' && distance({ x: obj.ox, y: obj.oy }, a) <= eps
	);
	const construction = constructionOf(
		objects,
		basePointsOf(points, figure.segments),
		figure.traits
	);
	const built = ends.filter(
		(p) =>
			construction.isBuilt(p) ||
			rulers.some((ruler) => {
				const mm = rulerGraduationOf(p, ruler, rulerLength);
				return mm !== null && mm > 0;
			})
	);
	if (built.length === 0) return { status: 'incorrect', feedback: segmentEyeballedFeedback() };
	const lengths = built.map((p) => distance(a, p));
	if (lengths.some((l) => Math.abs(l - length) <= LENGTH_EPSILON * Math.max(1, length))) {
		return { status: 'correct' };
	}
	return {
		status: 'incorrect',
		feedback: wrongLengthFeedback(Math.round(lengths[0] * 10), check)
	};
}

/**
 * La règle de la correction : posée en A, dans la direction de la dernière règle
 * que l'élève a posée en A, sinon de son premier segment partant de A, sinon
 * vers la droite, la gauche, le haut, le bas, le coin le plus loin — la
 * première où le segment tient ; null si le segment ne se trace pas
 */
export function segmentLengthRuler(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnRegle | null {
	let setting: ReturnType<typeof settingOf>;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return null;
	}
	const { a, length } = setting;
	const window = shapes?.window ?? null;
	const eps = tolerance(a);
	const unit = (p: Position): Position | null => {
		const d = distance(a, p);
		return d <= eps ? null : { x: (p.x - a.x) / d, y: (p.y - a.y) / d };
	};
	const fits = (d: Position) => roomAlong(a, d, window) >= length - eps;
	const posed = drawn.filter(
		(obj): obj is DrawnRegle => obj.kind === 'regle' && distance({ x: obj.ox, y: obj.oy }, a) <= eps
	);
	const own = posed.at(-1);
	if (own && fits(rulerDirection(own))) return own;
	const fromSegments = drawn.flatMap((obj) => {
		if (obj.kind !== 'segment') return [];
		const end = farEnd(obj, a, eps);
		const d = end ? unit(end) : null;
		return d ? [d] : [];
	});
	const axes = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 }
	];
	const corner = window ? unit(farthestCorner(a, window)) : null;
	const direction = [...fromSegments, ...axes, ...(corner ? [corner] : [])].find(fits);
	if (!direction) return null;
	return { kind: 'regle', ox: a.x, oy: a.y, bx: a.x + direction.x, by: a.y + direction.y, sens: 1 };
}

/** La correction : le segment juste, le long de la règle de la correction */
export function segmentLengthSolution(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnLine[] {
	const ruler = segmentLengthRuler(check, points, shapes, drawn);
	if (!ruler) return [];
	const u = rulerDirection(ruler);
	const length = check.length / 10;
	return [
		{
			kind: 'segment',
			x1: ruler.ox,
			y1: ruler.oy,
			x2: ruler.ox + length * u.x + 0,
			y2: ruler.oy + length * u.y + 0
		}
	];
}
