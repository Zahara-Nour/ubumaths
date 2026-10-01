/**
 * Bloc ```courbe — scène (primitives en coordonnées mathématiques)
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene, type CourbeScene } from '../../utils/courbe-scene';

function scene(source: string, locale: 'fr' | 'en' = 'fr'): CourbeScene {
	const node = parseCourbeContent(source);
	expect(node.errors).toEqual([]);
	return buildCourbeScene(node.spec!, { locale });
}

const allPoints = (s: CourbeScene) => s.curves.flatMap((c) => c.polylines.flat());

describe('courbe — domaine (comportement 2)', () => {
	it('`sur [0;6]` : courbe arrêtée aux bornes, deux disques pleins', () => {
		const s = scene('x: -4 ; 8\ny: -2 ; 10\nf(x) = x/2 + 1 sur [0 ; 6]');
		const xs = allPoints(s).map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(0, 6);
		expect(Math.max(...xs)).toBeCloseTo(6, 6);
		expect(s.endpoints).toHaveLength(2);
		expect(s.endpoints.every((e) => !e.open)).toBe(true);
		expect(s.endpoints[0]).toMatchObject({ x: 0, y: 1 });
		expect(s.endpoints[1]).toMatchObject({ x: 6, y: 4 });
	});

	it('`sur ]0;6]` : borne ouverte = disque vide, fermée = disque plein', () => {
		const s = scene('x: -4 ; 8\ny: -2 ; 10\nf(x) = x/2 + 1 sur ]0 ; 6]');
		const at0 = s.endpoints.find((e) => e.x === 0)!;
		const at6 = s.endpoints.find((e) => e.x === 6)!;
		expect(at0.open).toBe(true);
		expect(at6.open).toBe(false);
	});

	it('sans `sur`, pas de disque aux bords de la fenêtre', () => {
		expect(scene('x: -4 ; 8\ny: -2 ; 10\nf(x) = x/2').endpoints).toEqual([]);
	});
});

describe('courbe — discontinuités et fenêtre (comportements 3 et 4)', () => {
	it('`1/(x-2)` : aucune polyligne ne traverse x = 2', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = 1/(x-2)');
		const polys = s.curves[0].polylines;
		expect(polys.length).toBeGreaterThanOrEqual(2);
		for (const poly of polys) {
			for (let i = 1; i < poly.length; i++) {
				const crosses = poly[i - 1].x < 2 && poly[i].x > 2;
				expect(crosses).toBe(false);
			}
		}
	});

	it('une courbe qui sort de la fenêtre est découpée au bord', () => {
		const s = scene('x: -4 ; 4\ny: -1 ; 4\nf(x) = x^2');
		const pts = allPoints(s);
		for (const p of pts) {
			expect(p.y).toBeGreaterThanOrEqual(-1 - 1e-9);
			expect(p.y).toBeLessThanOrEqual(4 + 1e-9);
			expect(p.x).toBeGreaterThanOrEqual(-4 - 1e-9);
			expect(p.x).toBeLessThanOrEqual(4 + 1e-9);
		}
		// Le tracé touche le bord haut (x = ±2) : découpé, pas abandonné
		const top = pts.filter((p) => Math.abs(p.y - 4) < 1e-6).map((p) => p.x);
		expect(top.some((x) => Math.abs(x + 2) < 1e-3)).toBe(true);
		expect(top.some((x) => Math.abs(x - 2) < 1e-3)).toBe(true);
	});

	it('un point hors fenêtre n’est pas dessiné et produit un avertissement', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = x\npoints: A(1 ; 2), B(10 ; 0)');
		expect(s.points.map((p) => p.name)).toEqual(['A']);
		expect(s.warnings).toHaveLength(1);
		expect(s.warnings[0].message).toMatch(/B/);
		expect(s.warnings[0].line).toBe(4);
	});

	it('M(2 ; f(2)) est posé sur la courbe (Q54)', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = -(x+2)*(x-4)/2\npoints: M(2 ; f(2))');
		expect(s.points[0]).toMatchObject({ name: 'M', x: 2, y: 4 });
	});
});

describe('courbe — grille et graduations (comportement 5)', () => {
	it('pas donné : graduations aux multiples du pas, par axe', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\ngrille: 1 ; 2\nf(x) = x');
		expect(s.grid.xStep).toBe(1);
		expect(s.grid.yStep).toBe(2);
		expect(s.grid.xs).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
		expect(s.grid.ys).toEqual([-8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12]);
		for (const t of s.ticks.y) expect(Math.abs(t.value % 2)).toBe(0);
	});

	it('pas automatique (computeGridStep) quand `grille` est absent', () => {
		const s = scene('x: -1 ; 1\ny: -100 ; 100\nf(x) = 50*x');
		expect(s.grid.xStep).toBeGreaterThan(0);
		expect(s.grid.yStep).toBeGreaterThan(s.grid.xStep);
		for (const t of s.ticks.x) {
			const k = t.value / s.grid.xStep;
			expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
		}
	});

	it('étiquettes décimales à la française : 0,5', () => {
		const s = scene('x: -1 ; 1\ny: -1 ; 1\ngrille: 0.5 ; 0.5\nf(x) = x');
		const labels = s.ticks.x.map((t) => t.label);
		expect(labels).toContain('0,5');
		expect(labels).toContain('−0,5');
		expect(labels.join(' ')).not.toMatch(/0\.5/);
	});

	it('en anglais : point décimal', () => {
		const s = scene('x: -1 ; 1\ny: -1 ; 1\ngrille: 0.5 ; 0.5\nf(x) = x', 'en');
		expect(s.ticks.x.map((t) => t.label)).toContain('0.5');
	});

	it('pas de bruit flottant : 0,3 et non 0,30000000000000004', () => {
		const s = scene('x: 0 ; 1\ny: 0 ; 1\ngrille: 0.1 ; 0.1\nf(x) = x');
		expect(s.ticks.x.map((t) => t.label)).toContain('0,3');
	});
});

describe('courbe — aire (comportement 6)', () => {
	it('`aire: f ; a ; b` produit un polygone fermé sur l’axe', () => {
		const s = scene('x: -4 ; 6\ny: -2 ; 12\nf(x) = x^2/2\naire: f ; -1 ; 2');
		expect(s.areas).toHaveLength(1);
		const poly = s.areas[0].polygon;
		expect(poly[0]).toEqual({ x: -1, y: 0 });
		expect(poly[poly.length - 1]).toEqual({ x: 2, y: 0 });
		const inner = poly.slice(1, -1);
		expect(inner[0].x).toBeCloseTo(-1);
		expect(inner[0].y).toBeCloseTo(0.5);
		expect(inner[inner.length - 1].y).toBeCloseTo(2);
		expect(s.areas[0].color).toBe('bleu');
	});
});

describe('courbe — asymptotes et étiquettes', () => {
	it('asymptote verticale et horizontale traversent la fenêtre', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = 1/(x-2)+1\nasymptotes: x=2 ; y=1');
		expect(s.asymptotes).toEqual([
			{ from: { x: 2, y: -8 }, to: { x: 2, y: 12 } },
			{ from: { x: -4, y: 1 }, to: { x: 6, y: 1 } }
		]);
	});

	it('nom de courbe placé dans la fenêtre', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = x  nom=C_f');
		expect(s.curveLabels).toHaveLength(1);
		const l = s.curveLabels[0];
		expect(l.label.base).toBe('C');
		expect(l.x).toBeGreaterThanOrEqual(-4);
		expect(l.x).toBeLessThanOrEqual(6);
		expect(l.y).toBeGreaterThanOrEqual(-8);
		expect(l.y).toBeLessThanOrEqual(12);
	});

	it('libellé accessible par défaut', () => {
		const s = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = x\ng(x) = 2');
		expect(s.ariaLabel).toBe('Courbes de f et g, x de −4 à 6');
		const d = scene('x: -4 ; 6\ny: -8 ; 12\nf(x) = x\ndescription: Une droite.');
		expect(d.ariaLabel).toBe('Une droite.');
	});
});
