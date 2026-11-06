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
 * Lot 9, PR A (§ 25) : `droite d = bissectrice(A, O, B)`, papier uni seulement.
 * Au compas : l'arc piqué en O, ouvert à l'œil, coupe les côtés en des points
 * construits (exception 4, `constructionOf` avec `arcsOnSides`) ; au rapporteur
 * si le prof l'ajoute à `outils:`, à 1° près (côté d'angle tiré de O). Messages :
 * pas de trait droit par O, trait dans l'angle qui ne part pas de O, trait par O
 * à l'œil, l'angle voisin (perpendiculaire à la bissectrice), angles inégaux.
 *
 * Pur : positions de la figure et droites attendues données par l'appelant
 * (registre `positions.ts`).
 *
 * @module questions/construction/line
 */

import { bissectriceOf, type LineCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject, DrawnRepere } from './answer';
import {
	angleSideVertex,
	basePointsOf,
	constructionOf,
	isOnSomeTrait,
	isStraight,
	lineCrossesFrame,
	type Construction,
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

export const BISSECTRICE_EYEBALLED_FEEDBACK =
	'Ta bissectrice est tracée à l’œil : construis-la avec tes instruments.';
export const bissectriceMissingFeedback = (a: string, o: string, b: string) =>
	`Trace la bissectrice de l’angle ${a}${o}${b}, depuis son sommet ${o}.`;
export const bissectriceNotFromVertexFeedback = (o: string) =>
	`Ta bissectrice doit partir du sommet ${o}.`;
export const neighbourAngleFeedback = (a: string, o: string, b: string) =>
	`Ta droite partage l’angle voisin, pas l’angle ${a}${o}${b} : pique le compas sur [${o}${a}) et [${o}${b}).`;
export const notBissectriceFeedback = (a: string, o: string, b: string) =>
	`Les deux angles ne sont pas égaux : ce n’est pas la bissectrice de l’angle ${a}${o}${b}.`;

/** Au rapporteur, la bissectrice est admise à 1° près (décision 1 du § 25) */
const BISSECTRICE_PROTRACTOR_TOLERANCE_DEG = 1;

export { bissectriceOf };

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

/**
 * Longueur de la droite passant par `p`, de direction unitaire `d`, dans la fenêtre
 * (Liang-Barsky) ; `from` = 0 : la demi-droite d'origine `p` seulement
 */
function roomInFrame(
	p: Position,
	d: Position,
	frame: NonNullable<FigureShapes['window']>,
	from = -Infinity
): number {
	let tMin = from;
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

/** Longueur, dans la fenêtre, de la demi-droite d'origine `p` et de direction unitaire `d` */
function rayRoomInFrame(p: Position, d: Position, frame: NonNullable<FigureShapes['window']>) {
	return roomInFrame(p, d, frame, 0);
}

/** Direction unitaire de la bissectrice intérieure de l'angle (a, o, b) ; null si un côté est nul */
function bisectorDirection(a: Position, o: Position, b: Position): Position | null {
	const u = sub(a, o);
	const v = sub(b, o);
	const lu = Math.hypot(u.x, u.y);
	const lv = Math.hypot(v.x, v.y);
	if (lu === 0 || lv === 0) return null;
	const w = { x: u.x / lu + v.x / lv, y: u.y / lu + v.y / lv };
	const lw = Math.hypot(w.x, w.y);
	return lw === 0 ? null : { x: w.x / lw, y: w.y / lw };
}

/**
 * Le côté [OA) est-il tracé dans la figure ? Un trait droit qui passe par O et
 * s'en va vers A (au moins un de ses points, autre que O, sur la demi-droite
 * [OA)) : demi-droite, droite, segment, même plus court que OA (l'arc en O, assez
 * petit, le coupe encore)
 */
function sideDrawn(o: Position, a: Position, traits: readonly Trait[]): boolean {
	const u = sub(a, o);
	const length = Math.hypot(u.x, u.y);
	const towardA = (p: Position) => {
		const w = sub(p, o);
		const lw = Math.hypot(w.x, w.y);
		return lw > 1e-9 * length && Math.abs(cross(u, w)) <= 1e-9 * length * lw && dot(u, w) > 0;
	};
	return traits.some((t) => {
		if (!isStraight(t) || !isOnSomeTrait(o, [t])) return false;
		// Une droite par O, alignée avec A, passe toujours vers A ; un segment ou une
		// demi-droite : un bout (ou la direction) du côté de A
		if (t.kind === 'line') return isOnSomeTrait(a, [t]);
		if (t.kind === 'ray') {
			const ahead = { x: t.a.x + (t.b.x - t.a.x) * 1e3, y: t.a.y + (t.b.y - t.a.y) * 1e3 };
			return towardA(t.a) || towardA(t.b) || towardA(ahead);
		}
		return towardA(t.a) || towardA(t.b);
	});
}

/**
 * Papier uni : la bissectrice de l'angle AOB se construit-elle ? O, A et B
 * visibles, distincts et non alignés (un angle saillant), ses deux côtés tracés
 * (un trait droit de la figure par O et A, un par O et B), et au moins 2 unités
 * de bissectrice dans la fenêtre (lot 9, § 25). Le message, ou null.
 */
function bissectriceSupportError(
	names: [string, string, string],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes
): string | null {
	const hidden = [names[1], names[0], names[2]].find((name) => !shapes.visiblePoints.has(name));
	if (hidden) return `${hidden} n’est pas visible (l’élève ne peut pas y piquer le compas)`;
	const [a, o, b] = names.map((name) => points.get(name));
	if (!a || !o || !b) return null;
	const [p, v, q] = names;
	const u = sub(a, o);
	const w = sub(b, o);
	const lengths = Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y);
	if (lengths === 0 || Math.abs(cross(u, w)) <= 1e-9 * lengths) {
		return `${p}, ${v} et ${q} sont alignés (ou confondus) : l’angle ${p}${v}${q} n’est pas un angle saillant`;
	}
	// Revue M5 : sans ses côtés tracés, l'arc piqué en O n'a rien à couper
	const missing = (
		[
			[a, p],
			[b, q]
		] as const
	).find(([end]) => !sideDrawn(o, end, shapes.traits));
	if (missing) {
		const side = missing[1];
		return `l’angle ${p}${v}${q} doit être tracé : ajouter le côté [${v}${side}) (demidroite(${v}, ${side}))`;
	}
	const d = bisectorDirection(a, o, b);
	if (!d || !shapes.window) return null;
	if (rayRoomInFrame(o, d, shapes.window) >= MEDIATRICE_MIN_ROOM) return null;
	return `la bissectrice de l’angle ${p}${v}${q} n’a pas ${MEDIATRICE_MIN_ROOM} unités dans la fenêtre (l’élève ne peut pas la construire) : agrandir la fenêtre ou déplacer ${v}`;
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
 * par deux nœuds ; sur papier uni, autre chose qu'une médiatrice ou une
 * bissectrice, ou qui ne se construit pas dans la fenêtre
 * (`mediatriceSupportError`, `bissectriceSupportError`) ; une bissectrice sur
 * quadrillage.
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
		const bissectrice = bissectriceOf(check.expression);
		if (bissectrice) {
			// Lot 9 (§ 25) : la bissectrice se construit au compas, pas sur les nœuds
			if (shapes.grid) {
				throw new LineAuthorError(
					`${label} : une bissectrice se construit sur papier uni, sans quadrillage (retirer grille:)`
				);
			}
			const message = bissectriceSupportError(bissectrice, points, shapes);
			if (message) throw new LineAuthorError(`${label} : ${message}`);
			continue;
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
				`${label} : sans quadrillage, seulement une médiatrice (mediatrice(A, B)) ou une bissectrice (bissectrice(A, O, B)) ; sinon ajouter « grille: 1 »`
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
	const withBissectrice = checks.some((check) => bissectriceOf(check.expression) !== null);
	// Le Report (lot 9) : un trait de construction, comme un cercle ; le repère du
	// rapporteur, pour une bissectrice seulement (§ 25)
	const allowed = (o: DrawnObject) =>
		o.kind === 'droite' ||
		o.kind === 'cercle' ||
		o.kind === 'report' ||
		(withBissectrice && o.kind === 'repere');
	if (!objects.every(allowed)) return { status: 'incorrect' };
	const figureTraits = shapes?.traits ?? [];
	// Papier uni : droite construite de proche en proche (décision de David, 2026-11-03, § 14) ;
	// l'exception 4 (§ 25) pour la bissectrice seulement
	const construction =
		shapes && !shapes.grid
			? constructionOf(objects, basePointsOf(points, shapes.segments), figureTraits, {
					arcsOnSides: withBissectrice
				})
			: null;
	const lineIndexes = objects.flatMap((o, i) => (o.kind === 'droite' ? [i] : []));
	const built = (i: number) => !construction || construction.built.has(i);
	const taken = new Set<number>();
	for (const check of checks) {
		const target = expectedOf(check, expected);
		const bissectrice = bissectriceOf(check.expression);
		if (bissectrice) {
			const free = lineIndexes.filter((i) => !taken.has(i));
			const verdict = judgeBissectrice(bissectrice, target, points, objects, free, built, {
				construction,
				figureTraits,
				window: shapes?.window ?? null
			});
			if (typeof verdict !== 'number') return verdict;
			taken.add(verdict);
			continue;
		}
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

/** Angle (en degrés, entre 0 et 90) entre deux directions de droites */
function angleBetweenLines(u: Position, v: Position): number {
	const cos = Math.abs(dot(u, v)) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
	return (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
}

/**
 * La droite (p, q) entre-t-elle dans l'angle saillant de sommet `o` (côtés vers
 * `a` et `b`), dans la fenêtre ? Intersection d'intervalles du paramètre de la
 * droite : les deux demi-plans de l'angle et le cadre.
 */
function entersAngle(
	p: Position,
	q: Position,
	o: Position,
	a: Position,
	b: Position,
	frame: FigureShapes['window']
): boolean {
	const d = sub(q, p);
	const u = sub(a, o);
	const v = sub(b, o);
	const s = Math.sign(cross(u, v));
	let tMin = -Infinity;
	let tMax = Infinity;
	// Contraintes c0 + c1·t > 0
	const constraints: [number, number][] = [
		[s * cross(u, sub(p, o)), s * cross(u, d)],
		[s * cross(sub(p, o), v), s * cross(d, v)]
	];
	if (frame) {
		constraints.push(
			[p.x - frame.xMin, d.x],
			[frame.xMax - p.x, -d.x],
			[p.y - frame.yMin, d.y],
			[frame.yMax - p.y, -d.y]
		);
	}
	for (const [c0, c1] of constraints) {
		if (c1 === 0) {
			if (c0 <= 0) return false;
			continue;
		}
		const t = -c0 / c1;
		if (c1 > 0) tMin = Math.max(tMin, t);
		else tMax = Math.min(tMax, t);
	}
	return tMin < tMax;
}

/**
 * Une bissectrice (lot 9, § 25) : l'indice de la droite de l'élève retenue, ou le
 * verdict faux et sa première cause. Juste : une droite construite qui recouvre
 * la bissectrice ; ou, au rapporteur, un côté d'angle tiré de O à 1° près.
 */
function judgeBissectrice(
	names: [string, string, string],
	target: ExpectedLine,
	points: ReadonlyMap<string, Position>,
	objects: readonly DrawnObject[],
	free: readonly number[],
	built: (i: number) => boolean,
	context: {
		construction: Construction | null;
		figureTraits: readonly Trait[];
		window: FigureShapes['window'];
	}
): number | ConstructionVerdict {
	const [a, o, b] = names.map((name) => points.get(name));
	const line = (i: number) => objects[i] as DrawnLine;
	const covering = free.filter((i) => coincides(line(i), target));
	const good = covering.find(built);
	if (good !== undefined) return good;
	if (!a || !o || !b) {
		return covering.length > 0
			? { status: 'incorrect', feedback: BISSECTRICE_EYEBALLED_FEEDBACK }
			: { status: 'incorrect', feedback: bissectriceMissingFeedback(...names) };
	}
	const direction = sub(target.b, target.a);
	// Au rapporteur : côté d'angle tiré de O, à 1° près de la bissectrice
	const { construction } = context;
	const marks = objects.filter((x): x is DrawnRepere => x.kind === 'repere');
	const eps = 1e-9 * Math.max(1, Math.abs(o.x), Math.abs(o.y));
	const fromO = (i: number) => {
		const vertex = construction ? angleSideVertex(line(i), marks, construction) : null;
		return vertex !== null && Math.hypot(vertex.x - o.x, vertex.y - o.y) <= eps;
	};
	const measured = free.find((i) => {
		const [p, q] = ends(line(i));
		return (
			fromO(i) && angleBetweenLines(sub(q, p), direction) <= BISSECTRICE_PROTRACTOR_TOLERANCE_DEG
		);
	});
	if (measured !== undefined) return measured;
	if (covering.length > 0) return { status: 'incorrect', feedback: BISSECTRICE_EYEBALLED_FEEDBACK };
	const throughO = free.filter((i) => isOnLine(o, { a: ends(line(i))[0], b: ends(line(i))[1] }));
	if (throughO.length === 0) {
		const inside = free.some((i) => entersAngle(...ends(line(i)), o, a, b, context.window));
		return {
			status: 'incorrect',
			feedback: inside
				? bissectriceNotFromVertexFeedback(names[1])
				: bissectriceMissingFeedback(...names)
		};
	}
	// Une droite qui repasse un côté de l'angle n'est pas l'essai de bissectrice
	const retraces = (i: number) => {
		const [p, q] = ends(line(i));
		return context.figureTraits.some(
			(t) => isStraight(t) && isOnLine(t.a, { a: p, b: q }) && isOnLine(t.b, { a: p, b: q })
		);
	};
	const own = throughO.filter((i) => !retraces(i));
	// Seulement un côté repassé ou prolongé : pas encore d'essai de bissectrice (revue M1)
	if (own.length === 0) {
		return { status: 'incorrect', feedback: bissectriceMissingFeedback(...names) };
	}
	const builtTries = own.filter(built);
	if (builtTries.length === 0) {
		return { status: 'incorrect', feedback: BISSECTRICE_EYEBALLED_FEEDBACK };
	}
	const shown = line(builtTries[builtTries.length - 1]);
	const [p, q] = ends(shown);
	return {
		status: 'incorrect',
		feedback: isPerpendicular(sub(q, p), direction)
			? neighbourAngleFeedback(...names)
			: notBissectriceFeedback(...names)
	};
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

/**
 * Correction d'une bissectrice (lot 9, § 25) : les deux demi-angles, codés du
 * même signe, et les traits fins de la construction (l'arc en O, les deux arcs
 * égaux en A' et B')
 */
export interface BissectriceCorrection {
	center: Position;
	/** Un point de [OA), de la bissectrice, de [OB) (A', le point de la bissectrice, B') */
	from: Position;
	middle: Position;
	to: Position;
	/** Sens de [OA) vers [OB) : 1 trigonométrique */
	sens: 1 | -1;
	arcs: { center: Position; radius: number }[];
}

/** Rayon de l'arc en O : cette part du plus court des côtés [OA] et [OB] */
const BISSECTRICE_ARC_RATIO = 0.6;

export function bissectriceCorrections(
	checks: readonly LineCheck[],
	points: ReadonlyMap<string, Position>
): BissectriceCorrection[] {
	return checks.flatMap((check): BissectriceCorrection[] => {
		const names = bissectriceOf(check.expression);
		if (!names) return [];
		const [a, o, b] = names.map((name) => points.get(name));
		if (!a || !o || !b) return [];
		const w = bisectorDirection(a, o, b);
		const u = sub(a, o);
		const v = sub(b, o);
		const lu = Math.hypot(u.x, u.y);
		const lv = Math.hypot(v.x, v.y);
		if (!w || cross(u, v) === 0) return [];
		const r = BISSECTRICE_ARC_RATIO * Math.min(lu, lv);
		const along = (d: Position, length: number) => ({
			x: o.x + d.x * length + 0,
			y: o.y + d.y * length + 0
		});
		const from = along(u, r / lu);
		const to = along(v, r / lv);
		const spread = Math.hypot(to.x - from.x, to.y - from.y);
		return [
			{
				center: o,
				from,
				middle: along(w, r),
				to,
				sens: cross(u, v) > 0 ? 1 : -1,
				arcs: [
					{ center: o, radius: r },
					{ center: from, radius: spread },
					{ center: to, radius: spread }
				]
			}
		];
	});
}
