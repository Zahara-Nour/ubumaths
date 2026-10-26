/**
 * Carré / rectangle à compléter (vérifications `carre`, `rectangle`, CP-060)
 * =========================================================================
 *
 * Les côtés donnés et les segments de l'élève sont FUSIONNÉS par droite
 * porteuse : un côté tracé en morceaux, ou un trait repassé sur un côté donné,
 * ne changent rien (on juge le résultat, pas la manière). Un rectangle est
 * « présent » quand ses quatre côtés sont couverts. Ordre des messages : trait
 * hors des lignes, figure non fermée (ou fermée sur le côté donné prolongé),
 * pas un carré, trait de trop, trait qui dépasse. Décisions de David du 2026-10-26
 * (`docs/wip/geometrie-validation-progress.md` § 7 et § 9).
 *
 * @module questions/construction/polygon
 */

import type { PolygonCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine } from './answer';
import type { ConstructionVerdict, Position } from './judge';

export const NOT_ON_GRID_LINES_FEEDBACK = 'Trace les côtés en suivant les lignes du quadrillage.';
export const NOT_CLOSED_FEEDBACK = 'Ta figure n’est pas fermée.';
export const NOT_A_SQUARE_FEEDBACK =
	'Ce n’est pas un carré : ses côtés n’ont pas tous la même longueur.';
export const EXTRA_SEGMENT_FEEDBACK = 'Tu as tracé un trait de trop.';
export const OVERSHOOT_FEEDBACK = 'Un de tes traits dépasse de la figure.';
export const PROLONGED_SIDE_FEEDBACK =
	'Le côté déjà tracé ne doit pas être prolongé : ton carré doit avoir ce côté-là.';

/** Tolérance relative : les touchers aimantés sur les nœuds arrivent exacts */
const EPSILON = 1e-9;

interface Segment {
	a: Position;
	b: Position;
}

/** Morceau d'une droite porteuse : p(t) = t·u + c·n, t de t0 à t1 */
interface Carrier {
	u: Position;
	c: number;
	t0: number;
	t1: number;
}

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class PolygonAuthorError extends Error {}

const sub = (p: Position, q: Position): Position => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p: Position, q: Position): Position => ({ x: p.x + q.x + 0, y: p.y + q.y + 0 });
const scale = (k: number, p: Position): Position => ({ x: k * p.x + 0, y: k * p.y + 0 });
const dot = (p: Position, q: Position) => p.x * q.x + p.y * q.y;
const cross = (p: Position, q: Position) => p.x * q.y - p.y * q.x;
/** Quart de tour dans le sens direct */
const normal = (p: Position): Position => ({ x: -p.y + 0, y: p.x });

function tolerance(...points: Position[]): number {
	return EPSILON * Math.max(1, ...points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]));
}

function isAxisAligned({ a, b }: Segment): boolean {
	const eps = tolerance(a, b);
	return Math.abs(a.x - b.x) <= eps || Math.abs(a.y - b.y) <= eps;
}

/** La droite porteuse d'un segment, direction rendue unique (vers la droite, sinon vers le haut) */
function carrierOf({ a, b }: Segment): Carrier {
	const d = sub(b, a);
	const length = Math.hypot(d.x, d.y);
	let u = { x: d.x / length, y: d.y / length };
	if (u.x < -EPSILON || (Math.abs(u.x) <= EPSILON && u.y < 0)) u = { x: -u.x, y: -u.y };
	const ta = dot(u, a);
	const tb = dot(u, b);
	return { u, c: cross(u, a), t0: Math.min(ta, tb), t1: Math.max(ta, tb) };
}

function sameLine(p: Carrier, q: Carrier, eps: number): boolean {
	return Math.abs(cross(p.u, q.u)) <= EPSILON && Math.abs(p.c - q.c) <= eps;
}

/** Fusionner les morceaux qui se touchent ou se chevauchent sur une même droite */
function mergeSegments(segments: readonly Segment[], eps: number): Carrier[] {
	const groups: Carrier[][] = [];
	for (const carrier of segments.map(carrierOf)) {
		const group = groups.find((g) => sameLine(g[0], carrier, eps));
		if (group) group.push(carrier);
		else groups.push([carrier]);
	}
	return groups.flatMap((group) => {
		const sorted = [...group].sort((p, q) => p.t0 - q.t0);
		const merged: Carrier[] = [];
		for (const piece of sorted) {
			const last = merged.at(-1);
			if (last && piece.t0 <= last.t1 + eps) last.t1 = Math.max(last.t1, piece.t1);
			else merged.push({ ...piece });
		}
		return merged;
	});
}

/** Le morceau qui couvre tout le côté [PQ], s'il existe */
function coveringPiece(side: Segment, pieces: readonly Carrier[], eps: number): Carrier | null {
	const s = carrierOf(side);
	return (
		pieces.find((p) => sameLine(p, s, eps) && p.t0 <= s.t0 + eps && p.t1 >= s.t1 - eps) ?? null
	);
}

function sidesOf(vertices: readonly Position[]): Segment[] {
	return vertices.map((a, i) => ({ a, b: vertices[(i + 1) % vertices.length] }));
}

function isPresent(vertices: readonly Position[], pieces: readonly Carrier[], eps: number) {
	return sidesOf(vertices).every((side) => coveringPiece(side, pieces, eps) !== null);
}

/** Trait de trop (hors de la figure), sinon trait qui la prolonge, sinon rien */
function leftoverFeedback(
	vertices: readonly Position[],
	pieces: readonly Carrier[],
	eps: number
): string | null {
	const sides = sidesOf(vertices).map(carrierOf);
	let overshoot = false;
	for (const piece of pieces) {
		// Le morceau qui porte un côté le couvre en entier (fusion) ; un autre morceau
		// sur la même droite, séparé du côté par un trou, est un trait de trop
		const side = sides.find(
			(s) => sameLine(piece, s, eps) && piece.t0 <= s.t0 + eps && piece.t1 >= s.t1 - eps
		);
		if (!side) return EXTRA_SEGMENT_FEEDBACK;
		if (piece.t1 - piece.t0 > side.t1 - side.t0 + eps) overshoot = true;
	}
	return overshoot ? OVERSHOOT_FEEDBACK : null;
}

function positionOf(points: ReadonlyMap<string, Position>, name: string): Position {
	const position = points.get(name);
	if (!position)
		throw new PolygonAuthorError(`verifier: le point ${name} n’existe pas dans la figure`);
	return position;
}

/**
 * Les sommets donnés de la vérification (côtés déjà tracés dans la figure de
 * départ) ; erreur d'auteur s'ils manquent, sont confondus ou sans angle droit
 */
export function givenVertices(
	check: PolygonCheck,
	points: ReadonlyMap<string, Position>
): Position[] {
	const vertices = check.points.map((name) => positionOf(points, name));
	const eps = tolerance(...vertices);
	for (let i = 1; i < vertices.length; i++) {
		const [p, q] = [vertices[i - 1], vertices[i]];
		if (Math.hypot(p.x - q.x, p.y - q.y) <= eps) {
			throw new PolygonAuthorError(
				`verifier: ${check.kind} : ${check.points[i - 1]} et ${check.points[i]} sont au même endroit`
			);
		}
	}
	if (check.kind === 'rectangle') {
		const [a, b, c] = vertices;
		if (Math.abs(dot(sub(a, b), sub(c, b))) > tolerance(a, b, c)) {
			throw new PolygonAuthorError(
				`verifier: rectangle ${check.points.join(' ; ')} : pas d’angle droit en ${check.points[1]}`
			);
		}
	}
	return vertices;
}

/** Le carré de côté [AB], du côté `side` (+1 : quart de tour direct depuis AB) */
function squareVertices(a: Position, b: Position, side: number): Position[] {
	const n = scale(side, normal(sub(b, a)));
	return [a, b, add(b, n), add(a, n)];
}

/** Rectangles de base [AB] que les bouts des segments de l'élève peuvent fermer */
function candidateHeights(a: Position, b: Position, drawn: readonly Segment[], eps: number) {
	const n = normal(sub(b, a));
	const heights: number[] = [];
	for (const p of drawn.flatMap((s) => [s.a, s.b])) {
		const h = dot(sub(p, a), n) / dot(n, n);
		if (Math.abs(h) > eps && !heights.some((k) => Math.abs(k - h) <= eps)) heights.push(h);
	}
	return heights;
}

/**
 * Figure fermée sur le côté donné [AB] PROLONGÉ : un rectangle dont un côté
 * contient [AB] en étant plus long, ses sommets pris aux bouts des segments
 * de l'élève (essai de David du 2026-10-26)
 */
function closedOnProlongedSide(
	a: Position,
	b: Position,
	drawn: readonly Segment[],
	pieces: readonly Carrier[],
	eps: number
): boolean {
	const u = sub(b, a);
	const length2 = dot(u, u);
	// Abscisse le long de [AB] : 0 en A, 1 en B
	const ends: number[] = [];
	for (const p of drawn.flatMap((s) => [s.a, s.b])) {
		const t = dot(sub(p, a), u) / length2;
		if (!ends.some((k) => Math.abs(k - t) <= eps)) ends.push(t);
	}
	const starts = ends.filter((t) => t <= eps);
	const stops = ends.filter((t) => t >= 1 - eps);
	const n = normal(u);
	for (const h of candidateHeights(a, b, drawn, eps)) {
		for (const t0 of starts) {
			for (const t1 of stops) {
				if (t0 > -eps && t1 < 1 + eps) continue;
				const p = add(a, scale(t0, u));
				const q = add(a, scale(t1, u));
				const rect = [p, q, add(q, scale(h, n)), add(p, scale(h, n))];
				if (isPresent(rect, pieces, eps)) return true;
			}
		}
	}
	return false;
}

export function judgePolygon(
	check: PolygonCheck,
	points: ReadonlyMap<string, Position>,
	lines: readonly DrawnLine[]
): ConstructionVerdict {
	const vertices = givenVertices(check, points);
	if (lines.some((l) => l.kind !== 'segment')) return { status: 'incorrect' };
	const drawn: Segment[] = lines.map((l) => ({ a: { x: l.x1, y: l.y1 }, b: { x: l.x2, y: l.y2 } }));
	const given = sidesOf(vertices).slice(0, vertices.length - 1);
	const eps = tolerance(...vertices, ...drawn.flatMap((s) => [s.a, s.b]));

	// Côtés donnés sur les lignes du quadrillage : ceux de l'élève aussi
	if (given.every(isAxisAligned) && !drawn.every(isAxisAligned)) {
		return { status: 'incorrect', feedback: NOT_ON_GRID_LINES_FEEDBACK };
	}
	const pieces = mergeSegments([...given, ...drawn], eps);

	let expected: Position[];
	if (check.kind === 'rectangle') {
		const [a, b, c] = vertices;
		expected = [a, b, c, add(a, sub(c, b))];
		if (!isPresent(expected, pieces, eps)) {
			return { status: 'incorrect', feedback: NOT_CLOSED_FEEDBACK };
		}
	} else {
		const [a, b] = vertices;
		const n = normal(sub(b, a));
		const closed = candidateHeights(a, b, drawn, eps)
			.map((h) => [a, b, add(b, scale(h, n)), add(a, scale(h, n))])
			.filter((rect) => isPresent(rect, pieces, eps));
		const squares = [1, -1]
			.map((side) => squareVertices(a, b, side))
			.filter((sq) => isPresent(sq, pieces, eps));
		if (squares.length === 0) {
			let feedback = NOT_CLOSED_FEEDBACK;
			if (closed.length > 0) feedback = NOT_A_SQUARE_FEEDBACK;
			else if (closedOnProlongedSide(a, b, drawn, pieces, eps)) feedback = PROLONGED_SIDE_FEEDBACK;
			return { status: 'incorrect', feedback };
		}
		expected = squares[0];
	}
	const feedback = leftoverFeedback(expected, pieces, eps);
	return feedback ? { status: 'incorrect', feedback } : { status: 'correct' };
}

/**
 * La bonne figure : les côtés qui manquent (sans les côtés donnés). Carré :
 * du côté où l'élève a le plus tracé, sinon au-dessus (côté vertical : à droite).
 */
export function polygonSolution(
	check: PolygonCheck,
	points: ReadonlyMap<string, Position>,
	lines: readonly DrawnLine[] = []
): DrawnLine[] {
	let vertices: Position[];
	try {
		vertices = givenVertices(check, points);
	} catch {
		return [];
	}
	let missing: Position[];
	if (check.kind === 'rectangle') {
		const [a, b, c] = vertices;
		missing = [c, add(a, sub(c, b)), a];
	} else {
		const [a, b] = vertices;
		const n = normal(sub(b, a));
		let weight = 0;
		for (const l of lines) {
			const middle = { x: (l.x1 + l.x2) / 2, y: (l.y1 + l.y2) / 2 };
			weight += Math.sign(dot(sub(middle, a), n)) * Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
		}
		const eps = tolerance(a, b);
		const up = n.y > eps || (Math.abs(n.y) <= eps && n.x > 0) ? 1 : -1;
		const side = weight > eps ? 1 : weight < -eps ? -1 : up;
		const [, , c, d] = squareVertices(a, b, side);
		missing = [b, c, d, a];
	}
	return missing.slice(0, -1).map((p, i) => ({
		kind: 'segment',
		x1: p.x,
		y1: p.y,
		x2: missing[i + 1].x,
		y2: missing[i + 1].y
	}));
}
