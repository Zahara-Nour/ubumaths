/**
 * Bloc ```partage — la scène (géométrie partagée écran / PDF)
 */

import { describe, expect, it } from 'vitest';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import {
	buildPartageScene,
	partageLabel,
	type PartagePoint
} from '$lib/ubumark/utils/partage-scene';
import type { PartageSpec } from '$lib/ubumark/types/partage';

function specOf(...lines: string[]): PartageSpec {
	const { spec, errors } = parsePartageContent(lines.join('\n'));
	expect(errors).toEqual([]);
	return spec as PartageSpec;
}
const scene = (...lines: string[]) => buildPartageScene(specOf(...lines));

/** Aire d'un polygone (formule des lacets) */
function area(points: PartagePoint[]): number {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const a = points[i];
		const b = points[(i + 1) % points.length];
		sum += a.x * b.y - b.x * a.y;
	}
	return Math.abs(sum) / 2;
}
const centroid = (points: PartagePoint[]): PartagePoint => ({
	x: points.reduce((s, p) => s + p.x, 0) / points.length,
	y: points.reduce((s, p) => s + p.y, 0) / points.length
});

describe('scène — parts égales et numérotation', () => {
	it('bande de 8 : 8 rectangles de même aire, de gauche à droite', () => {
		const { parts } = scene('forme: bande 8');
		expect(parts.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		const areas = parts.map((p) => area(p.points));
		for (const a of areas) expect(a).toBeCloseTo(areas[0], 6);
		const xs = parts.map((p) => centroid(p.points).x);
		expect([...xs].sort((a, b) => a - b)).toEqual(xs);
	});

	it('grille 3×4 : 12 cases égales, ligne par ligne depuis le coin haut gauche', () => {
		const { parts } = scene('forme: grille 3×4');
		expect(parts).toHaveLength(12);
		const areas = parts.map((p) => area(p.points));
		for (const a of areas) expect(a).toBeCloseTo(areas[0], 6);
		const c = parts.map((p) => centroid(p.points));
		// Part 1 : coin haut gauche ; part 4 : haut droite ; part 5 : 2e ligne, à gauche
		expect(c[0].x).toBeLessThan(c[3].x);
		expect(c[0].y).toBeCloseTo(c[3].y, 6);
		expect(c[4].x).toBeCloseTo(c[0].x, 6);
		expect(c[4].y).toBeGreaterThan(c[0].y);
		expect(c[11].x).toBeCloseTo(c[3].x, 6);
		expect(c[11].y).toBeGreaterThan(c[7].y);
	});

	it('grille 10×10 : 100 parts, la figure tient dans 300 unités', () => {
		const s = scene('forme: grille 10×10');
		expect(s.parts).toHaveLength(100);
		expect(s.width).toBeLessThanOrEqual(300);
		expect(s.height).toBeLessThanOrEqual(300);
	});

	it('disque de 6 : 6 secteurs égaux, le 1er juste à droite de midi, sens horaire', () => {
		const { parts, width, height } = scene('forme: disque 6');
		expect(parts).toHaveLength(6);
		const cx = width / 2;
		const cy = height / 2;
		const areas = parts.map((p) => area(p.points));
		for (const a of areas) expect(a).toBeCloseTo(areas[0], 0);
		// Angle (depuis midi, sens horaire) du centre de gravité de chaque secteur
		const angles = parts.map((p) => {
			const c = centroid(p.points);
			const a = (Math.atan2(c.x - cx, cy - c.y) * 180) / Math.PI;
			return (a + 360) % 360;
		});
		for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
		expect(angles[0]).toBeGreaterThan(0);
		expect(angles[0]).toBeLessThan(60);
		// Chaque secteur part du centre
		for (const p of parts) {
			expect(p.points[0].x).toBeCloseTo(cx, 6);
			expect(p.points[0].y).toBeCloseTo(cy, 6);
		}
	});

	it('disque de 2 : deux demi-disques, la part 1 à droite', () => {
		const { parts, width } = scene('forme: disque 2');
		expect(centroid(parts[0].points).x).toBeGreaterThan(width / 2);
		expect(centroid(parts[1].points).x).toBeLessThan(width / 2);
	});

	it('carre-diagonales : 4 triangles égaux, haut, droite, bas, gauche', () => {
		const { parts, width, height } = scene('forme: carre-diagonales');
		expect(parts).toHaveLength(4);
		for (const p of parts) {
			expect(p.points).toHaveLength(3);
			expect(area(p.points)).toBeCloseTo((width * height) / 4, 6);
		}
		const [haut, droite, bas, gauche] = parts.map((p) => centroid(p.points));
		expect(haut.y).toBeLessThan(height / 2);
		expect(droite.x).toBeGreaterThan(width / 2);
		expect(bas.y).toBeGreaterThan(height / 2);
		expect(gauche.x).toBeLessThan(width / 2);
	});

	it('les sommets restent dans la figure', () => {
		for (const forme of ['bande 5', 'grille 2×7', 'disque 7', 'carre-diagonales']) {
			const s = scene(`forme: ${forme}`);
			for (const p of s.parts.flatMap((part) => part.points)) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(s.width + 1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeLessThanOrEqual(s.height + 1e-9);
			}
		}
	});
});

describe('scène — parts coloriées', () => {
	it('gris: 3 colorie les rangs 1 à 3', () => {
		const { parts } = scene('forme: bande 8', 'gris: 3');
		expect(parts.filter((p) => p.shaded).map((p) => p.rank)).toEqual([1, 2, 3]);
	});

	it('liste : exactement ces rangs', () => {
		const { parts } = scene('forme: grille 2×5', 'gris: 1, 4, 10');
		expect(parts.filter((p) => p.shaded).map((p) => p.rank)).toEqual([1, 4, 10]);
	});

	it('sans gris : aucune', () => {
		expect(scene('forme: disque 5').parts.some((p) => p.shaded)).toBe(false);
	});
});

describe('nom accessible : la forme, jamais la réponse', () => {
	it('ni le nombre de parts ni le nombre de parts coloriées', () => {
		const cases: [string[], string][] = [
			[['forme: bande 8', 'gris: 3'], 'Bande partagée en parts égales'],
			[['forme: disque 6'], 'Disque partagé en parts égales'],
			[['forme: grille 10×10', 'gris: 30'], 'Grille partagée en parts égales'],
			[
				['forme: carre-diagonales', 'gris: 2, 3'],
				'Carré partagé en parts égales par ses diagonales'
			]
		];
		for (const [lines, label] of cases) {
			expect(partageLabel(specOf(...lines)), lines.join(' ; ')).toBe(label);
			expect(partageLabel(specOf(...lines))).not.toMatch(/\d/);
		}
	});
});
