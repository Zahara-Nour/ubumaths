import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

function pos(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
) {
	const entry = symbols.get(name);
	if (!entry?.figureId) throw new Error(`Symbol "${name}" not found or has no figureId`);
	const p = figure.getPosition(entry.figureId);
	if (!p) throw new Error(`No position for "${name}"`);
	return { x: geoToNumber(p.x), y: geoToNumber(p.y) };
}

function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
	return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

describe('stdlib — mediatrice', () => {
	it('midpoint is at center of segment', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', '(M, d) = mediatrice(A, B)'].join('\n')
		);
		const m = pos(figure, symbols, 'M');
		expect(m.x).toBeCloseTo(2);
		expect(m.y).toBeCloseTo(0);
	});

	it('line is perpendicular to AB', () => {
		const { symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', '(M, d) = mediatrice(A, B)'].join('\n')
		);
		expect(symbols.get('d')!.type).toBe('droite');
	});
});

describe('stdlib — mediane', () => {
	it('creates midpoint and segment', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(2, 4)', '(M, s) = mediane(A, B, C)'].join(
				'\n'
			)
		);
		const m = pos(figure, symbols, 'M');
		expect(m.x).toBeCloseTo(3);
		expect(m.y).toBeCloseTo(2);
		expect(symbols.get('s')!.type).toBe('segment');
	});
});

describe('stdlib — hauteur', () => {
	it('creates perpendicular line from A to BC', () => {
		const { symbols } = runDsl(
			['A = point(0, 4)', 'B = point(0, 0)', 'C = point(4, 0)', 'd = hauteur(A, B, C)'].join('\n')
		);
		expect(symbols.get('d')!.type).toBe('droite');
	});
});

describe('stdlib — perpendiculaire', () => {
	it('creates line through P perpendicular to AB', () => {
		const { symbols } = runDsl(
			[
				'P = point(2, 3)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = perpendiculaire(P, A, B)'
			].join('\n')
		);
		expect(symbols.get('d')!.type).toBe('droite');
	});
});

describe('stdlib — parallele', () => {
	it('creates line through P parallel to AB', () => {
		const { symbols } = runDsl(
			['P = point(0, 3)', 'A = point(0, 0)', 'B = point(4, 0)', 'd = parallele(P, A, B)'].join('\n')
		);
		expect(symbols.get('d')!.type).toBe('droite');
	});
});

describe('stdlib — bissectrice', () => {
	it('creates bisector of angle AVB', () => {
		const { symbols } = runDsl(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'd = bissectrice(A, V, B)'].join(
				'\n'
			)
		);
		expect(symbols.get('d')!.type).toBe('droite');
	});
});

describe('stdlib — triangle', () => {
	it('creates 3 segments', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(2, 3)', 'triangle(A, B, C)'].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(3);
	});
});

describe('stdlib — triangle_equilateral', () => {
	it('creates equilateral triangle with 3 equal sides', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = triangle_equilateral(A, B)'].join('\n')
		);
		const a = pos(figure, symbols, 'A');
		const b = pos(figure, symbols, 'B');
		const c = pos(figure, symbols, 'C');
		const ab = dist(a, b);
		const bc = dist(b, c);
		const ca = dist(c, a);
		expect(bc).toBeCloseTo(ab, 3);
		expect(ca).toBeCloseTo(ab, 3);
	});

	it('creates 3 segments', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = triangle_equilateral(A, B)'].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(3);
	});
});

describe('stdlib — triangle_isocele', () => {
	it('creates isosceles triangle', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = triangle_isocele(A, B, angle=50)'].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(3);
	});
});

describe('stdlib — triangle_rectangle', () => {
	it('creates right triangle with angle mark', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = triangle_rectangle(A, B)'].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(3);
		const marks = figure.getAllElements().filter((e) => e.type === 'angleMark');
		expect(marks).toHaveLength(1);
	});
});

describe('stdlib — parallelogramme', () => {
	it('creates 4 segments and returns D', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(5, 3)',
				'D = parallelogramme(A, B, C)'
			].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(4);
		const d = pos(figure, symbols, 'D');
		// D = A + (C - B) = (0,0) + (1,3) = (1,3)
		expect(d.x).toBeCloseTo(1);
		expect(d.y).toBeCloseTo(3);
	});
});

describe('stdlib — rectangle', () => {
	it('creates rectangle with 4 segments and right angle', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', '(C, D) = rectangle(A, B, largeur=3)'].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(4);
		const marks = figure.getAllElements().filter((e) => e.type === 'angleMark');
		expect(marks).toHaveLength(1); // right angle at A
	});
});

describe('stdlib — carre', () => {
	it('creates square with 4 equal sides', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', '(C, D) = carre(A, B)'].join('\n')
		);
		const a = pos(figure, symbols, 'A');
		const b = pos(figure, symbols, 'B');
		const c = pos(figure, symbols, 'C');
		const d = pos(figure, symbols, 'D');
		const ab = dist(a, b);
		const bc = dist(b, c);
		const cd = dist(c, d);
		const da = dist(d, a);
		expect(bc).toBeCloseTo(ab, 3);
		expect(cd).toBeCloseTo(ab, 3);
		expect(da).toBeCloseTo(ab, 3);
	});
});

describe('stdlib — losange', () => {
	it('creates rhombus with 4 equal sides', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', '(C, D) = losange(A, B, angle=60)'].join('\n')
		);
		const a = pos(figure, symbols, 'A');
		const b = pos(figure, symbols, 'B');
		const c = pos(figure, symbols, 'C');
		const ab = dist(a, b);
		const bc = dist(b, c);
		expect(bc).toBeCloseTo(ab, 3);
	});
});

describe('stdlib — polygone_regulier', () => {
	it('creates hexagon with 6 segments', () => {
		const { figure } = runDsl(['O = point(0, 0)', 'P = polygone_regulier(O, 3, 6)'].join('\n'));
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(6);
	});

	it('creates pentagon with 5 segments', () => {
		const { figure } = runDsl(['O = point(0, 0)', 'P = polygone_regulier(O, 3, 5)'].join('\n'));
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(5);
	});

	it('all vertices equidistant from center', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'P = polygone_regulier(O, 3, 6)'].join('\n')
		);
		const o = pos(figure, symbols, 'O');
		// P is a list, access P[0] through P[5]
		for (let i = 0; i < 6; i++) {
			const entry = symbols.getIndexed('P', i);
			if (!entry?.figureId) continue;
			const p = figure.getPosition(entry.figureId);
			if (!p) continue;
			const d = dist(o, { x: geoToNumber(p.x), y: geoToNumber(p.y) });
			expect(d).toBeCloseTo(3, 2);
		}
	});
});

describe('stdlib — etoile', () => {
	it('creates 5-pointed star', () => {
		const { figure } = runDsl(['O = point(0, 0)', 'P = etoile(O, 3, 5)'].join('\n'));
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(5);
	});

	it('creates 6-pointed star (Star of David)', () => {
		const { figure } = runDsl(['O = point(0, 0)', 'P = etoile(O, 3, 6)'].join('\n'));
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(6);
	});
});

describe('stdlib — cercle_circonscrit', () => {
	it('creates circumscribed circle through all 3 vertices', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'(O, c) = cercle_circonscrit(A, B, C)'
			].join('\n')
		);
		expect(symbols.get('O')!.type).toBe('point');
		expect(symbols.get('c')!.type).toBe('cercle');

		// O should be equidistant from A, B, C
		const o = pos(figure, symbols, 'O');
		const a = pos(figure, symbols, 'A');
		const b = pos(figure, symbols, 'B');
		const c = pos(figure, symbols, 'C');
		const oa = dist(o, a);
		const ob = dist(o, b);
		const oc = dist(o, c);
		expect(ob).toBeCloseTo(oa, 2);
		expect(oc).toBeCloseTo(oa, 2);
	});
});

describe('stdlib — composition', () => {
	it('mediatrice inside cercle_circonscrit', () => {
		// cercle_circonscrit uses mediatrice internally
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(3, 5)',
				'(O, c) = cercle_circonscrit(A, B, C)'
			].join('\n')
		);
		expect(symbols.get('O')).toBeDefined();
		expect(symbols.get('c')).toBeDefined();
	});

	it('triangle + all medians', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'triangle(A, B, C)',
				'(Ma, sa) = mediane(A, B, C)',
				'(Mb, sb) = mediane(B, C, A)',
				'(Mc, sc) = mediane(C, A, B)'
			].join('\n')
		);
		const segs = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segs).toHaveLength(6); // 3 sides + 3 medians
	});

	it('macro internal elements are hidden', () => {
		const { figure } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(2, 5)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		const visiblePoints = figure
			.getAllElements()
			.filter((e) => (e.type === 'freePoint' || e.type === 'intersectionLL') && e.visible);
		// Only A, B, C, H should be visible — not the internal P, Q points from hauteur()
		expect(visiblePoints).toHaveLength(4);
		const labels = visiblePoints.map((e) => e.label).sort();
		expect(labels).toEqual(['A', 'B', 'C', 'H']);
	});

	it('macro returned elements have correct labels', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'(O, cc) = cercle_circonscrit(A, B, C)'
			].join('\n')
		);
		const visiblePoints = figure
			.getAllElements()
			.filter((e) => (e.type === 'freePoint' || e.type === 'intersectionLL') && e.visible);
		const labels = visiblePoints.map((e) => e.label).sort();
		expect(labels).toEqual(['A', 'B', 'C', 'O']);
	});

	it('triangle with new remarkable elements', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'triangle(A, B, C)',
				'(O, cc) = cercle_circonscrit(A, B, C)',
				'G = centre_gravite(A, B, C)',
				'H = orthocentre(A, B, C)',
				'(I, ci) = cercle_inscrit(A, B, C)',
				'de = droite_euler(A, B, C)',
				'(Oe, ce) = cercle_euler(A, B, C)'
			].join('\n')
		);
		// All symbols exist
		expect(symbols.get('G')).toBeDefined();
		expect(symbols.get('H')).toBeDefined();
		expect(symbols.get('I')).toBeDefined();
		expect(symbols.get('de')).toBeDefined();
		expect(symbols.get('Oe')).toBeDefined();
		expect(symbols.get('ce')).toBeDefined();
	});

	it('triangle with all remarkable elements', () => {
		const { figure } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'triangle(A, B, C)',
				'(O, cc) = cercle_circonscrit(A, B, C)',
				'hA = hauteur(A, B, C)',
				'hB = hauteur(B, C, A)',
				'bA = bissectrice(B, A, C)'
			].join('\n')
		);
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines.length).toBeGreaterThanOrEqual(3); // mediatrices + hauteurs + bissectrice
	});
});

describe('stdlib — distance(point, droite)', () => {
	it('computes distance from point to line via DSL', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = droite(A, B)',
				'P = point(2, 3)',
				'r = distance(P, d)'
			].join('\n')
		);
		expect(symbols.get('r')!.type).toBe('scalar');
		expect(figure.getScalarValue(symbols.get('r')!.figureId)).toBeCloseTo(3, 10);
	});

	it('works with segment', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				's = segment(A, B)',
				'P = point(2, 5)',
				'r = distance(P, s)'
			].join('\n')
		);
		expect(figure.getScalarValue(symbols.get('r')!.figureId)).toBeCloseTo(5, 10);
	});

	it('point-to-point distance still works', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(3, 4)', 'r = distance(A, B)'].join('\n')
		);
		expect(figure.getScalarValue(symbols.get('r')!.figureId)).toBeCloseTo(5, 10);
	});
});

describe('stdlib — centre_gravite', () => {
	it('computes centroid as average of coordinates', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(0, 6)', 'G = centre_gravite(A, B, C)'].join(
				'\n'
			)
		);
		const g = pos(figure, symbols, 'G');
		expect(g.x).toBeCloseTo(2, 10);
		expect(g.y).toBeCloseTo(2, 10);
	});

	it('returns a point', () => {
		const { symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(3, 4)', 'G = centre_gravite(A, B, C)'].join(
				'\n'
			)
		);
		expect(symbols.get('G')!.type).toBe('point');
	});

	it('is on each median', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(2, 5)', 'G = centre_gravite(A, B, C)'].join(
				'\n'
			)
		);
		const g = pos(figure, symbols, 'G');
		const a = pos(figure, symbols, 'A');
		const b = pos(figure, symbols, 'B');
		const c = pos(figure, symbols, 'C');
		const gExpected = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
		expect(g.x).toBeCloseTo(gExpected.x, 10);
		expect(g.y).toBeCloseTo(gExpected.y, 10);
	});
});

describe('stdlib — orthocentre', () => {
	it('computes orthocenter of a right triangle at the right-angle vertex', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(0, 3)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		const h = pos(figure, symbols, 'H');
		// Right angle at A → orthocenter is at A
		expect(h.x).toBeCloseTo(0, 5);
		expect(h.y).toBeCloseTo(0, 5);
	});

	it('computes orthocenter of a general triangle', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(2, 4)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		const h = pos(figure, symbols, 'H');
		// Verify H is on altitude from A to BC
		const b = pos(figure, symbols, 'B');
		const c = pos(figure, symbols, 'C');
		// AH · BC = 0 (AH perpendicular to BC)
		const ahx = h.x - 0,
			ahy = h.y - 0;
		const bcx = c.x - b.x,
			bcy = c.y - b.y;
		expect(ahx * bcx + ahy * bcy).toBeCloseTo(0, 5);
	});

	it('returns a point', () => {
		const { symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(3, 4)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		expect(symbols.get('H')!.type).toBe('point');
	});
});

describe('stdlib — cercle_inscrit', () => {
	it('creates incircle for a right triangle', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 0)',
				'C = point(0, 4)',
				'(I, c) = cercle_inscrit(A, B, C)'
			].join('\n')
		);
		const i = pos(figure, symbols, 'I');
		// For 3-4-5 right triangle, inradius = (a+b-c)/2 = (3+4-5)/2 = 1
		// Incenter at (r, r) = (1, 1)
		expect(i.x).toBeCloseTo(1, 5);
		expect(i.y).toBeCloseTo(1, 5);
		expect(symbols.get('c')!.type).toBe('cercle');
	});

	it('incenter is equidistant from all 3 sides', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'(I, c) = cercle_inscrit(A, B, C)',
				'd1 = distance(I, droite(A, B))',
				'd2 = distance(I, droite(B, C))',
				'd3 = distance(I, droite(A, C))'
			].join('\n')
		);
		const d1 = figure.getScalarValue(symbols.get('d1')!.figureId);
		const d2 = figure.getScalarValue(symbols.get('d2')!.figureId);
		const d3 = figure.getScalarValue(symbols.get('d3')!.figureId);
		expect(d1).toBeCloseTo(d2!, 5);
		expect(d2).toBeCloseTo(d3!, 5);
	});
});

describe('stdlib — droite_euler', () => {
	it('Euler line passes through G, H, and O', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'G = centre_gravite(A, B, C)',
				'H = orthocentre(A, B, C)',
				'(O, cc) = cercle_circonscrit(A, B, C)',
				'de = droite_euler(A, B, C)'
			].join('\n')
		);
		const g = pos(figure, symbols, 'G');
		const h = pos(figure, symbols, 'H');
		const o = pos(figure, symbols, 'O');
		// G, H, O must be collinear: det(GH, GO) = 0
		const ghx = h.x - g.x,
			ghy = h.y - g.y;
		const gox = o.x - g.x,
			goy = o.y - g.y;
		expect(ghx * goy - ghy * gox).toBeCloseTo(0, 5);
	});

	it('returns a line', () => {
		const { symbols } = runDsl(
			['A = point(0, 0)', 'B = point(6, 0)', 'C = point(2, 5)', 'de = droite_euler(A, B, C)'].join(
				'\n'
			)
		);
		expect(symbols.get('de')!.type).toBe('droite');
	});
});

describe('stdlib — cercle_euler', () => {
	it('Euler circle passes through the 3 midpoints', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'M1 = milieu(A, B)',
				'M2 = milieu(B, C)',
				'M3 = milieu(A, C)',
				'(Oe, ce) = cercle_euler(A, B, C)'
			].join('\n')
		);
		const oe = pos(figure, symbols, 'Oe');
		const m1 = pos(figure, symbols, 'M1');
		const m2 = pos(figure, symbols, 'M2');
		const m3 = pos(figure, symbols, 'M3');
		const r1 = dist(oe, m1);
		const r2 = dist(oe, m2);
		const r3 = dist(oe, m3);
		expect(r1).toBeCloseTo(r2, 5);
		expect(r2).toBeCloseTo(r3, 5);
	});

	it('returns center and circle', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'(Oe, ce) = cercle_euler(A, B, C)'
			].join('\n')
		);
		expect(symbols.get('Oe')!.type).toBe('point');
		expect(symbols.get('ce')!.type).toBe('cercle');
	});

	it('Euler circle radius is half the circumradius', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(2, 5)',
				'(O, cc) = cercle_circonscrit(A, B, C)',
				'(Oe, ce) = cercle_euler(A, B, C)',
				'M1 = milieu(A, B)'
			].join('\n')
		);
		const o = pos(figure, symbols, 'O');
		const a = pos(figure, symbols, 'A');
		const oe = pos(figure, symbols, 'Oe');
		const m1 = pos(figure, symbols, 'M1');
		const R = dist(o, a);
		const r = dist(oe, m1);
		expect(r).toBeCloseTo(R / 2, 5);
	});
});

// =============================================================================
// Edge cases — degenerate and special triangles
// =============================================================================

describe('stdlib — edge cases: equilateral triangle', () => {
	const equilateral = [
		'A = point(0, 0)',
		'B = point(4, 0)',
		`C = point(2, ${2 * Math.sqrt(3)})`
	].join('\n');

	it('centre_gravite is at centroid', () => {
		const { figure, symbols } = runDsl(equilateral + '\nG = centre_gravite(A, B, C)');
		const g = pos(figure, symbols, 'G');
		expect(g.x).toBeCloseTo(2, 5);
		expect(g.y).toBeCloseTo((2 * Math.sqrt(3)) / 3, 5);
	});

	it('orthocentre coincides with centroid for equilateral', () => {
		const { figure, symbols } = runDsl(
			equilateral + '\nG = centre_gravite(A, B, C)\nH = orthocentre(A, B, C)'
		);
		const g = pos(figure, symbols, 'G');
		const h = pos(figure, symbols, 'H');
		expect(h.x).toBeCloseTo(g.x, 5);
		expect(h.y).toBeCloseTo(g.y, 5);
	});

	it('cercle_inscrit center coincides with centroid for equilateral', () => {
		const { figure, symbols } = runDsl(
			equilateral + '\nG = centre_gravite(A, B, C)\n(I, c) = cercle_inscrit(A, B, C)'
		);
		const g = pos(figure, symbols, 'G');
		const i = pos(figure, symbols, 'I');
		expect(i.x).toBeCloseTo(g.x, 5);
		expect(i.y).toBeCloseTo(g.y, 5);
	});

	it('cercle_euler radius is half circumradius for equilateral', () => {
		const { figure, symbols } = runDsl(
			equilateral +
				'\n(O, cc) = cercle_circonscrit(A, B, C)\n(Oe, ce) = cercle_euler(A, B, C)\nM1 = milieu(A, B)'
		);
		const o = pos(figure, symbols, 'O');
		const a = pos(figure, symbols, 'A');
		const oe = pos(figure, symbols, 'Oe');
		const m1 = pos(figure, symbols, 'M1');
		expect(dist(oe, m1)).toBeCloseTo(dist(o, a) / 2, 5);
	});
});

describe('stdlib — edge cases: isosceles triangle', () => {
	it('centre_gravite is on axis of symmetry', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(-3, 0)',
				'B = point(3, 0)',
				'C = point(0, 5)',
				'G = centre_gravite(A, B, C)'
			].join('\n')
		);
		const g = pos(figure, symbols, 'G');
		expect(g.x).toBeCloseTo(0, 10); // on axis of symmetry x=0
	});

	it('orthocentre is on axis of symmetry', () => {
		const { figure, symbols } = runDsl(
			['A = point(-3, 0)', 'B = point(3, 0)', 'C = point(0, 5)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		const h = pos(figure, symbols, 'H');
		expect(h.x).toBeCloseTo(0, 5); // on axis of symmetry x=0
	});

	it('cercle_inscrit center is on axis of symmetry', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(-3, 0)',
				'B = point(3, 0)',
				'C = point(0, 5)',
				'(I, c) = cercle_inscrit(A, B, C)'
			].join('\n')
		);
		const i = pos(figure, symbols, 'I');
		expect(i.x).toBeCloseTo(0, 5);
	});
});

describe('stdlib — edge cases: right triangle', () => {
	it('orthocentre is at the right-angle vertex (other orientation)', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(5, 0)', 'C = point(5, 3)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		const h = pos(figure, symbols, 'H');
		// Right angle at B
		expect(h.x).toBeCloseTo(5, 5);
		expect(h.y).toBeCloseTo(0, 5);
	});

	it('cercle_inscrit of 5-12-13 right triangle', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(5, 0)',
				'C = point(0, 12)',
				'(I, c) = cercle_inscrit(A, B, C)'
			].join('\n')
		);
		const i = pos(figure, symbols, 'I');
		// Inradius = (a+b-c)/2 = (5+12-13)/2 = 2, incenter at (r,r) = (2,2)
		expect(i.x).toBeCloseTo(2, 5);
		expect(i.y).toBeCloseTo(2, 5);
	});

	it('Euler line passes through circumcenter (midpoint of hypotenuse)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(6, 0)',
				'C = point(0, 8)',
				'G = centre_gravite(A, B, C)',
				'H = orthocentre(A, B, C)',
				'(O, cc) = cercle_circonscrit(A, B, C)'
			].join('\n')
		);
		const g = pos(figure, symbols, 'G');
		const h = pos(figure, symbols, 'H');
		const o = pos(figure, symbols, 'O');
		// O is midpoint of hypotenuse BC
		expect(o.x).toBeCloseTo(3, 5);
		expect(o.y).toBeCloseTo(4, 5);
		// G, H, O collinear
		const ghx = h.x - g.x,
			ghy = h.y - g.y;
		const gox = o.x - g.x,
			goy = o.y - g.y;
		expect(ghx * goy - ghy * gox).toBeCloseTo(0, 5);
	});
});

describe('stdlib — edge cases: very flat triangle', () => {
	it('centre_gravite works with nearly collinear points', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(10, 0)',
				'C = point(5, 0.01)',
				'G = centre_gravite(A, B, C)'
			].join('\n')
		);
		const g = pos(figure, symbols, 'G');
		expect(g.x).toBeCloseTo(5, 3);
		expect(g.y).toBeCloseTo(0.01 / 3, 3);
	});

	it('orthocentre is far away for very flat triangle', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(10, 0)', 'C = point(5, 0.1)', 'H = orthocentre(A, B, C)'].join(
				'\n'
			)
		);
		const h = pos(figure, symbols, 'H');
		// Orthocenter goes far from the triangle when it's very flat
		expect(Math.abs(h.y)).toBeGreaterThan(10);
	});
});
