import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { serialize } from '../serializer';
import { geoToNumber } from '../../compute/to-number';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function roundTrip(script: string) {
	const { figure, symbols } = run(script);
	const serialized = serialize(figure, symbols);
	// Re-parse and re-interpret
	const program2 = parse(serialized);
	const result2 = interpret(program2);
	return { original: { figure, symbols }, serialized, roundTripped: result2 };
}

describe('serializer — individual elements', () => {
	it('serializes a free point', () => {
		const { figure, symbols } = run('A = point(3, 4)');
		const result = serialize(figure, symbols);
		expect(result).toContain('A = point(3, 4)');
	});

	it('serializes a midpoint', () => {
		const { figure, symbols } = run('A = point(0, 0)\nB = point(4, 0)\nM = milieu(A, B)');
		const result = serialize(figure, symbols);
		expect(result).toContain('M = milieu(A, B)');
	});

	it('serializes a segment', () => {
		const { figure, symbols } = run('A = point(0, 0)\nB = point(1, 1)\ns = segment(A, B)');
		const result = serialize(figure, symbols);
		expect(result).toContain('s = segment(A, B)');
	});

	it('serializes a segment without name', () => {
		const { figure, symbols } = run('A = point(0, 0)\nB = point(1, 1)\nsegment(A, B)');
		const result = serialize(figure, symbols);
		expect(result).toContain('segment(A, B)');
	});

	it('serializes a line', () => {
		const { figure, symbols } = run('A = point(0, 0)\nB = point(1, 1)\nd = droite(A, B)');
		const result = serialize(figure, symbols);
		expect(result).toContain('d = droite(A, B)');
	});

	it('serializes a ray', () => {
		const { figure, symbols } = run('A = point(0, 0)\nB = point(1, 0)\nr = demidroite(A, B)');
		const result = serialize(figure, symbols);
		expect(result).toContain('r = demidroite(A, B)');
	});

	it('serializes circle by radius', () => {
		const { figure, symbols } = run('O = point(0, 0)\nc = cercle(O, rayon=3)');
		const result = serialize(figure, symbols);
		expect(result).toContain('c = cercle(O, rayon=3)');
	});

	it('serializes circle by point', () => {
		const { figure, symbols } = run('O = point(0, 0)\nA = point(3, 0)\nc = cercle(O, passant=A)');
		const result = serialize(figure, symbols);
		expect(result).toContain('c = cercle(O, passant=A)');
	});

	it('serializes reflected point', () => {
		const { figure, symbols } = run('A = point(1, 1)\nO = point(0, 0)\nB = symetrie(A, centre=O)');
		const result = serialize(figure, symbols);
		expect(result).toContain('B = symetrie(A, centre=O)');
	});

	it('serializes rotated point', () => {
		const { figure, symbols } = run(
			'A = point(1, 0)\nO = point(0, 0)\nB = rotation(A, centre=O, angle=90)'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('rotation(A, centre=O, angle=90)');
	});

	it('serializes translated point', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nP = point(1, 0)\nQ = point(3, 0)\nB = translation(A, vecteur=(P, Q))'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('B = translation(A, vecteur=(P, Q))');
	});

	it('serializes dilated point', () => {
		const { figure, symbols } = run(
			'A = point(1, 1)\nO = point(0, 0)\nB = homothetie(A, centre=O, rapport=2)'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('B = homothetie(A, centre=O, rapport=2)');
	});

	it('serializes reflected over line', () => {
		const { figure, symbols } = run(
			'A = point(1, 1)\nP = point(0, 0)\nQ = point(1, 0)\nB = symetrie(A, axe=(P, Q))'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('B = symetrie(A, axe=(P, Q))');
	});

	it('serializes intersection', () => {
		const { figure, symbols } = run(
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
		const result = serialize(figure, symbols);
		expect(result).toContain('I = intersection(d1, d2)');
	});

	it('serializes angle mark (arc)', () => {
		const { figure, symbols } = run(
			'A = point(1, 0)\nV = point(0, 0)\nB = point(0, 1)\nangle(A, V, B)'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('angle(A, V, B)');
	});

	it('serializes angle mark with arcs2', () => {
		const { figure, symbols } = run(
			'A = point(1, 0)\nV = point(0, 0)\nB = point(0, 1)\nangle(A, V, B, marque="arcs2")'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('marque="arcs2"');
	});

	it('serializes right angle (carre)', () => {
		const { figure, symbols } = run(
			'A = point(1, 0)\nV = point(0, 0)\nB = point(0, 1)\nangle(A, V, B, marque="carre")'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('marque="carre"');
	});

	it('serializes segment mark', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\nmarque_segment(A, B, traits=2)'
		);
		const result = serialize(figure, symbols);
		expect(result).toContain('marque_segment(A, B, traits=2)');
	});

	it('serializes distance scalar', () => {
		// mesure(A, B) 2-points is removed; use distance() for scalar
		const { figure, symbols } = run('A = point(0, 0)\nB = point(3, 4)\nd = distance(A, B)');
		const result = serialize(figure, symbols);
		expect(result).toContain('distance(A, B)');
	});
});

describe('serializer — round-trip', () => {
	it('round-trips a simple figure', () => {
		const script = 'A = point(3, 4)\nB = point(-2, 1)\nsegment(A, B)';
		const { roundTripped } = roundTrip(script);
		const points = roundTripped.figure.getAllElements().filter((e) => e.type === 'freePoint');
		const segments = roundTripped.figure.getAllElements().filter((e) => e.type === 'segment');
		expect(points).toHaveLength(2);
		expect(segments).toHaveLength(1);
	});

	it('round-trips preserving point positions', () => {
		const script = 'A = point(3, 4)';
		const { original, roundTripped } = roundTrip(script);
		const posOrig = original.figure.getPosition(original.symbols.get('A')!.figureId!);
		const posRT = roundTripped.figure.getPosition(roundTripped.symbols.get('A')!.figureId!);
		expect(geoToNumber(posRT!.x)).toBeCloseTo(geoToNumber(posOrig!.x), 3);
		expect(geoToNumber(posRT!.y)).toBeCloseTo(geoToNumber(posOrig!.y), 3);
	});

	it('round-trips a triangle with midpoint', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'C = point(2, 3)',
			'segment(A, B)',
			'segment(B, C)',
			'segment(C, A)',
			'M = milieu(A, B)'
		].join('\n');
		const { roundTripped } = roundTrip(script);
		const midpoints = roundTripped.figure.getAllElements().filter((e) => e.type === 'midpoint');
		expect(midpoints).toHaveLength(1);
	});

	it('round-trips circle by radius', () => {
		const script = 'O = point(0, 0)\nc = cercle(O, rayon=3)';
		const { roundTripped } = roundTrip(script);
		const circles = roundTripped.figure.getAllElements().filter((e) => e.type === 'circleByRadius');
		expect(circles).toHaveLength(1);
	});

	it('round-trips transformations', () => {
		const script = [
			'A = point(1, 0)',
			'O = point(0, 0)',
			'B = rotation(A, centre=O, angle=90)'
		].join('\n');
		const { roundTripped } = roundTrip(script);
		const rotated = roundTripped.figure.getAllElements().filter((e) => e.type === 'rotatedPoint');
		expect(rotated).toHaveLength(1);
		const pos = roundTripped.figure.getPosition(roundTripped.symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 3);
	});

	it('round-trips complex figure', () => {
		const script = [
			'A = point(-4, -3)',
			'B = point(4, -3)',
			'C = point(0, 4)',
			'segment(A, B)',
			'segment(B, C)',
			'segment(C, A)',
			'M = milieu(A, B)',
			'd = droite(A, B)',
			'c = cercle(A, rayon=2)',
			'angle(B, A, C)',
			'marque_segment(A, B)'
		].join('\n');
		const { roundTripped } = roundTrip(script);
		expect(roundTripped.figure.getAllElements().length).toBeGreaterThanOrEqual(10);
	});
});

describe('serializer — edge cases', () => {
	it('empty figure produces empty string', () => {
		const { figure, symbols } = run('');
		const result = serialize(figure, symbols);
		expect(result).toBe('');
	});

	it('generates names for unlabeled elements', () => {
		const { figure, symbols } = run('point(0, 0)');
		const result = serialize(figure, symbols);
		// Should have an auto-generated name
		expect(result).toContain('point(0, 0)');
	});

	it('handles negative coordinates', () => {
		const { figure, symbols } = run('A = point(-5.5, -3.2)');
		const result = serialize(figure, symbols);
		expect(result).toContain('-5.5');
		expect(result).toContain('-3.2');
	});
});
