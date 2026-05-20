import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

describe('DSL vector operations', () => {
	// ─── Arithmetic operators ───────────────────────────────────────

	describe('vector + vector', () => {
		it('creates a reactive sum vector', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(3, 0)
v = vecteur(0, 4)
w = u + v
`);
			const wId = symbols.get('w')!.figureId!;
			const comp = figure.getVectorComponents(wId);
			expect(comp).not.toBeNull();
			expect(geoToNumber(comp!.dx)).toBeCloseTo(3);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(4);
		});

		it('sum is reactive to bound vector changes', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 0)
u = vecteur(A, B)
v = vecteur(0, 4)
w = u + v
`);
			const wId = symbols.get('w')!.figureId!;
			const comp = figure.getVectorComponents(wId);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(3);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(4);
		});
	});

	describe('vector - vector', () => {
		it('creates a reactive difference vector', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(5, 3)
v = vecteur(2, 1)
w = u - v
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(3);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(2);
		});
	});

	describe('scalar * vector', () => {
		it('scales a vector by a scalar (left)', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(2, 3)
w = 3 * u
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(6);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(9);
		});

		it('scales a vector by a scalar (right)', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(2, 3)
w = u * 3
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(6);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(9);
		});

		it('scales by negative scalar', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(2, 3)
w = -2 * u
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(-4);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(-6);
		});

		it('scales by zero', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(2, 3)
w = 0 * u
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(0);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(0);
		});
	});

	describe('vector / scalar', () => {
		it('divides a vector by a scalar', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(6, 4)
w = u / 2
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(3);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(2);
		});

		it('throws on division by zero', () => {
			expect(() =>
				runDsl(`
u = vecteur(1, 1)
w = u / 0
`)
			).toThrow(/zero/i);
		});
	});

	describe('unary negation: -vector', () => {
		it('negates a vector', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(3, -4)
w = -u
`);
			const comp = figure.getVectorComponents(symbols.get('w')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(-3);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(4);
		});
	});

	describe('chained operations', () => {
		it('computes u + v + w', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 0)
v = vecteur(0, 1)
w = vecteur(1, 1)
r = u + v + w
`);
			const comp = figure.getVectorComponents(symbols.get('r')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(2);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(2);
		});

		it('computes 2 * u - v', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(3, 1)
v = vecteur(1, 2)
r = 2 * u - v
`);
			const comp = figure.getVectorComponents(symbols.get('r')!.figureId!);
			expect(geoToNumber(comp!.dx)).toBeCloseTo(5);
			expect(geoToNumber(comp!.dy)).toBeCloseTo(0);
		});
	});

	// ─── Error cases ────────────────────────────────────────────────

	describe('error cases', () => {
		it('throws on vector + scalar', () => {
			expect(() =>
				runDsl(`
u = vecteur(1, 1)
w = u + 5
`)
			).toThrow();
		});

		it('throws on vector * vector', () => {
			expect(() =>
				runDsl(`
u = vecteur(1, 1)
v = vecteur(2, 2)
w = u * v
`)
			).toThrow();
		});
	});

	// ─── Builtins ───────────────────────────────────────────────────

	describe('norme()', () => {
		it('computes the norm of a free vector', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(3, 4)
n = norme(u)
`);
			expect(symbols.get('n')!.type).toBe('scalar');
			expect(figure.getScalarValue(symbols.get('n')!.figureId!)).toBeCloseTo(5);
		});

		it('computes the norm of a bound vector', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(5, 0)
u = vecteur(A, B)
n = norme(u)
`);
			expect(figure.getScalarValue(symbols.get('n')!.figureId!)).toBeCloseTo(5);
		});

		it('computes the norm of a derived vector', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(3, 4)
v = 2 * u
n = norme(v)
`);
			expect(figure.getScalarValue(symbols.get('n')!.figureId!)).toBeCloseTo(10);
		});
	});

	describe('produit_scalaire()', () => {
		it('computes dot product of orthogonal vectors', () => {
			const { symbols } = runDsl(`
u = vecteur(1, 0)
v = vecteur(0, 1)
p = produit_scalaire(u, v)
`);
			expect(symbols.get('p')!.value).toBeCloseTo(0);
		});

		it('computes dot product of parallel vectors', () => {
			const { symbols } = runDsl(`
u = vecteur(3, 4)
v = vecteur(6, 8)
p = produit_scalaire(u, v)
`);
			// 3*6 + 4*8 = 18 + 32 = 50
			expect(symbols.get('p')!.value).toBeCloseTo(50);
		});

		it('computes dot product of general vectors', () => {
			const { symbols } = runDsl(`
u = vecteur(1, 2)
v = vecteur(3, -1)
p = produit_scalaire(u, v)
`);
			// 1*3 + 2*(-1) = 1
			expect(symbols.get('p')!.value).toBeCloseTo(1);
		});
	});

	describe('mesure(u, v) — replaces angle_vecteurs()', () => {
		it('computes angle between orthogonal vectors', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 0)
v = vecteur(0, 1)
a = mesure(u, v, unite="deg")
`);
			expect(figure.getScalarValue(symbols.get('a')!.figureId!)).toBeCloseTo(90);
		});

		it('computes angle between parallel vectors', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 0)
v = vecteur(2, 0)
a = mesure(u, v, unite="deg")
`);
			expect(figure.getScalarValue(symbols.get('a')!.figureId!)).toBeCloseTo(0);
		});

		it('computes angle between opposite vectors', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 0)
v = vecteur(-1, 0)
a = mesure(u, v, unite="deg")
`);
			expect(figure.getScalarValue(symbols.get('a')!.figureId!)).toBeCloseTo(180);
		});

		it('computes 60 degree angle', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 0)
v = vecteur(0.5, 0.866025)
a = mesure(u, v, unite="deg")
`);
			expect(figure.getScalarValue(symbols.get('a')!.figureId!)).toBeCloseTo(60, 0);
		});
	});

	// ─── Serialization ──────────────────────────────────────────────

	describe('serialization of vector operations', () => {
		it('serializes vector sum as u + v', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 2)
v = vecteur(3, 4)
w = u + v
`);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('w = u + v');
		});

		it('serializes vector difference as u - v', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 2)
v = vecteur(3, 4)
w = u - v
`);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('w = u - v');
		});

		it('serializes scaled vector as factor * v', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 2)
w = 3 * u
`);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('w = 3 * u');
		});

		it('serializes negated vector as -v', () => {
			const { figure, symbols } = runDsl(`
u = vecteur(1, 2)
w = -u
`);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('w = -u');
		});
	});
});
