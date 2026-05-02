/**
 * GeoElement - Discriminated union of all geometric element types.
 *
 * Each element has:
 * - id: unique string identifier
 * - type: discriminant for the union
 * - dependsOn: array of parent element IDs (in GeoElementBase for generic access)
 */

import type { GeoValue, ScalarParam } from './geo-value';
import type { GeoPoint } from './primitives';
import type { MathNode } from '$lib/mathAST/types';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import type { EndpointType } from '$lib/math/intervals/types';

// =============================================================================
// Style
// =============================================================================

export interface GeoStyle {
	readonly color?: string;
	readonly opacity?: number;
	readonly strokeWidth?: number;
	readonly dash?: 'solid' | 'dashed' | 'dotted';
	readonly pointShape?: 'dot' | 'circle' | 'cross' | 'square';
	readonly pointSize?: number;
	readonly fillColor?: string;
	readonly fillOpacity?: number;
	/** Rendering style override for mixed mode ('normal' | 'rough'). */
	readonly render?: 'normal' | 'rough';
	/** Roughness level for rough rendering (0..5, default 1). */
	readonly roughness?: number;
	/** Explicit seed for deterministic rough rendering. */
	readonly roughSeed?: number;
	/** Bowing: how much lines curve (0 = straight, higher = more bowed). Default 1. */
	readonly roughBowing?: number;
	/** Fill pattern for rough mode. */
	readonly roughFillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed';
	/** If true, endpoints/vertices are not randomly offset (cleaner joints). */
	readonly roughPreserveVertices?: boolean;
}

// =============================================================================
// Common properties
// =============================================================================

export interface GeoElementBase {
	readonly id: string;
	readonly label?: string;
	readonly labelOffset?: { readonly dx: number; readonly dy: number };
	readonly color: string;
	readonly visible: boolean;
	readonly style?: GeoStyle;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Point types
// =============================================================================

export interface GeoFreePoint extends GeoElementBase {
	readonly type: 'freePoint';
	readonly position: GeoPoint;
	readonly draggable: boolean;
	readonly dependsOn: readonly [];
}

/** A point whose coordinates are computed from ScalarParam (reactive or static). */
export interface GeoComputedPoint extends GeoElementBase {
	readonly type: 'computedPoint';
	readonly xParam: ScalarParam;
	readonly yParam: ScalarParam;
	readonly draggable: false;
	readonly dependsOn: readonly string[];
}

export interface GeoMidpoint extends GeoElementBase {
	readonly type: 'midpoint';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of two line-like elements. Depends on the two line elements. */
export interface GeoIntersectionLL extends GeoElementBase {
	readonly type: 'intersectionLL';
	readonly line1Id: string;
	readonly line2Id: string;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of a line-like element and a circle. Index (0|1) selects which of the 0-2 points.
 *  Internal index is 0-based; DSL uses 1-based (1 or 2). */
export interface GeoIntersectionLC extends GeoElementBase {
	readonly type: 'intersectionLC';
	readonly lineId: string;
	readonly circleId: string;
	readonly index: 0 | 1;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of two circles. Index (0|1) selects which of the 0-2 points.
 *  Internal index is 0-based; DSL uses 1-based (1 or 2). */
export interface GeoIntersectionCC extends GeoElementBase {
	readonly type: 'intersectionCC';
	readonly circle1Id: string;
	readonly circle2Id: string;
	readonly index: 0 | 1;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of a line-like element and a quadratic curve (conic). Index (0|1) selects which of the 0-2 points.
 *  Internal index is 0-based; DSL uses 1-based (1 or 2). */
export interface GeoIntersectionLQ extends GeoElementBase {
	readonly type: 'intersectionLQ';
	readonly lineId: string;
	readonly curveId: string;
	readonly index: 0 | 1;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of two quadratic curves (conics). Index (0|1|2|3) selects which of up to 4 points.
 *  Internal index is 0-based; DSL uses 1-based (1 to 4). */
export interface GeoIntersectionQQ extends GeoElementBase {
	readonly type: 'intersectionQQ';
	readonly curve1Id: string;
	readonly curve2Id: string;
	readonly index: 0 | 1 | 2 | 3;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of a line-like element and a function curve y=f(x). Index selects which point (sorted by x).
 *  Internal index is 0-based; DSL uses 1-based. Number of points depends on search window (currently [-10,10]).
 *  Reactive when the line moves; static if only the function is involved. */
export interface GeoIntersectionLF extends GeoElementBase {
	readonly type: 'intersectionLF';
	readonly lineId: string;
	readonly functionId: string;
	readonly index: number;
	readonly xMin: number;
	readonly xMax: number;
	readonly dependsOn: readonly [string, string];
}

/** Intersection of two function curves y=f(x) and y=g(x). Index selects which point (sorted by x).
 *  Internal index is 0-based; DSL uses 1-based. Number of points depends on search window (currently [-10,10]).
 *  Static: computed once at creation since GeoFunction has no dependencies. */
export interface GeoIntersectionFF extends GeoElementBase {
	readonly type: 'intersectionFF';
	readonly function1Id: string;
	readonly function2Id: string;
	readonly index: number;
	readonly xMin: number;
	readonly xMax: number;
	readonly dependsOn: readonly [string, string];
}

/**
 * Intersection of two parametric curves γ1(t1) and γ2(t2).
 *
 * Solved live by Newton 2D multi-start (8×8 grid) on F(t1, t2) = γ1(t1) − γ2(t2) = 0.
 * Results are sorted lexicographically by (t1, t2), deduplicated with a relative
 * epsilon ((range_t)/1000 on each parameter), and clamped to the curves' domains.
 *
 * `k` is 1-indexed (DSL convention). When `k` exceeds the number of intersections
 * found, getPosition silently returns null (no DslRuntimeError).
 */
export interface GeoIntersectionParametric extends GeoElementBase {
	readonly type: 'intersectionParametric';
	readonly curve1Id: string;
	readonly curve2Id: string;
	/** 1-indexed k. */
	readonly k: number;
	readonly dependsOn: readonly [string, string];
}

/**
 * Intersection of a parametric curve γ(t) and a `droite` line.
 *
 * Solved live by Newton 1D multi-start (16 uniform starts in [t_min, t_max])
 * on f(t) = (γ(t) − P) × v = (γ_x − P_x)·v_y − (γ_y − P_y)·v_x = 0,
 * where the line passes through P with direction v. f'(t) = γ'_x·v_y − γ'_y·v_x.
 *
 * Pipeline: Newton → clamp → acceptance filter → sort by t ascending → dedup
 * with relative epsilon (range_t × 1/1000). `k` is 1-indexed; out-of-range k
 * silently returns null.
 *
 * Scope: only `'line'` (droite). Segment / ray are not supported (V3 scope).
 */
export interface GeoIntersectionParametricLine extends GeoElementBase {
	readonly type: 'intersectionParametricLine';
	readonly curveId: string;
	readonly lineId: string;
	/** 1-indexed k. */
	readonly k: number;
	readonly dependsOn: readonly [string, string];
}

/**
 * Intersection of a parametric curve γ(t) and a circle (any of circleByRadius,
 * circleByPoint, circleBy3Points).
 *
 * Solved live by Newton 1D multi-start on f(t) = (γ_x − c_x)² + (γ_y − c_y)² − r² = 0,
 * f'(t) = 2·(γ_x − c_x)·γ'_x + 2·(γ_y − c_y)·γ'_y.
 *
 * `k` is 1-indexed; out-of-range k silently returns null.
 */
export interface GeoIntersectionParametricCircle extends GeoElementBase {
	readonly type: 'intersectionParametricCircle';
	readonly curveId: string;
	readonly circleId: string;
	/** 1-indexed k. */
	readonly k: number;
	readonly dependsOn: readonly [string, string];
}

/**
 * Intersection of a parametric curve γ(t) and a function curve y = f(x).
 *
 * Solved live by Newton 1D multi-start on g(t) = γ_y(t) − f(γ_x(t)) = 0,
 * g'(t) = γ'_y(t) − f'(γ_x(t)) · γ'_x(t).
 *
 * After convergence, results outside the function's domain (when restricted)
 * are filtered out: γ_x(t) must lie in [xMin, xMax].
 *
 * `k` is 1-indexed; out-of-range k silently returns null.
 */
export interface GeoIntersectionParametricFunction extends GeoElementBase {
	readonly type: 'intersectionParametricFunction';
	readonly curveId: string;
	readonly functionId: string;
	/** 1-indexed k. */
	readonly k: number;
	readonly dependsOn: readonly [string, string];
}

/** Image of a point by central symmetry (reflection through a center). */
export interface GeoReflectedPoint extends GeoElementBase {
	readonly type: 'reflectedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly dependsOn: readonly [string, string];
}

/** Image of a point by rotation around a center. */
export interface GeoRotatedPoint extends GeoElementBase {
	readonly type: 'rotatedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly angle: ScalarParam;
	readonly dependsOn: readonly string[];
}

/** Image of a point by translation defined by a vector (two points). */
/**
 * Image of a point by translation.
 *
 * Two construction modes:
 * - By two points: vectorStartId + vectorEndId define the displacement (classic).
 * - By vector element: vectorId references a GeoVector (bound or free).
 *   The displacement is read from the vector's points (bound) or dx/dy (free).
 *   This keeps the translated point reactive to vector changes.
 *
 * When vectorId is set, vectorStartId/vectorEndId are empty strings (unused).
 */
export interface GeoTranslatedPoint extends GeoElementBase {
	readonly type: 'translatedPoint';
	readonly sourceId: string;
	readonly vectorStartId: string;
	readonly vectorEndId: string;
	/** Optional: direct reference to a vector element for reactive translation. */
	readonly vectorId?: string;
	readonly dependsOn: readonly string[];
}

/** Image of a point by homothety (dilation) from a center with a factor. */
export interface GeoDilatedPoint extends GeoElementBase {
	readonly type: 'dilatedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly factor: ScalarParam;
	readonly dependsOn: readonly string[];
}

/** Image of a point by axial symmetry (reflection over a line defined by two points). */
export interface GeoReflectedOverLine extends GeoElementBase {
	readonly type: 'reflectedOverLine';
	readonly sourceId: string;
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly dependsOn: readonly [string, string, string];
}

/** Point constrained to a function curve y=f(x). Draggable along x unless draggable=false. */
export interface GeoPointOnCurve extends GeoElementBase {
	readonly type: 'pointOnCurve';
	readonly functionId: string;
	readonly x0: GeoValue;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

/** Point constrained to a quadratic curve. Parametrized by angle t (radians). */
export interface GeoPointOnQuadraticCurve extends GeoElementBase {
	readonly type: 'pointOnQuadraticCurve';
	readonly curveId: string;
	/** Parameter t in radians (angle for ellipse/circle, raw param for hyperbola/parabola). */
	readonly t: number;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

/** Point constrained to a segment. t ∈ [0,1]: 0=start, 1=end. */
export interface GeoPointOnSegment extends GeoElementBase {
	readonly type: 'pointOnSegment';
	readonly segmentId: string;
	readonly t: number;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

/** Point constrained to a line or ray. P = P1 + t*(P2-P1). */
export interface GeoPointOnLine extends GeoElementBase {
	readonly type: 'pointOnLine';
	readonly lineId: string;
	readonly t: number;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

/** Point constrained to a circle. θ in radians. */
export interface GeoPointOnCircle extends GeoElementBase {
	readonly type: 'pointOnCircle';
	readonly circleId: string;
	readonly theta: number;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

/** Point constrained to an arc. t ∈ [0,1] interpolates from start to end angle. */
export interface GeoPointOnArc extends GeoElementBase {
	readonly type: 'pointOnArc';
	readonly arcId: string;
	readonly t: number;
	readonly draggable: boolean;
	readonly dependsOn: readonly [string];
}

/**
 * Point constrained to a parametric curve at parameter t0.
 * Position is γ(t0).
 *
 * Drag (V2):
 * - draggable: true when t is a numeric GeoValue or a scalarRef pointing to a
 *   slider (drag updates t directly or moves the slider).
 * - draggable: false when t is a scalarRef pointing to a computed scalar
 *   (e.g. `2*s`) — read-only from the drag perspective.
 */
export interface GeoPointOnParametricCurve extends GeoElementBase {
	readonly type: 'pointOnParametricCurve';
	readonly parametricCurveId: string;
	/** Parameter t value (number or scalar reference for slider reactivity). */
	readonly t: ScalarParam;
	readonly draggable: boolean;
	readonly dependsOn: readonly string[];
}

/** Locus: trajectory of tracerPoint as driverPoint moves along its parent path. */
export interface GeoLocus extends GeoElementBase {
	readonly type: 'locus';
	readonly driverId: string;
	readonly tracerId: string;
	readonly numSamples: number;
	readonly dependsOn: readonly string[];
}

/** Trace: progressive locus that accumulates positions of a tracked point over interactions. */
export interface GeoTrace extends GeoElementBase {
	readonly type: 'trace';
	readonly trackedPointId: string;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Annotation types
// =============================================================================

/** Angle mark (arc or right-angle square) at a vertex defined by three points. */
export interface GeoAngleMark extends GeoElementBase {
	readonly type: 'angleMark';
	readonly p1Id: string;
	readonly vertexId: string;
	readonly p2Id: string;
	readonly arcCount: 1 | 2 | 3;
	readonly rightAngle: boolean;
	readonly dependsOn: readonly [string, string, string];
}

/** Tick marks on a segment to indicate equal lengths. */
export interface GeoSegmentMark extends GeoElementBase {
	readonly type: 'segmentMark';
	readonly startId: string;
	readonly endId: string;
	readonly markCount: 1 | 2 | 3;
	readonly dependsOn: readonly [string, string];
}

/** Reactive text element displayed on the figure with scalar interpolation. */
export interface GeoText extends GeoElementBase {
	readonly type: 'text';
	/** Template string with scalar interpolation: "d = {d:.2f} cm" */
	readonly template: string;
	/** IDs of scalars/sliders referenced in the template */
	readonly scalarRefs: readonly string[];
	/** Point element to anchor the text to (optional) */
	readonly anchorId?: string;
	/** Offset from anchor point in math coordinates */
	readonly anchorOffset?: { readonly dx: number; readonly dy: number };
	/** Free position in math coordinates (when no anchor) */
	readonly position?: { readonly x: number; readonly y: number };
	/** Auto-positioning mode (used by mesure() sugar) */
	readonly autoPosition?: 'midpoint' | 'bisector' | 'centroid';
	/** Target point IDs for auto-positioning */
	readonly autoTargetIds?: readonly string[];
	readonly dependsOn: readonly string[];
}

/** Math text element rendered via MathLive <math-span> in a foreignObject. */
export interface GeoMathText extends GeoElementBase {
	readonly type: 'mathText';
	/** LaTeX template with scalar interpolation: "$d = {d:.2f}$" */
	readonly template: string;
	readonly scalarRefs: readonly string[];
	readonly anchorId?: string;
	readonly anchorOffset?: { readonly dx: number; readonly dy: number };
	readonly position?: { readonly x: number; readonly y: number };
	readonly autoPosition?: 'midpoint' | 'bisector' | 'centroid';
	readonly autoTargetIds?: readonly string[];
	readonly dependsOn: readonly string[];
}

/** Rich text element rendered via InlineRenderer (bold, italic, math) in a foreignObject. */
export interface GeoRichText extends GeoElementBase {
	readonly type: 'richText';
	/** Ubumark template with scalar interpolation: "**Distance** : $d = {d:.2f}$ cm" */
	readonly template: string;
	readonly scalarRefs: readonly string[];
	readonly anchorId?: string;
	readonly anchorOffset?: { readonly dx: number; readonly dy: number };
	readonly position?: { readonly x: number; readonly y: number };
	readonly autoPosition?: 'midpoint' | 'bisector' | 'centroid';
	readonly autoTargetIds?: readonly string[];
	readonly dependsOn: readonly string[];
}

/** Image element displayed on the figure via SVG <image>. */
export interface GeoImage extends GeoElementBase {
	readonly type: 'image';
	/** URL of the image (absolute, e.g. from Supabase storage). */
	readonly url: string;
	/** Width in math coordinate units. */
	readonly width: number;
	/** Height in math coordinate units. If omitted, aspect ratio is preserved. */
	readonly height?: number;
	/** Point element to anchor the image to (optional). */
	readonly anchorId?: string;
	/** Offset from anchor point in math coordinates. */
	readonly anchorOffset?: { readonly dx: number; readonly dy: number };
	/** Free position in math coordinates (when no anchor). */
	readonly position?: { readonly x: number; readonly y: number };
	/** First corner point for 2-point rectangle mode. */
	readonly point1Id?: string;
	/** Second corner point for 2-point rectangle mode. */
	readonly point2Id?: string;
	/** Rendering layer: 'fond' = behind constructions, 'avant' (default) = on top. */
	readonly layer?: 'fond' | 'avant';
	/** Visual rotation in radians, accumulated from geometric transforms. */
	readonly rotation?: number;
	/** Whether the image is visually flipped (mirrored), from axial symmetry. */
	readonly flipped?: boolean;
	/** Internal: hidden point tracking the center for reactive transforms. Set by transforme(). */
	readonly _centerPointId?: string;
	/** Internal: source image P1 for reactive 2-point rotation (tracks the untransformed diagonal). */
	readonly _srcPoint1Id?: string;
	/** Internal: source image P2 for reactive 2-point rotation (tracks the untransformed diagonal). */
	readonly _srcPoint2Id?: string;
	/** Internal: transformation element ID for reactive visual transform recomputation. */
	readonly _transformId?: string;
	/** Internal: source image element ID for chained reactive visual transforms. */
	readonly _srcImageId?: string;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Scalar types (reactive computed values)
// =============================================================================

/** Reactive computed scalar value in the dependency graph. */
export interface GeoScalar extends GeoElementBase {
	readonly type: 'scalar';
	readonly scalarKind:
		| 'distance'
		| 'distance_point_line'
		| 'angle'
		| 'polar_angle'
		| 'area'
		| 'norme'
		| 'perimeter'
		| 'slope'
		| 'radius'
		| 'power'
		| 'expression'
		| 'coordinate';
	/** Target element IDs for primitive kinds (points for distance/angle/area, vector for norme). */
	readonly targetIds: readonly string[];
	/** Computation closure for 'expression' kind: receives scalar values, returns number. */
	readonly compute?: (scalarValues: ReadonlyMap<string, number>) => number;
	/** IDs of scalar/slider/measure elements this expression reads (expression kind only). */
	readonly scalarDeps?: readonly string[];
	/** Which coordinate to extract (coordinate kind only). */
	readonly coordinateAxis?: 'x' | 'y';
	/** Display format when visible on figure. */
	readonly format?: 'exact' | 'approx' | 'degrees' | 'radians';
	/** Internal: paired GeoIntegralArea id when this scalar comes from `integrale()`. */
	readonly _visualAreaId?: string;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Integral area (visual zone for the integrale() builtin)
// =============================================================================

/**
 * Visual zone representing the area between f and the x-axis on [a, b], or
 * between two curves f and g on [a, b] when `secondFunctionId` is set.
 *
 * Three modes (V1 + V2 + V3):
 *
 * - V1 — `signed = true` (default, used by `integrale()`): the paired scalar
 *   carries the signed integral F(b) − F(a) and the visual splits sub-regions
 *   by sign for two-tone rendering.
 * - V2 — `signed = false`, no `secondFunctionId` (used by `aire()`): the
 *   paired scalar carries the geometric area Σ |F(z_{i+1}) − F(z_i)| over
 *   zeros of f in (a, b), always ≥ 0; the visual fills uniformly.
 * - V3 — `signed = false` + `secondFunctionId` (used by `aire_entre()`):
 *   the paired scalar carries Σ |H(x_{i+1}) − H(x_i)| where H is the
 *   antiderivative of h = f − g and x_i are the zeros of h in (a, b),
 *   always ≥ 0; the visual fills the region between f and g.
 *
 * Created in pairs with a GeoScalar (option C of the integrale-study).
 * Stores the antiderivative (of f in V1/V2, of h = f − g in V3) and its
 * compiled closure for fast reactive evaluation when bounds change. When
 * symbolic integration is unavailable, `antiderivative` and `compiledF`
 * are null and the paired scalar falls back to numeric integration.
 */
export interface GeoIntegralArea extends GeoElementBase {
	readonly type: 'integralArea';
	readonly functionId: string;
	readonly lowerBound: ScalarParam;
	readonly upperBound: ScalarParam;
	/** Signed integral (true, integrale) vs unsigned geometric area (false, aire/aire_entre). */
	readonly signed: boolean;
	/** Antiderivative F(x) (or H(x) of f − g in V3 mode) when symbolic integration succeeded, else null. */
	readonly antiderivative: MathNode | null;
	/** Compiled antiderivative for fast evaluation. Null when antiderivative is null. */
	readonly compiledF: CompiledFn | null;
	/** Outcome of the symbolic integration attempt at creation time. */
	readonly integrationStatus: 'exact' | 'approximate' | 'unsupported';
	/** Internal: paired scalar id (the value `integrale()` / `aire()` / `aire_entre()` exposes to the DSL). */
	readonly _scalarId: string;
	readonly dependsOn: readonly string[];
	// V3 — aire_entre mode (set by aire_entre() builtin, undefined for V1/V2).
	/** Second function id for `aire_entre` mode (the visual fills between f and g, not f and the x-axis). */
	readonly secondFunctionId?: string;
	/** Cached h = f − g expression (V3 mode only) — used by findRoots and numeric fallback. */
	readonly differenceExpression?: MathNode;
	/** Compiled h(x) for fast evaluation (V3 mode only). */
	readonly compiledDifference?: CompiledFn;
}

/** Slider: a free scalar controlled by the user (no geometric dependencies). */
export interface GeoSlider extends GeoElementBase {
	readonly type: 'slider';
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step?: number;
	readonly dependsOn: readonly [];
}

// =============================================================================
// Line-like types
// =============================================================================

export interface GeoSegment extends GeoElementBase {
	readonly type: 'segment';
	readonly startId: string;
	readonly endId: string;
	readonly dependsOn: readonly [string, string];
}

/** Equation ax + by + c = 0 with exact coefficients and original expression string. */
export interface LineEquation {
	readonly a: MathNode;
	readonly b: MathNode;
	readonly c: MathNode;
	readonly expression: string;
}

export interface GeoLine extends GeoElementBase {
	readonly type: 'line';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly equation?: LineEquation;
	readonly dependsOn: readonly [string, string];
}

export interface GeoRay extends GeoElementBase {
	readonly type: 'ray';
	readonly originId: string;
	readonly throughId: string;
	readonly dependsOn: readonly [string, string];
}

// =============================================================================
// Vectors
// =============================================================================

/** Bound vector defined by two points (start → end). Depends on both points. */
export interface GeoVectorByPoints extends GeoElementBase {
	readonly type: 'vectorByPoints';
	readonly startId: string;
	readonly endId: string;
	readonly dependsOn: readonly [string, string];
}

/** Free vector with stored components. Draggable as a unit (anchor moves, dx/dy preserved). */
export interface GeoFreeVector extends GeoElementBase {
	readonly type: 'freeVector';
	readonly dx: GeoValue;
	readonly dy: GeoValue;
	readonly anchorX: GeoValue;
	readonly anchorY: GeoValue;
	readonly dependsOn: readonly [];
}

// ─── Derived vector operations (reactive) ───────────────────────────────────

/** Reactive vector sum: w = v1 + v2 (or v1 - v2 when negate=true). */
export interface GeoVectorSum extends GeoElementBase {
	readonly type: 'vectorSum';
	readonly vector1Id: string;
	readonly vector2Id: string;
	/** If true, computes v1 - v2 instead of v1 + v2. */
	readonly negate: boolean;
	readonly dependsOn: readonly string[];
}

/** Reactive scaled vector: w = factor * v. */
export interface GeoVectorScaled extends GeoElementBase {
	readonly type: 'vectorScaled';
	readonly vectorId: string;
	readonly factor: GeoValue;
	readonly dependsOn: readonly string[];
}

/** Reactive negated vector: w = -v. */
export interface GeoVectorNegate extends GeoElementBase {
	readonly type: 'vectorNegate';
	readonly vectorId: string;
	readonly dependsOn: readonly string[];
}

export type GeoVector =
	| GeoVectorByPoints
	| GeoFreeVector
	| GeoVectorSum
	| GeoVectorScaled
	| GeoVectorNegate;

// =============================================================================
// Arc (two construction variants)
// =============================================================================

/**
 * Arc defined by center, radius, and start/end angles (radians internally).
 * DSL accepts angles in degrees and converts.
 */
export interface GeoArcByAngles extends GeoElementBase {
	readonly type: 'arcByAngles';
	readonly centerId: string;
	readonly radius: ScalarParam;
	readonly startAngle: ScalarParam; // radians
	readonly endAngle: ScalarParam; // radians
	readonly dependsOn: readonly string[];
}

/**
 * Arc from startPoint to endPoint around center.
 * Used to trace angles: arc(A, O, B) draws the arc of angle AOB.
 * The arc goes counterclockwise from OA to OB direction.
 */
export interface GeoArcByPoints extends GeoElementBase {
	readonly type: 'arcByPoints';
	readonly startId: string;
	readonly centerId: string;
	readonly endId: string;
	readonly dependsOn: readonly [string, string, string];
}

export type GeoArc = GeoArcByAngles | GeoArcByPoints;

// =============================================================================
// Circle (two construction variants)
// =============================================================================

/**
 * Circle defined by center point and a fixed radius value.
 * `radius` is a ScalarParam: either a GeoValue (exact symbolic value like sqrt(2))
 * or a reference to a scalar/slider element for dynamic radius.
 */
export interface GeoCircleByRadius extends GeoElementBase {
	readonly type: 'circleByRadius';
	readonly centerId: string;
	readonly radius: ScalarParam;
	readonly dependsOn: readonly string[];
}

/** Circle defined by center point and a point on the circle. */
export interface GeoCircleByPoint extends GeoElementBase {
	readonly type: 'circleByPoint';
	readonly centerId: string;
	readonly edgePointId: string;
	readonly dependsOn: readonly [string, string];
}

/** Circle defined by 3 points on the circle (circumcircle). */
export interface GeoCircleBy3Points extends GeoElementBase {
	readonly type: 'circleBy3Points';
	readonly point1Id: string;
	readonly point2Id: string;
	readonly point3Id: string;
	readonly dependsOn: readonly [string, string, string];
}

export type GeoCircle = GeoCircleByRadius | GeoCircleByPoint | GeoCircleBy3Points;

// =============================================================================
// Sector (circular sector — filled wedge)
// =============================================================================

/** Sector defined by center and two edge points (counterclockwise from start to end). */
export interface GeoSectorByPoints extends GeoElementBase {
	readonly type: 'sectorByPoints';
	readonly centerId: string;
	readonly startId: string;
	readonly endId: string;
	readonly dependsOn: readonly [string, string, string];
}

/** Sector defined by center, radius, and start/end angles (radians internally). */
export interface GeoSectorByAngles extends GeoElementBase {
	readonly type: 'sectorByAngles';
	readonly centerId: string;
	readonly radius: ScalarParam;
	readonly startAngle: ScalarParam;
	readonly endAngle: ScalarParam;
	readonly dependsOn: readonly string[];
}

export type GeoSector = GeoSectorByPoints | GeoSectorByAngles;

// =============================================================================
// Annulus (couronne — ring between two concentric circles)
// =============================================================================

/** Annulus defined by center and two radii. */
export interface GeoAnnulus extends GeoElementBase {
	readonly type: 'annulus';
	readonly centerId: string;
	readonly innerRadius: ScalarParam;
	readonly outerRadius: ScalarParam;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Polygon (minimum 3 vertices, dependsOn IS the vertex list)
// =============================================================================

export interface GeoPolygon extends GeoElementBase {
	readonly type: 'polygon';
	/** Vertex IDs in order. Also serves as the dependency list. Minimum 3. */
	readonly dependsOn: readonly [string, string, string, ...string[]];
}

/** Tangent line to a function curve at a given x₀. */
export interface GeoTangentLine extends GeoElementBase {
	readonly type: 'tangentLine';
	readonly functionId: string;
	/** Point on curve that defines x₀ dynamically (mutually exclusive with x0). */
	readonly pointOnCurveId?: string;
	/** Fixed x₀ value (mutually exclusive with pointOnCurveId). */
	readonly x0?: GeoValue;
	readonly dependsOn: readonly string[];
}

/** Tangent line to a quadratic curve at a given point. */
export interface GeoTangentToQuadratic extends GeoElementBase {
	readonly type: 'tangentToQuadratic';
	readonly curveId: string;
	/** Point on the quadratic curve (dynamic tangent). */
	readonly pointOnCurveId?: string;
	/** Fixed parameter t in radians (static tangent). */
	readonly t?: number;
	readonly dependsOn: readonly string[];
}

/** Polar line of a point with respect to a quadratic curve (conic). */
export interface GeoConicPolar extends GeoElementBase {
	readonly type: 'conicPolar';
	readonly curveId: string;
	readonly pointId: string;
	readonly dependsOn: readonly string[];
}

/**
 * Tangent line to a parametric curve at parameter t0.
 * Created by destructuring `(d, v) = tangente(c, t0)`. Companion vector is
 * marked with the same `tangentGroupId` so the serializer can re-emit them
 * together.
 */
export interface GeoTangentParametric extends GeoElementBase {
	readonly type: 'tangentParametric';
	readonly parametricCurveId: string;
	/** Parameter t0 — fixed value or scalarRef (slider/scalar) for reactivity. */
	readonly t: ScalarParam;
	/** Group id shared with the companion GeoTangentVector for serialization pairing. */
	readonly tangentGroupId: string;
	/** Cached point of tangency γ(t0) at creation time (for inspection/snapshot). */
	readonly point: { readonly x: number; readonly y: number };
	/** Cached direction γ'(t0) at creation time (raw, not normalized). */
	readonly direction: { readonly dx: number; readonly dy: number };
	readonly dependsOn: readonly string[];
}

/**
 * Tangent vector to a parametric curve at parameter t0, anchored at γ(t0).
 * Tail is at γ(t0); head is at γ(t0) + γ'(t0). Companion of GeoTangentParametric
 * via shared `tangentGroupId`.
 */
export interface GeoTangentVector extends GeoElementBase {
	readonly type: 'tangentVector';
	readonly parametricCurveId: string;
	/** Parameter t0 — fixed value or scalarRef. */
	readonly t: ScalarParam;
	/** Group id shared with the companion GeoTangentParametric. */
	readonly tangentGroupId: string;
	/** Cached tail γ(t0) at creation time. */
	readonly tail: { readonly x: number; readonly y: number };
	/** Cached head γ(t0) + γ'(t0) at creation time. */
	readonly head: { readonly x: number; readonly y: number };
	/** Cached components γ'(t0) at creation time (mirror of head - tail). */
	readonly dx: number;
	readonly dy: number;
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Function curve (y = f(x), from courbe() builtin)
// =============================================================================

/**
 * Optional domain restriction for a function curve.
 *
 * The function is plotted only on the interval defined by `lower` and `upper`,
 * with bracket types determining whether the bounds are included.
 *
 * Bounds support:
 * - Fixed values (`GeoValue`)
 * - References to sliders/scalars (`ScalarRef`) for reactive bounds
 * - `±∞` (`InfinityParam`) for half-bounded restrictions
 *
 * Examples:
 * - `courbe("y = x^2 sur [-2 ; 2]")` → both endpoints closed
 * - `courbe("y = x^2 sur ]a ; b]")` with sliders a, b → reactive open-closed
 * - `courbe("y = x^2 avec x > 0")` → lower=0 open, upper=+∞
 */
export interface GeoFunctionDomain {
	readonly lower: ScalarParam;
	readonly upper: ScalarParam;
	readonly lowerType: EndpointType;
	readonly upperType: EndpointType;
}

export interface GeoFunction extends GeoElementBase {
	readonly type: 'function';
	/** f(x) as a symbolic MathNode (for exact analysis: derivative, zeros, domain). */
	readonly expression: MathNode;
	/** f'(x) as a symbolic MathNode (for adaptive sampling and tangent lines). */
	readonly derivative: MathNode;
	/** Compiled closure for fast numerical evaluation of f(x). */
	readonly compiledFn: CompiledFn;
	/** Compiled closure for fast numerical evaluation of f'(x). */
	readonly compiledDerivative: CompiledFn;
	/** Original equation string as entered by the user (for serialization). */
	readonly equation: string;
	/** Optional domain restriction (e.g. `sur [-2;2]` or `avec a<x<=b` in DSL). */
	readonly domain?: GeoFunctionDomain;
	/** Ids of scalar/slider elements referenced in domain bounds (empty if no domain or only literal bounds). */
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Quadratic curve (conic section, from courbe() builtin)
// =============================================================================

/** Conic type after classification. */
export type ConicType = 'circle' | 'ellipse' | 'hyperbola' | 'parabola' | 'degenerate';

/** Classified conic parameters for parametric rendering. */
export interface ConicParams {
	readonly type: ConicType;
	readonly center?: { readonly x: number; readonly y: number };
	/** Semi-axis a (≥ b for ellipse; transverse for hyperbola; focal param for parabola). */
	readonly a: number;
	/** Semi-axis b (≤ a for ellipse; conjugate for hyperbola). */
	readonly b: number;
	/** Rotation angle in radians. */
	readonly rotation: number;
	/** For parabolas: focal parameter p. */
	readonly p?: number;
	/** For parabolas: vertex position. */
	readonly vertex?: { readonly x: number; readonly y: number };
}

export interface GeoQuadraticCurve extends GeoElementBase {
	readonly type: 'quadraticCurve';
	/** Original F(x,y) as a symbolic MathNode. */
	readonly expression: MathNode;
	/** Original equation string as entered by the user. */
	readonly equation: string;
	/** Numeric coefficients [A, B, C, D, E, F] of Ax²+Bxy+Cy²+Dx+Ey+F=0. */
	readonly coefficients: readonly [number, number, number, number, number, number];
	/** Classified conic parameters for rendering. */
	readonly conic: ConicParams;
	/**
	 * If this conic was created by transforming another conic, stores the recipe
	 * for reactive recomputation when transformation-defining points move.
	 */
	readonly transformRecipe?: {
		readonly sourceCoefficients: readonly [number, number, number, number, number, number];
		readonly transformId: string;
	};
	readonly dependsOn: readonly string[];
}

export interface GeoImplicitCurve extends GeoElementBase {
	readonly type: 'implicitCurve';
	/** F(x,y) as a symbolic MathNode. */
	readonly expression: MathNode;
	/** Compiled F(x,y) for fast numerical evaluation. */
	readonly compiledFn: CompiledFn;
	/** Original equation string as entered by the user. */
	readonly equation: string;
	/** Autonomous element — no dependencies on other elements. */
	readonly dependsOn: readonly [];
}

// =============================================================================
// Parametric curve (t → (x(t), y(t)), from courbe() builtin with 2 equations)
// =============================================================================

/** Parametric curve t → (x(t), y(t)). Bounds can be dynamic (slider/scalar refs). */
export interface GeoParametricCurve extends GeoElementBase {
	readonly type: 'parametricCurve';
	/** x(t) as a symbolic MathNode. */
	readonly xExpression: MathNode;
	/** y(t) as a symbolic MathNode. */
	readonly yExpression: MathNode;
	/** dx/dt as a symbolic MathNode (or null if differentiation failed → uniform sampling fallback). */
	readonly xDerivative: MathNode | null;
	/** dy/dt as a symbolic MathNode (or null). */
	readonly yDerivative: MathNode | null;
	/** Compiled closure for x(t). Takes { [parameter]: number } and returns number. */
	readonly compiledX: CompiledFn;
	/** Compiled closure for y(t). */
	readonly compiledY: CompiledFn;
	/** Compiled dx/dt (or null if symbolic differentiation failed). */
	readonly compiledXPrime: CompiledFn | null;
	/** Compiled dy/dt (or null). */
	readonly compiledYPrime: CompiledFn | null;
	/** Parameter variable name (e.g. "t", "theta", "u"). */
	readonly parameter: string;
	/** Lower bound — can be a fixed GeoValue or a ScalarRef (slider/scalar). */
	readonly tMin: ScalarParam;
	/** Upper bound. */
	readonly tMax: ScalarParam;
	/** Original equation string for x(t), e.g. "x = cos(t)". */
	readonly equationX: string;
	/** Original equation string for y(t), e.g. "y = sin(t)". */
	readonly equationY: string;
	/**
	 * True iff this curve was created from a polar equation `r = f(θ)` and was
	 * internally rewritten as `(f(θ)·cos(θ), f(θ)·sin(θ))`. Optional — absent on
	 * regular parametric curves.
	 */
	readonly polar?: boolean;
	/**
	 * Original RHS of the polar equation `r = f(θ)`, normalized to ASCII `theta`
	 * (e.g. `"2*cos(theta)"`). Present iff `polar === true`.
	 */
	readonly equationR?: string;
	/** Ids of scalar/slider elements referenced in xExpression, yExpression, tMin, tMax. */
	readonly dependsOn: readonly string[];
}

// =============================================================================
// Transformation objects (invisible, reusable)
// =============================================================================

/** Rotation transformation object. Created by rotation(angle=..., centre=...) with 0 positional args. */
export interface GeoRotation extends GeoElementBase {
	readonly type: 'rotation';
	readonly centerId: string;
	readonly angle: ScalarParam;
	readonly dependsOn: readonly string[];
}

/** Central symmetry (point reflection) transformation object. */
export interface GeoReflection extends GeoElementBase {
	readonly type: 'reflection';
	readonly centerId: string;
	readonly dependsOn: readonly [string];
}

/** Axial symmetry (reflection over a line) transformation object. */
export interface GeoReflectionOverLine extends GeoElementBase {
	readonly type: 'reflectionOverLine';
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly dependsOn: readonly [string, string];
}

/**
 * Translation transformation object.
 *
 * Two construction modes (same as GeoTranslatedPoint):
 * - By two points: vectorStartId + vectorEndId
 * - By vector element: vectorId
 */
export interface GeoTranslation extends GeoElementBase {
	readonly type: 'translation';
	readonly vectorStartId: string;
	readonly vectorEndId: string;
	readonly vectorId?: string;
	readonly dependsOn: readonly string[];
}

/** Homothety (dilation) transformation object. */
export interface GeoHomothety extends GeoElementBase {
	readonly type: 'homothety';
	readonly centerId: string;
	readonly factor: ScalarParam;
	readonly dependsOn: readonly string[];
}

/** Orthogonal projection onto a line transformation object. */
export interface GeoProjection extends GeoElementBase {
	readonly type: 'projection';
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly dependsOn: readonly [string, string];
}

/** Projected point — image of a point by orthogonal projection onto a line. */
export interface GeoProjectedPoint extends GeoElementBase {
	readonly type: 'projectedPoint';
	readonly sourceId: string;
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly dependsOn: readonly [string, string, string];
}

/** Orthogonal affinity (stretch perpendicular to an axis) transformation object. */
export interface GeoAffinity extends GeoElementBase {
	readonly type: 'affinity';
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly factor: GeoValue;
	readonly dependsOn: readonly [string, string];
}

/** Affinity point — image of a point by orthogonal affinity. */
export interface GeoAffinityPoint extends GeoElementBase {
	readonly type: 'affinityPoint';
	readonly sourceId: string;
	readonly linePoint1Id: string;
	readonly linePoint2Id: string;
	readonly factor: GeoValue;
	readonly dependsOn: readonly [string, string, string];
}

/** Circular inversion transformation object. NON-AFFINE. */
export interface GeoInversion extends GeoElementBase {
	readonly type: 'inversion';
	readonly centerId: string;
	readonly radius: GeoValue;
	readonly dependsOn: readonly [string];
}

/** Inverted point — image of a point by circular inversion. */
export interface GeoInvertedPoint extends GeoElementBase {
	readonly type: 'invertedPoint';
	readonly sourceId: string;
	readonly centerId: string;
	readonly radius: GeoValue;
	readonly dependsOn: readonly [string, string];
}

/** Composition of transformations. Applied right-to-left: compose(r, t) applies t then r. */
export interface GeoComposition extends GeoElementBase {
	readonly type: 'composition';
	readonly transformationIds: readonly string[];
	readonly dependsOn: readonly string[];
	/** When this composition was created by a higher-level builtin (e.g. similitude). */
	readonly sourceBuiltin?: {
		readonly name: 'similitude';
		readonly params: {
			readonly angle: ScalarParam;
			readonly rapport: ScalarParam;
			readonly centerId: string;
		};
	};
}

export type GeoTransformation =
	| GeoRotation
	| GeoReflection
	| GeoReflectionOverLine
	| GeoTranslation
	| GeoHomothety
	| GeoProjection
	| GeoAffinity
	| GeoInversion
	| GeoComposition;

// =============================================================================
// Union type
// =============================================================================

export type GeoPointElement =
	| GeoFreePoint
	| GeoComputedPoint
	| GeoMidpoint
	| GeoIntersectionLL
	| GeoIntersectionLC
	| GeoIntersectionCC
	| GeoIntersectionLQ
	| GeoIntersectionQQ
	| GeoIntersectionLF
	| GeoIntersectionFF
	| GeoIntersectionParametric
	| GeoIntersectionParametricLine
	| GeoIntersectionParametricCircle
	| GeoIntersectionParametricFunction
	| GeoReflectedPoint
	| GeoRotatedPoint
	| GeoTranslatedPoint
	| GeoDilatedPoint
	| GeoReflectedOverLine
	| GeoProjectedPoint
	| GeoAffinityPoint
	| GeoInvertedPoint
	| GeoPointOnCurve
	| GeoPointOnQuadraticCurve
	| GeoPointOnSegment
	| GeoPointOnLine
	| GeoPointOnCircle
	| GeoPointOnArc
	| GeoPointOnParametricCurve;
export type GeoLineLikeElement = GeoSegment | GeoLine | GeoRay;

export type GeoElement =
	| GeoFreePoint
	| GeoComputedPoint
	| GeoMidpoint
	| GeoIntersectionLL
	| GeoIntersectionLC
	| GeoIntersectionCC
	| GeoIntersectionLQ
	| GeoIntersectionQQ
	| GeoIntersectionLF
	| GeoIntersectionFF
	| GeoIntersectionParametric
	| GeoIntersectionParametricLine
	| GeoIntersectionParametricCircle
	| GeoIntersectionParametricFunction
	| GeoReflectedPoint
	| GeoRotatedPoint
	| GeoTranslatedPoint
	| GeoDilatedPoint
	| GeoReflectedOverLine
	| GeoProjectedPoint
	| GeoAffinityPoint
	| GeoInvertedPoint
	| GeoAngleMark
	| GeoSegmentMark
	| GeoText
	| GeoMathText
	| GeoRichText
	| GeoImage
	| GeoSegment
	| GeoLine
	| GeoRay
	| GeoCircleByRadius
	| GeoCircleByPoint
	| GeoCircleBy3Points
	| GeoArcByAngles
	| GeoArcByPoints
	| GeoSectorByPoints
	| GeoSectorByAngles
	| GeoAnnulus
	| GeoPolygon
	| GeoFunction
	| GeoQuadraticCurve
	| GeoImplicitCurve
	| GeoParametricCurve
	| GeoPointOnCurve
	| GeoPointOnQuadraticCurve
	| GeoPointOnSegment
	| GeoPointOnLine
	| GeoPointOnCircle
	| GeoPointOnArc
	| GeoPointOnParametricCurve
	| GeoTangentLine
	| GeoTangentToQuadratic
	| GeoTangentParametric
	| GeoTangentVector
	| GeoConicPolar
	| GeoVectorByPoints
	| GeoFreeVector
	| GeoVectorSum
	| GeoVectorScaled
	| GeoVectorNegate
	| GeoRotation
	| GeoReflection
	| GeoReflectionOverLine
	| GeoTranslation
	| GeoHomothety
	| GeoProjection
	| GeoAffinity
	| GeoInversion
	| GeoComposition
	| GeoLocus
	| GeoTrace
	| GeoScalar
	| GeoSlider
	| GeoIntegralArea;

export type GeoElementType = GeoElement['type'];

// =============================================================================
// Type guards
// =============================================================================

export function isFreePoint(el: GeoElement): el is GeoFreePoint {
	return el.type === 'freePoint';
}

export function isComputedPoint(el: GeoElement): el is GeoComputedPoint {
	return el.type === 'computedPoint';
}

export function isMidpoint(el: GeoElement): el is GeoMidpoint {
	return el.type === 'midpoint';
}

export function isIntersectionLL(el: GeoElement): el is GeoIntersectionLL {
	return el.type === 'intersectionLL';
}

export function isIntersectionLC(el: GeoElement): el is GeoIntersectionLC {
	return el.type === 'intersectionLC';
}

export function isIntersectionCC(el: GeoElement): el is GeoIntersectionCC {
	return el.type === 'intersectionCC';
}

export function isIntersectionLQ(el: GeoElement): el is GeoIntersectionLQ {
	return el.type === 'intersectionLQ';
}

export function isIntersectionQQ(el: GeoElement): el is GeoIntersectionQQ {
	return el.type === 'intersectionQQ';
}

export function isIntersectionLF(el: GeoElement): el is GeoIntersectionLF {
	return el.type === 'intersectionLF';
}

export function isIntersectionFF(el: GeoElement): el is GeoIntersectionFF {
	return el.type === 'intersectionFF';
}

export function isIntersectionParametric(el: GeoElement): el is GeoIntersectionParametric {
	return el.type === 'intersectionParametric';
}

export function isIntersectionParametricLine(el: GeoElement): el is GeoIntersectionParametricLine {
	return el.type === 'intersectionParametricLine';
}

export function isIntersectionParametricCircle(
	el: GeoElement
): el is GeoIntersectionParametricCircle {
	return el.type === 'intersectionParametricCircle';
}

export function isIntersectionParametricFunction(
	el: GeoElement
): el is GeoIntersectionParametricFunction {
	return el.type === 'intersectionParametricFunction';
}

export function isReflectedPoint(el: GeoElement): el is GeoReflectedPoint {
	return el.type === 'reflectedPoint';
}

export function isRotatedPoint(el: GeoElement): el is GeoRotatedPoint {
	return el.type === 'rotatedPoint';
}

export function isTranslatedPoint(el: GeoElement): el is GeoTranslatedPoint {
	return el.type === 'translatedPoint';
}

export function isDilatedPoint(el: GeoElement): el is GeoDilatedPoint {
	return el.type === 'dilatedPoint';
}

export function isReflectedOverLine(el: GeoElement): el is GeoReflectedOverLine {
	return el.type === 'reflectedOverLine';
}

export function isPointOnCurve(el: GeoElement): el is GeoPointOnCurve {
	return el.type === 'pointOnCurve';
}

export function isPointOnQuadraticCurve(el: GeoElement): el is GeoPointOnQuadraticCurve {
	return el.type === 'pointOnQuadraticCurve';
}

export function isPointOnSegment(el: GeoElement): el is GeoPointOnSegment {
	return el.type === 'pointOnSegment';
}

export function isPointOnLine(el: GeoElement): el is GeoPointOnLine {
	return el.type === 'pointOnLine';
}

export function isPointOnCircle(el: GeoElement): el is GeoPointOnCircle {
	return el.type === 'pointOnCircle';
}

export function isPointOnArc(el: GeoElement): el is GeoPointOnArc {
	return el.type === 'pointOnArc';
}

export function isPointOnParametricCurve(el: GeoElement): el is GeoPointOnParametricCurve {
	return el.type === 'pointOnParametricCurve';
}

export function isPointElement(el: GeoElement): el is GeoPointElement {
	return (
		el.type === 'freePoint' ||
		el.type === 'computedPoint' ||
		el.type === 'midpoint' ||
		el.type === 'intersectionLL' ||
		el.type === 'intersectionLC' ||
		el.type === 'intersectionCC' ||
		el.type === 'intersectionLQ' ||
		el.type === 'intersectionQQ' ||
		el.type === 'intersectionLF' ||
		el.type === 'intersectionFF' ||
		el.type === 'intersectionParametric' ||
		el.type === 'intersectionParametricLine' ||
		el.type === 'intersectionParametricCircle' ||
		el.type === 'intersectionParametricFunction' ||
		el.type === 'reflectedPoint' ||
		el.type === 'rotatedPoint' ||
		el.type === 'translatedPoint' ||
		el.type === 'dilatedPoint' ||
		el.type === 'reflectedOverLine' ||
		el.type === 'projectedPoint' ||
		el.type === 'affinityPoint' ||
		el.type === 'invertedPoint' ||
		el.type === 'pointOnCurve' ||
		el.type === 'pointOnQuadraticCurve' ||
		el.type === 'pointOnSegment' ||
		el.type === 'pointOnLine' ||
		el.type === 'pointOnCircle' ||
		el.type === 'pointOnArc' ||
		el.type === 'pointOnParametricCurve'
	);
}

export function isTangentToQuadratic(el: GeoElement): el is GeoTangentToQuadratic {
	return el.type === 'tangentToQuadratic';
}

export function isConicPolar(el: GeoElement): el is GeoConicPolar {
	return el.type === 'conicPolar';
}

export function isAngleMark(el: GeoElement): el is GeoAngleMark {
	return el.type === 'angleMark';
}

export function isSegmentMark(el: GeoElement): el is GeoSegmentMark {
	return el.type === 'segmentMark';
}

export function isText(el: GeoElement): el is GeoText {
	return el.type === 'text';
}

export function isMathText(el: GeoElement): el is GeoMathText {
	return el.type === 'mathText';
}

export function isRichText(el: GeoElement): el is GeoRichText {
	return el.type === 'richText';
}

export function isImage(el: GeoElement): el is GeoImage {
	return el.type === 'image';
}

export function isSegment(el: GeoElement): el is GeoSegment {
	return el.type === 'segment';
}

export function isLine(el: GeoElement): el is GeoLine {
	return el.type === 'line';
}

export function isRay(el: GeoElement): el is GeoRay {
	return el.type === 'ray';
}

export function isLineLike(el: GeoElement): el is GeoLineLikeElement {
	return el.type === 'segment' || el.type === 'line' || el.type === 'ray';
}

export function isCircle(el: GeoElement): el is GeoCircle {
	return (
		el.type === 'circleByRadius' || el.type === 'circleByPoint' || el.type === 'circleBy3Points'
	);
}

export function isCircleBy3Points(el: GeoElement): el is GeoCircleBy3Points {
	return el.type === 'circleBy3Points';
}

export function isCircleByRadius(el: GeoElement): el is GeoCircleByRadius {
	return el.type === 'circleByRadius';
}

export function isCircleByPoint(el: GeoElement): el is GeoCircleByPoint {
	return el.type === 'circleByPoint';
}

export function isSector(el: GeoElement): el is GeoSector {
	return el.type === 'sectorByPoints' || el.type === 'sectorByAngles';
}

export function isAnnulus(el: GeoElement): el is GeoAnnulus {
	return el.type === 'annulus';
}

export function isPolygon(el: GeoElement): el is GeoPolygon {
	return el.type === 'polygon';
}

export function isArc(el: GeoElement): el is GeoArc {
	return el.type === 'arcByAngles' || el.type === 'arcByPoints';
}

export function isArcByAngles(el: GeoElement): el is GeoArcByAngles {
	return el.type === 'arcByAngles';
}

export function isArcByPoints(el: GeoElement): el is GeoArcByPoints {
	return el.type === 'arcByPoints';
}

export function isQuadraticCurve(el: GeoElement): el is GeoQuadraticCurve {
	return el.type === 'quadraticCurve';
}

export function isFunction(el: GeoElement): el is GeoFunction {
	return el.type === 'function';
}

export function isImplicitCurve(el: GeoElement): el is GeoImplicitCurve {
	return el.type === 'implicitCurve';
}

export function isParametricCurve(el: GeoElement): el is GeoParametricCurve {
	return el.type === 'parametricCurve';
}

export function isLocus(el: GeoElement): el is GeoLocus {
	return el.type === 'locus';
}

export function isTrace(el: GeoElement): el is GeoTrace {
	return el.type === 'trace';
}

export function isTangentLine(el: GeoElement): el is GeoTangentLine {
	return el.type === 'tangentLine';
}

export function isTangentParametric(el: GeoElement): el is GeoTangentParametric {
	return el.type === 'tangentParametric';
}

export function isTangentVector(el: GeoElement): el is GeoTangentVector {
	return el.type === 'tangentVector';
}

export function isVectorByPoints(el: GeoElement): el is GeoVectorByPoints {
	return el.type === 'vectorByPoints';
}

export function isFreeVector(el: GeoElement): el is GeoFreeVector {
	return el.type === 'freeVector';
}

export function isVector(el: GeoElement): el is GeoVector {
	return (
		el.type === 'vectorByPoints' ||
		el.type === 'freeVector' ||
		el.type === 'vectorSum' ||
		el.type === 'vectorScaled' ||
		el.type === 'vectorNegate'
	);
}

export function isVectorSum(el: GeoElement): el is GeoVectorSum {
	return el.type === 'vectorSum';
}

export function isVectorScaled(el: GeoElement): el is GeoVectorScaled {
	return el.type === 'vectorScaled';
}

export function isVectorNegate(el: GeoElement): el is GeoVectorNegate {
	return el.type === 'vectorNegate';
}

// Transformation object type guards

export function isRotation(el: GeoElement): el is GeoRotation {
	return el.type === 'rotation';
}

export function isReflection(el: GeoElement): el is GeoReflection {
	return el.type === 'reflection';
}

export function isReflectionOverLine(el: GeoElement): el is GeoReflectionOverLine {
	return el.type === 'reflectionOverLine';
}

export function isTranslation(el: GeoElement): el is GeoTranslation {
	return el.type === 'translation';
}

export function isHomothety(el: GeoElement): el is GeoHomothety {
	return el.type === 'homothety';
}

export function isComposition(el: GeoElement): el is GeoComposition {
	return el.type === 'composition';
}

export function isProjection(el: GeoElement): el is GeoProjection {
	return el.type === 'projection';
}

export function isProjectedPoint(el: GeoElement): el is GeoProjectedPoint {
	return el.type === 'projectedPoint';
}

export function isTransformation(el: GeoElement): el is GeoTransformation {
	return (
		el.type === 'rotation' ||
		el.type === 'reflection' ||
		el.type === 'reflectionOverLine' ||
		el.type === 'translation' ||
		el.type === 'homothety' ||
		el.type === 'projection' ||
		el.type === 'affinity' ||
		el.type === 'inversion' ||
		el.type === 'composition'
	);
}

export function isInversion(el: GeoElement): el is GeoInversion {
	return el.type === 'inversion';
}

export function isInvertedPoint(el: GeoElement): el is GeoInvertedPoint {
	return el.type === 'invertedPoint';
}

export function isAffinity(el: GeoElement): el is GeoAffinity {
	return el.type === 'affinity';
}

export function isAffinityPoint(el: GeoElement): el is GeoAffinityPoint {
	return el.type === 'affinityPoint';
}

export function isScalar(el: GeoElement): el is GeoScalar {
	return el.type === 'scalar';
}

export function isSlider(el: GeoElement): el is GeoSlider {
	return el.type === 'slider';
}
