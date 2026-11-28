/**
 * Triangle à reproduire sur quadrillage (outil n° 47)
 * ===================================================
 *
 * `verifier: triangle ABC : reproduit DEF` : le modèle DEF est tracé sur le
 * quadrillage ; l'élève reproduit ABC, le MÊME triangle déplacé (A ↔ D, B ↔ E,
 * C ↔ F), en comptant les carreaux, au seul outil segment. Forme 1 : B est dans
 * la figure et [AB] tracé ([DE] déplacé) ; l'élève trace [AC] et [BC]. Forme 2 :
 * seul A est placé ; l'élève trace les trois côtés. On juge le résultat : côtés
 * dans n'importe quel ordre et sens, en morceaux (fusion de `polygon.ts`) ; un
 * triangle pareil au modèle mais retourné ou tourné a son message. Phase 0
 * validée par David le 2026-11-28 (`docs/wip/outil-triangle-quadrillage-progress.md` § 1).
 *
 * @module questions/construction/triangle-copy
 */

import type { TriangleCheck } from '#lib/ubumark/types/construction.ts';
import type { DrawnLine, DrawnObject } from './answer';
import { isInFrame } from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import {
	NOT_CLOSED_FEEDBACK,
	coveringPiece,
	leftoverFeedback,
	carrierOf,
	mergeSegments,
	sameLine,
	sub,
	tolerance,
	type Carrier,
	type Segment
} from './polygon';
import type { FigureShapes } from './symmetry';
import {
	TriangleAuthorError,
	missingSideFeedback,
	missingSidesFeedback,
	notJoinedFeedback,
	type TriangleCorrection
} from './triangle';

/** Une vérification `reproduit DEF` : le triangle et son modèle */
export type CopyCheck = TriangleCheck & { model: [string, string, string] };

export const FLIPPED_COPY_FEEDBACK = 'Ton triangle est retourné par rapport au modèle.';
export const wrongCopyVertexFeedback = (c: string, a: string) =>
	`Ton sommet ${c} n’est pas au bon endroit : compte les carreaux depuis ${a} sur le modèle.`;
export const wrongCopyVerticesFeedback = (b: string, c: string, a: string) =>
	`Tes sommets ${b} et ${c} ne sont pas au bon endroit : compte les carreaux depuis ${a} sur le modèle.`;
export const copyStartFeedback = (a: string) => `Ton triangle doit partir du point ${a}.`;

/** Ce que l'auteur a écrit, calculé : les trois sommets attendus et la forme */
interface CopySetting {
	/** A, B, C attendus (B donné en forme 1, à tracer en forme 2) */
	vertices: [Position, Position, Position];
	/** Forme 1 : B est dans la figure et [AB] est tracé */
	sideGiven: boolean;
}

export function isCopyCheck(check: TriangleCheck): check is CopyCheck {
	return check.model !== undefined;
}

const add = (p: Position, q: Position): Position => ({ x: p.x + q.x + 0, y: p.y + q.y + 0 });
const near = (p: Position, q: Position, eps: number) => Math.hypot(p.x - q.x, p.y - q.y) <= eps;
const isOnGrid = (value: number, step: number, eps: number) =>
	Math.abs(value / step - Math.round(value / step)) * step <= eps;
const cross = (p: Position, q: Position) => p.x * q.y - p.y * q.x;
const formatAt = (p: Position) => `(${p.x} ; ${p.y})`;

function labelOf(check: CopyCheck): string {
	return `verifier: triangle ${check.points.join('')} : reproduit ${check.model.join('')}`;
}

/** Sommets attendus ; erreur d'AUTEUR si le triangle ne se reproduit pas */
function settingOf(
	check: CopyCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): CopySetting {
	const label = labelOf(check);
	const grid = shapes?.grid;
	if (!shapes || !grid) {
		throw new TriangleAuthorError(`${label} : le triangle se reproduit sur quadrillage`);
	}
	const window = shapes.window;
	const [nameA, nameB, nameC] = check.points;
	const placed = (name: string, gesture: string): Position => {
		const at = points.get(name);
		if (!at)
			throw new TriangleAuthorError(`${label} : le point ${name} n’existe pas dans la figure`);
		if (!shapes.visiblePoints.has(name)) {
			throw new TriangleAuthorError(
				`${label} : ${name} n’est pas visible (l’élève ne peut pas y ${gesture})`
			);
		}
		if (window && !isInFrame(at, window)) {
			throw new TriangleAuthorError(`${label} : ${name} est hors de la fenêtre`);
		}
		const eps = tolerance(at);
		if (!(isOnGrid(at.x, grid.x, eps) && isOnGrid(at.y, grid.y, eps))) {
			throw new TriangleAuthorError(`${label} : ${name} n’est pas sur un nœud du quadrillage`);
		}
		return at;
	};
	const [d, e, f] = check.model.map((name) => placed(name, 'compter les carreaux'));
	if (Math.abs(cross(sub(e, d), sub(f, d))) <= tolerance(d, e, f)) {
		throw new TriangleAuthorError(
			`${label} : le modèle ${check.model.join('')} est aplati (ses trois sommets sont alignés)`
		);
	}
	const traced = (p: Position, q: Position) =>
		shapes.segments.some(
			(s) =>
				(near(s.a, p, tolerance(p)) && near(s.b, q, tolerance(q))) ||
				(near(s.a, q, tolerance(q)) && near(s.b, p, tolerance(p)))
		);
	// Le modèle se lit sur ses côtés : les trois doivent être tracés (revue de la PR)
	const [nameD, nameE, nameF] = check.model;
	for (const [p, q, side] of [
		[d, e, `${nameD}${nameE}`],
		[e, f, `${nameE}${nameF}`],
		[d, f, `${nameD}${nameF}`]
	] as const) {
		if (!traced(p, q)) {
			throw new TriangleAuthorError(
				`${label} : le côté [${side}] du modèle n’est pas tracé (l’élève compte les carreaux sur le modèle)`
			);
		}
	}
	const a = placed(nameA, 'commencer le triangle');
	if (near(a, d, tolerance(a, d))) {
		throw new TriangleAuthorError(
			`${label} : ${nameA} est sur ${nameD} : le triangle à tracer serait le modèle lui-même ; déplacer ${nameA}`
		);
	}
	const expectedB = add(a, sub(e, d));
	const c = add(a, sub(f, d));
	const sideGiven = points.has(nameB);
	if (sideGiven) {
		const b = placed(nameB, 'tracer un côté');
		if (!near(b, expectedB, tolerance(b, expectedB))) {
			throw new TriangleAuthorError(
				`${label} : [${nameA}${nameB}] n’est pas [${nameD}${nameE}] déplacé : placer ${nameB} en ${formatAt(expectedB)}`
			);
		}
		if (!traced(a, b)) {
			throw new TriangleAuthorError(
				`${label} : [${nameA}${nameB}] n’est pas tracé : le tracer (« ${nameA.toLowerCase()}${nameB.toLowerCase()} = segment(${nameA}, ${nameB}) ») ou retirer ${nameB} (l’élève trace alors les trois côtés)`
			);
		}
	} else if (window && !isInFrame(expectedB, window)) {
		throw new TriangleAuthorError(
			`${label} : le sommet ${nameB} attendu, en ${formatAt(expectedB)}, sort de la fenêtre`
		);
	}
	if (points.has(nameC)) {
		throw new TriangleAuthorError(`${label} : le point ${nameC} existe déjà dans la figure`);
	}
	if (window && !isInFrame(c, window)) {
		throw new TriangleAuthorError(
			`${label} : le sommet ${nameC} attendu, en ${formatAt(c)}, sort de la fenêtre`
		);
	}
	return { vertices: [a, expectedB, c], sideGiven };
}

export function assertCopy(
	check: CopyCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/** Les deux bouts d'un morceau fusionné */
function endsOf(piece: Carrier): [Position, Position] {
	const n = { x: -piece.u.y, y: piece.u.x };
	const at = (t: number) => ({
		x: t * piece.u.x + piece.c * n.x,
		y: t * piece.u.y + piece.c * n.y
	});
	return [at(piece.t0), at(piece.t1)];
}

/** Les trois côtés de PQR sont-ils couverts chacun par un morceau ? */
function isPresent(vertices: readonly Position[], pieces: readonly Carrier[], eps: number) {
	return vertices.every(
		(p, i) => coveringPiece({ a: p, b: vertices[(i + 1) % 3] }, pieces, eps) !== null
	);
}

/** Même triangle au déplacement, au retournement ou à la rotation près : mêmes longueurs */
function isCongruent(p: readonly Position[], q: readonly Position[], eps: number): boolean {
	const lengths = (v: readonly Position[]) =>
		v
			.map((x, i) => {
				const d = sub(x, v[(i + 1) % 3]);
				return Math.hypot(d.x, d.y);
			})
			.sort((s, t) => s - t);
	const [lp, lq] = [lengths(p), lengths(q)];
	return lp.every((l, i) => Math.abs(l - lq[i]) <= eps);
}

export function judgeCopy(
	check: CopyCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const { vertices, sideGiven } = settingOf(check, points, shapes);
	const [a, b, c] = vertices;
	const [nameA, nameB, nameC] = check.points;
	// Hors palette (un point placé) : réponse forgée
	if (objects.some((o) => o.kind !== 'segment')) return { status: 'incorrect' };
	const drawn: Segment[] = objects.flatMap((o) =>
		o.kind === 'segment' ? [{ a: { x: o.x1, y: o.y1 }, b: { x: o.x2, y: o.y2 } }] : []
	);
	const given: Segment[] = sideGiven ? [{ a, b }] : [];
	const all = [...given, ...drawn];
	const eps = tolerance(...vertices, ...all.flatMap((s) => [s.a, s.b]));
	const pieces = mergeSegments(all, eps);
	const incorrect = (feedback: string): ConstructionVerdict => ({ status: 'incorrect', feedback });
	if (isPresent(vertices, pieces, eps)) {
		const leftover = leftoverFeedback(vertices, pieces, eps);
		return leftover ? incorrect(leftover) : { status: 'correct' };
	}
	const ends = pieces
		.flatMap(endsOf)
		.filter((p, i, list) => !list.slice(0, i).some((q) => near(p, q, eps)));
	// Les triangles de l'élève : A (et B, forme 1) puis deux bouts de ses traits
	const triangles = sideGiven
		? ends.filter((p) => !near(p, a, eps) && !near(p, b, eps)).map((p) => [a, b, p])
		: ends.flatMap((p, i) =>
				ends.slice(i + 1).flatMap((q) => (near(p, a, eps) || near(q, a, eps) ? [] : [[a, p, q]]))
			);
	const closed = triangles.filter(
		(t) => Math.abs(cross(sub(t[1], t[0]), sub(t[2], t[0]))) > eps && isPresent(t, pieces, eps)
	);
	if (closed.some((t) => isCongruent(t, vertices, eps))) return incorrect(FLIPPED_COPY_FEEDBACK);
	if (closed.length > 0) {
		if (sideGiven) return incorrect(wrongCopyVertexFeedback(nameC, nameA));
		const hits = (target: Position) => closed[0].slice(1).some((p) => near(p, target, eps));
		if (hits(b)) return incorrect(wrongCopyVertexFeedback(nameC, nameA));
		if (hits(c)) return incorrect(wrongCopyVertexFeedback(nameB, nameA));
		return incorrect(wrongCopyVerticesFeedback(nameB, nameC, nameA));
	}
	if (!sideGiven) {
		const fromA = ends.some((p) => near(p, a, eps));
		return incorrect(fromA ? NOT_CLOSED_FEEDBACK : copyStartFeedback(nameA));
	}
	// Forme 1 sans triangle fermé : les messages du triangle à construire
	const baseLine = carrierOf({ a, b });
	const farEnds = (from: Position, other: Position) =>
		pieces.flatMap((piece) => {
			if (sameLine(piece, baseLine, eps)) return [];
			const [p, q] = endsOf(piece);
			const far = near(p, from, eps) ? q : near(q, from, eps) ? p : null;
			return far && !near(far, other, eps) ? [far] : [];
		});
	const fromA = farEnds(a, b);
	const fromB = farEnds(b, a);
	// Aucun côté parti de A ni de B (trait ailleurs, [AB] prolongé) : les deux côtés manquent
	if (fromA.length === 0 && fromB.length === 0) {
		return incorrect(missingSidesFeedback(nameA, nameB, nameC));
	}
	if (fromA.length === 0) return incorrect(missingSideFeedback(nameA, nameC));
	if (fromB.length === 0) return incorrect(missingSideFeedback(nameB, nameC));
	return incorrect(notJoinedFeedback(nameA, nameB, nameC));
}

/** La correction : les côtés à tracer ([AC] et [BC], ou les trois) ; rien si l'auteur s'est trompé */
export function copySolution(
	check: CopyCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): DrawnLine[] {
	let setting: CopySetting;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return [];
	}
	const [a, b, c] = setting.vertices;
	const line = (p: Position, q: Position): DrawnLine => ({
		kind: 'segment',
		x1: p.x,
		y1: p.y,
		x2: q.x,
		y2: q.y
	});
	return setting.sideGiven ? [line(a, c), line(b, c)] : [line(a, b), line(b, c), line(a, c)];
}

/** Ni arc, ni codage : les longueurs se comptent en carreaux */
export function copyCorrection(): TriangleCorrection {
	return { arcs: [], marks: [], angles: [], rightAngles: [], guides: [] };
}
