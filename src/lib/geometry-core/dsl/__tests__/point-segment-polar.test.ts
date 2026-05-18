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

describe('point(A, longueur=L, ...) — polar offset', () => {
	it('point(A, longueur=5, angle=0) → A shifted by (5, 0)', () => {
		const { figure, symbols } = runDsl(
			['A = point(2, 3)', 'B = point(A, longueur=5, angle=0)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(7);
		expect(pos.y).toBeCloseTo(3);
	});

	it('point(A, longueur=5, angle=90) → A shifted by (0, 5) (degrees by default)', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(A, longueur=5, angle=90)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(5);
	});

	it('point(A, longueur=4, angle=180) → opposite direction', () => {
		const { figure, symbols } = runDsl(
			['A = point(10, 5)', 'B = point(A, longueur=4, angle=180)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(6);
		expect(pos.y).toBeCloseTo(5);
	});

	it('point(A, longueur=5, direction=B) — towards B with fixed length', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)', // distance AB = 5, direction = (3/5, 4/5)
				'C = point(A, longueur=10, direction=B)' // along AB at distance 10
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'C');
		expect(pos.x).toBeCloseTo(6);
		expect(pos.y).toBeCloseTo(8);
	});

	it('point(A, longueur=5, vecteur=u) — along vector direction', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'u = vecteur(0, 2)', 'B = point(A, longueur=3, vecteur=u)'].join('\n')
		);
		// u has direction (0, 1) (normalized), longueur 3 → B = (0, 3)
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(0);
		expect(pos.y).toBeCloseTo(3);
	});

	it('point(A, longueur=5) without direction — default angle=0', () => {
		const { figure, symbols } = runDsl(['A = point(1, 1)', 'B = point(A, longueur=4)'].join('\n'));
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(5);
		expect(pos.y).toBeCloseTo(1);
	});

	it('throws on identical direction point', () => {
		expect(() =>
			runDsl(
				['A = point(2, 3)', 'B = point(2, 3)', 'C = point(A, longueur=5, direction=B)'].join('\n')
			)
		).toThrow(/confondus|indéterminée/i);
	});

	it('point(x, y) still works (legacy form)', () => {
		const { figure, symbols } = runDsl(['A = point(2, 3)'].join('\n'));
		const pos = getPos(figure, symbols, 'A');
		expect(pos.x).toBeCloseTo(2);
		expect(pos.y).toBeCloseTo(3);
	});
});

describe('segment(A, longueur=L, ...) — length + direction', () => {
	it('segment(A, longueur=5, angle=0) — horizontal segment of length 5', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 's = segment(A, longueur=5, angle=0)'].join('\n')
		);
		expect(symbols.get('s')!.type).toBe('segment');
		// Endpoint accessible via extremite(s, 2)
		void figure;
	});

	it('endpoint accessible via extremite(s, 2)', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 's = segment(A, longueur=5, angle=0)', 'B = extremite(s, 2)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(5);
		expect(pos.y).toBeCloseTo(0);
	});

	it('segment(A, longueur=5, angle=90) — vertical', () => {
		const { figure, symbols } = runDsl(
			['A = point(2, 3)', 's = segment(A, longueur=5, angle=90)', 'B = extremite(s, 2)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'B');
		expect(pos.x).toBeCloseTo(2);
		expect(pos.y).toBeCloseTo(8);
	});

	it('segment(A, longueur=10, direction=B)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)',
				's = segment(A, longueur=10, direction=B)',
				'C = extremite(s, 2)'
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'C');
		expect(pos.x).toBeCloseTo(6);
		expect(pos.y).toBeCloseTo(8);
	});

	it('extremite(s, 1) is the start point', () => {
		const { figure, symbols } = runDsl(
			['A = point(2, 3)', 's = segment(A, longueur=5, angle=0)', 'P1 = extremite(s, 1)'].join('\n')
		);
		expect(symbols.get('P1')!.figureId).toBe(symbols.get('A')!.figureId);
		void figure;
	});

	it('segment(A, B) still works (legacy form)', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(1, 1)', 's = segment(A, B)'].join('\n')
		);
		expect(symbols.get('s')!.type).toBe('segment');
		void figure;
	});
});
