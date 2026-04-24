import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('macros — definition and call', () => {
	it('defines and calls a simple macro', () => {
		const { figure, symbols } = run(
			[
				'macro creer_point(x, y):',
				'    P = point(x, y)',
				'    retourne P',
				'R = creer_point(3, 4)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('R')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(4);
	});

	it('macro returns a tuple', () => {
		const { symbols } = run(
			[
				'macro deux_points():',
				'    A = point(0, 0)',
				'    B = point(1, 1)',
				'    retourne (A, B)',
				'(P, Q) = deux_points()'
			].join('\n')
		);
		expect(symbols.get('P')).toBeDefined();
		expect(symbols.get('P')!.type).toBe('point');
		expect(symbols.get('Q')).toBeDefined();
		expect(symbols.get('Q')!.type).toBe('point');
	});

	it('macro with optional parameter', () => {
		const { figure, symbols } = run(
			[
				'macro pt_defaut(x, y=0):',
				'    P = point(x, y)',
				'    retourne P',
				'A = pt_defaut(5)',
				'B = pt_defaut(3, 4)'
			].join('\n')
		);
		const posA = figure.getPosition(symbols.get('A')!.figureId!);
		expect(geoToNumber(posA!.y)).toBeCloseTo(0);
		const posB = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(posB!.y)).toBeCloseTo(4);
	});

	it('macro calling builtin functions', () => {
		const { figure } = run(
			[
				'macro triangle(A, B, C):',
				'    segment(A, B)',
				'    segment(B, C)',
				'    segment(C, A)',
				'P = point(0, 0)',
				'Q = point(4, 0)',
				'R = point(2, 3)',
				'triangle(P, Q, R)'
			].join('\n')
		);
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segments).toHaveLength(3);
	});

	it('macro mediatrice produces midpoint and line', () => {
		const { figure, symbols } = run(
			[
				'macro mediatrice(A, B):',
				'    M = milieu(A, B)',
				'    H = rotation(A, centre=M, angle=90)',
				'    d = droite(M, H)',
				'    retourne (M, d)',
				'P = point(0, 0)',
				'Q = point(4, 0)',
				'(M, d) = mediatrice(P, Q)'
			].join('\n')
		);
		expect(symbols.get('M')).toBeDefined();
		expect(symbols.get('M')!.type).toBe('point');
		expect(symbols.get('d')).toBeDefined();
		expect(symbols.get('d')!.type).toBe('droite');
		const pos = figure.getPosition(symbols.get('M')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
	});
});

describe('macros — scoping', () => {
	it('macro local variables do not leak to caller', () => {
		const { symbols } = run(
			['macro f():', '    local_var = 42', '    retourne local_var', 'r = f()'].join('\n')
		);
		expect(symbols.get('r')!.value).toBe(42);
		expect(symbols.get('local_var')).toBeUndefined();
	});

	it('macro can read caller variables', () => {
		const { symbols } = run(
			['n = 10', 'macro double():', '    retourne n * 2', 'r = double()'].join('\n')
		);
		expect(symbols.get('r')!.value).toBe(20);
	});

	it('macro parameters shadow caller variables', () => {
		const { symbols } = run(['n = 10', 'macro f(n):', '    retourne n * 2', 'r = f(5)'].join('\n'));
		expect(symbols.get('r')!.value).toBe(10);
		expect(symbols.get('n')!.value).toBe(10); // unchanged
	});
});

describe('macros — macro calling macro', () => {
	it('macro can call another macro', () => {
		const { symbols } = run(
			[
				'macro add(a, b):',
				'    retourne a + b',
				'macro double_add(a, b):',
				'    s = add(a, b)',
				'    retourne s * 2',
				'r = double_add(3, 4)'
			].join('\n')
		);
		expect(symbols.get('r')!.value).toBe(14);
	});

	it('mediatrice uses milieu and rotation', () => {
		const { symbols } = run(
			[
				'macro mediatrice(A, B):',
				'    M = milieu(A, B)',
				'    H = rotation(A, centre=M, angle=90)',
				'    d = droite(M, H)',
				'    retourne (M, d)',
				'macro cercle_circonscrit(A, B, C):',
				'    (M1, d1) = mediatrice(A, B)',
				'    (M2, d2) = mediatrice(B, C)',
				'    O = intersection(d1, d2)',
				'    c = cercle(O, passant=A)',
				'    retourne (O, c)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'(O, c) = cercle_circonscrit(A, B, C)'
			].join('\n')
		);
		expect(symbols.get('O')).toBeDefined();
		expect(symbols.get('O')!.type).toBe('point');
		expect(symbols.get('c')).toBeDefined();
		expect(symbols.get('c')!.type).toBe('cercle');
	});
});

describe('macros — errors', () => {
	it('throws on unknown macro', () => {
		expect(() => run('r = inconnu(1, 2)')).toThrow('inconnue');
	});

	it('throws on missing parameter', () => {
		expect(() => run(['macro f(a, b):', '    retourne a + b', 'r = f(1)'].join('\n'))).toThrow(
			'manquant'
		);
	});

	it('throws on recursion', () => {
		expect(() => run(['macro f(n):', '    retourne f(n - 1)', 'r = f(5)'].join('\n'))).toThrow(
			'Profondeur'
		);
	});

	it('throws on mutual recursion', () => {
		expect(() =>
			run(
				['macro f(n):', '    retourne g(n)', 'macro g(n):', '    retourne f(n)', 'r = f(5)'].join(
					'\n'
				)
			)
		).toThrow('Profondeur');
	});
});

describe('macros — with loops', () => {
	it('macro with loop inside', () => {
		const { figure } = run(
			[
				'macro polygone(centre, rayon, n):',
				'    P[0] = point(centre.x + rayon, centre.y)',
				'    pour i de 1 a n - 1:',
				'        P[i] = rotation(P[0], centre=centre, angle=i * 360 / n)',
				'    pour i de 0 a n - 1:',
				'        segment(P[i], P[(i + 1) % n])',
				'O = point(0, 0)',
				'polygone(O, 3, 5)'
			].join('\n')
		);
		// 5-gon: O + P[0] (free) + 4 rotated + 5 segments
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segments).toHaveLength(5);
	});
});
