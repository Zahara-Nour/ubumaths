/**
 * Cercles à construire (vérification `cercle`, chantier `controles-figure`, lot 3b)
 * ==================================================================================
 *
 * `cercle c = cercle_circonscrit(A, B, C)` : un des cercles tracés par l'élève
 * (compas) est le cercle que l'expression du langage des figures donne ; les
 * autres cercles et les droites sont des traits de construction, ignorés
 * (phase 0 validée par David le 2026-11-02, `docs/archive/wip/controles-figure-progress.md`
 * § 11).
 *
 * Papier uni seulement (décision 2) : le cercle doit être CONSTRUIT, son centre
 * et son point de passage étant des points construits (points de la figure,
 * intersections de deux AUTRES traits).
 *
 * Messages, dans l'ordre : il manque le cercle, cercle tracé à l'œil (centre non
 * construit ; le bon cercle, centre construit, compas ouvert à l'œil : « Ton
 * compas est ouvert à l'œil… »), bon centre mais mauvais rayon, passe par deux sommets seulement, ce n'est pas le cercle
 * circonscrit. Le cercle « essai » : parmi ceux qui ne sont pas centrés sur un
 * sommet (arcs de construction des médiatrices), celui qui a le bon centre,
 * sinon celui qui passe par le plus de sommets, à égalité le dernier tracé.
 *
 * Pur : positions de la figure et cercles attendus donnés par l'appelant
 * (registre `positions.ts`).
 *
 * @module questions/construction/circle
 */

import type { CircleCheck } from '$lib/ubumark/types/construction';
import type { DrawnCircle, DrawnLine, DrawnObject } from './answer';
import { basePointsOf, constructionOf, isInFrame } from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import { mediatriceSupportError } from './line';
import type { ExpectedCircle, ExpectedPoints } from './point';
import { tolerance } from './polygon';
import type { FigureShapes } from './symmetry';

export const CIRCLE_EYEBALLED_FEEDBACK =
	'Ton cercle est tracé à l’œil : construis son centre avec tes instruments.';
export const CIRCLE_GOOD_CENTER_FEEDBACK =
	'Ton cercle a le bon centre mais ne passe pas par les sommets du triangle.';

export const CIRCLE_THROUGH_EYEBALLED_FEEDBACK =
	'Ton compas est ouvert à l’œil : ouvre-le jusqu’à un sommet du triangle.';

export const circumcircleMissingFeedback = (names: readonly string[]) =>
	`Trace le cercle circonscrit au triangle ${names.join('')}.`;
export const twoVerticesFeedback = (on: readonly string[], off: string) =>
	`Ton cercle passe par ${on[0]} et ${on[1]} mais pas par ${off}.`;
export const notCircumcircleFeedback = (names: readonly string[]) =>
	`Ce n’est pas le cercle circonscrit au triangle ${names.join('')}.`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class CircleAuthorError extends Error {}

const NAME = '([A-Za-z][A-Za-z0-9_]*)';
/** `cercle_circonscrit(A, B, C)` : trois points nommés */
const CIRCUMCIRCLE_REGEX = new RegExp(
	`^cercle_circonscrit\\(\\s*${NAME}\\s*,\\s*${NAME}\\s*,\\s*${NAME}\\s*\\)$`
);
/** `centre(cercle_circonscrit(A, B, C))` : le centre seul (vérification `point`, décision 1) */
const CIRCUMCENTER_REGEX = new RegExp(
	`^centre\\(\\s*cercle_circonscrit\\(\\s*${NAME}\\s*,\\s*${NAME}\\s*,\\s*${NAME}\\s*\\)\\s*\\)$`
);

type Triple = [string, string, string];

/** Les trois sommets d'un cercle circonscrit ; null pour une autre expression */
export function circumcircleOf(expression: string): Triple | null {
	const match = CIRCUMCIRCLE_REGEX.exec(expression.trim());
	return match ? [match[1], match[2], match[3]] : null;
}

/** Les trois sommets d'un centre de cercle circonscrit ; null pour une autre expression */
export function circumcenterOf(expression: string): Triple | null {
	const match = CIRCUMCENTER_REGEX.exec(expression.trim());
	return match ? [match[1], match[2], match[3]] : null;
}

export function isCircleCheck(check: { kind: string }): check is CircleCheck {
	return check.kind === 'cercle';
}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);
const centerOf = (c: DrawnCircle): Position => ({ x: c.cx, y: c.cy });

/**
 * Un cercle de l'élève, compas ou Report (lot 9) : le report devient le cercle de
 * même centre et de même rayon (point de passage = centre + écartement) ; null
 * pour une droite. Le « construit » reste lu sur l'objet d'origine (`constructionOf`).
 */
function circleOf(object: DrawnObject): DrawnCircle | null {
	if (object.kind === 'cercle') return object;
	if (object.kind !== 'report') return null;
	return {
		kind: 'cercle',
		cx: object.cx,
		cy: object.cy,
		x: object.cx + (object.bx - object.ax),
		y: object.cy + (object.by - object.ay)
	};
}
const radiusOf = (c: DrawnCircle) => Math.hypot(c.x - c.cx, c.y - c.cy);

/** Les trois côtés d'un triangle, dans l'ordre [AB], [AC], [BC] */
const sidesOf = ([a, b, c]: Triple): [string, string][] => [
	[a, b],
	[a, c],
	[b, c]
];

/**
 * Papier uni : le centre du cercle circonscrit se construit-il dans la fenêtre ?
 * Sommets visibles, et au moins deux médiatrices constructibles dans la fenêtre
 * (`mediatriceSupportError`) ; sert aussi au centre seul
 * (`point.ts`). Le message, ou null.
 */
export function circumcenterSupportError(
	names: Triple,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes
): string | null {
	const hidden = names.find((name) => !shapes.visiblePoints.has(name));
	if (hidden) return `${hidden} n’est pas visible (l’élève ne peut pas y piquer le compas)`;
	const built = sidesOf(names).filter((side) => !mediatriceSupportError(side, points, shapes));
	if (built.length >= 2) return null;
	return `moins de deux médiatrices du triangle ${names.join('')} se construisent dans la fenêtre (moins de 2 unités de médiatrice dans la fenêtre) : agrandir la fenêtre ou rapprocher les sommets`;
}

function expectedOf(check: CircleCheck, expected: ExpectedPoints | undefined): ExpectedCircle {
	if (!expected) {
		throw new CircleAuthorError('Case « figure » : cercles attendus non fournis au juge (cercle)');
	}
	const label = `verifier: cercle ${check.name} = ${check.expression}`;
	const error = expected.errors.get(check.name);
	if (error) throw new CircleAuthorError(`${label} : ${error}`);
	const circle = expected.circles?.get(check.name);
	if (!circle) throw new CircleAuthorError(`${label} : l’expression ne donne pas un cercle`);
	return circle;
}

/** Deux cercles égaux (centre et rayon), au calcul flottant près */
function sameCircle(p: ExpectedCircle, q: ExpectedCircle): boolean {
	const eps = tolerance(p.center, q.center, { x: p.radius, y: q.radius });
	return distance(p.center, q.center) <= eps && Math.abs(p.radius - q.radius) <= eps;
}

/**
 * Les cercles sont-ils faisables ? Erreur d'AUTEUR sinon : expression qui ne se
 * calcule pas ou ne donne pas un cercle, autre chose qu'un cercle circonscrit,
 * quadrillage, centre hors de la fenêtre, cercle qui sort de la fenêtre
 * (décision 3), centre qui ne se construit pas (`circumcenterSupportError`),
 * deux vérifications pour le même cercle.
 */
export function assertCircles(
	checks: readonly CircleCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	if (!shapes) {
		throw new CircleAuthorError(
			'Case « figure » : traits de la figure non fournis au juge (cercle)'
		);
	}
	const seen: { name: string; circle: ExpectedCircle }[] = [];
	for (const check of checks) {
		const label = `verifier: cercle ${check.name}`;
		const circle = expectedOf(check, expected);
		const twin = seen.find((other) => sameCircle(other.circle, circle));
		if (twin) {
			throw new CircleAuthorError(
				`verifier: les cercles ${twin.name} et ${check.name} sont le même cercle`
			);
		}
		seen.push({ name: check.name, circle });
		const vertices = circumcircleOf(check.expression);
		if (!vertices) {
			throw new CircleAuthorError(
				`${label} : seulement un cercle circonscrit (cercle_circonscrit(A, B, C))`
			);
		}
		if (shapes.grid) {
			throw new CircleAuthorError(
				`${label} : le cercle circonscrit se construit sur papier uni ; retirer « grille: »`
			);
		}
		const { window } = shapes;
		if (window) {
			const { center, radius } = circle;
			if (!isInFrame(center, window)) {
				throw new CircleAuthorError(`${label} : le centre du cercle est hors de la fenêtre`);
			}
			const box = [
				{ x: center.x - radius, y: center.y - radius },
				{ x: center.x + radius, y: center.y + radius }
			];
			if (!box.every((p) => isInFrame(p, window))) {
				throw new CircleAuthorError(
					`${label} : le cercle sort de la fenêtre (l’élève doit le voir passer par les trois sommets) : agrandir la fenêtre`
				);
			}
		}
		const message = circumcenterSupportError(vertices, points, shapes);
		if (message) throw new CircleAuthorError(`${label} : ${message}`);
		// Centre déjà dans la figure : rien à construire (comme `assertPoints`, revue)
		const eps = tolerance(circle.center, ...points.values());
		const existing = [...points].find(([, p]) => distance(p, circle.center) <= eps);
		const drawnEnd = shapes.segments.some(
			(seg) => distance(seg.a, circle.center) <= eps || distance(seg.b, circle.center) <= eps
		);
		if (existing || drawnEnd) {
			const where = existing ? `au même endroit que ${existing[0]}` : 'au bout d’un trait';
			throw new CircleAuthorError(
				`${label} : le centre du cercle est déjà dans la figure (${where}) : rien à construire`
			);
		}
	}
}

/** Le cercle passe-t-il par `p` (au calcul flottant près) ? */
function passesThrough(circle: DrawnCircle, p: Position): boolean {
	const center = centerOf(circle);
	const eps = tolerance(center, p, { x: circle.x, y: circle.y });
	return Math.abs(distance(center, p) - radiusOf(circle)) <= eps;
}

function hasCenter(circle: DrawnCircle, center: Position): boolean {
	return distance(centerOf(circle), center) <= tolerance(centerOf(circle), center);
}

/** L'essai de l'élève parmi ses cercles (voir l'en-tête) ; null : aucun essai */
function attempt(
	indexes: readonly number[],
	circleAt: (i: number) => DrawnCircle,
	vertices: readonly Position[],
	target: ExpectedCircle
): number | null {
	const own = indexes.filter((i) => !vertices.some((v) => hasCenter(circleAt(i), v)));
	if (own.length === 0) return null;
	const centered = own.filter((i) => hasCenter(circleAt(i), target.center));
	if (centered.length > 0) return centered[centered.length - 1];
	let best = own[0];
	let most = -1;
	for (const i of own) {
		const count = vertices.filter((v) => passesThrough(circleAt(i), v)).length;
		if (count >= most) {
			best = i;
			most = count;
		}
	}
	return best;
}

/**
 * Verdict : chaque cercle attendu prend un cercle de l'élève qui le recouvre,
 * construit ; les autres traits sont ignorés. Une réponse avec un point ou un
 * segment (outils absents de la palette) est forgée.
 */
export function judgeCircles(
	checks: readonly CircleCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	// Le Report (lot 9) : un trait de construction, comme un cercle
	if (objects.some((o) => o.kind !== 'droite' && o.kind !== 'cercle' && o.kind !== 'report')) {
		return { status: 'incorrect' };
	}
	// Cercle construit de proche en proche (décision de David, 2026-11-03, § 14)
	const construction = constructionOf(
		objects,
		basePointsOf(points, shapes?.segments ?? []),
		shapes?.traits ?? []
	);
	// Compas ou Report (lot 9, revue) : un report juste est un cercle juste
	const circles = objects.map(circleOf);
	const circleAt = (i: number) => circles[i] as DrawnCircle;
	const circleIndexes = circles.flatMap((c, i) => (c ? [i] : []));
	// Centre d'un cercle NON construit (les autres : construits) ; aucun trait non
	// construit ne compte, lui compris
	const centerBuilt = (i: number) => construction.isBuilt(centerOf(circleAt(i)));
	const built = (i: number) => construction.built.has(i);
	const taken = new Set<number>();
	for (const check of checks) {
		const target = expectedOf(check, expected);
		const free = circleIndexes.filter((i) => !taken.has(i));
		const covering = free.filter((i) => {
			const c = circleAt(i);
			return sameCircle({ center: centerOf(c), radius: radiusOf(c) }, target);
		});
		const good = covering.find(built);
		if (good !== undefined) {
			taken.add(good);
			continue;
		}
		if (covering.length > 0) {
			// Centre construit, compas ouvert à l'œil pile au bon rayon (revue, finding 1)
			const anyCenterBuilt = covering.some(centerBuilt);
			return {
				status: 'incorrect',
				feedback: anyCenterBuilt ? CIRCLE_THROUGH_EYEBALLED_FEEDBACK : CIRCLE_EYEBALLED_FEEDBACK
			};
		}
		const names = circumcircleOf(check.expression);
		const vertices = names?.map((n) => points.get(n));
		if (!names || !vertices || !vertices.every((v): v is Position => v !== undefined)) {
			return { status: 'incorrect', feedback: `Trace le cercle ${check.name}.` };
		}
		const shown = attempt(free, circleAt, vertices, target);
		if (shown === null) {
			return { status: 'incorrect', feedback: circumcircleMissingFeedback(names) };
		}
		// Seul le centre décide du « à l'œil » : un compas ouvert à la main sur un bon
		// centre construit a le bon centre (revue, finding 1)
		if (!centerBuilt(shown)) return { status: 'incorrect', feedback: CIRCLE_EYEBALLED_FEEDBACK };
		const circle = circleAt(shown);
		if (hasCenter(circle, target.center)) {
			return { status: 'incorrect', feedback: CIRCLE_GOOD_CENTER_FEEDBACK };
		}
		const on = names.filter((_, k) => passesThrough(circle, vertices[k]));
		if (on.length === 2) {
			const off = names.find((n) => !on.includes(n)) as string;
			return { status: 'incorrect', feedback: twoVerticesFeedback(on, off) };
		}
		return { status: 'incorrect', feedback: notCircumcircleFeedback(names) };
	}
	return { status: 'correct' };
}

/** Correction d'un cercle : le cercle, son centre, deux médiatrices (décision 4) */
export interface CircleSolution {
	name: string;
	center: Position;
	radius: number;
	mediatrices: DrawnLine[];
}

/**
 * La correction : chaque cercle attendu, son centre et les médiatrices de deux
 * côtés (les premières qui se construisent dans la fenêtre)
 */
export function circleSolution(
	checks: readonly CircleCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes?: FigureShapes
): CircleSolution[] {
	return checks.flatMap((check): CircleSolution[] => {
		const circle = expected?.circles?.get(check.name);
		if (!circle) return [];
		const names = circumcircleOf(check.expression);
		const sides = names ? sidesOf(names) : [];
		const buildable = shapes
			? sides.filter((side) => !mediatriceSupportError(side, points, shapes))
			: sides;
		const mediatrices = (buildable.length >= 2 ? buildable : sides)
			.slice(0, 2)
			.flatMap((side): DrawnLine[] => {
				const a = points.get(side[0]);
				const b = points.get(side[1]);
				if (!a || !b) return [];
				const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
				// Perpendiculaire à [AB] par son milieu : m + quart de tour de AB
				return [{ kind: 'droite', x1: m.x, y1: m.y, x2: m.x - (b.y - a.y), y2: m.y + (b.x - a.x) }];
			});
		return [{ name: check.name, center: circle.center, radius: circle.radius, mediatrices }];
	});
}
