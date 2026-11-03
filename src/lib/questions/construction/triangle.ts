/**
 * Triangle de trois longueurs (chantier `controles-figure`, lot 4)
 * ================================================================
 *
 * `verifier: triangle ABC : AC = u ; BC = v` : le côté [AB] est tracé, les
 * longueurs AC et BC sont données par des segments de la figure (ou deux
 * points visibles : `AC = AB`). L'élève reporte les longueurs au compas (outil
 * Report), puis trace [AC] et [BC] (outil segment) ; C = leur extrémité
 * commune, qui doit être CONSTRUITE : l'intersection de deux cercles
 * construits (centre, point de passage ou écartement du report pris sur des
 * points de la figure). Les deux C possibles, de part et d'autre de (AB), sont
 * justes. Phase 0 validée par David le 2026-11-03
 * (`docs/wip/controles-figure-progress.md` § 13).
 *
 * @module questions/construction/triangle
 */

import type { TriangleCheck, TriangleLength } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject } from './answer';
import {
	intersectTraits,
	intersectionsOf,
	isConstructed,
	isInFrame,
	type Trait
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import { tolerance } from './polygon';
import type { FigureShapes } from './symmetry';

export const missingSidesFeedback = (a: string, b: string, c: string) =>
	`Trace les côtés [${a}${c}] et [${b}${c}] du triangle.`;
export const missingSideFeedback = (p: string, c: string) => `Il manque le côté [${p}${c}].`;
export const notJoinedFeedback = (a: string, b: string, c: string) =>
	`Tes côtés [${a}${c}] et [${b}${c}] doivent se rejoindre en ${c}.`;
export const vertexEyeballedFeedback = (c: string) =>
	`Ton sommet ${c} est placé à l’œil : construis-le avec ton compas.`;
export const wrongLengthFeedback = (p: string, c: string) =>
	`Ton côté [${p}${c}] n’a pas la bonne longueur.`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class TriangleAuthorError extends Error {}

/** Ce que l'auteur a écrit, calculé : sommets donnés, longueurs, les deux C possibles */
interface TriangleSetting {
	a: Position;
	b: Position;
	/** AC puis BC */
	lengths: [number, number];
	/** Les C possibles (deux, sauf triangle aplati ou impossible) */
	vertices: Position[];
}

const near = (p: Position, q: Position, eps: number) => Math.hypot(p.x - q.x, p.y - q.y) <= eps;
const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);

function labelOf(check: TriangleCheck): string {
	const [a, b, c] = check.points;
	const side = (l: TriangleLength) => `${l.side.join('')} = ${l.source.join('')}`;
	return `verifier: triangle ${a}${b}${c} : ${check.lengths.map(side).join(' ; ')}`;
}

/** La longueur donnée et l'écartement qui la porte ; erreur d'auteur si on ne peut pas la reporter */
function lengthOf(
	length: TriangleLength,
	label: string,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes
): number {
	const window = shapes.window;
	if (length.source.length === 2) {
		const [p, q] = length.source.map((name) => {
			const at = points.get(name);
			if (!at)
				throw new TriangleAuthorError(`${label} : le point ${name} n’existe pas dans la figure`);
			if (!shapes.visiblePoints.has(name)) {
				throw new TriangleAuthorError(
					`${label} : ${name} n’est pas visible (l’élève ne peut pas y prendre l’écartement)`
				);
			}
			return at;
		});
		return distance(p, q);
	}
	const [name] = length.source;
	const line = shapes.lines.get(name);
	const isSegment = line && shapes.segments.some((s) => s.owner === line.owner);
	if (!line || !isSegment) {
		throw new TriangleAuthorError(`${label} : ${name} n’est pas un segment de la figure`);
	}
	if (!line.visible) {
		throw new TriangleAuthorError(
			`${label} : le segment ${name} n’est pas visible (l’élève ne peut pas reporter sa longueur)`
		);
	}
	if (window && (!isInFrame(line.a, window) || !isInFrame(line.b, window))) {
		throw new TriangleAuthorError(`${label} : le segment ${name} sort de la fenêtre`);
	}
	return distance(line.a, line.b);
}

/** Sommets donnés, longueurs et C possibles ; erreur d'AUTEUR si le triangle ne se construit pas */
function settingOf(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): TriangleSetting {
	const label = labelOf(check);
	if (!shapes) {
		throw new TriangleAuthorError(
			'Case « figure » : traits de la figure non fournis au juge (triangle)'
		);
	}
	if (shapes.grid) {
		throw new TriangleAuthorError(`${label} : le triangle se construit sur papier uni`);
	}
	const [nameA, nameB, nameC] = check.points;
	const [a, b] = [nameA, nameB].map((name) => {
		const at = points.get(name);
		if (!at)
			throw new TriangleAuthorError(`${label} : le point ${name} n’existe pas dans la figure`);
		if (!shapes.visiblePoints.has(name)) {
			throw new TriangleAuthorError(
				`${label} : ${name} n’est pas visible (l’élève ne peut pas y piquer le compas)`
			);
		}
		if (shapes.window && !isInFrame(at, shapes.window)) {
			throw new TriangleAuthorError(
				`${label} : ${name} est hors de la fenêtre (l’élève ne peut pas y piquer le compas)`
			);
		}
		return at;
	});
	if (points.has(nameC)) {
		throw new TriangleAuthorError(`${label} : le point ${nameC} existe déjà dans la figure`);
	}
	const lengths: [number, number] = [
		lengthOf(check.lengths[0], label, points, shapes),
		lengthOf(check.lengths[1], label, points, shapes)
	];
	const vertices = intersectTraits(
		{ kind: 'circle', center: a, radius: lengths[0] },
		{ kind: 'circle', center: b, radius: lengths[1] }
	);
	return { a, b, lengths, vertices };
}

/** Les vérifications sont-elles faisables ? Erreur d'AUTEUR sinon */
export function assertTriangle(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	const label = labelOf(check);
	const { vertices } = settingOf(check, points, shapes);
	const [a, b, c] = check.points;
	if (vertices.length < 2) {
		throw new TriangleAuthorError(
			`${label} : les longueurs ${a}${b}, ${a}${c} et ${b}${c} ne font pas un triangle (la plus grande n’est pas plus petite que la somme des deux autres)`
		);
	}
	const window = shapes?.window;
	if (window && !vertices.some((p) => isInFrame(p, window))) {
		throw new TriangleAuthorError(
			`${label} : les deux sommets ${c} possibles sont hors de la fenêtre : agrandir la fenêtre`
		);
	}
}

/**
 * Cercles CONSTRUITS de l'élève : compas piqué et ouvert sur des points construits
 * de la figure ; report piqué sur un point construit, écartement pris entre deux
 * points construits. Un cercle ouvert à l'œil n'en est pas un, même pile au bon rayon.
 */
function constructedCircles(
	objects: readonly DrawnObject[],
	base: readonly Position[],
	figureTraits: readonly Trait[]
): Trait[] {
	const built = (p: Position) => isConstructed(p, base, figureTraits);
	return objects.flatMap((o): Trait[] => {
		if (o.kind === 'cercle') {
			const center = { x: o.cx, y: o.cy };
			const through = { x: o.x, y: o.y };
			if (!built(center) || !built(through)) return [];
			return [{ kind: 'circle', center, radius: distance(center, through) }];
		}
		if (o.kind === 'report') {
			const center = { x: o.cx, y: o.cy };
			const ends = [
				{ x: o.ax, y: o.ay },
				{ x: o.bx, y: o.by }
			];
			if (!built(center) || !ends.every(built)) return [];
			return [{ kind: 'circle', center, radius: distance(ends[0], ends[1]) }];
		}
		return [];
	});
}

/** Points où l'élève peut piquer ou ouvrir le compas : points nommés et bouts des segments de la figure */
function basePoints(points: ReadonlyMap<string, Position>, shapes: FigureShapes): Position[] {
	return [...points.values(), ...shapes.segments.flatMap((s) => [s.a, s.b])];
}

/** L'autre bout d'un segment qui part de `from` (pas [AB] repassé), sinon null */
function farEnd(line: DrawnLine, from: Position, other: Position, eps: number): Position | null {
	const p = { x: line.x1, y: line.y1 };
	const q = { x: line.x2, y: line.y2 };
	const far = near(p, from, eps) ? q : near(q, from, eps) ? p : null;
	if (!far || near(far, other, eps)) return null;
	return far;
}

/**
 * Verdict : un côté [AC] (segment partant de A) et un côté [BC] (de B) qui se
 * rejoignent en un C construit, aux longueurs données. Plusieurs paires
 * possibles : juste si l'une convient ; sinon le message d'une paire au sommet
 * construit d'abord (l'essai le plus avancé). Cercles et droites : construction.
 */
export function judgeTriangle(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const { a, b, lengths } = settingOf(check, points, shapes);
	const figure = shapes as FigureShapes;
	const [nameA, nameB, nameC] = check.points;
	// Un point placé sans l'outil point : réponse forgée
	if (objects.some((o) => o.kind === 'point')) return { status: 'incorrect' };
	const segments = objects.filter((o): o is DrawnLine => o.kind === 'segment');
	const eps = tolerance(
		a,
		b,
		...segments.flatMap((s) => [
			{ x: s.x1, y: s.y1 },
			{ x: s.x2, y: s.y2 }
		])
	);
	const fromA = segments.flatMap((s) => farEnd(s, a, b, eps) ?? []);
	const fromB = segments.flatMap((s) => farEnd(s, b, a, eps) ?? []);
	if (fromA.length === 0 && fromB.length === 0) {
		return { status: 'incorrect', feedback: missingSidesFeedback(nameA, nameB, nameC) };
	}
	if (fromA.length === 0)
		return { status: 'incorrect', feedback: missingSideFeedback(nameA, nameC) };
	if (fromB.length === 0)
		return { status: 'incorrect', feedback: missingSideFeedback(nameB, nameC) };
	const vertices = fromA.filter((p) => fromB.some((q) => near(p, q, eps)));
	if (vertices.length === 0) {
		return { status: 'incorrect', feedback: notJoinedFeedback(nameA, nameB, nameC) };
	}
	const circles = constructedCircles(objects, basePoints(points, figure), figure.traits);
	const crossings = intersectionsOf(circles);
	const built = (c: Position) => crossings.some((p) => near(p, c, tolerance(p, c)));
	const feedbackOf = (c: Position): string | null => {
		const lengthEps = tolerance(a, b, c);
		if (Math.abs(distance(a, c) - lengths[0]) > lengthEps) return wrongLengthFeedback(nameA, nameC);
		if (Math.abs(distance(b, c) - lengths[1]) > lengthEps) return wrongLengthFeedback(nameB, nameC);
		return null;
	};
	const constructed = vertices.filter(built);
	if (constructed.length === 0) {
		return { status: 'incorrect', feedback: vertexEyeballedFeedback(nameC) };
	}
	const feedbacks = constructed.map(feedbackOf);
	if (feedbacks.includes(null)) return { status: 'correct' };
	return { status: 'incorrect', feedback: feedbacks[0] ?? undefined };
}

/**
 * La correction : [AC] et [BC] en segments, vers le C du côté où l'élève a
 * tracé (le C possible le plus proche d'un bout de ses segments), sinon le C
 * le plus haut dans la fenêtre. Rien si le triangle ne se construit pas.
 */
export function triangleSolution(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnLine[] {
	let setting: TriangleSetting;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return [];
	}
	const { a, b } = setting;
	const window = shapes?.window;
	const inFrame = setting.vertices.filter((p) => !window || isInFrame(p, window));
	if (inFrame.length === 0) return [];
	const ends = drawn.flatMap((o) =>
		o.kind === 'segment'
			? [
					{ x: o.x1, y: o.y1 },
					{ x: o.x2, y: o.y2 }
				]
			: []
	);
	const score = (c: Position) =>
		ends.length === 0 ? -c.y : Math.min(...ends.map((e) => distance(e, c)));
	// À égalité au calcul flottant près (aucun bout du côté de C), le plus haut
	const c = [...inFrame].sort((p, q) => {
		const gap = score(p) - score(q);
		return Math.abs(gap) > tolerance(a, b, p, q) ? gap : q.y - p.y;
	})[0];
	return [
		{ kind: 'segment', x1: a.x, y1: a.y, x2: c.x, y2: c.y },
		{ kind: 'segment', x1: b.x, y1: b.y, x2: c.x, y2: c.y }
	];
}

/** Correction, en plus des côtés : les arcs de report et le codage des longueurs */
export interface TriangleCorrection {
	/** Cercles de centre A et B, de rayon AC et BC (traits fins) */
	arcs: { center: Position; radius: number }[];
	/** Marques de même longueur : `count` traits au milieu de chaque segment */
	marks: { from: Position; to: Position; count: number }[];
}

/**
 * Arcs de report (centre A rayon AC, centre B rayon BC) et codage : la longueur
 * de [AC] et son segment donné d'une marque, celle de [BC] de deux (une seule
 * marque si les deux longueurs viennent du même segment)
 */
export function triangleCorrection(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): TriangleCorrection | null {
	const sides = triangleSolution(check, points, shapes, drawn);
	if (sides.length !== 2 || !shapes) return null;
	const { a, b, lengths } = settingOf(check, points, shapes);
	const c = { x: sides[0].x2, y: sides[0].y2 };
	const sourceOf = (length: TriangleLength): [Position, Position] | null => {
		if (length.source.length === 2) {
			const p = points.get(length.source[0]);
			const q = points.get(length.source[1]);
			return p && q ? [p, q] : null;
		}
		const line = shapes.lines.get(length.source[0]);
		return line ? [line.a, line.b] : null;
	};
	const same = check.lengths[0].source.join() === check.lengths[1].source.join();
	const marks: TriangleCorrection['marks'] = [];
	check.lengths.forEach((length, i) => {
		const count = same ? 1 : i + 1;
		const vertex = i === 0 ? a : b;
		marks.push({ from: vertex, to: c, count });
		const source = sourceOf(length);
		if (source && !(same && i === 1)) marks.push({ from: source[0], to: source[1], count });
	});
	return {
		arcs: [
			{ center: a, radius: lengths[0] },
			{ center: b, radius: lengths[1] }
		],
		marks
	};
}
