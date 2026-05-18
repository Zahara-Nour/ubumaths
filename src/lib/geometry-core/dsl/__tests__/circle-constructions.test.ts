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

// =============================================================================
// 1. cercle(A, B, C) — cercle par 3 points
// =============================================================================

describe('cercle(A, B, C) — circle through 3 points', () => {
	it('creates a circle passing through all 3 points', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(0, 4)', 'c = cercle(A, B, C)'].join('\n')
		);
		expect(symbols.get('c')!.type).toBe('cercle');
		// The circumcircle of a right triangle at origin has center (2, 2) and radius 2*sqrt(2)
		const el = figure.getElementById(symbols.get('c')!.figureId)!;
		expect(el.type).toBe('circleBy3Points');
	});

	it('the circle has correct center and radius', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(3, 0)',
				'B = point(0, 3)',
				'C = point(-3, 0)',
				'c = cercle(A, B, C)',
				'r = rayon(c)'
			].join('\n')
		);
		// Points on circle x² + y² = 9, center (0, 0), radius 3
		const r = figure.getScalarValue(symbols.get('r')!.figureId);
		expect(r).toBeCloseTo(3, 5);
	});

	it('is reactive — moves when points move', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'C = point(2, 4)', 'c = cercle(A, B, C)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('c')!.figureId)!;
		expect(el.dependsOn).toContain(symbols.get('A')!.figureId);
		expect(el.dependsOn).toContain(symbols.get('B')!.figureId);
		expect(el.dependsOn).toContain(symbols.get('C')!.figureId);
	});

	it('throws for collinear points', () => {
		expect(() =>
			runDsl(
				['A = point(0, 0)', 'B = point(2, 0)', 'C = point(4, 0)', 'c = cercle(A, B, C)'].join('\n')
			)
		).toThrow();
	});
});

// =============================================================================
// 1b. cercle(A, B, C) — edge cases
// =============================================================================

describe('cercle(A, B, C) — edge cases', () => {
	it('works with equilateral triangle', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				'C = point(1, sqrt(3))',
				'c = cercle(A, B, C)',
				'r = rayon(c)'
			].join('\n')
		);
		// Circumradius of equilateral triangle with side 2 = 2/sqrt(3)
		const r = figure.getScalarValue(symbols.get('r')!.figureId);
		expect(r).toBeCloseTo(2 / Math.sqrt(3), 4);
	});

	it('supports intersection with a line', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(3, 0)',
				'B = point(0, 3)',
				'C = point(-3, 0)',
				'c = cercle(A, B, C)',
				'd = droite(point(-5, 0), point(5, 0))',
				'P = intersection(c, d, 1)'
			].join('\n')
		);
		const p = pos(figure, symbols, 'P');
		// Circle x²+y²=9, line y=0 → intersections at (3,0) and (-3,0)
		expect(Math.abs(p.y)).toBeCloseTo(0, 5);
		expect(Math.abs(p.x)).toBeCloseTo(3, 5);
	});

	it('supports point_sur()', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(3, 0)',
				'B = point(0, 3)',
				'C = point(-3, 0)',
				'c = cercle(A, B, C)',
				'P = point_sur(c, 0)'
			].join('\n')
		);
		const p = pos(figure, symbols, 'P');
		// t=0 means angle=0, point at (r, 0) relative to center
		// Center is (0, 0), radius 3 → point at (3, 0)
		expect(p.x).toBeCloseTo(3, 4);
		expect(p.y).toBeCloseTo(0, 4);
	});

	it('works with non-centered points', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(10, 10)',
				'B = point(14, 10)',
				'C = point(12, 14)',
				'c = cercle(A, B, C)',
				'r = rayon(c)'
			].join('\n')
		);
		const r = figure.getScalarValue(symbols.get('r')!.figureId);
		expect(r).toBeDefined();
		expect(r!).toBeGreaterThan(0);
	});

	it('puissance works with cercle(A, B, C)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(3, 0)',
				'B = point(0, 3)',
				'C = point(-3, 0)',
				'c = cercle(A, B, C)',
				'P = point(5, 0)',
				'p = puissance(P, c)'
			].join('\n')
		);
		// Circle centered at (0,0) r=3, P at (5,0) → 25-9=16
		const val = figure.getScalarValue(symbols.get('p')!.figureId);
		expect(val).toBeCloseTo(16, 5);
	});

	it('throws with only 2 arguments', () => {
		expect(() =>
			runDsl(['A = point(0, 0)', 'B = point(2, 0)', 'c = cercle(A, B)'].join('\n'))
		).toThrow();
	});
});

// =============================================================================
// 2. secteur(O, A, B) — secteur circulaire
// =============================================================================

describe('secteur() — circular sector', () => {
	it('creates a sector from center and two points', () => {
		const { symbols } = runDsl(
			['O = point(0, 0)', 'A = point(3, 0)', 'B = point(0, 3)', 's = secteur(O, A, B)'].join('\n')
		);
		expect(symbols.get('s')!.type).toBe('secteur');
	});

	it('creates a sector by angles', () => {
		const { symbols } = runDsl(
			['O = point(0, 0)', 's = secteur(O, rayon=3, debut=0, fin=90)'].join('\n')
		);
		expect(symbols.get('s')!.type).toBe('secteur');
	});

	it('sector element has correct type', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(3, 0)', 'B = point(0, 3)', 's = secteur(O, A, B)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('s')!.figureId)!;
		expect(el.type).toBe('sectorByPoints');
	});

	it('is filled by default', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(3, 0)', 'B = point(0, 3)', 's = secteur(O, A, B)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('s')!.figureId)!;
		expect(el.style?.fillColor).toBeDefined();
		expect(el.style?.fillOpacity).toBeGreaterThan(0);
	});

	it('depends on center and edge points', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(3, 0)', 'B = point(0, 3)', 's = secteur(O, A, B)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('s')!.figureId)!;
		expect(el.dependsOn).toContain(symbols.get('O')!.figureId);
		expect(el.dependsOn).toContain(symbols.get('A')!.figureId);
		expect(el.dependsOn).toContain(symbols.get('B')!.figureId);
	});
});

// =============================================================================
// 2b. secteur() — edge cases
// =============================================================================

describe('secteur() — edge cases', () => {
	it('sectorByAngles element has correct type', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 's = secteur(O, rayon=3, debut=0, fin=90)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('s')!.figureId)!;
		expect(el.type).toBe('sectorByAngles');
	});

	it('sector with slider radius depends on slider', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'r = slider(min=1, max=5, valeur=3)',
				's = secteur(O, rayon=r, debut=0, fin=90)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('s')!.figureId)!;
		expect(el.dependsOn).toContain(symbols.get('r')!.figureId);
	});

	it('sector with 270 degree sweep (reflex angle)', () => {
		const { symbols } = runDsl(
			['O = point(0, 0)', 's = secteur(O, rayon=3, debut=0, fin=270)'].join('\n')
		);
		expect(symbols.get('s')!.type).toBe('secteur');
	});

	it('throws with wrong arg count', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 'A = point(3, 0)', 's = secteur(O, A)'].join('\n'))
		).toThrow();
	});

	it('throws without rayon in angle mode', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 's = secteur(O, debut=0, fin=90)'].join('\n'))
		).toThrow();
	});

	it('style override replaces default fill', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(3, 0)',
				'B = point(0, 3)',
				's = secteur(O, A, B)',
				'style(s, remplissage="vert", opacite_fond=0.8)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('s')!.figureId)!;
		expect(el.style?.fillColor).toBe('#16a34a');
		expect(el.style?.fillOpacity).toBe(0.8);
	});
});

// =============================================================================
// 3. couronne(O, r1, r2) — anneau
// =============================================================================

describe('couronne() — annulus', () => {
	it('creates an annulus from center and two radii', () => {
		const { symbols } = runDsl(['O = point(0, 0)', 'a = couronne(O, r1=2, r2=4)'].join('\n'));
		expect(symbols.get('a')!.type).toBe('couronne');
	});

	it('annulus element has correct type', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'a = couronne(O, r1=2, r2=4)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('a')!.figureId)!;
		expect(el.type).toBe('annulus');
	});

	it('is filled by default', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'a = couronne(O, r1=2, r2=4)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('a')!.figureId)!;
		expect(el.style?.fillColor).toBeDefined();
		expect(el.style?.fillOpacity).toBeGreaterThan(0);
	});

	it('throws if r1 >= r2', () => {
		expect(() => runDsl(['O = point(0, 0)', 'a = couronne(O, r1=4, r2=2)'].join('\n'))).toThrow();
	});

	it('supports slider-based radii', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'r = slider(min=1, max=5, valeur=2)', 'a = couronne(O, r1=r, r2=4)'].join(
				'\n'
			)
		);
		const el = figure.getElementById(symbols.get('a')!.figureId)!;
		expect(el.dependsOn).toContain(symbols.get('r')!.figureId);
	});
});

// =============================================================================
// 3b. couronne() — edge cases
// =============================================================================

describe('couronne() — edge cases', () => {
	it('throws if r1 equals r2', () => {
		expect(() => runDsl(['O = point(0, 0)', 'a = couronne(O, r1=3, r2=3)'].join('\n'))).toThrow();
	});

	it('throws without r1 or r2', () => {
		expect(() => runDsl(['O = point(0, 0)', 'a = couronne(O, r1=2)'].join('\n'))).toThrow();
	});

	it('throws with wrong positional arg count', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 'A = point(1, 0)', 'a = couronne(O, A, r1=2, r2=4)'].join('\n'))
		).toThrow();
	});

	it('style override on annulus', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'a = couronne(O, r1=2, r2=4)',
				'style(a, remplissage="violet", opacite_fond=0.5)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('a')!.figureId)!;
		expect(el.style?.fillColor).toBe('#9333ea');
		expect(el.style?.fillOpacity).toBe(0.5);
	});
});

// =============================================================================
// 4. corde(c, d) — macro stdlib
// =============================================================================

describe('corde() — chord', () => {
	it('creates a segment from circle-line intersection', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=5)',
				'd = droite(point(-5, 0), point(5, 0))',
				's = corde(c, d)',
				'P1 = extremite(s, 1)',
				'P2 = extremite(s, 2)'
			].join('\n')
		);
		expect(symbols.get('s')!.type).toBe('segment');
		expect(symbols.get('P1')!.type).toBe('point');
		expect(symbols.get('P2')!.type).toBe('point');
	});

	it('chord endpoints lie on the circle', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=5)',
				'd = droite(point(0, 3), point(1, 3))',
				's = corde(c, d)',
				'P1 = extremite(s, 1)',
				'P2 = extremite(s, 2)'
			].join('\n')
		);
		const o = pos(figure, symbols, 'O');
		const p1 = pos(figure, symbols, 'P1');
		const p2 = pos(figure, symbols, 'P2');
		// Both points should be at distance 5 from O
		expect(dist(o, p1)).toBeCloseTo(5, 5);
		expect(dist(o, p2)).toBeCloseTo(5, 5);
	});
});

// =============================================================================
// 4b. corde() — edge cases
// =============================================================================

describe('corde() — edge cases', () => {
	it('chord along diameter gives segment of length 2r', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=5)',
				'd = droite(point(-10, 0), point(10, 0))',
				's = corde(c, d)',
				'P1 = extremite(s, 1)',
				'P2 = extremite(s, 2)'
			].join('\n')
		);
		const p1 = pos(figure, symbols, 'P1');
		const p2 = pos(figure, symbols, 'P2');
		expect(dist(p1, p2)).toBeCloseTo(10, 4);
	});

	it('chord near tangent gives short segment', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=5)',
				'd = droite(point(0, 4), point(1, 4))',
				's = corde(c, d)',
				'P1 = extremite(s, 1)',
				'P2 = extremite(s, 2)'
			].join('\n')
		);
		const p1 = pos(figure, symbols, 'P1');
		const p2 = pos(figure, symbols, 'P2');
		// Line y=4 intersects circle r=5 at x=±3 → chord length 6
		expect(dist(p1, p2)).toBeCloseTo(6, 4);
	});
});

// =============================================================================
// 5. puissance(P, c) — power of a point
// =============================================================================

describe('puissance() — power of a point', () => {
	it('returns positive value for exterior point', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'c = cercle(O, rayon=3)', 'P = point(5, 0)', 'p = puissance(P, c)'].join(
				'\n'
			)
		);
		const val = figure.getScalarValue(symbols.get('p')!.figureId);
		// d² - r² = 25 - 9 = 16
		expect(val).toBeCloseTo(16, 5);
	});

	it('returns negative value for interior point', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'c = cercle(O, rayon=3)', 'P = point(1, 0)', 'p = puissance(P, c)'].join(
				'\n'
			)
		);
		const val = figure.getScalarValue(symbols.get('p')!.figureId);
		// d² - r² = 1 - 9 = -8
		expect(val).toBeCloseTo(-8, 5);
	});

	it('returns zero for point on circle', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'c = cercle(O, rayon=3)', 'P = point(3, 0)', 'p = puissance(P, c)'].join(
				'\n'
			)
		);
		const val = figure.getScalarValue(symbols.get('p')!.figureId);
		expect(val).toBeCloseTo(0, 5);
	});

	it('is reactive to point movement', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'c = cercle(O, rayon=3)', 'P = point(5, 0)', 'p = puissance(P, c)'].join(
				'\n'
			)
		);
		const el = figure.getElementById(symbols.get('p')!.figureId)!;
		expect(el.dependsOn).toContain(symbols.get('P')!.figureId);
		expect(el.dependsOn).toContain(symbols.get('c')!.figureId);
	});
});

// =============================================================================
// 5b. puissance() — edge cases
// =============================================================================

describe('puissance() — edge cases', () => {
	it('works with cercle(O, passant=A)', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(4, 0)',
				'c = cercle(O, passant=A)',
				'P = point(5, 0)',
				'p = puissance(P, c)'
			].join('\n')
		);
		// d²-r² = 25-16 = 9
		const val = figure.getScalarValue(symbols.get('p')!.figureId);
		expect(val).toBeCloseTo(9, 5);
	});

	it('works at the center (returns -r²)', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'c = cercle(O, rayon=4)', 'p = puissance(O, c)'].join('\n')
		);
		// d²-r² = 0-16 = -16
		const val = figure.getScalarValue(symbols.get('p')!.figureId);
		expect(val).toBeCloseTo(-16, 5);
	});

	it('throws with wrong arg count', () => {
		expect(() => runDsl(['O = point(0, 0)', 'p = puissance(O)'].join('\n'))).toThrow();
	});
});

// =============================================================================
// 6. DSL style — remplissage / opacite_fond
// =============================================================================

describe('DSL style — remplissage / opacite_fond', () => {
	it('style(element, remplissage="bleu") sets fillColor', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'p = polygone(A, B, C)',
				'style(p, remplissage="bleu")'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('p')!.figureId)!;
		expect(el.style?.fillColor).toBe('#1e40af');
	});

	it('style(element, opacite_fond=0.5) sets fillOpacity', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'p = polygone(A, B, C)',
				'style(p, opacite_fond=0.5)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('p')!.figureId)!;
		expect(el.style?.fillOpacity).toBe(0.5);
	});

	it('remplissage works on circles', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = cercle(O, rayon=3)',
				'style(c, remplissage="rouge", opacite_fond=0.3)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('c')!.figureId)!;
		expect(el.style?.fillColor).toBe('#dc2626');
		expect(el.style?.fillOpacity).toBe(0.3);
	});
});
