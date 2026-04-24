import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

/**
 * Round-trip helper: script → Figure → serialize → re-parse → Figure
 * Compares element counts and point positions.
 */
function assertRoundTrip(script: string) {
	const { figure: fig1, symbols: sym1 } = runDsl(script);
	const serialized = serializeDsl(fig1, sym1);
	const { figure: fig2 } = runDsl(serialized);

	// Same number of elements
	expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

	// Same element types
	const types1 = fig1
		.getAllElements()
		.map((e) => e.type)
		.sort();
	const types2 = fig2
		.getAllElements()
		.map((e) => e.type)
		.sort();
	expect(types2).toEqual(types1);

	return { fig1, fig2, sym1, serialized };
}

function assertPositionPreserved(script: string, pointName: string) {
	const { fig1, fig2, sym1 } = assertRoundTrip(script);
	const { symbols: sym2 } = runDsl(serializeDsl(fig1, sym1));
	const pos1 = fig1.getPosition(sym1.get(pointName)!.figureId!);
	const pos2 = fig2.getPosition(sym2.get(pointName)!.figureId!);
	expect(pos1).toBeDefined();
	expect(pos2).toBeDefined();
	expect(geoToNumber(pos2!.x)).toBeCloseTo(geoToNumber(pos1!.x), 3);
	expect(geoToNumber(pos2!.y)).toBeCloseTo(geoToNumber(pos1!.y), 3);
}

describe('roundtrip — single point', () => {
	it('point at origin', () => {
		assertRoundTrip('A = point(0, 0)');
	});

	it('point with positive coordinates', () => {
		assertPositionPreserved('A = point(3, 4)', 'A');
	});

	it('point with negative coordinates', () => {
		assertPositionPreserved('A = point(-5.5, -3.2)', 'A');
	});

	it('point with zero y', () => {
		assertPositionPreserved('P = point(7, 0)', 'P');
	});

	it('point with decimal coordinates', () => {
		assertPositionPreserved('P = point(1.5, 2.75)', 'P');
	});

	it('point with large coordinates', () => {
		assertPositionPreserved('P = point(100, 200)', 'P');
	});

	it('point with small coordinates', () => {
		assertPositionPreserved('P = point(0.01, 0.02)', 'P');
	});
});

describe('roundtrip — segments and lines', () => {
	it('single segment', () => {
		assertRoundTrip(['A = point(0, 0)', 'B = point(4, 3)', 'segment(A, B)'].join('\n'));
	});

	it('named segment', () => {
		const { serialized } = assertRoundTrip(
			['A = point(0, 0)', 'B = point(4, 0)', 's = segment(A, B)'].join('\n')
		);
		expect(serialized).toContain('s = segment(A, B)');
	});

	it('line', () => {
		assertRoundTrip(['A = point(0, 0)', 'B = point(1, 1)', 'd = droite(A, B)'].join('\n'));
	});

	it('ray', () => {
		assertRoundTrip(['A = point(0, 0)', 'B = point(1, 0)', 'r = demidroite(A, B)'].join('\n'));
	});

	it('multiple segments (triangle)', () => {
		assertRoundTrip(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)'
			].join('\n')
		);
	});
});

describe('roundtrip — circles', () => {
	it('circle by radius', () => {
		assertRoundTrip(['O = point(0, 0)', 'c = cercle(O, rayon=3)'].join('\n'));
	});

	it('circle by radius with decimal', () => {
		assertRoundTrip(['O = point(1, 2)', 'c = cercle(O, rayon=2.5)'].join('\n'));
	});

	it('circle by point', () => {
		assertRoundTrip(['O = point(0, 0)', 'A = point(3, 0)', 'c = cercle(O, passant=A)'].join('\n'));
	});
});

describe('roundtrip — midpoint', () => {
	it('midpoint preserves position', () => {
		assertPositionPreserved(
			['A = point(0, 0)', 'B = point(4, 0)', 'M = milieu(A, B)'].join('\n'),
			'M'
		);
	});

	it('midpoint of diagonal segment', () => {
		assertPositionPreserved(
			['A = point(-3, -2)', 'B = point(5, 6)', 'M = milieu(A, B)'].join('\n'),
			'M'
		);
	});
});

describe('roundtrip — transformations', () => {
	it('central symmetry', () => {
		assertPositionPreserved(
			['A = point(2, 3)', 'O = point(0, 0)', 'B = symetrie(A, centre=O)'].join('\n'),
			'B'
		);
	});

	it('axial symmetry', () => {
		assertPositionPreserved(
			['A = point(1, 1)', 'P = point(0, 0)', 'Q = point(1, 0)', 'B = symetrie(A, axe=(P, Q))'].join(
				'\n'
			),
			'B'
		);
	});

	it('rotation 90 degrees', () => {
		assertPositionPreserved(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=90)'].join('\n'),
			'B'
		);
	});

	it('rotation 45 degrees', () => {
		assertPositionPreserved(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=45)'].join('\n'),
			'B'
		);
	});

	it('rotation 180 degrees', () => {
		assertPositionPreserved(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=180)'].join('\n'),
			'B'
		);
	});

	it('rotation negative angle', () => {
		assertPositionPreserved(
			['A = point(0, 1)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=-90)'].join('\n'),
			'B'
		);
	});

	it('translation', () => {
		assertPositionPreserved(
			[
				'A = point(1, 1)',
				'P = point(0, 0)',
				'Q = point(2, 3)',
				'B = translation(A, vecteur=(P, Q))'
			].join('\n'),
			'B'
		);
	});

	it('homothety factor 2', () => {
		assertPositionPreserved(
			['A = point(1, 1)', 'O = point(0, 0)', 'B = homothetie(A, centre=O, rapport=2)'].join('\n'),
			'B'
		);
	});

	it('homothety factor 0.5', () => {
		assertPositionPreserved(
			['A = point(4, 6)', 'O = point(0, 0)', 'B = homothetie(A, centre=O, rapport=0.5)'].join('\n'),
			'B'
		);
	});

	it('homothety negative factor', () => {
		assertPositionPreserved(
			['A = point(1, 1)', 'O = point(0, 0)', 'B = homothetie(A, centre=O, rapport=-1)'].join('\n'),
			'B'
		);
	});
});

describe('roundtrip — intersection', () => {
	it('intersection of two lines', () => {
		assertRoundTrip(
			[
				'A = point(0, 0)',
				'B = point(2, 2)',
				'C = point(2, 0)',
				'D = point(0, 2)',
				'd1 = droite(A, B)',
				'd2 = droite(C, D)',
				'I = intersection(d1, d2)'
			].join('\n')
		);
	});
});

describe('roundtrip — angle marks', () => {
	it('simple angle mark', () => {
		assertRoundTrip(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'marque_angle(A, V, B)'].join('\n')
		);
	});

	it('angle mark with arcs=2', () => {
		const { serialized } = assertRoundTrip(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'marque_angle(A, V, B, arcs=2)'
			].join('\n')
		);
		expect(serialized).toContain('arcs=2');
	});

	it('angle mark with arcs=3', () => {
		const { serialized } = assertRoundTrip(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'marque_angle(A, V, B, arcs=3)'
			].join('\n')
		);
		expect(serialized).toContain('arcs=3');
	});

	it('right angle', () => {
		const { serialized } = assertRoundTrip(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'angle_droit(A, V, B)'].join('\n')
		);
		expect(serialized).toContain('angle_droit');
	});
});

describe('roundtrip — segment marks', () => {
	it('single tick', () => {
		assertRoundTrip(['A = point(0, 0)', 'B = point(4, 0)', 'marque_segment(A, B)'].join('\n'));
	});

	it('double ticks', () => {
		const { serialized } = assertRoundTrip(
			['A = point(0, 0)', 'B = point(4, 0)', 'marque_segment(A, B, traits=2)'].join('\n')
		);
		expect(serialized).toContain('traits=2');
	});

	it('triple ticks', () => {
		const { serialized } = assertRoundTrip(
			['A = point(0, 0)', 'B = point(4, 0)', 'marque_segment(A, B, traits=3)'].join('\n')
		);
		expect(serialized).toContain('traits=3');
	});
});

describe('roundtrip — measures', () => {
	it('distance measure', () => {
		assertRoundTrip(['A = point(0, 0)', 'B = point(3, 4)', 'mesure(A, B)'].join('\n'));
	});

	it('angle measure (3 points)', () => {
		assertRoundTrip(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'mesure(A, V, B)'].join('\n')
		);
	});
});

describe('roundtrip — complex figures', () => {
	it('triangle with all annotations', () => {
		assertRoundTrip(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)',
				'M = milieu(A, B)',
				'marque_angle(B, A, C)',
				'angle_droit(A, B, C)',
				'marque_segment(A, B, traits=1)',
				'marque_segment(B, C, traits=2)',
				'marque_segment(C, A, traits=3)',
				'mesure(A, B)'
			].join('\n')
		);
	});

	it('figure with all element types', () => {
		assertRoundTrip(
			[
				'A = point(-4, -3)',
				'B = point(4, -3)',
				'C = point(0, 4)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)',
				'd = droite(A, B)',
				'r = demidroite(C, A)',
				'c = cercle(A, rayon=2)',
				'c2 = cercle(B, passant=C)',
				'M = milieu(A, B)',
				'O = point(0, 0)',
				'D = symetrie(A, centre=O)',
				'E = rotation(A, centre=O, angle=60)',
				'marque_angle(B, A, C)',
				'marque_segment(A, B)'
			].join('\n')
		);
	});

	it('figure with multiple circles and points', () => {
		assertRoundTrip(
			[
				'O = point(0, 0)',
				'A = point(3, 0)',
				'B = point(0, 3)',
				'c1 = cercle(O, rayon=3)',
				'c2 = cercle(O, passant=A)',
				'segment(A, B)',
				'd = droite(O, A)',
				'M = milieu(A, B)'
			].join('\n')
		);
	});

	it('axial symmetry preserves through roundtrip', () => {
		const script = [
			'A = point(1, 2)',
			'P = point(0, 0)',
			'Q = point(1, 0)',
			'B = symetrie(A, axe=(P, Q))'
		].join('\n');
		const { serialized } = assertRoundTrip(script);
		expect(serialized).toContain('axe=(P, Q)');
	});

	it('translation preserves through roundtrip', () => {
		const script = [
			'A = point(1, 1)',
			'P = point(0, 0)',
			'Q = point(3, 2)',
			'B = translation(A, vecteur=(P, Q))'
		].join('\n');
		const { serialized } = assertRoundTrip(script);
		expect(serialized).toContain('vecteur=(P, Q)');
	});

	it('serialized output is parseable', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'C = point(2, 3)',
			'segment(A, B)',
			'M = milieu(A, B)',
			'D = rotation(A, centre=M, angle=90)',
			'c = cercle(M, rayon=2)',
			'marque_angle(B, A, C, arcs=2)',
			'marque_segment(A, B, traits=2)'
		].join('\n');
		const { serialized } = assertRoundTrip(script);
		// The serialized output should be parseable without error
		expect(() => runDsl(serialized)).not.toThrow();
	});

	it('double round-trip produces same result', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'C = point(2, 3)',
			'segment(A, B)',
			'M = milieu(A, B)',
			'c = cercle(A, rayon=2)'
		].join('\n');

		// First round-trip
		const r1 = runDsl(script);
		const s1 = serializeDsl(r1.figure, r1.symbols);

		// Second round-trip
		const r2 = runDsl(s1);
		const s2 = serializeDsl(r2.figure, r2.symbols);

		// Third round-trip
		const r3 = runDsl(s2);

		// Element counts should match across all
		expect(r2.figure.getAllElements().length).toBe(r1.figure.getAllElements().length);
		expect(r3.figure.getAllElements().length).toBe(r1.figure.getAllElements().length);
	});
});

describe('roundtrip — name preservation', () => {
	it('preserves point names', () => {
		const { serialized } = assertRoundTrip('A = point(3, 4)');
		expect(serialized).toContain('A = point(');
	});

	it('preserves segment name', () => {
		const { serialized } = assertRoundTrip(
			['A = point(0, 0)', 'B = point(1, 1)', 's1 = segment(A, B)'].join('\n')
		);
		expect(serialized).toContain('s1 = segment(');
	});

	it('preserves circle name', () => {
		const { serialized } = assertRoundTrip(
			['O = point(0, 0)', 'monCercle = cercle(O, rayon=5)'].join('\n')
		);
		expect(serialized).toContain('monCercle = cercle(');
	});

	it('preserves transformation names', () => {
		const { serialized } = assertRoundTrip(
			['A = point(1, 1)', 'O = point(0, 0)', 'imageA = symetrie(A, centre=O)'].join('\n')
		);
		expect(serialized).toContain('imageA = symetrie(');
	});
});
