import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

describe('serialization of curves and related elements', () => {
	describe('function curves', () => {
		it('round-trips a function curve', () => {
			const script = `f = courbe("y = x^2")`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('courbe("y = x^2")');

			const { figure: fig2 } = runDsl(serialized);
			const fns = fig2.getAllElements().filter((el) => el.type === 'function');
			expect(fns.length).toBe(1);
		});
	});

	describe('quadratic curves', () => {
		it('round-trips a circle', () => {
			const script = `c = courbe("x^2 + y^2 - 9 = 0")`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('courbe(');

			const { figure: fig2 } = runDsl(serialized);
			const qcs = fig2.getAllElements().filter((el) => el.type === 'quadraticCurve');
			expect(qcs.length).toBe(1);
		});
	});

	describe('implicit curves', () => {
		it('round-trips an implicit curve', () => {
			const script = `c = courbe("x^3 + y^3 - 3*x*y = 0")`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('courbe(');

			const { figure: fig2 } = runDsl(serialized);
			const ics = fig2.getAllElements().filter((el) => el.type === 'implicitCurve');
			expect(ics.length).toBe(1);
		});
	});

	describe('point_sur', () => {
		it('round-trips a point on a function curve', () => {
			const script = `f = courbe("y = x^2")
P = point_sur(f, 1.5)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('point_sur(f, 1.5)');

			const { figure: fig2, symbols: sym2 } = runDsl(serialized);
			const pos = fig2.getPosition(sym2.get('P')!.figureId!);
			expect(pos).not.toBeNull();
			expect(geoToNumber(pos!.x)).toBeCloseTo(1.5);
			expect(geoToNumber(pos!.y)).toBeCloseTo(2.25);
		});

		it('round-trips a point on a quadratic curve (circle, degrees)', () => {
			const script = `c = courbe("x^2 + y^2 - 9 = 0")
P = point_sur(c, 45)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('point_sur(c, 45)');

			const { figure: fig2, symbols: sym2 } = runDsl(serialized);
			const pos = fig2.getPosition(sym2.get('P')!.figureId!);
			expect(pos).not.toBeNull();
			// cos(45°)*3 ≈ 2.121, sin(45°)*3 ≈ 2.121
			expect(geoToNumber(pos!.x)).toBeCloseTo(3 * Math.cos(Math.PI / 4), 1);
			expect(geoToNumber(pos!.y)).toBeCloseTo(3 * Math.sin(Math.PI / 4), 1);
		});
	});

	describe('tangente', () => {
		it('round-trips a tangent line with x0', () => {
			const script = `f = courbe("y = x^2")
t = tangente(f, -1)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('tangente(f, -1)');
		});

		it('round-trips a tangent line with point_sur', () => {
			const script = `f = courbe("y = x^2")
P = point_sur(f, 1.5)
t = tangente(f, P)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('tangente(f, P)');
		});

		it('round-trips a tangent to a quadratic curve with point_sur', () => {
			const script = `c = courbe("x^2 + y^2 - 9 = 0")
P = point_sur(c, 45)
t = tangente(c, P)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('tangente(c, P)');
		});

		it('round-trips a tangent to a quadratic curve with fixed param', () => {
			const script = `c = courbe("x^2 + y^2 - 9 = 0")
t = tangente(c, 90)`;
			const { figure, symbols } = runDsl(script);
			const serialized = serializeDsl(figure, symbols);
			expect(serialized).toContain('tangente(c, 90)');
		});
	});
});
