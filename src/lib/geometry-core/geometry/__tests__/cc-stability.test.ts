import { intersectCC } from '../intersections';
import { numeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { describe, it, expect } from 'vitest';

describe('CC intersection ordering stability', () => {
	it('returns 2 points at all angles when circles always intersect', () => {
		// c1: center (0,0), radius 3. c2: center on c1, radius 2.
		// d=3, r1+r2=5, |r1-r2|=1 → always 2 intersection points.
		const center1 = { x: numeric(0), y: numeric(0) };
		const r1 = numeric(3);
		const r2 = numeric(2);
		const N = 360;

		for (let i = 0; i <= N; i++) {
			const theta = (i / N) * 2 * Math.PI;
			const center2 = { x: numeric(3 * Math.cos(theta)), y: numeric(3 * Math.sin(theta)) };
			const pts = intersectCC(center1, r1, center2, r2);
			expect(pts, `null at θ=${((theta * 180) / Math.PI).toFixed(1)}°`).not.toBeNull();
			expect(
				pts!.length,
				`only ${pts!.length} point at θ=${((theta * 180) / Math.PI).toFixed(1)}°`
			).toBe(2);
		}
	});

	it('does not jump between branches as center2 rotates', () => {
		const center1 = { x: numeric(0), y: numeric(0) };
		const r1 = numeric(3);
		const r2 = numeric(2);
		const N = 720;
		let prevPoint: { x: number; y: number } | null = null;

		for (let i = 0; i <= N; i++) {
			const theta = (i / N) * 2 * Math.PI;
			const center2 = { x: numeric(3 * Math.cos(theta)), y: numeric(3 * Math.sin(theta)) };
			const pts = intersectCC(center1, r1, center2, r2);
			if (!pts || pts.length < 2) continue;

			const p = { x: geoToNumber(pts[0].x), y: geoToNumber(pts[0].y) };
			if (prevPoint) {
				const dist = Math.sqrt((p.x - prevPoint.x) ** 2 + (p.y - prevPoint.y) ** 2);
				// Max expected step for N=720 on a circle of radius 3 is ~0.03
				expect(dist, `jump at θ=${((theta * 180) / Math.PI).toFixed(1)}°`).toBeLessThan(0.2);
			}
			prevPoint = p;
		}
	});
});
