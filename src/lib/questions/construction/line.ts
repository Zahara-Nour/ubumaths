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
import { isConstructed, isStraight, lineCrossesFrame, traitOf, type Trait } from './instruments';
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

/**
 * Les droites sont-elles faisables ? Erreur d'AUTEUR sinon : expression qui ne
 * se calcule pas ou ne donne pas une droite, droite hors de la fenêtre, sur
 * quadrillage droite qui ne passe pas par deux nœuds, médiatrice d'un point
 * invisible (l'élève ne peut pas y piquer le compas).
 */
export function assertLines(
	checks: readonly LineCheck[],
	expected: ExpectedPoints | undefined,
	shapes: FigureShapes | undefined
): void {
	if (!shapes) {
		throw new LineAuthorError('Case « figure » : traits de la figure non fournis au juge (droite)');
	}
	for (const check of checks) {
		const label = `verifier: droite ${check.name}`;
		const line = expectedOf(check, expected);
		if (shapes.window && !lineCrossesFrame(line.a, line.b, shapes.window)) {
			throw new LineAuthorError(`${label} : la droite attendue est hors de la fenêtre`);
		}
		if (shapes.grid && gridNodesOn(line, shapes) < 2) {
			throw new LineAuthorError(
				`${label} : la droite attendue ne passe pas par deux nœuds du quadrillage dans la fenêtre (l’élève ne peut pas la tracer)`
			);
		}
		const hidden = mediatriceOf(check.expression)?.find((name) => !shapes.visiblePoints.has(name));
		if (hidden) {
			throw new LineAuthorError(
				`${label} : ${hidden} n’est pas visible (l’élève ne peut pas y piquer le compas)`
			);
		}
	}
}

/**
 * La droite d'indice `index` est-elle construite ? Par deux points construits,
 * ou par un point construit et perpendiculaire à un autre trait droit
 * (équerre). Les traits autres qu'elle seule comptent : une extrémité posée
 * « sur un trait » n'est pas une intersection.
 */
function isConstructedLine(
	index: number,
	objects: readonly DrawnObject[],
	points: readonly Position[],
	figureTraits: readonly Trait[]
): boolean {
	const line = objects[index] as DrawnLine;
	const traits = [
		...figureTraits,
		...objects.flatMap((o, i) => {
			const trait = i === index ? null : traitOf(o);
			return trait ? [trait] : [];
		})
	];
	const [p, q] = ends(line);
	const builtP = isConstructed(p, points, traits);
	const builtQ = isConstructed(q, points, traits);
	if (builtP && builtQ) return true;
	if (!builtP && !builtQ) return false;
	const direction = sub(q, p);
	return traits.some((t) => isStraight(t) && isPerpendicular(direction, sub(t.b, t.a)));
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

/** Une droite de l'élève « qui touche au but » : perpendiculaire à [AB] ou par son milieu */
function closest(
	candidates: readonly number[],
	objects: readonly DrawnObject[],
	a: Position,
	b: Position
): number {
	const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	const near = candidates.find((i) => {
		const [p, q] = ends(objects[i] as DrawnLine);
		return isPerpendicular(sub(q, p), sub(b, a)) || isOnLine(middle, { a: p, b: q });
	});
	return near ?? candidates[candidates.length - 1];
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
	if (objects.some((o) => o.kind !== 'droite' && o.kind !== 'cercle')) {
		return { status: 'incorrect' };
	}
	const plainPaper = Boolean(shapes && !shapes.grid);
	const named = [...points.values()];
	const figureTraits = shapes?.traits ?? [];
	const lineIndexes = objects.flatMap((o, i) => (o.kind === 'droite' ? [i] : []));
	const built = (i: number) => !plainPaper || isConstructedLine(i, objects, named, figureTraits);
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
		const shown = a && b ? closest(free, objects, a, b) : free[free.length - 1];
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
