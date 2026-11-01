import { describe, expect, it } from 'vitest';
import { buildSpiral } from '../spiral';

const OPTIONS = { size: 400, turns: 2.5, innerRadius: 18, outerRadius: 180, stops: 6 };

/** Distance d'un point au centre du carré */
const distance = (p: { x: number; y: number }) => Math.hypot(p.x - 200, p.y - 200);

describe('buildSpiral', () => {
	it('place une étape par Province, à intervalles réguliers du tracé', () => {
		const { stops } = buildSpiral(OPTIONS);
		expect(stops.map((s) => s.progress)).toEqual([1, 2, 3, 4, 5, 6].map((k) => k / 7));
	});

	it('s’enroule vers le Trône : chaque étape est plus près du centre que la précédente', () => {
		const { stops, center } = buildSpiral(OPTIONS);
		const distances = stops.map(distance);
		for (let i = 1; i < distances.length; i++) {
			expect(distances[i]).toBeLessThan(distances[i - 1]);
		}
		expect(distance(center)).toBeCloseTo(OPTIONS.innerRadius, 0);
	});

	it('reste dans le cadre', () => {
		const { stops, d } = buildSpiral(OPTIONS);
		const coordinates = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
		expect(Math.min(...coordinates)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...coordinates)).toBeLessThanOrEqual(OPTIONS.size);
		for (const stop of stops) expect(distance(stop)).toBeLessThanOrEqual(OPTIONS.outerRadius);
	});

	it('commence en haut, au bord', () => {
		const { d } = buildSpiral(OPTIONS);
		const [x, y] = d.slice(1).split(/[ L]/).map(Number);
		expect(x).toBeCloseTo(200, 0);
		expect(y).toBeCloseTo(20, 0);
	});
});
