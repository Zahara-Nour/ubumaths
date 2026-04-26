import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

function getPos(
	figure: ReturnType<typeof runDsl>['figure'],
	symbols: ReturnType<typeof runDsl>['symbols'],
	name: string
) {
	const entry = symbols.get(name);
	if (!entry?.figureId) throw new Error(`Symbol "${name}" not found`);
	const pos = figure.getPosition(entry.figureId);
	if (!pos) throw new Error(`No position for "${name}"`);
	return { x: geoToNumber(pos.x), y: geoToNumber(pos.y) };
}

describe('transforme() — points with rotation', () => {
	it('transforms a point by rotation', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'r = rotation(angle=90, centre=O)',
				'B = transforme(r, A)'
			].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(1);
	});
});

describe('transforme() — points with reflection (central)', () => {
	it('transforms a point by central symmetry', () => {
		const { figure, symbols } = runDsl(
			['O = point(2, 3)', 'A = point(1, 1)', 's = symetrie(centre=O)', 'B = transforme(s, A)'].join(
				'\n'
			)
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(3);
		expect(pos.y).toBeCloseTo(5);
	});
});

describe('transforme() — points with axial symmetry', () => {
	it('transforms a point by axial symmetry', () => {
		const { figure, symbols } = runDsl(
			[
				'P1 = point(0, 0)',
				'P2 = point(4, 0)',
				'A = point(2, 3)',
				's = symetrie(axe=(P1, P2))',
				'B = transforme(s, A)'
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(2);
		expect(pos.y).toBeCloseTo(-3);
	});
});

describe('transforme() — points with translation', () => {
	it('transforms a point by translation (tuple)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)',
				'C = point(1, 1)',
				't = translation(vecteur=(A, B))',
				'D = transforme(t, C)'
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'D');
		expect(pos.x).toBeCloseTo(4);
		expect(pos.y).toBeCloseTo(5);
	});

	it('transforms a point by translation (vector element)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)',
				'v = vecteur(A, B)',
				'C = point(1, 1)',
				't = translation(vecteur=v)',
				'D = transforme(t, C)'
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'D');
		expect(pos.x).toBeCloseTo(4);
		expect(pos.y).toBeCloseTo(5);
	});
});

describe('transforme() — points with homothety', () => {
	it('transforms a point by homothety', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(2, 3)',
				'h = homothetie(rapport=2, centre=O)',
				'B = transforme(h, A)'
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(4);
		expect(pos.y).toBeCloseTo(6);
	});
});

describe('transforme() — reactivity', () => {
	it('image follows when source point moves', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'r = rotation(angle=90, centre=O)',
				'B = transforme(r, A)'
			].join('\n')
		);
		// Move A to (2, 0)
		const aId = symbols.get('A')!.figureId!;
		figure.movePoint(aId, { kind: 'numeric', value: 2 }, { kind: 'numeric', value: 0 });
		figure.recompute();
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(2);
	});

	it('image follows when transformation center moves', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(2, 0)',
				'r = rotation(angle=90, centre=O)',
				'B = transforme(r, A)'
			].join('\n')
		);
		// Initially B = (0, 2). Move O to (1, 0).
		const oId = symbols.get('O')!.figureId!;
		figure.movePoint(oId, { kind: 'numeric', value: 1 }, { kind: 'numeric', value: 0 });
		figure.recompute();
		const pos = getPos(figure, symbols, 'B');
		// Rotate (2,0) around (1,0) by 90° → (1, 1)
		expect(pos.x).toBeCloseTo(1);
		expect(pos.y).toBeCloseTo(1);
	});
});

describe('transforme() — errors', () => {
	it('throws when first arg is not a transformation', () => {
		expect(() =>
			runDsl(['A = point(0, 0)', 'B = point(1, 0)', 'C = transforme(A, B)'].join('\n'))
		).toThrow(/transformation/);
	});

	it('throws when second arg is not an element', () => {
		expect(() =>
			runDsl(
				['O = point(0, 0)', 'r = rotation(angle=90, centre=O)', 'B = transforme(r, 42)'].join('\n')
			)
		).toThrow(/element/);
	});

	it('throws with wrong number of arguments', () => {
		expect(() =>
			runDsl(
				['O = point(0, 0)', 'r = rotation(angle=90, centre=O)', 'B = transforme(r)'].join('\n')
			)
		).toThrow(/2 arguments/);
	});
});
