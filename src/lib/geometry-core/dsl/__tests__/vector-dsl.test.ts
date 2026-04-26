import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { isVector } from '../../types/elements';

describe('DSL vector support', () => {
	describe('vecteur() builtin', () => {
		it('creates a bound vector from two points', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 4)
v = vecteur(A, B)
`);
			const vEntry = symbols.get('v');
			expect(vEntry).toBeDefined();
			expect(vEntry!.type).toBe('vecteur');

			const el = figure.getElementById(vEntry!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('vectorByPoints');
		});

		it('creates a free vector from two numbers', () => {
			const { figure, symbols } = runDsl(`
v = vecteur(3, 4)
`);
			const vEntry = symbols.get('v');
			expect(vEntry).toBeDefined();
			expect(vEntry!.type).toBe('vecteur');

			const el = figure.getElementById(vEntry!.figureId!);
			expect(el).toBeDefined();
			expect(el!.type).toBe('freeVector');
			if (el!.type === 'freeVector') {
				expect(geoToNumber(el.dx)).toBe(3);
				expect(geoToNumber(el.dy)).toBe(4);
			}
		});

		it('throws with wrong number of arguments', () => {
			expect(() => runDsl('v = vecteur(1)')).toThrow();
			expect(() => runDsl('v = vecteur(1, 2, 3)')).toThrow();
		});
	});

	describe('translation with vector', () => {
		it('translates using vecteur=(A,B) tuple syntax', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 0)
P = point(1, 1)
Q = translation(P, vecteur=(A, B))
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(4);
			expect(geoToNumber(pos!.y)).toBeCloseTo(1);
		});

		it('translates using a bound vector element', () => {
			const { figure, symbols } = runDsl(`
A = point(0, 0)
B = point(3, 0)
v = vecteur(A, B)
P = point(1, 1)
Q = translation(P, vecteur=v)
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(4);
			expect(geoToNumber(pos!.y)).toBeCloseTo(1);
		});

		it('translates using a free vector element', () => {
			const { figure, symbols } = runDsl(`
v = vecteur(2, 3)
P = point(1, 1)
Q = translation(P, vecteur=v)
`);
			const pos = figure.getPosition(symbols.get('Q')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(3);
			expect(geoToNumber(pos!.y)).toBeCloseTo(4);
		});
	});

	describe('serialization round-trip', () => {
		it('round-trips a bound vector', () => {
			const script = `A = point(0, 0)
B = point(3, 4)
v = vecteur(A, B)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('vecteur(A, B)');

			// Re-parse
			const { figure: fig2 } = runDsl(serialized);
			const vectors = fig2.getAllElements().filter((el) => isVector(el));
			expect(vectors.length).toBe(1);
			expect(vectors[0].type).toBe('vectorByPoints');
		});

		it('round-trips a free vector', () => {
			const script = `v = vecteur(3, 4)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('vecteur(3, 4)');

			// Re-parse
			const { figure: fig2 } = runDsl(serialized);
			const vectors = fig2.getAllElements().filter((el) => isVector(el));
			expect(vectors.length).toBe(1);
			expect(vectors[0].type).toBe('freeVector');
		});
	});
});
