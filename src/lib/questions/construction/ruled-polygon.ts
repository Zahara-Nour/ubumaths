/**
 * Carré / rectangle cotés sur papier uni (vérifications `carre A ; B ; C ; D`,
 * `rectangle A ; B ; C ; D : BC = 3 cm`)
 * ============================================================================
 *
 * Chantier `regle-graduee`, PR 6 (`docs/wip/regle-graduee-progress.md` § 8 ;
 * décisions de David Q11, Q13, Q19, Q20). [AB] est tracé ; l'élève trace la
 * perpendiculaire à (AB) en B à l'équerre, pose la règle graduée avec son 0 en B,
 * arrête [BC] sur la graduation de la longueur ; de même en A pour D ; puis [CD].
 * D peut aussi être au croisement de la perpendiculaire en A et d'une droite
 * construite par C (la perpendiculaire à (BC) en C, Q20). Les deux côtés de (AB)
 * sont justes ; un seul carré (rectangle) à la fois.
 *
 * Ordre des messages : côté [BC] ou [AD] manquant ; figure pas fermée ; plusieurs
 * figures ; puis, pour C puis D : côté tracé à l'œil (sans l'équerre), angle non
 * droit, sommet hors graduation, mauvaise longueur (lue sur le trait VU depuis le
 * sommet, Q18) ; enfin trait de trop, trait qui dépasse (`polygon.ts`).
 *
 * @module questions/construction/ruled-polygon
 */

import type { RuledPolygonCheck } from '$lib/ubumark/types/construction';
import type { DrawnLine, DrawnObject, DrawnRegle } from './answer';
import {
	basePointsOf,
	constructionOf,
	distanceToTrait,
	isInFrame,
	traitOf,
	type Trait
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import {
	NOT_CLOSED_FEEDBACK,
	coveringPiece,
	leftoverFeedback,
	mergeSegments,
	tolerance,
	type Segment
} from './polygon';
import { SAME_DIRECTION, rulerLengthOf, seenSegments } from './segment-length';
import type { FigureShapes } from './symmetry';
import {
	missingSideFeedback,
	notRightFeedback,
	ruledGraduationOf,
	sideEyeballedFeedback,
	vertexOffGraduationFeedback,
	wrongRuledLengthFeedback,
	type TriangleCorrection
} from './triangle';

export const severalPolygonsFeedback = (
	kind: RuledPolygonCheck['kind'],
	names: readonly string[]
) => `Trace un seul ${kind === 'carre' ? 'carré' : 'rectangle'} ${names.join('')}.`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class RuledPolygonAuthorError extends Error {}

/** Le cadre de la figure, au calcul flottant près */
interface Setting {
	a: Position;
	b: Position;
	/** Unité perpendiculaire à (AB), quart de tour direct depuis A → B */
	n: Position;
	/** Longueur de [BC] (et de [AD]) en millimètres, dans l'unité de l'auteur */
	expected: { length: number; unit: 'cm' | 'cm-mm' | 'mm' };
	/** Longueur de [BC] dans l'unité de la figure (1 unité = 1 cm, ADR 0036) */
	height: number;
	/** Les figures attendues qui tiennent dans la fenêtre : sens (+1, -1), C, D */
	candidates: { sens: 1 | -1; c: Position; d: Position }[];
}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);
const near = (p: Position, q: Position, eps: number) => distance(p, q) <= eps;
const along = (p: Position, u: Position, k: number): Position => ({
	x: p.x + u.x * k + 0,
	y: p.y + u.y * k + 0
});

function labelOf(check: RuledPolygonCheck): string {
	const [a, b, c, d] = check.points;
	return check.kind === 'carre'
		? `carre ${a} ; ${b} ; ${c} ; ${d}`
		: `rectangle ${a} ; ${b} ; ${c} ; ${d}`;
}

function settingOf(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): Setting {
	const label = labelOf(check);
	const [nameA, nameB, nameC, nameD] = check.points;
	const a = points.get(nameA);
	const b = points.get(nameB);
	if (!a)
		throw new RuledPolygonAuthorError(`${label} : le point ${nameA} n’existe pas dans la figure`);
	if (!b)
		throw new RuledPolygonAuthorError(`${label} : le point ${nameB} n’existe pas dans la figure`);
	const ab = distance(a, b);
	if (ab <= tolerance(a, b)) {
		throw new RuledPolygonAuthorError(`${label} : ${nameA} et ${nameB} sont au même endroit`);
	}
	for (const name of [nameC, nameD]) {
		if (points.has(name)) {
			throw new RuledPolygonAuthorError(
				`${label} : ${name} est déjà un point de la figure (l’élève le construit : retirer ${name} de la figure)`
			);
		}
	}
	let expected: Setting['expected'];
	if (check.height) {
		expected = check.height;
	} else {
		// Carré : le côté est [AB], qui doit tomber sur une graduation du millimètre
		const mm = Math.round(ab * 10);
		if (Math.abs(ab * 10 - mm) > 1e-6) {
			throw new RuledPolygonAuthorError(
				`${label} : [${nameA}${nameB}] ne mesure pas un nombre entier de millimètres (1 unité = 1 cm)`
			);
		}
		expected = { length: mm, unit: 'cm' };
	}
	const height = expected.length / 10;
	const window = shapes?.window ?? null;
	if (!window) throw new RuledPolygonAuthorError(`${label} : la fenêtre est exigée (fenetre: …)`);
	const rulerLength = rulerLengthOf(window);
	if (height > rulerLength + 1e-9) {
		throw new RuledPolygonAuthorError(
			`${label} : [${nameB}${nameC}] est plus long que la règle (${rulerLength} cm) : agrandir la fenêtre ou raccourcir le côté`
		);
	}
	const n = { x: -(b.y - a.y) / ab + 0, y: (b.x - a.x) / ab + 0 };
	const candidates = ([1, -1] as const)
		.map((sens) => ({ sens, c: along(b, n, sens * height), d: along(a, n, sens * height) }))
		.filter(({ c, d }) => isInFrame(c, window) && isInFrame(d, window));
	if (candidates.length === 0) {
		throw new RuledPolygonAuthorError(
			`${label} : les sommets ${nameC} et ${nameD} sortent de la fenêtre des deux côtés de (${nameA}${nameB}) : agrandir la fenêtre`
		);
	}
	return { a, b, n, expected, height, candidates };
}

/** La vérification est-elle faisable ? Erreur d'AUTEUR sinon */
export function assertRuledPolygon(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/**
 * Les côtés vus depuis le sommet `v` (sauf [AB] repassé, vers `w`) : leurs bouts
 * candidats au 4e sommet (bouts de segments posés sur le trait vu) et le bout le
 * plus loin du trait vu qui les porte
 */
function sideEnds(
	segments: readonly DrawnLine[],
	v: Position,
	w: Position,
	eps: number
): { at: Position; end: Position }[] {
	const toW = { x: (w.x - v.x) / distance(v, w), y: (w.y - v.y) / distance(v, w) };
	// Deux côtés opposés depuis v (un carré de chaque côté de (AB)) sont deux côtés vus, pas
	// un trait qui passe par v comme pour le segment de longueur donnée : `throughA` ignoré
	const groups = seenSegments(segments, v, eps).filter(
		(g) => Math.acos(Math.min(1, g.direction.x * toW.x + g.direction.y * toW.y)) >= SAME_DIRECTION
	);
	const ends: { at: Position; end: Position }[] = [];
	for (const group of groups) {
		const reach = distance(v, group.end);
		const u = group.direction;
		for (const s of segments) {
			for (const p of [
				{ x: s.x1, y: s.y1 },
				{ x: s.x2, y: s.y2 }
			]) {
				const t = (p.x - v.x) * u.x + (p.y - v.y) * u.y;
				const off = Math.abs((p.x - v.x) * u.y - (p.y - v.y) * u.x);
				if (t <= eps || t > reach + eps || off > Math.max(eps, t * Math.sin(SAME_DIRECTION)))
					continue;
				if (!ends.some((e) => near(e.at, p, eps))) ends.push({ at: p, end: group.end });
			}
		}
	}
	return ends;
}

/** De quel côté de (AB) est p : +1 (sens de n), -1, 0 (sur la droite) */
function sideOf(setting: Setting, p: Position, eps: number): 1 | -1 | 0 {
	const h = (p.x - setting.a.x) * setting.n.x + (p.y - setting.a.y) * setting.n.y;
	return h > eps ? 1 : h < -eps ? -1 : 0;
}

/**
 * Verdict d'un sommet construit depuis `v` (B pour C, A pour D) : sur une droite
 * construite par v (l'équerre), angle droit, puis la graduation ; le message du
 * premier manque, null si le sommet est juste. `crossed` (Q20, D seulement) : D au
 * croisement de deux droites construites, sans règle en A.
 */
function vertexVerdict(
	setting: Setting,
	v: Position,
	w: Position,
	names: [string, string, string],
	corner: { at: Position; end: Position },
	lines: readonly Trait[],
	objects: readonly DrawnObject[],
	rulerLength: number,
	crossed: (p: Position) => boolean
): string | null {
	const [nameV, nameW, nameP] = names;
	const p = corner.at;
	const eps = tolerance(v, w, p);
	if (!lines.some((t) => distanceToTrait(v, t) <= eps && distanceToTrait(p, t) <= eps)) {
		return sideEyeballedFeedback(nameV, nameP);
	}
	const vw = { x: w.x - v.x, y: w.y - v.y };
	const vp = { x: p.x - v.x, y: p.y - v.y };
	if (Math.abs(vw.x * vp.x + vw.y * vp.y) > 1e-6 * distance(v, w) * distance(v, p)) {
		return notRightFeedback(nameV, nameW, false);
	}
	// Le trait vu depuis v (Q18) : un côté prolongé au-delà du sommet mesure ce qu'il montre
	const end = distance(v, corner.end) > distance(v, p) + eps ? corner.end : p;
	const mm = ruledGraduationOf(end, v, objects, rulerLength);
	if (mm === null) {
		if (end === p && crossed(p)) {
			const measured = Math.round(distance(v, p) * 10);
			return Math.abs(distance(v, p) - setting.height) <= eps
				? null
				: wrongRuledLengthFeedback(nameV, nameP, measured, setting.expected);
		}
		return vertexOffGraduationFeedback(nameV, nameP);
	}
	return mm === setting.expected.length
		? null
		: wrongRuledLengthFeedback(nameV, nameP, mm, setting.expected);
}

export function judgeRuledPolygon(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const setting = settingOf(check, points, shapes);
	const figure = shapes as FigureShapes;
	const [nameA, nameB, nameC, nameD] = check.points;
	const { a, b } = setting;
	// Hors palette (un point, un cercle au compas) : réponse forgée
	if (objects.some((o) => o.kind !== 'segment' && o.kind !== 'droite' && o.kind !== 'regle')) {
		return { status: 'incorrect' };
	}
	const segments = objects.filter((o): o is DrawnLine => o.kind === 'segment');
	const drawn: Segment[] = segments.map((s) => ({
		a: { x: s.x1, y: s.y1 },
		b: { x: s.x2, y: s.y2 }
	}));
	const eps = tolerance(a, b, ...drawn.flatMap((s) => [s.a, s.b]));
	const fromB = sideEnds(segments, b, a, eps);
	const fromA = sideEnds(segments, a, b, eps);
	if (fromB.length === 0)
		return { status: 'incorrect', feedback: missingSideFeedback(nameB, nameC) };
	if (fromA.length === 0)
		return { status: 'incorrect', feedback: missingSideFeedback(nameA, nameD) };

	// Figures fermées : un C vu depuis B, un D vu depuis A, du même côté de (AB), [CD] couvert
	const pieces = mergeSegments([{ a, b }, ...drawn], eps);
	const closed = fromB.flatMap((c) =>
		fromA
			.filter((d) => {
				const side = sideOf(setting, c.at, eps);
				return (
					side !== 0 &&
					sideOf(setting, d.at, eps) === side &&
					!near(c.at, d.at, eps) &&
					coveringPiece({ a: c.at, b: d.at }, pieces, eps) !== null
				);
			})
			.map((d) => ({ c, d }))
	);
	if (closed.length === 0) return { status: 'incorrect', feedback: NOT_CLOSED_FEEDBACK };
	if (closed.length > 1) {
		return { status: 'incorrect', feedback: severalPolygonsFeedback(check.kind, check.points) };
	}
	const [{ c, d }] = closed;

	// Droites construites (l'équerre) ; Q20 : C, une fois juste, devient un point construit
	const base = basePointsOf(points, figure.segments);
	const builtLines = (extra: readonly Position[]) => {
		const construction = constructionOf(objects, [...base, ...extra], figure.traits);
		return objects.flatMap((o, i): Trait[] => {
			if (o.kind !== 'droite' || !construction.built.has(i)) return [];
			const trait = traitOf(o);
			return trait ? [trait] : [];
		});
	};
	const lines = builtLines([]);
	const rulerLength = rulerLengthOf(figure.window);
	const cVerdict = vertexVerdict(
		setting,
		b,
		a,
		[nameB, nameA, nameC],
		c,
		lines,
		objects,
		rulerLength,
		() => false
	);
	if (cVerdict) return { status: 'incorrect', feedback: cVerdict };
	const withC = builtLines([c.at]);
	const crossed = (p: Position) => {
		const e = tolerance(p, c.at, a);
		const throughA = withC.filter((t) => distanceToTrait(a, t) <= e && distanceToTrait(p, t) <= e);
		const throughC = withC.filter(
			(t) => distanceToTrait(c.at, t) <= e && distanceToTrait(p, t) <= e
		);
		return (
			throughA.some((t) => !throughC.includes(t)) && throughC.some((t) => !throughA.includes(t))
		);
	};
	const dVerdict = vertexVerdict(
		setting,
		a,
		b,
		[nameA, nameB, nameD],
		d,
		withC,
		objects,
		rulerLength,
		crossed
	);
	if (dVerdict) return { status: 'incorrect', feedback: dVerdict };
	const feedback = leftoverFeedback([a, b, c.at, d.at], pieces, eps);
	return feedback ? { status: 'incorrect', feedback } : { status: 'correct' };
}

/**
 * La figure de la correction : du côté où l'élève a le plus tracé, sinon le plus
 * haut (parmi les côtés qui tiennent dans la fenêtre) ; null si rien ne tient
 */
function solutionCandidate(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): Setting['candidates'][number] | null {
	let setting: Setting;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return null;
	}
	const eps = tolerance(setting.a, setting.b);
	let weight = 0;
	for (const o of drawn) {
		if (o.kind !== 'segment') continue;
		const middle = { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 };
		weight += sideOf(setting, middle, eps) * Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
	}
	const preferred = weight > eps ? 1 : weight < -eps ? -1 : null;
	const sorted = [...setting.candidates].sort((p, q) =>
		preferred !== null
			? (p.sens === preferred ? -1 : 0) - (q.sens === preferred ? -1 : 0)
			: q.c.y + q.d.y - (p.c.y + p.d.y)
	);
	return sorted[0] ?? null;
}

/** La bonne figure : [BC], [CD], [DA] (sans [AB], déjà tracé) */
export function ruledPolygonSolution(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnLine[] {
	const chosen = solutionCandidate(check, points, shapes, drawn);
	const a = points.get(check.points[0]);
	const b = points.get(check.points[1]);
	if (!chosen || !a || !b) return [];
	const { c, d } = chosen;
	const seg = (p: Position, q: Position): DrawnLine => ({
		kind: 'segment',
		x1: p.x,
		y1: p.y,
		x2: q.x,
		y2: q.y
	});
	return [seg(b, c), seg(c, d), seg(d, a)];
}

/** Les règles de la correction : 0 en B vers C, 0 en A vers D */
export function ruledPolygonRulers(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): DrawnRegle[] {
	const chosen = solutionCandidate(check, points, shapes, drawn);
	const a = points.get(check.points[0]);
	const b = points.get(check.points[1]);
	if (!chosen || !a || !b) return [];
	return [
		{ kind: 'regle', ox: b.x, oy: b.y, bx: chosen.c.x, by: chosen.c.y, sens: 1 },
		{ kind: 'regle', ox: a.x, oy: a.y, bx: chosen.d.x, by: chosen.d.y, sens: 1 }
	];
}

/** Correction, en plus des côtés : les perpendiculaires à l'équerre et les deux angles droits */
export function ruledPolygonCorrection(
	check: RuledPolygonCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[]
): TriangleCorrection | null {
	const chosen = solutionCandidate(check, points, shapes, drawn);
	const a = points.get(check.points[0]);
	const b = points.get(check.points[1]);
	if (!chosen || !a || !b) return null;
	const { c, d } = chosen;
	return {
		arcs: [],
		marks: [],
		angles: [],
		rightAngles: [
			{ center: b, from: a, to: c },
			{ center: a, from: b, to: d }
		],
		guides: [
			{ kind: 'droite', x1: b.x, y1: b.y, x2: c.x, y2: c.y },
			{ kind: 'droite', x1: a.x, y1: a.y, x2: d.x, y2: d.y }
		]
	};
}
