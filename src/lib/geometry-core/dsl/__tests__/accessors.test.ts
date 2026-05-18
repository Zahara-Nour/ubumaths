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

describe('centre() — accessor for geometric centers', () => {
	it('returns center of circleByRadius', () => {
		const { figure, symbols } = runDsl(
			['O = point(2, 3)', 'c = cercle(O, rayon=4)', 'P = centre(c)'].join('\n')
		);
		expect(symbols.get('P')!.type).toBe('point');
		const pos = getPos(figure, symbols, 'P');
		expect(pos.x).toBeCloseTo(2);
		expect(pos.y).toBeCloseTo(3);
		// Same figureId as O (no new element created)
		expect(symbols.get('P')!.figureId).toBe(symbols.get('O')!.figureId);
		void figure;
	});

	it('returns center of circleByPoint', () => {
		const { figure, symbols } = runDsl(
			['O = point(1, 1)', 'A = point(4, 5)', 'c = cercle(O, passant=A)', 'P = centre(c)'].join('\n')
		);
		expect(symbols.get('P')!.figureId).toBe(symbols.get('O')!.figureId);
		void figure;
	});

	it('returns intersection of diagonals for a quadrilateral', () => {
		// Parallelogram (0,0), (4,0), (5,3), (1,3) — diagonals intersect at the center
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(5, 3)',
				'D = point(1, 3)',
				'p = polygone(A, B, C, D)',
				'O = centre(p)'
			].join('\n')
		);
		const pos = getPos(figure, symbols, 'O');
		// Midpoint of [AC] = midpoint of [BD] = (2.5, 1.5)
		expect(pos.x).toBeCloseTo(2.5);
		expect(pos.y).toBeCloseTo(1.5);
	});

	it('throws on triangle (3 sommets)', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 0)',
					'C = point(2, 3)',
					'p = polygone(A, B, C)',
					'O = centre(p)'
				].join('\n')
			)
		).toThrow(/centre.*pas? d(e|é)fini|3 sommets/i);
	});

	it('throws on pentagon (5 sommets)', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 0)',
					'C = point(5, 3)',
					'D = point(3, 5)',
					'E = point(1, 4)',
					'p = polygone(A, B, C, D, E)',
					'O = centre(p)'
				].join('\n')
			)
		).toThrow(/centre.*pas? d(e|é)fini|5 sommets/i);
	});

	it('throws on segment', () => {
		expect(() =>
			runDsl(
				['A = point(0, 0)', 'B = point(4, 0)', 's = segment(A, B)', 'O = centre(s)'].join('\n')
			)
		).toThrow(/centre.*pas? d(e|é)fini|milieu/i);
	});

	it('throws on cercle by 3 points', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 0)',
					'C = point(2, 3)',
					'c = cercle(A, B, C)',
					'O = centre(c)'
				].join('\n')
			)
		).toThrow(/centre.*non support(e|é)|cercle_circonscrit/i);
	});

	it('returns center of an arc', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'a = arc(O, rayon=2, debut=0, fin=90)', 'P = centre(a)'].join('\n')
		);
		expect(symbols.get('P')!.figureId).toBe(symbols.get('O')!.figureId);
		void figure;
	});
});

describe('extremite() — accessor for segment endpoints', () => {
	it('extremite(s, 1) returns 1st arg of segment()', () => {
		const { figure, symbols } = runDsl(
			['A = point(1, 2)', 'B = point(5, 7)', 's = segment(A, B)', 'P = extremite(s, 1)'].join('\n')
		);
		expect(symbols.get('P')!.figureId).toBe(symbols.get('A')!.figureId);
		void figure;
	});

	it('extremite(s, 2) returns 2nd arg of segment()', () => {
		const { figure, symbols } = runDsl(
			['A = point(1, 2)', 'B = point(5, 7)', 's = segment(A, B)', 'P = extremite(s, 2)'].join('\n')
		);
		expect(symbols.get('P')!.figureId).toBe(symbols.get('B')!.figureId);
		void figure;
	});

	it('throws on invalid index', () => {
		expect(() =>
			runDsl(
				['A = point(0, 0)', 'B = point(1, 0)', 's = segment(A, B)', 'P = extremite(s, 0)'].join(
					'\n'
				)
			)
		).toThrow(/index.*1 ou 2|index doit/i);

		expect(() =>
			runDsl(
				['A = point(0, 0)', 'B = point(1, 0)', 's = segment(A, B)', 'P = extremite(s, 3)'].join(
					'\n'
				)
			)
		).toThrow(/index.*1 ou 2|index doit/i);
	});

	it('throws when first arg is not a segment', () => {
		expect(() => runDsl(['A = point(0, 0)', 'P = extremite(A, 1)'].join('\n'))).toThrow(
			/segment ou une demi-droite/i
		);
	});

	it('works on a demi-droite', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(1, 0)', 'r = demidroite(O, A)', 'P = extremite(r, 1)'].join(
				'\n'
			)
		);
		expect(symbols.get('P')!.figureId).toBe(symbols.get('O')!.figureId);
		void figure;
	});
});

describe('extremites() — tuple of segment endpoints', () => {
	it('returns the tuple (p1, p2) in creation order', () => {
		const { figure, symbols } = runDsl(
			['A = point(1, 2)', 'B = point(5, 7)', 's = segment(A, B)', '(P, Q) = extremites(s)'].join(
				'\n'
			)
		);
		expect(symbols.get('P')!.figureId).toBe(symbols.get('A')!.figureId);
		expect(symbols.get('Q')!.figureId).toBe(symbols.get('B')!.figureId);
		void figure;
	});

	it('throws when arg is not a segment', () => {
		expect(() => runDsl(['A = point(0, 0)', '(P, Q) = extremites(A)'].join('\n'))).toThrow(
			/segment ou une demi-droite/i
		);
	});
});

describe('milieu() — extension to accept a segment', () => {
	it('milieu(s) returns the midpoint of an existing segment', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 6)', 's = segment(A, B)', 'M = milieu(s)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'M');
		expect(pos.x).toBeCloseTo(2);
		expect(pos.y).toBeCloseTo(3);
	});

	it('milieu(A, B) still works (existing)', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 6)', 'M = milieu(A, B)'].join('\n')
		);
		const pos = getPos(figure, symbols, 'M');
		expect(pos.x).toBeCloseTo(2);
		expect(pos.y).toBeCloseTo(3);
	});

	it('milieu(s) throws when arg is not a segment', () => {
		expect(() => runDsl(['A = point(0, 0)', 'M = milieu(A)'].join('\n'))).toThrow(/segment/);
	});
});

describe('sommet() — i-th vertex of a polygon', () => {
	it('returns the i-th vertex (1-indexed)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(4, 4)',
				'D = point(0, 4)',
				'p = polygone(A, B, C, D)',
				'P1 = sommet(p, 1)',
				'P3 = sommet(p, 3)'
			].join('\n')
		);
		expect(symbols.get('P1')!.figureId).toBe(symbols.get('A')!.figureId);
		expect(symbols.get('P3')!.figureId).toBe(symbols.get('C')!.figureId);
		void figure;
	});

	it('throws on out-of-bounds index', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'p = polygone(A, B, C)',
					'P = sommet(p, 0)'
				].join('\n')
			)
		).toThrow(/index/);

		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'p = polygone(A, B, C)',
					'P = sommet(p, 4)'
				].join('\n')
			)
		).toThrow(/index/);
	});
});

describe('sommets() — tuple of all polygon vertices', () => {
	it('returns the full tuple in creation order', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(4, 4)',
				'D = point(0, 4)',
				'p = polygone(A, B, C, D)',
				'(P1, P2, P3, P4) = sommets(p)'
			].join('\n')
		);
		expect(symbols.get('P1')!.figureId).toBe(symbols.get('A')!.figureId);
		expect(symbols.get('P2')!.figureId).toBe(symbols.get('B')!.figureId);
		expect(symbols.get('P3')!.figureId).toBe(symbols.get('C')!.figureId);
		expect(symbols.get('P4')!.figureId).toBe(symbols.get('D')!.figureId);
		void figure;
	});
});
