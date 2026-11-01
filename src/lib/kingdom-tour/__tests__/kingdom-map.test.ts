import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	CITY_LABELS,
	KINGDOM_MAP,
	KINGDOM_OUTLINE,
	PROVINCE_AREAS,
	PROVINCE_LABELS
} from '../kingdom-map';
import { CITIES } from '../cities';
import { PROVINCES } from '../tour';

// Functions

/** Les sommets d'un chemin SVG fait de M, L (et d'un arc final, dont on garde l'extrémité) */
function vertices(d: string): [number, number][] {
	return [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [
		Number(m[1]),
		Number(m[2])
	]);
}

/** Point dans un polygone (règle pair-impair) */
function inside([x, y]: [number, number], polygon: [number, number][]): boolean {
	let result = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
	}
	return result;
}

describe('la grande carte du Royaume', () => {
	it('les fonds existent sous static/', () => {
		for (const image of KINGDOM_MAP.images) {
			expect(existsSync(join(process.cwd(), 'static', image.src)), image.src).toBe(true);
		}
	});

	it('chaque nom de Province tombe dans sa surface, et dans le Royaume', () => {
		const outline = vertices(KINGDOM_OUTLINE);
		for (const province of PROVINCES) {
			const { x, y } = PROVINCE_LABELS[province.id];
			expect(inside([x, y], vertices(PROVINCE_AREAS[province.id])), province.id).toBe(true);
			expect(inside([x, y], outline), province.id).toBe(true);
			for (const other of PROVINCES.filter((p) => p.id !== province.id)) {
				expect(inside([x, y], vertices(PROVINCE_AREAS[other.id])), other.id).toBe(false);
			}
		}
	});

	it('chaque capitale est nommée dans sa Province', () => {
		for (const city of CITIES) {
			if (!city.province) continue;
			const { x, y } = CITY_LABELS[city.slug];
			expect(inside([x, y], vertices(PROVINCE_AREAS[city.province])), city.slug).toBe(true);
		}
	});

	it('un nom par ville, Sandomir comprise', () => {
		expect(Object.keys(CITY_LABELS).sort()).toEqual(CITIES.map((c) => c.slug).sort());
		expect(CITY_LABELS.sandomir.kind).toBe('royal');
	});
});
