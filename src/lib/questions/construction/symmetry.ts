/**
 * Symétrique à tracer (vérification `symetrique`, chantier `controles-figure`)
 * ===========================================================================
 *
 * `symetrique par d` : l'élève trace (outil segment, sur quadrillage) l'image
 * de tout ce qui est tracé dans la figure sauf l'axe ; `par O` (un point) :
 * symétrie centrale ; `symetrique A ; B ; C par d` : seulement les traits dont
 * les deux bouts sont parmi ces points. Phase 0 validée par David le
 * 2026-11-02 (`docs/wip/controles-figure-progress.md` § 3).
 *
 * On juge le RÉSULTAT, comme pour le carré (`polygon.ts`) : figure de départ et
 * traits de l'élève fusionnés par droite porteuse (image en morceaux, trait
 * repassé sur la figure de départ ou sur l'axe : sans effet). Messages, dans
 * l'ordre : trait hors de l'image (« ta figure a glissé » si TOUT ce qui est
 * tracé est la figure de départ glissée ; « l'axe est oblique » si tout est
 * retourné par une verticale ou une horizontale), image incomplète, trait qui
 * dépasse.
 *
 * Pur : positions et traits de la figure donnés par l'appelant (registre
 * `positions.ts`).
 *
 * @module questions/construction/symmetry
 */

import type { SymetriqueCheck } from '$lib/ubumark/types/construction';
import type { FigureStep, FigureWindow } from '$lib/ubumark/types/figure';
import type { DrawnLine } from './answer';
import type { ConstructionVerdict, Position } from './judge';
import {
	OVERSHOOT_FEEDBACK,
	carrierOf,
	coveringPiece,
	dot,
	mergeSegments,
	sameLine,
	sub,
	tolerance,
	type Carrier,
	type Segment
} from './polygon';

export const SYMMETRY_NOT_IN_PLACE_FEEDBACK =
	'Ce trait n’est pas à sa place : ce n’est pas le symétrique.';
export const SYMMETRY_SLID_FEEDBACK =
	'Ta figure a glissé : le symétrique est retourné de l’autre côté de l’axe.';
export const SYMMETRY_SLID_CENTRAL_FEEDBACK =
	'Ta figure a glissé : le symétrique par rapport à un point fait un demi-tour autour de ce point.';
export const SYMMETRY_OBLIQUE_FEEDBACK =
	'L’axe est oblique : le symétrique n’est pas juste en face, à l’horizontale ou à la verticale.';
export const SYMMETRY_MISSING_FEEDBACK = 'Il manque une partie du symétrique.';

/** Trait de la figure de départ : un segment, ou un côté d'un polygone */
export interface FigureSegment extends Segment {
	/** Noms des deux bouts (null : point sans nom) */
	ends: [string | null, string | null];
	/** Identifiant de l'objet qui le trace (segment ou polygone) */
	owner: string;
}

/** Droite, segment ou demi-droite NOMMÉ de la figure (un axe possible) */
export interface FigureLine extends Segment {
	owner: string;
}

/** Ce que la figure de départ trace, pour le symétrique */
export interface FigureShapes {
	/** Traits visibles : segments et côtés des polygones */
	segments: FigureSegment[];
	/** Objets droits, par nom (identifiant et nom affiché) */
	lines: ReadonlyMap<string, FigureLine>;
	grid: FigureStep | null;
	window: FigureWindow | null;
}

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class SymmetryAuthorError extends Error {}

type Transform = (p: Position) => Position;

interface Setting {
	source: Segment[];
	expected: Segment[];
	transform: Transform;
	/** L'axe (symétrie axiale), null pour un centre */
	axis: Segment | null;
}

function reflectOver(axis: Segment): Transform {
	const u = sub(axis.b, axis.a);
	const length2 = dot(u, u);
	return (p) => {
		const t = dot(sub(p, axis.a), u) / length2;
		const foot = { x: axis.a.x + t * u.x, y: axis.a.y + t * u.y };
		return { x: 2 * foot.x - p.x + 0, y: 2 * foot.y - p.y + 0 };
	};
}

function halfTurn(center: Position): Transform {
	return (p) => ({ x: 2 * center.x - p.x + 0, y: 2 * center.y - p.y + 0 });
}

const image = (transform: Transform) => (s: Segment) => ({ a: transform(s.a), b: transform(s.b) });

/** L'axe, le centre et les traits à transformer ; erreur d'auteur sinon */
function settingOf(
	check: SymetriqueCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): Setting {
	if (!shapes) {
		throw new SymmetryAuthorError(
			'Case « figure » : traits de la figure non fournis au juge (symetrique)'
		);
	}
	const line = shapes.lines.get(check.by);
	const center = line ? null : points.get(check.by);
	if (!line && !center) {
		throw new SymmetryAuthorError(
			`verifier: symetrique : l’axe ou le centre ${check.by} n’existe pas dans la figure (droite, segment ou point)`
		);
	}
	for (const name of check.points ?? []) {
		if (!points.has(name)) {
			throw new SymmetryAuthorError(`verifier: le point ${name} n’existe pas dans la figure`);
		}
	}
	const listed = check.points ? new Set(check.points) : null;
	const source: Segment[] = shapes.segments
		.filter((s) => s.owner !== line?.owner)
		.filter((s) => !listed || s.ends.every((name) => name !== null && listed.has(name)))
		.map(({ a, b }) => ({ a, b }));
	if (source.length === 0) {
		throw new SymmetryAuthorError(
			`verifier: symetrique par ${check.by} : rien à transformer (aucun segment ni polygone hors de l’axe)`
		);
	}
	const transform = line ? reflectOver(line) : halfTurn(center as Position);
	return { source, expected: source.map(image(transform)), transform, axis: line ?? null };
}

const isOnGrid = (value: number, step: number, eps: number) =>
	Math.abs(value / step - Math.round(value / step)) * step <= eps;

/**
 * Le symétrique est-il traçable ? Erreur d'AUTEUR sinon : axe ou centre
 * inconnu, rien à transformer, pas de quadrillage, image hors de la fenêtre ou
 * hors des nœuds (l'élève ne pourrait pas l'atteindre).
 */
export function assertSymmetry(
	check: SymetriqueCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	const { expected } = settingOf(check, points, shapes);
	const { grid, window } = shapes as FigureShapes;
	if (!grid) {
		throw new SymmetryAuthorError(
			'verifier: symetrique se trace sur quadrillage : ajouter « grille: 1 »'
		);
	}
	for (const p of expected.flatMap((s) => [s.a, s.b])) {
		const eps = tolerance(p);
		if (
			window &&
			(p.x < window.xMin - eps ||
				p.x > window.xMax + eps ||
				p.y < window.yMin - eps ||
				p.y > window.yMax + eps)
		) {
			throw new SymmetryAuthorError(
				`verifier: symetrique par ${check.by} : le symétrique sort de la fenêtre`
			);
		}
		if (!isOnGrid(p.x, grid.x, eps) || !isOnGrid(p.y, grid.y, eps)) {
			throw new SymmetryAuthorError(
				`verifier: symetrique par ${check.by} : un sommet du symétrique n’est pas sur un nœud du quadrillage`
			);
		}
	}
}

/** Longueur du morceau `c` couverte par les morceaux de sa droite */
function overlap(c: Carrier, pieces: readonly Carrier[], eps: number): number {
	return pieces
		.filter((p) => sameLine(p, c, eps))
		.reduce((sum, p) => sum + Math.max(0, Math.min(p.t1, c.t1) - Math.max(p.t0, c.t0)), 0);
}

/** Mêmes morceaux, une fois fusionnés par droite porteuse */
function sameDrawing(p: readonly Segment[], q: readonly Segment[], eps: number): boolean {
	const mp = mergeSegments(p, eps);
	const mq = mergeSegments(q, eps);
	return (
		mp.length === mq.length &&
		mp.every((a) =>
			mq.some(
				(b) => sameLine(a, b, eps) && Math.abs(a.t0 - b.t0) <= eps && Math.abs(a.t1 - b.t1) <= eps
			)
		)
	);
}

const ends = (segments: readonly Segment[]) => segments.flatMap((s) => [s.a, s.b]);

/** Tout ce qui est tracé est la figure de départ glissée (translation non nulle) */
function isSlid(drawn: readonly Segment[], source: readonly Segment[], eps: number): boolean {
	for (const p of ends(drawn)) {
		for (const q of ends(source)) {
			const v = sub(p, q);
			if (Math.hypot(v.x, v.y) <= eps) continue;
			const moved = source.map(image((m) => ({ x: m.x + v.x, y: m.y + v.y })));
			if (sameDrawing(drawn, moved, eps)) return true;
		}
	}
	return false;
}

/** Tout ce qui est tracé est la figure retournée par une verticale ou une horizontale */
function isFlippedStraight(
	drawn: readonly Segment[],
	source: readonly Segment[],
	eps: number
): boolean {
	for (const p of ends(drawn)) {
		for (const q of ends(source)) {
			const vertical = (p.x + q.x) / 2;
			const horizontal = (p.y + q.y) / 2;
			const flips: Transform[] = [
				(m) => ({ x: 2 * vertical - m.x + 0, y: m.y }),
				(m) => ({ x: m.x, y: 2 * horizontal - m.y + 0 })
			];
			if (flips.some((flip) => sameDrawing(drawn, source.map(image(flip)), eps))) return true;
		}
	}
	return false;
}

function isAxisAligned(axis: Segment, eps: number): boolean {
	return Math.abs(axis.a.x - axis.b.x) <= eps || Math.abs(axis.a.y - axis.b.y) <= eps;
}

export function judgeSymmetry(
	check: SymetriqueCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	lines: readonly DrawnLine[]
): ConstructionVerdict {
	const { source, expected, axis } = settingOf(check, points, shapes);
	if (lines.some((l) => l.kind !== 'segment')) return { status: 'incorrect' };
	const drawn: Segment[] = lines.map((l) => ({ a: { x: l.x1, y: l.y1 }, b: { x: l.x2, y: l.y2 } }));
	const eps = tolerance(...ends(source), ...ends(expected), ...ends(drawn));

	// Un trait repassé sur l'axe ne compte pas
	const axisCarrier = axis ? carrierOf(axis) : null;
	const useful = drawn.filter((s) => !axisCarrier || !sameLine(carrierOf(s), axisCarrier, eps));
	const allowed = mergeSegments([...expected, ...source], eps);

	let misplaced = false;
	let overshoot = false;
	for (const s of useful) {
		const c = carrierOf(s);
		const covered = overlap(c, allowed, eps);
		if (covered <= eps) misplaced = true;
		else if (c.t1 - c.t0 - covered > eps) overshoot = true;
	}

	if (misplaced) {
		// Les traits repassés sur la figure de départ ne disent rien de l'erreur
		const sourcePieces = mergeSegments(source, eps);
		const own = useful.filter((s) => coveringPiece(s, sourcePieces, eps) === null);
		if (own.length > 0 && isSlid(own, source, eps)) {
			return {
				status: 'incorrect',
				feedback: axis ? SYMMETRY_SLID_FEEDBACK : SYMMETRY_SLID_CENTRAL_FEEDBACK
			};
		}
		if (
			axis &&
			!isAxisAligned(axis, eps) &&
			own.length > 0 &&
			isFlippedStraight(own, source, eps)
		) {
			return { status: 'incorrect', feedback: SYMMETRY_OBLIQUE_FEEDBACK };
		}
		return { status: 'incorrect', feedback: SYMMETRY_NOT_IN_PLACE_FEEDBACK };
	}

	const pieces = mergeSegments([...source, ...useful], eps);
	if (expected.some((s) => coveringPiece(s, pieces, eps) === null)) {
		return { status: 'incorrect', feedback: SYMMETRY_MISSING_FEEDBACK };
	}
	if (overshoot) return { status: 'incorrect', feedback: OVERSHOOT_FEEDBACK };
	return { status: 'correct' };
}

/** La bonne figure : l'image, sans ce que la figure de départ trace déjà */
export function symmetrySolution(
	check: SymetriqueCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): DrawnLine[] {
	let setting: Setting;
	try {
		setting = settingOf(check, points, shapes);
	} catch {
		return [];
	}
	const { source, expected } = setting;
	const eps = tolerance(...ends(source), ...ends(expected));
	const sourcePieces = mergeSegments(source, eps);
	return expected
		.filter((s) => coveringPiece(s, sourcePieces, eps) === null)
		.map((s) => ({ kind: 'segment', x1: s.a.x, y1: s.a.y, x2: s.b.x, y2: s.b.y }));
}
