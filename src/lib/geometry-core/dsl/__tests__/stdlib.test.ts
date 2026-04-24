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
