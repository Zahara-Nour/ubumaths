import { describe, expect, it } from 'vitest';
import { buildSpiral, placeLabel, PROVINCE_MAP } from '../spiral';
import { PROVINCES } from '../tour';

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

describe('la carte des Provinces (réglage de production)', () => {
	const { size, turns, innerRadius, outerRadius, charWidth } = PROVINCE_MAP;
	const spiral = buildSpiral({ size, turns, innerRadius, outerRadius, stops: PROVINCES.length });
	const NODE = 17; // rayon d'une étape agrandie
	const THRONE = 24; // rayon du Trône (cercle central)

	type Box = { x0: number; y0: number; x1: number; y1: number };
	const overlap = (a: Box, b: Box) =>
		!(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1);
	const labels: Box[] = spiral.stops.map((stop, i) => {
		const label = placeLabel(stop, PROVINCES[i].name, size);
		const width = PROVINCES[i].name.length * charWidth;
		const x0 = label.anchor === 'start' ? label.x : label.x - width;
		return { x0, y0: label.y - 17, x1: x0 + width, y1: label.y + 1 };
	});
	const nodes: Box[] = spiral.stops.map((s) => ({
		x0: s.x - NODE,
		y0: s.y - NODE,
		x1: s.x + NODE,
		y1: s.y + NODE
	}));
	const c = spiral.center;
	// Le Trône et son nom « Sandomir », dessous
	const throne: Box = { x0: c.x - THRONE, y0: c.y - THRONE, x1: c.x + THRONE, y1: c.y + 46 };

	it('finit au centre exact du cadre : le Trône y est', () => {
		expect(c).toEqual({ x: size / 2, y: size / 2 });
	});

	it('aucun nom ne sort du cadre', () => {
		for (const box of labels) {
			expect(box.x0).toBeGreaterThanOrEqual(0);
			expect(box.x1).toBeLessThanOrEqual(size);
		}
	});

	it('aucun nom ne chevauche un autre nom, une étape ou le Trône', () => {
		labels.forEach((label, i) => {
			expect(overlap(label, throne), PROVINCES[i].name).toBe(false);
			labels.forEach((other, j) => {
				if (j !== i) expect(overlap(label, other), `${i}/${j}`).toBe(false);
			});
			nodes.forEach((node, j) => {
				if (j !== i) expect(overlap(label, node), `${PROVINCES[i].name}/${j}`).toBe(false);
			});
		});
	});

	it('aucune étape ne touche le Trône ni une autre étape', () => {
		nodes.forEach((node, i) => {
			expect(overlap(node, throne), String(i)).toBe(false);
			nodes.forEach((other, j) => {
				if (j > i) expect(overlap(node, other), `${i}/${j}`).toBe(false);
			});
		});
	});
});
