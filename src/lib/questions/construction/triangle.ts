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
 * (`docs/archive/wip/controles-figure-progress.md` § 13).
 *
 * Lot 7 (§ 21) : un angle donné (`CAB = 40`) se construit au rapporteur posé
 * en A sur [AB) ; la règle du sommet au repère porte le côté (« côté d'angle »,
 * `constructionOf`). Un côté et deux angles : C au croisement des deux côtés
 * d'angle ; deux côtés et l'angle compris : au croisement du côté d'angle et
 * du report. C est alors construit au sens de `constructionOf`.
 *
 * Triangle rectangle (chantier `cercle-triangle-rectangle`, n° 20, phase 0
 * validée le 2026-11-08) : `CAB = 90` se construit à l'équerre le long de (AB)
 * en A (pas au rapporteur) ; avec `AC = u`, C au croisement de la perpendiculaire
 * et du report piqué en A ; seul, C n'importe où sur la perpendiculaire. Sur
 * quadrillage, sans instrument : `AC = 3 carreaux` ([AB] sur une ligne) ou
 * `AC = AB` (oblique permise), C sur un nœud.
 *
 * Côté coté en cm (chantier `regle-graduee`, PR 4, § 4 du journal) :
 * `CAB = 90 ; AC = 4 cm`, papier uni. Palette Segment · Équerre · Règle graduée :
 * C sur la perpendiculaire construite, sur une graduation d'une règle posée avec
 * son 0 en A AVANT le premier côté qui arrive en C, à la longueur au mm près.
 *
 * @module questions/construction/triangle
 */

import {
	isRuledLength,
	isSquaresLength,
	rightAngleOf,
	type LengthUnit,
	type TriangleAngle,
	type TriangleCheck,
	type TriangleLength
} from '$lib/ubumark/types/construction';
import type { FigureStep } from '$lib/ubumark/types/figure';
import {
	degrees,
	protractorFits,
	protractorRadiusOf,
	protractorWindowError,
	type AngleCorrection
} from './angle';
import type { DrawnLine, DrawnObject, DrawnRegle, DrawnRepere } from './answer';
import {
	angleSideVertex,
	basePointsOf,
	constructionOf,
	distanceToTrait,
	intersectTraits,
	intersectionsOf,
	isBuiltMark,
	isInFrame,
	repereAt,
	rulerGraduationOf,
	traitOf,
	type Construction,
	type Trait
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import { tolerance } from './polygon';
import { formatLength, rulerLengthOf } from './segment-length';
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
export const sideEyeballedFeedback = (p: string, c: string) =>
	`Ton côté [${p}${c}] est tracé à l’œil : utilise l’équerre.`;
export const notRightFeedback = (vertex: string, base: string, grid: boolean) =>
	grid
		? `Ton angle en ${vertex} n’est pas droit.`
		: `Ton angle en ${vertex} n’est pas droit : trace la perpendiculaire à (${vertex}${base}) avec l’équerre.`;
export const vertexOffGraduationFeedback = (p: string, c: string) =>
	`Ton point ${c} est placé à l’œil : arrête [${p}${c}] sur une graduation de la règle.`;
export const wrongRuledLengthFeedback = (
	p: string,
	c: string,
	measured: number,
	expected: { length: number; unit: LengthUnit }
) =>
	`Ton côté [${p}${c}] mesure ${formatLength(measured, expected.unit)} au lieu de ${formatLength(expected.length, expected.unit)}.`;
const squaresText = (n: number) => `${n} carreau${n > 1 ? 'x' : ''}`;
export const wrongSquaresFeedback = (p: string, c: string, measured: number, expected: number) =>
	`Ton côté [${p}${c}] mesure ${squaresText(measured)} au lieu de ${expected}.`;

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

const isOnGrid = (value: number, step: number, eps: number) =>
	Math.abs(value / step - Math.round(value / step)) * step <= eps;
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
	const valueOf = (l: TriangleLength) =>
		isSquaresLength(l)
			? squaresText(l.squares)
			: isRuledLength(l)
				? formatLength(l.length, l.unit)
				: l.source.join('');
	const side = (l: TriangleLength) => `${l.side.join('')} = ${valueOf(l)}`;
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
	shapes: FigureShapes,
	[a, b]: [Position, Position],
	base: string
): number {
	const window = shapes.window;
	if (isSquaresLength(length)) {
		// N° 20 : le côté suit le quadrillage, perpendiculaire à [AB] qui suit une ligne
		const grid = shapes.grid as FigureStep;
		const eps = tolerance(a, b);
		if (Math.abs(a.y - b.y) <= eps) return length.squares * grid.y;
		if (Math.abs(a.x - b.x) <= eps) return length.squares * grid.x;
		throw new TriangleAuthorError(
			`${label} : [${base}] ne suit pas le quadrillage : donner la longueur par deux points (« ${length.side.join('')} = ${base} »)`
		);
	}
	if (isRuledLength(length)) {
		// PR 4 de `regle-graduee` : 1 unité = 1 cm (ADR 0036), la règle de l'écran au plus
		const cm = length.length / 10;
		const rulerLength = rulerLengthOf(window);
		if (cm > rulerLength) {
			throw new TriangleAuthorError(
				`${label} : [${length.side.join('')}] est plus long que la règle graduée (${rulerLength} cm) : raccourcir le côté ou agrandir la fenêtre`
			);
		}
		return cm;
	}
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
	const right = rightAngleOf(check);
	// N° 20 : seul le triangle rectangle se construit sur quadrillage
	if (shapes.grid && !right) {
		throw new TriangleAuthorError(`${label} : le triangle se construit sur papier uni`);
	}
	const [nameA, nameB, nameC] = check.points;
	const gesture = right
		? shapes.grid
			? 'tracer un côté'
			: 'poser l’équerre'
		: check.angles.length > 0
			? 'poser le rapporteur'
			: 'piquer le compas';
	const [a, b] = [nameA, nameB].map((name) => {
		const at = points.get(name);
		if (!at)
			throw new TriangleAuthorError(`${label} : le point ${name} n’existe pas dans la figure`);
		if (!shapes.visiblePoints.has(name)) {
			throw new TriangleAuthorError(
				`${label} : ${name} n’est pas visible (l’élève ne peut pas y ${gesture})`
			);
		}
		if (shapes.window && !isInFrame(at, shapes.window)) {
			throw new TriangleAuthorError(
				`${label} : ${name} est hors de la fenêtre (l’élève ne peut pas y ${gesture})`
			);
		}
		const grid = shapes.grid;
		const eps = tolerance(at);
		if (grid && !(isOnGrid(at.x, grid.x, eps) && isOnGrid(at.y, grid.y, eps))) {
			throw new TriangleAuthorError(`${label} : ${name} n’est pas sur un nœud du quadrillage`);
		}
		return at;
	});
	if (points.has(nameC)) {
		throw new TriangleAuthorError(`${label} : le point ${nameC} existe déjà dans la figure`);
	}
	const lengths = check.lengths.map((l) =>
		lengthOf(l, label, points, shapes, [a, b], `${nameA}${nameB}`)
	);
	if (check.angles.length > 0 && !right) {
		const windowError = protractorWindowError(shapes.window);
		if (windowError) throw new TriangleAuthorError(`${label} : ${windowError}`);
	}
	if (distance(a, b) <= tolerance(a, b)) {
		throw new TriangleAuthorError(`${label} : ${nameA} et ${nameB} sont au même endroit`);
	}
	const vertices = right
		? rightVertices(check, right, a, b, lengths)
		: verticesOf(check, a, b, lengths, shapes.window);
	return { a, b, lengths, vertices };
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

/** Triangle rectangle (n° 20) : le sommet de l'angle droit (V) et l'autre bout de [AB] (W) */
function rightEnds(
	check: TriangleCheck,
	right: TriangleAngle,
	a: Position,
	b: Position
): { v: Position; w: Position } {
	return right.vertex === check.points[0] ? { v: a, w: b } : { v: b, w: a };
}

/** Direction unitaire de la perpendiculaire à [AB] en V, du côté `sens` de (AB) (vu de A → B) */
function normalOf(a: Position, b: Position, sens: 1 | -1): Position {
	const d = distance(a, b);
	return { x: (-(b.y - a.y) / d) * sens + 0, y: ((b.x - a.x) / d) * sens + 0 };
}

/** Les C d'un triangle rectangle de côté donné : un de chaque côté de (AB), sur la perpendiculaire en V */
function rightVertices(
	check: TriangleCheck,
	right: TriangleAngle,
	a: Position,
	b: Position,
	lengths: number[]
): Vertex[] {
	if (lengths.length === 0) return [];
	const { v } = rightEnds(check, right, a, b);
	return ([1, -1] as const).map((sens) => {
		const n = normalOf(a, b, sens);
		return { at: { x: v.x + n.x * lengths[0], y: v.y + n.y * lengths[0] }, sens, fits: true };
	});
}

/** Quadrillage, angle droit seul : les nœuds de la fenêtre sur la perpendiculaire à [AB] en V (V exclu) */
function perpendicularNodes(
	a: Position,
	b: Position,
	v: Position,
	grid: FigureStep,
	window: NonNullable<FigureShapes['window']>
): Vertex[] {
	const nodes: Vertex[] = [];
	const n = normalOf(a, b, 1);
	for (let i = Math.ceil(window.xMin / grid.x - 1e-9); i * grid.x <= window.xMax + 1e-9; i++) {
		for (let j = Math.ceil(window.yMin / grid.y - 1e-9); j * grid.y <= window.yMax + 1e-9; j++) {
			const p = { x: i * grid.x, y: j * grid.y };
			const eps = tolerance(p, v);
			const cross = (p.x - v.x) * n.y - (p.y - v.y) * n.x;
			if (Math.abs(cross) > eps * distance(a, b) || near(p, v, eps)) continue;
			const sens = sideOf(a, b, p);
			if (sens !== 0) nodes.push({ at: p, sens, fits: true });
		}
	}
	return nodes;
}

/** Triangle rectangle : faisable ? Erreur d'AUTEUR sinon (C dans la fenêtre, sur un nœud du quadrillage) */
function assertRight(
	check: TriangleCheck,
	right: TriangleAngle,
	setting: TriangleSetting,
	shapes: FigureShapes
): void {
	const label = labelOf(check);
	const [nameA, nameB, nameC] = check.points;
	const { grid, window } = shapes;
	if (check.lengths.length === 0) {
		if (!grid && window) {
			const shown = aloneCandidates(check, right, setting, shapes, []);
			if (!shown.some((p) => isInFrame(p.at, window))) {
				throw new TriangleAuthorError(
					`${label} : la perpendiculaire à (${nameA}${nameB}) en ${right.vertex} sort de la fenêtre : éloigner ${right.vertex} du bord ou agrandir la fenêtre`
				);
			}
		}
		if (grid && window) {
			const { v } = rightEnds(check, right, setting.a, setting.b);
			if (perpendicularNodes(setting.a, setting.b, v, grid, window).length === 0) {
				throw new TriangleAuthorError(
					`${label} : aucun nœud du quadrillage sur la perpendiculaire à (${nameA}${nameB}) en ${right.vertex} dans la fenêtre : agrandir la fenêtre`
				);
			}
		}
		return;
	}
	const inFrame = setting.vertices.filter((p) => !window || isInFrame(p.at, window));
	if (inFrame.length === 0) {
		throw new TriangleAuthorError(
			`${label} : les deux sommets ${nameC} possibles sont hors de la fenêtre : agrandir la fenêtre`
		);
	}
	if (grid) {
		const onNode = inFrame.some(({ at }) => {
			const eps = tolerance(at);
			return isOnGrid(at.x, grid.x, eps) && isOnGrid(at.y, grid.y, eps);
		});
		if (!onNode) {
			throw new TriangleAuthorError(
				`${label} : le sommet ${nameC} ne tombe pas sur un nœud du quadrillage (l’élève ne peut pas le placer)`
			);
		}
	}
}

/** Les vérifications sont-elles faisables ? Erreur d'AUTEUR sinon */
export function assertTriangle(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	const label = labelOf(check);
	const setting = settingOf(check, points, shapes);
	const right = rightAngleOf(check);
	if (right) return assertRight(check, right, setting, shapes as FigureShapes);
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
		if (stuck.length === 0) {
			throw new TriangleAuthorError(
				`${label} : le rapporteur ne tient pas en ${a} et en ${b} du même côté de (${a}${b}) : éloigner [${a}${b}] du bord ou agrandir la fenêtre`
			);
		}
		const at = stuck.map((g) => g.vertex).join(' comme en ');
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

/**
 * Avec un angle donné : les croisements qui construisent C (§ 21) — deux côtés
 * d'angle partis l'un de A, l'autre de B ; ou, deux côtés et l'angle compris, le
 * côté d'angle et un cercle construit (report ou compas) centré au même sommet
 */
function angleCrossings(
	check: TriangleCheck,
	objects: readonly DrawnObject[],
	marks: readonly DrawnRepere[],
	construction: Construction,
	at: (name: string) => Position
): Position[] {
	const sidesFrom = (v: Position): Trait[] =>
		objects.flatMap((o, i): Trait[] => {
			if (!construction.built.has(i)) return [];
			const vertex = angleSideVertex(o, marks, construction);
			if (!vertex || !near(vertex, v, tolerance(v))) return [];
			const trait = traitOf(o);
			return trait ? [trait] : [];
		});
	const pairs = (left: Trait[], right: Trait[]) =>
		left.flatMap((p) => right.flatMap((q) => intersectTraits(p, q)));
	if (check.angles.length === 2) {
		return pairs(sidesFrom(at(check.angles[0].vertex)), sidesFrom(at(check.angles[1].vertex)));
	}
	const v = at(check.angles[0].vertex);
	const circles = constructedCircles(objects, construction).filter(
		(t) => t.kind === 'circle' && near(t.center, v, tolerance(v))
	);
	return pairs(sidesFrom(v), circles);
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
 * Les C de l'élève : extrémités communes d'un segment parti de A et d'un parti
 * de B ; sinon le verdict (côté manquant, côtés qui ne se rejoignent pas)
 */
function joinedVertices(
	check: TriangleCheck,
	a: Position,
	b: Position,
	objects: readonly DrawnObject[]
): { vertices: Position[] } | { verdict: ConstructionVerdict } {
	const [nameA, nameB, nameC] = check.points;
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
	const incorrect = (feedback: string) => ({ verdict: { status: 'incorrect' as const, feedback } });
	if (fromA.length === 0 && fromB.length === 0) {
		return incorrect(missingSidesFeedback(nameA, nameB, nameC));
	}
	if (fromA.length === 0) return incorrect(missingSideFeedback(nameA, nameC));
	if (fromB.length === 0) return incorrect(missingSideFeedback(nameB, nameC));
	const vertices = fromA.filter((p) => fromB.some((q) => near(p, q, eps)));
	if (vertices.length === 0) return incorrect(notJoinedFeedback(nameA, nameB, nameC));
	return { vertices };
}

/**
 * Triangle rectangle (n° 20). Papier uni : C sur une droite CONSTRUITE par V
 * (l'équerre), angle droit, puis (côté donné) au croisement de cette droite et
 * d'un cercle construit centré en V, à la bonne longueur. Quadrillage : angle
 * droit et longueur, de nœud en nœud. Juste si un C convient ; sinon le message
 * du C le plus avancé.
 */
function judgeRight(
	check: TriangleCheck,
	right: TriangleAngle,
	setting: TriangleSetting,
	points: ReadonlyMap<string, Position>,
	figure: FigureShapes,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const grid = figure.grid;
	const [length] = check.lengths;
	const ruled = length && isRuledLength(length) ? length : null;
	const allowed: readonly DrawnObject['kind'][] = grid
		? ['segment']
		: ruled
			? ['segment', 'droite', 'regle']
			: ['segment', 'droite', 'report'];
	// Hors palette (un point placé, un cercle au compas) : réponse forgée
	if (objects.some((o) => !allowed.includes(o.kind))) return { status: 'incorrect' };
	const joined = joinedVertices(check, setting.a, setting.b, objects);
	if ('verdict' in joined) return joined.verdict;
	const { v, w } = rightEnds(check, right, setting.a, setting.b);
	const nameC = check.points[2];
	const [expected] = setting.lengths;
	const rulerLength = rulerLengthOf(figure.window);
	let lines: Trait[] = [];
	let circles: Trait[] = [];
	if (!grid) {
		const construction = constructionOf(
			objects,
			basePointsOf(points, figure.segments),
			figure.traits
		);
		lines = objects.flatMap((o, i): Trait[] => {
			if (o.kind !== 'droite' || !construction.built.has(i)) return [];
			const trait = traitOf(o);
			return trait && distanceToTrait(v, trait) <= tolerance(v, w) ? [trait] : [];
		});
		circles = constructedCircles(objects, construction).filter(
			(t) => t.kind === 'circle' && near(t.center, v, tolerance(v))
		);
	}
	const verdictOf = (c: Position): { rank: number; feedback: string | null } => {
		const eps = tolerance(v, w, c);
		const carriers = lines.filter((t) => distanceToTrait(c, t) <= eps);
		if (!grid && carriers.length === 0) {
			return { rank: 0, feedback: sideEyeballedFeedback(right.vertex, nameC) };
		}
		if (Math.abs(angleBetween(v, w, c) - 90) > ANGLE_EPSILON) {
			return { rank: 1, feedback: notRightFeedback(right.vertex, right.base, Boolean(grid)) };
		}
		if (ruled) {
			const mm = ruledGraduationOf(c, v, objects, rulerLength);
			if (mm === null)
				return { rank: 2, feedback: vertexOffGraduationFeedback(right.vertex, nameC) };
			if (mm !== ruled.length) {
				return { rank: 3, feedback: wrongRuledLengthFeedback(right.vertex, nameC, mm, ruled) };
			}
			return { rank: 4, feedback: null };
		}
		if (!grid && length) {
			const crossed = carriers.some((t) =>
				circles.some((k) => intersectTraits(t, k).some((q) => near(q, c, tolerance(q, c))))
			);
			if (!crossed) return { rank: 2, feedback: vertexEyeballedFeedback(nameC) };
		}
		if (length && Math.abs(distance(v, c) - expected) > eps) {
			const feedback = isSquaresLength(length)
				? wrongSquaresFeedback(
						right.vertex,
						nameC,
						Math.round((distance(v, c) * length.squares) / expected),
						length.squares
					)
				: wrongLengthFeedback(right.vertex, nameC);
			return { rank: 3, feedback };
		}
		return { rank: 4, feedback: null };
	};
	const verdicts = joined.vertices.map(verdictOf);
	if (verdicts.some((x) => x.feedback === null)) return { status: 'correct' };
	const best = verdicts.reduce((p, q) => (q.rank > p.rank ? q : p));
	return { status: 'incorrect', feedback: best.feedback ?? undefined };
}

/**
 * Côté coté en cm (PR 4) : la graduation (mm, plus de 0) où est C, sur une règle
 * posée avec son 0 en V avant le premier côté qui arrive en C (comme le cercle de
 * #2494 : une règle posée après n'a pas guidé le trait) ; null sinon
 */
function ruledGraduationOf(
	c: Position,
	v: Position,
	objects: readonly DrawnObject[],
	rulerLength: number
): number | null {
	const reaches = (o: DrawnObject) =>
		o.kind === 'segment' &&
		[
			{ x: o.x1, y: o.y1 },
			{ x: o.x2, y: o.y2 }
		].some((p) => near(p, c, tolerance(p, c)));
	const first = objects.findIndex(reaches);
	const rulers = objects
		.slice(0, first < 0 ? objects.length : first)
		.filter(
			(o): o is DrawnRegle => o.kind === 'regle' && near({ x: o.ox, y: o.oy }, v, tolerance(v))
		);
	for (const ruler of rulers) {
		const mm = rulerGraduationOf(c, ruler, rulerLength);
		if (mm !== null && mm > 0) return mm;
	}
	return null;
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
	const setting = settingOf(check, points, shapes);
	const { a, b, lengths } = setting;
	const figure = shapes as FigureShapes;
	const right = rightAngleOf(check);
	if (right) return judgeRight(check, right, setting, points, figure, objects);
	const [nameA, nameB, nameC] = check.points;
	// Un point placé sans l'outil point : réponse forgée ; un cercle sans longueur donnée
	// (palette Rapporteur · Règle · Segment, revue de #2348) aussi
	if (objects.some((o) => o.kind === 'point')) return { status: 'incorrect' };
	const circles = objects.some((o) => o.kind === 'cercle' || o.kind === 'report');
	if (check.angles.length > 0 && check.lengths.length === 0 && circles) {
		return { status: 'incorrect' };
	}
	const joined = joinedVertices(check, a, b, objects);
	if ('verdict' in joined) return joined.verdict;
	const { vertices } = joined;
	const construction = constructionOf(
		objects,
		basePointsOf(points, figure.segments),
		figure.traits
	);
	const at = (name: string) => (name === nameA ? a : b);
	const marks = objects.filter(
		(o): o is DrawnRepere => o.kind === 'repere' && isBuiltMark(o, construction)
	);
	// Trois longueurs (lot 4) : C au croisement de deux cercles construits. Avec un angle
	// (lot 7, revue de #2348) : au croisement de ce que dit le § 21, deux côtés d'angle (un
	// depuis A, un depuis B), ou le côté d'angle et un cercle construit centré au même
	// sommet ; un point construit par les exceptions du § 15 ne suffit pas
	const crossings =
		check.angles.length === 0
			? intersectionsOf(constructedCircles(objects, construction))
			: angleCrossings(check, objects, marks, construction, at);
	const built = (p: Position) => crossings.some((q) => near(q, p, tolerance(q, p)));
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
		const angleErrors = check.angles.flatMap((g) => {
			const v = at(g.vertex);
			const measured = angleBetween(v, at(g.base), c);
			if (Math.abs(measured - g.measure) <= ANGLE_EPSILON) return [];
			const name = angleName(check, g);
			const sameSide = markSide(v) === sideOf(a, b, c);
			if (sameSide && Math.abs(measured - (180 - g.measure)) <= ANGLE_EPSILON) {
				return [wrongScaleAngleFeedback(name, measured, g.measure)];
			}
			return [wrongAngleTriangleFeedback(name, measured, g.measure)];
		});
		// Repères de part et d'autre de [AB] : seulement si un angle est faux (un repère
		// à 180 − a de l'autre côté, droite prolongée, donne un angle juste : revue de #2348)
		if (angleErrors.length > 0 && check.angles.length === 2) {
			const [sideA, sideB] = check.angles.map((g) => markSide(at(g.vertex)));
			if (sideA && sideB && sideA !== sideB) return oppositeAnglesFeedback(nameA, nameB);
		}
		if (angleErrors.length > 0) return angleErrors[0];
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
	// Les bouts de l'élève, sauf A et B (départs des côtés : ils ne disent pas où est C,
	// et tireraient la correction vers A ; revue du n° 20)
	const ends = drawn
		.flatMap((o) =>
			o.kind === 'segment'
				? [
						{ x: o.x1, y: o.y1 },
						{ x: o.x2, y: o.y2 }
					]
				: []
		)
		.filter((e) => !near(e, a, tolerance(e, a)) && !near(e, b, tolerance(e, b)));
	const right = rightAngleOf(check);
	const candidates =
		right && setting.lengths.length === 0
			? aloneCandidates(check, right, setting, shapes as FigureShapes, ends)
			: setting.vertices;
	const inFrame = candidates.filter((p) => !window || isInFrame(p.at, window));
	if (inFrame.length === 0) return [];
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

/**
 * Angle droit seul (n° 20) : les C que la correction peut montrer. Papier uni :
 * les bouts de l'élève ramenés sur la perpendiculaire, sinon à |AB| (ou |AB|/2)
 * de V ; quadrillage : les nœuds de la perpendiculaire. Sans tracé, le plus
 * proche du point à |AB| de V, du côté le plus haut.
 */
function aloneCandidates(
	check: TriangleCheck,
	right: TriangleAngle,
	setting: TriangleSetting,
	shapes: FigureShapes,
	ends: readonly Position[]
): Vertex[] {
	const { a, b } = setting;
	const { v } = rightEnds(check, right, a, b);
	const ab = distance(a, b);
	const at = (sens: 1 | -1, t: number): Vertex => {
		const n = normalOf(a, b, sens);
		return { at: { x: v.x + n.x * t, y: v.y + n.y * t }, sens, fits: true };
	};
	const { grid, window } = shapes;
	if (grid && window) {
		const nodes = perpendicularNodes(a, b, v, grid, window);
		if (ends.length > 0) return nodes;
		const target = [at(1, ab), at(-1, ab)].sort((p, q) => q.at.y - p.at.y)[0].at;
		return [...nodes].sort((p, q) => distance(p.at, target) - distance(q.at, target)).slice(0, 1);
	}
	const projected = ends.flatMap((e) =>
		([1, -1] as const).flatMap((sens) => {
			const n = normalOf(a, b, sens);
			const t = (e.x - v.x) * n.x + (e.y - v.y) * n.y;
			return t > tolerance(e, v) ? [at(sens, t)] : [];
		})
	);
	return [...projected, at(1, ab), at(-1, ab), at(1, ab / 2), at(-1, ab / 2)];
}

/** Correction, en plus des côtés : les arcs de report, le codage des longueurs et des angles */
export interface TriangleCorrection {
	/** Cercles centrés au bout de chaque côté donné, de sa longueur (traits fins) */
	arcs: { center: Position; radius: number }[];
	/** Marques de même longueur : `count` traits au milieu de chaque segment */
	marks: { from: Position; to: Position; count: number }[];
	/** Angles donnés (lot 7) : l'arc codé de leur mesure (l'angle droit à part) */
	angles: AngleCorrection[];
	/** Angle droit (n° 20) : le petit carré en `center`, entre [center from) et [center to) */
	rightAngles: { center: Position; from: Position; to: Position }[];
	/** Papier uni, triangle rectangle (n° 20) : la perpendiculaire à l'équerre, en trait fin */
	guides: DrawnLine[];
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
		if (isSquaresLength(length) || isRuledLength(length)) return null;
		if (length.source.length === 2) {
			const p = points.get(length.source[0]);
			const q = points.get(length.source[1]);
			return p && q ? [p, q] : null;
		}
		const line = shapes.lines.get(length.source[0]);
		return line ? [line.a, line.b] : null;
	};
	const keyOf = (l: TriangleLength) =>
		isSquaresLength(l) || isRuledLength(l) ? null : l.source.join();
	const same = check.lengths.length === 2 && keyOf(check.lengths[0]) === keyOf(check.lengths[1]);
	const marks: TriangleCorrection['marks'] = [];
	check.lengths.forEach((length, i) => {
		// En carreaux (n° 20) : rien à coder, la longueur se compte ; en cm (PR 4) : elle se lit
		if (isSquaresLength(length) || isRuledLength(length)) return;
		const count = same ? 1 : i + 1;
		marks.push({ from: at(length.side[0]), to: c, count });
		const source = sourceOf(length);
		if (source && !(same && i === 1)) marks.push({ from: source[0], to: source[1], count });
	});
	const right = rightAngleOf(check);
	const angles = check.angles.flatMap((g): AngleCorrection[] => {
		if (g.measure === 90) return [];
		const v = at(g.vertex);
		const w = at(g.base);
		const sens = sideOf(v, w, c) === -1 ? -1 : 1;
		return [{ center: v, from: w, to: c, measure: g.measure, sens }];
	});
	const rightAngles: TriangleCorrection['rightAngles'] = right
		? [{ center: at(right.vertex), from: at(right.base), to: c }]
		: [];
	// La perpendiculaire à l'équerre (papier uni) : de V, vers C
	const guides: DrawnLine[] =
		right && !shapes.grid
			? [{ kind: 'droite', x1: at(right.vertex).x, y1: at(right.vertex).y, x2: c.x, y2: c.y }]
			: [];
	// Arcs de report : papier uni, longueur prise sur la figure (pas en carreaux)
	const arcs = shapes.grid
		? []
		: check.lengths.flatMap((length, i) =>
				isSquaresLength(length) || isRuledLength(length)
					? []
					: [{ center: at(length.side[0]), radius: lengths[i] }]
			);
	return { arcs, marks, angles, rightAngles, guides };
}

/**
 * Côté coté en cm (PR 4 de `regle-graduee`) : la règle graduée de la correction,
 * posée en V (le sommet de l'angle droit), le long de la perpendiculaire, vers le
 * C de la correction ; null sinon
 */
export function triangleRuler(
	check: TriangleCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnRegle | null {
	const right = rightAngleOf(check);
	if (!right || !check.lengths.some(isRuledLength)) return null;
	const sides = triangleSolution(check, points, shapes, drawn);
	if (sides.length !== 2) return null;
	const v = points.get(right.vertex);
	if (!v) return null;
	const c = { x: sides[0].x2, y: sides[0].y2 };
	return { kind: 'regle', ox: v.x, oy: v.y, bx: c.x, by: c.y, sens: 1 };
}
