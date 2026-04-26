/**
 * Conic parametric helpers — shared by Figure and rendering.
 */

import type { ConicParams } from '../types/elements';

/** Compute the (x,y) position on a conic at parameter t (radians). */
export function conicPointFromParam(
	conic: ConicParams,
	t: number
): { x: number; y: number } | null {
	if (conic.type === 'degenerate') return null;

	const cos = Math.cos(conic.rotation);
	const sin = Math.sin(conic.rotation);
	const cx = conic.center?.x ?? conic.vertex?.x ?? 0;
	const cy = conic.center?.y ?? conic.vertex?.y ?? 0;

	let lx: number, ly: number;

	switch (conic.type) {
		case 'circle':
		case 'ellipse':
			lx = conic.a * Math.cos(t);
			ly = conic.b * Math.sin(t);
			break;
		case 'hyperbola':
			lx = conic.a * Math.cosh(t);
			ly = conic.b * Math.sinh(t);
			break;
		case 'parabola': {
			const p = conic.p ?? conic.a;
			lx = (t * t) / (2 * p);
			ly = t;
			break;
		}
	}

	return {
		x: cx + lx * cos - ly * sin,
		y: cy + lx * sin + ly * cos
	};
}

/** Find the parameter t closest to (px, py) on a conic, by sampling. */
export function conicClosestParam(conic: ConicParams, px: number, py: number): number {
	const n = 360;
	let bestT = 0;
	let bestDist = Infinity;

	const check = (t: number) => {
		const pt = conicPointFromParam(conic, t);
		if (!pt) return;
		const d = (px - pt.x) ** 2 + (py - pt.y) ** 2;
		if (d < bestDist) {
			bestDist = d;
			bestT = t;
		}
	};

	switch (conic.type) {
		case 'circle':
		case 'ellipse':
			for (let i = 0; i < n; i++) {
				check((2 * Math.PI * i) / n);
			}
			break;
		case 'hyperbola': {
			const tMax = 5;
			for (let i = 0; i <= n; i++) {
				check(-tMax + (2 * tMax * i) / n);
			}
			break;
		}
		case 'parabola': {
			const tMax = 20;
			for (let i = 0; i <= n; i++) {
				check(-tMax + (2 * tMax * i) / n);
			}
			break;
		}
	}

	return bestT;
}
