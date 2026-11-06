/**
 * Droites à construire (vérification `droite`, chantier `controles-figure`, lot 3)
 * ================================================================================
 *
 * `droite m = mediatrice(A, B)` : une des droites tracées par l'élève (règle,
 * équerre) est la droite que l'expression du langage des figures donne ; les
 * autres droites et les cercles sont des traits de construction, ignorés
 * (décision de David, 2026-11-02, `docs/wip/controles-figure-progress.md` § 9).
 *
 * Sur papier uni, la droite doit être CONSTRUITE : par deux points construits
 * (points de la figure, intersections de deux AUTRES traits), ou à l'équerre :
 * perpendiculaire à un autre trait droit par un point construit. Sur
 * quadrillage, les nœuds suffisent (pas de « tracé à l'œil »).
 *
 * Messages, dans l'ordre : il manque la droite, droite tracée à l'œil (papier
 * uni), puis, pour une médiatrice, perpendiculaire hors du milieu, par le
 * milieu mais pas perpendiculaire, ce n'est pas la médiatrice.
 *
 * Pur : positions de la figure et droites attendues données par l'appelant
 * (registre `positions.ts`).
 *
 * @module questions/construction/line
 */

import type { LineCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject } from './answer';
import {
	basePointsOf,
	constructionOf,
	isStraight,
	lineCrossesFrame,
	type Trait
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import type { ExpectedLine, ExpectedPoints } from './point';
import { tolerance } from './polygon';
import type { FigureShapes } from './symmetry';

export const LINE_EYEBALLED_FEEDBACK =
	'Ta droite est tracée à l’œil : construis-la avec tes instruments.';
export const LINE_NOT_IN_PLACE_FEEDBACK = 'Ta droite n’est pas à sa place.';

export const lineMissingFeedback = (name: string) => `Trace la droite ${name}.`;
export const mediatriceMissingFeedback = (a: string, b: string) =>
	`Trace la médiatrice de [${a}${b}].`;
export const notMidpointFeedback = (a: string, b: string) =>
	`Ta droite est perpendiculaire à [${a}${b}] mais ne passe pas par son milieu.`;
export const notPerpendicularToSegmentFeedback = (a: string, b: string) =>
	`Ta droite passe par le milieu de [${a}${b}] mais n’est pas perpendiculaire à [${a}${b}].`;
export const notMediatriceFeedback = (a: string, b: string) =>
	`Ce n’est pas la médiatrice de [${a}${b}].`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class LineAuthorError extends Error {}

/** `mediatrice(A, B)` : deux points nommés */
const MEDIATRICE_REGEX =
	/^m[eé]diatrice\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/;

/** Les deux points d'une médiatrice ; null pour une autre expression */
export function mediatriceOf(expression: string): [string, string] | null {
	const match = MEDIATRICE_REGEX.exec(expression.trim());
	return match ? [match[1], match[2]] : null;
}

export function isLineCheck(check: { kind: string }): check is LineCheck {
	return check.kind === 'droite';
}

const sub = (p: Position, q: Position): Position => ({ x: p.x - q.x, y: p.y - q.y });
const cross = (u: Position, v: Position) => u.x * v.y - u.y * v.x;
const dot = (u: Position, v: Position) => u.x * v.x + u.y * v.y;
const ends = (line: DrawnLine): [Position, Position] => [
	{ x: line.x1, y: line.y1 },
	{ x: line.x2, y: line.y2 }
];

/** `p` est-il sur la droite (a, b), au calcul flottant près ? */
function isOnLine(p: Position, { a, b }: ExpectedLine): boolean {
	const u = sub(b, a);
	return Math.abs(cross(u, sub(p, a))) / Math.hypot(u.x, u.y) <= tolerance(p, a, b);
}

/** La droite tracée est-elle la droite attendue ? */
function coincides(line: DrawnLine, expected: ExpectedLine): boolean {
	return ends(line).every((p) => isOnLine(p, expected));
}

/** Directions perpendiculaires (relatif : cosinus nul au calcul flottant près) */
function isPerpendicular(u: Position, v: Position): boolean {
	return Math.abs(dot(u, v)) <= 1e-9 * Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
}

function expectedOf(check: LineCheck, expected: ExpectedPoints | undefined): ExpectedLine {
	if (!expected) {
		throw new LineAuthorError('Case « figure » : droites attendues non fournies au juge (droite)');
	}
	const label = `verifier: droite ${check.name} = ${check.expression}`;
	const error = expected.errors.get(check.name);
	if (error) throw new LineAuthorError(`${label} : ${error}`);
	const line = expected.lines?.get(check.name);
	if (!line) throw new LineAuthorError(`${label} : l’expression ne donne pas une droite`);
	return line;
}

/** Nœuds du quadrillage dans la fenêtre par lesquels passe la droite (au plus 2 comptés) */
function gridNodesOn(line: ExpectedLine, shapes: FigureShapes): number {
	const { grid, window } = shapes;
	if (!grid || !window) return 2;
	let found = 0;
	const xFirst = Math.ceil(window.xMin / grid.x - 1e-9);
	const yFirst = Math.ceil(window.yMin / grid.y - 1e-9);
	for (let i = xFirst; i * grid.x <= window.xMax + 1e-9; i++) {
		for (let j = yFirst; j * grid.y <= window.yMax + 1e-9; j++) {
			if (isOnLine({ x: i * grid.x, y: j * grid.y }, line) && ++found >= 2) return found;
		}
	}
	return found;
}

/** Longueur minimale de la médiatrice dans la fenêtre (unités de la figure), comme un côté d'angle (lot 5) */
const MEDIATRICE_MIN_ROOM = 2;

/** Longueur de la droite passant par `p`, de direction unitaire `d`, dans la fenêtre (Liang-Barsky) */
function roomInFrame(p: Position, d: Position, frame: NonNullable<FigureShapes['window']>): number {
	let tMin = -Infinity;
	let tMax = Infinity;
	const sides: [number, number][] = [
		[-d.x, p.x - frame.xMin],
		[d.x, frame.xMax - p.x],
		[-d.y, p.y - frame.yMin],
		[d.y, frame.yMax - p.y]
	];
	for (const [direction, room] of sides) {
		if (direction === 0) {
			if (room < 0) return 0;
			continue;
		}
		const t = room / direction;
		if (direction < 0) tMin = Math.max(tMin, t);
		else tMax = Math.min(tMax, t);
	}
	return Math.max(0, tMax - tMin);
}

/**
 * Papier uni : la médiatrice de [AB] se construit-elle dans la fenêtre ? A et B
 * visibles (le compas s'y pique), et au moins 2 unités de médiatrice dans la
 * fenêtre : l'élève y trouve deux croisements de cercles égaux, de n'importe quel
 * rayon (exception 2 du § 15 ; lot 9, § 25 : plus de cercles de rayon AB exigés).
 * Sert aussi au milieu (`point.ts`) et au cercle circonscrit. Le message, ou null.
 */
export function mediatriceSupportError(
	names: [string, string],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes
): string | null {
	const hidden = names.find((name) => !shapes.visiblePoints.has(name));
	if (hidden) return `${hidden} n’est pas visible (l’élève ne peut pas y piquer le compas)`;
	const a = points.get(names[0]);
	const b = points.get(names[1]);
	if (!a || !b || !shapes.window) return null;
	const u = sub(b, a);
	const length = Math.hypot(u.x, u.y);
	if (length === 0) return null;
	const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	const normal = { x: -u.y / length, y: u.x / length };
	if (roomInFrame(middle, normal, shapes.window) >= MEDIATRICE_MIN_ROOM) return null;
	const [p, q] = names;
	return `la médiatrice de [${p}${q}] n’a pas ${MEDIATRICE_MIN_ROOM} unités dans la fenêtre (l’élève ne peut pas la construire) : agrandir la fenêtre ou déplacer ${p} et ${q}`;
}

/**
 * Les droites sont-elles faisables ? Erreur d'AUTEUR sinon : expression qui ne
 * se calcule pas ou ne donne pas une droite, droite hors de la fenêtre, deux
 * vérifications pour la même droite ; sur quadrillage, droite qui ne passe pas
 * par deux nœuds ; sur papier uni, autre chose qu'une médiatrice, ou médiatrice
 * qui ne se construit pas dans la fenêtre (`mediatriceSupportError`).
 */
export function assertLines(
	checks: readonly LineCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	if (!shapes) {
		throw new LineAuthorError('Case « figure » : traits de la figure non fournis au juge (droite)');
	}
	const seen: { name: string; line: ExpectedLine }[] = [];
	for (const check of checks) {
		const label = `verifier: droite ${check.name}`;
		const line = expectedOf(check, expected);
		const twin = seen.find((other) => isOnLine(line.a, other.line) && isOnLine(line.b, other.line));
		if (twin) {
			throw new LineAuthorError(
				`verifier: les droites ${twin.name} et ${check.name} sont la même droite`
			);
		}
		seen.push({ name: check.name, line });
		if (shapes.window && !lineCrossesFrame(line.a, line.b, shapes.window)) {
			throw new LineAuthorError(`${label} : la droite attendue est hors de la fenêtre`);
		}
		if (shapes.grid && gridNodesOn(line, shapes) < 2) {
			throw new LineAuthorError(
				`${label} : la droite attendue ne passe pas par deux nœuds du quadrillage dans la fenêtre (l’élève ne peut pas la tracer)`
			);
		}
		if (shapes.grid) continue;
		const mediatrice = mediatriceOf(check.expression);
		if (!mediatrice) {
			throw new LineAuthorError(
				`${label} : sans quadrillage, seulement une médiatrice (mediatrice(A, B)) ; sinon ajouter « grille: 1 »`
			);
		}
		const message = mediatriceSupportError(mediatrice, points, shapes);
		if (message) throw new LineAuthorError(`${label} : ${message}`);
	}
}

/** Pourquoi la droite n'est pas la médiatrice de [AB] */
function mediatriceFeedback(line: DrawnLine, a: Position, b: Position, names: [string, string]) {
	const [p, q] = ends(line);
	const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	const perpendicular = isPerpendicular(sub(q, p), sub(b, a));
	const throughMiddle = isOnLine(middle, { a: p, b: q });
	if (perpendicular && !throughMiddle) return notMidpointFeedback(...names);
	if (throughMiddle && !perpendicular) return notPerpendicularToSegmentFeedback(...names);
	return notMediatriceFeedback(...names);
}

/**
 * Une droite de l'élève « qui touche au but » : perpendiculaire à [AB] ou par
 * son milieu ; une droite qui repasse un trait de la figure ((AB) elle-même)
 * n'est pas son essai de médiatrice
 */
function closest(
	candidates: readonly number[],
	objects: readonly DrawnObject[],
	a: Position,
	b: Position,
	figureTraits: readonly Trait[]
): number {
	const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	const own = candidates.filter((i) => {
		const line = { a: ends(objects[i] as DrawnLine)[0], b: ends(objects[i] as DrawnLine)[1] };
		return !figureTraits.some((t) => isStraight(t) && isOnLine(t.a, line) && isOnLine(t.b, line));
	});
	const tries = own.length > 0 ? own : candidates;
	const near = tries.find((i) => {
		const [p, q] = ends(objects[i] as DrawnLine);
		return isPerpendicular(sub(q, p), sub(b, a)) || isOnLine(middle, { a: p, b: q });
	});
	return near ?? tries[tries.length - 1];
}

/**
 * Verdict : chaque droite attendue prend une droite de l'élève qui la recouvre
 * (construite, sur papier uni) ; les autres traits sont ignorés. Une réponse
 * avec un point ou un segment (outils absents de la palette) est forgée.
 */
export function judgeLines(
	checks: readonly LineCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	// Le Report (lot 9) : un trait de construction, comme un cercle
	if (objects.some((o) => o.kind !== 'droite' && o.kind !== 'cercle' && o.kind !== 'report')) {
		return { status: 'incorrect' };
	}
	const figureTraits = shapes?.traits ?? [];
	// Papier uni : droite construite de proche en proche (décision de David, 2026-11-03, § 14)
	const construction =
		shapes && !shapes.grid
			? constructionOf(objects, basePointsOf(points, shapes.segments), figureTraits)
			: null;
	const lineIndexes = objects.flatMap((o, i) => (o.kind === 'droite' ? [i] : []));
	const built = (i: number) => !construction || construction.built.has(i);
	const taken = new Set<number>();
	for (const check of checks) {
		const target = expectedOf(check, expected);
		const mediatrice = mediatriceOf(check.expression);
		const free = lineIndexes.filter((i) => !taken.has(i));
		const covering = free.filter((i) => coincides(objects[i] as DrawnLine, target));
		const good = covering.find(built);
		if (good !== undefined) {
			taken.add(good);
			continue;
		}
		if (covering.length > 0) return { status: 'incorrect', feedback: LINE_EYEBALLED_FEEDBACK };
		const missing = mediatrice
			? mediatriceMissingFeedback(...mediatrice)
			: lineMissingFeedback(check.name);
		if (free.length === 0) return { status: 'incorrect', feedback: missing };
		const a = mediatrice ? points.get(mediatrice[0]) : undefined;
		const b = mediatrice ? points.get(mediatrice[1]) : undefined;
		const shown = a && b ? closest(free, objects, a, b, figureTraits) : free[free.length - 1];
		if (!built(shown)) return { status: 'incorrect', feedback: LINE_EYEBALLED_FEEDBACK };
		if (!mediatrice || !a || !b) {
			return { status: 'incorrect', feedback: LINE_NOT_IN_PLACE_FEEDBACK };
		}
		return {
			status: 'incorrect',
			feedback: mediatriceFeedback(objects[shown] as DrawnLine, a, b, mediatrice)
		};
	}
	return { status: 'correct' };
}

/** Codage d'une médiatrice à la correction : [AB], son milieu (angle droit, moitiés égales) */
export interface LineCodage {
	from: Position;
	foot: Position;
	to: Position;
}

/** La correction : chaque droite attendue, écrite comme une droite tracée */
export function lineSolution(
	checks: readonly LineCheck[],
	expected: ExpectedPoints | undefined
): DrawnLine[] {
	return checks.flatMap((check): DrawnLine[] => {
		const line = expected?.lines?.get(check.name);
		if (!line) return [];
		return [{ kind: 'droite', x1: line.a.x, y1: line.a.y, x2: line.b.x, y2: line.b.y }];
	});
}

/** Le codage de chaque médiatrice (les autres expressions n'en ont pas) */
export function lineCodages(
	checks: readonly LineCheck[],
	points: ReadonlyMap<string, Position>
): LineCodage[] {
	return checks.flatMap((check): LineCodage[] => {
		const names = mediatriceOf(check.expression);
		const from = names ? points.get(names[0]) : undefined;
		const to = names ? points.get(names[1]) : undefined;
		if (!from || !to) return [];
		return [{ from, foot: { x: (from.x + to.x) / 2 + 0, y: (from.y + to.y) / 2 + 0 }, to }];
	});
}
