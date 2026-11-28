/**
 * Rectangle sans équerre (vérification `rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm`)
 * ======================================================================================
 *
 * Chantier `rectangle-sans-equerre` (point 4-038 du programme de 4e), phase 0
 * validée par David le 2026-11-17 (`docs/wip/rectangle-sans-equerre-progress.md`
 * § 3). La diagonale [AC] est tracée ; l'élève construit B et D au compas et à la
 * règle graduée, par les diagonales du rectangle (même milieu, même longueur) :
 * méthode de référence, B au croisement du cercle de diamètre [AC] et du compas
 * ouvert à AB en A, D à 6 cm de B sur la règle posée de B vers le milieu O.
 *
 * Le juge regarde le RÉSULTAT (décision 3) : B et D construits, ABCD rectangle
 * avec AB à la longueur donnée. Toute méthode juste passe. « Construit » étend
 * `constructionOf` par la règle graduée (§ 3.3) : un compas ouvert sur une
 * graduation d'une règle posée avant lui, son 0 au centre, est un trait construit ;
 * le bout d'un segment arrêté sur une graduation d'une règle posée avant lui, son
 * 0 sur un point construit et sa direction vers un point construit, est un point
 * construit. Les deux côtés de (AC) sont justes.
 *
 * Ordre des messages (§ 3.4) : réponse forgée ; aucun côté ; figure pas fermée ;
 * plusieurs rectangles ; B à l'œil ; [AB] faux ; angle en B ; D à l'œil ;
 * diagonales de longueurs différentes ; de milieux différents ; trait de trop,
 * trait qui dépasse (segments sur [AC], [BD] et la médiatrice de [AC] admis, Q3).
 *
 * @module questions/construction/diagonal-rectangle
 */

import type { DiagonalRectangleCheck, LengthUnit } from '#lib/ubumark/types/construction.ts';
import type { DrawnCircle, DrawnLine, DrawnObject, DrawnRegle } from './answer';
import { compassGraduationOf } from './circle';
import {
	basePointsOf,
	constructionOf,
	intersectionsOf,
	isInFrame,
	rulerGraduationOf,
	traitOf,
	type Trait
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import {
	EXTRA_SEGMENT_FEEDBACK,
	NOT_CLOSED_FEEDBACK,
	OVERSHOOT_FEEDBACK,
	carrierOf,
	coveringPiece,
	leftoverFeedback,
	mergeSegments,
	sameLine,
	tolerance,
	type Carrier,
	type Segment
} from './polygon';
import { formatLength, rulerLengthOf } from './segment-length';
import type { FigureShapes } from './symmetry';
import { wrongRuledLengthFeedback, type TriangleCorrection } from './triangle';

export const diagonalRectangleSidesFeedback = (names: readonly string[]) =>
	`Trace les côtés du rectangle ${names.join('')}.`;
export const severalDiagonalRectanglesFeedback = (names: readonly string[]) =>
	`Trace un seul rectangle ${names.join('')}.`;
export const vertexEyeballedRulerFeedback = (vertex: string) =>
	`Ton sommet ${vertex} est placé à l’œil : construis-le avec ton compas ou ta règle.`;
export const notExactSideFeedback = (
	p: string,
	q: string,
	expected: { length: number; unit: LengthUnit }
) =>
	`Ton côté [${p}${q}] ne mesure pas exactement ${formatLength(expected.length, expected.unit)}.`;
export const rightAngleOnCircleFeedback = (names: readonly string[]) => {
	const [a, b, c] = names;
	return `Ton angle ${a}${b}${c} n’est pas droit : ${b} doit être sur le cercle de diamètre [${a}${c}].`;
};
export const DIAGONALS_LENGTH_FEEDBACK =
	'Tes diagonales n’ont pas la même longueur : dans un rectangle, elles sont de même longueur.';
export const DIAGONALS_MIDDLE_FEEDBACK =
	'Tes diagonales n’ont pas le même milieu : dans un rectangle, elles se coupent en leur milieu.';

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class DiagonalRectangleAuthorError extends Error {}

/** Un des deux rectangles attendus : B d'un côté de (AC), D de l'autre */
interface Candidate {
	b: Position;
	d: Position;
}

/** Le cadre de la figure */
interface Setting {
	a: Position;
	c: Position;
	/** Milieu de [AC] */
	o: Position;
	/** Longueur de [AB] dans l'unité de la figure (1 unité = 1 cm, ADR 0036) */
	side: number;
	/** Longueur de [AC] dans l'unité de la figure */
	diagonal: number;
	/** Les rectangles attendus qui tiennent dans la fenêtre */
	candidates: Candidate[];
}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);
const near = (p: Position, q: Position, eps: number) => distance(p, q) <= eps;

function labelOf(check: DiagonalRectangleCheck): string {
	return `rectangle ${check.points.join('')}`;
}

/** Les deux rectangles ABCD de diagonale [AC] et de côté AB (B de chaque côté de (AC)) */
function rectanglesOf(a: Position, c: Position, side: number): Candidate[] {
	const ac = distance(a, c);
	const u = { x: (c.x - a.x) / ac, y: (c.y - a.y) / ac };
	const n = { x: -u.y, y: u.x };
	// Projeté de B sur (AC) à AB²/AC de A ; hauteur AB·BC/AC
	const along = (side * side) / ac;
	const height = Math.sqrt(Math.max(0, side * side - along * along));
	return ([1, -1] as const).map((sens) => {
		const b = {
			x: a.x + u.x * along + n.x * height * sens + 0,
			y: a.y + u.y * along + n.y * height * sens + 0
		};
		return { b, d: { x: a.x + c.x - b.x + 0, y: a.y + c.y - b.y + 0 } };
	});
}

function settingOf(
	check: DiagonalRectangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): Setting {
	const label = labelOf(check);
	const [nameA, nameB, nameC, nameD] = check.points;
	const a = points.get(nameA);
	const c = points.get(nameC);
	if (!a) {
		throw new DiagonalRectangleAuthorError(
			`${label} : le point ${nameA} n’existe pas dans la figure`
		);
	}
	if (!c) {
		throw new DiagonalRectangleAuthorError(
			`${label} : le point ${nameC} n’existe pas dans la figure`
		);
	}
	for (const name of [nameB, nameD]) {
		if (points.has(name)) {
			throw new DiagonalRectangleAuthorError(
				`${label} : ${name} est déjà un point de la figure (l’élève le construit : retirer ${name} de la figure)`
			);
		}
	}
	const ac = distance(a, c);
	if (ac <= tolerance(a, c)) {
		throw new DiagonalRectangleAuthorError(`${label} : ${nameA} et ${nameC} sont au même endroit`);
	}
	// Un segment de la figure de bouts A et C (ni une droite, ni un segment plus long)
	const eps = tolerance(a, c);
	const traced = (shapes?.segments ?? []).some(
		(s) => (near(s.a, a, eps) && near(s.b, c, eps)) || (near(s.a, c, eps) && near(s.b, a, eps))
	);
	if (!traced) {
		throw new DiagonalRectangleAuthorError(
			`${label} : la diagonale [${nameA}${nameC}] doit être tracée dans la figure (« d = segment(${nameA}, ${nameC}) »)`
		);
	}
	const { diagonal: written } = check;
	if (Math.abs(ac * 10 - written.length) > 1e-6) {
		throw new DiagonalRectangleAuthorError(
			`${label} : [${nameA}${nameC}] mesure ${formatLength(Math.round(ac * 10), written.unit)} dans la figure, pas ${formatLength(written.length, written.unit)} (1 unité = 1 cm)`
		);
	}
	const window = shapes?.window ?? null;
	if (!window) {
		throw new DiagonalRectangleAuthorError(`${label} : la fenêtre est exigée (fenetre: …)`);
	}
	const rulerLength = rulerLengthOf(window);
	if (ac > rulerLength + 1e-9) {
		throw new DiagonalRectangleAuthorError(
			`${label} : la diagonale [${nameA}${nameC}] est plus longue que la règle (${rulerLength} cm) : agrandir la fenêtre`
		);
	}
	const side = check.side.length / 10;
	const candidates = rectanglesOf(a, c, side).filter(
		({ b, d }) => isInFrame(b, window) && isInFrame(d, window)
	);
	if (candidates.length === 0) {
		throw new DiagonalRectangleAuthorError(
			`${label} : les sommets ${nameB} et ${nameD} sortent de la fenêtre des deux côtés de (${nameA}${nameC}) : agrandir la fenêtre`
		);
	}
	const o = { x: (a.x + c.x) / 2 + 0, y: (a.y + c.y) / 2 + 0 };
	return { a, c, o, side, diagonal: ac, candidates };
}

/** La vérification est-elle faisable ? Erreur d'AUTEUR sinon */
export function assertDiagonalRectangle(
	check: DiagonalRectangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/**
 * « Construit » au sens du § 3.3 : `constructionOf`, plus la règle graduée, de
 * proche en proche. Un compas ouvert sur une graduation d'une règle posée avant
 * lui (son 0 au centre construit) devient un trait construit ; le bout d'un
 * segment arrêté sur une graduation d'une règle posée avant lui, son 0 sur
 * l'autre bout (construit) et sa direction vers un point construit, devient un
 * point construit. Une règle posée à l'œil ne construit rien.
 */
function builtPredicate(
	objects: readonly DrawnObject[],
	base: readonly Position[],
	figureTraits: readonly Trait[],
	rulerLength: number
): (p: Position) => boolean {
	const extraPoints: Position[] = [];
	const extraTraits: Trait[] = [];
	const used = new Set<number>();
	const rulersBefore = (i: number) =>
		objects.slice(0, i).filter((o): o is DrawnRegle => o.kind === 'regle');
	for (;;) {
		const construction = constructionOf(
			objects,
			[...base, ...extraPoints],
			[...figureTraits, ...extraTraits]
		);
		const known = [...base, ...extraPoints, ...intersectionsOf(construction.traits)];
		/** La règle est-elle dirigée vers un point construit (autre que son 0) ? */
		const aimed = (ruler: DrawnRegle) => {
			const zero = { x: ruler.ox, y: ruler.oy };
			const length = Math.hypot(ruler.bx - ruler.ox, ruler.by - ruler.oy);
			const u = { x: (ruler.bx - ruler.ox) / length, y: (ruler.by - ruler.oy) / length };
			return known.some((k) => {
				const eps = tolerance(zero, k);
				const t = (k.x - zero.x) * u.x + (k.y - zero.y) * u.y;
				const off = Math.abs((k.x - zero.x) * u.y - (k.y - zero.y) * u.x);
				return t > eps && off <= eps;
			});
		};
		let grew = false;
		objects.forEach((object, i) => {
			if (used.has(i) || construction.built.has(i)) return;
			if (object.kind === 'cercle') {
				const center = { x: object.cx, y: object.cy };
				if (!construction.isBuilt(center)) return;
				if (compassGraduationOf(object, rulersBefore(i), rulerLength) === null) return;
				const trait = traitOf(object);
				if (!trait) return;
				extraTraits.push(trait);
				used.add(i);
				grew = true;
				return;
			}
			if (object.kind !== 'segment') return;
			// Un bout sur une graduation d'une règle posée avant le segment, quel que soit
			// l'autre bout (comme `ruledGraduationOf` du triangle) : [CD] arrêté sur la
			// règle posée de B vers O, ou [OD] après [BO]
			for (const end of [
				{ x: object.x1, y: object.y1 },
				{ x: object.x2, y: object.y2 }
			]) {
				if (construction.isBuilt(end)) continue;
				if (extraPoints.some((p) => near(p, end, tolerance(p, end)))) continue;
				const graduated = rulersBefore(i).some((ruler) => {
					if (!construction.isBuilt({ x: ruler.ox, y: ruler.oy })) return false;
					const mm = rulerGraduationOf(end, ruler, rulerLength);
					return mm !== null && mm > 0 && aimed(ruler);
				});
				if (!graduated) continue;
				extraPoints.push(end);
				grew = true;
			}
		});
		if (!grew) return construction.isBuilt;
	}
}

/** De quel côté de (AC) est p : +1, -1, 0 (sur la droite) */
function sideOf(setting: Setting, p: Position, eps: number): 1 | -1 | 0 {
	const { a, c } = setting;
	const h = ((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x)) / setting.diagonal;
	return h > eps ? 1 : h < -eps ? -1 : 0;
}

/** Le morceau est-il dans le segment [PQ] (sur sa droite, entre ses bouts) ? */
function within(piece: Carrier, p: Position, q: Position, eps: number): boolean {
	const s = carrierOf({ a: p, b: q });
	return sameLine(piece, s, eps) && piece.t0 >= s.t0 - eps && piece.t1 <= s.t1 + eps;
}

export function judgeDiagonalRectangle(
	check: DiagonalRectangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const setting = settingOf(check, points, shapes);
	const figure = shapes as FigureShapes;
	const names = check.points;
	const [nameA, nameB, , nameD] = names;
	const { a, c, o } = setting;
	// Hors palette (un point, un report, une droite, un repère) : réponse forgée
	if (objects.some((x) => x.kind !== 'segment' && x.kind !== 'cercle' && x.kind !== 'regle')) {
		return { status: 'incorrect' };
	}
	const incorrect = (feedback: string): ConstructionVerdict => ({ status: 'incorrect', feedback });
	const segments = objects.filter((x): x is DrawnLine => x.kind === 'segment');
	const drawn: Segment[] = segments.map((s) => ({
		a: { x: s.x1, y: s.y1 },
		b: { x: s.x2, y: s.y2 }
	}));
	const eps = tolerance(a, c, ...drawn.flatMap((s) => [s.a, s.b]));
	const pieces = mergeSegments(drawn, eps);

	// Les sommets possibles : bouts de segments hors de (AC)
	const vertices: Position[] = [];
	for (const p of drawn.flatMap((s) => [s.a, s.b])) {
		if (sideOf(setting, p, eps) === 0) continue;
		if (!vertices.some((v) => near(v, p, eps))) vertices.push(p);
	}
	const covered = (p: Position, q: Position) => coveringPiece({ a: p, b: q }, pieces, eps) !== null;
	const closed: [Position, Position][] = [];
	vertices.forEach((x, i) => {
		for (const y of vertices.slice(i + 1)) {
			if (sideOf(setting, x, eps) === sideOf(setting, y, eps)) continue;
			if (covered(a, x) && covered(x, c) && covered(c, y) && covered(y, a)) closed.push([x, y]);
		}
	});
	if (closed.length === 0) {
		// Un côté tracé : un segment qui part de A ou de C, hors de (AC)
		const atEnd = (p: Position) => near(p, a, eps) || near(p, c, eps);
		const side = drawn.some(
			(s) =>
				(atEnd(s.a) && sideOf(setting, s.b, eps) !== 0) ||
				(atEnd(s.b) && sideOf(setting, s.a, eps) !== 0)
		);
		return incorrect(side ? NOT_CLOSED_FEEDBACK : diagonalRectangleSidesFeedback(names));
	}
	if (closed.length > 1) return incorrect(severalDiagonalRectanglesFeedback(names));
	// B : le seul des deux sommets à la longueur donnée de A ; sinon celui que l'élève a
	// mesuré depuis A (compas piqué en A, ou règle posée en A) ; sinon le plus près de la
	// longueur donnée (l'autre est D)
	const [x, y] = closed[0];
	const fits = (p: Position) => Math.abs(distance(a, p) - setting.side) <= eps;
	const measured = (p: Position) =>
		objects.some((object) => {
			if (object.kind === 'cercle') {
				const center = { x: object.cx, y: object.cy };
				const radius = distance(center, { x: object.x, y: object.y });
				return near(center, a, eps) && Math.abs(distance(a, p) - radius) <= eps;
			}
			return (
				object.kind === 'regle' &&
				near({ x: object.ox, y: object.oy }, a, eps) &&
				rulerGraduationOf(p, object, rulerLengthOf(figure.window)) !== null
			);
		});
	const byLength =
		Math.abs(distance(a, x) - setting.side) <= Math.abs(distance(a, y) - setting.side);
	const [b, d] =
		fits(x) !== fits(y)
			? fits(x)
				? [x, y]
				: [y, x]
			: measured(x) !== measured(y)
				? measured(x)
					? [x, y]
					: [y, x]
				: byLength
					? [x, y]
					: [y, x];

	const isBuilt = builtPredicate(
		objects,
		basePointsOf(points, figure.segments),
		figure.traits,
		rulerLengthOf(figure.window)
	);
	if (!isBuilt(b)) return incorrect(vertexEyeballedRulerFeedback(nameB));
	const ab = distance(a, b);
	if (Math.abs(ab - setting.side) > eps) {
		const mm = Math.round(ab * 10);
		return incorrect(
			mm === check.side.length
				? notExactSideFeedback(nameA, nameB, check.side)
				: wrongRuledLengthFeedback(nameA, nameB, mm, check.side)
		);
	}
	if (Math.abs(distance(o, b) - setting.diagonal / 2) > eps) {
		return incorrect(rightAngleOnCircleFeedback(names));
	}
	if (!isBuilt(d)) return incorrect(vertexEyeballedRulerFeedback(nameD));
	if (Math.abs(distance(b, d) - setting.diagonal) > eps)
		return incorrect(DIAGONALS_LENGTH_FEEDBACK);
	if (!near({ x: (b.x + d.x) / 2, y: (b.y + d.y) / 2 }, o, eps)) {
		return incorrect(DIAGONALS_MIDDLE_FEEDBACK);
	}

	// Traits de construction (Q3) : segments sur [AC], sur [BD] et sur la médiatrice de [AC]
	const ac = carrierOf({ a, b: c });
	const bd = carrierOf({ a: b, b: d });
	const bisector = carrierOf({ a: o, b: { x: o.x - (c.y - a.y), y: o.y + (c.x - a.x) } });
	// La médiatrice ne va pas au-delà des croisements de deux cercles de même rayon,
	// l'un centré en A, l'autre en C (M4)
	const circles = objects.filter((x): x is DrawnCircle => x.kind === 'cercle');
	const radiusOf = (k: DrawnCircle) => distance({ x: k.cx, y: k.cy }, { x: k.x, y: k.y });
	const centeredAt = (p: Position) => circles.filter((k) => near({ x: k.cx, y: k.cy }, p, eps));
	const bisectorEnds = centeredAt(a).flatMap((ka) =>
		centeredAt(c)
			.filter((kc) => Math.abs(radiusOf(ka) - radiusOf(kc)) <= eps)
			.flatMap((kc) => {
				const crossings = intersectionsOf(
					[traitOf(ka), traitOf(kc)].filter((t): t is Trait => t !== null)
				);
				return crossings.length === 2 ? [crossings as [Position, Position]] : [];
			})
	);
	let overshoot = false;
	const rest = pieces.filter((piece) => {
		if (sameLine(piece, bisector, eps)) {
			if (bisectorEnds.length === 0) return true;
			if (!bisectorEnds.some(([p, q]) => within(piece, p, q, eps))) overshoot = true;
			return false;
		}
		for (const [diagonal, p, q] of [
			[ac, a, c],
			[bd, b, d]
		] as const) {
			if (!sameLine(piece, diagonal, eps)) continue;
			if (!within(piece, p, q, eps)) overshoot = true;
			return false;
		}
		return true;
	});
	const leftover = leftoverFeedback([a, b, c, d], rest, eps);
	if (leftover === EXTRA_SEGMENT_FEEDBACK) return incorrect(leftover);
	if (leftover || overshoot) return incorrect(OVERSHOOT_FEEDBACK);
	return { status: 'correct' };
}

/**
 * Le rectangle de la correction : celui dont B est le plus près d'un bout tracé
 * par l'élève, sinon celui dont B est le plus haut ; null si rien ne tient
 */
function solutionCandidate(
	check: DiagonalRectangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): { setting: Setting; chosen: Candidate } | null {
	let setting: Setting;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return null;
	}
	const ends = drawn.flatMap((o) =>
		o.kind === 'segment'
			? [
					{ x: o.x1, y: o.y1 },
					{ x: o.x2, y: o.y2 }
				]
			: []
	);
	const closest = (candidate: Candidate) => Math.min(...ends.map((p) => distance(p, candidate.b)));
	const sorted = [...setting.candidates].sort((p, q) =>
		ends.length > 0 ? closest(p) - closest(q) : q.b.y - p.b.y
	);
	const chosen = sorted[0];
	return chosen ? { setting, chosen } : null;
}

/** Le bon rectangle : [AB], [BC], [CD], [DA] */
export function diagonalRectangleSolution(
	check: DiagonalRectangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnLine[] {
	const found = solutionCandidate(check, points, shapes, drawn);
	if (!found) return [];
	const { a, c } = found.setting;
	const { b, d } = found.chosen;
	const seg = (p: Position, q: Position): DrawnLine => ({
		kind: 'segment',
		x1: p.x,
		y1: p.y,
		x2: q.x,
		y2: q.y
	});
	return [seg(a, b), seg(b, c), seg(c, d), seg(d, a)];
}

/**
 * Correction, en plus des côtés (Q4) : le cercle de diamètre [AC], l'arc de
 * centre A de rayon AB et la diagonale [BD], en traits fins ; ni règle ni codage
 */
export function diagonalRectangleCorrection(
	check: DiagonalRectangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): TriangleCorrection | null {
	const found = solutionCandidate(check, points, shapes, drawn);
	if (!found) return null;
	const { a, o, side, diagonal } = found.setting;
	const { b, d } = found.chosen;
	return {
		arcs: [
			{ center: o, radius: diagonal / 2 },
			{ center: a, radius: side }
		],
		marks: [],
		angles: [],
		rightAngles: [],
		guides: [{ kind: 'segment', x1: b.x, y1: b.y, x2: d.x, y2: d.y }]
	};
}
