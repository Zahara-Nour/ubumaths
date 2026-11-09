/**
 * Segment de longueur donnée, à la règle graduée (chantier `regle-graduee`, CE2-039)
 * ===============================================================================
 *
 * `verifier: segment AB = 6 cm` : A est un point de la figure. L'élève pose la
 * règle graduée (le 0 en A, puis la direction : `regle(…)` dans la réponse), puis
 * trace au segment de A jusqu'à une graduation du millimètre. Juste : un segment
 * d'un bout en A, de la longueur exacte, l'autre bout sur une graduation d'une
 * règle posée avec son 0 en A, jugé sur le segment que l'élève voit ; sinon
 * « tracé à l'œil ». 1 unité de la figure = 1 cm, la règle est graduée à
 * l'échelle de la figure (ADR 0036). Comportements validés par David le
 * 2026-11-08 (`docs/wip/regle-graduee-progress.md` § 2). Direction libre, ou
 * le long d'une demi-droite donnée (`segment AB = 6 cm sur [Ax)`, Q7, § 4) : le
 * bout doit alors être sur [Ax) ; la correction pose la règle le long d'elle.
 *
 * @module questions/construction/segment-length
 */

import type { LengthUnit, SegmentLengthCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject, DrawnRegle } from './answer';
import {
	intersectTraits,
	isInFrame,
	isStraight,
	rulerDirection,
	rulerGraduationOf,
	type Trait
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

/**
 * Écart admis (relatif) entre un point de la figure et la longueur demandée
 * (refus de l'auteur) ; l'élève, lui, est jugé en millimètres entiers
 */
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
export const severalSegmentsFeedback = (a: string, b: string) =>
	`Trace un seul segment [${a}${b}] depuis le point ${a}.`;
export const offRayFeedback = (a: string, ray: string) =>
	`Trace ton segment sur la demi-droite [${a}${ray}).`;
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
	const onRay = check.ray ? ` sur [${check.point}${check.ray})` : '';
	return `verifier: segment ${check.point}${check.end} = ${formatLength(check.length, check.unit)}${onRay}`;
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

/**
 * Le point de départ, la longueur (unités), la règle et la direction de la
 * demi-droite donnée (null : direction libre) ; erreur d'AUTEUR si le segment ne
 * se trace pas
 */
function settingOf(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): { a: Position; length: number; rulerLength: number; ray: Position | null } {
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
	// Revue de #2485 : [AC] donnerait la réponse sans mesurer (C s'aimante au toucher)
	for (const [name, p] of points) {
		if (name === check.point || !shapes.visiblePoints.has(name)) continue;
		if (Math.abs(distance(a, p) - length) <= LENGTH_EPSILON * Math.max(1, length)) {
			throw new SegmentLengthAuthorError(
				`${label} : ${name} est déjà à ${formatLength(check.length, check.unit)} de ${check.point}, l’élève n’aurait qu’à tracer [${check.point}${name}] ; déplacer ${name} ou changer la longueur`
			);
		}
	}
	if (distance(a, farthestCorner(a, window)) < length - tolerance(a)) {
		throw new SegmentLengthAuthorError(
			`${label} : le segment ne tient pas dans la fenêtre depuis ${check.point}, dans aucune direction ; éloigner ${check.point} du bord ou agrandir la fenêtre`
		);
	}
	const ray = check.ray ? rayOf(check, check.ray, a, shapes, label) : null;
	if (ray && roomAlong(a, ray, window) < length - tolerance(a)) {
		throw new SegmentLengthAuthorError(
			`${label} : le segment ne tient pas sur la demi-droite [${check.point}${check.ray}) dans la fenêtre ; rapprocher ${check.point} du bord opposé, changer la direction de [${check.point}${check.ray}) ou agrandir la fenêtre`
		);
	}
	if (ray) assertNoCrossingAt(check, a, ray, length, shapes, label);
	return { a, length, rulerLength, ray };
}

/**
 * Revue : un croisement de traits, ou un bout de trait, sur [Ax) à la longueur
 * demandée de A donnerait le bout sans mesurer (cas frère du point visible, #2485)
 */
function assertNoCrossingAt(
	check: SegmentLengthCheck,
	a: Position,
	u: Position,
	length: number,
	shapes: FigureShapes,
	label: string
): void {
	const eps = tolerance(a);
	const rayTrait: Trait = { kind: 'ray', a, b: { x: a.x + u.x, y: a.y + u.y } };
	const others = shapes.traits.filter(
		(t) => !(t.kind === 'ray' && distance(t.a, a) <= eps && onRay(t.b, a, u, eps))
	);
	const candidates = others.flatMap((t) => [
		...intersectTraits(rayTrait, t),
		...(isStraight(t) && t.kind === 'segment' ? [t.a, t.b] : [])
	]);
	const at = candidates.find(
		(p) =>
			onRay(p, a, u, eps) &&
			Math.abs(distance(a, p) - length) <= LENGTH_EPSILON * Math.max(1, length)
	);
	if (at) {
		throw new SegmentLengthAuthorError(
			`${label} : un croisement (ou un bout) de traits sur [${check.point}${check.ray}) est déjà à ${formatLength(check.length, check.unit)} de ${check.point}, l’élève n’aurait qu’à y arrêter son segment ; déplacer le trait ou changer la longueur`
		);
	}
}

/** Direction (unitaire) de la demi-droite `name` d'origine A ; erreur d'AUTEUR sinon */
function rayOf(
	check: SegmentLengthCheck,
	name: string,
	a: Position,
	shapes: FigureShapes,
	label: string
): Position {
	const ray = `[${check.point}${name})`;
	const line = shapes.lines.get(name);
	if (!line) {
		throw new SegmentLengthAuthorError(
			`${label} : la demi-droite ${ray} n’existe pas dans la figure (« ${name} = demidroite(${check.point}, …) »)`
		);
	}
	if (line.kind !== 'ray' || distance(line.a, a) > tolerance(a)) {
		throw new SegmentLengthAuthorError(
			`${label} : ${name} n’est pas une demi-droite d’origine ${check.point} (« ${name} = demidroite(${check.point}, …) »)`
		);
	}
	if (!line.visible) {
		throw new SegmentLengthAuthorError(
			`${label} : la demi-droite ${ray} n’est pas tracée (l’élève ne peut pas y poser la règle)`
		);
	}
	const r = distance(line.a, line.b);
	// Revue : X sur A, la direction serait NaN (toutes les réponses fausses)
	if (r <= tolerance(a)) {
		throw new SegmentLengthAuthorError(
			`${label} : la demi-droite ${ray} n’a pas de direction (son second point est sur ${check.point})`
		);
	}
	return { x: (line.b.x - line.a.x) / r, y: (line.b.y - line.a.y) / r };
}

/** La vérification est-elle faisable ? Erreur d'AUTEUR sinon */
export function assertSegmentLength(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/** `p` sur la demi-droite d'origine `a`, de direction `u` (unitaire), hors de `a` */
function onRay(p: Position, a: Position, u: Position, eps: number): boolean {
	const t = (p.x - a.x) * u.x + (p.y - a.y) * u.y;
	const off = Math.abs((p.x - a.x) * u.y - (p.y - a.y) * u.x);
	return t > eps && off <= eps;
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
 * Deux directions depuis A plus proches que ça (radians, 2°) : à l'écran, un seul
 * segment (deux règles reposées presque pareil, revue de #2485)
 */
export const SAME_DIRECTION = (2 * Math.PI) / 180;

/** Un segment vu depuis A : sa direction, son bout le plus loin ; `throughA` si A est au milieu */
export interface SeenSegment {
	direction: Position;
	end: Position;
	throughA: boolean;
}

/**
 * Les segments que l'élève VOIT depuis A (revue de #2485) : les segments qui
 * partent de A dans une même direction (à 2° près), et ceux qui les prolongent ou
 * les recouvrent de proche en proche, n'en font qu'un, jugé par son bout le plus
 * loin. Deux directions opposées, ou un segment qui passe au-delà de A : A est au
 * milieu du trait vu, ce n'est pas un segment depuis A (`throughA`).
 */
export function seenSegments(
	segments: readonly DrawnLine[],
	a: Position,
	eps: number
): SeenSegment[] {
	const groups: { direction: Position; reach: number; end: Position; behind: boolean }[] = [];
	for (const s of segments) {
		const far = farEnd(s, a, eps);
		if (!far) continue;
		const r = distance(a, far);
		const direction = { x: (far.x - a.x) / r, y: (far.y - a.y) / r };
		const group = groups.find(
			(g) =>
				Math.acos(Math.min(1, g.direction.x * direction.x + g.direction.y * direction.y)) <
				SAME_DIRECTION
		);
		if (!group) groups.push({ direction, reach: r, end: far, behind: false });
		else if (r > group.reach) Object.assign(group, { reach: r, end: far });
	}
	// Prolongements et recouvrements : un segment le long du trait vu, qui le touche
	for (const group of groups) {
		const u = group.direction;
		const along = (p: Position) => {
			const t = (p.x - a.x) * u.x + (p.y - a.y) * u.y;
			const off = Math.abs((p.x - a.x) * u.y - (p.y - a.y) * u.x);
			return { t, on: off <= Math.max(eps, Math.abs(t) * Math.sin(SAME_DIRECTION)) };
		};
		let grew = true;
		while (grew) {
			grew = false;
			for (const s of segments) {
				const ends = [
					{ x: s.x1, y: s.y1 },
					{ x: s.x2, y: s.y2 }
				];
				const [p, q] = ends.map(along);
				if (!p.on || !q.on || Math.min(p.t, q.t) > group.reach + eps) continue;
				if (Math.min(p.t, q.t) < -eps) group.behind = true;
				const farther = p.t >= q.t ? 0 : 1;
				const t = Math.max(p.t, q.t);
				if (t > group.reach + eps) {
					group.reach = t;
					group.end = ends[farther];
					grew = true;
				}
			}
		}
	}
	return groups.map((g) => ({
		direction: g.direction,
		end: g.end,
		throughA:
			g.behind ||
			groups.some(
				(h) =>
					h !== g &&
					Math.acos(Math.max(-1, h.direction.x * g.direction.x + h.direction.y * g.direction.y)) >
						Math.PI - SAME_DIRECTION
			)
	}));
}

/**
 * Verdict, sur les segments que l'élève voit depuis A (`seenSegments`) : le bout
 * le plus loin sur une graduation d'une règle posée avec son 0 en A, à la
 * longueur donnée en millimètres entiers. Plusieurs segments vus depuis A (des
 * directions distinctes) : faux (Q9). Une droite,
 * un point (sans leur outil), un bout hors de la fenêtre (l'écran ne l'atteint
 * pas) : réponse forgée.
 */
export function judgeSegmentLength(
	check: SegmentLengthCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const { a, rulerLength, ray } = settingOf(check, points, shapes);
	const figure = shapes as FigureShapes;
	if (objects.some((obj) => obj.kind !== 'segment' && obj.kind !== 'regle')) {
		return { status: 'incorrect' };
	}
	const eps = tolerance(a);
	const segments = objects.filter((obj): obj is DrawnLine => obj.kind === 'segment');
	const window = figure.window;
	if (
		window &&
		segments.some(
			(s) => !isInFrame({ x: s.x1, y: s.y1 }, window) || !isInFrame({ x: s.x2, y: s.y2 }, window)
		)
	) {
		return { status: 'incorrect' };
	}
	const seen = seenSegments(segments, a, eps).filter((s) => !s.throughA);
	if (seen.length === 0) {
		return { status: 'incorrect', feedback: missingSegmentFeedback(check.point, check.end) };
	}
	// Q9 (David, 2026-11-08) : plusieurs segments vus depuis A, dans des directions distinctes →
	// faux (un éventail de longueurs n'est pas un segment de la bonne longueur)
	if (seen.length > 1) {
		return { status: 'incorrect', feedback: severalSegmentsFeedback(check.point, check.end) };
	}
	// Demi-droite donnée (§ 4) : le bout du segment vu sur [Ax), au-delà de A
	if (ray && check.ray && !onRay(seen[0].end, a, ray, eps)) {
		return { status: 'incorrect', feedback: offRayFeedback(check.point, check.ray) };
	}
	// Règles posées avec leur 0 en A : la graduation (mm) où s'arrête chaque segment vu
	const rulers = objects.filter(
		(obj): obj is DrawnRegle => obj.kind === 'regle' && distance({ x: obj.ox, y: obj.oy }, a) <= eps
	);
	const graduations = seen.flatMap((s) => {
		const mm = rulers
			.map((ruler) => rulerGraduationOf(s.end, ruler, rulerLength))
			.find((g) => g !== null && g > 0);
		return mm === undefined || mm === null ? [] : [mm];
	});
	if (graduations.length === 0)
		return { status: 'incorrect', feedback: segmentEyeballedFeedback() };
	if (graduations.includes(check.length)) return { status: 'correct' };
	return { status: 'incorrect', feedback: wrongLengthFeedback(graduations[0], check) };
}

/**
 * La règle de la correction : posée en A, le long de la demi-droite donnée
 * s'il y en a une ; sinon dans la direction de la dernière règle
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
	const { a, length, ray } = setting;
	// Demi-droite donnée (§ 4) : la règle le long d'elle, quelle que soit celle de l'élève
	if (ray) return { kind: 'regle', ox: a.x, oy: a.y, bx: a.x + ray.x, by: a.y + ray.y, sens: 1 };
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
