/**
 * Bloc ```cubes : la scène (calcul pur, partagé écran / PDF)
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { buildEspaceScene, espaceLabel } from '$lib/ubumark/utils/espace-scene';
import type { CubesSpec, CubesView } from '$lib/ubumark/types/espace';

const spec = (heights: string, view: CubesView = 'perspective'): CubesSpec => {
	const node = parseEspaceContent(`hauteurs: ${heights}\nvue: ${view}`);
	if (node.spec?.kind !== 'cubes') throw new Error(node.errors.join());
	return node.spec;
};
const scene = (heights: string, view: CubesView = 'perspective') =>
	buildEspaceScene(spec(heights, view));
const count = (heights: string, view: CubesView, kind: string) =>
	scene(heights, view).polygons.filter((p) => p.kind === kind).length;

/** Les carrés d'une vue, sous la forme de colonnes de hauteurs lues de gauche à droite */
function columns(heights: string, view: CubesView): number[] {
	const squares = scene(heights, view).polygons.map((p) => p.points[0]);
	const xs = [...new Set(squares.map((s) => Math.round(s.x)))].sort((a, b) => a - b);
	return xs.map((x) => squares.filter((s) => Math.round(s.x) === x).length);
}

describe('perspective cavalière', () => {
	it('un cube : trois faces, devant en vraie grandeur', () => {
		const s = scene('1');
		expect(s.polygons.map((p) => p.kind).sort()).toEqual(['cote', 'dessus', 'devant']);
		const front = s.polygons.find((p) => p.kind === 'devant')!;
		const [a, b, , d] = front.points;
		expect(b.x - a.x).toBeCloseTo(1);
		expect(a.y - d.y).toBeCloseTo(1);
	});

	it('fuyantes à 45° vers le haut à droite, réduites de moitié', () => {
		const top = scene('1').polygons.find((p) => p.kind === 'dessus')!;
		const [frontLeft, , , backLeft] = top.points;
		const dx = backLeft.x - frontLeft.x;
		const dy = frontLeft.y - backLeft.y;
		expect(dx).toBeGreaterThan(0);
		expect(dx).toBeCloseTo(dy);
		expect(Math.hypot(dx, dy)).toBeCloseTo(0.5);
	});

	it('2 1 1 / 1 0 1 : les 6 cubes, 13 faces, le trou visible', () => {
		expect(count('2 1 1 / 1 0 1', 'perspective', 'devant')).toBe(4);
		expect(count('2 1 1 / 1 0 1', 'perspective', 'dessus')).toBe(5);
		expect(count('2 1 1 / 1 0 1', 'perspective', 'cote')).toBe(4);
	});

	it('une face collée à un cube voisin n’est pas émise', () => {
		// Deux cubes côte à côte : une seule face de droite, deux de devant et de dessus
		expect(count('1 1', 'perspective', 'cote')).toBe(1);
		expect(count('1 1', 'perspective', 'devant')).toBe(2);
		// Deux cubes l'un sur l'autre : un seul dessus
		expect(count('2', 'perspective', 'dessus')).toBe(1);
		// Deux cubes l'un derrière l'autre : un seul devant
		expect(count('1 / 1', 'perspective', 'devant')).toBe(1);
	});

	it('pile cachée : elle compte, ne se voit pas (aucune face émise)', () => {
		// 2 × 2 de hauteur 2 : le cube du fond à gauche, en bas, est entouré
		const faces = scene('2 2 / 2 2').polygons;
		expect(faces).toHaveLength(12);
		// Contre-épreuve : 2 × 2 de hauteur 1 = 2 devant + 4 dessus + 2 côté
		expect(scene('1 1 / 1 1').polygons).toHaveLength(8);
	});

	it('0 0 / 0 3 : une pile de 3, bords vides retirés', () => {
		const s = scene('0 0 / 0 3');
		expect(s.polygons.filter((p) => p.kind === 'devant')).toHaveLength(3);
		expect(s.polygons.filter((p) => p.kind === 'dessus')).toHaveLength(1);
		expect(s.polygons.filter((p) => p.kind === 'cote')).toHaveLength(3);
	});

	it('ordre du peintre : le fond avant le devant', () => {
		// Pile haute au fond, cube devant : le devant est dessiné après
		const s = scene('3 / 1');
		const frontOfBack = s.polygons.findIndex((p) => p.kind === 'devant' && p.points[0].y < 2);
		const frontOfFront = s.polygons.findLastIndex((p) => p.kind === 'devant');
		expect(frontOfBack).toBeGreaterThanOrEqual(0);
		expect(frontOfFront).toBeGreaterThan(frontOfBack);
	});

	it('le dessin est ramené au coin haut gauche, arête de 1 cm', () => {
		const s = scene('2 1 1 / 1 0 1');
		const xs = s.polygons.flatMap((p) => p.points.map((pt) => pt.x));
		const ys = s.polygons.flatMap((p) => p.points.map((pt) => pt.y));
		expect(Math.min(...xs)).toBeCloseTo(0);
		expect(Math.min(...ys)).toBeCloseTo(0);
		expect(Math.max(...xs)).toBeCloseTo(s.width);
		expect(Math.max(...ys)).toBeCloseTo(s.height);
		// 3 colonnes + déport des 2 rangées
		expect(s.width).toBeCloseTo(3 + 2 * 0.5 * Math.SQRT1_2);
	});
});

describe('les quatre vues', () => {
	const H = '2 1 1 / 1 0 1';

	it('face : par colonne, la plus haute pile', () => {
		expect(columns(H, 'face')).toEqual([2, 1, 1]);
	});

	it('dessus : 5 carrés, le trou en bas au milieu, le fond en haut', () => {
		const squares = scene(H, 'dessus').polygons.map((p) => p.points[0]);
		expect(squares).toHaveLength(5);
		const has = (x: number, y: number) =>
			squares.some((s) => Math.round(s.x) === x && Math.round(s.y) === y);
		expect(has(0, 0) && has(1, 0) && has(2, 0)).toBe(true);
		expect(has(0, 1)).toBe(true);
		expect(has(1, 1)).toBe(false);
		expect(has(2, 1)).toBe(true);
	});

	it('droite : le devant à gauche (1 puis 2)', () => {
		expect(columns(H, 'droite')).toEqual([1, 2]);
	});

	it('gauche : le devant à droite (2 puis 1)', () => {
		expect(columns(H, 'gauche')).toEqual([2, 1]);
	});

	it('les carrés ont 1 cm de côté et reposent sur le bas', () => {
		const s = scene(H, 'face');
		for (const p of s.polygons) {
			expect(p.kind).toBe('case');
			expect(p.points[1].x - p.points[0].x).toBeCloseTo(1);
			expect(p.points[2].y - p.points[1].y).toBeCloseTo(1);
		}
		expect(s.height).toBeCloseTo(2);
		expect(s.width).toBeCloseTo(3);
	});

	it('1 × 1 de hauteur 1 : un carré dans chaque vue', () => {
		for (const view of ['dessus', 'face', 'droite', 'gauche'] as const) {
			expect(scene('1', view).polygons).toHaveLength(1);
		}
	});
});

describe('nom accessible', () => {
	it('dit la vue, jamais le nombre de cubes', () => {
		expect(espaceLabel(spec('2 1 1 / 1 0 1'))).toBe('Assemblage de cubes en perspective');
		expect(espaceLabel(spec('2 1', 'face'))).toBe('Vue de face d’un assemblage de cubes');
		for (const view of ['perspective', 'dessus', 'face', 'droite', 'gauche'] as const) {
			expect(espaceLabel(spec('2 3 / 1 1', view))).not.toMatch(/\d/);
		}
	});
});
