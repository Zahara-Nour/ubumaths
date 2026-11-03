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
 * Lot 7 (§ 21) : un angle donné (`CAB = 40`) se construit au rapporteur posé
 * en A sur [AB) ; la règle du sommet au repère porte le côté (« côté d'angle »,
 * `constructionOf`). Un côté et deux angles : C au croisement des deux côtés
 * d'angle ; deux côtés et l'angle compris : au croisement du côté d'angle et
 * du report. C est alors construit au sens de `constructionOf`.
 *
 * @module questions/construction/triangle
 */

import type { TriangleAngle, TriangleCheck, TriangleLength } from '$lib/ubumark/types/construction';
import {
	degrees,
	protractorFits,
	protractorRadiusOf,
	protractorWindowError,
	type AngleCorrection
} from './angle';
import type { DrawnLine, DrawnObject, DrawnRepere } from './answer';
import {
	basePointsOf,
	constructionOf,
	intersectTraits,
	intersectionsOf,
	isBuiltMark,
	isInFrame,
	repereAt,
	traitOf,
	type Construction,
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
export const vertexEyeballedAnglesFeedback = (c: string) =>
	`Ton sommet ${c} est placé à l’œil : trace ses côtés avec le rapporteur.`;
export const oppositeAnglesFeedback = (a: string, b: string) =>
	`Tes deux angles sont tracés de part et d’autre de [${a}${b}] : trace-les du même côté.`;
export const wrongScaleAngleFeedback = (name: string, measured: number, expected: number) =>
	`Ton angle ${name} mesure ${degrees(measured)} au lieu de ${degrees(expected)} : tu as lu la mauvaise graduation du rapporteur.`;
export const wrongAngleTriangleFeedback = (name: string, measured: number, expected: number) =>
	`Ton angle ${name} mesure ${degrees(measured)} au lieu de ${degrees(expected)}.`;

/** Écart admis sur un angle (degrés) : un repère arrive exact, au calcul flottant près */
const ANGLE_EPSILON = 1e-6;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class TriangleAuthorError extends Error {}

/** Un C possible, et le côté de (AB) où il est : 1 à gauche de A → B */
interface Vertex {
	at: Position;
	sens: 1 | -1;
	/** Le rapporteur tient-il, de ce côté, à chaque sommet d'angle donné (règle du § 18) ? */
	fits: boolean;
}

/** Ce que l'auteur a écrit, calculé : sommets donnés, longueurs, les C possibles */
interface TriangleSetting {
	a: Position;
	b: Position;
	/** Une par longueur donnée, dans l'ordre de `check.lengths` */
	lengths: number[];
	/** Les C possibles (deux, un de chaque côté de (AB), sauf triangle impossible) */
	vertices: Vertex[];
}

const near = (p: Position, q: Position, eps: number) => Math.hypot(p.x - q.x, p.y - q.y) <= eps;
const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);

/** Le côté de (AB) où est `p` : 1 à gauche de A → B, -1 à droite, 0 dessus */
function sideOf(a: Position, b: Position, p: Position): 1 | -1 | 0 {
	const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
	if (Math.abs(cross) <= tolerance(a, b, p) * distance(a, b)) return 0;
	return cross > 0 ? 1 : -1;
}

/** Direction unitaire de [VW) tournée de `measure` degrés (sens trigonométrique si 1) */
function turned(v: Position, w: Position, measure: number, sens: 1 | -1): Position {
	const angle = Math.atan2(w.y - v.y, w.x - v.x) + (sens * measure * Math.PI) / 180;
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Angle (degrés, 0..180) entre [VW) et [VP) */
function angleBetween(v: Position, w: Position, p: Position): number {
	const u = { x: w.x - v.x, y: w.y - v.y };
	const t = { x: p.x - v.x, y: p.y - v.y };
	return (Math.atan2(Math.abs(u.x * t.y - u.y * t.x), u.x * t.x + u.y * t.y) * 180) / Math.PI;
}

/** Nom de l'angle donné : CAB en A, ABC en B */
function angleName(check: TriangleCheck, angle: TriangleAngle): string {
	const [nameA, , nameC] = check.points;
	return angle.vertex === nameA
		? `${nameC}${angle.vertex}${angle.base}`
		: `${angle.base}${angle.vertex}${nameC}`;
}

function labelOf(check: TriangleCheck): string {
	const [a, b, c] = check.points;
	const side = (l: TriangleLength) => `${l.side.join('')} = ${l.source.join('')}`;
	const data = [
		...check.lengths.map(side),
		...check.angles.map((g) => `${angleName(check, g)} = ${g.measure}`)
	];
	return `verifier: triangle ${a}${b}${c} : ${data.join(' ; ')}`;
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
	const lengths = check.lengths.map((l) => lengthOf(l, label, points, shapes));
	if (check.angles.length > 0) {
		const windowError = protractorWindowError(shapes.window);
		if (windowError) throw new TriangleAuthorError(`${label} : ${windowError}`);
	}
	if (distance(a, b) <= tolerance(a, b)) {
		throw new TriangleAuthorError(`${label} : ${nameA} et ${nameB} sont au même endroit`);
	}
	return { a, b, lengths, vertices: verticesOf(check, a, b, lengths, shapes.window) };
}

/**
 * Le rapporteur posé au sommet de l'angle `g`, base sur l'autre bout de [AB],
 * tient-il du côté `sens` de (AB) (vu de A → B ; c'est le côté -sens vu de B) ?
 */
function protractorFitsAt(
	check: TriangleCheck,
	g: TriangleAngle,
	sens: 1 | -1,
	a: Position,
	b: Position,
	window: FigureShapes['window']
): boolean {
	const [nameA] = check.points;
	const v = g.vertex === nameA ? a : b;
	const w = g.vertex === nameA ? b : a;
	const d = distance(v, w);
	const local = g.vertex === nameA ? sens : (-sens as 1 | -1);
	const u = { x: (w.x - v.x) / d, y: (w.y - v.y) / d };
	return protractorFits(v, u, local, protractorRadiusOf(window), window);
}

/** Les C possibles : un de chaque côté de (AB) (deux longueurs : les deux intersections) */
function verticesOf(
	check: TriangleCheck,
	a: Position,
	b: Position,
	lengths: number[],
	window: FigureShapes['window']
): Vertex[] {
	const [nameA] = check.points;
	const at = (name: string) => (name === nameA ? a : b);
	const fits = (sens: 1 | -1) =>
		check.angles.every((g) => protractorFitsAt(check, g, sens, a, b, window));
	const vertex = (p: Position): Vertex[] => {
		const sens = sideOf(a, b, p);
		return sens === 0 ? [] : [{ at: p, sens, fits: fits(sens) }];
	};
	if (check.angles.length === 0) {
		return intersectTraits(
			{ kind: 'circle', center: a, radius: lengths[0] },
			{ kind: 'circle', center: b, radius: lengths[1] }
		).flatMap(vertex);
	}
	return ([1, -1] as const).flatMap((sens) => {
		// Le côté d'angle en V : [VW) tourné vers le côté sens (vu de V)
		const rayOf = (g: TriangleAngle): Trait => {
			const v = at(g.vertex);
			const local = g.vertex === nameA ? sens : (-sens as 1 | -1);
			const d = turned(v, at(g.base), g.measure, local);
			return { kind: 'ray', a: v, b: { x: v.x + d.x, y: v.y + d.y } };
		};
		if (check.angles.length === 2) {
			return intersectTraits(rayOf(check.angles[0]), rayOf(check.angles[1])).flatMap(vertex);
		}
		// Deux côtés et l'angle compris : sur le côté d'angle, à la longueur donnée
		const ray = rayOf(check.angles[0]) as Extract<Trait, { a: Position }>;
		const length = lengths[0];
		const u = { x: ray.b.x - ray.a.x, y: ray.b.y - ray.a.y };
		return vertex({ x: ray.a.x + u.x * length, y: ray.a.y + u.y * length });
	});
}

/** Les vérifications sont-elles faisables ? Erreur d'AUTEUR sinon */
export function assertTriangle(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	const label = labelOf(check);
	const setting = settingOf(check, points, shapes);
	const { vertices } = setting;
	const [a, b, c] = check.points;
	if (check.angles.length === 0 && vertices.length < 2) {
		throw new TriangleAuthorError(
			`${label} : les longueurs ${a}${b}, ${a}${c} et ${b}${c} ne font pas un triangle (la plus grande n’est pas plus petite que la somme des deux autres)`
		);
	}
	const fitting = vertices.filter((v) => v.fits);
	if (fitting.length === 0) {
		// Le sommet où il ne tient d'aucun côté ; sinon (A d'un côté, B de l'autre) les deux
		const stuck = check.angles.filter((g) =>
			([1, -1] as const).every(
				(sens) => !protractorFitsAt(check, g, sens, setting.a, setting.b, shapes?.window ?? null)
			)
		);
		const at = (stuck.length > 0 ? stuck : check.angles).map((g) => g.vertex).join(' ou en ');
		throw new TriangleAuthorError(
			`${label} : le rapporteur posé en ${at} sort de la figure, d’un côté de (${a}${b}) comme de l’autre : éloigner [${a}${b}] du bord ou agrandir la fenêtre`
		);
	}
	const window = shapes?.window;
	if (window && !fitting.some((p) => isInFrame(p.at, window))) {
		throw new TriangleAuthorError(
			`${label} : les deux sommets ${c} possibles sont hors de la fenêtre : agrandir la fenêtre`
		);
	}
}

/**
 * Cercles CONSTRUITS de l'élève (compas ou report), de proche en proche
 * (`constructionOf`, décision de David du 2026-11-03, § 14) : un cercle ouvert à
 * l'œil n'en est pas un, même pile au bon rayon.
 */
function constructedCircles(objects: readonly DrawnObject[], construction: Construction): Trait[] {
	return objects.flatMap((o, i): Trait[] => {
		if (!construction.built.has(i) || (o.kind !== 'cercle' && o.kind !== 'report')) return [];
		const trait = traitOf(o);
		return trait ? [trait] : [];
	});
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
	const construction = constructionOf(
		objects,
		basePointsOf(points, figure.segments),
		figure.traits
	);
	// Trois longueurs (lot 4) : C au croisement de deux cercles construits ; avec un angle
	// (lot 7) : au croisement de deux traits construits (côtés d'angle, reports)
	const crossings = intersectionsOf(constructedCircles(objects, construction));
	const built = (p: Position) =>
		check.angles.length > 0
			? construction.isBuilt(p)
			: crossings.some((q) => near(q, p, tolerance(q, p)));
	const constructed = vertices.filter(built);
	if (constructed.length === 0) {
		return {
			status: 'incorrect',
			feedback:
				check.angles.length > 0
					? vertexEyeballedAnglesFeedback(nameC)
					: vertexEyeballedFeedback(nameC)
		};
	}
	const at = (name: string) => (name === nameA ? a : b);
	const marks = objects.filter(
		(o): o is DrawnRepere => o.kind === 'repere' && isBuiltMark(o, construction)
	);
	const feedbackOf = (c: Position): string | null => {
		// Le repère qui porte le côté [VC) : centré en V, dans la direction de C
		const markSide = (v: Position) => {
			const mark = marks.find((m) => {
				if (!near({ x: m.vx, y: m.vy }, v, tolerance(v))) return false;
				const p = repereAt(m);
				return sideOf(v, c, p) === 0;
			});
			return mark ? sideOf(a, b, repereAt(mark)) : null;
		};
		if (check.angles.length === 2) {
			const [sideA, sideB] = check.angles.map((g) => markSide(at(g.vertex)));
			if (sideA && sideB && sideA !== sideB) return oppositeAnglesFeedback(nameA, nameB);
		}
		for (const g of check.angles) {
			const v = at(g.vertex);
			const measured = angleBetween(v, at(g.base), c);
			if (Math.abs(measured - g.measure) <= ANGLE_EPSILON) continue;
			const name = angleName(check, g);
			const sameSide = markSide(v) === sideOf(a, b, c);
			if (sameSide && Math.abs(measured - (180 - g.measure)) <= ANGLE_EPSILON) {
				return wrongScaleAngleFeedback(name, measured, g.measure);
			}
			return wrongAngleTriangleFeedback(name, measured, g.measure);
		}
		const lengthEps = tolerance(a, b, c);
		for (const [i, length] of check.lengths.entries()) {
			const vertex = length.side[0];
			if (Math.abs(distance(at(vertex), c) - lengths[i]) > lengthEps) {
				return wrongLengthFeedback(vertex, nameC);
			}
		}
		return null;
	};
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
	const inFrame = setting.vertices.filter((p) => !window || isInFrame(p.at, window));
	if (inFrame.length === 0) return [];
	const ends = drawn.flatMap((o) =>
		o.kind === 'segment'
			? [
					{ x: o.x1, y: o.y1 },
					{ x: o.x2, y: o.y2 }
				]
			: []
	);
	// Sans tracé de l'élève : un côté où le rapporteur tient, puis le plus haut
	const score = (v: Vertex) =>
		ends.length === 0
			? (v.fits ? 0 : 1e9) - v.at.y
			: Math.min(...ends.map((e) => distance(e, v.at)));
	// À égalité au calcul flottant près (aucun bout du côté de C), le plus haut
	const c = [...inFrame].sort((p, q) => {
		const gap = score(p) - score(q);
		return Math.abs(gap) > tolerance(a, b, p.at, q.at) ? gap : q.at.y - p.at.y;
	})[0].at;
	return [
		{ kind: 'segment', x1: a.x, y1: a.y, x2: c.x, y2: c.y },
		{ kind: 'segment', x1: b.x, y1: b.y, x2: c.x, y2: c.y }
	];
}

/** Correction, en plus des côtés : les arcs de report, le codage des longueurs et des angles */
export interface TriangleCorrection {
	/** Cercles centrés au bout de chaque côté donné, de sa longueur (traits fins) */
	arcs: { center: Position; radius: number }[];
	/** Marques de même longueur : `count` traits au milieu de chaque segment */
	marks: { from: Position; to: Position; count: number }[];
	/** Angles donnés (lot 7) : l'arc codé de leur mesure */
	angles: AngleCorrection[];
}

/**
 * Arcs de report (centre A rayon AC, centre B rayon BC) et codage : la longueur
 * de [AC] et son segment donné d'une marque, celle de [BC] de deux (une seule
 * marque si les deux longueurs viennent du même segment) ; chaque angle donné,
 * son arc codé de sa mesure
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
	const at = (name: string) => (name === check.points[0] ? a : b);
	const sourceOf = (length: TriangleLength): [Position, Position] | null => {
		if (length.source.length === 2) {
			const p = points.get(length.source[0]);
			const q = points.get(length.source[1]);
			return p && q ? [p, q] : null;
		}
		const line = shapes.lines.get(length.source[0]);
		return line ? [line.a, line.b] : null;
	};
	const same =
		check.lengths.length === 2 && check.lengths[0].source.join() === check.lengths[1].source.join();
	const marks: TriangleCorrection['marks'] = [];
	check.lengths.forEach((length, i) => {
		const count = same ? 1 : i + 1;
		marks.push({ from: at(length.side[0]), to: c, count });
		const source = sourceOf(length);
		if (source && !(same && i === 1)) marks.push({ from: source[0], to: source[1], count });
	});
	const angles = check.angles.map((g): AngleCorrection => {
		const v = at(g.vertex);
		const w = at(g.base);
		const sens = sideOf(v, w, c) === -1 ? -1 : 1;
		return { center: v, from: w, to: c, measure: g.measure, sens };
	});
	return {
		arcs: check.lengths.map((length, i) => ({ center: at(length.side[0]), radius: lengths[i] })),
		marks,
		angles
	};
}
