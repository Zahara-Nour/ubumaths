/**
 * Locus computation: samples the trajectory of a tracer point
 * as a driver point moves along its parent path.
 *
 * The algorithm:
 * 1. Identify the driver's parameter range (x for function, theta for circle, t for segment, etc.)
 * 2. Find the sub-graph between driver and tracer (all intermediate elements)
 * 3. For each sample: mutate the driver's parameter locally, recompute the sub-graph, record tracer position
 * 4. Detect discontinuities (large gaps) and closed paths
 * 5. Return a SampledCurve for rendering via the existing Catmull-Rom pipeline
 */

import type { GeoElement, GeoLocus } from '../types/elements';
import {
	isPointOnCurve,
	isPointOnQuadraticCurve,
	isPointOnSegment,
	isPointOnLine,
	isPointOnCircle,
	isPointOnArc,
	isPointOnParametricCurve
} from '../types/elements';
import type { GeoPoint } from '../types/primitives';
import { numeric } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import { computeElementPosition, resolveScalarParam } from './compute-position';
import type { SampledCurve, Point, Viewport } from '../viewport/types';

// =============================================================================
// Types
// =============================================================================

/** Information about how to parameterize the driver point's path. */
interface DriverParamInfo {
	/** Min parameter value */
	tMin: number;
	/** Max parameter value */
	tMax: number;
	/** Is the path closed (circle, ellipse)? */
	closed: boolean;
	/** Create a mutated copy of the driver element at parameter t */
	mutateDriver: (t: number) => GeoElement;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Compute the locus curve by sampling the tracer's position
 * as the driver moves along its path.
 *
 * @param locus - The GeoLocus element definition
 * @param elements - All elements in the figure (read-only)
 * @param positions - Current positions of all elements (read-only)
 * @param viewport - Current viewport for determining parameter ranges on unbounded paths
 * @returns SampledCurve ready for Catmull-Rom rendering, or null if computation fails
 */
export function computeLocusCurve(
	locus: GeoLocus,
	elements: ReadonlyMap<string, GeoElement>,
	positions: ReadonlyMap<string, GeoPoint>,
	viewport: Viewport,
	scalarValues?: ReadonlyMap<string, number>
): SampledCurve | null {
	const driverEl = elements.get(locus.driverId);
	if (!driverEl) return null;

	// 1. Get driver parameter info
	const paramInfo = getDriverParamInfo(driverEl, elements, positions, viewport, scalarValues);
	if (!paramInfo) return null;

	// 2. Find the sub-graph: elements between driver and tracer
	const subGraphIds = findSubGraph(locus.driverId, locus.tracerId, elements);
	if (subGraphIds.length === 0) return null;

	// 3. Uniform sampling — reuse positions and scalar maps across all samples
	const N = locus.numSamples;
	const samples: { t: number; point: Point | null }[] = [];
	const localPositions = new Map(positions);
	const localScalarValues = new Map(scalarValues ?? []);

	for (let i = 0; i <= N; i++) {
		const t = paramInfo.tMin + (i / N) * (paramInfo.tMax - paramInfo.tMin);
		const pos = sampleAtParameter(
			t,
			locus.driverId,
			locus.tracerId,
			paramInfo.mutateDriver,
			subGraphIds,
			elements,
			positions,
			localPositions,
			scalarValues,
			localScalarValues
		);
		samples.push({ t, point: pos });
	}

	// 4. Adaptive refinement: subdivide intervals where consecutive points are far apart
	const refined = adaptiveRefine(
		samples,
		locus.driverId,
		locus.tracerId,
		paramInfo.mutateDriver,
		subGraphIds,
		elements,
		positions,
		scalarValues,
		viewport
	);

	// 5. Build SampledCurve with discontinuity detection
	const rawPoints = refined.map((s) => s.point);
	return buildSampledCurve(rawPoints, paramInfo.closed, viewport);
}

// =============================================================================
// Driver parameter extraction
// =============================================================================

function getDriverParamInfo(
	driver: GeoElement,
	elements: ReadonlyMap<string, GeoElement>,
	positions: ReadonlyMap<string, GeoPoint>,
	viewport: Viewport,
	scalarValues?: ReadonlyMap<string, number>
): DriverParamInfo | null {
	if (isPointOnCurve(driver)) {
		return {
			tMin: viewport.xMin,
			tMax: viewport.xMax,
			closed: false,
			mutateDriver: (t) => ({ ...driver, x0: numeric(t) })
		};
	}

	if (isPointOnQuadraticCurve(driver)) {
		const curveEl = elements.get(driver.curveId);
		if (!curveEl || curveEl.type !== 'quadraticCurve') return null;
		const conic = curveEl.conic;

		if (conic.type === 'circle' || conic.type === 'ellipse') {
			return {
				tMin: 0,
				tMax: 2 * Math.PI,
				closed: true,
				mutateDriver: (t) => ({ ...driver, t })
			};
		}
		if (conic.type === 'parabola') {
			// Use viewport extent to determine range
			const extent = Math.max(viewport.xMax - viewport.xMin, viewport.yMax - viewport.yMin);
			return {
				tMin: -extent,
				tMax: extent,
				closed: false,
				mutateDriver: (t) => ({ ...driver, t })
			};
		}
		if (conic.type === 'hyperbola') {
			// Use viewport extent to determine range
			const hExtent = Math.max(viewport.xMax - viewport.xMin, viewport.yMax - viewport.yMin) * 0.5;
			return {
				tMin: -hExtent,
				tMax: hExtent,
				closed: false,
				mutateDriver: (t) => ({ ...driver, t })
			};
		}
		return null;
	}

	if (isPointOnSegment(driver)) {
		return {
			tMin: 0,
			tMax: 1,
			closed: false,
			mutateDriver: (t) => ({ ...driver, t })
		};
	}

	if (isPointOnLine(driver)) {
		// For lines, parameterize over visible viewport extent
		const lineEl = elements.get(driver.lineId);
		if (!lineEl) return null;

		let p1Id: string;
		let p2Id: string;
		if (lineEl.type === 'line') {
			p1Id = lineEl.point1Id;
			p2Id = lineEl.point2Id;
		} else if (lineEl.type === 'ray') {
			p1Id = lineEl.originId;
			p2Id = lineEl.throughId;
		} else {
			return null;
		}
		const isRay = lineEl.type === 'ray';
		const p1 = positions.get(p1Id);
		const p2 = positions.get(p2Id);
		if (!p1 || !p2) return null;

		const dx = geoToNumber(p2.x) - geoToNumber(p1.x);
		const dy = geoToNumber(p2.y) - geoToNumber(p1.y);
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len < 1e-12) return null;

		// Compute t range that covers the viewport
		const diag = Math.sqrt(
			(viewport.xMax - viewport.xMin) ** 2 + (viewport.yMax - viewport.yMin) ** 2
		);
		const tExtent = (diag / len) * 1.5; // generous margin

		return {
			tMin: isRay ? 0 : -tExtent,
			tMax: tExtent,
			closed: false,
			mutateDriver: (t) => ({ ...driver, t })
		};
	}

	if (isPointOnCircle(driver)) {
		return {
			tMin: 0,
			tMax: 2 * Math.PI,
			closed: true,
			mutateDriver: (t) => ({ ...driver, theta: t })
		};
	}

	if (isPointOnArc(driver)) {
		return {
			tMin: 0,
			tMax: 1,
			closed: false,
			mutateDriver: (t) => ({ ...driver, t })
		};
	}

	if (isPointOnParametricCurve(driver)) {
		const curveEl = elements.get(driver.parametricCurveId);
		if (!curveEl || curveEl.type !== 'parametricCurve') return null;
		const tMin = resolveScalarParam(curveEl.tMin, scalarValues);
		const tMax = resolveScalarParam(curveEl.tMax, scalarValues);
		const safeMin = Number.isFinite(tMin) ? tMin : 0;
		const safeMax = Number.isFinite(tMax) ? tMax : 2 * Math.PI;
		// Closed-revolution detection: when the parameter range spans exactly
		// a full revolution (2π), the path can be safely closed. Most useful
		// for polar curves on [0, 2π] (cardioid, rose, limaçon) where γ(0) = γ(2π).
		// Cartesian parametric curves with t ∈ [0, 2π] also benefit if cyclic
		// (cos/sin); other shapes simply won't have coincident endpoints and
		// the sampler's own closed-detection will downgrade if needed.
		const isFullRevolution =
			Number.isFinite(tMin) && Number.isFinite(tMax) && Math.abs(tMax - tMin - 2 * Math.PI) < 1e-9;
		return {
			tMin: safeMin,
			tMax: safeMax,
			closed: isFullRevolution,
			mutateDriver: (t) => ({ ...driver, t: numeric(t) })
		};
	}

	return null;
}

// =============================================================================
// Sub-graph isolation
// =============================================================================

/**
 * Find all element IDs on the path from driver to tracer in the dependency graph.
 * Returns them in topological order (driver first, tracer last).
 */
function findSubGraph(
	driverId: string,
	tracerId: string,
	elements: ReadonlyMap<string, GeoElement>
): string[] {
	// BFS backwards from tracer to find all ancestors
	const tracerAncestors = new Set<string>();
	const queue: string[] = [tracerId];
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (tracerAncestors.has(id)) continue;
		tracerAncestors.add(id);
		const el = elements.get(id);
		if (el) {
			for (const pid of el.dependsOn) {
				queue.push(pid);
			}
		}
	}

	// If driver is not an ancestor of tracer, no path exists
	if (!tracerAncestors.has(driverId)) return [];

	// BFS forward from driver, only keeping nodes that are also tracer ancestors
	const subGraph = new Set<string>();
	const forwardQueue: string[] = [driverId];
	// Build children map for forward traversal
	const childrenOf = new Map<string, string[]>();
	for (const [id, el] of elements) {
		for (const pid of el.dependsOn) {
			let ch = childrenOf.get(pid);
			if (!ch) {
				ch = [];
				childrenOf.set(pid, ch);
			}
			ch.push(id);
		}
	}

	while (forwardQueue.length > 0) {
		const id = forwardQueue.shift()!;
		if (subGraph.has(id)) continue;
		if (!tracerAncestors.has(id) && id !== driverId) continue;
		subGraph.add(id);
		for (const cid of childrenOf.get(id) ?? []) {
			if (tracerAncestors.has(cid)) {
				forwardQueue.push(cid);
			}
		}
	}

	// Topological sort of sub-graph
	return topSortSubGraph(subGraph, elements);
}

function topSortSubGraph(ids: Set<string>, elements: ReadonlyMap<string, GeoElement>): string[] {
	const inDegree = new Map<string, number>();
	for (const id of ids) {
		let count = 0;
		const el = elements.get(id);
		if (el) {
			for (const pid of el.dependsOn) {
				if (ids.has(pid)) count++;
			}
		}
		inDegree.set(id, count);
	}

	const queue: string[] = [];
	for (const [id, deg] of inDegree) {
		if (deg === 0) queue.push(id);
	}

	const sorted: string[] = [];
	// Build children within sub-graph
	const childrenOf = new Map<string, string[]>();
	for (const id of ids) {
		const el = elements.get(id);
		if (el) {
			for (const pid of el.dependsOn) {
				if (ids.has(pid)) {
					let ch = childrenOf.get(pid);
					if (!ch) {
						ch = [];
						childrenOf.set(pid, ch);
					}
					ch.push(id);
				}
			}
		}
	}

	while (queue.length > 0) {
		const id = queue.shift()!;
		sorted.push(id);
		for (const cid of childrenOf.get(id) ?? []) {
			const newDeg = inDegree.get(cid)! - 1;
			inDegree.set(cid, newDeg);
			if (newDeg === 0) queue.push(cid);
		}
	}

	return sorted;
}

// =============================================================================
// Sampling
// =============================================================================

/**
 * Compute the tracer's position for a given driver parameter value.
 * Uses a shared mutable positions map to avoid per-sample allocations.
 * Does not mutate the figure's real data.
 */
function sampleAtParameter(
	t: number,
	driverId: string,
	tracerId: string,
	mutateDriver: (t: number) => GeoElement,
	subGraphIds: string[],
	elements: ReadonlyMap<string, GeoElement>,
	positions: ReadonlyMap<string, GeoPoint>,
	localPositions?: Map<string, GeoPoint>,
	baseScalarValues?: ReadonlyMap<string, number>,
	localScalarValues?: Map<string, number>
): Point | null {
	// Reuse or create local positions map
	if (!localPositions) {
		localPositions = new Map(positions);
	} else {
		// Reset to base positions for sub-graph nodes only
		for (const id of subGraphIds) {
			const basePos = positions.get(id);
			if (basePos) {
				localPositions.set(id, basePos);
			} else {
				localPositions.delete(id);
			}
		}
	}

	// Reuse or create local scalar values map
	if (!localScalarValues) {
		localScalarValues = new Map(baseScalarValues ?? []);
	} else {
		// Reset scalar values for sub-graph nodes only
		for (const id of subGraphIds) {
			const baseVal = baseScalarValues?.get(id);
			if (baseVal !== undefined) {
				localScalarValues.set(id, baseVal);
			} else {
				localScalarValues.delete(id);
			}
		}
	}

	const mutatedDriver = mutateDriver(t);

	// Recompute sub-graph in order — use mutated driver inline, no elements copy
	for (const id of subGraphIds) {
		const el = id === driverId ? mutatedDriver : elements.get(id);
		if (!el) continue;

		const result = computeElementPosition(el, localPositions, elements, localScalarValues);
		if (result.position) {
			localPositions.set(id, result.position);
		} else {
			localPositions.delete(id);
		}
		// Store scalar values for intermediate scalars/measures in the sub-graph
		if (result.scalarValue !== undefined) {
			localScalarValues.set(id, result.scalarValue);
		}
	}

	const tracerPos = localPositions.get(tracerId);
	if (!tracerPos) return null;

	return { x: geoToNumber(tracerPos.x), y: geoToNumber(tracerPos.y) };
}

// =============================================================================
// Adaptive refinement
// =============================================================================

/** Maximum recursion depth for adaptive refinement. */
const MAX_REFINE_DEPTH = 3;

/** Refinement threshold: refine if distance > this factor × average spacing. */
const REFINE_FACTOR = 2.5;

interface Sample {
	t: number;
	point: Point | null;
}

function adaptiveRefine(
	samples: Sample[],
	driverId: string,
	tracerId: string,
	mutateDriver: (t: number) => GeoElement,
	subGraphIds: string[],
	elements: ReadonlyMap<string, GeoElement>,
	positions: ReadonlyMap<string, GeoPoint>,
	scalarValues: ReadonlyMap<string, number> | undefined,
	_viewport: Viewport
): Sample[] {
	// Compute average spacing between consecutive valid points
	let totalDist = 0;
	let validPairs = 0;
	for (let i = 0; i < samples.length - 1; i++) {
		const a = samples[i].point;
		const b = samples[i + 1].point;
		if (a && b) {
			totalDist += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
			validPairs++;
		}
	}
	if (validPairs === 0) return samples;
	const avgSpacing = totalDist / validPairs;
	const threshold = avgSpacing * REFINE_FACTOR;

	return refinePass(
		samples,
		threshold,
		0,
		driverId,
		tracerId,
		mutateDriver,
		subGraphIds,
		elements,
		positions,
		scalarValues
	);
}

function refinePass(
	samples: Sample[],
	threshold: number,
	depth: number,
	driverId: string,
	tracerId: string,
	mutateDriver: (t: number) => GeoElement,
	subGraphIds: string[],
	elements: ReadonlyMap<string, GeoElement>,
	positions: ReadonlyMap<string, GeoPoint>,
	scalarValues: ReadonlyMap<string, number> | undefined
): Sample[] {
	if (depth >= MAX_REFINE_DEPTH) return samples;

	const result: Sample[] = [samples[0]];
	let refined = false;

	for (let i = 0; i < samples.length - 1; i++) {
		const a = samples[i];
		const b = samples[i + 1];

		if (a.point && b.point) {
			const dist = Math.sqrt((b.point.x - a.point.x) ** 2 + (b.point.y - a.point.y) ** 2);
			if (dist > threshold) {
				// Insert midpoint
				const midT = (a.t + b.t) / 2;
				const midPoint = sampleAtParameter(
					midT,
					driverId,
					tracerId,
					mutateDriver,
					subGraphIds,
					elements,
					positions,
					undefined,
					scalarValues
				);
				result.push({ t: midT, point: midPoint });
				refined = true;
			}
		} else if (a.point !== null || b.point !== null) {
			// One null, one valid: refine to find boundary
			const midT = (a.t + b.t) / 2;
			const midPoint = sampleAtParameter(
				midT,
				driverId,
				tracerId,
				mutateDriver,
				subGraphIds,
				elements,
				positions,
				undefined,
				scalarValues
			);
			result.push({ t: midT, point: midPoint });
			refined = true;
		}

		result.push(b);
	}

	if (!refined) return result;

	// Recurse on the refined set
	return refinePass(
		result,
		threshold,
		depth + 1,
		driverId,
		tracerId,
		mutateDriver,
		subGraphIds,
		elements,
		positions,
		scalarValues
	);
}

// =============================================================================
// Curve building
// =============================================================================

/** Epsilon for closed path detection. */
const CLOSE_EPSILON = 1e-6;

function buildSampledCurve(
	rawPoints: (Point | null)[],
	pathClosed: boolean,
	viewport: Viewport
): SampledCurve | null {
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];

	const viewDiag = Math.sqrt(
		(viewport.xMax - viewport.xMin) ** 2 + (viewport.yMax - viewport.yMin) ** 2
	);
	const discontinuityThreshold = viewDiag * 0.3;

	let prevValid: Point | null = null;

	for (const pt of rawPoints) {
		if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
			// Null point → discontinuity
			if (prevValid !== null) {
				discontinuityIndices.push(points.length);
			}
			prevValid = null;
			continue;
		}

		if (prevValid !== null) {
			const dx = pt.x - prevValid.x;
			const dy = pt.y - prevValid.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > discontinuityThreshold) {
				discontinuityIndices.push(points.length);
			}
		}

		points.push(pt);
		prevValid = pt;
	}

	if (points.length < 2) return null;

	// For closed paths, close the curve if endpoints are near each other
	if (pathClosed && points.length > 2) {
		const first = points[0];
		const last = points[points.length - 1];
		const dx = first.x - last.x;
		const dy = first.y - last.y;
		if (Math.sqrt(dx * dx + dy * dy) < Math.max(CLOSE_EPSILON, viewDiag * 0.01)) {
			// Replace last point with exact first point to close cleanly
			points[points.length - 1] = first;
		}
	}

	return { points, discontinuityIndices };
}
