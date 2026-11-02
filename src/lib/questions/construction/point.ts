/**
 * Points à placer (vérification `point`, chantier `controles-figure`, lot 2a)
 * ===========================================================================
 *
 * `point A' = symetrie(A, axe=d)` : l'élève place (outil point) un point là où
 * l'expression du langage des figures le met ; plusieurs lignes : plusieurs
 * points, NON nommés par l'élève, jugés comme un ensemble (chaque point attendu
 * touché, aucun de trop). Traits de construction : ignorés. Phase 0 validée par
 * David le 2026-11-02 (`docs/wip/controles-figure-progress.md` § 5).
 *
 * Messages, dans l'ordre : point qui manque ou mal placé (symétrique par un
 * axe : « perpendiculaire » si le point est à la bonne distance de l'axe mais
 * hors de la perpendiculaire, « même distance » s'il est sur la perpendiculaire
 * mais pas à la bonne distance), point de trop.
 *
 * Lot 2a : sur quadrillage seulement (touchers aux nœuds) ; papier uni avec
 * équerre et compas : lot 2b.
 *
 * Pur : positions de la figure et points attendus donnés par l'appelant
 * (registre `positions.ts`, qui calcule l'expression).
 *
 * @module questions/construction/point
 */

import type { ConstructionCheck, PointCheck } from '$lib/ubumark/types/construction';
import { isDrawnPoint, type DrawnObject } from './answer';
import type { ConstructionVerdict, Position } from './judge';
import { dot, sub, tolerance } from './polygon';
import type { FigureShapes } from './symmetry';

export const POINT_EXTRA_FEEDBACK = 'Tu as placé un point de trop.';
export const POINT_MISSING_FEEDBACK = 'Il manque un point.';
export const POINT_NOT_IN_PLACE_FEEDBACK = 'Ce point n’est pas à sa place.';

/** Apostrophe typographique dans les messages (A’) */
const typographic = (name: string) => name.replaceAll("'", '’');

export const notImageFeedback = (source: string) =>
	`Ce point n’est pas le symétrique de ${typographic(source)}.`;

export const notPerpendicularFeedback = (source: string, name: string) =>
	`Le segment [${typographic(source)}${typographic(name)}] doit être perpendiculaire à l’axe.`;

export const notSameDistanceFeedback = (source: string, name: string) =>
	`${typographic(name)} doit être à la même distance de l’axe que ${typographic(source)}.`;

/** Points attendus, calculés par le registre à partir des expressions */
export interface ExpectedPoints {
	/** Position de chaque point attendu, par son nom (lecture seule) */
	readonly positions: ReadonlyMap<string, Position>;
	/** Pourquoi une expression ne se calcule pas (erreur d'auteur), par nom */
	readonly errors: ReadonlyMap<string, string>;
}

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class PointAuthorError extends Error {}

/** Correction d'un point : où il va ; symétrique : son antécédent et le milieu de [AA'] */
export interface PointSolution {
	name: string;
	at: Position;
	from?: Position;
	foot?: Position;
	/** Symétrie axiale (codage de l'angle droit), sinon centrale */
	axial?: boolean;
}

const SYMMETRY_REGEX =
	/^sym[eé]trie\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*(axe|centre)\s*=\s*([A-Za-z][A-Za-z0-9_]*)?/;

/** Symétrique d'un point par un objet nommé : l'antécédent, l'axe ou le centre */
function symmetryOf(
	expression: string
): { source: string; by: 'axe' | 'centre'; target: string | null } | null {
	const match = SYMMETRY_REGEX.exec(expression.trim());
	if (!match) return null;
	return { source: match[1], by: match[2] as 'axe' | 'centre', target: match[3] ?? null };
}

export function isPointCheck(check: ConstructionCheck): check is PointCheck {
	return check.kind === 'point';
}

const near = (p: Position, q: Position, eps: number) => Math.hypot(p.x - q.x, p.y - q.y) <= eps;

const isOnGrid = (value: number, step: number, eps: number) =>
	Math.abs(value / step - Math.round(value / step)) * step <= eps;

function expectedOf(check: PointCheck, expected: ExpectedPoints | undefined): Position {
	if (!expected) {
		throw new PointAuthorError('Case « figure » : points attendus non fournis au juge (point)');
	}
	const label = `verifier: point ${check.name} = ${check.expression}`;
	const error = expected.errors.get(check.name);
	if (error) throw new PointAuthorError(`${label} : ${error}`);
	const position = expected.positions.get(check.name);
	if (!position) throw new PointAuthorError(`${label} : l’expression ne donne pas un point`);
	return position;
}

/**
 * Les points sont-ils faisables ? Erreur d'AUTEUR sinon : expression qui ne
 * se calcule pas ou ne donne pas un point, nom déjà pris, point déjà dans la
 * figure (rien à placer), hors de la fenêtre, sans quadrillage ou hors des
 * nœuds (l'élève ne pourrait pas l'atteindre), deux points au même endroit.
 */
export function assertPoints(
	checks: readonly PointCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	const placed: { name: string; at: Position }[] = [];
	for (const check of checks) {
		const label = `verifier: point ${check.name}`;
		if (points.has(check.name)) {
			throw new PointAuthorError(`${label} : le point ${check.name} existe déjà dans la figure`);
		}
		const at = expectedOf(check, expected);
		const eps = tolerance(at, ...points.values());
		const grid = shapes?.grid;
		if (!grid) {
			throw new PointAuthorError(
				`${label} : un point se place sur quadrillage, ajouter « grille: 1 » (sans quadrillage, l’élève ne peut pas l’atteindre)`
			);
		}
		const window = shapes.window;
		if (
			window &&
			(at.x < window.xMin - eps ||
				at.x > window.xMax + eps ||
				at.y < window.yMin - eps ||
				at.y > window.yMax + eps)
		) {
			throw new PointAuthorError(`${label} : le point attendu est hors de la fenêtre`);
		}
		if (!isOnGrid(at.x, grid.x, eps) || !isOnGrid(at.y, grid.y, eps)) {
			throw new PointAuthorError(
				`${label} : le point attendu n’est pas sur un nœud du quadrillage (l’élève ne peut pas l’atteindre)`
			);
		}
		const existing = [...points].find(([, p]) => near(p, at, eps));
		if (existing) {
			throw new PointAuthorError(
				`${label} : le point attendu est déjà dans la figure (au même endroit que ${existing[0]}) : rien à placer`
			);
		}
		const twin = placed.find((p) => near(p.at, at, eps));
		if (twin) {
			throw new PointAuthorError(
				`verifier: les points ${twin.name} et ${check.name} sont au même endroit`
			);
		}
		placed.push({ name: check.name, at });
	}
}

/** Pourquoi ce point n'est pas le point attendu */
function wrongPointFeedback(
	check: PointCheck,
	drawn: Position,
	at: Position,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): string {
	const symmetry = symmetryOf(check.expression);
	if (!symmetry) return POINT_NOT_IN_PLACE_FEEDBACK;
	const generic = notImageFeedback(symmetry.source);
	const source = points.get(symmetry.source);
	const axis =
		symmetry.by === 'axe' && symmetry.target ? shapes?.lines.get(symmetry.target) : undefined;
	if (!source || !axis) return generic;
	const u = sub(axis.b, axis.a);
	const length = Math.hypot(u.x, u.y);
	const eps = tolerance(drawn, source, at, axis.a, axis.b);
	// Distance (signée) à l'axe, et position le long de l'axe
	const across = (p: Position) => (u.x * (p.y - axis.a.y) - u.y * (p.x - axis.a.x)) / length;
	const perpendicular = Math.abs(dot(sub(drawn, source), u)) / length <= eps;
	const sameDistance = Math.abs(Math.abs(across(drawn)) - Math.abs(across(source))) <= eps;
	if (near(drawn, source, eps)) return generic;
	if (sameDistance && !perpendicular) return notPerpendicularFeedback(symmetry.source, check.name);
	if (perpendicular && !sameDistance) return notSameDistanceFeedback(symmetry.source, check.name);
	return generic;
}

/**
 * Verdict : chaque point attendu prend un point de l'élève à sa place ; le
 * premier point attendu sans preneur est expliqué avec le point de l'élève le
 * plus proche, qu'aucun autre n'a pris ; un point que personne ne prend est de
 * trop.
 */
export function judgePoints(
	checks: readonly PointCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const targets = checks.map((check) => ({ check, at: expectedOf(check, expected) }));
	const unused = objects.filter(isDrawnPoint).map(({ x, y }) => ({ x, y }));
	const eps = tolerance(...targets.map((t) => t.at), ...unused);
	const missed: typeof targets = [];
	for (const target of targets) {
		const index = unused.findIndex((p) => near(p, target.at, eps));
		if (index === -1) missed.push(target);
		else unused.splice(index, 1);
	}
	if (missed.length === 0) {
		return unused.length > 0
			? { status: 'incorrect', feedback: POINT_EXTRA_FEEDBACK }
			: { status: 'correct' };
	}
	if (unused.length === 0) return { status: 'incorrect', feedback: POINT_MISSING_FEEDBACK };
	const { check, at } = missed[0];
	const distance = (p: Position) => Math.hypot(p.x - at.x, p.y - at.y);
	const closest = unused.reduce((best, p) => (distance(p) < distance(best) ? p : best));
	return {
		status: 'incorrect',
		feedback: wrongPointFeedback(check, closest, at, points, shapes)
	};
}

/** La correction : chaque point attendu ; symétrique : [AA'] et son milieu */
export function pointSolution(
	checks: readonly PointCheck[],
	expected: ExpectedPoints | undefined,
	points: ReadonlyMap<string, Position>
): PointSolution[] {
	return checks.flatMap((check): PointSolution[] => {
		const at = expected?.positions.get(check.name);
		if (!at) return [];
		const symmetry = symmetryOf(check.expression);
		const from = symmetry ? points.get(symmetry.source) : undefined;
		if (!symmetry || !from) return [{ name: check.name, at }];
		const foot = { x: (from.x + at.x) / 2 + 0, y: (from.y + at.y) / 2 + 0 };
		return [{ name: check.name, at, from, foot, axial: symmetry.by === 'axe' }];
	});
}
