/**
 * Droites à construire (vérification `droite`, chantier `controles-figure`, lot 3)
 * ================================================================================
 *
 * `droite m = mediatrice(A, B)` : une des droites tracées par l'élève (règle,
 * équerre) est la droite que l'expression du langage des figures donne ; les
 * autres droites et les cercles sont des traits de construction, ignorés
 * (décision de David, 2026-11-02, `docs/archive/wip/controles-figure-progress.md` § 9).
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
 * Outil n° 40 (chantier `outil-equerre-uni`, 2026-11-28) : `droite p =
 * perpendiculaire(A, d)` / `parallele(A, d)` sur papier uni, à l'équerre (le juge
 * reconnaissait déjà ce tracé, c'est la garde de l'auteur qui manquait). Messages,
 * aussi sur quadrillage : il manque la droite, l'une pour l'autre, bonne direction
 * mais pas par A, par A mais mauvaise direction.
 *
 * Outil n° 38 (même chantier) : avec la règle graduée dans `outils:` (papier uni),
 * la médiatrice se construit aussi en marquant le milieu sur une graduation de la
 * règle posée sur [AB] (0 en A ou en B), puis à l'équerre par ce point ; [AB] mesure
 * un nombre pair de millimètres (`rulerMidpointError`). Milieu posé à l'œil : son
 * message (`midpointEyeballedFeedback`).
 *
 * Pur : positions de la figure et droites attendues données par l'appelant
 * (registre `positions.ts`).
 *
 * @module questions/construction/line
 */

import {
	bissectriceOf,
	throughLineOf,
	type LineCheck,
	type ThroughLine
} from '#lib/ubumark/types/construction.ts';
import { isDrawnPoint, type DrawnLine, type DrawnObject, type DrawnRepere } from './answer';
import {
	angleSideVertex,
	basePointsOf,
	constructionOf,
	isInFrame,
	isOnRulerGraduation,
	isOnSomeTrait,
	isStraight,
	lineCrossesFrame,
	type Construction,
	type Trait
} from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import type { ExpectedLine, ExpectedPoints } from './point';
import { tolerance } from './polygon';
import { formatLength, rulerLengthOf } from './segment-length';
import type { FigureShapes } from './symmetry';

export const LINE_EYEBALLED_FEEDBACK =
	'Ta droite est tracée à l’œil : construis-la avec tes instruments.';
export const LINE_NOT_IN_PLACE_FEEDBACK = 'Ta droite n’est pas à sa place.';

export const lineMissingFeedback = (name: string) => `Trace la droite ${name}.`;

type ThroughKind = ThroughLine['kind'];
const throughWord = (kind: ThroughKind) =>
	kind === 'perpendiculaire' ? 'perpendiculaire' : 'parallèle';
export const throughLineMissingFeedback = (kind: ThroughKind, line: string, point: string) =>
	`Trace la ${throughWord(kind)} à (${line}) passant par ${point}.`;
export const notThroughPointFeedback = (kind: ThroughKind, line: string, point: string) =>
	`Ta droite est ${throughWord(kind)} à (${line}) mais ne passe pas par ${point}.`;
export const throughPointWrongDirectionFeedback = (
	kind: ThroughKind,
	line: string,
	point: string
) => `Ta droite passe par ${point} mais n’est pas ${throughWord(kind)} à (${line}).`;
/** L'une pour l'autre : `kind` est la droite DEMANDÉE */
export const swappedDirectionFeedback = (kind: ThroughKind, line: string) =>
	kind === 'perpendiculaire'
		? `Ta droite est parallèle à (${line}) : on demande la perpendiculaire.`
		: `Ta droite est perpendiculaire à (${line}) : on demande la parallèle.`;
export const mediatriceMissingFeedback = (a: string, b: string) =>
	`Trace la médiatrice de [${a}${b}].`;
export const notMidpointFeedback = (a: string, b: string) =>
	`Ta droite est perpendiculaire à [${a}${b}] mais ne passe pas par son milieu.`;
export const notPerpendicularToSegmentFeedback = (a: string, b: string) =>
	`Ta droite passe par le milieu de [${a}${b}] mais n’est pas perpendiculaire à [${a}${b}].`;
export const notMediatriceFeedback = (a: string, b: string) =>
	`Ce n’est pas la médiatrice de [${a}${b}].`;
/** Outil n° 38 : le milieu marqué ailleurs que sur une graduation de la règle bien posée */
export const midpointEyeballedFeedback = (a: string, b: string) =>
	`Ton milieu est placé à l’œil : pose la règle sur [${a}${b}] et marque-le sur une graduation.`;

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

/** Directions parallèles (relatif : produit vectoriel nul au calcul flottant près) */
function isParallel(u: Position, v: Position): boolean {
	return Math.abs(cross(u, v)) <= 1e-9 * Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
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
 * Outil n° 38 : le milieu se marque-t-il à la règle graduée ? Papier uni avec la
 * règle dans la palette de l'auteur (`shapes.tools`) ; sinon les graduations ne
 * construisent rien
 */
export function usesRulerMidpoint(shapes: FigureShapes | undefined): boolean {
	return Boolean(shapes && !shapes.grid && shapes.tools?.includes('regle'));
}

/**
 * Outil n° 38 : le milieu de [AB] tombe-t-il sur une graduation du millimètre ?
 * [AB] mesure un nombre pair de millimètres et tient sur la règle (sa longueur,
 * `rulerLengthOf`). Sert aussi au milieu (`point.ts`). Le message, ou null.
 */
export function rulerMidpointError(
	names: [string, string],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes
): string | null {
	const a = points.get(names[0]);
	const b = points.get(names[1]);
	if (!a || !b) return null;
	const [p, q] = names;
	const length = Math.hypot(b.x - a.x, b.y - a.y);
	const mm = Math.round(length * 10);
	const rulerLength = rulerLengthOf(shapes.window);
	if (Math.abs(length * 10 - mm) > 1e-6 * Math.max(1, mm) || mm % 2 !== 0) {
		const shown = `${String(Math.round(length * 1000) / 1000).replace('.', ',')} cm`;
		return `à la règle graduée, [${p}${q}] doit mesurer un nombre pair de millimètres (son milieu tombe alors sur une graduation) ; il mesure ${shown}`;
	}
	if (length > rulerLength + 1e-9) {
		return `[${p}${q}] (${formatLength(mm, 'cm')}) est plus long que la règle (${rulerLength} cm) : agrandir la fenêtre ou raccourcir [${p}${q}]`;
	}
	return null;
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
 * Perpendiculaire ou parallèle par un point (outil n° 40) : la parallèle par un
 * point de (d) est (d) elle-même ; sur papier uni, (d) tracée (l'équerre s'y
 * pose), A visible dans la fenêtre (l'équerre y glisse), au moins 2 unités de
 * droite dans la fenêtre. Le message, ou null.
 */
function throughLineSupportError(
	through: ThroughLine,
	target: ExpectedLine,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes
): string | null {
	const { point, line } = through;
	const guide = shapes.lines.get(line);
	const a = points.get(point);
	if (through.kind === 'parallele' && guide && a && isOnLine(a, guide)) {
		return `${point} est sur ${line} : la parallèle à ${line} par ${point} est ${line} elle-même`;
	}
	if (shapes.grid) return null;
	if (!guide || !guide.visible) {
		return `${line} n’est pas tracée (l’élève ne peut pas y poser l’équerre)`;
	}
	if (!shapes.visiblePoints.has(point)) {
		return `${point} n’est pas visible (l’élève ne peut pas y glisser l’équerre)`;
	}
	if (!a || !shapes.window) return null;
	if (!isInFrame(a, shapes.window)) return `${point} est hors de la fenêtre`;
	const u = sub(target.b, target.a);
	const length = Math.hypot(u.x, u.y);
	if (length === 0) return null;
	const room = roomInFrame(a, { x: u.x / length, y: u.y / length }, shapes.window);
	if (room >= MEDIATRICE_MIN_ROOM) return null;
	return `la droite attendue n’a pas ${MEDIATRICE_MIN_ROOM} unités dans la fenêtre (l’élève ne peut pas la tracer) : agrandir la fenêtre ou déplacer ${point}`;
}

/**
 * Les droites sont-elles faisables ? Erreur d'AUTEUR sinon : expression qui ne
 * se calcule pas ou ne donne pas une droite, droite hors de la fenêtre, deux
 * vérifications pour la même droite ; sur quadrillage, droite qui ne passe pas
 * par deux nœuds ; sur papier uni, autre chose qu'une médiatrice, une
 * bissectrice, une perpendiculaire ou une parallèle par un point (outil n° 40),
 * ou qui ne se construit pas dans la fenêtre
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
		const through = throughLineOf(check.expression);
		if (through) {
			const message = throughLineSupportError(through, line, points, shapes);
			if (message) throw new LineAuthorError(`${label} : ${message}`);
			if (!shapes.grid) continue;
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
				`${label} : sans quadrillage, seulement une médiatrice (mediatrice(A, B)), une bissectrice (bissectrice(A, O, B)), une perpendiculaire (perpendiculaire(A, d)) ou une parallèle (parallele(A, d)) ; sinon ajouter « grille: 1 »`
			);
		}
		const message =
			mediatriceSupportError(mediatrice, points, shapes) ??
			(usesRulerMidpoint(shapes) ? rulerMidpointError(mediatrice, points, shapes) : null);
		if (message) throw new LineAuthorError(`${label} : ${message}`);
	}
}

/**
 * Outil n° 38 : la droite passe-t-elle par un point posé par l'élève qui n'est ni
 * un point de départ ni sur une graduation de la règle bien posée ? (Pas
 * `isBuilt` : le point posé sur [AB] devient le croisement de [AB] et de la droite
 * d'équerre tracée par lui.)
 */
function throughEyeballedPoint(
	line: DrawnLine,
	objects: readonly DrawnObject[],
	construction: Construction,
	base: readonly Position[],
	rulerLength: number,
	segment: ExpectedLine
): boolean {
	const [p, q] = ends(line);
	return objects.some((o) => {
		if (!isDrawnPoint(o)) return false;
		const at = { x: o.x, y: o.y };
		// Le milieu essayé : un point posé sur la droite de l'élève ET sur (AB) (revue)
		if (!isOnLine(at, { a: p, b: q }) || !isOnLine(at, segment)) return false;
		const eps = tolerance(at);
		if (base.some((b) => Math.hypot(b.x - at.x, b.y - at.y) <= eps)) return false;
		return !isOnRulerGraduation(at, objects, construction, rulerLength);
	});
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
	// Outil n° 38 : la règle graduée posée et le milieu marqué, pour une médiatrice seulement
	const withRuler =
		usesRulerMidpoint(shapes) && checks.some((check) => mediatriceOf(check.expression) !== null);
	// Le Report (lot 9) : un trait de construction, comme un cercle ; le repère du
	// rapporteur, pour une bissectrice seulement (§ 25)
	const allowed = (o: DrawnObject) =>
		o.kind === 'droite' ||
		o.kind === 'cercle' ||
		o.kind === 'report' ||
		(withBissectrice && o.kind === 'repere') ||
		(withRuler && (o.kind === 'regle' || o.kind === 'point'));
	if (!objects.every(allowed)) return { status: 'incorrect' };
	const figureTraits = shapes?.traits ?? [];
	// Papier uni : droite construite de proche en proche (décision de David, 2026-11-03, § 14) ;
	// l'exception 4 (§ 25) pour la bissectrice seulement
	const construction =
		shapes && !shapes.grid
			? constructionOf(objects, basePointsOf(points, shapes.segments), figureTraits, {
					arcsOnSides: withBissectrice,
					...(withRuler && { rulerLength: rulerLengthOf(shapes.window) })
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
		const through = throughLineOf(check.expression);
		if (through) {
			const free = lineIndexes.filter((i) => !taken.has(i));
			// Une droite qui recouvre celle d'une AUTRE vérification n'est pas l'essai de celle-ci
			const others = checks
				.filter((other) => other !== check)
				.map((other) => expectedOf(other, expected));
			const verdict = judgeThroughLine(through, target, points, objects, free, built, {
				guide: shapes?.lines.get(through.line) ?? null,
				figureTraits,
				others
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
		// Outil n° 38 : la droite passe par un point posé qui n'est pas construit (pas sur une
		// graduation de la règle bien posée) : c'est le milieu qui est à l'œil
		if (
			withRuler &&
			mediatrice &&
			a &&
			b &&
			construction &&
			shapes &&
			throughEyeballedPoint(
				objects[shown] as DrawnLine,
				objects,
				construction,
				basePointsOf(points, shapes.segments),
				rulerLengthOf(shapes.window),
				{ a, b }
			)
		) {
			return { status: 'incorrect', feedback: midpointEyeballedFeedback(...mediatrice) };
		}
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

/**
 * Perpendiculaire ou parallèle par un point (outil n° 40) : l'indice de la droite
 * de l'élève retenue, ou le verdict faux et sa cause, lue sur la DERNIÈRE droite
 * tracée (les précédentes sont souvent des traits de construction : la
 * perpendiculaire intermédiaire de la parallèle). Une droite qui repasse un trait
 * de la figure ((d) elle-même) ou la droite d'une autre vérification n'est pas un
 * essai (revue de l'outil n° 40).
 */
function judgeThroughLine(
	through: ThroughLine,
	target: ExpectedLine,
	points: ReadonlyMap<string, Position>,
	objects: readonly DrawnObject[],
	free: readonly number[],
	built: (i: number) => boolean,
	context: {
		guide: ExpectedLine | null;
		figureTraits: readonly Trait[];
		others: readonly ExpectedLine[];
	}
): number | ConstructionVerdict {
	const { kind, point, line: name } = through;
	const line = (i: number) => objects[i] as DrawnLine;
	const covering = free.filter((i) => coincides(line(i), target));
	const good = covering.find(built);
	if (good !== undefined) return good;
	if (covering.length > 0) return { status: 'incorrect', feedback: LINE_EYEBALLED_FEEDBACK };
	const retraces = (i: number) => {
		const [p, q] = ends(line(i));
		return context.figureTraits.some(
			(t) => isStraight(t) && isOnLine(t.a, { a: p, b: q }) && isOnLine(t.b, { a: p, b: q })
		);
	};
	const own = free.filter(
		(i) => !retraces(i) && !context.others.some((other) => coincides(line(i), other))
	);
	if (own.length === 0) {
		return { status: 'incorrect', feedback: throughLineMissingFeedback(kind, name, point) };
	}
	const shown = own[own.length - 1];
	if (!built(shown)) return { status: 'incorrect', feedback: LINE_EYEBALLED_FEEDBACK };
	const a = points.get(point);
	const { guide } = context;
	if (!a || !guide) return { status: 'incorrect', feedback: LINE_NOT_IN_PLACE_FEEDBACK };
	const [p, q] = ends(line(shown));
	const v = sub(q, p);
	const u = sub(guide.b, guide.a);
	const perpendicular = isPerpendicular(v, u);
	const parallel = isParallel(v, u);
	const wanted = kind === 'perpendiculaire' ? perpendicular : parallel;
	const swapped = kind === 'perpendiculaire' ? parallel : perpendicular;
	if (swapped) return { status: 'incorrect', feedback: swappedDirectionFeedback(kind, name) };
	if (wanted) return { status: 'incorrect', feedback: notThroughPointFeedback(kind, name, point) };
	if (isOnLine(a, { a: p, b: q })) {
		return {
			status: 'incorrect',
			feedback: throughPointWrongDirectionFeedback(kind, name, point)
		};
	}
	return { status: 'incorrect', feedback: LINE_NOT_IN_PLACE_FEEDBACK };
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

/**
 * Correction d'une perpendiculaire ou d'une parallèle par un point (outil n° 40,
 * décision 4) : l'angle droit codé au pied sur (d) ; pour la parallèle, la
 * perpendiculaire à (d) par A en trait fin, et son angle droit en A aussi
 */
export interface ThroughLineCorrection {
	guides: DrawnLine[];
	/** Le petit carré en `center`, entre [center from) et [center to) */
	rightAngles: { center: Position; from: Position; to: Position }[];
}

export function throughLineCorrections(
	checks: readonly LineCheck[],
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): ThroughLineCorrection[] {
	return checks.flatMap((check): ThroughLineCorrection[] => {
		const through = throughLineOf(check.expression);
		if (!through) return [];
		const a = points.get(through.point);
		const guide = shapes?.lines.get(through.line);
		if (!a || !guide) return [];
		const u = sub(guide.b, guide.a);
		const length2 = dot(u, u);
		if (length2 === 0) return [];
		const t = dot(sub(a, guide.a), u) / length2;
		const foot = { x: guide.a.x + t * u.x + 0, y: guide.a.y + t * u.y + 0 };
		const normal = { x: -u.y, y: u.x };
		const alongD = { x: foot.x + u.x, y: foot.y + u.y };
		const onA = { x: a.x + u.x, y: a.y + u.y };
		const towardA = Math.hypot(a.x - foot.x, a.y - foot.y) > 0 ? a : add(foot, normal);
		if (through.kind === 'perpendiculaire') {
			return [{ guides: [], rightAngles: [{ center: foot, from: alongD, to: towardA }] }];
		}
		return [
			{
				guides: [
					{ kind: 'droite', x1: a.x, y1: a.y, x2: a.x + normal.x + 0, y2: a.y + normal.y + 0 }
				],
				rightAngles: [
					{ center: foot, from: alongD, to: a },
					{ center: a, from: onA, to: foot }
				]
			}
		];
	});
}

const add = (p: Position, q: Position): Position => ({ x: p.x + q.x, y: p.y + q.y });
