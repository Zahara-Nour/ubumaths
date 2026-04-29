import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('interpreter — points', () => {
	it('creates a free point', () => {
		const { figure, symbols } = run('A = point(0, 0)');
		const entry = symbols.get('A');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('point');
		expect(entry!.figureId).toBeDefined();
		const pos = figure.getPosition(entry!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBe(0);
		expect(geoToNumber(pos!.y)).toBe(0);
	});

	it('creates a point with coordinates', () => {
		const { figure, symbols } = run('P = point(3.5, -2)');
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3.5);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-2);
	});

	it('creates a point with expression coordinates', () => {
		const { figure, symbols } = run('n = 5\nP = point(n, n * 2)');
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(5);
		expect(geoToNumber(pos!.y)).toBeCloseTo(10);
	});
});

describe('interpreter — constructions', () => {
	it('creates a midpoint', () => {
		const { figure, symbols } = run(
			['A = point(0, 0)', 'B = point(4, 0)', 'M = milieu(A, B)'].join('\n')
		);
		const pos = figure.getPosition(symbols.get('M')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('creates a segment', () => {
		const { figure } = run(['A = point(0, 0)', 'B = point(1, 1)', 'segment(A, B)'].join('\n'));
		expect(figure.getAllElements().filter((e) => e.type === 'segment')).toHaveLength(1);
	});

	it('creates a line', () => {
		const { figure } = run(['A = point(0, 0)', 'B = point(1, 1)', 'd = droite(A, B)'].join('\n'));
		expect(figure.getAllElements().filter((e) => e.type === 'line')).toHaveLength(1);
	});

	it('creates a ray', () => {
		const { figure } = run(
			['A = point(0, 0)', 'B = point(1, 0)', 'r = demidroite(A, B)'].join('\n')
		);
		expect(figure.getAllElements().filter((e) => e.type === 'ray')).toHaveLength(1);
	});
});

describe('interpreter — circles', () => {
	it('creates circle by radius', () => {
		const { figure } = run(['O = point(0, 0)', 'c = cercle(O, rayon=3)'].join('\n'));
		expect(figure.getAllElements().filter((e) => e.type === 'circleByRadius')).toHaveLength(1);
	});

	it('creates circle by point', () => {
		const { figure } = run(
			['O = point(0, 0)', 'A = point(3, 0)', 'c = cercle(O, passant=A)'].join('\n')
		);
		expect(figure.getAllElements().filter((e) => e.type === 'circleByPoint')).toHaveLength(1);
	});

	it('throws without rayon or passant', () => {
		expect(() => run('O = point(0, 0)\ncercle(O)')).toThrow(DslRuntimeError);
	});
});

describe('interpreter — transformations', () => {
	it('creates reflected point (central symmetry)', () => {
		const { figure, symbols } = run(
			['A = point(2, 3)', 'O = point(0, 0)', 'B = symetrie(A, centre=O)'].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(-2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-3);
	});

	it('creates reflected over line (axial symmetry)', () => {
		const { figure, symbols } = run(
			['A = point(1, 1)', 'P = point(0, 0)', 'Q = point(1, 0)', 'B = symetrie(A, axe=(P, Q))'].join(
				'\n'
			)
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-1);
	});

	it('creates rotated point', () => {
		const { figure, symbols } = run(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=90)'].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0, 5);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1, 5);
	});

	it('creates translated point', () => {
		const { figure, symbols } = run(
			[
				'A = point(1, 1)',
				'P = point(0, 0)',
				'Q = point(2, 3)',
				'B = translation(A, vecteur=(P, Q))'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(4);
	});

	it('creates dilated point', () => {
		const { figure, symbols } = run(
			['A = point(1, 1)', 'O = point(0, 0)', 'B = homothetie(A, centre=O, rapport=2)'].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(2);
	});

	it('creates intersection', () => {
		const { figure } = run(
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
		expect(figure.getAllElements().filter((e) => e.type === 'intersectionLL')).toHaveLength(1);
	});
});

describe('interpreter — annotations', () => {
	it('creates angle mark', () => {
		const { figure } = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'marque_angle(A, V, B)'].join('\n')
		);
		expect(figure.getAllElements().filter((e) => e.type === 'angleMark')).toHaveLength(1);
	});

	it('creates right angle', () => {
		const { figure } = run(
			['A = point(1, 0)', 'V = point(0, 0)', 'B = point(0, 1)', 'angle_droit(A, V, B)'].join('\n')
		);
		const marks = figure.getAllElements().filter((e) => e.type === 'angleMark');
		expect(marks).toHaveLength(1);
	});

	it('creates segment mark', () => {
		const { figure } = run(
			['A = point(0, 0)', 'B = point(4, 0)', 'marque_segment(A, B, traits=2)'].join('\n')
		);
		expect(figure.getAllElements().filter((e) => e.type === 'segmentMark')).toHaveLength(1);
	});

	it('creates distance text via mesure()', () => {
		const { figure } = run(['A = point(0, 0)', 'B = point(3, 4)', 'mesure(A, B)'].join('\n'));
		expect(figure.getAllElements().filter((e) => e.type === 'text')).toHaveLength(1);
	});
});

describe('interpreter — variables and expressions', () => {
	it('evaluates arithmetic expressions', () => {
		const { symbols } = run('n = 2 + 3 * 4');
		expect(symbols.get('n')!.value).toBe(14);
	});

	it('evaluates modulo', () => {
		const { symbols } = run('n = 7 % 3');
		expect(symbols.get('n')!.value).toBe(1);
	});

	it('evaluates negative modulo correctly', () => {
		const { symbols } = run('n = (-1) % 6');
		expect(symbols.get('n')!.value).toBe(5); // Python-like positive modulo
	});

	it('evaluates property access A.x', () => {
		const { symbols } = run(['A = point(3, 4)', 'x = A.x'].join('\n'));
		expect(symbols.get('x')!.value).toBeCloseTo(3);
	});

	it('evaluates math function sqrt', () => {
		const { symbols } = run('r = sqrt(4)');
		expect(symbols.get('r')!.value).toBeCloseTo(2);
	});

	it('evaluates trigonometric functions (degrees)', () => {
		const { symbols } = run('x = cos(60)');
		expect(symbols.get('x')!.value).toBeCloseTo(0.5, 5);
	});
});

describe('interpreter — loops', () => {
	it('pour...de...a creates multiple elements', () => {
		const { figure } = run(['pour i de 0 a 2:', '    point(i, 0)'].join('\n'));
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		expect(points.length).toBe(3); // 0, 1, 2 (inclusive)
	});

	it('pour with indexed names', () => {
		const { symbols } = run(
			['P[0] = point(0, 0)', 'pour i de 1 a 3:', '    P[i] = point(i, 0)'].join('\n')
		);
		expect(symbols.getIndexed('P', 0)).toBeDefined();
		expect(symbols.getIndexed('P', 1)).toBeDefined();
		expect(symbols.getIndexed('P', 2)).toBeDefined();
		expect(symbols.getIndexed('P', 3)).toBeDefined();
	});

	it('pour with expression in bounds', () => {
		const { figure } = run(['n = 4', 'pour i de 0 a n - 1:', '    point(i, 0)'].join('\n'));
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		expect(points.length).toBe(4);
	});

	it('pour...dans with list', () => {
		const { figure } = run(['pour x dans [0, 1, 2]:', '    point(x, 0)'].join('\n'));
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		expect(points.length).toBe(3);
	});

	it('throws on too many iterations', () => {
		expect(() => run(['pour i de 0 a 2000:', '    point(i, 0)'].join('\n'))).toThrow(
			'1000 iterations'
		);
	});
});

describe('interpreter — conditionals', () => {
	it('si true executes body', () => {
		const { figure } = run(['si vrai:', '    point(0, 0)'].join('\n'));
		expect(figure.getAllElements().filter((e) => e.type === 'freePoint')).toHaveLength(1);
	});

	it('si false skips body', () => {
		const { figure } = run(['si faux:', '    point(0, 0)'].join('\n'));
		expect(figure.getAllElements().filter((e) => e.type === 'freePoint')).toHaveLength(0);
	});

	it('si/sinon selects correct branch', () => {
		const { symbols } = run(['x = 5', 'si x > 3:', '    r = 1', 'sinon:', '    r = 2'].join('\n'));
		expect(symbols.get('r')!.value).toBe(1);
	});
});

describe('interpreter — errors', () => {
	it('throws on unknown variable', () => {
		expect(() => run('x = y + 1')).toThrow('inconnue');
	});

	it('throws on unknown function', () => {
		expect(() => run('f(1, 2)')).toThrow('inconnue');
	});

	it('throws on type mismatch', () => {
		expect(() => run('n = 5\nmilieu(n, n)')).toThrow();
	});
});

describe('interpreter — complex scripts', () => {
	it('polygone regulier', () => {
		const { figure } = run(
			[
				'n = 6',
				'O = point(0, 0)',
				'P[0] = point(3, 0)',
				'pour i de 1 a n - 1:',
				'    P[i] = rotation(P[0], centre=O, angle=i * 360 / n)',
				'pour i de 0 a n - 1:',
				'    segment(P[i], P[(i + 1) % n])'
			].join('\n')
		);
		const points = figure
			.getAllElements()
			.filter((e) => e.type === 'freePoint' || e.type === 'rotatedPoint');
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(points.length).toBe(7); // O + P[0] free + 5 rotated
		expect(segments.length).toBe(6);
	});

	it('triangle with midpoints and medians', () => {
		const { figure } = run(
			[
				'A = point(-4, -3)',
				'B = point(4, -3)',
				'C = point(0, 4)',
				'segment(A, B)',
				'segment(B, C)',
				'segment(C, A)',
				'M = milieu(A, B)',
				'N = milieu(B, C)',
				'segment(C, M)',
				'segment(A, N)'
			].join('\n')
		);
		const segments = figure.getAllElements().filter((e) => e.type === 'segment');
		expect(segments.length).toBe(5); // 3 sides + 2 medians
	});
});

describe('interpreter — rough rendering style', () => {
	it('rendu="croquis" sets render to rough on inline style', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B, rendu="croquis")'
		);
		const el = figure.getElementById(symbols.get('s')!.figureId!);
		expect(el?.style?.render).toBe('rough');
	});

	it('rendu="normal" sets render to normal', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B, rendu="normal")'
		);
		const el = figure.getElementById(symbols.get('s')!.figureId!);
		expect(el?.style?.render).toBe('normal');
	});

	it('rugosite sets roughness on style', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B, rendu="croquis", rugosite=2.5)'
		);
		const el = figure.getElementById(symbols.get('s')!.figureId!);
		expect(el?.style?.render).toBe('rough');
		expect(el?.style?.roughness).toBe(2.5);
	});

	it('style() function applies rendu', () => {
		const { figure, symbols } = run(
			'A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)\nstyle(s, rendu="croquis")'
		);
		const el = figure.getElementById(symbols.get('s')!.figureId!);
		expect(el?.style?.render).toBe('rough');
	});
});
