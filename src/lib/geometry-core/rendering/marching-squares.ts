/**
 * Marching Squares algorithm for rendering implicit curves F(x,y) = 0.
 *
 * Given a compiled function F and a viewport, produces contour paths
 * as arrays of SampledCurve (one per connected component).
 */

import type { CompiledFn } from '$lib/mathAST/eval/compile';
import type { Viewport, SampledCurve, Point } from '../viewport/types';

/** Default grid resolution (cells per axis). */
const DEFAULT_GRID_SIZE = 200;

/**
 * Edge segment produced by a single marching-squares cell.
 * Each segment connects two points interpolated on cell edges.
 */
interface EdgeSegment {
	readonly p1: Point;
	readonly p2: Point;
}

/**
 * Marching squares lookup table.
 * For each of the 16 cell configurations (4 corners, each + or -),
 * lists the edge pairs to connect.
 * Edges: 0=top, 1=right, 2=bottom, 3=left.
 */
const EDGE_TABLE: readonly (readonly number[][])[] = [
	/* 0000 */ [],
	/* 0001 */ [[2, 3]],
	/* 0010 */ [[1, 2]],
	/* 0011 */ [[1, 3]],
	/* 0100 */ [[0, 1]],
	/* 0101 */ [
		[0, 3],
		[1, 2]
	], // saddle — disambiguated at runtime
	/* 0110 */ [[0, 2]],
	/* 0111 */ [[0, 3]],
	/* 1000 */ [[0, 3]],
	/* 1001 */ [[0, 2]],
	/* 1010 */ [
		[0, 1],
		[2, 3]
	], // saddle — disambiguated at runtime
	/* 1011 */ [[0, 1]],
	/* 1100 */ [[1, 3]],
	/* 1101 */ [[1, 2]],
	/* 1110 */ [[2, 3]],
	/* 1111 */ []
];

/**
 * Interpolate the zero-crossing along a cell edge.
 * Returns a value in [0, 1] representing position along the edge.
 */
function interpolate(v1: number, v2: number): number {
	if (Math.abs(v2 - v1) < 1e-12) return 0.5;
	return -v1 / (v2 - v1);
}

/**
 * Get the interpolated point on a given edge of a cell.
 * Edges: 0=top (TL→TR), 1=right (TR→BR), 2=bottom (BL→BR), 3=left (TL→BL).
 */
function edgePoint(
	edge: number,
	x: number,
	y: number,
	dx: number,
	dy: number,
	tl: number,
	tr: number,
	bl: number,
	br: number
): Point {
	switch (edge) {
		case 0: {
			// Top: TL → TR
			const t = interpolate(tl, tr);
			return { x: x + t * dx, y: y + dy };
		}
		case 1: {
			// Right: TR → BR
			const t = interpolate(tr, br);
			return { x: x + dx, y: y + dy - t * dy };
		}
		case 2: {
			// Bottom: BL → BR
			const t = interpolate(bl, br);
			return { x: x + t * dx, y: y };
		}
		case 3: {
			// Left: TL → BL
			const t = interpolate(tl, bl);
			return { x, y: y + dy - t * dy };
		}
		default:
			return { x, y };
	}
}

/**
 * Cache for marching-squares results.
 *
 * The implicit-curve renderer is in the hot path: it re-runs marching squares
 * (40 000 evaluations on a 200×200 grid) every time the SVG `{@const}` block
 * re-evaluates — i.e. every `version++`, every pan, every zoom. For drags
 * that don't touch the implicit curve (most of them), the result is
 * identical to the previous frame.
 *
 * Cache key: the curve's compiled function (object identity, stable as
 * long as the GeoImplicitCurve element isn't replaced). Cache value:
 * the last viewport+gridSize+result. Since `GeoImplicitCurve` is autonomous
 * (`dependsOn: readonly []`), the compiled function is strictly pure of
 * (x, y) — caching by fn identity is sound.
 *
 * WeakMap auto-releases entries when the implicit-curve element is replaced
 * (its compiled fn becomes unreachable from the figure → GC reclaims both).
 */
interface MarchingSquaresCacheEntry {
	readonly viewportKey: string;
	readonly gridSize: number;
	readonly result: SampledCurve[];
}
const cache = new WeakMap<CompiledFn, MarchingSquaresCacheEntry>();

function viewportKey(viewport: Viewport): string {
	return `${viewport.xMin}|${viewport.xMax}|${viewport.yMin}|${viewport.yMax}`;
}

/**
 * Run the marching squares algorithm on F(x,y) over the given viewport.
 *
 * Memoised by (fn, viewport, gridSize). Same arguments → returns the cached
 * SampledCurve[] reference (callers must not mutate). See cache notes above.
 *
 * @param fn - Compiled implicit function F(x,y)
 * @param viewport - Mathematical coordinate range
 * @param gridSize - Number of cells per axis (default 200)
 * @returns Array of SampledCurve, one per connected contour component
 */
export function marchingSquares(
	fn: CompiledFn,
	viewport: Viewport,
	gridSize: number = DEFAULT_GRID_SIZE
): SampledCurve[] {
	const key = viewportKey(viewport);
	const cached = cache.get(fn);
	if (cached && cached.viewportKey === key && cached.gridSize === gridSize) {
		return cached.result;
	}

	const result = computeMarchingSquares(fn, viewport, gridSize);
	cache.set(fn, { viewportKey: key, gridSize, result });
	return result;
}

function computeMarchingSquares(
	fn: CompiledFn,
	viewport: Viewport,
	gridSize: number
): SampledCurve[] {
	const nx = gridSize;
	const ny = gridSize;
	const dx = (viewport.xMax - viewport.xMin) / nx;
	const dy = (viewport.yMax - viewport.yMin) / ny;

	// Evaluate F at all grid vertices
	const values = new Float64Array((nx + 1) * (ny + 1));
	for (let j = 0; j <= ny; j++) {
		const y = viewport.yMin + j * dy;
		for (let i = 0; i <= nx; i++) {
			const x = viewport.xMin + i * dx;
			values[j * (nx + 1) + i] = fn({ x, y });
		}
	}

	// Collect all edge segments from each cell
	const segments: EdgeSegment[] = [];

	for (let j = 0; j < ny; j++) {
		for (let i = 0; i < nx; i++) {
			const bl = values[j * (nx + 1) + i];
			const br = values[j * (nx + 1) + i + 1];
			const tl = values[(j + 1) * (nx + 1) + i];
			const tr = values[(j + 1) * (nx + 1) + i + 1];

			// Skip cells with NaN/Infinity values
			if (
				!Number.isFinite(bl) ||
				!Number.isFinite(br) ||
				!Number.isFinite(tl) ||
				!Number.isFinite(tr)
			) {
				continue;
			}

			// Cell configuration (4-bit index from corner signs)
			const config = (tl >= 0 ? 8 : 0) | (tr >= 0 ? 4 : 0) | (br >= 0 ? 2 : 0) | (bl >= 0 ? 1 : 0);

			let edges = EDGE_TABLE[config];

			// Saddle disambiguation (cases 5 and 10)
			if (config === 5 || config === 10) {
				const cx = viewport.xMin + (i + 0.5) * dx;
				const cy = viewport.yMin + (j + 0.5) * dy;
				const center = fn({ x: cx, y: cy });
				if (Number.isFinite(center)) {
					if (config === 5) {
						edges =
							center >= 0
								? [
										[0, 1],
										[2, 3]
									]
								: [
										[0, 3],
										[1, 2]
									];
					} else {
						edges =
							center >= 0
								? [
										[0, 3],
										[1, 2]
									]
								: [
										[0, 1],
										[2, 3]
									];
					}
				}
			}

			const cellX = viewport.xMin + i * dx;
			const cellY = viewport.yMin + j * dy;

			for (const [e1, e2] of edges) {
				const p1 = edgePoint(e1, cellX, cellY, dx, dy, tl, tr, bl, br);
				const p2 = edgePoint(e2, cellX, cellY, dx, dy, tl, tr, bl, br);
				segments.push({ p1, p2 });
			}
		}
	}

	// Assemble segments into connected paths
	return assembleSegments(segments);
}

/**
 * Point comparison tolerance (in math coordinates).
 * Two points closer than this are considered the same.
 */
const POINT_EPS = 1e-10;

function pointsEqual(a: Point, b: Point): boolean {
	return Math.abs(a.x - b.x) < POINT_EPS && Math.abs(a.y - b.y) < POINT_EPS;
}

/**
 * Assemble unordered segments into connected polyline paths.
 * Uses a greedy chain-building approach.
 */
function assembleSegments(segments: EdgeSegment[]): SampledCurve[] {
	if (segments.length === 0) return [];

	const used = new Uint8Array(segments.length);
	const curves: SampledCurve[] = [];

	// Build a spatial index for fast endpoint lookup
	// Key: quantized coordinate string, Value: array of segment indices
	const quantize = (p: Point): string => `${Math.round(p.x * 1e8)},${Math.round(p.y * 1e8)}`;

	const index = new Map<string, number[]>();
	for (let i = 0; i < segments.length; i++) {
		const k1 = quantize(segments[i].p1);
		const k2 = quantize(segments[i].p2);
		if (!index.has(k1)) index.set(k1, []);
		index.get(k1)!.push(i);
		if (!index.has(k2)) index.set(k2, []);
		index.get(k2)!.push(i);
	}

	for (let start = 0; start < segments.length; start++) {
		if (used[start]) continue;
		used[start] = 1;

		const chain: Point[] = [segments[start].p1, segments[start].p2];

		// Extend chain forward from p2
		let extended = true;
		while (extended) {
			extended = false;
			const tail = chain[chain.length - 1];
			const key = quantize(tail);
			const candidates = index.get(key);
			if (!candidates) break;
			for (const idx of candidates) {
				if (used[idx]) continue;
				const seg = segments[idx];
				if (pointsEqual(seg.p1, tail)) {
					chain.push(seg.p2);
					used[idx] = 1;
					extended = true;
					break;
				} else if (pointsEqual(seg.p2, tail)) {
					chain.push(seg.p1);
					used[idx] = 1;
					extended = true;
					break;
				}
			}
		}

		// Extend chain backward from p1 (collect into prefix, then prepend once)
		const prefix: Point[] = [];
		let backHead = chain[0];
		extended = true;
		while (extended) {
			extended = false;
			const key = quantize(backHead);
			const candidates = index.get(key);
			if (!candidates) break;
			for (const idx of candidates) {
				if (used[idx]) continue;
				const seg = segments[idx];
				if (pointsEqual(seg.p1, backHead)) {
					backHead = seg.p2;
					prefix.push(backHead);
					used[idx] = 1;
					extended = true;
					break;
				} else if (pointsEqual(seg.p2, backHead)) {
					backHead = seg.p1;
					prefix.push(backHead);
					used[idx] = 1;
					extended = true;
					break;
				}
			}
		}
		if (prefix.length > 0) {
			prefix.reverse();
			chain.unshift(...prefix);
		}

		if (chain.length >= 2) {
			curves.push({ points: chain, discontinuityIndices: [] });
		}
	}

	return curves;
}
