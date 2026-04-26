import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

function getPos(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	n: string
) {
	const entry = symbols.get(n);
	if (!entry?.figureId) throw new Error(`Symbol "${n}" not found`);
	const pos = figure.getPosition(entry.figureId);
	if (!pos) throw new Error(`No position for "${n}"`);
	return { x: geoToNumber(pos.x), y: geoToNumber(pos.y) };
}

describe('compose() — creation', () => {
	it('creates a composition of two transformations', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'r = rotation(angle=90, centre=O)',
				'A = point(0, 0)',
				'B = point(1, 0)',
				't = translation(vecteur=(A, B))',
				'f = compose(r, t)'
			].join('\n')
		);
		expect(symbols.get('f')!.type).toBe('transformation');
	});

	it('compose with less than 2 args throws', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 'r = rotation(angle=90, centre=O)', 'f = compose(r)'].join('\n'))
		).toThrow(/au moins 2/);
	});

	it('compose with non-transformation throws', () => {
		expect(() =>
			runDsl(
				['O = point(0, 0)', 'r = rotation(angle=90, centre=O)', 'f = compose(r, O)'].join('\n')
			)
		).toThrow(/transformation/);
	});
});

describe('compose() — application to points', () => {
	it('compose(r, t) applies t then r', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(0, 0)',
				'C = point(2, 0)',
				'r = rotation(angle=90, centre=O)',
				't = translation(vecteur=(B, C))',
				'f = compose(r, t)',
				'D = transforme(f, A)'
			].join('\n')
		);
		// A=(1,0) → translate by (2,0) → (3,0) → rotate 90° around O → (0,3)
		const pos = getPos(figure, symbols, 'D');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(3);
	});

	it('compose of two rotations around same center = sum of angles', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'r1 = rotation(angle=45, centre=O)',
				'r2 = rotation(angle=45, centre=O)',
				'f = compose(r1, r2)',
				'B = transforme(f, A)'
			].join('\n')
		);
		// 45° + 45° = 90°, so (1,0) → (0,1)
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(1);
	});

	it('compose of 3 transformations', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'r1 = rotation(angle=90, centre=O)',
				'r2 = rotation(angle=90, centre=O)',
				'r3 = rotation(angle=90, centre=O)',
				'f = compose(r1, r2, r3)',
				'B = transforme(f, A)'
			].join('\n')
		);
		// 90° * 3 = 270°, (1,0) → (0,-1)
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(-1);
	});
});

describe('compose() — application to segments', () => {
	it('compose applied to a segment', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(2, 0)',
				's = segment(A, B)',
				'P = point(0, 0)',
				'Q = point(0, 1)',
				'r = rotation(angle=90, centre=O)',
				't = translation(vecteur=(P, Q))',
				'f = compose(t, r)',
				's2 = transforme(f, s)'
			].join('\n')
		);
		// A=(1,0) → rot90 → (0,1) → translate(0,1) → (0,2)
		// B=(2,0) → rot90 → (0,2) → translate(0,1) → (0,3)
		expect(symbols.get('s2')!.type).toBe('segment');
		const seg = figure.getElementById(symbols.get('s2')!.figureId!);
		if (seg!.type === 'segment') {
			const start = figure.getPosition(seg.startId)!;
			const end = figure.getPosition(seg.endId)!;
			expect(geoToNumber(start.x)).toBeCloseTo(0);
			expect(geoToNumber(start.y)).toBeCloseTo(2);
			expect(geoToNumber(end.x)).toBeCloseTo(0);
			expect(geoToNumber(end.y)).toBeCloseTo(3);
		}
	});
});

describe('compose() — reactivity', () => {
	it('image follows when transformation center moves', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'r1 = rotation(angle=90, centre=O)',
				'r2 = rotation(angle=90, centre=O)',
				'f = compose(r1, r2)',
				'B = transforme(f, A)'
			].join('\n')
		);
		// Initially: (1,0) → 180° → (-1,0)
		let pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(-1);
		expect(pos.y).toBeCloseTo(0);

		// Move O to (1,0): now rotate (1,0) around (1,0) → stays at (1,0)
		const oId = symbols.get('O')!.figureId!;
		figure.movePoint(oId, { kind: 'numeric', value: 1 }, { kind: 'numeric', value: 0 });
		figure.recompute();
		pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(1);
		expect(pos.y).toBeCloseTo(0);
	});
});
