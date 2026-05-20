/**
 * Shared geometric core for rendering a `GeoAngle`.
 *
 * Centralises the trigonometric calculations that were previously duplicated
 * across the 3 rendering surfaces that emit angle output directly:
 *   - `svg-primitives.ts` (`angleToSVG`, consumed by canvas + SVG export + rough)
 *   - `export-tikz.ts`    (Pass 3: angles)
 *   - `export-typst.ts`   (Pass 3: angles)
 *
 * Coordinate-space agnostic: the caller projects vertex/p1/p2 into its target
 * space (SVG pixels OR math units) and passes the projected coordinates +
 * radius/spacing/labelOffset in the SAME space. The helper returns angles in
 * radians (math convention) — each renderer converts to degrees if needed.
 *
 * Surface-specific output generation (SVG path strings, TikZ `\draw` lines,
 * Typst `arc(...)`) remains in each renderer because the syntax is different
 * enough that factorising it would lose more than it saves.
 *
 * @module geometry-core/rendering/angle-geometry-shared
 */

import type { Figure } from '../graph/figure';
import type { GeoAngle } from '../types/elements';
import { geoToNumber } from '../compute/to-number';
import { computeBisectorDirection } from './bisector-direction';
import { formatAngleLabel, unsignedAngleBetween } from './angle-label';

/**
 * Per-arc data for a `marque ∈ {'arc', 'arcs2', 'arcs3'}` rendering.
 *
 * Radii are in caller space (pixels for SVG, math units for TikZ/Typst).
 * The first entry has the smallest radius; entries follow concentrically
 * outward. Always non-empty when `marque !== 'aucune' && marque !== 'carre'`.
 */
export interface AngleArcGeometry {
	/** Radius of this arc, in caller space. */
	radius: number;
	/** Start point of the arc on this radius, in caller space. */
	startX: number;
	startY: number;
	/** End point of the arc on this radius, in caller space. */
	endX: number;
	endY: number;
}

/**
 * Per-side data for a `marque === 'carre'` right-angle marker (small square).
 * The three points (start → corner → end) trace an open polyline.
 */
export interface RightAngleGeometry {
	/** Start of the polyline on side 1, in caller space. */
	startX: number;
	startY: number;
	/** Corner of the small square (V + s·u1 + s·u2), in caller space. */
	cornerX: number;
	cornerY: number;
	/** End of the polyline on side 2, in caller space. */
	endX: number;
	endY: number;
}

/**
 * Pure geometric description of a `GeoAngle` ready to be turned into
 * SVG / TikZ / Typst output.
 *
 * All coordinates and radii are expressed in the same caller-supplied space
 * (SVG pixels for the canvas / SVG export, math units for TikZ / Typst).
 */
export interface AngleRenderGeometry {
	/** Vertex position in caller space. */
	vertexX: number;
	vertexY: number;
	/** Direction vectors from vertex (RAW, not normalized), in caller space. */
	d1x: number;
	d1y: number;
	d2x: number;
	d2y: number;
	/** Lengths of d1 and d2 (precomputed for convenience). */
	len1: number;
	len2: number;
	/** Unit vectors along the two sides. */
	u1x: number;
	u1y: number;
	u2x: number;
	u2y: number;
	/** Polar angles of the two sides, in radians (math convention). */
	angle1: number;
	angle2: number;
	/**
	 * Signed sweep from `angle1` to (`angle1 + sweep`) in radians.
	 *
	 * - For `kind='saillant'`: the shortest arc, sweep ∈ [-π, π].
	 * - For `kind='rentrant'`: the complementary arc, |sweep| ∈ (π, 2π].
	 *
	 * Sign indicates orientation (positive = counter-clockwise in math
	 * convention; in SVG pixel space the y-axis is flipped, but the formula
	 * is identical — callers handle the visual flip implicitly via SVG arc
	 * conventions).
	 */
	sweepRad: number;
	/** Unsigned interior angle in radians, in [0, π]. */
	interiorRad: number;
	/**
	 * Effective angular measure in radians used for the label
	 * (`interior` for saillant, `2π - interior` for rentrant). `null` only when
	 * geometrically undefined (which the degenerate guard already filters out).
	 */
	measureRad: number;
	/** Marque kind, with default applied. */
	marque: 'arc' | 'arcs2' | 'arcs3' | 'carre' | 'aucune';
	/** Saillant vs rentrant kind, with default applied. */
	kind: 'saillant' | 'rentrant';
	/** Number of concentric arcs (1, 2 or 3). 0 for 'carre' / 'aucune'. */
	arcCount: number;
	/** Per-arc geometry, empty when `marque ∈ {'carre', 'aucune'}`. */
	arcs: AngleArcGeometry[];
	/** Outer arc radius (radius of the last entry of `arcs`, or 0). */
	outerRadius: number;
	/** Right-angle square geometry, present only when `marque === 'carre'`. */
	rightAngle?: RightAngleGeometry;
	/** Bisector unit vector (already flipped for rentrant). */
	bisX: number;
	bisY: number;
	/** Label text (null when `showLabel='aucun'` or required name missing). */
	label: string | null;
	/** Label center position in caller space (along the bisector). */
	labelX: number;
	labelY: number;
}

/**
 * Options controlling caller-space sizing of the rendered angle.
 *
 * All values are in the SAME space as `vertex / p1 / p2` (pixels for the
 * canvas, math units for TikZ/Typst).
 */
export interface AngleRenderOptions {
	/** Radius of the innermost arc. */
	arcRadius: number;
	/** Spacing between concentric arcs (for `arcs2` / `arcs3`). */
	arcSpacing: number;
	/** Side length of the right-angle square (for `marque === 'carre'`). */
	rightAngleSize: number;
	/** Distance beyond `arcRadius` (the inner arc) at which the label is positioned. */
	labelOffset: number;
}

/**
 * Project the three positions of a `GeoAngle` (vertex + 2 side points) from
 * the Figure into a caller-supplied space using `project`. Returns `null` if
 * any position is missing or if either side is degenerate (zero length).
 *
 * Centralises the "lookup + project + degenerate guard" prologue shared by
 * all three rendering surfaces.
 */
export function projectAngleEndpoints(
	angle: GeoAngle,
	figure: Figure,
	project: (mathX: number, mathY: number) => { x: number; y: number }
): {
	vertexX: number;
	vertexY: number;
	p1X: number;
	p1Y: number;
	p2X: number;
	p2Y: number;
} | null {
	const posP1 = figure.getPosition(angle.p1Id);
	const posV = figure.getPosition(angle.vertexId);
	const posP2 = figure.getPosition(angle.p2Id);
	if (!posP1 || !posV || !posP2) return null;

	const v = project(geoToNumber(posV.x), geoToNumber(posV.y));
	const p1 = project(geoToNumber(posP1.x), geoToNumber(posP1.y));
	const p2 = project(geoToNumber(posP2.x), geoToNumber(posP2.y));

	return {
		vertexX: v.x,
		vertexY: v.y,
		p1X: p1.x,
		p1Y: p1.y,
		p2X: p2.x,
		p2Y: p2.y
	};
}

/**
 * Compute the geometric description of a `GeoAngle` from already-projected
 * endpoint coordinates and caller-space sizing options.
 *
 * Returns `null` when either side is degenerate (zero length) — callers MUST
 * skip rendering in that case.
 *
 * The `(vertex, p1, p2)` triplet and the `options` MUST live in the SAME
 * coordinate space (mixing pixels and math units gives meaningless output).
 *
 * @param angle  The `GeoAngle` element (read for `marque`, `kind`, `unite`,
 *               `showLabel`, `label`, `arcRadiusPx`, `arcSpacingPx`).
 * @param coords Projected endpoint coordinates in caller space.
 * @param options Caller-space sizing (radius, spacing, label offset).
 */
export function computeAngleGeometry(
	angle: GeoAngle,
	coords: {
		vertexX: number;
		vertexY: number;
		p1X: number;
		p1Y: number;
		p2X: number;
		p2Y: number;
	},
	options: AngleRenderOptions
): AngleRenderGeometry | null {
	const { vertexX, vertexY, p1X, p1Y, p2X, p2Y } = coords;
	const d1x = p1X - vertexX;
	const d1y = p1Y - vertexY;
	const d2x = p2X - vertexX;
	const d2y = p2Y - vertexY;

	const len1 = Math.hypot(d1x, d1y);
	const len2 = Math.hypot(d2x, d2y);
	if (len1 < 1e-10 || len2 < 1e-10) return null;

	const u1x = d1x / len1;
	const u1y = d1y / len1;
	const u2x = d2x / len2;
	const u2y = d2y / len2;

	const marque = angle.marque ?? 'arc';
	const kind = angle.kind ?? 'saillant';

	// Unsigned interior angle in [0, π] (independent of axis orientation).
	const interiorRaw = unsignedAngleBetween(d1x, d1y, d2x, d2y);
	const interiorRad = interiorRaw ?? 0;
	const measureRad = kind === 'rentrant' ? 2 * Math.PI - interiorRad : interiorRad;
	const label = formatAngleLabel(angle, measureRad);

	// Polar angles of each side. Normalise sweep to [-π, π] (shortest path),
	// then flip to the complementary arc when `kind === 'rentrant'`.
	const angle1 = Math.atan2(d1y, d1x);
	const angle2 = Math.atan2(d2y, d2x);
	let sweep = angle2 - angle1;
	while (sweep > Math.PI) sweep -= 2 * Math.PI;
	while (sweep < -Math.PI) sweep += 2 * Math.PI;
	if (kind === 'rentrant') {
		sweep = sweep > 0 ? sweep - 2 * Math.PI : sweep + 2 * Math.PI;
	}

	// Bisector direction (averaged unit vectors, flipped for rentrant).
	const bisDir = computeBisectorDirection(u1x, u1y, u2x, u2y, kind);
	const bisX = bisDir ? bisDir.bisX : -u1y;
	const bisY = bisDir ? bisDir.bisY : u1x;

	// Arc geometry — populated only for arc / arcs2 / arcs3.
	const arcs: AngleArcGeometry[] = [];
	let arcCount = 0;
	let outerRadius = 0;
	if (marque === 'arc' || marque === 'arcs2' || marque === 'arcs3') {
		arcCount = marque === 'arcs3' ? 3 : marque === 'arcs2' ? 2 : 1;
		for (let i = 0; i < arcCount; i++) {
			const r = options.arcRadius + i * options.arcSpacing;
			arcs.push({
				radius: r,
				startX: vertexX + r * Math.cos(angle1),
				startY: vertexY + r * Math.sin(angle1),
				endX: vertexX + r * Math.cos(angle1 + sweep),
				endY: vertexY + r * Math.sin(angle1 + sweep)
			});
		}
		outerRadius = options.arcRadius + (arcCount - 1) * options.arcSpacing;
	}

	// Right-angle square (carre) corner geometry.
	let rightAngle: RightAngleGeometry | undefined;
	if (marque === 'carre') {
		const s = options.rightAngleSize;
		rightAngle = {
			startX: vertexX + u1x * s,
			startY: vertexY + u1y * s,
			cornerX: vertexX + u1x * s + u2x * s,
			cornerY: vertexY + u1y * s + u2y * s,
			endX: vertexX + u2x * s,
			endY: vertexY + u2y * s
		};
	}

	// Label position is anchored at `arcRadius + labelOffset` along the
	// bisector (legacy behaviour shared by all 3 surfaces — even with
	// `arcs2` / `arcs3` the label uses the INNER arc radius, not the outer).
	const labelX = vertexX + bisX * (options.arcRadius + options.labelOffset);
	const labelY = vertexY + bisY * (options.arcRadius + options.labelOffset);

	return {
		vertexX,
		vertexY,
		d1x,
		d1y,
		d2x,
		d2y,
		len1,
		len2,
		u1x,
		u1y,
		u2x,
		u2y,
		angle1,
		angle2,
		sweepRad: sweep,
		interiorRad,
		measureRad,
		marque,
		kind,
		arcCount,
		arcs,
		outerRadius,
		rightAngle,
		bisX,
		bisY,
		label,
		labelX,
		labelY
	};
}
